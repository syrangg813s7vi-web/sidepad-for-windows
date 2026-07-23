(() => {
  const sessions = new Map();
  let api;
  let root;
  let panels;
  let status;
  let activeId = null;
  let resizeObserver;

  function setStatus(text, state = '') {
    if (!status) return;
    status.textContent = text;
    status.dataset.state = state;
  }

  function fitSession(session) {
    if (!session || session.panel.hidden || !session.panel.isConnected) return;
    try {
      session.fit.fit();
      api.resize(session.id, session.terminal.cols, session.terminal.rows);
    } catch {}
  }

  function createView(item) {
    if (!globalThis.Terminal?.Terminal || !globalThis.FitAddon?.FitAddon) {
      setStatus('终端界面组件加载失败', 'error');
      return null;
    }

    const panel = document.createElement('div');
    panel.className = 'terminal-panel';
    panel.dataset.terminalId = item.id;
    panel.hidden = true;
    panels.appendChild(panel);

    const terminal = new globalThis.Terminal.Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'Cascadia Mono, Consolas, "SFMono-Regular", monospace',
      fontSize: 13,
      lineHeight: 1.18,
      scrollback: 5000,
      theme: {
        background: '#101216',
        foreground: '#d8dbe2',
        cursor: '#8d7cff',
        cursorAccent: '#101216',
        selectionBackground: '#50498288',
        black: '#1b1d23',
        red: '#f06b78',
        green: '#85d49a',
        yellow: '#e8c878',
        blue: '#75a7f5',
        magenta: '#b895f5',
        cyan: '#74ced1',
        white: '#d8dbe2',
        brightBlack: '#666d7b',
        brightRed: '#ff8892',
        brightGreen: '#a2e5ae',
        brightYellow: '#f4d98e',
        brightBlue: '#91b9f8',
        brightMagenta: '#c9adf8',
        brightCyan: '#92e0e2',
        brightWhite: '#ffffff',
      },
    });
    const fit = new globalThis.FitAddon.FitAddon();
    terminal.loadAddon(fit);
    terminal.open(panel);

    const session = {
      id: item.id,
      item,
      panel,
      terminal,
      fit,
      active: false,
      starting: false,
      inputDisposable: terminal.onData(data => api.write(item.id, data)),
    };
    sessions.set(item.id, session);
    return session;
  }

  async function startSession(session, announceRestart = false) {
    if (!session || session.starting || session.active) return;
    session.starting = true;
    setStatus(`正在启动 ${session.item.name}…`, 'starting');
    if (announceRestart) session.terminal.writeln('\r\n\x1b[90m[Sidepad 正在启动新会话]\x1b[0m');
    requestAnimationFrame(() => fitSession(session));
    await new Promise(resolve => requestAnimationFrame(resolve));
    const result = await api.create({
      id: session.id,
      shellId: session.item.shellId,
      cols: session.terminal.cols,
      rows: session.terminal.rows,
    });
    session.starting = false;
    session.active = Boolean(result?.ok);
    if (result?.ok) {
      if (activeId === session.id && !root.hidden) {
        setStatus(`${session.item.name} · 会话常驻`, 'running');
        session.terminal.focus();
        fitSession(session);
      }
      return;
    }
    const message = result?.error || '终端启动失败。';
    if (activeId === session.id && !root.hidden) setStatus(message, 'error');
    session.terminal.writeln(`\r\n\x1b[31m[Sidepad] ${message}\x1b[0m`);
  }

  async function show(item) {
    activeId = item.id;
    root.hidden = false;
    for (const session of sessions.values()) session.panel.hidden = session.id !== item.id;
    const existingSession = sessions.get(item.id);
    const session = existingSession || createView(item);
    if (!session) return;
    session.item = item;
    session.panel.hidden = false;
    if (session.active) {
      setStatus(`${item.name} · 会话常驻`, 'running');
      requestAnimationFrame(() => {
        fitSession(session);
        session.terminal.focus();
      });
    } else {
      await startSession(session, Boolean(existingSession));
    }
  }

  function hide() {
    root.hidden = true;
    activeId = null;
  }

  async function remove(id) {
    const session = sessions.get(id);
    await api.close(id);
    if (!session) return;
    session.inputDisposable?.dispose?.();
    session.terminal.dispose();
    session.panel.remove();
    sessions.delete(id);
    if (activeId === id) activeId = null;
  }

  async function restartActive() {
    const session = sessions.get(activeId);
    if (!session) return;
    await api.close(session.id);
    session.active = false;
    await startSession(session, true);
  }

  async function stopActive() {
    const session = sessions.get(activeId);
    if (!session) return;
    await api.close(session.id);
    session.active = false;
    setStatus(`${session.item.name} · 已停止`, 'stopped');
    session.terminal.writeln('\r\n\x1b[90m[Sidepad 已停止会话，可点击“重新启动”]\x1b[0m');
  }

  function clearActive() {
    const session = sessions.get(activeId);
    if (!session) return;
    session.terminal.clear();
    session.terminal.focus();
  }

  function initialize(options) {
    api = options.api;
    root = options.root;
    panels = options.panels;
    status = options.status;
    options.restartButton.addEventListener('click', restartActive);
    options.stopButton.addEventListener('click', stopActive);
    options.clearButton.addEventListener('click', clearActive);

    api.onData(({ id, data }) => {
      const session = sessions.get(id);
      if (session) session.terminal.write(data);
    });
    api.onExit(({ id, exitCode }) => {
      const session = sessions.get(id);
      if (!session) return;
      session.active = false;
      session.terminal.writeln(`\r\n\x1b[90m[进程已退出，代码 ${exitCode}]\x1b[0m`);
      if (activeId === id) setStatus(`${session.item.name} · 已退出`, 'stopped');
    });

    resizeObserver = new ResizeObserver(() => fitSession(sessions.get(activeId)));
    resizeObserver.observe(root);
  }

  window.sidepadTerminal = {
    initialize,
    show,
    hide,
    remove,
    restartActive,
    stopActive,
    clearActive,
  };
})();
