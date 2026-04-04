#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith('--')) continue;

    const key = part.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

function requireArg(args, key) {
  const value = args[key];
  if (!value) {
    throw new Error(`Missing required argument --${key}`);
  }
  return value;
}

function writeJson(targetDir, fileName, payload) {
  fs.writeFileSync(
    path.join(targetDir, fileName),
    JSON.stringify(payload, null, 2),
  );
}

function printUsage() {
  console.log(`Usage:
  node scripts/mobile-simulator-message.mjs \\
    --dir <simulator-documents-dir> \\
    --mode <channel|dm> \\
    --body <message text> \\
    [--session-token <token>] \\
    [--channel-id <id> --community-id <id> --channel-name <name>] \\
    [--conversation-id <id> --user-id <id> --display-name <name>]

Examples:
  node scripts/mobile-simulator-message.mjs \\
    --dir "/path/to/Documents/ExponentExperienceData/.../" \\
    --mode channel \\
    --channel-id 123 \\
    --community-id 456 \\
    --channel-name general \\
    --body "hello from simulator"

  node scripts/mobile-simulator-message.mjs \\
    --dir "/path/to/Documents/ExponentExperienceData/.../" \\
    --mode dm \\
    --conversation-id 789 \\
    --display-name "QA user" \\
    --body "hello from DM"
`);
}

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory does not exist: ${dir}`);
  }
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    throw new Error(`Not a directory: ${dir}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true') {
    printUsage();
    return;
  }

  const dir = requireArg(args, 'dir');
  const mode = requireArg(args, 'mode');
  const body = requireArg(args, 'body');

  ensureDirectory(dir);

  if (args['session-token']) {
    fs.writeFileSync(path.join(dir, 'dev-session-token.txt'), args['session-token']);
  }

  if (mode === 'channel') {
    const channelId = requireArg(args, 'channel-id');
    const communityId = requireArg(args, 'community-id');

    writeJson(dir, 'dev-route.json', {
      type: 'channel',
      channelId,
      communityId,
      channelName: args['channel-name'],
    });
    writeJson(dir, 'dev-compose.json', {
      channelId,
      body,
    });
  } else if (mode === 'dm') {
    const conversationId = requireArg(args, 'conversation-id');

    writeJson(dir, 'dev-route.json', {
      type: 'dm',
      conversationId,
      userId: args['user-id'],
      displayName: args['display-name'],
    });
    writeJson(dir, 'dev-compose.json', {
      conversationId,
      body,
    });
  } else {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  console.log(`Wrote simulator harness files to ${dir}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
}
