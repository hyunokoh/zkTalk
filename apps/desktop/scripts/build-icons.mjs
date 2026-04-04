import { mkdirSync, rmSync, copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const desktopDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(desktopDir, '..', '..');
const sourceIcon = path.join(rootDir, 'apps', 'mobile', 'assets', 'branding', 'zktalk-icon.svg.png');
const buildDir = path.join(desktopDir, 'build');
const iconsetDir = path.join(buildDir, 'icon.iconset');
const pngIcon = path.join(buildDir, 'icon.png');
const icnsIcon = path.join(buildDir, 'icon.icns');
const icoIcon = path.join(buildDir, 'icon.ico');

const iconsetSizes = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
];

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 1}`);
  }
}

async function main() {
  mkdirSync(buildDir, { recursive: true });
  rmSync(iconsetDir, { recursive: true, force: true });
  mkdirSync(iconsetDir, { recursive: true });

  copyFileSync(sourceIcon, pngIcon);

  for (const [filename, size] of iconsetSizes) {
    run('sips', ['-z', String(size), String(size), sourceIcon, '--out', path.join(iconsetDir, filename)]);
  }

  copyFileSync(sourceIcon, path.join(iconsetDir, 'icon_512x512@2x.png'));
  run('iconutil', ['-c', 'icns', iconsetDir, '-o', icnsIcon]);

  const icoBuffer = await pngToIco(sourceIcon);
  writeFileSync(icoIcon, icoBuffer);

  console.log('Built desktop icons:');
  console.log(`  ${pngIcon}`);
  console.log(`  ${icnsIcon}`);
  console.log(`  ${icoIcon}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
