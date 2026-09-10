// Shared helpers. No dependencies, on purpose.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const IDEAS_DIR = path.join(ROOT, "ideas");

export const STATUSES = ["idea", "speced", "claimed", "released", "abandoned"];
export const AREAS = [
  "character", "animation", "replication", "ui", "data", "physics", "audio",
  "networking", "tooling", "ai", "math", "testing", "monetization", "misc",
];
export const COMPLEXITIES = ["small", "medium", "large", "cursed"];

function coerce(raw) {
  const v = raw.trim();
  if (v === "" || v === "null" || v === "~") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((s) => coerce(s));
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (/^-?\d+$/.test(v)) return Number(v);
  return v;
}

/** Minimal frontmatter split. Good enough for the flat key: value docs in ideas/. */
export function parseDoc(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i === -1) continue;
    data[line.slice(0, i).trim()] = coerce(line.slice(i + 1));
  }
  return { data, body: m[2] };
}

export function listIdeas() {
  if (!fs.existsSync(IDEAS_DIR)) return [];
  return fs
    .readdirSync(IDEAS_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort()
    .map((file) => {
      const { data, body } = parseDoc(fs.readFileSync(path.join(IDEAS_DIR, file), "utf8"));
      return { file, data, body };
    });
}

export function nextId() {
  const ids = listIdeas().map((i) => Number(i.data.id) || 0);
  return String(Math.max(0, ...ids) + 1).padStart(4, "0");
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/^\[?idea\]?:?\s*/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
