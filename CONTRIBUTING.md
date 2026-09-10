# Contributing

Two ways in, both cheap.

## 1. Post an issue (do this first)

Use the [Library idea](../../issues/new?template=idea.yml) form. It asks for a
pitch, the rigs/cases it has to survive, and an optional API sketch. Only the
pitch is required. If you have thirty seconds, thirty seconds is enough.

## 2. Open a PR against `ideas/`

Once an idea has a shape worth writing down, it becomes a file:
`ideas/NNNN-slug.md`, where `NNNN` is the next free four-digit number.

Fastest path:

```sh
node scripts/promote.mjs 42          # pulls issue #42 into ideas/, needs gh
node scripts/promote.mjs --blank armor-lib   # or start from the template
node scripts/build-index.mjs         # regenerate the README table
```

Or copy [`ideas/_TEMPLATE.md`](ideas/_TEMPLATE.md) by hand.

### Frontmatter

```yaml
---
id: 0001                 # four digits, matches the filename
title: Armor Lib         # human title
slug: armor-lib          # matches the filename
status: idea             # idea | speced | claimed | released | abandoned
areas: [character]       # see label list below
complexity: large        # small | medium | large | cursed
proposed_by: igotyour    # github handle, no @
issue: 1                 # issue number, or null
repo: null               # implementation repo URL once one exists
created: 2026-09-09
---
```

`areas` values, to keep the index filterable:
`character`, `animation`, `replication`, `ui`, `data`, `physics`, `audio`,
`networking`, `tooling`, `ai`, `math`, `testing`, `monetization`, `misc`.

### Body sections

Keep the headings, delete the ones you have nothing for — an empty section is
worse than a missing one.

- **Pitch** — what it is, in the voice you would use in a Discord message.
- **Why it does not exist yet** — prior art, and why it is not enough.
- **Scope** — an explicit in/out list. This is the section that saves the
  implementer three weeks.
- **API sketch** — Luau. It does not have to compile, it has to communicate.
- **Hard parts** — the bits that will actually eat the time.
- **Open questions** — things the spec deliberately does not decide.

## Claiming an idea

Comment on the issue, or open a [Claim](../../issues/new?template=claim.yml).
Set `status: claimed` and fill in `repo:` in the spec file. If you go quiet for
a couple of months, someone else can take it — that is not a betrayal, it is how
this works.

## Code style, for the scripts in here

Plain Node ESM, no dependencies, no build step. If a helper needs a package, it
probably does not need to exist.
