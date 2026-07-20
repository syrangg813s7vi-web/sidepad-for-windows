const { app, BrowserWindow, dialog, ipcMain, net, protocol, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { pathToFileURL } = require('url');
const {
  MIN_PANEL_WIDTH,
  calculatePanelBounds,
  calculateTriggerBounds,
  hasDisplayOnRight,
  selectPrimaryDisplay,
} = require('./window-layout');

const ANIMATION_MS = 180;
const PREVIEW_LEAVE_DELAY_MS = 260;
const WINDOWS_APP_ID = 'com.sidepad.windows';

let mainWindow;
let isExpanded = false;
let isInteractionLocked = false;
let collapseTimer;
let animationFrame;
let isFileDialogOpen = false;
const triggerWindows = new Map();
const allowedFiles = new Set();

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'sidepad-local',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

if (process.platform === 'win32') app.setAppUserModelId(WINDOWS_APP_ID);

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

function getPrimaryDisplay() {
  const primaryDisplay = screen.getPrimaryDisplay();
  return selectPrimaryDisplay(screen.getAllDisplays(), primaryDisplay.id) || primaryDisplay;
}

function panelBounds(expanded) {
  const display = getPrimaryDisplay();
  return calculatePanelBounds(display.workArea, expanded);
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

function expandPanel({ focus = false } = {}) {
  clearTimeout(collapseTimer);
  if (focus) isInteractionLocked = true;
  if (isExpanded) {
    if (focus) mainWindow?.focus();
    return;
  }
  isExpanded = true;
  mainWindow.setBounds(panelBounds(false));
  mainWindow.showInactive();
  mainWindow.setOpacity(1);
  mainWindow.webContents.send('panel-state', { expanded: true });
  animateTo(panelBounds(true), () => {
    if (focus) mainWindow.focus();
  });
}

function collapsePanel() {
  clearTimeout(collapseTimer);
  isInteractionLocked = false;
  if (!isExpanded || !mainWindow || mainWindow.isDestroyed()) return;
  isExpanded = false;
  mainWindow.webContents.send('panel-state', { expanded: false });
  animateTo(panelBounds(false), () => mainWindow.hide());
}

function scheduleCollapse(delay = 480) {
  clearTimeout(collapseTimer);
  collapseTimer = setTimeout(collapsePanel, delay);
}

function pinPanelInteraction() {
  if (!isExpanded || !mainWindow || mainWindow.isDestroyed()) return;
  clearTimeout(collapseTimer);
  isInteractionLocked = true;
  mainWindow.focus();
}

function schedulePreviewCollapse() {
  if (!isExpanded || isInteractionLocked) return;
  scheduleCollapse(PREVIEW_LEAVE_DELAY_MS);
}

function destroyTriggerWindows() {
  for (const trigger of [...triggerWindows.values()]) {
    if (!trigger.isDestroyed()) trigger.destroy();
  }
  triggerWindows.clear();
}

function quitApplication() {
  clearTimeout(collapseTimer);
  if (animationFrame) {
    clearInterval(animationFrame);
    animationFrame = null;
  }
  isExpanded = false;
  isInteractionLocked = false;
  destroyTriggerWindows();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
  app.quit();
}

function createWindow() {
  const bounds = panelBounds(false);
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
  mainWindow.on('focus', () => {
    if (!isExpanded) return;
    clearTimeout(collapseTimer);
    isInteractionLocked = true;
  });
  mainWindow.on('blur', () => {
    if (!isFileDialogOpen) scheduleCollapse();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    isExpanded = false;
    isInteractionLocked = false;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-attach-webview', (_, guest) => {
    const chromiumUserAgent = guest.getUserAgent()
      .replace(/\sElectron\/\S+/g, '')
      .replace(/\sSidepad\/\S+/g, '');
    guest.setUserAgent(chromiumUserAgent);
    guest.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) void guest.loadURL(url).catch(() => {});
      return { action: 'deny' };
    });
  });
}

function createTriggerWindow(display, sharedEdge) {
  const bounds = calculateTriggerBounds(display, sharedEdge);
  const trigger = new BrowserWindow({
    ...bounds,
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
    query: { shared: sharedEdge ? '1' : '0' },
  });
  trigger.once('ready-to-show', () => trigger.showInactive());
  trigger.on('closed', () => triggerWindows.delete(String(display.id)));
  triggerWindows.set(String(display.id), trigger);
}

function rebuildTriggerWindows() {
  destroyTriggerWindows();
  const displays = screen.getAllDisplays();
  const primaryDisplay = getPrimaryDisplay();
  createTriggerWindow(primaryDisplay, hasDisplayOnRight(primaryDisplay, displays));
}

ipcMain.on('panel-enter', () => expandPanel({ focus: false }));
ipcMain.on('panel-pin', () => pinPanelInteraction());
ipcMain.on('panel-leave', () => schedulePreviewCollapse());
ipcMain.on('panel-collapse', () => collapsePanel());
ipcMain.on('window-close', () => quitApplication());
ipcMain.handle('open-external', (_, url) => {
  if (/^https?:\/\//i.test(url)) return shell.openExternal(url);
  return false;
});
ipcMain.handle('pick-files', async () => {
  clearTimeout(collapseTimer);
  isFileDialogOpen = true;
  let result;
  try {
    result = await dialog.showOpenDialog(mainWindow, {
      title: '添加到 Sidepad',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '支持的内容', extensions: ['txt', 'md', 'markdown', 'json', 'csv', 'log', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
  } finally {
    isFileDialogOpen = false;
    clearTimeout(collapseTimer);
    if (mainWindow && !mainWindow.isDestroyed()) expandPanel({ focus: true });
  }
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
  const refreshPrimaryDisplay = () => {
    rebuildTriggerWindows();
    if (isExpanded) animateTo(panelBounds(true));
    else if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setBounds(panelBounds(false));
  };
  screen.on('display-added', refreshPrimaryDisplay);
  screen.on('display-metrics-changed', refreshPrimaryDisplay);
  screen.on('display-removed', refreshPrimaryDisplay);
});

app.on('window-all-closed', () => app.quit());
app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  expandPanel({ focus: true });
});
