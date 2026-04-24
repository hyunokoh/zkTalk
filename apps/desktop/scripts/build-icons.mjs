import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const desktopDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(desktopDir, '..', '..');
const sourceIcon = path.join(rootDir, 'apps', 'mobile', 'assets', 'branding', 'zktalk-icon.svg.png');
const buildDir = path.join(desktopDir, 'build');
const pngIcon = path.join(buildDir, 'icon.png');
const icoIcon = path.join(buildDir, 'icon.ico');

async function main() {
  mkdirSync(buildDir, { recursive: true });

  copyFileSync(sourceIcon, pngIcon);

  const icoBuffer = await pngToIco(sourceIcon);
  writeFileSync(icoIcon, icoBuffer);

  console.log('Built desktop icons:');
  console.log(`  ${pngIcon}`);
  console.log(`  ${icoIcon}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
