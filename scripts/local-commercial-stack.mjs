#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';

const repoRoot = '/Users/hyunokoh/Documents/Projects/zkTalk';
const composeFile = `${repoRoot}/docker/docker-compose.yml`;
const dockerArgs = ['compose', '-f', composeFile];

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  });
}

function runSafe(command, args, options = {}) {
  try {
    return run(command, args, options);
  } catch (error) {
    return String(error instanceof Error ? error.message : error);
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function ensureBucket() {
  const result = spawnSync(
    'docker',
    [
      'run', '--rm', '--network', 'host',
      '-e', 'MC_HOST_local=http://minioadmin:minioadmin@127.0.0.1:9000',
      'minio/mc', 'mb', '--ignore-existing', 'local/zktalk-uploads',
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Failed to ensure MinIO bucket');
  }
}

function ensureUploadAuthCompatibilityTables() {
  const sql = `
DO $$ BEGIN
  CREATE TYPE auth_method_type_enum AS ENUM ('email', 'phone', 'qr', 'google', 'apple');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
CREATE TABLE IF NOT EXISTS user_auth_methods (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  type auth_method_type_enum NOT NULL,
  identifier text NOT NULL,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS user_auth_methods_user_id_idx ON user_auth_methods(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_auth_methods_type_identifier_idx ON user_auth_methods(type, identifier);
`;
  const result = spawnSync('docker', ['exec', '-i', 'docker-postgres-1', 'psql', '-U', 'zktalk', '-d', 'zktalk'], {
    cwd: repoRoot,
    encoding: 'utf8',
    input: sql,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Failed to ensure auth compatibility tables');
  }
}

function waitForMinio() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = spawnSync('curl', ['-s', 'http://127.0.0.1:9000/minio/health/live'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    if (result.status === 0) {
      return result.stdout;
    }
    sleep(1000);
  }
  throw new Error('Timed out waiting for MinIO health endpoint');
}

function main() {
  process.stdout.write('Stopping conflicting local services if present...\n');
  for (const name of ['zkaml-db-1', 'zktalk-postgres-smoke', 'zk-talk-postgres', 'zk-talk-redis']) {
    runSafe('docker', ['rm', '-f', name]);
  }

  process.stdout.write('Starting deterministic commercialization stack...\n');
  runSafe('docker', [...dockerArgs, 'down', '--remove-orphans']);
  runSafe('docker', ['network', 'prune', '-f']);
  runSafe('docker', ['volume', 'prune', '-f']);
  process.stdout.write(run('docker', [...dockerArgs, 'up', '-d', 'postgres', 'redis', 'minio']));

  process.stdout.write('Waiting for Postgres...\n');
  process.stdout.write(run('docker', ['exec', 'docker-postgres-1', 'pg_isready', '-U', 'zktalk']));

  process.stdout.write('Waiting for Redis...\n');
  process.stdout.write(run('docker', ['exec', 'docker-redis-1', 'redis-cli', 'ping']));

  process.stdout.write('Waiting for MinIO...\n');
  process.stdout.write(waitForMinio());
  process.stdout.write('\nEnsuring MinIO bucket...\n');
  ensureBucket();

  process.stdout.write('Running DB migrations...\n');
  process.stdout.write(run('pnpm', ['--filter', '@zktalk/api', 'run', 'db:migrate']));

  process.stdout.write('Ensuring auth compatibility tables...\n');
  ensureUploadAuthCompatibilityTables();

  process.stdout.write('\nDeterministic local commercialization stack is ready.\n');
  process.stdout.write('Baseline:\n');
  process.stdout.write('- postgres: docker-postgres-1 -> 5432\n');
  process.stdout.write('- redis: docker-redis-1 -> 6379\n');
  process.stdout.write('- minio: docker-minio-1 -> 9000/9001 (bucket: zktalk-uploads)\n');
  process.stdout.write('\nNext step:\n');
  process.stdout.write('- start API/web, then run `pnpm local:commercial:seed` to create a chat-ready QA community\n');
}

main();
