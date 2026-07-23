const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const ExcelJS = require('exceljs');
const { Document, Packer, Paragraph, TextRun } = require('docx');

const root = path.resolve(__dirname, '..');
const electronBinary = path.join(root, 'node_modules', '.bin', 'electron');
const debugPort = 9333;
const profileDir = path.join(os.tmpdir(), `sidepad-e2e-profile-${process.pid}`);
const fixtureDir = path.join(os.tmpdir(), `sidepad-e2e-files-${process.pid}`);

let electron;
let server;
let logs = '';
let failWebRequests = true;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(fn, message, timeout = 15000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }
  throw new Error(`${message}${lastError ? `: ${lastError.message}` : ''}`);
}

class Cdp {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject, timer } = this.pending.get(message.id);
      this.pending.delete(message.id);
      clearTimeout(timer);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out`));
      }, 30000);
      this.pending.set(id, { resolve, reject, timer });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return result;
  }

  async eval(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
  }

  close() {
    this.socket.close();
  }
}

async function getTargets() {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
  return response.json();
}

async function createFixtures() {
  await fs.mkdir(fixtureDir, { recursive: true });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('QA');
  sheet.addRow(['Name', 'Status']);
  sheet.addRow(['Sidepad QA', 'Passed']);
  await workbook.xlsx.writeFile(path.join(fixtureDir, 'sample.xlsx'));

  const document = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Sidepad DOCX QA', bold: true })] }),
        new Paragraph('Self-contained document preview test.'),
      ],
    }],
  });
  await fs.writeFile(path.join(fixtureDir, 'sample.docx'), await Packer.toBuffer(document));

  await fs.copyFile(
    path.join(root, 'tests', 'fixtures', 'sample-multipage.pptx'),
    path.join(fixtureDir, 'sample.pptx'),
  );
  await fs.copyFile(
    path.join(root, 'tests', 'fixtures', 'sample-two-page.pdf'),
    path.join(fixtureDir, 'sample.pdf'),
  );
}

function startFixtureServer() {
  server = http.createServer((request, response) => {
    if (request.url === '/fails-once' && failWebRequests) {
      response.destroy();
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (request.url === '/fails-once') {
      response.end('<!doctype html><title>Sidepad Retry QA</title><h1>Recovered</h1>');
    } else if (request.url === '/popup-source') {
      response.end('<!doctype html><title>Popup Source</title><button onclick="window.open(\'/popup-target\', \'_blank\')">Open</button>');
    } else if (request.url === '/popup-target') {
      response.end('<!doctype html><title>Popup Target</title><h1>Same webview</h1>');
    } else if (request.url === '/fixed-width') {
      response.end('<!doctype html><title>Fixed Width QA</title><style>html,body{margin:0;min-width:1100px}main{width:1100px;height:600px;background:#f4efe7}</style><main>Desktop-width content</main>');
    } else {
      response.end('<!doctype html><title>Sidepad Web QA</title><h1>Sidepad Web QA</h1>');
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

async function setActiveItem(main, item) {
  const itemJson = JSON.stringify(item);
  await main.eval(`(() => {
    localStorage.setItem('sidepad.items', JSON.stringify([${itemJson}]));
    localStorage.setItem('sidepad.activeId', ${JSON.stringify(item.id)});
    location.reload();
    return true;
  })()`);
  await sleep(700);
}

async function authorize(main, filePath) {
  const allowed = await main.eval(`window.sidepad.authorizeFile(${JSON.stringify(filePath)})`);
  assert.equal(allowed, true, `file should be authorized: ${filePath}`);
}

async function run() {
  await createFixtures();
  const serverPort = await startFixtureServer();

  electron = spawn(electronBinary, [
    '.',
    '--disable-gpu',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
  ], {
    cwd: root,
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  electron.stdout.on('data', chunk => { logs += chunk; });
  electron.stderr.on('data', chunk => { logs += chunk; });

  const targets = await waitFor(async () => {
    const list = await getTargets();
    return list.some(target => target.url.includes('index.html'))
      && list.some(target => target.url.includes('edge.html')) ? list : null;
  }, 'Electron renderer targets did not appear');

  const mainTarget = targets.find(target => target.url.includes('index.html'));
  const edgeTarget = targets.find(target => target.url.includes('edge.html'));
  const main = new Cdp(mainTarget.webSocketDebuggerUrl);
  const edge = new Cdp(edgeTarget.webSocketDebuggerUrl);
  await Promise.all([main.send('Runtime.enable'), edge.send('Runtime.enable')]);

  try {
    await waitFor(
      () => main.eval('document.querySelectorAll(".home-card").length === 4'),
      'home should show 3 defaults plus add',
    );
  } catch (error) {
    const bootState = await main.eval(`({
      ready: document.readyState,
      url: location.href,
      homeGrid: document.querySelector('#homeGrid')?.innerHTML,
      scripts: [...document.scripts].map(script => script.src),
      renderers: {
        docx: typeof window.docx,
        excel: typeof window.ExcelJS,
        pptx: typeof window.pptxPreview
      }
    })`);
    throw new Error(`${error.message}\nBoot state: ${JSON.stringify(bootState)}`);
  }
  assert.deepEqual(await main.eval(`({
    docx: typeof window.docx?.renderAsync === 'function',
    zip: typeof window.JSZip?.loadAsync === 'function',
    excel: typeof window.ExcelJS?.Workbook === 'function',
    pptx: typeof window.pptxPreview?.init === 'function'
  })`), { docx: true, zip: true, excel: true, pptx: true }, 'bundled document renderers should load');

  await edge.eval('window.sidepad.enter()');
  await waitFor(() => main.eval('document.body.classList.contains("expanded")'), 'edge trigger did not expand panel');
  await main.eval('document.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }))');
  await sleep(100);
  await main.eval('window.sidepad.leave()');
  await waitFor(
    async () => !(await main.eval('document.body.classList.contains("expanded")')),
    'an unclicked hover preview should collapse after pointer leave',
  );

  await edge.eval('window.sidepad.enter()');
  await waitFor(() => main.eval('document.body.classList.contains("expanded")'), 'edge trigger did not reopen panel');
  await main.eval('window.sidepad.pin()');
  await main.eval('document.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }))');
  await sleep(100);
  await main.eval('window.sidepad.pin()');
  await sleep(800);
  assert.equal(
    await main.eval('document.body.classList.contains("expanded")'),
    true,
    'an interacted panel should remain expanded after pointer leave',
  );
  await main.eval('window.sidepad.collapse()');
  await waitFor(async () => !(await main.eval('document.body.classList.contains("expanded")')), 'panel did not collapse');

  const note = { id: 'qa-note', type: 'note', name: 'QA Note', content: 'Persisted note', color: '#7566ec' };
  await setActiveItem(main, note);
  await waitFor(() => main.eval('document.querySelector("#noteEditor")?.value === "Persisted note"'), 'note content did not restore');
  await main.eval(`(() => {
    const editor = document.querySelector('#noteEditor');
    editor.value = 'Updated note';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return JSON.parse(localStorage.getItem('sidepad.items'))[0].content;
  })()`);
  assert.equal(await main.eval('JSON.parse(localStorage.getItem("sidepad.items"))[0].content'), 'Updated note');

  await edge.eval('window.sidepad.enter()');
  await waitFor(() => main.eval('document.body.classList.contains("expanded")'), 'panel did not expand for terminal test');
  await main.eval('window.sidepad.pin()');
  const terminalShell = await main.eval('(async () => (await window.sidepad.terminal.listShells())[0])()');
  assert.ok(terminalShell?.id, 'at least one supported terminal shell should be discoverable');
  const terminalItem = {
    id: 'qa-terminal',
    type: 'terminal',
    name: 'QA Code Agent',
    shellId: terminalShell.id,
    cwd: null,
    color: '#26344a',
  };
  await setActiveItem(main, terminalItem);
  await main.eval(`(() => {
    window.sidepad.enter();
    setTimeout(() => window.sidepad.pin(), 50);
    return true;
  })()`);
  await waitFor(
    () => main.eval('document.body.classList.contains("expanded")'),
    'panel did not remain visible for terminal startup',
  );
  const terminalState = await waitFor(
    async () => {
      const state = await main.eval('document.querySelector("#terminalStatus")?.dataset.state');
      return ['running', 'error'].includes(state) ? state : null;
    },
    'terminal PTY did not reach a final startup state',
  );
  if (terminalState === 'error') {
    assert.notEqual(process.platform, 'win32', 'Windows terminal PTY must start successfully');
    const terminalError = await main.eval('document.querySelector("#terminalStatus")?.textContent?.trim() || ""');
    assert.ok(terminalError, 'unsupported host PTY failure should remain visible and recoverable');
    console.log('SKIP persistent terminal runtime: current non-Windows host rejected node-pty spawn');
  } else {
    const firstTerminalSession = await main.eval(`window.sidepad.terminal.create({
      id: 'qa-terminal',
      shellId: ${JSON.stringify(terminalShell.id)},
      cols: 80,
      rows: 24
    })`);
    assert.equal(firstTerminalSession.reused, true, 'terminal should reuse its active PTY session');
    const terminalCommand = terminalShell.id === 'powershell'
      ? 'Write-Output SIDEPAD_TERMINAL_READY\r'
      : terminalShell.id === 'cmd'
        ? 'echo SIDEPAD_TERMINAL_READY\r'
        : "printf 'SIDEPAD_TERMINAL_READY\\n'\r";
    await main.eval(`window.sidepad.terminal.write('qa-terminal', ${JSON.stringify(terminalCommand)})`);
    await waitFor(
      () => main.eval('document.querySelector(".terminal-panel:not([hidden]) .xterm-rows")?.textContent.includes("SIDEPAD_TERMINAL_READY")'),
      'terminal output did not reach xterm',
    );
    const terminalNote = { id: 'qa-terminal-note', type: 'note', name: 'Terminal Switch', content: '', color: '#7566ec' };
    await main.eval(`(() => {
      items.push(${JSON.stringify(terminalNote)});
      selectItem('qa-terminal-note');
      selectItem('qa-terminal');
      return true;
    })()`);
    await waitFor(
      () => main.eval('document.querySelector("#terminalStatus")?.dataset.state === "running"'),
      'terminal did not restore after tab switching',
    );
    const restoredTerminalSession = await main.eval(`window.sidepad.terminal.create({
      id: 'qa-terminal',
      shellId: ${JSON.stringify(terminalShell.id)},
      cols: 80,
      rows: 24
    })`);
    assert.equal(restoredTerminalSession.reused, true, 'tab switching must not recreate the terminal PTY');
    assert.equal(restoredTerminalSession.pid, firstTerminalSession.pid, 'terminal PID must remain stable across tab switching');
    assert.equal(
      await main.eval('document.querySelector(".terminal-panel:not([hidden]) .xterm-rows")?.textContent.includes("SIDEPAD_TERMINAL_READY")'),
      true,
      'terminal scrollback should remain visible after tab switching',
    );
  }

  const web = { id: 'qa-web', type: 'web', name: 'Web QA', url: `http://127.0.0.1:${serverPort}`, color: '#4285f4' };
  await setActiveItem(main, web);
  await waitFor(() => main.eval('document.querySelector("#pageTitle")?.textContent === "Sidepad Web QA"'), 'Chromium webview did not load local page');
  assert.equal(
    await main.eval('!/Electron\\//.test(document.querySelector("#webview").getUserAgent())'),
    true,
    'webview user agent should not expose the Electron product token',
  );
  assert.deepEqual(await main.eval(`(() => {
    const shell = document.querySelector('.app-shell').getBoundingClientRect();
    const webview = document.querySelector('#webview').getBoundingClientRect();
    return {
      documentFits: document.documentElement.scrollWidth <= window.innerWidth,
      shellFits: shell.left >= 0 && shell.right <= window.innerWidth,
      webviewFits: webview.left >= 0 && webview.right <= window.innerWidth,
    };
  })()`), {
    documentFits: true,
    shellFits: true,
    webviewFits: true,
  }, 'web content must stay inside the Sidepad viewport');
  const webviewViewport = await main.eval(`(async () => {
    const webview = document.querySelector('#webview');
    const rect = webview.getBoundingClientRect();
    const guest = await webview.executeJavaScript('({ width: innerWidth, height: innerHeight })');
    return {
      widthMatches: Math.abs(guest.width - rect.width) < 2,
      heightMatches: Math.abs(guest.height - rect.height) < 2,
    };
  })()`);
  assert.deepEqual(webviewViewport, {
    widthMatches: true,
    heightMatches: true,
  }, 'guest webpage viewport must match the visible WebView size');

  const fixedWidthWeb = { id: 'qa-fixed-width', type: 'web', name: 'Fixed Width QA', url: `http://127.0.0.1:${serverPort}/fixed-width`, color: '#7a624b' };
  await setActiveItem(main, fixedWidthWeb);
  await waitFor(() => main.eval('document.querySelector("#pageTitle")?.textContent === "Fixed Width QA"'), 'fixed-width page did not load');
  await waitFor(() => main.eval(`(async () => {
    const webview = document.querySelector('#webview');
    const metrics = await webview.executeJavaScript('({ viewportWidth: innerWidth, contentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) })');
    return webview.getZoomFactor() >= 0.99 && metrics.contentWidth <= metrics.viewportWidth + 4;
  })()`), 'fixed-width page was not reflowed into the WebView at a readable zoom', 5000);

  const failingWeb = { id: 'qa-fail', type: 'web', name: 'Retry QA', url: `http://127.0.0.1:${serverPort}/fails-once`, color: '#d55d54' };
  await setActiveItem(main, failingWeb);
  await waitFor(() => main.eval('document.querySelector("#webError")?.hidden === false'), 'web failure did not show an error');
  failWebRequests = false;
  await main.eval('document.querySelector("#webRetryButton").click()');
  await waitFor(() => main.eval('document.querySelector("#pageTitle")?.textContent === "Sidepad Retry QA" && document.querySelector("#webError")?.hidden'), 'web retry did not recover');

  const popupWeb = { id: 'qa-popup', type: 'web', name: 'Popup QA', url: `http://127.0.0.1:${serverPort}/popup-source`, color: '#258ffa' };
  await setActiveItem(main, popupWeb);
  await waitFor(() => main.eval('document.querySelector("#pageTitle")?.textContent === "Popup Source"'), 'popup source did not load');
  await main.eval('document.querySelector("#webview").executeJavaScript("document.querySelector(\\"button\\").click()")');
  await waitFor(() => main.eval('document.querySelector("#pageTitle")?.textContent === "Popup Target"'), 'target=_blank did not navigate the current webview');

  for (const [ext, assertion] of [
    ['pdf', `(() => {
      const frame = document.querySelector('#filePreview iframe');
      const preview = document.querySelector('#filePreview');
      const frameRect = frame?.getBoundingClientRect();
      const previewRect = preview?.getBoundingClientRect();
      return frame?.src.includes('sidepad-local://file/')
        && Math.abs(frameRect.width - previewRect.width) < 1
        && Math.abs(frameRect.height - previewRect.height) < 1
        && previewRect.left >= 0
        && previewRect.right <= window.innerWidth;
    })()`],
    ['docx', 'document.querySelector(".docx-stage")?.childElementCount > 0'],
    ['pptx', `(() => {
      const stage = document.querySelector('.pptx-stage');
      const preview = document.querySelector('#filePreview');
      const slides = [...document.querySelectorAll('.pptx-preview-slide-wrapper')];
      const stageRect = stage?.getBoundingClientRect();
      const previewRect = preview?.getBoundingClientRect();
      return stage?.dataset.slideCount === '3'
        && slides.length === 3
        && Math.abs(stageRect.width - previewRect.width) < 1
        && Math.abs(stageRect.height - previewRect.height) < 1
        && previewRect.left >= 0
        && previewRect.right <= window.innerWidth
        && slides.every((slide) => slide.getBoundingClientRect().width <= stage.clientWidth)
        && stage.scrollHeight > slides[0].clientHeight * 2;
    })()`],
    ['xlsx', 'document.querySelector(".sheet-table")?.textContent.includes("Sidepad QA")'],
  ]) {
    const filePath = path.join(fixtureDir, `sample.${ext}`);
    await authorize(main, filePath);
    await setActiveItem(main, {
      id: `qa-${ext}`,
      type: 'file',
      name: `sample.${ext}`,
      path: filePath,
      ext,
      size: (await fs.stat(filePath)).size,
      previewUrl: `sidepad-local://file/?path=${encodeURIComponent(filePath)}`,
      color: '#3f4657',
    });
    try {
      await waitFor(() => main.eval(assertion), `${ext.toUpperCase()} preview did not render`, 20000);
      if (ext === 'pptx') {
        assert.equal(await main.eval(`(() => {
          const pptxId = activeId;
          const note = { id: 'switch-note', type: 'note', name: 'Switch Note', content: '', color: '#7566ec' };
          items.push(note);
          selectItem(note.id);
          selectItem(pptxId);
          return document.querySelector('.pptx-stage')?.dataset.slideCount;
        })()`), '3', 'returning to a rendered PPTX should restore its cached preview immediately');
      }
    } catch (error) {
      const previewState = await main.eval(`({
        html: document.querySelector('#filePreview')?.innerHTML,
        text: document.querySelector('#filePreview')?.textContent,
        body: document.body.className
      })`);
      throw new Error(`${error.message}\nPreview state: ${JSON.stringify(previewState)}`);
    }
  }

  const appExited = new Promise(resolve => electron.once('exit', resolve));
  await main.eval('document.querySelector("#closeButton").click()');
  await Promise.race([appExited, sleep(5000)]);
  assert.notEqual(electron.exitCode, null, 'close button should terminate the entire Electron process');
  main.close();
  edge.close();
  console.log('PASS homepage and bundled renderer availability');
  console.log('PASS hover-preview collapse, click-lock persistence and programmatic collapse');
  console.log('PASS note restore and autosave');
  if (terminalState === 'running') {
    console.log('PASS persistent terminal PTY, output rendering and tab switching');
  }
  console.log('PASS Chromium webview navigation');
  console.log('PASS Chromium failure recovery and popup navigation');
  console.log('PASS PDF, DOCX, PPTX and XLSX self-contained previews');
  console.log('PASS close button terminates the main window, edge trigger and app process');
}

async function cleanup() {
  if (electron && electron.exitCode === null) {
    const exited = new Promise(resolve => electron.once('exit', resolve));
    electron.kill('SIGTERM');
    await Promise.race([exited, sleep(3000)]);
  }
  if (server) await new Promise(resolve => server.close(resolve));
  await Promise.all([
    fs.rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 }),
    fs.rm(fixtureDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 }),
  ]);
}

run()
  .catch(error => {
    console.error(error.stack || error);
    if (logs.trim()) console.error(`Electron logs:\n${logs}`);
    process.exitCode = 1;
  })
  .finally(cleanup);
