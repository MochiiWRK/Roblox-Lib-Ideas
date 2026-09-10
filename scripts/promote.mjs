#!/usr/bin/env node
// Turns an issue (or nothing) into ideas/NNNN-slug.md.
//
//   node scripts/promote.mjs 42               # pull issue #42, needs the gh CLI
//   node scripts/promote.mjs --blank my-idea  # start from the template
//
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { IDEAS_DIR, nextId, slugify, today, AREAS } from "./lib.mjs";

const args = process.argv.slice(2);
if (!args.length) {
  console.error("usage: promote.mjs <issue-number> | --blank <slug>");
  process.exit(1);
}

const EMPTY = /^_no response_$/i;

/** GitHub renders issue forms as "### Heading" followed by the answer. */
function sections(body) {
  const out = {};
  let key = null;
  let buf = [];
  const flush = () => {
    if (key) {
      const v = buf.join("\n").trim();
      out[key.toLowerCase()] = EMPTY.test(v) ? "" : v;
    }
  };
  for (const line of (body ?? "").split(/\r?\n/)) {
    const h = /^###\s+(.*)$/.exec(line);
    if (h) { flush(); key = h[1].trim(); buf = []; }
    else buf.push(line);
  }
  flush();
  return out;
}

function fence(text) {
  if (!text) return "";
  return /^```/m.test(text) ? text : "```lua\n" + text + "\n```";
}

function write(front, body) {
  const file = path.join(IDEAS_DIR, `${front.id}-${front.slug}.md`);
  if (fs.existsSync(file)) {
    console.error(`${path.basename(file)} already exists. Edit it instead.`);
    process.exit(1);
  }
  const yaml = [
    "---",
    `id: ${front.id}`,
    `title: ${front.title}`,
    `slug: ${front.slug}`,
    `status: ${front.status}`,
    `areas: [${front.areas.join(", ")}]`,
    `complexity: ${front.complexity}`,
    `proposed_by: ${front.proposed_by}`,
    `issue: ${front.issue ?? "null"}`,
    "repo: null",
    `created: ${today()}`,
    "---",
    "",
  ].join("\n");
  fs.writeFileSync(file, yaml + body.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n");
  console.log(`Wrote ideas/${path.basename(file)}`);
  console.log("Next: fill in the empty sections, then run node scripts/build-index.mjs");
}

if (args[0] === "--blank") {
  const slug = slugify(args[1] ?? "");
  if (!slug) { console.error("--blank needs a slug"); process.exit(1); }
  const tpl = fs.readFileSync(path.join(IDEAS_DIR, "_TEMPLATE.md"), "utf8");
  const body = tpl.replace(/^---[\s\S]*?---\r?\n/, "");
  write({
    id: nextId(),
    title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    slug,
    status: "idea",
    areas: ["misc"],
    complexity: "medium",
    proposed_by: "your-github-handle",
    issue: null,
  }, body);
  process.exit(0);
}

const number = String(args[0]).replace(/^#/, "");
if (!/^\d+$/.test(number)) { console.error(`not an issue number: ${args[0]}`); process.exit(1); }

let issue;
try {
  issue = JSON.parse(execFileSync("gh",
    ["issue", "view", number, "--json", "number,title,body,author,labels"],
    { encoding: "utf8" }));
} catch {
  console.error("Could not read that issue. Is the gh CLI installed and authenticated?");
  process.exit(1);
}

const s = sections(issue.body);
const title = issue.title.replace(/^\[idea\]\s*/i, "").trim() || `Issue ${number}`;

const areas = (s["areas"] || "")
  .split(/[,\n]/).map((a) => a.trim().replace(/^[-*]\s*/, "").toLowerCase())
  .filter((a) => AREAS.includes(a));

const sizeWord = (s["rough size"] || "").split(/\s|-/)[0].toLowerCase();
const complexity = ["small", "medium", "large", "cursed"].includes(sizeWord) ? sizeWord : "medium";

const body = [
  "## Pitch",
  "",
  s["the pitch"] || "_TODO_",
  "",
  "## Why it does not exist yet",
  "",
  s["prior art"] || "_TODO — what already exists, and why it is not enough._",
  "",
  "## Scope",
  "",
  "**In:**",
  "",
  s["cases it has to survive"] || "- _TODO_",
  "",
  "**Out:**",
  "",
  "- _TODO — what this deliberately refuses to do._",
  "",
  "## API sketch",
  "",
  fence(s["api sketch"]) || "```lua\n-- TODO\n```",
  "",
  "## Hard parts",
  "",
  "_TODO — the bits that will actually eat the time._",
  "",
  "## Open questions",
  "",
  "_TODO_",
  "",
].join("\n");

write({
  id: nextId(),
  title,
  slug: slugify(title),
  status: "speced",
  areas: areas.length ? areas : ["misc"],
  complexity,
  proposed_by: issue.author?.login ?? "unknown",
  issue: issue.number,
}, body);
