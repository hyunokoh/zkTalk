#!/usr/bin/env node

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/desktop-protocol-message.mjs --mode channel|dm --session-token <token> --body <text> [--nonce <value>] [--community-slug <slug>] [--channel-id <id>] [--conversation-id <id>]
`);
}

function buildChannelUrl(args) {
  if (!args['community-slug'] || !args['channel-id']) {
    throw new Error('Channel mode requires --community-slug and --channel-id');
  }

  const params = new URLSearchParams({
    mode: 'channel',
    sessionToken: args['session-token'],
    communitySlug: args['community-slug'],
    channelId: args['channel-id'],
    body: args.body,
    nonce: args.nonce ?? String(Date.now()),
  });

  if (args['topic']) {
    params.set('topic', args.topic);
  }

  return `zktalk://desktop-harness?${params.toString()}`;
}

function buildDmUrl(args) {
  if (!args['conversation-id']) {
    throw new Error('DM mode requires --conversation-id');
  }

  const params = new URLSearchParams({
    mode: 'dm',
    sessionToken: args['session-token'],
    conversationId: args['conversation-id'],
    body: args.body,
    nonce: args.nonce ?? String(Date.now()),
  });

  return `zktalk://desktop-harness?${params.toString()}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true') {
    printUsage();
    return;
  }

  if (!args.mode || !args['session-token'] || !args.body) {
    printUsage();
    process.exit(1);
  }

  const url = args.mode === 'channel'
    ? buildChannelUrl(args)
    : args.mode === 'dm'
    ? buildDmUrl(args)
    : (() => {
        throw new Error(`Unsupported mode: ${args.mode}`);
      })();

  console.log(JSON.stringify({ ok: true, mode: args.mode, url }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
}
