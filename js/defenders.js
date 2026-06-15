/* Defender roster, starter selection, and save-state helpers keep the new collection layer separate from combat. */

const DEFENDER_SAVE_KEY = "threatgrid.save.v1";

// defenderCatalog is the long-term roster source of truth for starter defenders and future recruitment UI.
const defenderCatalog = [
  {
    id: "firewall-7",
    name: "Firewall-7",
    role: "Shield Guardian",
    domain: "Bastion",
    affinity: "Defense",
    level: 1,
    hp: 100,
    maxHp: 100,
    atk: 4,
    def: 8,
    spAtk: 3,
    spDef: 8,
    spd: 4,
    temperament: "Steadfast",
    coreTrait: {
      name: "Bulwark Array",
      description: "Reduces incoming damage from the first hit each battle."
    },
    passiveModule: {
      name: "Shell Resonance",
      description: "Slightly increases defense when HP is above 50%."
    },
    rarity: "standard",
    variant: "normal",
    unlocked: true,
    selected: false,
    starter: true,
    color: "#00ccff",
    statusEffects: [],
    responseTags: ["guard", "mitigate", "isolate"],
    summary: "A shield guardian built to absorb direct intrusion.",
    moves: [
      {
        id: "block-network",
        name: "Block Network",
        domain: "Defense",
        category: "support",
        charges: 15,
        maxCharges: 15,
        power: 35,
        accuracy: 100,
        cost: 0,
        effect: "reduce_next_damage",
        teachesConcepts: ["containment", "hardening"],
        description: "Raises defensive posture and steadies the front line."
      },
      {
        id: "harden-ports",
        name: "Harden Ports",
        domain: "Defense",
        category: "support",
        charges: 6,
        maxCharges: 6,
        power: 65,
        accuracy: 85,
        cost: 1,
        effect: "boost_def",
        teachesConcepts: ["hardening"],
        description: "Fortifies the chassis and counter-pressures the next exchange."
      },
      {
        id: "mirror-shell",
        name: "Mirror Shell",
        domain: "Defense",
        category: "special",
        charges: 1,
        maxCharges: 1,
        power: 90,
        accuracy: 20,
        cost: 2,
        effect: "mirror_shell_burst",
        teachesConcepts: ["hardening", "incident_response"],
        description: "A desperate reflective burst that can shatter pressure or fizzle out."
      }
    ],
    abilities: buildCombatAbilities([
      {
        name: "Block Network",
        cost: 0,
        baseDamage: 35,
        effect: "reduce_next_damage"
      },
      {
        name: "Harden Ports",
        cost: 1,
        baseDamage: 65,
        effect: "boost_def"
      },
      {
        name: "Mirror Shell",
        cost: 2,
        baseDamage: 90,
        effect: "mirror_shell_burst"
      }
    ])
  },
  {
    id: "ids-4",
    name: "IDS",
    role: "Scanner Scout",
    domain: "Detection",
    affinity: "Offense",
    level: 1,
    hp: 92,
    maxHp: 92,
    atk: 6,
    def: 4,
    spAtk: 8,
    spDef: 5,
    spd: 10,
    temperament: "Analytical",
    coreTrait: {
      name: "Signal Scan",
      description: "Marks weak points and increases damage against detected threats."
    },
    passiveModule: {
      name: "Trace Pulse",
      description: "Raises speed when the battlefield has been mapped."
    },
    rarity: "standard",
    variant: "normal",
    unlocked: true,
    selected: false,
    starter: true,
    color: "#00ff88",
    statusEffects: [],
    responseTags: ["scan", "countertrace", "reveal"],
    summary: "A precision scout that spots exploits before they bloom.",
    moves: [
      {
        id: "deep-packet-scan",
        name: "Deep Packet Scan",
        domain: "Detection",
        category: "special",
        charges: 15,
        maxCharges: 15,
        power: 35,
        accuracy: 100,
        cost: 0,
        effect: "status_detected",
        teachesConcepts: ["detection", "incident_response"],
        description: "Scans the target for weak signals and exposes hidden errors."
      },
      {
        id: "signature-burst",
        name: "Signature Burst",
        domain: "Detection",
        category: "special",
        charges: 6,
        maxCharges: 6,
        power: 65,
        accuracy: 85,
        cost: 1,
        effect: "status_detected",
        teachesConcepts: ["detection"],
        description: "Launches a focused signature strike at the target's core."
      },
      {
        id: "trace-route",
        name: "Trace Route",
        domain: "Detection",
        category: "special",
        charges: 1,
        maxCharges: 1,
        power: 90,
        accuracy: 20,
        cost: 2,
        effect: "trace_route_burst",
        teachesConcepts: ["detection", "incident_response"],
        description: "A reckless exploit strike that either lands hard or evaporates."
      }
    ],
    abilities: buildCombatAbilities([
      {
        name: "Deep Packet Scan",
        cost: 0,
        baseDamage: 35,
        effect: "status_detected"
      },
      {
        name: "Signature Burst",
        cost: 1,
        baseDamage: 65,
        effect: "status_detected"
      },
      {
        name: "Trace Route",
        cost: 2,
        baseDamage: 90,
        effect: "trace_route_burst"
      }
    ])
  },
  {
    id: "honeypot-3",
    name: "Honeypot",
    role: "Trickster Decoy",
    domain: "Illusion",
    affinity: "Deception",
    level: 1,
    hp: 96,
    maxHp: 96,
    atk: 5,
    def: 5,
    spAtk: 6,
    spDef: 6,
    spd: 8,
    temperament: "Cunning",
    coreTrait: {
      name: "False Signal",
      description: "Turns hostile attention into exposed openings."
    },
    passiveModule: {
      name: "Lure Bloom",
      description: "Improves evasion after a successful decoy action."
    },
    rarity: "standard",
    variant: "normal",
    unlocked: true,
    selected: false,
    starter: true,
    color: "#ffcc00",
    statusEffects: [],
    responseTags: ["decoy", "redirect", "bait"],
    summary: "A decoy construct that tempts threats into exposed positions.",
    moves: [
      {
        id: "lure-traffic",
        name: "Lure Traffic",
        domain: "Illusion",
        category: "support",
        charges: 15,
        maxCharges: 15,
        power: 0,
        accuracy: 100,
        cost: 0,
        effect: "status_isolated",
        teachesConcepts: ["containment", "lateral_movement"],
        description: "Baits threats into a false route and isolates their focus."
      },
      {
        id: "decoy-mesh",
        name: "Decoy Mesh",
        domain: "Illusion",
        category: "support",
        charges: 6,
        maxCharges: 6,
        power: 65,
        accuracy: 85,
        cost: 1,
        effect: "boost_def",
        teachesConcepts: ["containment"],
        description: "Projects layered decoys that make targeting uncertain."
      },
      {
        id: "false-positive",
        name: "False Positive",
        domain: "Illusion",
        category: "special",
        charges: 1,
        maxCharges: 1,
        power: 90,
        accuracy: 20,
        cost: 2,
        effect: "status_isolated",
        teachesConcepts: ["containment", "incident_response"],
        description: "A risky trap detonation that can punish a target in one sharp snap."
      }
    ],
    abilities: buildCombatAbilities([
      {
        name: "Lure Traffic",
        cost: 0,
        baseDamage: 0,
        effect: "status_isolated"
      },
      {
        name: "Decoy Mesh",
        cost: 1,
        baseDamage: 65,
        effect: "boost_def"
      },
      {
        name: "False Positive",
        cost: 2,
        baseDamage: 90,
        effect: "status_isolated"
      }
    ])
  },
  {
    id: "antivirus-9",
    name: "Antivirus",
    role: "Purifier Lancer",
    domain: "Purity",
    affinity: "Purge",
    level: 1,
    hp: 108,
    maxHp: 108,
    atk: 7,
    def: 5,
    spAtk: 7,
    spDef: 6,
    spd: 6,
    temperament: "Zealous",
    coreTrait: {
      name: "Purge Lance",
      description: "Pierces corruption and weakens hostile code."
    },
    passiveModule: {
      name: "Cleanse Circuit",
      description: "Sustains cleansing pressure after a successful purge."
    },
    rarity: "standard",
    variant: "normal",
    unlocked: true,
    selected: false,
    starter: true,
    color: "#ff2233",
    statusEffects: [],
    responseTags: ["cleanse", "purge", "recover"],
    summary: "A cleansing warrior that burns corruption out of the frame.",
    moves: [
      {
        id: "signature-sweep",
        name: "Signature Sweep",
        domain: "Purity",
        category: "physical",
        charges: 15,
        maxCharges: 15,
        power: 35,
        accuracy: 100,
        cost: 0,
        effect: "cleanse",
        teachesConcepts: ["malware_cleanup", "recovery"],
        description: "Sweeps the target for hostile traces and clears minor corruption."
      },
      {
        id: "rapid-scan",
        name: "Rapid Scan",
        domain: "Purity",
        category: "special",
        charges: 6,
        maxCharges: 6,
        power: 65,
        accuracy: 85,
        cost: 1,
        effect: "status_detected",
        teachesConcepts: ["detection", "malware_cleanup"],
        description: "Rapidly identifies anomalies and forces them into the light."
      },
      {
        id: "kernel-purge",
        name: "Kernel Purge",
        domain: "Purity",
        category: "physical",
        charges: 1,
        maxCharges: 1,
        power: 90,
        accuracy: 20,
        cost: 2,
        effect: "cleanse",
        teachesConcepts: ["malware_cleanup"],
        description: "Delivers a desperate purge blast that strips corruption from the core."
      }
    ],
    abilities: buildCombatAbilities([
      {
        name: "Signature Sweep",
        cost: 0,
        baseDamage: 35,
        effect: "cleanse"
      },
      {
        name: "Rapid Scan",
        cost: 1,
        baseDamage: 65,
        effect: "status_detected"
      },
      {
        name: "Kernel Purge",
        cost: 2,
        baseDamage: 90,
        effect: "cleanse"
      }
    ])
  },
  {
    id: "firewall-12",
    name: "Sentinel Firewall",
    domain: "Bastion",
    affinity: "Defense",
    temperament: "Resolute",
    rarity: "Uncommon",
    variant: "Standard",
    coreTrait: "Aegis Frame",
    passiveModule: "Ward Loop",
    stats: { hp: 108, atk: 3, def: 8, spd: 5 },
    hp: 108,
    maxHp: 108,
    atk: 3,
    def: 8,
    spd: 5,
    color: "#74e6ff",
    statusEffects: [],
    responseTags: ["guard", "mitigate", "isolate"],
    starter: false,
    summary: "A heavier shield unit forged for frontline containment.",
    moveList: [
      { name: "Block Network", power: 0, accuracy: 100, uses: "∞", effect: "reduce_next_damage" },
      { name: "Harden Ports", power: 16, accuracy: 100, uses: "∞", effect: "boost_def" },
      { name: "Allocate Bandwidth", power: 24, accuracy: 95, uses: "∞", effect: "shared_ability" }
    ],
    abilities: [
      { name: "Block Network", cost: 0, baseDamage: 0, effect: "reduce_next_damage" },
      { name: "Harden Ports", cost: 1, baseDamage: 15, effect: "boost_def" },
      { name: "Allocate Bandwidth", cost: 2, baseDamage: 25, effect: "shared_ability" }
    ]
  },
  {
    id: "ids-9",
    name: "Pulse IDS",
    domain: "Detection",
    affinity: "Offense",
    temperament: "Methodical",
    rarity: "Uncommon",
    variant: "Standard",
    coreTrait: "Radar Crown",
    passiveModule: "Threat Echo",
    stats: { hp: 88, atk: 7, def: 4, spd: 9 },
    hp: 88,
    maxHp: 88,
    atk: 7,
    def: 4,
    spd: 9,
    color: "#7effc2",
    statusEffects: [],
    responseTags: ["scan", "countertrace", "reveal"],
    starter: false,
    summary: "A faster analyzer tuned to expose hidden weaknesses.",
    moveList: [
      { name: "Deep Packet Scan", power: 17, accuracy: 100, uses: "∞", effect: "status_detected" },
      { name: "Signature Burst", power: 24, accuracy: 95, uses: "∞", effect: "status_detected" },
      { name: "Quarantine Relay", power: 28, accuracy: 90, uses: "∞", effect: "shared_ability" }
    ],
    abilities: [
      { name: "Deep Packet Scan", cost: 0, baseDamage: 16, effect: "status_detected" },
      { name: "Signature Burst", cost: 1, baseDamage: 22, effect: "status_detected" },
      { name: "Quarantine Relay", cost: 2, baseDamage: 28, effect: "shared_ability" }
    ]
  },
  {
    id: "honeypot-8",
    name: "Mirage Honeypot",
    domain: "Illusion",
    affinity: "Deception",
    temperament: "Playful",
    rarity: "Rare",
    variant: "Standard",
    coreTrait: "Afterimage Trap",
    passiveModule: "Ghost Lure",
    stats: { hp: 100, atk: 4, def: 5, spd: 8 },
    hp: 100,
    maxHp: 100,
    atk: 4,
    def: 5,
    spd: 8,
    color: "#ffd966",
    statusEffects: [],
    responseTags: ["decoy", "redirect", "bait"],
    starter: false,
    summary: "A more elusive trickster that leaves false trails behind.",
    moveList: [
      { name: "Lure Traffic", power: 15, accuracy: 100, uses: "∞", effect: "status_isolated" },
      { name: "Decoy Mesh", power: 20, accuracy: 95, uses: "∞", effect: "boost_def" },
      { name: "Sandtrap", power: 27, accuracy: 90, uses: "∞", effect: "status_isolated" }
    ],
    abilities: [
      { name: "Lure Traffic", cost: 0, baseDamage: 14, effect: "status_isolated" },
      { name: "Decoy Mesh", cost: 1, baseDamage: 20, effect: "boost_def" },
      { name: "Sandtrap", cost: 2, baseDamage: 26, effect: "status_isolated" }
    ]
  },
  {
    id: "antivirus-2",
    name: "Purity Antivirus",
    domain: "Purity",
    affinity: "Purge",
    temperament: "Righteous",
    rarity: "Uncommon",
    variant: "Standard",
    coreTrait: "Radiant Cleave",
    passiveModule: "Sanctify Loop",
    stats: { hp: 112, atk: 6, def: 6, spd: 6 },
    hp: 112,
    maxHp: 112,
    atk: 6,
    def: 6,
    spd: 6,
    color: "#ff6677",
    statusEffects: [],
    responseTags: ["cleanse", "purge", "recover"],
    starter: false,
    summary: "A brighter purifier that cuts deeper into hostile code.",
    moveList: [
      { name: "Signature Sweep", power: 17, accuracy: 100, uses: "∞", effect: "cleanse" },
      { name: "Rapid Scan", power: 22, accuracy: 95, uses: "∞", effect: "status_detected" },
      { name: "Kernel Purge", power: 31, accuracy: 90, uses: "∞", effect: "cleanse" }
    ],
    abilities: [
      { name: "Signature Sweep", cost: 0, baseDamage: 16, effect: "cleanse" },
      { name: "Rapid Scan", cost: 1, baseDamage: 22, effect: "status_detected" },
      { name: "Kernel Purge", cost: 2, baseDamage: 30, effect: "cleanse" }
    ]
  }
];

// getStarterDefenderCatalog() narrows the roster to the four launch defenders used in the Phase 1 setup screen.
function getStarterDefenderCatalog() {
  return defenderCatalog.filter((defender) => defender.starter !== false);
}

// buildCombatAbilities() converts the defender move model into the combat engine's lightweight ability shape.
function buildCombatAbilities(moves = [], defenderId = "move") {
  return moves.map((move, index) => {
    const safeMove = move && typeof move === "object" ? move : {};
    const chargeCount = getMoveChargeCount(safeMove);
    const maxCharges = Number.isFinite(safeMove.maxCharges) ? safeMove.maxCharges : chargeCount;
    const teachesConcepts = normalizeDefenderConceptTags(safeMove.teachesConcepts || safeMove.relatedConcepts || []);
    const moveId = typeof safeMove.id === "string" && safeMove.id.trim()
      ? safeMove.id.trim()
      : `${String(defenderId || "move").toLowerCase()}-${String(safeMove.name || "ability").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${index}`;

    return {
      id: moveId,
      name: safeMove.name,
      domain: safeMove.domain,
      category: safeMove.category,
      charges: chargeCount,
      currentCharges: chargeCount,
      maxCharges,
      remainingCharges: chargeCount,
      power: Number.isFinite(safeMove.power) ? safeMove.power : 0,
      accuracy: Number.isFinite(safeMove.accuracy) ? safeMove.accuracy : 100,
      cost: Number.isFinite(safeMove.cost) ? safeMove.cost : 0,
      effect: safeMove.effect,
      description: safeMove.description,
      teachesConcepts,
      relatedConcepts: teachesConcepts.slice(),
      baseDamage: Number.isFinite(safeMove.power) ? safeMove.power : 0
    };
  });
}

// getMoveChargeCount() safely resolves a move's current charge value without crashing on older save data.
function getMoveChargeCount(move) {
  return Number.isFinite(move?.charges)
    ? move.charges
    : Number.isFinite(move?.currentCharges)
      ? move.currentCharges
      : Number.isFinite(move?.remainingCharges)
        ? move.remainingCharges
      : 0;
}

// getMoveCharges() is a small compatibility alias for code paths that expect the newer helper name.
function getMoveCharges(move) {
  return getMoveChargeCount(move);
}

// setMoveCharges() keeps every legacy charge field in sync so render and execution read the same value.
function setMoveCharges(move, charges) {
  if (!move || typeof move !== "object") {
    return 0;
  }

  const safeCharges = Math.max(0, Math.floor(Number.isFinite(charges) ? charges : 0));
  move.charges = safeCharges;
  move.currentCharges = safeCharges;
  move.remainingCharges = safeCharges;
  if (!Number.isFinite(move.maxCharges)) {
    move.maxCharges = safeCharges;
  }
  return safeCharges;
}

// canUseMove() returns true when the move has usable charges regardless of charge display legacy fields.
function canUseMove(move) {
  return getMoveCharges(move) > 0;
}

// resetMoveChargesForRun() clones a defender so fresh run copies always start with full move charges.
function resetMoveChargesForRun(defender) {
  if (!defender || typeof defender !== "object") {
    return defender;
  }

  const nextDefender = cloneDefenderBlueprint(defender);
  nextDefender.moves = Array.isArray(nextDefender.moves)
    ? nextDefender.moves.map((move, index) => {
        const maxCharges = Number.isFinite(move.maxCharges)
          ? move.maxCharges
          : Number.isFinite(move.charges)
            ? move.charges
            : 0;
        const moveId = typeof move.id === "string" && move.id.trim()
          ? move.id.trim()
          : `${String(nextDefender.id || "defender").toLowerCase()}-${String(move.name || "ability").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${index}`;

        const nextMove = {
          ...move,
          id: moveId,
          charges: maxCharges,
          currentCharges: maxCharges,
          remainingCharges: maxCharges,
          maxCharges,
          accuracy: Number.isFinite(move.accuracy) ? move.accuracy : 100
        };

        setMoveCharges(nextMove, maxCharges);
        return nextMove;
      })
    : [];

  return nextDefender;
}

function normalizeDefenderResponseTags(defender) {
  const tagSources = [];
  if (Array.isArray(defender?.responseTags)) {
    tagSources.push(defender.responseTags);
  }
  if (Array.isArray(defender?.defenseProfile?.tags)) {
    tagSources.push(defender.defenseProfile.tags);
  }

  if (!tagSources.length) {
    return [];
  }

  const seen = new Set();
  const normalizedTags = [];
  tagSources.flat().forEach((tag) => {
    if (typeof tag !== "string") {
      return;
    }

    const normalizedTag = tag.trim().toLowerCase();
    if (!normalizedTag || seen.has(normalizedTag)) {
      return;
    }

    seen.add(normalizedTag);
    normalizedTags.push(normalizedTag);
  });

  return normalizedTags;
}

function normalizeDefenderConceptTags(conceptIds = []) {
  if (typeof normalizeCyberConceptIds === "function") {
    return normalizeCyberConceptIds(conceptIds);
  }

  const sourceIds = Array.isArray(conceptIds) ? conceptIds : [conceptIds];
  const seen = new Set();
  const normalizedIds = [];

  sourceIds.flat().forEach((conceptId) => {
    if (typeof conceptId !== "string") {
      return;
    }

    const normalizedId = conceptId.trim().toLowerCase();
    if (!normalizedId || seen.has(normalizedId)) {
      return;
    }

    seen.add(normalizedId);
    normalizedIds.push(normalizedId);
  });

  return normalizedIds;
}

// buildCombatProgramFromDefender() maps the new defender save model into the legacy combat roster format.
function buildCombatProgramFromDefender(defender) {
  // The run copy gets fresh charges here so charge loss only ever mutates live battle state.
  const battleDefender = resetMoveChargesForRun(defender);
  const affinity = String(battleDefender && battleDefender.affinity ? battleDefender.affinity : "offense").toLowerCase();
  const moves = Array.isArray(battleDefender.moves) ? battleDefender.moves : [];

  return {
    id: battleDefender.id,
    name: battleDefender.name,
    type: affinity,
    combatType: affinity,
    level: battleDefender.level || 1,
    hp: battleDefender.hp || battleDefender.maxHp || 100,
    maxHp: battleDefender.maxHp || battleDefender.hp || 100,
    atk: battleDefender.atk || 1,
    def: battleDefender.def || 1,
    spAtk: battleDefender.spAtk || battleDefender.atk || 1,
    spDef: battleDefender.spDef || battleDefender.def || 1,
    spd: battleDefender.spd || 1,
    color: battleDefender.color || "#00ff88",
    xp: battleDefender.xp || 0,
    statusEffects: Array.isArray(battleDefender.statusEffects) ? battleDefender.statusEffects.slice() : [],
    abilities: buildCombatAbilities(moves, battleDefender.id),
    moves: JSON.parse(JSON.stringify(moves)),
    role: battleDefender.role,
    domain: battleDefender.domain,
    affinity: battleDefender.affinity,
    temperament: battleDefender.temperament,
    rarity: battleDefender.rarity,
    variant: battleDefender.variant,
    coreTrait: battleDefender.coreTrait,
    passiveModule: battleDefender.passiveModule,
    unlocked: battleDefender.unlocked,
    selected: battleDefender.selected,
    responseTags: normalizeDefenderResponseTags(battleDefender)
  };
}

// buildSavedDefenderParty() stores a snapshot of the current starters in the save file when a run begins.
function buildSavedDefenderParty(defenderIds = []) {
  return normalizeStarterSelection(defenderIds).map((defenderId) => {
    const template = getDefenderTemplate(defenderId);
    return template ? resetMoveChargesForRun(template) : null;
  }).filter(Boolean);
}

// defenderSaveState stores the long-term roster data that should survive refreshes and future phases.
let defenderSaveState = null;

// defenderSelectionDraft tracks the starter party the player is editing before they lock it in.
let defenderSelectionDraft = [];

// defenderSelectionFocusId tracks which roster entry is currently driving the preview panel.
let defenderSelectionFocusId = null;

// defenderRosterSelectEnabled stays false until the roster-select pass is fully stabilized.
const defenderRosterSelectEnabled = false;

// defenderScreenContent is the dynamic container for the starter-selection screen.
const defenderSelectionScreenRoot = document.getElementById("defender-screen");
const defenderScreenContent = document.getElementById("defender-screen-content");

// getDefaultStarterDefenderIds() returns the canonical four-defender loadout used when no save exists yet.
function getDefaultStarterDefenderIds() {
  return getStarterDefenderCatalog().map((defender) => defender.id);
}

// cloneDefenderBlueprint() creates a deep copy so roster edits never mutate the catalog entries.
function cloneDefenderBlueprint(defender) {
  return JSON.parse(JSON.stringify(defender));
}

// createDefaultSave() builds the initial localStorage payload for the new progression layer.
// createDefaultStoryState() seeds the persistent narrative memory used by the cyber-myth pantheon layer.
function createDefaultStoryState() {
  return {
    totalRunsStarted: 0,
    totalBattlesWon: 0,
    totalDefeats: 0,
    pantheonEntityCounts: {},
    lastPantheonEntityId: null,
    lastPantheonChoiceId: null,
    lastPantheonDialogue: "",
    lastDefeatLine: "",
    storyFlags: {},
    sectorStability: {},
    unlockedFragments: [],
    discoveredBoons: [],
    discoveredEntities: []
  };
}

// normalizeStoryState() shields older save files from missing pantheon memory fields.
function normalizeStoryState(sourceStory) {
  const fallback = createDefaultStoryState();
  const source = sourceStory && typeof sourceStory === "object" ? sourceStory : {};

  return {
    totalRunsStarted: Number.isFinite(source.totalRunsStarted) ? source.totalRunsStarted : fallback.totalRunsStarted,
    totalBattlesWon: Number.isFinite(source.totalBattlesWon) ? source.totalBattlesWon : fallback.totalBattlesWon,
    totalDefeats: Number.isFinite(source.totalDefeats) ? source.totalDefeats : fallback.totalDefeats,
    pantheonEntityCounts: source.pantheonEntityCounts && typeof source.pantheonEntityCounts === "object" ? { ...source.pantheonEntityCounts } : { ...fallback.pantheonEntityCounts },
    lastPantheonEntityId: typeof source.lastPantheonEntityId === "string" ? source.lastPantheonEntityId : fallback.lastPantheonEntityId,
    lastPantheonChoiceId: typeof source.lastPantheonChoiceId === "string" ? source.lastPantheonChoiceId : fallback.lastPantheonChoiceId,
    lastPantheonDialogue: typeof source.lastPantheonDialogue === "string" ? source.lastPantheonDialogue : fallback.lastPantheonDialogue,
    lastDefeatLine: typeof source.lastDefeatLine === "string" ? source.lastDefeatLine : fallback.lastDefeatLine,
    storyFlags: source.storyFlags && typeof source.storyFlags === "object" ? { ...source.storyFlags } : { ...fallback.storyFlags },
    sectorStability: source.sectorStability && typeof source.sectorStability === "object" ? { ...source.sectorStability } : { ...fallback.sectorStability },
    unlockedFragments: Array.isArray(source.unlockedFragments) ? source.unlockedFragments.slice() : fallback.unlockedFragments.slice(),
    discoveredBoons: Array.isArray(source.discoveredBoons) ? source.discoveredBoons.slice() : fallback.discoveredBoons.slice(),
    discoveredEntities: Array.isArray(source.discoveredEntities) ? source.discoveredEntities.slice() : fallback.discoveredEntities.slice()
  };
}

function createDefaultSave() {
  const starterIds = getDefaultStarterDefenderIds();

  return {
    version: 1,
    playerProfile: {
      operatorName: "Operator",
      createdAt: Date.now()
    },
    unlockedDefenders: starterIds.slice(),
    unlockedDefenderIds: starterIds.slice(),
    selectedDefenders: starterIds.slice(),
    selectedStarterIds: starterIds.slice(),
    currentRun: {
      active: false,
      runStartedAt: null,
      startedAt: null,
      runEndedAt: null,
      endedAt: null,
      party: [],
      defeatedThreats: [],
      currentZone: 1,
      starterLoadoutIds: starterIds.slice(),
      clearedThreatIds: [],
      capturedThreatIds: [],
      discoveredVariants: [],
      pantheonHistory: {
        entityId: null,
        choiceId: null,
        outcome: null,
        effectType: null
      },
      recoveredNarrativeEncounters: [],
      loreFragmentsPreserved: [],
      activeBoons: [],
      pendingNextBattleBoons: [],
      consumedBoons: [],
      chargeRestoreBattleGaugeBonus: 0,
      nextBattleGaugeBonus: 0,
      nextBattleAccuracyBonus: 0,
      nextBattleOpeningDamageBonus: 0,
      nextThreatHint: "",
      damageReductionRunPercent: 0,
      equippedModulesByDefenderId: {},
      lastPantheonChoiceId: null,
      lastPantheonDialogue: "",
      lastDefeatLine: "",
      choiceHistory: [],
      boonHistory: []
    },
    collection: {
      recruitedThreats: [],
      discoveredVariants: [],
      unlockedConcepts: []
    },
    story: createDefaultStoryState(),
    settings: {}
  };
}

// createDefaultDefenderSave() keeps the older helper name available for the existing combat wiring.
function createDefaultDefenderSave() {
  return createDefaultSave();
}

// normalizeStarterSelection() filters, de-duplicates, and pads a starter selection to four defenders.
function normalizeStarterSelection(defenderIds = []) {
  const uniqueIds = [];
  const starterIds = getStarterDefenderCatalog().map((defender) => defender.id);

  defenderIds.forEach((defenderId) => {
    if (!uniqueIds.includes(defenderId) && starterIds.includes(defenderId)) {
      uniqueIds.push(defenderId);
    }
  });

  starterIds.forEach((fallbackId) => {
    if (uniqueIds.length < 4 && !uniqueIds.includes(fallbackId)) {
      uniqueIds.push(fallbackId);
    }
  });

  return uniqueIds.slice(0, 4);
}

// normalizeDefenderSave() guards against old or malformed save payloads before they reach the menu.
function normalizeDefenderSave(saveData) {
  const fallback = createDefaultSave();
  const source = saveData && typeof saveData === "object" ? saveData : {};
  const currentRunSource = source.currentRun && typeof source.currentRun === "object" ? source.currentRun : {};
  const collectionSource = source.collection && typeof source.collection === "object" ? source.collection : {};
  const starterIds = normalizeStarterSelection(Array.isArray(source.selectedDefenders)
    ? source.selectedDefenders
    : Array.isArray(source.selectedStarterIds)
      ? source.selectedStarterIds
      : fallback.selectedDefenders);
  const unlockedIds = Array.isArray(source.unlockedDefenders)
    ? source.unlockedDefenders
    : Array.isArray(source.unlockedDefenderIds)
      ? source.unlockedDefenderIds
      : fallback.unlockedDefenders;

  return {
    version: fallback.version,
    playerProfile: {
      operatorName: typeof source.playerProfile?.operatorName === "string" ? source.playerProfile.operatorName : fallback.playerProfile.operatorName,
      createdAt: Number.isFinite(source.playerProfile?.createdAt) ? source.playerProfile.createdAt : fallback.playerProfile.createdAt
    },
    unlockedDefenders: unlockedIds.filter((defenderId) => getStarterDefenderCatalog().some((defender) => defender.id === defenderId)),
    unlockedDefenderIds: unlockedIds.filter((defenderId) => getStarterDefenderCatalog().some((defender) => defender.id === defenderId)),
    selectedDefenders: starterIds.slice(),
    selectedStarterIds: starterIds.slice(),
    currentRun: {
      ...fallback.currentRun,
      ...currentRunSource,
      active: Boolean(currentRunSource.active),
      runStartedAt: Number.isFinite(currentRunSource.runStartedAt) ? currentRunSource.runStartedAt : (Number.isFinite(currentRunSource.startedAt) ? currentRunSource.startedAt : null),
      startedAt: Number.isFinite(currentRunSource.startedAt) ? currentRunSource.startedAt : (Number.isFinite(currentRunSource.runStartedAt) ? currentRunSource.runStartedAt : null),
      runEndedAt: Number.isFinite(currentRunSource.runEndedAt) ? currentRunSource.runEndedAt : (Number.isFinite(currentRunSource.endedAt) ? currentRunSource.endedAt : null),
      endedAt: Number.isFinite(currentRunSource.endedAt) ? currentRunSource.endedAt : (Number.isFinite(currentRunSource.runEndedAt) ? currentRunSource.runEndedAt : null),
      party: Array.isArray(currentRunSource.party) ? currentRunSource.party.map((member) => cloneDefenderBlueprint(member)) : fallback.currentRun.party.slice(),
      defeatedThreats: Array.isArray(currentRunSource.defeatedThreats) ? currentRunSource.defeatedThreats.slice() : fallback.currentRun.defeatedThreats.slice(),
      currentZone: Number.isFinite(currentRunSource.currentZone) ? currentRunSource.currentZone : fallback.currentRun.currentZone,
      starterLoadoutIds: Array.isArray(currentRunSource.starterLoadoutIds) ? currentRunSource.starterLoadoutIds.slice() : starterIds.slice(),
      clearedThreatIds: Array.isArray(currentRunSource.clearedThreatIds) ? currentRunSource.clearedThreatIds.slice() : fallback.currentRun.clearedThreatIds.slice(),
      capturedThreatIds: Array.isArray(currentRunSource.capturedThreatIds) ? currentRunSource.capturedThreatIds.slice() : fallback.currentRun.capturedThreatIds.slice(),
      discoveredVariants: Array.isArray(currentRunSource.discoveredVariants) ? currentRunSource.discoveredVariants.slice() : fallback.currentRun.discoveredVariants.slice(),
      pantheonHistory: currentRunSource.pantheonHistory && typeof currentRunSource.pantheonHistory === "object"
        ? { ...fallback.currentRun.pantheonHistory, ...currentRunSource.pantheonHistory }
        : { ...fallback.currentRun.pantheonHistory },
      recoveredNarrativeEncounters: Array.isArray(currentRunSource.recoveredNarrativeEncounters) ? currentRunSource.recoveredNarrativeEncounters.slice() : fallback.currentRun.recoveredNarrativeEncounters.slice(),
      loreFragmentsPreserved: Array.isArray(currentRunSource.loreFragmentsPreserved) ? currentRunSource.loreFragmentsPreserved.slice() : fallback.currentRun.loreFragmentsPreserved.slice(),
      activeBoons: Array.isArray(currentRunSource.activeBoons) ? currentRunSource.activeBoons.slice() : fallback.currentRun.activeBoons.slice(),
      pendingNextBattleBoons: Array.isArray(currentRunSource.pendingNextBattleBoons) ? currentRunSource.pendingNextBattleBoons.slice() : fallback.currentRun.pendingNextBattleBoons.slice(),
      consumedBoons: Array.isArray(currentRunSource.consumedBoons) ? currentRunSource.consumedBoons.slice() : fallback.currentRun.consumedBoons.slice(),
      chargeRestoreBattleGaugeBonus: Number.isFinite(currentRunSource.chargeRestoreBattleGaugeBonus) ? currentRunSource.chargeRestoreBattleGaugeBonus : fallback.currentRun.chargeRestoreBattleGaugeBonus,
      nextBattleGaugeBonus: Number.isFinite(currentRunSource.nextBattleGaugeBonus) ? currentRunSource.nextBattleGaugeBonus : fallback.currentRun.nextBattleGaugeBonus,
      nextBattleAccuracyBonus: Number.isFinite(currentRunSource.nextBattleAccuracyBonus) ? currentRunSource.nextBattleAccuracyBonus : fallback.currentRun.nextBattleAccuracyBonus,
      nextBattleOpeningDamageBonus: Number.isFinite(currentRunSource.nextBattleOpeningDamageBonus) ? currentRunSource.nextBattleOpeningDamageBonus : fallback.currentRun.nextBattleOpeningDamageBonus,
      nextThreatHint: typeof currentRunSource.nextThreatHint === "string" ? currentRunSource.nextThreatHint : fallback.currentRun.nextThreatHint,
      damageReductionRunPercent: Number.isFinite(currentRunSource.damageReductionRunPercent) ? currentRunSource.damageReductionRunPercent : fallback.currentRun.damageReductionRunPercent,
      equippedModulesByDefenderId: currentRunSource.equippedModulesByDefenderId && typeof currentRunSource.equippedModulesByDefenderId === "object" ? { ...currentRunSource.equippedModulesByDefenderId } : { ...fallback.currentRun.equippedModulesByDefenderId },
      lastPantheonChoiceId: typeof currentRunSource.lastPantheonChoiceId === "string" ? currentRunSource.lastPantheonChoiceId : fallback.currentRun.lastPantheonChoiceId,
      lastPantheonDialogue: typeof currentRunSource.lastPantheonDialogue === "string" ? currentRunSource.lastPantheonDialogue : fallback.currentRun.lastPantheonDialogue,
      lastDefeatLine: typeof currentRunSource.lastDefeatLine === "string" ? currentRunSource.lastDefeatLine : fallback.currentRun.lastDefeatLine,
      choiceHistory: Array.isArray(currentRunSource.choiceHistory) ? currentRunSource.choiceHistory.slice() : fallback.currentRun.choiceHistory.slice(),
      boonHistory: Array.isArray(currentRunSource.boonHistory) ? currentRunSource.boonHistory.slice() : fallback.currentRun.boonHistory.slice()
    },
    collection: {
      recruitedThreats: Array.isArray(collectionSource.recruitedThreats) ? collectionSource.recruitedThreats.slice() : fallback.collection.recruitedThreats.slice(),
      discoveredVariants: Array.isArray(collectionSource.discoveredVariants) ? collectionSource.discoveredVariants.slice() : fallback.collection.discoveredVariants.slice(),
      unlockedConcepts: normalizeDefenderConceptTags(Array.isArray(collectionSource.unlockedConcepts) ? collectionSource.unlockedConcepts : fallback.collection.unlockedConcepts)
    },
    story: normalizeStoryState(source.story),
    settings: source.settings && typeof source.settings === "object" ? { ...source.settings } : {}
  };
}

// loadSave() reads the saved roster state from localStorage and falls back to defaults when needed.
function loadSave() {
  let parsedSave = null;

  try {
    const stored = window.localStorage.getItem(DEFENDER_SAVE_KEY);
    parsedSave = stored ? JSON.parse(stored) : null;
  } catch (error) {
    parsedSave = null;
  }

  defenderSaveState = normalizeDefenderSave(parsedSave);
  return defenderSaveState;
}

// loadDefenderSave() keeps the older helper name available for the existing combat wiring.
function loadDefenderSave() {
  return loadSave();
}

// saveGame() writes the current defender save payload back to localStorage.
function saveGame() {
  if (!defenderSaveState) {
    defenderSaveState = createDefaultSave();
  }

  try {
    window.localStorage.setItem(DEFENDER_SAVE_KEY, JSON.stringify(defenderSaveState));
  } catch (error) {
    // Saving is best-effort only, so the game keeps working even when storage is unavailable.
  }
}

function getUnlockedCyberConceptIds() {
  if (!defenderSaveState) {
    loadSave();
  }

  return normalizeDefenderConceptTags(defenderSaveState?.collection?.unlockedConcepts || []);
}

function unlockCyberConcept(conceptId) {
  const normalizedIds = normalizeDefenderConceptTags([conceptId]);
  const normalizedId = normalizedIds[0];
  if (!normalizedId) {
    return false;
  }

  if (!defenderSaveState) {
    loadSave();
  }

  defenderSaveState.collection = defenderSaveState.collection && typeof defenderSaveState.collection === "object"
    ? defenderSaveState.collection
    : createDefaultSave().collection;
  defenderSaveState.collection.unlockedConcepts = normalizeDefenderConceptTags(defenderSaveState.collection.unlockedConcepts || []);

  if (defenderSaveState.collection.unlockedConcepts.includes(normalizedId)) {
    return false;
  }

  defenderSaveState.collection.unlockedConcepts.push(normalizedId);
  saveGame();
  return true;
}

// persistDefenderSave() keeps the older helper name available for the existing combat wiring.
function persistDefenderSave() {
  saveGame();
}

// resetSave() clears local progress and restores the default starter lineup.
function resetSave() {
  defenderSaveState = createDefaultSave();
  defenderSelectionDraft = defenderSaveState.selectedDefenders.slice();
  saveGame();
  applySelectedDefenderRoster();
  if (screenState === "defenders" && typeof renderDefenderSelectionScreen === "function") {
    renderDefenderSelectionScreen();
  }
  return defenderSaveState;
}

// getDefenderTemplate() looks up a catalog entry by id so the selected party can be cloned later.
function getDefenderTemplate(defenderId) {
  return defenderCatalog.find((defender) => defender.id === defenderId) || null;
}

// getSelectedDefenderIds() returns the active four-defender starter set from the current save state.
function getSelectedDefenderIds() {
  if (!defenderSaveState) {
    loadSave();
  }

  return defenderSaveState.selectedDefenders.slice();
}

// getSelectedStarterIds() keeps the previous helper name available for the combat bootstrap.
function getSelectedStarterIds() {
  return getSelectedDefenderIds();
}

// updateSelectedDefenders() stores the chosen starter lineup and keeps the save state in sync with the selection screen.
function updateSelectedDefenders(nextSelection = [], options = {}) {
  const normalizedSelection = normalizeStarterSelection(nextSelection);

  if (!defenderSaveState) {
    loadSave();
  }

  defenderSelectionDraft = normalizedSelection.slice();
  defenderSaveState.selectedDefenders = normalizedSelection.slice();
  defenderSaveState.selectedStarterIds = normalizedSelection.slice();
  defenderSaveState.unlockedDefenders = defenderSaveState.unlockedDefenders.filter((defenderId) => defenderCatalog.some((defender) => defender.id === defenderId));
  defenderSaveState.unlockedDefenderIds = defenderSaveState.unlockedDefenders.slice();
  if (options.persist !== false) {
    saveGame();
  }

  if (options.render !== false && screenState === "defenders" && typeof renderDefenderSelectionScreen === "function") {
    renderDefenderSelectionScreen();
  }

  return normalizedSelection;
}

// setDefenderSelectionDraft() keeps the older helper name available for the selection UI.
function setDefenderSelectionDraft(nextDraft) {
  return updateSelectedDefenders(nextDraft);
}

// applySelectedDefenderRoster() copies the saved starter selection into the live party and reset templates.
function applySelectedDefenderRoster() {
  if (!defenderSaveState) {
    loadSave();
  }

  const selectedIds = normalizeStarterSelection(defenderSaveState.selectedDefenders || defenderSaveState.selectedStarterIds || []);
  const selectedTemplates = selectedIds.map((defenderId) => cloneDefenderBlueprint(getDefenderTemplate(defenderId) || getDefenderTemplate(getDefaultStarterDefenderIds()[0])));
  const combatTemplates = selectedTemplates.map((template) => buildCombatProgramFromDefender(template));

  combatTemplates.forEach((template, index) => {
    Object.assign(programs[index], JSON.parse(JSON.stringify(template)));
    Object.assign(defaultPrograms[index], JSON.parse(JSON.stringify(template)));
  });

  defenderSelectionDraft = selectedIds.slice();
  defenderSaveState.selectedDefenders = selectedIds.slice();
  defenderSaveState.selectedStarterIds = selectedIds.slice();
  defenderSaveState.currentRun.starterLoadoutIds = selectedIds.slice();
  defenderSaveState.currentRun.party = selectedTemplates.map((template) => cloneDefenderBlueprint(template));
  saveGame();
  return selectedIds;
}

// markDefenderRunStarted() stores a minimal run header so the save knows a deployment is in progress.
function markDefenderRunStarted() {
  if (!defenderSaveState) {
    loadSave();
  }

  const starterIds = normalizeStarterSelection(defenderSaveState.selectedDefenders || defenderSaveState.selectedStarterIds || []);
  defenderSaveState.story = normalizeStoryState(defenderSaveState.story);
  defenderSaveState.story.totalRunsStarted += 1;
  defenderSaveState.story.lastPantheonDialogue = "";

  defenderSaveState.currentRun = {
    ...defenderSaveState.currentRun,
    active: true,
    runStartedAt: Date.now(),
    startedAt: Date.now(),
    runEndedAt: null,
    endedAt: null,
    starterLoadoutIds: starterIds.slice(),
    party: buildSavedDefenderParty(starterIds),
    defeatedThreats: [],
    currentZone: 1,
    clearedThreatIds: [],
    capturedThreatIds: [],
    discoveredVariants: [],
    pantheonHistory: {
      entityId: null,
      choiceId: null,
      outcome: null,
      effectType: null
    },
    recoveredNarrativeEncounters: [],
    loreFragmentsPreserved: [],
    activeBoons: [],
    pendingNextBattleBoons: [],
    consumedBoons: [],
    chargeRestoreBattleGaugeBonus: 0,
    nextBattleGaugeBonus: 0,
    nextBattleAccuracyBonus: 0,
    nextBattleOpeningDamageBonus: 0,
    nextThreatHint: "",
    damageReductionRunPercent: 0,
    equippedModulesByDefenderId: {},
    lastPantheonChoiceId: null,
    lastPantheonDialogue: "",
    lastDefeatLine: "",
    choiceHistory: [],
    boonHistory: []
  };
  saveGame();
}

// markDefenderRunEnded() clears the active flag so the save returns to a menu-safe state.
function markDefenderRunEnded() {
  if (!defenderSaveState) {
    loadSave();
  }

  defenderSaveState.currentRun = {
    ...defenderSaveState.currentRun,
    active: false,
    runEndedAt: Date.now(),
    endedAt: Date.now(),
    starterLoadoutIds: defenderSaveState.selectedDefenders.slice(),
    party: Array.isArray(defenderSaveState.currentRun?.party) ? defenderSaveState.currentRun.party.map((member) => cloneDefenderBlueprint(member)) : buildSavedDefenderParty(defenderSaveState.selectedDefenders),
    currentZone: Number.isFinite(defenderSaveState.currentRun?.currentZone) ? defenderSaveState.currentRun.currentZone : 1
  };
  saveGame();
}

// startRunWithSelectedDefenders() locks the current starter lineup into the save and then boots the existing game flow.
function startRunWithSelectedDefenders() {
  const selectedIds = updateSelectedDefenders(defenderSelectionDraft);
  if (selectedIds.length !== 4) {
    const statusNode = document.getElementById("defender-selection-status");
    if (statusNode) {
      statusNode.textContent = "LOCK IN FOUR DEFENDERS BEFORE STARTING THE RUN.";
    }
    return;
  }

  if (!defenderSaveState) {
    loadSave();
  }

  markDefenderRunStarted();

  if (typeof startGame === "function") {
    startGame();
  }
}

// toggleDefenderSelection() adds or removes a defender from the in-progress four-slot starter lineup.
function toggleDefenderSelection(defenderId) {
  if (!defenderSaveState) {
    loadSave();
  }

  const nextDraft = defenderSelectionDraft.slice();
  const existingIndex = nextDraft.indexOf(defenderId);

  if (existingIndex !== -1) {
    nextDraft.splice(existingIndex, 1);
    updateSelectedDefenders(nextDraft);
    return;
  }

  if (nextDraft.length >= 4) {
    const statusNode = document.getElementById("defender-selection-status");
    if (statusNode) {
      statusNode.textContent = "SELECT FOUR DEFENDERS OR REMOVE ONE TO SWAP.";
    }
    return;
  }

  nextDraft.push(defenderId);
  updateSelectedDefenders(nextDraft);
}

// getDefenderSelectionFocusId() keeps the preview pinned to a real defender even if the roster changes or the focus is unset.
function getDefenderSelectionFocusId(candidateId = defenderSelectionFocusId) {
  const catalog = getStarterDefenderCatalog();
  const candidateMatch = catalog.find((defender) => defender.id === candidateId);
  if (candidateMatch) {
    return candidateMatch.id;
  }

  const selectedMatch = catalog.find((defender) => defender.id === defenderSelectionDraft[0]);
  if (selectedMatch) {
    return selectedMatch.id;
  }

  return catalog[0] ? catalog[0].id : null;
}

// getDefenderMonogram() turns a defender name and role into a compact two-letter glyph for preview art and party slots.
function getDefenderMonogram(defender) {
  const source = [defender?.name, defender?.role, defender?.domain].filter(Boolean).join(" ");
  const letters = source.match(/[A-Z0-9]/gi) || [];
  const glyph = letters.slice(0, 2).join("").toUpperCase();
  return glyph || "TG";
}

// buildDefenderRosterTileMarkup() renders one compact roster tile with selection state, identity, and a tiny stat strip.
function buildDefenderRosterTileMarkup(defender, isSelected, isLocked, isFocused) {
  const cardAccent = defender.color || "#87e4ff";
  const rosterStateLabel = isSelected ? "LOCKED" : isLocked ? "SEALED" : "READY";

  return `
    <button
      class="defender-roster-tile ${isSelected ? "is-selected" : ""} ${isLocked ? "is-locked" : ""} ${isFocused ? "is-focused" : ""}"
      type="button"
      data-defender-id="${defender.id}"
      aria-pressed="${isSelected ? "true" : "false"}"
      aria-current="${isFocused ? "true" : "false"}"
      style="--defender-accent: ${cardAccent}; --defender-accent-soft: ${cardAccent}24;"
      ${isLocked ? "disabled" : ""}
    >
      <div class="defender-roster-tile-head">
        <div class="defender-roster-titleblock">
          <div class="defender-roster-kicker">STARTER DEFENDER</div>
          <div class="defender-roster-name">${defender.name}</div>
          <div class="defender-roster-role">${defender.role} / ${defender.domain}</div>
        </div>
        <div class="defender-roster-badge ${isSelected ? "is-selected" : isLocked ? "is-locked" : "is-ready"}">${rosterStateLabel}</div>
      </div>
      <div class="defender-roster-summary">${defender.summary}</div>
      <div class="defender-roster-mini" aria-hidden="true">
        <span>HP ${defender.hp}</span>
        <span>DEF ${defender.def}</span>
        <span>SPD ${defender.spd}</span>
      </div>
    </button>
  `;
}

// buildDefenderCardMarkup() keeps the original four-card selection UI available as a safe fallback.
function buildDefenderCardMarkup(defender, isSelected, isLocked) {
  const movePreview = defender.moves.slice(0, 2).map((move) => {
    const moveAccuracy = Number.isFinite(move.accuracy) ? `${move.accuracy}% ACC` : null;
    const moveCharges = Number.isFinite(move.charges) && Number.isFinite(move.maxCharges)
      ? `${move.charges}/${move.maxCharges} CHG`
      : null;
    const moveMeta = [move.domain, move.category]
      .filter(Boolean)
      .map((value) => String(value).toUpperCase())
      .concat([`PWR ${move.power}`, moveAccuracy, moveCharges].filter(Boolean))
      .join(" / ");

    return `
      <div class="defender-move">
        <div class="defender-move-name">${move.name}</div>
        <div class="defender-move-meta">${moveMeta}</div>
      </div>
    `;
  }).join("");
  const coreTrait = defender.coreTrait && typeof defender.coreTrait === "object" ? defender.coreTrait.name : defender.coreTrait;
  const passiveModule = defender.passiveModule && typeof defender.passiveModule === "object" ? defender.passiveModule.name : defender.passiveModule;
  const coreTraitDescription = defender.coreTrait && typeof defender.coreTrait === "object" ? defender.coreTrait.description : "";
  const passiveModuleDescription = defender.passiveModule && typeof defender.passiveModule === "object" ? defender.passiveModule.description : "";
  const loadoutStateLabel = isSelected ? "LOCKED IN" : isLocked ? "LOCKED" : "READY";
  const rarityLabel = String(defender.rarity || "standard").toUpperCase();
  const cardAccent = defender.color || "#00ccff";

  return `
    <button
      class="defender-card ${isSelected ? "is-selected" : ""} ${isLocked ? "is-locked" : ""}"
      type="button"
      data-defender-id="${defender.id}"
      aria-pressed="${isSelected ? "true" : "false"}"
      style="--defender-accent: ${cardAccent}; --defender-accent-soft: ${cardAccent}22;"
      ${isLocked ? "disabled" : ""}
    >
      <div class="defender-card-topline">
        <div class="defender-card-titleblock">
          <div class="defender-card-kicker">STARTER DEFENDER</div>
          <div class="defender-card-name">${defender.name}</div>
          <div class="defender-card-domain">${defender.role} / ${defender.domain} / ${defender.affinity}</div>
        </div>
        <div class="defender-card-badges">
          <div class="defender-card-badge">${rarityLabel}</div>
          <div class="defender-card-badge ${isSelected ? "is-selected" : isLocked ? "is-locked" : "is-ready"}">${loadoutStateLabel}</div>
        </div>
      </div>
      <div class="defender-card-summary">${defender.summary}</div>
      <div class="defender-card-fields">
        <div class="defender-card-field">
          <span class="defender-card-field-label">CORE TRAIT</span>
          <span class="defender-card-field-value" title="${coreTraitDescription}">${coreTrait}</span>
        </div>
        <div class="defender-card-field">
          <span class="defender-card-field-label">PASSIVE MODULE</span>
          <span class="defender-card-field-value" title="${passiveModuleDescription}">${passiveModule}</span>
        </div>
        <div class="defender-card-field">
          <span class="defender-card-field-label">TEMPERAMENT</span>
          <span class="defender-card-field-value">${defender.temperament}</span>
        </div>
        <div class="defender-card-field">
          <span class="defender-card-field-label">VARIANT</span>
          <span class="defender-card-field-value">${defender.variant}</span>
        </div>
      </div>
      <div class="defender-card-stats" aria-label="Defender stats">
        <div class="defender-stat">
          <span class="defender-stat-label">HP</span>
          <strong class="defender-stat-value">${defender.hp}</strong>
        </div>
        <div class="defender-stat">
          <span class="defender-stat-label">ATK</span>
          <strong class="defender-stat-value">${defender.atk}</strong>
        </div>
        <div class="defender-stat">
          <span class="defender-stat-label">DEF</span>
          <strong class="defender-stat-value">${defender.def}</strong>
        </div>
        <div class="defender-stat">
          <span class="defender-stat-label">SP ATK</span>
          <strong class="defender-stat-value">${defender.spAtk}</strong>
        </div>
        <div class="defender-stat">
          <span class="defender-stat-label">SP DEF</span>
          <strong class="defender-stat-value">${defender.spDef}</strong>
        </div>
        <div class="defender-stat">
          <span class="defender-stat-label">SPD</span>
          <strong class="defender-stat-value">${defender.spd}</strong>
        </div>
      </div>
      <div class="defender-card-moves">
        <div class="defender-section-label">MOVE MODULES</div>
        <div class="defender-move-grid">${movePreview}</div>
      </div>
      <div class="defender-card-foot">
        <span>${isSelected ? "LOCKED INTO LOADOUT" : "TAP TO ADD TO LOADOUT"}</span>
        <span>LVL ${defender.level}</span>
      </div>
    </button>
  `;
}

// buildDefenderDetailPanelMarkup() renders the active defender preview, detail fields, and move modules for the right-hand panel.
function buildDefenderDetailPanelMarkup(defender, isSelected, isLocked, selectedCount) {
  const cardAccent = defender.color || "#87e4ff";
  const rarityLabel = String(defender.rarity || "standard").toUpperCase();
  const coreTrait = defender.coreTrait && typeof defender.coreTrait === "object" ? defender.coreTrait.name : defender.coreTrait;
  const passiveModule = defender.passiveModule && typeof defender.passiveModule === "object" ? defender.passiveModule.name : defender.passiveModule;
  const coreTraitDescription = defender.coreTrait && typeof defender.coreTrait === "object" ? defender.coreTrait.description : "";
  const passiveModuleDescription = defender.passiveModule && typeof defender.passiveModule === "object" ? defender.passiveModule.description : "";
  const loadoutStateLabel = isSelected ? "LOCKED INTO PARTY" : isLocked ? "SEALED ROSTER" : "AVAILABLE";
  const readinessLabel = selectedCount === 4 ? "LOADOUT READY" : "PARTY INCOMPLETE";
  const movePreview = defender.moves.slice(0, 3).map((move) => {
    const moveAccuracy = Number.isFinite(move.accuracy) ? `${move.accuracy}% ACC` : null;
    const moveCharges = Number.isFinite(move.charges) && Number.isFinite(move.maxCharges)
      ? `${move.charges}/${move.maxCharges} CHG`
      : null;
    const moveMeta = [move.domain, move.category]
      .filter(Boolean)
      .map((value) => String(value).toUpperCase())
      .concat([`PWR ${move.power}`, moveAccuracy, moveCharges].filter(Boolean))
      .join(" / ");

    return `
      <div class="defender-focus-move">
        <div class="defender-focus-move-name">
          <span>${move.name}</span>
          <span>${move.category.toUpperCase()}</span>
        </div>
        <div class="defender-focus-move-meta">${moveMeta}</div>
        <div class="defender-focus-move-desc">${move.description}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="defender-panel-label">ACTIVE DEFENDER PREVIEW</div>
    <div
      class="defender-focus-stage"
      style="--defender-accent: ${cardAccent}; --defender-accent-soft: ${cardAccent}22;"
    >
      <div class="defender-focus-watermark" aria-hidden="true">${defender.name}</div>
      <div class="defender-focus-emblem" aria-hidden="true">${getDefenderMonogram(defender)}</div>
      <div class="defender-focus-header">
        <div class="defender-focus-kicker">HOVER / FOCUS</div>
        <h3 class="defender-focus-name">${defender.name}</h3>
        <div class="defender-focus-role">${defender.role} / ${defender.domain} / ${defender.affinity}</div>
      </div>
      <div class="defender-focus-badges">
        <span class="defender-focus-badge">${rarityLabel}</span>
        <span class="defender-focus-badge ${isSelected ? "is-selected" : isLocked ? "is-locked" : "is-ready"}">${loadoutStateLabel}</span>
        <span class="defender-focus-badge">${readinessLabel}</span>
      </div>
      <p class="defender-focus-summary">${defender.summary}</p>
    </div>

    <div class="defender-focus-meta-grid" aria-label="Defender traits">
      <div class="defender-focus-chip">
        <span class="defender-focus-chip-label">CORE TRAIT</span>
        <span class="defender-focus-chip-value" title="${coreTraitDescription}">${coreTrait}</span>
      </div>
      <div class="defender-focus-chip">
        <span class="defender-focus-chip-label">PASSIVE MODULE</span>
        <span class="defender-focus-chip-value" title="${passiveModuleDescription}">${passiveModule}</span>
      </div>
      <div class="defender-focus-chip">
        <span class="defender-focus-chip-label">TEMPERAMENT</span>
        <span class="defender-focus-chip-value">${defender.temperament}</span>
      </div>
      <div class="defender-focus-chip">
        <span class="defender-focus-chip-label">VARIANT</span>
        <span class="defender-focus-chip-value">${defender.variant}</span>
      </div>
    </div>

    <div class="defender-focus-stats" aria-label="Defender stats">
      <div class="defender-focus-stat"><span class="defender-focus-stat-label">HP</span><span class="defender-focus-stat-value">${defender.hp}</span></div>
      <div class="defender-focus-stat"><span class="defender-focus-stat-label">ATK</span><span class="defender-focus-stat-value">${defender.atk}</span></div>
      <div class="defender-focus-stat"><span class="defender-focus-stat-label">DEF</span><span class="defender-focus-stat-value">${defender.def}</span></div>
      <div class="defender-focus-stat"><span class="defender-focus-stat-label">SP ATK</span><span class="defender-focus-stat-value">${defender.spAtk}</span></div>
      <div class="defender-focus-stat"><span class="defender-focus-stat-label">SP DEF</span><span class="defender-focus-stat-value">${defender.spDef}</span></div>
      <div class="defender-focus-stat"><span class="defender-focus-stat-label">SPD</span><span class="defender-focus-stat-value">${defender.spd}</span></div>
    </div>

    <div class="defender-focus-moves">
      <div class="defender-panel-label">MOVE MODULES</div>
      ${movePreview}
    </div>
  `;
}

// buildDefenderPartySlotMarkup() renders one locked-party slot so the chosen squad stays readable at a glance.
function buildDefenderPartySlotMarkup(defender, slotIndex) {
  if (!defender) {
    return `
      <div class="defender-party-slot is-empty">
        <div class="defender-party-slot-index">SLOT ${slotIndex + 1}</div>
        <div class="defender-party-slot-name">EMPTY SLOT</div>
        <div class="defender-party-slot-role">WAITING FOR DEFENDER</div>
      </div>
    `;
  }

  const cardAccent = defender.color || "#87e4ff";

  return `
    <div
      class="defender-party-slot is-filled"
      style="--defender-accent: ${cardAccent}; --defender-accent-soft: ${cardAccent}24;"
    >
      <div class="defender-party-slot-index">SLOT ${slotIndex + 1}</div>
      <div class="defender-party-slot-glyph" aria-hidden="true">${getDefenderMonogram(defender)}</div>
      <div class="defender-party-slot-name">${defender.name}</div>
      <div class="defender-party-slot-role">${defender.role}</div>
    </div>
  `;
}

// updateDefenderSelectionFocusDom() swaps just the preview panel and focus highlight without rebuilding the whole screen.
function updateDefenderSelectionFocusDom() {
  if (!defenderScreenContent) {
    return;
  }

  const activeFocusId = getDefenderSelectionFocusId();
  defenderSelectionFocusId = activeFocusId;

  const activeDefender = getDefenderTemplate(activeFocusId);
  if (!activeDefender) {
    return;
  }

  const activeDefenderId = activeDefender.id;
  const activeIsSelected = defenderSelectionDraft.includes(activeDefenderId);
  const activeIsLocked = !Array.isArray(defenderSaveState?.unlockedDefenders) || !defenderSaveState.unlockedDefenders.includes(activeDefenderId);
  const defenderFocusPanel = document.getElementById("defender-focus-panel");

  defenderScreenContent.querySelectorAll("[data-defender-id]").forEach((tile) => {
    const tileId = tile.getAttribute("data-defender-id");
    const isFocused = tileId === activeDefenderId;
    tile.classList.toggle("is-focused", isFocused);
    tile.setAttribute("aria-current", isFocused ? "true" : "false");
  });

  if (defenderFocusPanel) {
    defenderFocusPanel.innerHTML = buildDefenderDetailPanelMarkup(
      activeDefender,
      activeIsSelected,
      activeIsLocked,
      defenderSelectionDraft.length
    );
  }
}

// setDefenderSelectionFocus() updates the current preview target and refreshes the visible preview when the screen is open.
function setDefenderSelectionFocus(defenderId) {
  const nextFocusId = getDefenderSelectionFocusId(defenderId);
  if (!nextFocusId || nextFocusId === defenderSelectionFocusId) {
    return nextFocusId;
  }

  defenderSelectionFocusId = nextFocusId;

  if (screenState === "defenders" && defenderScreenContent) {
    updateDefenderSelectionFocusDom();
  }

  return nextFocusId;
}

// buildDefenderSelectionMarkup() assembles the roster grid, the active preview, the party slots, and the action bar.
function buildDefenderSelectionMarkup() {
  const selectedIds = defenderSelectionDraft.slice();
  const roster = getStarterDefenderCatalog();
  const activeFocusId = getDefenderSelectionFocusId();
  const activeDefender = getDefenderTemplate(activeFocusId) || roster[0];
  const selectedDefenders = selectedIds.map((defenderId) => getDefenderTemplate(defenderId)).filter(Boolean);
  const unlockedIds = Array.isArray(defenderSaveState?.unlockedDefenders) ? defenderSaveState.unlockedDefenders : getDefaultStarterDefenderIds();

  return `
    <div class="defender-shell">
      <div class="defender-header">
        <div class="defender-header-copy">
          <div class="defender-kicker">OPERATOR LOADOUT / STAGE ONE</div>
          <h2 class="briefing-title">STARTER LINEUP</h2>
          <p class="briefing-copy defender-copy">ASSEMBLE YOUR FOUR-DEFENDER PARTY, LOCK THE LOADOUT, THEN ENTER THREATGRID.</p>
        </div>
        <div class="defender-header-panel" aria-hidden="true">
          <div class="defender-header-panel-label">LOADOUT DIRECTIVE</div>
          <div class="defender-header-panel-value">ROSTER VIEW ACTIVE. HOVER A DEFENDER TO INSPECT THE LOADOUT, THEN LOCK FOUR FOR THE RUN.</div>
        </div>
        <button id="defender-screen-back" class="back-button" type="button">← RETURN TO MENU</button>
      </div>

      <div class="defender-rule" aria-hidden="true"></div>

      <div class="defender-status-row">
        <div id="defender-selection-count" class="defender-selection-count">${selectedIds.length} / 4 SELECTED</div>
        <div id="defender-selection-status" class="defender-selection-status">${selectedIds.length === 4 ? "LOADOUT READY. BEGIN THE RUN WHEN YOU ARE READY." : "SELECT A PARTY OF FOUR."}</div>
      </div>

      <div class="defender-workbench">
        <section class="defender-roster-panel" aria-label="Defender roster">
          <div class="defender-panel-label">DEFENDER ROSTER</div>
          <div class="defender-roster-grid">
            ${roster.map((defender) => {
              const isSelected = selectedIds.includes(defender.id);
              const isLocked = !unlockedIds.includes(defender.id);
              const isFocused = activeDefender && activeDefender.id === defender.id;
              return buildDefenderRosterTileMarkup(defender, isSelected, isLocked, isFocused);
            }).join("")}
          </div>
        </section>

        <section id="defender-focus-panel" class="defender-focus-panel" aria-live="polite" aria-label="Active defender details">
          ${activeDefender ? buildDefenderDetailPanelMarkup(
            activeDefender,
            selectedIds.includes(activeDefender.id),
            !unlockedIds.includes(activeDefender.id),
            selectedIds.length
          ) : ""}
        </section>
      </div>

      <div class="defender-lower-row">
        <section class="defender-party-panel" aria-label="Locked party slots">
          <div class="defender-panel-label">LOCKED PARTY / 4 SLOTS</div>
          <div class="defender-party-slots">
            ${Array.from({ length: 4 }, (_, slotIndex) => buildDefenderPartySlotMarkup(selectedDefenders[slotIndex], slotIndex)).join("")}
          </div>
        </section>

        <div class="defender-footer">
          <button id="defender-screen-reset" class="menu-button" type="button">RESET LOADOUT</button>
          <button id="defender-screen-confirm" class="menu-button" type="button" ${selectedIds.length === 4 ? "" : "disabled"}>BEGIN RUN</button>
        </div>
      </div>
    </div>
  `;
}

// buildDefenderSelectionLegacyMarkup() restores the original four-card lineup so we can fall back instantly if the roster screen misbehaves.
function buildDefenderSelectionLegacyMarkup() {
  const selectedIds = defenderSelectionDraft.slice();
  const starterCards = getStarterDefenderCatalog();
  const unlockedIds = Array.isArray(defenderSaveState?.unlockedDefenders) ? defenderSaveState.unlockedDefenders : [];

  return `
    <div class="defender-shell">
      <div class="defender-header">
        <div class="defender-header-copy">
          <div class="defender-kicker">OPERATOR LOADOUT / STAGE ONE</div>
          <h2 class="briefing-title">STARTER LINEUP</h2>
          <p class="briefing-copy defender-copy">CHOOSE FOUR ORIGINAL DEFENDERS TO SEED YOUR NEXT RUN. THE LOADOUT SAVES LOCALLY.</p>
        </div>
        <div class="defender-header-panel" aria-hidden="true">
          <div class="defender-header-panel-label">LOADOUT DIRECTIVE</div>
          <div class="defender-header-panel-value">ASSEMBLE A FOUR-DEFENDER PARTY, LOCK THE LOADOUT, THEN ENTER THREATGRID.</div>
        </div>
        <button id="defender-screen-back" class="back-button" type="button">← RETURN TO MENU</button>
      </div>

      <div class="defender-rule" aria-hidden="true"></div>

      <div class="defender-status-row">
        <div id="defender-selection-count" class="defender-selection-count">${selectedIds.length} / 4 SELECTED</div>
        <div id="defender-selection-status" class="defender-selection-status">${selectedIds.length === 4 ? "LOADOUT READY. BEGIN THE RUN WHEN YOU ARE READY." : "SELECT A PARTY OF FOUR."}</div>
      </div>

      <div class="defender-grid">
        ${starterCards.map((defender) => {
          const isSelected = selectedIds.includes(defender.id);
          const isLocked = !unlockedIds.includes(defender.id);
          return buildDefenderCardMarkup(defender, isSelected, isLocked);
        }).join("")}
      </div>

      <div class="defender-footer">
        <button id="defender-screen-reset" class="menu-button" type="button">RESET LOADOUT</button>
        <button id="defender-screen-confirm" class="menu-button" type="button" ${selectedIds.length === 4 ? "" : "disabled"}>BEGIN RUN</button>
      </div>
    </div>
  `;
}

// bindDefenderSelectionControls() wires the roster tiles and footer buttons after the screen is rendered.
function bindDefenderSelectionControls() {
  const defenderScreenConfirm = document.getElementById("defender-screen-confirm");
  const defenderScreenReset = document.getElementById("defender-screen-reset");
  const defenderScreenBack = document.getElementById("defender-screen-back");

  const rosterTiles = defenderScreenContent.querySelectorAll("[data-defender-id]");
  rosterTiles.forEach((tile) => {
    const defenderId = tile.getAttribute("data-defender-id");

    tile.addEventListener("mouseenter", () => {
      setDefenderSelectionFocus(defenderId);
    });

    tile.addEventListener("focus", () => {
      setDefenderSelectionFocus(defenderId);
    });

    tile.addEventListener("click", () => {
      setDefenderSelectionFocus(defenderId);
      toggleDefenderSelection(defenderId);
    });
  });

  if (defenderScreenBack) {
    defenderScreenBack.addEventListener("click", () => {
      showMenu();
    });
  }

  if (defenderScreenReset) {
    defenderScreenReset.addEventListener("click", () => {
      const defaultStarterIds = getDefaultStarterDefenderIds();
      defenderSelectionFocusId = defaultStarterIds[0] || null;
      updateSelectedDefenders(defaultStarterIds);
      const statusNode = document.getElementById("defender-selection-status");
      if (statusNode) {
        statusNode.textContent = "DEFAULT PARTY RESTORED.";
      }
    });
  }

  if (defenderScreenConfirm) {
    defenderScreenConfirm.addEventListener("click", () => {
      if (defenderSelectionDraft.length !== 4) {
        const statusNode = document.getElementById("defender-selection-status");
        if (statusNode) {
          statusNode.textContent = "LOCK IN FOUR DEFENDERS BEFORE STARTING THE RUN.";
        }
        return;
      }

      startRunWithSelectedDefenders();
    });
  }
}

// bindDefenderSelectionLegacyControls() wires the original four-card layout when the roster-select screen is disabled.
function bindDefenderSelectionLegacyControls() {
  const defenderScreenConfirm = document.getElementById("defender-screen-confirm");
  const defenderScreenReset = document.getElementById("defender-screen-reset");
  const defenderScreenBack = document.getElementById("defender-screen-back");

  const selectionCards = defenderScreenContent.querySelectorAll("[data-defender-id]");
  selectionCards.forEach((card) => {
    card.addEventListener("click", () => {
      toggleDefenderSelection(card.getAttribute("data-defender-id"));
    });
  });

  if (defenderScreenBack) {
    defenderScreenBack.addEventListener("click", () => {
      showMenu();
    });
  }

  if (defenderScreenReset) {
    defenderScreenReset.addEventListener("click", () => {
      updateSelectedDefenders(getDefaultStarterDefenderIds());
      const statusNode = document.getElementById("defender-selection-status");
      if (statusNode) {
        statusNode.textContent = "DEFAULT PARTY RESTORED.";
      }
    });
  }

  if (defenderScreenConfirm) {
    defenderScreenConfirm.addEventListener("click", () => {
      if (defenderSelectionDraft.length !== 4) {
        const statusNode = document.getElementById("defender-selection-status");
        if (statusNode) {
          statusNode.textContent = "LOCK IN FOUR DEFENDERS BEFORE STARTING THE RUN.";
        }
        return;
      }

      startRunWithSelectedDefenders();
    });
  }
}

// renderDefenderSelectionScreen() redraws the loadout editor and keeps the counter/status text current.
function renderStarterRosterSelect() {
  if (!defenderScreenContent) {
    return;
  }

  if (!defenderSaveState) {
    loadSave();
  }

  const selectedDefenders = defenderSelectionDraft.map((defenderId) => getDefenderTemplate(defenderId)).filter(Boolean);
  console.log("[Starter Lineup] Rendering roster select");
  console.log("[Starter Lineup] Selected defenders:", selectedDefenders);

  defenderSelectionFocusId = getDefenderSelectionFocusId(defenderSelectionFocusId);
  defenderScreenContent.innerHTML = buildDefenderSelectionMarkup();

  const defenderSelectionCount = document.getElementById("defender-selection-count");
  const defenderSelectionStatus = document.getElementById("defender-selection-status");

  if (defenderSelectionCount) {
    defenderSelectionCount.textContent = `${defenderSelectionDraft.length} / 4 SELECTED`;
  }

  if (defenderSelectionStatus) {
    defenderSelectionStatus.textContent = defenderSelectionDraft.length === 4
      ? "LOADOUT READY. BEGIN THE RUN WHEN YOU ARE READY."
      : "SELECT A PARTY OF FOUR.";
  }

  bindDefenderSelectionControls();
  updateDefenderSelectionFocusDom();
}

// renderLegacyStarterLineup() keeps the original four-card layout available as a safety net.
function renderLegacyStarterLineup() {
  if (!defenderScreenContent) {
    return;
  }

  console.log("[Starter Lineup] Rendering legacy fallback");

  defenderScreenContent.innerHTML = buildDefenderSelectionLegacyMarkup();
  console.log("[Starter Lineup] legacy content length:", defenderScreenContent.innerHTML.length);
  console.log("[Starter Lineup] defender screen:", document.getElementById("defender-screen"));
  console.log("[Starter Lineup] defender content:", defenderScreenContent);
  const defenderSelectionCount = document.getElementById("defender-selection-count");
  const defenderSelectionStatus = document.getElementById("defender-selection-status");

  if (defenderSelectionCount) {
    defenderSelectionCount.textContent = `${defenderSelectionDraft.length} / 4 SELECTED`;
  }

  if (defenderSelectionStatus) {
    defenderSelectionStatus.textContent = defenderSelectionDraft.length === 4
      ? "LOADOUT READY. BEGIN THE RUN WHEN YOU ARE READY."
      : "SELECT A PARTY OF FOUR.";
  }

  bindDefenderSelectionLegacyControls();
}

// renderDefenderSelectionScreen() redraws the loadout editor and keeps the counter/status text current.
function renderDefenderSelectionScreen() {
  try {
    if (defenderRosterSelectEnabled) {
      renderStarterRosterSelect();
      return;
    }

    renderLegacyStarterLineup();
  } catch (error) {
    console.error("[Starter Lineup] Roster render failed, falling back.", error);
    renderLegacyStarterLineup();
  }
}

// showDefenderSelectionScreen() opens the starter setup screen inside the shared boot overlay.
function showDefenderSelectionScreen() {
  if (!defenderSaveState) {
    loadSave();
  }

  bootOverlay.style.display = "block";
  bootOverlay.classList.remove("is-hiding");
  setScreen("defenders");
  defenderSelectionDraft = getSelectedDefenderIds();
  renderDefenderSelectionScreen();
}

// initDefenderSystem() loads save data immediately so the selected loadout is active before the first run.
function initDefenderSystem() {
  loadSave();
  applySelectedDefenderRoster();
}

initDefenderSystem();
