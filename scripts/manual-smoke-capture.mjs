#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const tmpDir = path.join(rootDir, '.tmp');
const maxStoredCapturesPerKind = 15;
const captureResultPath = path.join(tmpDir, 'manual-smoke-capture-last-result.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
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

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function findFirstPid(pattern) {
  try {
    const output = run('pgrep', ['-f', pattern]);
    return output.split('\n').map((line) => line.trim()).find(Boolean) ?? '';
  } catch {
    return '';
  }
}

function getMainScreenScaleFactor() {
  const swiftScript = `
import AppKit
if let screen = NSScreen.main {
  print(screen.backingScaleFactor)
} else {
  print(1)
}
`;

  try {
    const output = run('swift', ['-e', swiftScript]);
    const scale = Number.parseFloat(output);
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  } catch {
    return 1;
  }
}

function findDesktopWindows() {
  const packagedDesktopPid = findFirstPid('zkTalk.app/Contents/MacOS/zkTalk');
  const devDesktopPid = findFirstPid('apps/desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');

  const swiftScript = `
import Cocoa
import CoreGraphics

let packagedPid = ${packagedDesktopPid || '0'}
let devPid = ${devDesktopPid || '0'}
func intValue(_ value: Any?) -> Int {
  if let number = value as? NSNumber {
    return number.intValue
  }
  if let string = value as? String, let number = Int(string) {
    return number
  }
  return 0
}

let windows = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] ?? []
var matches: [[String: Any]] = []
for window in windows {
  let pid = intValue(window[kCGWindowOwnerPID as String])
  let owner = window[kCGWindowOwnerName as String] as? String ?? ""
  let name = window[kCGWindowName as String] as? String ?? ""
  let wid = intValue(window[kCGWindowNumber as String])
  let bounds = window[kCGWindowBounds as String] as? [String: Any] ?? [:]
  let x = intValue(bounds["X"])
  let y = intValue(bounds["Y"])
  let width = intValue(bounds["Width"])
  let height = intValue(bounds["Height"])
  let isOnscreen = intValue(window["kCGWindowIsOnscreen"]) == 1

  if devPid > 0 && pid == devPid && (name == "zkTalk" || owner == "Electron") {
    matches.append([
      "id": wid,
      "owner": owner,
      "name": name,
      "x": x,
      "y": y,
      "width": width,
      "height": height,
      "isOnscreen": isOnscreen,
    ])
    continue
  }
  if packagedPid > 0 && pid == packagedPid && (name == "zkTalk" || owner == "zkTalk") {
    matches.append([
      "id": wid,
      "owner": owner,
      "name": name,
      "x": x,
      "y": y,
      "width": width,
      "height": height,
      "isOnscreen": isOnscreen,
    ])
    continue
  }
  if devPid > 0 && pid == devPid && owner == "Electron" && name == "Electron" {
    matches.append([
      "id": wid,
      "owner": owner,
      "name": name,
      "x": x,
      "y": y,
      "width": width,
      "height": height,
      "isOnscreen": isOnscreen,
    ])
  }
}
matches.sort {
  let leftOnscreen = ($0["isOnscreen"] as? Bool) == true
  let rightOnscreen = ($1["isOnscreen"] as? Bool) == true
  if leftOnscreen != rightOnscreen {
    return leftOnscreen && !rightOnscreen
  }
  let leftArea = (($0["width"] as? Int) ?? 0) * (($0["height"] as? Int) ?? 0)
  let rightArea = (($1["width"] as? Int) ?? 0) * (($1["height"] as? Int) ?? 0)
  return leftArea > rightArea
}
for match in matches {
  if let data = try? JSONSerialization.data(withJSONObject: match, options: []),
     let line = String(data: data, encoding: .utf8) {
    print(line)
  }
}
`;

  try {
    return run('swift', ['-e', swiftScript])
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function printUsage() {
  console.log(`Usage:
  node scripts/manual-smoke-capture.mjs [--no-desktop] [--no-mobile]

Defaults:
  Captures the current desktop zkTalk window (if visible) and the current booted iOS simulator screen.
`);
}

function listTimestampedCaptures(kind) {
  return fs
    .readdirSync(tmpDir)
    .filter((entry) => new RegExp(`^manual-smoke-${kind}-20\\d\\d-.*\\.png$`).test(entry))
    .sort()
    .reverse();
}

function pruneTimestampedCaptures(kind) {
  const deletedPaths = [];
  const staleEntries = listTimestampedCaptures(kind).slice(maxStoredCapturesPerKind);

  for (const entry of staleEntries) {
    const targetPath = path.join(tmpDir, entry);
    try {
      fs.unlinkSync(targetPath);
      deletedPaths.push(targetPath);
    } catch {
      // Ignore cleanup failures for old temp captures.
    }
  }

  return deletedPaths;
}

function captureDesktopWindowById(windowId, desktopPath) {
  execFileSync('screencapture', ['-x', '-l', String(windowId), desktopPath], {
    stdio: 'ignore',
  });
  return 'window-id';
}

function captureDesktopWindowByFullscreenCrop(desktopWindow, desktopPath) {
  const scale = getMainScreenScaleFactor();
  const pixelX = Math.max(0, Math.round(desktopWindow.x * scale));
  const pixelY = Math.max(0, Math.round(desktopWindow.y * scale));
  const pixelWidth = Math.max(1, Math.round(desktopWindow.width * scale));
  const pixelHeight = Math.max(1, Math.round(desktopWindow.height * scale));
  const fullPath = path.join(tmpDir, `manual-smoke-desktop-full-${process.pid}.png`);

  try {
    execFileSync('screencapture', ['-x', fullPath], {
      stdio: 'ignore',
    });
    execFileSync(
      'sips',
      [
        '-c',
        String(pixelHeight),
        String(pixelWidth),
        '--cropOffset',
        String(pixelY),
        String(pixelX),
        fullPath,
        '--out',
        desktopPath,
      ],
      {
        stdio: 'ignore',
      },
    );
  } finally {
    try {
      fs.unlinkSync(fullPath);
    } catch {
      // Best-effort cleanup only.
    }
  }

  return 'fullscreen-crop';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true') {
    printUsage();
    return;
  }

  fs.mkdirSync(tmpDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const result = {
    ok: true,
    maxStoredCapturesPerKind,
  };

  if (args['no-desktop'] !== 'true') {
    const desktopWindows = findDesktopWindows();
    result.desktopWindowId = desktopWindows[0]?.id || null;
    result.desktopWindowIds = desktopWindows.map((window) => window.id);
    result.desktopWindows = desktopWindows;
    if (desktopWindows.length > 0) {
      const desktopPath = path.join(tmpDir, `manual-smoke-desktop-${stamp}.png`);
      const latestDesktopPath = path.join(tmpDir, 'manual-smoke-desktop-latest.png');
      let captured = false;
      for (const desktopWindow of desktopWindows) {
        try {
          let captureMethod = '';
          try {
            captureMethod = captureDesktopWindowById(desktopWindow.id, desktopPath);
          } catch {
            captureMethod = captureDesktopWindowByFullscreenCrop(desktopWindow, desktopPath);
          }
          fs.copyFileSync(desktopPath, latestDesktopPath);
          result.desktopCapturePath = desktopPath;
          result.desktopLatestCapturePath = latestDesktopPath;
          result.desktopWindowId = String(desktopWindow.id);
          result.desktopCaptureMethod = captureMethod;
          captured = true;
          break;
        } catch {
          continue;
        }
      }
      if (!captured) {
        result.desktopCapturePath = null;
        result.desktopLatestCapturePath = null;
        result.desktopCaptureError = 'Failed to capture any matching desktop window';
      }
    } else {
      result.desktopCapturePath = null;
      result.desktopLatestCapturePath = null;
    }
  }

  if (args['no-mobile'] !== 'true') {
    const mobilePath = path.join(tmpDir, `manual-smoke-mobile-${stamp}.png`);
    const latestMobilePath = path.join(tmpDir, 'manual-smoke-mobile-latest.png');
    execFileSync('xcrun', ['simctl', 'io', 'booted', 'screenshot', mobilePath], {
      stdio: 'ignore',
    });
    result.mobileCapturePath = mobilePath;
    fs.copyFileSync(mobilePath, latestMobilePath);
    result.mobileLatestCapturePath = latestMobilePath;
  }

  result.deletedCapturePaths = [
    ...pruneTimestampedCaptures('desktop'),
    ...pruneTimestampedCaptures('mobile'),
  ];
  result.desktopCaptureCount = listTimestampedCaptures('desktop').length;
  result.mobileCaptureCount = listTimestampedCaptures('mobile').length;
  fs.writeFileSync(captureResultPath, JSON.stringify(result, null, 2));

  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
}
