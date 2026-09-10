---
id: 0001
title: Armor Lib
slug: armor-lib
status: idea
areas: [character, animation, replication]
complexity: large
proposed_by: MochiiWRK
issue: null
repo: null
created: 2026-09-09
---

## Pitch

An armor library that handles equip/unequip against R6, R15, Rthro and fully
custom rigs, covering three kinds of piece: **main** armor that replaces or
overlays a body part, **static accessories** that just need to be welded
somewhere sane, and **moving accessories** — wings, tails, ears — that have to
react to what the character is doing. Jump, fall, swim, sit, ragdoll: a tail
should not be rigidly welded through all of them.

Every game with armor writes this. Every game writes it wrong in a different
place, usually the rig-difference place, and it never leaves the place file.

## Why it does not exist yet

Roblox's own `Accessory` + `HumanoidDescription` path covers static hats and
layered clothing and stops there. It has no concept of state-driven motion, no
per-rig attachment fallback, and using it means accepting the engine's welding
behaviour wholesale. The community options are mostly single-game extractions:
tied to a particular framework, a particular rig, or an unmaintained model file
with a free-model rig baked in.

The genuinely missing piece is the **rig adapter layer**. Everything else here
is normal work; that part is the reason nobody has shipped a general version.

## Scope

**In:**

- Equip / unequip / swap of a named set of pieces onto a character
- Rig detection and an attachment-resolution layer with declared fallbacks
- Three piece kinds: `main`, `accessory`, `motion` (moving accessory)
- Motion profiles keyed on humanoid state, with an animation path and a
  physics/spring path
- Server-authoritative equip state, client-side visual application
- Surviving respawn, rig swap, and character streaming in/out
- NPCs — the same call path, no `Player` assumed anywhere

**Out:**

- Being an inventory system. It takes a set definition; where that came from is
  the game's problem.
- Stats, damage, durability, resistances. Not this library.
- Authoring tools. It consumes models, it does not rig them.
- Layered clothing authoring. It must *coexist* with layered clothing, not
  replace it.
- Cosmetic marketplace / monetization plumbing.

## API sketch

```lua
local Armor = require(ReplicatedStorage.Packages.Armor)

-- A set is data. Define it once, anywhere, ideally in a shared module.
local Seraph = Armor.defineSet({
    id = "seraph_plate",
    pieces = {
        {
            id = "helm",
            kind = "accessory",
            model = Assets.Seraph.Helm,
            attach = { r15 = "HatAttachment", r6 = "HatAttachment" },
        },
        {
            id = "chest",
            kind = "main",
            model = Assets.Seraph.Chest,
            -- main pieces span parts; the adapter maps limbs per rig
            covers = { r15 = { "UpperTorso", "LowerTorso" }, r6 = { "Torso" } },
            hide = { "layeredClothing" }, -- or specific accessory ids
        },
        {
            id = "wings",
            kind = "motion",
            model = Assets.Seraph.Wings,
            attach = { r15 = "BodyBackAttachment", r6 = "TorsoBackAttachment" },
            motion = "wings/large",
        },
    },
})

-- Motion profiles are also data, and reusable across sets.
Armor.defineMotion("wings/large", {
    default = { animation = Assets.Anim.WingIdle, weight = 1, fade = 0.2 },

    onState = {
        [Enum.HumanoidStateType.Jumping]  = { animation = Assets.Anim.WingFlare,
                                              priority = Enum.AnimationPriority.Action },
        [Enum.HumanoidStateType.Freefall] = { animation = Assets.Anim.WingGlide, fade = 0.15 },
        [Enum.HumanoidStateType.Swimming] = { animation = Assets.Anim.WingTuck },
        [Enum.HumanoidStateType.Seated]   = { animation = Assets.Anim.WingTuck },
    },

    -- Games define their own states too. String keys are matched against
    -- whatever the game pushes with Armor.setMotionState().
    onCustomState = {
        ragdoll = { dynamics = true },
        sprint  = { animation = Assets.Anim.WingSwept },
    },

    -- Fallback / additive physics when a state has no animation, or when the
    -- game just wants secondary motion on top of one.
    dynamics = {
        bones = { "Wing_L_01", "Wing_L_02", "Wing_R_01", "Wing_R_02" },
        stiffness = 12,
        damping = 0.6,
        maxAngle = math.rad(35),
        driver = "velocity", -- velocity | acceleration | wind
    },
})

-- Equipping returns a handle. Everything you can do later, you do through it.
local worn = Armor.equip(character, Seraph)

worn:setPiece("helm", nil)              -- remove one piece, keep the set
worn:setPiece("wings", OtherWings)      -- hot-swap
worn:setMotionState("sprint")           -- push a game-defined state
worn:isEquipped("chest")                -- boolean
worn:unequip()                          -- full teardown, restores hidden parts

-- Rig adapters are the extension point. Custom rig? Register one.
Armor.registerRig("dragon_v2", {
    detect = function(char) return char:FindFirstChild("DragonRoot") ~= nil end,
    attachments = {
        HatAttachment = "Skull.HatAttachment",
        BodyBackAttachment = "Spine02.BackAttachment",
    },
    limbs = { Head = "Skull", UpperTorso = "Spine02", LowerTorso = "Spine01" },
})

-- Server-authoritative by default: the server owns "what is equipped",
-- clients own "what it looks like right now".
Armor.setReplication({
    mode = "server-authoritative",
    remote = ReplicatedStorage.Remotes.ArmorSync,
    rateLimit = 10,
})
```

## Hard parts

- **Attachment naming across rigs.** R6, R15, Rthro and custom rigs do not agree
  on attachment names or on which part owns them. The whole library lives or
  dies on the adapter layer being declarative enough that a custom rig is a
  table, not a fork.
- **Weld vs Motor6D.** Static accessories can be `WeldConstraint`d. Anything
  animated needs `Motor6D` and therefore an `Animator` on the right humanoid,
  which means motion pieces have to survive the engine's animation loading
  order.
- **Fighting the default `Animate` script.** Animation priority conflicts with
  whatever the game's own character animation script is doing are the classic
  symptom: wings that stop moving the moment the character walks.
- **Rthro / custom scaling.** `HumanoidDescription` body scale values change
  where attachments end up. Armor has to scale with the body or visibly float.
- **Layered clothing coexistence.** LC already occupies the space around the
  torso and its own wrap system will happily clip through a rigid chest piece.
  `hide = { "layeredClothing" }` is the escape hatch, but "coexist properly" is
  the real requirement.
- **Respawn and rig swap.** `CharacterAdded` re-equip is table stakes. Rig swap
  mid-session (a morph, a mount, a ragdoll model swap) is the case that breaks
  naive implementations.
- **Streaming.** With `StreamingEnabled`, a character can stream out under a
  live armor handle. Teardown has to be idempotent and re-application cheap.
- **NPC cost.** Forty NPCs with animated tails is a real performance question.
  The dynamics path needs a single shared update loop, an LOD distance, and a
  hard cap, not one `RunService` connection per accessory.
- **Replication trust boundary.** Clients ask, server decides, clients render.
  Getting that split right without a 200ms visible delay on your own equip is
  the interesting part.

## Open questions

- Should `main` pieces **replace** limb meshes, overlay them, or both? Replacing
  is cleaner visually and much worse for compatibility.
- Is the dynamics solver in scope for v1, or does v1 ship animation-only with
  `dynamics` as a documented v2 hook?
- Does the library own the animation tracks, or hand back an object and let the
  game's existing animation system drive it?
- One `Armor.equip` per character, or composable handles that can layer
  (armor set + a pet + a cosmetic trail)?
- How much does it need to know about `HumanoidDescription`, if anything?
