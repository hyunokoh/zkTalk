/**
 * Turn the raw `codex exec --json` JSONL stream into something humans can
 * read in a chat bubble.
 *
 * Codex emits one JSON object per line. The shapes that matter to us:
 *
 *   { type: "thread.started", thread_id: "..." }                  // ignore
 *   { type: "turn.started" }                                      // ignore
 *   { type: "turn.completed", usage: {...} }                      // ignore
 *
 *   { type: "item.completed", item: { type: "agent_message", text: "..." } }
 *     ── the agent's reply chunk; this is what the user wants to see
 *
 *   { type: "item.started",  item: { type: "command_execution", command, ... } }
 *     ── the agent decided to run a shell command; show the command
 *
 *   { type: "item.completed", item: { type: "command_execution",
 *       command, aggregated_output, exit_code } }
 *     ── shell command finished; show its output as a fenced code block
 *
 * We also keep a small backward-compat path for older codex versions that
 * emitted `{ message }`, `{ text }`, `{ output }`, `{ delta }` etc. at the
 * top level, since we still have rows in the DB written by older clients.
 */

interface CodexLineEvent {
  type?: string;
  item?: {
    type?: string;
    text?: string;
    command?: string;
    aggregated_output?: string;
    exit_code?: number | null;
  };
  // Legacy / passthrough fields used by older codex versions.
  message?: string;
  text?: string;
  content?: string;
  delta?: string;
  output?: string;
  summary?: string;
  result?: string;
}

const SEEN_COMMAND_KEY = '@@command';

/**
 * If a JSON object got truncated mid-string by the desktop bridge's
 * MAX_OUTPUT_CHARS cap, try to surface its `command` + `aggregated_output`
 * fields so the user at least sees what command ran and what stdout came
 * back. Returns null if nothing useful can be salvaged.
 */
function recoverPartialCommandLine(line: string): string | null {
  if (!line.startsWith('{')) return null;
  const cmdMatch = line.match(/"command":"((?:\\.|[^"\\])*)"/);
  const outMatch = line.match(/"aggregated_output":"((?:\\.|[^"\\])*)/);
  if (!cmdMatch && !outMatch) return null;

  const unescape = (s: string): string =>
    s
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

  const command = cmdMatch ? unescape(cmdMatch[1]) : '';
  const output = outMatch ? unescape(outMatch[1]) : '';
  const truncatedNote = output ? '\n[…output truncated]' : '';
  const cmdLine = command ? `$ ${command}` : '$ (command unavailable)';
  return `\n\`\`\`text\n${cmdLine}\n${output}${truncatedNote}\n\`\`\``;
}

function pushAgentLine(out: string[], text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  out.push(trimmed);
}

function pushCommandStart(out: string[], command: string): void {
  const trimmed = command.trim();
  if (!trimmed) return;
  out.push(`\n\`\`\`bash\n$ ${trimmed}\n\`\`\``);
}

function pushCommandResult(
  out: string[],
  command: string,
  output: string,
  exitCode: number | null | undefined,
): void {
  const trimmedOutput = (output ?? '').trim();
  const status =
    typeof exitCode === 'number' && exitCode !== 0 ? ` (exit ${exitCode})` : '';
  const blockBody = trimmedOutput ? `\n${trimmedOutput}` : '';
  out.push(`\n\`\`\`text\n$ ${command.trim()}${status}${blockBody}\n\`\`\``);
}

/**
 * Collect a readable transcript from the codex JSONL stdout. If `stdout`
 * already looks like plain text (no parseable JSON lines), returns it
 * unchanged so older deterministic agents are not affected.
 */
export function collectReadableCodexOutput(stdout: string | null | undefined): string {
  const raw = String(stdout ?? '');
  if (!raw.trim()) return '';

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const readable: string[] = [];
  // Track command_execution items by id so the started/completed pair can be
  // collapsed into a single fenced block on completion.
  const startedCommands = new Map<string, string>();
  let parsedAny = false;

  for (const line of lines) {
    let event: CodexLineEvent | null = null;
    try {
      event = JSON.parse(line);
    } catch {
      // Not JSON — could be (a) plain text codex sometimes interleaves
      // (warnings, login prompts) or (b) a JSON object truncated mid-string
      // because the desktop bridge capped stdout at MAX_OUTPUT_CHARS while
      // the agent was streaming. Try to recover the partial command output
      // before falling back to the raw line.
      const recovered = recoverPartialCommandLine(line);
      if (recovered) {
        readable.push(recovered);
      } else {
        readable.push(line);
      }
      continue;
    }

    if (!event || typeof event !== 'object') continue;
    parsedAny = true;

    // ── New-format codex (`item.completed` / `item.started`) ──────────
    if (
      (event.type === 'item.completed' || event.type === 'item.started') &&
      event.item &&
      typeof event.item === 'object'
    ) {
      const item = event.item;
      const itemId = (item as { id?: string }).id ?? '';

      if (item.type === 'agent_message' && typeof item.text === 'string') {
        pushAgentLine(readable, item.text);
        continue;
      }

      if (item.type === 'command_execution') {
        const cmd = typeof item.command === 'string' ? item.command : '';
        if (event.type === 'item.started') {
          if (cmd && itemId) {
            startedCommands.set(itemId, cmd);
          }
          continue;
        }
        // item.completed
        const startedCmd = itemId ? startedCommands.get(itemId) : undefined;
        startedCommands.delete(itemId);
        const finalCmd = cmd || startedCmd || SEEN_COMMAND_KEY;
        pushCommandResult(
          readable,
          finalCmd,
          item.aggregated_output ?? '',
          item.exit_code ?? null,
        );
        continue;
      }

      // Other item types (file_change etc.): fall through and try the
      // legacy candidate fields below in case they carry a text payload.
    }

    // ── Codex meta events we always drop ──────────────────────────────
    if (
      event.type === 'thread.started' ||
      event.type === 'turn.started' ||
      event.type === 'turn.completed'
    ) {
      continue;
    }

    // ── Legacy top-level text fields (older codex versions) ───────────
    const legacyCandidates = [
      event.message,
      event.text,
      event.content,
      event.delta,
      event.output,
      event.summary,
      event.result,
    ];
    let pushed = false;
    for (const candidate of legacyCandidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        pushAgentLine(readable, candidate);
        pushed = true;
      }
    }
    if (pushed) continue;
  }

  if (readable.length === 0) {
    // We saw JSON but extracted nothing meaningful — better to surface the
    // raw stream than to swallow it silently. The user can still see
    // *something* and report it.
    return parsedAny ? '' : raw.trim();
  }

  return readable.join('\n').trim();
}
