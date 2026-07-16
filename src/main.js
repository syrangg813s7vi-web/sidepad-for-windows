const { app, BrowserWindow, dialog, ipcMain, net, protocol, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { pathToFileURL } = require('url');

const PANEL_WIDTH = 1040;
const MIN_PANEL_WIDTH = 760;
const EDGE_WIDTH = 8;
const ANIMATION_MS = 180;
const WINDOWS_APP_ID = 'com.sidepad.windows';

let mainWindow;
let isExpanded = false;
let collapseTimer;
let animationFrame;
let activeDisplayId;
const triggerWindows = new Map();
const allowedFiles = new Set();

protocol.registerSchemesAsPrivileged([
  { scheme: 'sidepad-local', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

if (process.platform === 'win32') app.setAppUserModelId(WINDOWS_APP_ID);

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

function getDisplay(displayId) {
  return screen.getAllDisplays().find((display) => String(display.id) === String(displayId))
    || screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    || screen.getPrimaryDisplay();
}

function panelBounds(displayId, expanded) {
  const display = getDisplay(displayId);
  const { x, y, width, height } = display.workArea;
  const panelWidth = Math.min(PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, Math.round(width * 0.64)));
  return {
    x: x + width - (expanded ? panelWidth : 0),
    y,
    width: panelWidth,
    height,
  };
}

function animateTo(target, done) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (animationFrame) clearInterval(animationFrame);

  const start = mainWindow.getBounds();
  const startedAt = Date.now();
  animationFrame = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      clearInterval(animationFrame);
      return;
    }
    const t = Math.min(1, (Date.now() - startedAt) / ANIMATION_MS);
    const eased = 1 - Math.pow(1 - t, 3);
    mainWindow.setBounds({
      x: Math.round(start.x + (target.x - start.x) * eased),
      y: target.y,
      width: Math.round(start.width + (target.width - start.width) * eased),
      height: target.height,
    });
    if (t >= 1) {
      clearInterval(animationFrame);
      animationFrame = null;
      done?.();
    }
  }, 16);
}

function expandPanel({ focus = true, displayId } = {}) {
  clearTimeout(collapseTimer);
  const targetDisplay = getDisplay(displayId);
  if (isExpanded) {
    if (focus) mainWindow?.focus();
    return;
  }
  activeDisplayId = targetDisplay.id;
  isExpanded = true;
  mainWindow.setBounds(panelBounds(activeDisplayId, false));
  mainWindow.showInactive();
  mainWindow.setOpacity(1);
  mainWindow.webContents.send('panel-state', { expanded: true });
  animateTo(panelBounds(activeDisplayId, true), () => {
    if (focus) mainWindow.focus();
  });
}

function collapsePanel() {
  clearTimeout(collapseTimer);
  if (!isExpanded || !mainWindow || mainWindow.isDestroyed()) return;
  isExpanded = false;
  mainWindow.webContents.send('panel-state', { expanded: false });
  animateTo(panelBounds(activeDisplayId, false), () => mainWindow.hide());
}

function scheduleCollapse(delay = 650) {
  clearTimeout(collapseTimer);
  collapseTimer = setTimeout(collapsePanel, delay);
}

function createWindow() {
  activeDisplayId = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id;
  const bounds = panelBounds(activeDisplayId, false);
  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: MIN_PANEL_WIDTH,
    minHeight: 520,
    frame: false,
    transparent: false,
    backgroundColor: '#0b0d12',
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('blur', () => scheduleCollapse(480));
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function hasDisplayOnRight(display, allDisplays) {
  const right = display.bounds.x + display.bounds.width;
  return allDisplays.some((other) => {
    if (other.id === display.id || other.bounds.x !== right) return false;
    const top = Math.max(display.bounds.y, other.bounds.y);
    const bottom = Math.min(
      display.bounds.y + display.bounds.height,
      other.bounds.y + other.bounds.height,
    );
    return bottom > top;
  });
}

function createTriggerWindow(display, sharedEdge) {
  const handleHeight = sharedEdge ? Math.min(180, display.workArea.height) : display.workArea.height;
  const trigger = new BrowserWindow({
    x: display.workArea.x + display.workArea.width - EDGE_WIDTH,
    y: sharedEdge
      ? display.workArea.y + Math.round((display.workArea.height - handleHeight) / 2)
      : display.workArea.y,
    width: EDGE_WIDTH,
    height: handleHeight,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  trigger.loadFile(path.join(__dirname, 'renderer', 'edge.html'), {
    query: { displayId: String(display.id), shared: sharedEdge ? '1' : '0' },
  });
  trigger.once('ready-to-show', () => trigger.showInactive());
  trigger.on('closed', () => triggerWindows.delete(String(display.id)));
  triggerWindows.set(String(display.id), trigger);
}

function rebuildTriggerWindows() {
  for (const trigger of triggerWindows.values()) {
    if (!trigger.isDestroyed()) trigger.destroy();
  }
  triggerWindows.clear();
  const displays = screen.getAllDisplays();
  displays.forEach((display) => createTriggerWindow(display, hasDisplayOnRight(display, displays)));
}

ipcMain.on('panel-enter', (_, displayId) => expandPanel({ focus: true, displayId }));
ipcMain.on('panel-leave', () => scheduleCollapse());
ipcMain.on('panel-stay', () => clearTimeout(collapseTimer));
ipcMain.on('panel-collapse', () => collapsePanel());
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.handle('open-external', (_, url) => {
  if (/^https?:\/\//i.test(url)) return shell.openExternal(url);
  return false;
});
ipcMain.handle('pick-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '添加到 Sidepad',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '支持的内容', extensions: ['txt', 'md', 'markdown', 'json', 'csv', 'log', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });
  if (result.canceled) return [];
  return describeFiles(result.filePaths);
});
async function describeFiles(filePaths) {
  return Promise.all(filePaths.map(async (filePath) => {
    allowedFiles.add(path.resolve(filePath));
    const stat = await fs.stat(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const textExtensions = new Set(['txt', 'md', 'markdown', 'json', 'csv', 'log']);
    return {
      path: filePath,
      name: path.basename(filePath),
      ext,
      size: stat.size,
      content: textExtensions.has(ext) && stat.size < 5_000_000 ? await fs.readFile(filePath, 'utf8') : null,
      previewUrl: `sidepad-local://file/?path=${encodeURIComponent(filePath)}`,
    };
  }));
}
ipcMain.handle('import-files', (_, filePaths) => describeFiles(filePaths));
ipcMain.handle('open-file', (_, filePath) => shell.openPath(filePath));
ipcMain.handle('reveal-file', (_, filePath) => shell.showItemInFolder(filePath));
ipcMain.handle('authorize-file', async (_, filePath) => {
  const resolved = path.resolve(filePath);
  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) return false;
    allowedFiles.add(resolved);
    return true;
  } catch { return false; }
});

app.whenReady().then(() => {
  protocol.handle('sidepad-local', (request) => {
    const filePath = path.resolve(new URL(request.url).searchParams.get('path') || '');
    if (!allowedFiles.has(filePath)) return new Response('Not allowed', { status: 403 });
    return net.fetch(pathToFileURL(filePath).toString());
  });
  createWindow();
  rebuildTriggerWindows();
  screen.on('display-added', rebuildTriggerWindows);
  screen.on('display-metrics-changed', () => {
    rebuildTriggerWindows();
    if (isExpanded) animateTo(panelBounds(activeDisplayId, true));
  });
  screen.on('display-removed', () => {
    rebuildTriggerWindows();
    const display = getDisplay(activeDisplayId);
    activeDisplayId = display.id;
    if (isExpanded) animateTo(panelBounds(activeDisplayId, true));
  });
});

app.on('window-all-closed', () => app.quit());
app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  expandPanel({ focus: true, displayId: screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).id });
});
