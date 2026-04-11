#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const queuePath = path.join(root, ".zkcoder", "plan-queue.json");
const mapPath = path.join(root, ".zkcoder", "queue-surface-map.json");
const riskDocPath = path.join(root, "docs", "high-risk-touched-surfaces-2026-04-07.md");
const allowedRiskAreas = new Set([
  "auth",
  "realtime",
  "uploads",
  "api-runtime",
  "web-composer",
  "mobile-selected-message-ai",
]);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

if (!fs.existsSync(queuePath)) {
  fail(`Missing queue: ${queuePath}`);
  process.exit(process.exitCode ?? 1);
}

if (!fs.existsSync(mapPath)) {
  fail(`Missing queue surface map: ${mapPath}`);
  process.exit(process.exitCode ?? 1);
}

if (!fs.existsSync(riskDocPath)) {
  fail(`Missing risk doc: ${riskDocPath}`);
  process.exit(process.exitCode ?? 1);
}

const queue = readJson(queuePath);
const map = readJson(mapPath);
const riskDoc = fs.readFileSync(riskDocPath, "utf8");

const queueItems = Array.isArray(queue.items) ? queue.items : [];
const mapItems = Array.isArray(map.items) ? map.items : [];
const mapById = new Map();

for (const entry of mapItems) {
  if (typeof entry?.id !== "number") {
    fail("queue surface map contains an entry without a numeric id");
    continue;
  }
  if (mapById.has(entry.id)) {
    fail(`queue surface map contains a duplicate id: ${entry.id}`);
    continue;
  }
  mapById.set(entry.id, entry);
}

const actionableItems = queueItems.filter(
  (item) =>
    item?.phase !== "Phase 0" &&
    (item?.type === "task" || item?.type === "exit_criteria") &&
    item?.status !== "completed",
);

for (const item of actionableItems) {
  const mapped = mapById.get(item.id);
  if (!mapped) {
    fail(`queue item ${item.id} is missing a surface map entry`);
    continue;
  }

  if (!allowedRiskAreas.has(mapped.riskArea)) {
    fail(`queue item ${item.id} has an invalid riskArea: ${mapped.riskArea}`);
  }

  const surfaceRefs = Array.isArray(mapped.surfaceRefs) ? mapped.surfaceRefs : [];
  const verifyRefs = Array.isArray(mapped.verifyRefs) ? mapped.verifyRefs : [];

  if (surfaceRefs.length === 0) {
    fail(`queue item ${item.id} has no surfaceRefs`);
  }

  if (verifyRefs.length === 0) {
    fail(`queue item ${item.id} has no verifyRefs`);
  }

  for (const ref of [...surfaceRefs, ...verifyRefs]) {
    if (typeof ref !== "string" || ref.trim().length === 0) {
      fail(`queue item ${item.id} contains an empty ref`);
      continue;
    }

    const absoluteRef = path.join(root, ref);
    if (!fs.existsSync(absoluteRef)) {
      fail(`queue item ${item.id} references a missing file: ${ref}`);
    }
  }

  const riskDocMatches = surfaceRefs.filter((ref) => riskDoc.includes(ref));
  if (riskDocMatches.length === 0) {
    fail(`queue item ${item.id} does not point at any surface documented in the risk map`);
  }
}

const orphanedIds = mapItems
  .map((item) => item.id)
  .filter((id) => !actionableItems.some((queueItem) => queueItem.id === id));

if (orphanedIds.length > 0) {
  fail(`queue surface map contains ids that are not active task items: ${orphanedIds.join(", ")}`);
}

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}

console.log(`queue surface map validated for ${actionableItems.length} active task items`);
