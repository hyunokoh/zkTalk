/* eslint-disable @typescript-eslint/no-var-requires */
const os = require('node:os');
const { spawn } = require('node:child_process');

const DEFAULT_CODEX_BIN = process.env.ZKTALK_AGENT_CODEX_BIN || process.env.ZKTALK_LOCAL_CODEX_BIN || 'codex';
const DEFAULT_CODEX_TIMEOUT_MS = Number(process.env.ZKTALK_AGENT_CODEX_TIMEOUT_MS) > 0
  ? Number(process.env.ZKTALK_AGENT_CODEX_TIMEOUT_MS)
  : 5 * 60_000;
const DEFAULT_CODEX_CWD = process.env.ZKTALK_AGENT_CODEX_CWD || os.homedir();
const MAX_OUTPUT_CHARS = 12_000;

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function truncateOutput(text, max = MAX_OUTPUT_CHARS) {
  const s = String(text ?? '');
  if (s.length <= max) return s;
  const dropped = s.length - max;
  return `${s.slice(0, max)}\n[... ${dropped} more chars truncated]`;
}

function buildInstructionFromCommand(command) {
  const args = normalizeText(command?.args);
  if (args) return args;

  const raw = normalizeText(command?.rawCommand);
  if (!raw.startsWith('/')) return raw;

  const space = raw.indexOf(' ');
  return space === -1 ? '' : raw.slice(space + 1).trim();
}

function collectReadableCodexOutput(stdout) {
  const lines = String(stdout ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const readable = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      const candidates = [
        parsed.message,
        parsed.text,
        parsed.content,
        parsed.delta,
        parsed.output,
        parsed.summary,
        parsed.result,
      ];
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
          readable.push(candidate.trim());
        }
      }
    } catch (_) {
      readable.push(line);
    }
  }

  return readable.length > 0 ? readable.join('\n') : String(stdout ?? '').trim();
}

function classifyCodexFailure(error, stderr) {
  const message = normalizeText(error?.message);
  const haystack = [message, stderr].filter(Boolean).join('\n').toLowerCase();

  if (error?.code === 'ENOENT') {
    return 'codex agent unavailable: codex binary was not found on the target machine';
  }

  if (
    haystack.includes('auth') ||
    haystack.includes('login') ||
    haystack.includes('api key') ||
    haystack.includes('unauthorized')
  ) {
    return 'codex auth missing or unusable on the target machine';
  }

  return message || 'codex agent failed on the target machine';
}

function executeCodexInstruction(instruction, options = {}) {
  const prompt = normalizeText(instruction);
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_CODEX_TIMEOUT_MS;
  const codexBin = normalizeText(options.codexBin) || DEFAULT_CODEX_BIN;
  const cwd = normalizeText(options.cwd) || DEFAULT_CODEX_CWD;
  const spawnImpl = options.spawnImpl || spawn;

  if (!prompt) {
    return Promise.resolve({
      exitCode: 2,
      stdoutTrunc: '',
      stderrTrunc: 'codex agent requires a non-empty instruction',
    });
  }

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const args = [
      'exec',
      '--skip-git-repo-check',
      '--cd',
      cwd,
      '--sandbox',
      'workspace-write',
      '--json',
      prompt,
    ];

    let child;
    try {
      child = spawnImpl(codexBin, args, {
        cwd,
        env: { ...process.env, ...(options.env || {}) },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (error) {
      resolve({
        exitCode: error?.code === 'ENOENT' ? 127 : -1,
        stdoutTrunc: '',
        stderrTrunc: classifyCodexFailure(error, ''),
      });
      return;
    }

    const finish = (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const readableStdout = collectReadableCodexOutput(stdout);
      resolve({
        exitCode,
        stdoutTrunc: truncateOutput(readableStdout),
        stderrTrunc: truncateOutput(
          timedOut
            ? `${stderr}\n[codex command exceeded ${timeoutMs}ms timeout - killed]`
            : stderr,
        ),
      });
    };

    const capture = (stream, onChunk) => {
      if (!stream || typeof stream.on !== 'function') return;
      if (typeof stream.setEncoding === 'function') stream.setEncoding('utf8');
      stream.on('data', onChunk);
    };

    capture(child.stdout, (chunk) => {
      if (stdout.length < MAX_OUTPUT_CHARS * 2) stdout += String(chunk);
      options.onOutput?.(String(chunk));
    });
    capture(child.stderr, (chunk) => {
      if (stderr.length < MAX_OUTPUT_CHARS * 2) stderr += String(chunk);
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
      } catch (_) {
        /* already dead */
      }
      setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch (_) {
          /* ignore */
        }
      }, 1_000);
    }, timeoutMs);

    child.on('error', (error) => {
      const classified = classifyCodexFailure(error, stderr);
      stderr = stderr ? `${stderr}\n${classified}` : classified;
      finish(error?.code === 'ENOENT' ? 127 : -1);
    });
    child.on('close', (code, signal) => {
      const exitCode = typeof code === 'number' ? code : signal ? 130 : -1;
      finish(exitCode);
    });
  });
}

function createCodexAgentDriver(options = {}) {
  return {
    agentSlug: options.agentSlug || 'codex',
    displayName: options.displayName || 'Codex',
    version: options.version || '0.1.0',
    defaultVerb: options.defaultVerb || 'exec',
    scopes: options.scopes || ['ai:codex', 'exec:codex'],
    commandTimeoutMs: options.commandTimeoutMs || DEFAULT_CODEX_TIMEOUT_MS,
    async execute(command, runOptions = {}) {
      if (typeof options.execute === 'function') {
        return options.execute(command, runOptions);
      }
      const instruction = buildInstructionFromCommand(command);
      return executeCodexInstruction(instruction, {
        ...runOptions,
        codexBin: runOptions.codexBin || options.codexBin,
        cwd: runOptions.cwd || options.cwd,
        env: runOptions.env || options.env,
        spawnImpl: runOptions.spawnImpl || options.spawnImpl,
      });
    },
  };
}

module.exports = {
  createCodexAgentDriver,
  executeCodexInstruction,
  buildInstructionFromCommand,
  collectReadableCodexOutput,
  classifyCodexFailure,
  DEFAULT_CODEX_BIN,
  DEFAULT_CODEX_TIMEOUT_MS,
  DEFAULT_CODEX_CWD,
};
