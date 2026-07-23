const assert = require('node:assert/strict');
const test = require('node:test');
const { TerminalService, discoverShells } = require('../src/terminal-service');

class MockPtyProcess {
  constructor(pid = 7001) {
    this.pid = pid;
    this.writes = [];
    this.resizes = [];
    this.killed = false;
    this.dataListeners = new Set();
    this.exitListeners = new Set();
  }

  onData(listener) {
    this.dataListeners.add(listener);
    return { dispose: () => this.dataListeners.delete(listener) };
  }

  onExit(listener) {
    this.exitListeners.add(listener);
    return { dispose: () => this.exitListeners.delete(listener) };
  }

  write(data) { this.writes.push(data); }
  resize(cols, rows) { this.resizes.push({ cols, rows }); }
  kill() { this.killed = true; }
  emitData(data) { for (const listener of this.dataListeners) listener(data); }
  emitExit(exitCode = 0, signal = 0) {
    for (const listener of [...this.exitListeners]) listener({ exitCode, signal });
  }
}

function createHarness(overrides = {}) {
  const spawned = [];
  const events = [];
  const service = new TerminalService({
    pty: {
      spawn(executable, args, options) {
        const process = new MockPtyProcess(7000 + spawned.length);
        spawned.push({ executable, args, options, process });
        return process;
      },
    },
    platform: 'win32',
    env: {
      SystemRoot: 'C:\\Windows',
      ComSpec: 'C:\\Windows\\System32\\cmd.exe',
      ProgramFiles: 'C:\\Program Files',
    },
    homedir: 'C:\\Users\\Example',
    existsSync: candidate => [
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      'C:\\Windows\\System32\\cmd.exe',
    ].includes(candidate),
    send: (channel, payload) => events.push({ channel, payload }),
    ...overrides,
  });
  return { service, spawned, events };
}

test('discovers built-in Windows shells and conditionally exposes Git Bash', () => {
  const existing = new Set([
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    'C:\\Windows\\System32\\cmd.exe',
    'C:\\Program Files\\Git\\bin\\bash.exe',
  ]);
  const shells = discoverShells({
    platform: 'win32',
    env: {
      SystemRoot: 'C:\\Windows',
      ComSpec: 'C:\\Windows\\System32\\cmd.exe',
      ProgramFiles: 'C:\\Program Files',
    },
    existsSync: candidate => existing.has(candidate),
  });
  assert.deepEqual(shells.map(shell => shell.id), ['powershell', 'cmd', 'git-bash']);

  existing.delete('C:\\Program Files\\Git\\bin\\bash.exe');
  assert.deepEqual(
    discoverShells({
      platform: 'win32',
      env: {
        SystemRoot: 'C:\\Windows',
        ComSpec: 'C:\\Windows\\System32\\cmd.exe',
        ProgramFiles: 'C:\\Program Files',
      },
      existsSync: candidate => existing.has(candidate),
    }).map(shell => shell.id),
    ['powershell', 'cmd'],
  );
});

test('creates one idempotent session and forwards input, resize, output and exit', () => {
  const { service, spawned, events } = createHarness();
  assert.deepEqual(service.create({
    id: 'terminal-1',
    shellId: 'powershell',
    cols: 120,
    rows: 36,
  }), {
    ok: true,
    reused: false,
    pid: 7000,
    shellId: 'powershell',
  });
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].executable, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.deepEqual(spawned[0].args, ['-NoLogo']);
  assert.equal(spawned[0].options.cwd, 'C:\\Users\\Example');
  assert.equal(spawned[0].options.env.TERM, 'xterm-256color');

  assert.equal(service.create({
    id: 'terminal-1',
    shellId: 'cmd',
    cols: 80,
    rows: 24,
  }).reused, true);
  assert.equal(spawned.length, 1);

  assert.equal(service.write('terminal-1', 'Get-Date\r'), true);
  assert.equal(service.resize('terminal-1', 140, 42), true);
  assert.deepEqual(spawned[0].process.writes, ['Get-Date\r']);
  assert.deepEqual(spawned[0].process.resizes, [{ cols: 140, rows: 42 }]);

  spawned[0].process.emitData('READY\r\n');
  assert.deepEqual(events.at(-1), {
    channel: 'terminal-data',
    payload: { id: 'terminal-1', data: 'READY\r\n' },
  });

  spawned[0].process.emitExit(7, 0);
  assert.equal(service.has('terminal-1'), false);
  assert.deepEqual(events.at(-1), {
    channel: 'terminal-exit',
    payload: { id: 'terminal-1', exitCode: 7, signal: 0 },
  });
});

test('rejects unsafe requests and clamps terminal dimensions', () => {
  const { service, spawned } = createHarness();
  assert.equal(service.create({ id: '../escape', shellId: 'cmd' }).ok, false);
  assert.equal(service.create({ id: 'safe', shellId: 'unknown' }).ok, false);
  assert.equal(service.write('missing', 'dir\r'), false);
  assert.equal(service.resize('missing', 80, 24), false);

  assert.equal(service.create({
    id: 'safe',
    shellId: 'cmd',
    cols: 10000,
    rows: -3,
  }).ok, true);
  assert.equal(spawned[0].options.cols, 500);
  assert.equal(spawned[0].options.rows, 1);
  assert.equal(service.write('safe', 'x'.repeat(64 * 1024 + 1)), false);
});

test('explicit close and closeAll terminate every active PTY', () => {
  const { service, spawned } = createHarness();
  service.create({ id: 'one', shellId: 'cmd' });
  service.create({ id: 'two', shellId: 'powershell' });
  assert.equal(service.close('one'), true);
  assert.equal(spawned[0].process.killed, true);
  assert.equal(service.has('one'), false);

  service.closeAll();
  assert.equal(spawned[1].process.killed, true);
  assert.equal(service.sessions.size, 0);
});

test('reports a recoverable error when the PTY runtime cannot load', () => {
  const service = new TerminalService({
    platform: 'win32',
    pty: null,
    existsSync: () => true,
  });
  assert.deepEqual(service.create({ id: 'terminal', shellId: 'cmd' }), {
    ok: false,
    error: '终端运行时不可用，请重新安装 Sidepad。',
  });
});
