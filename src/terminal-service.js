const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MAX_SESSIONS = 8;
const MAX_INPUT_LENGTH = 64 * 1024;
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function firstExisting(candidates, existsSync) {
  return candidates.find(candidate => candidate && existsSync(candidate)) || null;
}

function discoverShells({
  platform = process.platform,
  env = process.env,
  existsSync = fs.existsSync,
} = {}) {
  if (platform !== 'win32') {
    const executable = env.SHELL && existsSync(env.SHELL) ? env.SHELL : '/bin/sh';
    return [{
      id: 'system',
      name: `${path.basename(executable)}（开发环境）`,
      executable,
      args: ['-l'],
      optional: false,
    }];
  }

  const systemRoot = env.SystemRoot || env.WINDIR || 'C:\\Windows';
  const powershellPath = firstExisting([
    path.win32.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
  ], existsSync) || 'powershell.exe';
  const cmdPath = firstExisting([
    env.ComSpec,
    path.win32.join(systemRoot, 'System32', 'cmd.exe'),
  ], existsSync) || env.ComSpec || 'cmd.exe';

  const shells = [
    {
      id: 'powershell',
      name: 'Windows PowerShell',
      executable: powershellPath,
      args: ['-NoLogo'],
      optional: false,
    },
    {
      id: 'cmd',
      name: 'Command Prompt',
      executable: cmdPath,
      args: [],
      optional: false,
    },
  ];

  const gitBashPath = firstExisting([
    env.SIDEPAD_GIT_BASH_PATH,
    env.ProgramW6432 && path.win32.join(env.ProgramW6432, 'Git', 'bin', 'bash.exe'),
    env.ProgramFiles && path.win32.join(env.ProgramFiles, 'Git', 'bin', 'bash.exe'),
    env['ProgramFiles(x86)'] && path.win32.join(env['ProgramFiles(x86)'], 'Git', 'bin', 'bash.exe'),
  ], existsSync);
  if (gitBashPath) {
    shells.push({
      id: 'git-bash',
      name: 'Git Bash',
      executable: gitBashPath,
      args: ['--login', '-i'],
      optional: true,
    });
  }

  return shells;
}

class TerminalService {
  constructor({
    pty = null,
    platform = process.platform,
    env = process.env,
    homedir = os.homedir(),
    existsSync = fs.existsSync,
    send = () => {},
    maxSessions = MAX_SESSIONS,
  } = {}) {
    this.pty = pty;
    this.platform = platform;
    this.env = { ...env };
    this.homedir = homedir;
    this.existsSync = existsSync;
    this.send = send;
    this.maxSessions = maxSessions;
    this.sessions = new Map();
  }

  listShells() {
    return discoverShells({
      platform: this.platform,
      env: this.env,
      existsSync: this.existsSync,
    }).map(({ id, name, optional }) => ({ id, name, optional }));
  }

  getShell(shellId) {
    return discoverShells({
      platform: this.platform,
      env: this.env,
      existsSync: this.existsSync,
    }).find(shell => shell.id === shellId);
  }

  create({ id, shellId, cols, rows } = {}) {
    if (!SESSION_ID_PATTERN.test(String(id || ''))) {
      return { ok: false, error: '终端会话 ID 无效。' };
    }
    if (this.sessions.has(id)) {
      const existing = this.sessions.get(id);
      return { ok: true, reused: true, pid: existing.process.pid, shellId: existing.shell.id };
    }
    if (this.sessions.size >= this.maxSessions) {
      return { ok: false, error: `最多同时运行 ${this.maxSessions} 个终端。` };
    }
    if (!this.pty?.spawn) {
      return { ok: false, error: '终端运行时不可用，请重新安装 Sidepad。' };
    }

    const shell = this.getShell(shellId);
    if (!shell) return { ok: false, error: '选择的终端不可用。' };

    const terminalCols = clampInteger(cols, 2, 500, 80);
    const terminalRows = clampInteger(rows, 1, 300, 24);
    try {
      const processHandle = this.pty.spawn(shell.executable, shell.args, {
        name: 'xterm-256color',
        cols: terminalCols,
        rows: terminalRows,
        cwd: this.homedir,
        env: {
          ...this.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
      });
      const session = {
        id,
        shell,
        process: processHandle,
        disposables: [],
      };
      session.disposables.push(processHandle.onData(data => {
        this.safeSend('terminal-data', { id, data: String(data) });
      }));
      session.disposables.push(processHandle.onExit(({ exitCode, signal }) => {
        if (this.sessions.get(id) !== session) return;
        this.sessions.delete(id);
        this.disposeSession(session, false);
        this.safeSend('terminal-exit', { id, exitCode, signal });
      }));
      this.sessions.set(id, session);
      return { ok: true, reused: false, pid: processHandle.pid, shellId: shell.id };
    } catch (error) {
      return { ok: false, error: `无法启动 ${shell.name}：${error.message}` };
    }
  }

  write(id, data) {
    if (!SESSION_ID_PATTERN.test(String(id || '')) || typeof data !== 'string') return false;
    if (!data.length || data.length > MAX_INPUT_LENGTH) return false;
    const session = this.sessions.get(id);
    if (!session) return false;
    try {
      session.process.write(data);
      return true;
    } catch {
      return false;
    }
  }

  resize(id, cols, rows) {
    if (!SESSION_ID_PATTERN.test(String(id || ''))) return false;
    const session = this.sessions.get(id);
    if (!session) return false;
    try {
      session.process.resize(
        clampInteger(cols, 2, 500, 80),
        clampInteger(rows, 1, 300, 24),
      );
      return true;
    } catch {
      return false;
    }
  }

  close(id) {
    if (!SESSION_ID_PATTERN.test(String(id || ''))) return false;
    const session = this.sessions.get(id);
    if (!session) return false;
    this.sessions.delete(id);
    this.disposeSession(session, true);
    return true;
  }

  closeAll() {
    for (const id of [...this.sessions.keys()]) this.close(id);
  }

  has(id) {
    return this.sessions.has(id);
  }

  disposeSession(session, kill) {
    for (const disposable of session.disposables.splice(0)) {
      try { disposable?.dispose?.(); } catch {}
    }
    if (kill) {
      try { session.process.kill(); } catch {}
    }
  }

  safeSend(channel, payload) {
    try { this.send(channel, payload); } catch {}
  }
}

module.exports = {
  MAX_INPUT_LENGTH,
  MAX_SESSIONS,
  SESSION_ID_PATTERN,
  TerminalService,
  clampInteger,
  discoverShells,
};
