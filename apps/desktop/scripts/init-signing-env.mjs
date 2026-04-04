import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvedSigningEnvPath } from './signing-env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const sourcePath = path.join(desktopDir, 'SIGNING.example.env');

if (!existsSync(sourcePath)) {
  console.error(`Missing signing template: ${sourcePath}`);
  process.exit(1);
}

if (existsSync(resolvedSigningEnvPath)) {
  console.log(`Signing env already exists: ${resolvedSigningEnvPath}`);
  process.exit(0);
}

copyFileSync(sourcePath, resolvedSigningEnvPath);
console.log(`Created signing env: ${resolvedSigningEnvPath}`);
