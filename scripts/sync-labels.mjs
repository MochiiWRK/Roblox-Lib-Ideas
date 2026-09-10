#!/usr/bin/env node
// Applies .github/labels.yml to the repo. Needs the gh CLI, authenticated.
//   node scripts/sync-labels.mjs [--dry-run]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT } from "./lib.mjs";

const dry = process.argv.includes("--dry-run");
const text = fs.readFileSync(path.join(ROOT, ".github", "labels.yml"), "utf8");

const labels = [];
for (const line of text.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const m = /^(-\s+)?(name|color|description):\s*(.*)$/.exec(t);
  if (!m) continue;
  const value = m[3].replace(/^["']|["']$/g, "");
  if (m[2] === "name") labels.push({ name: value });
  else if (labels.length) labels[labels.length - 1][m[2]] = value;
}

console.log(`${labels.length} labels in .github/labels.yml`);
for (const l of labels) {
  const argv = ["label", "create", l.name, "--color", l.color ?? "ededed", "--force"];
  if (l.description) argv.push("--description", l.description);
  if (dry) { console.log("  would run: gh " + argv.join(" ")); continue; }
  try {
    execFileSync("gh", argv, { stdio: "pipe" });
    console.log("  ok  " + l.name);
  } catch (e) {
    console.error("  FAIL " + l.name + " - " + String(e.stderr ?? e).trim());
  }
}
