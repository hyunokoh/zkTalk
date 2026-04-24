const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');

const {
  buildInstructionFromCommand,
  collectReadableCodexOutput,
  createCodexAgentDriver,
  executeCodexInstruction,
} = require('./agent-ai-driver');

function createMockChild({ stdout = '', stderr = '', code = 0, error = null, delayMs = 0 } = {}) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killCalls = [];
  child.kill = (signal) => {
    child.killCalls.push(signal);
    child.emit('close', null, signal);
  };

  setTimeout(() => {
    if (stdout) child.stdout.write(stdout);
    if (stderr) child.stderr.write(stderr);
    if (error) {
      child.emit('error', error);
      return;
    }
    child.emit('close', code, null);
  }, delayMs);

  return child;
}

test('buildInstructionFromCommand prefers args and strips slash command prefixes', () => {
  assert.equal(
    buildInstructionFromCommand({ args: 'summarize this repo', rawCommand: '/mac.codex ignored' }),
    'summarize this repo',
  );
  assert.equal(
    buildInstructionFromCommand({ args: '', rawCommand: '/mac.codex summarize docs' }),
    'summarize docs',
  );
  assert.equal(buildInstructionFromCommand({ rawCommand: 'plain instruction' }), 'plain instruction');
});

test('collectReadableCodexOutput extracts useful text from JSONL output', () => {
  const output = collectReadableCodexOutput(
    [
      JSON.stringify({ message: 'thinking' }),
      JSON.stringify({ output: 'final answer' }),
      'plain line',
    ].join('\n'),
  );
  assert.match(output, /thinking/);
  assert.match(output, /final answer/);
  assert.match(output, /plain line/);
});

test('executeCodexInstruction runs codex exec with the target instruction', async () => {
  let seenBin = null;
  let seenArgs = null;
  const result = await executeCodexInstruction('say hello', {
    codexBin: '/tmp/codex',
    cwd: '/tmp',
    spawnImpl(bin, args) {
      seenBin = bin;
      seenArgs = args;
      return createMockChild({
        stdout: `${JSON.stringify({ output: 'hello from codex' })}\n`,
        code: 0,
      });
    },
  });

  assert.equal(seenBin, '/tmp/codex');
  assert.deepEqual(seenArgs.slice(0, 7), [
    'exec',
    '--skip-git-repo-check',
    '--cd',
    '/tmp',
    '--sandbox',
    'workspace-write',
    '--json',
  ]);
  assert.equal(seenArgs.at(-1), 'say hello');
  assert.equal(result.exitCode, 0);
  assert.match(result.stdoutTrunc, /hello from codex/);
});

test('executeCodexInstruction reports missing codex binary clearly', async () => {
  const enoent = new Error('spawn codex ENOENT');
  enoent.code = 'ENOENT';
  const result = await executeCodexInstruction('work', {
    spawnImpl() {
      throw enoent;
    },
  });

  assert.equal(result.exitCode, 127);
  assert.match(result.stderrTrunc, /codex binary was not found/);
});

test('createCodexAgentDriver executes command args through injected spawn', async () => {
  const driver = createCodexAgentDriver({
    spawnImpl() {
      return createMockChild({ stdout: 'driver result', code: 0 });
    },
  });
  const result = await driver.execute({
    agentSlug: 'codex',
    args: 'inspect the inbox',
    rawCommand: '/target.codex inspect the inbox',
  });

  assert.equal(driver.agentSlug, 'codex');
  assert.equal(result.exitCode, 0);
  assert.match(result.stdoutTrunc, /driver result/);
});
