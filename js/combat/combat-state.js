/* Combat state helpers keep encounter scaling, turn ordering, and damage math out of the main app wiring. */

// The party roster persists across battles so the run keeps its roguelike progression state.
const programs = [
  {
    id: "firewall-7",
    name: "Firewall-7",
    type: "defense",
    level: 1,
    hp: 100,
    maxHp: 100,
    atk: 3,
    def: 7,
    spd: 6,
    color: "#00ccff",
    xp: 0,
    statusEffects: [],
    responseTags: ["guard", "mitigate", "isolate"],
    abilities: [
      {
        name: "Block Network",
        cost: 0,
        baseDamage: 0,
        effect: "reduce_next_damage"
      },
      {
        name: "Harden Ports",
        cost: 1,
        baseDamage: 15,
        effect: "boost_def"
      },
      {
        name: "Allocate Bandwidth",
        cost: 2,
        baseDamage: 25,
        effect: "shared_ability"
      }
    ]
  },
  {
    id: "ids-4",
    name: "IDS",
    type: "offense",
    level: 1,
    hp: 92,
    maxHp: 92,
    atk: 6,
    def: 4,
    spd: 8,
    color: "#00ff88",
    xp: 0,
    statusEffects: [],
    responseTags: ["scan", "countertrace", "reveal"],
    abilities: [
      {
        name: "Deep Packet Scan",
        cost: 0,
        baseDamage: 16,
        effect: "status_detected"
      },
      {
        name: "Signature Burst",
        cost: 1,
        baseDamage: 22,
        effect: "status_detected"
      },
      {
        name: "Quarantine Relay",
        cost: 2,
        baseDamage: 28,
        effect: "shared_ability"
      }
    ]
  },
  {
    id: "honeypot-3",
    name: "Honeypot",
    type: "deception",
    level: 1,
    hp: 96,
    maxHp: 96,
    atk: 4,
    def: 5,
    spd: 7,
    color: "#ffcc00",
    xp: 0,
    statusEffects: [],
    responseTags: ["decoy", "redirect", "bait"],
    abilities: [
      {
        name: "Lure Traffic",
        cost: 0,
        baseDamage: 14,
        effect: "status_isolated"
      },
      {
        name: "Decoy Mesh",
        cost: 1,
        baseDamage: 20,
        effect: "boost_def"
      },
      {
        name: "Sandtrap",
        cost: 2,
        baseDamage: 26,
        effect: "status_isolated"
      }
    ]
  },
  {
    id: "antivirus-9",
    name: "Antivirus",
    type: "purge",
    level: 1,
    hp: 108,
    maxHp: 108,
    atk: 5,
    def: 6,
    spd: 5,
    color: "#ff2233",
    xp: 0,
    statusEffects: [],
    responseTags: ["cleanse", "purge", "recover"],
    abilities: [
      {
        name: "Signature Sweep",
        cost: 0,
        baseDamage: 16,
        effect: "cleanse"
      },
      {
        name: "Rapid Scan",
        cost: 1,
        baseDamage: 22,
        effect: "status_detected"
      },
      {
        name: "Kernel Purge",
        cost: 2,
        baseDamage: 30,
        effect: "cleanse"
      }
    ]
  }
];

// The default roster snapshot lets the run reset cleanly when the player returns to the menu.
const defaultPrograms = JSON.parse(JSON.stringify(programs));

// Combat globals stay here so the battle layer can be reset without digging through main.js closures.
let combatState = null;
let combatEngine = null;
let encounterTransitionActive = false;
let encounterTransitionTimerId = null;

// resetCombatState() clears the live battle objects so a fresh encounter can be created safely.
function resetCombatState() {
  combatState = null;
  combatEngine = null;
  encounterTransitionActive = false;

  if (encounterTransitionTimerId !== null) {
    window.clearTimeout(encounterTransitionTimerId);
    encounterTransitionTimerId = null;
  }
}

// resetBattleIntroState() initializes the summon-intro flags so each fresh battle starts with input locked.
function resetBattleIntroState(state) {
  return {
    ...state,
    battleIntroPlaying: true,
    battleIntroStage: "operator",
    battleIntroComplete: false
  };
}

// getMoveUseAvailability() returns whether a move can currently be used and, if not, why it is blocked.
function getMoveUseAvailability(move, battleState = null) {
  const safeMove = move && typeof move === "object" ? move : null;
  const moveName = safeMove?.name || "THIS MOVE";
  const charges = safeMove ? getMoveChargeCount(safeMove) : 0;
  const maxCharges = safeMove && Number.isFinite(safeMove.maxCharges) ? safeMove.maxCharges : Math.max(0, charges);
  const requiredGauge = safeMove && Number.isFinite(safeMove.cost) ? Math.max(0, safeMove.cost) : 0;
  const currentGauge = Number.isFinite(battleState?.responseGauge) ? battleState.responseGauge : 0;

  if (!safeMove) {
    return {
      canUse: false,
      reason: "unavailable",
      message: "MOVE UNAVAILABLE.",
      detail: "SELECT ANOTHER MOVE.",
      charges: 0,
      maxCharges: 0,
      requiredGauge: 0,
      currentGauge
    };
  }

  if (charges <= 0) {
    return {
      canUse: false,
      reason: "charges",
      message: "NO CHARGES REMAINING.",
      detail: `${moveName.toUpperCase()} HAS NO CHARGES LEFT.`,
      charges,
      maxCharges,
      requiredGauge,
      currentGauge
    };
  }

  if (currentGauge < requiredGauge) {
    return {
      canUse: false,
      reason: "gauge",
      message: "NOT ENOUGH TACTICAL GAUGE.",
      detail: `${moveName.toUpperCase()} REQUIRES ${requiredGauge} TACTICAL GAUGE. CURRENT: ${currentGauge}.`,
      charges,
      maxCharges,
      requiredGauge,
      currentGauge
    };
  }

  return {
    canUse: true,
    reason: "ready",
    message: "",
    detail: "",
    charges,
    maxCharges,
    requiredGauge,
    currentGauge
  };
}

// normalizeCombatantStatusEffect() converts old string statuses and new timed statuses into a safe display-ready shape.
function normalizeCombatantStatusEffect(statusEffect) {
  if (!statusEffect) {
    return null;
  }

  if (typeof statusEffect === "string") {
    const id = String(statusEffect).trim().toLowerCase();
    if (!id) {
      return null;
    }

    if (id === "rot") {
      return {
        id,
        label: "ROT",
        type: "damage_over_time",
        duration: 3,
        potency: 4,
        sourceId: null,
        description: "Corruption deals damage at the end of the affected unit's turn."
      };
    }

    if (id === "flood") {
      return {
        id,
        label: "FLOOD",
        type: "gauge_disruption",
        duration: 3,
        potency: 10,
        sourceId: null,
        description: "Flooded command traffic reduces Tactical Gauge recovery."
      };
    }

    return {
      id,
      label: id.toUpperCase(),
      type: "state",
      duration: null,
      potency: null,
      sourceId: null,
      description: ""
    };
  }

  if (typeof statusEffect !== "object") {
    return null;
  }

  const id = String(statusEffect.id || statusEffect.label || "").trim().toLowerCase();
  if (!id) {
    return null;
  }

  return {
    id,
    label: String(statusEffect.label || id).toUpperCase(),
    type: String(statusEffect.type || "state"),
    duration: Number.isFinite(statusEffect.duration) ? Math.max(0, statusEffect.duration) : null,
    potency: Number.isFinite(statusEffect.potency) ? Math.max(0, statusEffect.potency) : null,
    sourceId: typeof statusEffect.sourceId === "string" ? statusEffect.sourceId : null,
    description: typeof statusEffect.description === "string" ? statusEffect.description : ""
  };
}

// getCombatantStatusKey() returns the stable status id used by refresh and display helpers.
function getCombatantStatusKey(statusEffect) {
  return normalizeCombatantStatusEffect(statusEffect)?.id || "";
}

// hasCombatantStatus() checks for a status whether it is stored as a string or a timed status object.
function hasCombatantStatus(combatant, statusId) {
  const targetId = String(statusId || "").trim().toLowerCase();
  const statuses = Array.isArray(combatant?.statusEffects) ? combatant.statusEffects : [];
  if (!targetId || !statuses.length) {
    return false;
  }

  return statuses.some((statusEffect) => getCombatantStatusKey(statusEffect) === targetId);
}

// applyStatusEffect() adds or refreshes a status effect without creating duplicate copies.
function applyStatusEffect(target, statusEffect) {
  if (!target || typeof target !== "object") {
    return null;
  }

  const incoming = normalizeCombatantStatusEffect(statusEffect);
  if (!incoming) {
    return null;
  }

  target.statusEffects = Array.isArray(target.statusEffects) ? target.statusEffects : [];
  const existingIndex = target.statusEffects.findIndex((entry) => getCombatantStatusKey(entry) === incoming.id);

  if (existingIndex >= 0) {
    const existing = normalizeCombatantStatusEffect(target.statusEffects[existingIndex]) || incoming;
    const merged = {
      ...existing,
      ...incoming,
      duration: incoming.duration == null
        ? existing.duration
        : existing.duration == null
          ? incoming.duration
          : Math.max(existing.duration, incoming.duration),
      potency: incoming.potency == null
        ? existing.potency
        : existing.potency == null
          ? incoming.potency
          : Math.max(existing.potency, incoming.potency)
    };

    target.statusEffects[existingIndex] = merged;
    return merged;
  }

  target.statusEffects.push(incoming);
  return incoming;
}

// removeExpiredStatusEffects() strips timed statuses that have already run their course.
function removeExpiredStatusEffects(combatant) {
  if (!combatant || typeof combatant !== "object" || !Array.isArray(combatant.statusEffects)) {
    return [];
  }

  combatant.statusEffects = combatant.statusEffects.filter((statusEffect) => {
    const normalized = normalizeCombatantStatusEffect(statusEffect);
    if (!normalized) {
      return false;
    }

    if (Number.isFinite(normalized.duration)) {
      return normalized.duration > 0;
    }

    return true;
  });

  return combatant.statusEffects;
}

// resolveEndOfTurnStatusEffects() applies tick-based statuses such as ROT when a combatant's turn ends.
function resolveEndOfTurnStatusEffects(combatant, battleState = null) {
  const actor = combatant && typeof combatant === "object" ? combatant : null;
  const statusEffects = Array.isArray(actor?.statusEffects) ? actor.statusEffects : [];
  const events = [];

  if (!actor || !statusEffects.length) {
    return events;
  }

  const actorName = String(actor.name || actor.title || "THE TARGET").toUpperCase();
  const nextStatuses = [];

  statusEffects.forEach((statusEffect) => {
    const normalized = normalizeCombatantStatusEffect(statusEffect);
    if (!normalized) {
      return;
    }

    if (normalized.id === "rot" && normalized.type === "damage_over_time") {
      const potency = Number.isFinite(normalized.potency) ? Math.max(1, normalized.potency) : 4;
      const nextDuration = Number.isFinite(normalized.duration) ? normalized.duration - 1 : 0;
      actor.hp = Math.max(0, actor.hp - potency);
      events.push({
        message: `ROT eats through ${actorName}. ${actorName} takes ${potency} damage.`,
        variant: "damage"
      });

      if (nextDuration > 0) {
        nextStatuses.push({
          ...normalized,
          duration: nextDuration
        });
      } else {
        events.push({
          message: `${actorName} PURGED THE ROT.`,
          variant: "buff"
        });
      }
      return;
    }

    if (normalized.id === "flood" && normalized.type === "gauge_disruption") {
      const nextDuration = Number.isFinite(normalized.duration) ? normalized.duration - 1 : 0;

      if (nextDuration > 0) {
        events.push({
          message: `FLOOD PRESSURE REMAINS ON ${actorName}. ${nextDuration} TURNS LEFT.`,
          variant: "warn"
        });
        nextStatuses.push({
          ...normalized,
          duration: nextDuration
        });
      } else {
        events.push({
          message: `${actorName} CLEARED THE FLOOD.`,
          variant: "buff"
        });
      }
      return;
    }

    nextStatuses.push(statusEffect);
  });

  actor.statusEffects = nextStatuses;

  if (actor.hp <= 0 && battleState && typeof battleState === "object" && battleState.phase === "battle") {
    if (actor === battleState.threat) {
      battleState.threat.hp = 0;
    }
  }

  removeExpiredStatusEffects(actor);
  return events;
}

// formatCombatantStatusEffects() turns the active status list into short tactical labels.
function formatCombatantStatusEffects(combatant) {
  const statuses = Array.isArray(combatant?.statusEffects) ? combatant.statusEffects : [];
  if (!statuses.length) {
    return [];
  }

  return statuses.map((statusEffect) => {
    const normalized = normalizeCombatantStatusEffect(statusEffect);
    if (!normalized) {
      return "";
    }

    if (normalized.id === "rot" && Number.isFinite(normalized.duration)) {
      return `${normalized.label} ${normalized.duration}T`;
    }

    if (Number.isFinite(normalized.duration)) {
      return `${normalized.label} ${normalized.duration}T`;
    }

    return normalized.label;
  }).filter(Boolean);
}

// hasFloodStatus() checks whether a combatant is currently Flooded by hostile traffic.
function hasFloodStatus(combatant) {
  return hasCombatantStatus(combatant, "flood");
}

// getFocusGaugeRecoveryAmount() returns the Tactical Gauge restored by Focus after status modifiers like FLOOD.
function getFocusGaugeRecoveryAmount(combatant) {
  return hasFloodStatus(combatant) ? 15 : 25;
}

// normalizeResponseTagList() keeps response-tag matching resilient across current and future roster data.
function normalizeResponseTagList(tags = []) {
  const source = Array.isArray(tags) ? tags : [tags];
  const seen = new Set();
  const normalizedTags = [];

  source.forEach((tag) => {
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

// getDefenderResponseTags() exposes a stable response-tag list without hardcoding starter names.
function getDefenderResponseTags(defender) {
  if (!defender || typeof defender !== "object") {
    return [];
  }

  const rawTags = [];
  if (Array.isArray(defender.responseTags)) {
    rawTags.push(...defender.responseTags);
  }
  if (Array.isArray(defender.defenseProfile?.tags)) {
    rawTags.push(...defender.defenseProfile.tags);
  }

  return normalizeResponseTagList(rawTags);
}

// hasResponseTag() checks a single normalized response tag on a Defender.
function hasResponseTag(defender, tag) {
  const [normalizedTag] = normalizeResponseTagList([tag]);
  if (!normalizedTag) {
    return false;
  }

  return getDefenderResponseTags(defender).includes(normalizedTag);
}

// getLivingPartyResponseTags() aggregates unique response tags from living allies only.
function getLivingPartyResponseTags(battleState = null) {
  const party = Array.isArray(battleState?.playerParty)
    ? battleState.playerParty
    : Array.isArray(programs)
      ? programs
      : [];

  const allTags = party
    .filter((program) => program && (!Number.isFinite(program.hp) || program.hp > 0))
    .flatMap((program) => getDefenderResponseTags(program));

  return normalizeResponseTagList(allTags);
}

function getThreatResponseTagList(threat, key) {
  if (!threat || typeof threat !== "object") {
    return [];
  }

  const directTags = normalizeResponseTagList(threat[key]);
  if (directTags.length) {
    return directTags;
  }

  if (key === "weakTo") {
    return normalizeResponseTagList(threat.weakPoint);
  }

  return [];
}

// getThreatIntentTags() returns normalized tactical-intent tags for future response matching.
function getThreatIntentTags(threat) {
  return getThreatResponseTagList(threat, "intentTags");
}

// isThreatWeakToResponse() reports whether a response tag gets bonus effect against the threat.
function isThreatWeakToResponse(threat, responseTag) {
  const [normalizedTag] = normalizeResponseTagList([responseTag]);
  if (!normalizedTag) {
    return false;
  }

  return getThreatResponseTagList(threat, "weakTo").includes(normalizedTag);
}

// isThreatResistantToResponse() reports whether a response tag is reduced against the threat.
function isThreatResistantToResponse(threat, responseTag) {
  const [normalizedTag] = normalizeResponseTagList([responseTag]);
  if (!normalizedTag) {
    return false;
  }

  return getThreatResponseTagList(threat, "resists").includes(normalizedTag);
}

// isThreatImmuneToResponse() reports whether a response tag should fail against the threat.
function isThreatImmuneToResponse(threat, responseTag) {
  const [normalizedTag] = normalizeResponseTagList([responseTag]);
  if (!normalizedTag) {
    return false;
  }

  return getThreatResponseTagList(threat, "immuneTo").includes(normalizedTag);
}

function formatResponseHintTag(tag) {
  return String(tag || "").trim().toUpperCase();
}

const enemyResponseTuning = {
  isolate: {
    reductions: {
      normal: 0.35,
      recommended: 0.58,
      empowered: 0.4,
      resisted: 0.15,
      immune: 0
    },
    gaugeGain: {
      normal: 0,
      recommended: 0,
      empowered: 0,
      resisted: 0,
      immune: 0
    }
  },
  countertrace: {
    reductions: {
      normal: 0.2,
      recommended: 0.42,
      empowered: 0.28,
      resisted: 0.08,
      immune: 0
    },
    gaugeGain: {
      normal: 10,
      recommended: 14,
      empowered: 12,
      resisted: 5,
      immune: 0
    }
  },
  redirect: {
    reductions: {
      normal: 0.24,
      recommended: 0.46,
      empowered: 0.52,
      resisted: 0.08,
      immune: 0
    },
    gaugeGain: {
      normal: 0,
      recommended: 0,
      empowered: 0,
      resisted: 0,
      immune: 0
    }
  },
  purge: {
    reductions: {
      normal: 0.28,
      recommended: 0.5,
      empowered: 0.38,
      resisted: 0.1,
      immune: 0
    },
    gaugeGain: {
      normal: 0,
      recommended: 0,
      empowered: 0,
      resisted: 0,
      immune: 0
    }
  }
};

const enemyResponseActions = [
  {
    id: "isolate",
    name: "ISOLATE",
    shortText: "Reduce incoming spread damage.",
    responseTags: ["isolate"],
    empowerTags: ["isolate"],
    intentTags: ["swarm", "spread", "multi", "flood", "overload"],
    reductions: enemyResponseTuning.isolate.reductions,
    gaugeGain: enemyResponseTuning.isolate.gaugeGain
  },
  {
    id: "countertrace",
    name: "COUNTERTRACE",
    shortText: "Reduce damage and gain gauge.",
    responseTags: ["countertrace"],
    empowerTags: ["countertrace"],
    intentTags: ["deceive", "harvest", "stealth", "escalate", "breach", "persist"],
    reductions: enemyResponseTuning.countertrace.reductions,
    gaugeGain: enemyResponseTuning.countertrace.gaugeGain
  },
  {
    id: "redirect",
    name: "REDIRECT",
    shortText: "Divert incoming payload.",
    responseTags: ["redirect", "decoy", "bait"],
    empowerTags: ["decoy", "redirect", "bait"],
    intentTags: ["deceive", "redirect", "harvest", "beacon"],
    reductions: enemyResponseTuning.redirect.reductions,
    gaugeGain: enemyResponseTuning.redirect.gaugeGain
  },
  {
    id: "purge",
    name: "PURGE",
    shortText: "Cleanse status pressure.",
    responseTags: ["purge", "cleanse", "recover"],
    empowerTags: ["purge", "cleanse", "recover"],
    intentTags: ["corrupt", "shield", "persist", "status"],
    reductions: enemyResponseTuning.purge.reductions,
    gaugeGain: enemyResponseTuning.purge.gaugeGain
  }
];

function getEnemyResponseActions() {
  return enemyResponseActions.map((action) => ({ ...action }));
}

function getEnemyResponseAction(responseId) {
  const normalizedId = String(responseId || "").trim().toLowerCase();
  return enemyResponseActions.find((action) => action.id === normalizedId) || null;
}

function hasAnyResponseTag(sourceTags, targetTags) {
  const normalizedSourceTags = normalizeResponseTagList(sourceTags);
  const normalizedTargetTags = normalizeResponseTagList(targetTags);
  return normalizedTargetTags.some((tag) => normalizedSourceTags.includes(tag));
}

function getCurrentEnemyIntentResponseTags(battleState = null) {
  const currentIntent = battleState?.pendingEnemyAction?.resolvedEnemyIntent?.intent
    || battleState?.enemyIntent
    || battleState?.resolvedEnemyIntent
    || null;
  const currentIntentTags = normalizeResponseTagList([
    currentIntent?.id,
    currentIntent?.type,
    currentIntent?.severity,
    currentIntent?.iconLabel,
    ...(Array.isArray(currentIntent?.intentTags) ? currentIntent.intentTags : [])
  ]);

  return normalizeResponseTagList([
    ...currentIntentTags,
    ...getThreatIntentTags(battleState?.threat)
  ]);
}

function doesThreatMatchResponse(threat, action, matcher) {
  return normalizeResponseTagList(action?.responseTags).some((tag) => matcher(threat, tag));
}

function getEnemyResponseEvaluation(battleState = null, responseId = "") {
  const action = getEnemyResponseAction(responseId);
  const threat = battleState?.threat;
  if (!action || !threat) {
    return null;
  }

  const livingTags = getLivingPartyResponseTags(battleState);
  const intentTags = getCurrentEnemyIntentResponseTags(battleState);
  const isImmune = doesThreatMatchResponse(threat, action, isThreatImmuneToResponse);
  const isWeak = doesThreatMatchResponse(threat, action, isThreatWeakToResponse);
  const isIntentMatch = hasAnyResponseTag(intentTags, action.intentTags);
  const isResisted = doesThreatMatchResponse(threat, action, isThreatResistantToResponse);
  const isEmpowered = hasAnyResponseTag(livingTags, action.empowerTags);

  let status = "NORMAL";
  if (isImmune) {
    status = "INEFFECTIVE";
  } else if (isWeak || isIntentMatch) {
    status = "RECOMMENDED";
  } else if (isResisted) {
    status = "RESISTED";
  } else if (isEmpowered) {
    status = "EMPOWERED";
  }

  const effectKey = status === "INEFFECTIVE"
    ? "immune"
    : status === "RECOMMENDED"
      ? "recommended"
      : status === "EMPOWERED"
        ? "empowered"
        : status === "RESISTED"
          ? "resisted"
          : "normal";

  return {
    id: action.id,
    name: action.name,
    shortText: action.shortText,
    status,
    effectKey,
    damageReduction: action.reductions[effectKey],
    gaugeGain: action.gaugeGain[effectKey],
    isRecommended: status === "RECOMMENDED",
    isEmpowered,
    isResisted,
    isImmune
  };
}

function getEnemyResponseOptions(battleState = null) {
  return enemyResponseActions
    .map((action) => getEnemyResponseEvaluation(battleState, action.id))
    .filter(Boolean);
}

function getRecommendedEnemyResponse(battleState = null) {
  const options = getEnemyResponseOptions(battleState);
  return options.find((option) => option.status === "RECOMMENDED") || null;
}

// getThreatResponseHint() surfaces the best current response match without changing combat outcomes.
function getThreatResponseHint(battleState = null) {
  const threat = battleState?.threat;
  if (!battleState?.enemyIntent || !threat) {
    return null;
  }

  const livingTags = getLivingPartyResponseTags(battleState);
  if (!livingTags.length) {
    return {
      label: "COUNTERPLAY",
      text: "NO STRONG COUNTER",
      tag: "",
      tone: "neutral"
    };
  }

  const weakMatch = livingTags.find((tag) => isThreatWeakToResponse(threat, tag) && !isThreatImmuneToResponse(threat, tag));
  if (weakMatch) {
    return {
      label: "COUNTERPLAY",
      text: formatResponseHintTag(weakMatch),
      tag: weakMatch,
      tone: "strong"
    };
  }

  const intentTags = getCurrentEnemyIntentResponseTags(battleState);
  const intentMatch = livingTags.find((tag) => intentTags.includes(tag) && !isThreatResistantToResponse(threat, tag) && !isThreatImmuneToResponse(threat, tag));
  if (intentMatch) {
    return {
      label: "COUNTERPLAY",
      text: formatResponseHintTag(intentMatch),
      tag: intentMatch,
      tone: "counter"
    };
  }

  const resistedMatch = livingTags.find((tag) => isThreatResistantToResponse(threat, tag) && !isThreatImmuneToResponse(threat, tag));
  if (resistedMatch) {
    return {
      label: "COUNTERPLAY",
      text: `${formatResponseHintTag(resistedMatch)} RESISTED`,
      tag: resistedMatch,
      tone: "caution"
    };
  }

  const immuneMatch = livingTags.find((tag) => isThreatImmuneToResponse(threat, tag));
  if (immuneMatch) {
    return {
      label: "COUNTERPLAY",
      text: `${formatResponseHintTag(immuneMatch)} INEFFECTIVE`,
      tag: immuneMatch,
      tone: "blocked"
    };
  }

  return {
    label: "COUNTERPLAY",
    text: "NO STRONG COUNTER",
    tag: "",
    tone: "neutral"
  };
}

// hasUsableMove() checks whether the active Defender can currently execute at least one move.
function hasUsableMove(defender, battleState = null) {
  const safeDefender = defender && typeof defender === "object" ? defender : null;
  const abilities = Array.isArray(safeDefender?.abilities) ? safeDefender.abilities : [];

  if (!safeDefender || !abilities.length) {
    return false;
  }

  return abilities.some((ability) => {
    const availability = typeof getMoveUseAvailability === "function"
      ? getMoveUseAvailability(ability, battleState)
      : {
          canUse: getMoveChargeCount(ability) > 0 && Number.isFinite(battleState?.responseGauge)
            ? battleState.responseGauge >= (Number.isFinite(ability?.cost) ? ability.cost : 0)
            : getMoveChargeCount(ability) > 0,
        };

    return Boolean(availability?.canUse);
  });
}

// getEnemyIntentMetadata() returns player-facing effect and counterplay text for a forecasted enemy intent.
function getEnemyIntentMetadata(intentId, battleState = null) {
  const normalizedId = String(intentId || "strike").toLowerCase();
  const catalog = {
    strike: {
      label: "STRIKE",
      description: "The threat is lining up a direct attack.",
      effectText: "Effect: Enemy deals normal damage.",
      counterplayText: "Counterplay: Attack, defend, or use support.",
      severity: "low",
      iconLabel: "DMG"
    },
    overload: {
      label: "OVERLOAD",
      description: "The threat is routing excess traffic into your command layer.",
      effectText: "Effect: Light damage + Tactical Gauge loss.",
      counterplayText: "Counterplay: Spend gauge now or prepare for reduced options.",
      severity: "medium",
      iconLabel: "GAUGE"
    },
    lockout: {
      label: "LOCKOUT",
      description: "The threat is sealing part of your command deck.",
      effectText: "Effect: A move or action may become restricted.",
      counterplayText: "Counterplay: Use important moves now or switch strategy.",
      severity: "medium",
      iconLabel: "LOCK"
    },
    corrupt: {
      label: "CORRUPT",
      description: "The threat is poisoning the system with corruption pressure.",
      effectText: "Effect: Damage and a light debuff pressure.",
      counterplayText: "Counterplay: Strike before the corruption stacks.",
      severity: "medium",
      iconLabel: "ROT"
    },
    shield: {
      label: "SHIELD",
      description: "The threat is hardening its corrupted shell.",
      effectText: "Effect: Enemy takes reduced damage next turn.",
      counterplayText: "Counterplay: Restore gauge, use support, or save high-power moves.",
      severity: "low",
      iconLabel: "ARMOR"
    },
    swarm: {
      label: "SWARM",
      description: "The threat is splitting into mirrored processes.",
      effectText: "Effect: Multiple weak hits.",
      counterplayText: "Counterplay: Clear the field fast or brace for chip damage.",
      severity: "medium",
      iconLabel: "MULTI"
    },
    trace: {
      label: "TRACE",
      description: "The threat is locking onto your signal path.",
      effectText: "Effect: Accuracy pressure and mark buildup.",
      counterplayText: "Counterplay: Burst now or raise your defenses.",
      severity: "low",
      iconLabel: "SCAN"
    },
    charge: {
      label: "CHARGE",
      description: "The threat is storing overload pressure.",
      effectText: "Effect: Next enemy attack deals increased damage.",
      counterplayText: "Counterplay: Attack now, defend, disrupt, or prepare healing.",
      severity: "medium",
      iconLabel: "UPGRADE"
    }
  };

  const fallback = catalog.strike;
  return {
    id: normalizedId,
    ...fallback,
    ...(catalog[normalizedId] || {})
  };
}

// getEnemyIntentCategory() groups intent types so the chooser can prefer a healthier attack flow.
function getEnemyIntentCategory(intentId) {
  const normalizedId = String(intentId || "strike").toLowerCase();

  if (normalizedId === "charge" || normalizedId === "trace") {
    return "setup";
  }

  if (normalizedId === "shield") {
    return "defensive";
  }

  if (normalizedId === "overload" || normalizedId === "lockout" || normalizedId === "corrupt") {
    return "disruption";
  }

  if (normalizedId === "swarm" || normalizedId === "strike") {
    return "direct";
  }

  return "direct";
}

// recordEnemyIntentHistory() keeps a short recent history so the chooser can avoid repetitive same-intent spam.
function recordEnemyIntentHistory(battleState, intentId) {
  const safeState = battleState && typeof battleState === "object" ? battleState : null;
  const normalizedId = String(intentId || "").toLowerCase();

  if (!safeState || !normalizedId) {
    return [];
  }

  if (!Array.isArray(safeState.recentEnemyIntents)) {
    safeState.recentEnemyIntents = [];
  }

  safeState.recentEnemyIntents.push(normalizedId);
  safeState.recentEnemyIntents = safeState.recentEnemyIntents.slice(-3);
  return safeState.recentEnemyIntents;
}

// getRecentEnemyIntentStreak() counts how many times the same intent has appeared in a row.
function getRecentEnemyIntentStreak(recentEnemyIntents = [], intentId = null) {
  const recent = Array.isArray(recentEnemyIntents) ? recentEnemyIntents : [];
  const target = String(intentId || recent[recent.length - 1] || "").toLowerCase();

  if (!target || !recent.length) {
    return 0;
  }

  let streak = 0;
  for (let index = recent.length - 1; index >= 0; index -= 1) {
    if (String(recent[index] || "").toLowerCase() !== target) {
      break;
    }

    streak += 1;
  }

  return streak;
}

// buildEnemyIntentCandidate() packages an intent with the ability that best represents it for the current threat.
function buildEnemyIntentCandidate(intentId, threat, abilityIndex, baseWeight) {
  const catalog = getEnemyIntentMetadata(intentId, null);
  const abilities = Array.isArray(threat?.abilities) ? threat.abilities : [];
  const selectedAbility = Number.isInteger(abilityIndex) && abilityIndex >= 0 ? abilities[abilityIndex] : null;
  const fallbackAbility = abilities.find((ability) => ability && Number.isFinite(ability.baseDamage) && ability.baseDamage > 0 && String(ability.effect || "") !== "self_level_up") || abilities[0] || null;
  const resolvedAbility = selectedAbility || fallbackAbility;

  return {
    id: catalog.id,
    type: catalog.type,
    label: catalog.label,
    description: catalog.description,
    effectText: catalog.effectText,
    counterplayText: catalog.counterplayText,
    severity: catalog.severity,
    iconLabel: catalog.iconLabel,
    abilityIndex: Number.isInteger(abilityIndex) && abilityIndex >= 0 ? abilityIndex : (abilities.indexOf(resolvedAbility) >= 0 ? abilities.indexOf(resolvedAbility) : 0),
    abilityId: resolvedAbility?.id || "",
    abilityName: resolvedAbility?.name || "",
    baseWeight: Number.isFinite(baseWeight) ? baseWeight : 1,
    threatName: threat?.title || "THREAT"
  };
}

// prepareNextEnemyIntent() refreshes the forecast so the Tactical Brief always shows the next hostile action, not a stale one.
function prepareNextEnemyIntent(battleState) {
  const safeState = battleState && typeof battleState === "object" ? battleState : null;
  if (!safeState || !safeState.threat) {
    return null;
  }

  const nextIntent = typeof chooseEnemyIntent === "function"
    ? chooseEnemyIntent(safeState.threat, safeState)
    : getEnemyIntentMetadata("strike", safeState);
  const previousIntentId = safeState.lastEnemyIntentId || safeState.resolvedEnemyIntent?.id || null;
  const repeatedIntent = Boolean(previousIntentId && nextIntent?.id && previousIntentId === nextIntent.id);

  safeState.enemyIntent = {
    ...nextIntent,
    repeated: repeatedIntent,
    refreshedAt: Date.now()
  };
  safeState.lastEnemyIntentId = safeState.enemyIntent.id;
  safeState.resolvedEnemyIntent = null;
  console.log("[Intent] prepared:", safeState.enemyIntent?.id, repeatedIntent ? "(same)" : "");
  return safeState.enemyIntent;
}

// chooseEnemyIntent() turns the current threat's loadout into a readable forecast for the next hostile action.
function chooseEnemyIntent(threat, battleState = null) {
  const abilities = Array.isArray(threat?.abilities) ? threat.abilities : [];
  const threatType = String(threat?.type || threat?.combatType || "").toLowerCase();
  const severity = String(threat?.severity || "medium").toLowerCase();
  const hasEffect = (effectName) => abilities.some((ability) => String(ability?.effect || "") === effectName);
  const indexOfEffect = (effectName) => abilities.findIndex((ability) => String(ability?.effect || "") === effectName);
  const highestDamageIndex = abilities.reduce((bestIndex, ability, index) => {
    const bestAbility = abilities[bestIndex];
    const candidateDamage = Number.isFinite(ability?.baseDamage) ? ability.baseDamage : 0;
    const bestDamage = Number.isFinite(bestAbility?.baseDamage) ? bestAbility.baseDamage : 0;
    return candidateDamage >= bestDamage ? index : bestIndex;
  }, abilities.findIndex((ability) => Number.isFinite(ability?.baseDamage) && ability.baseDamage > 0));
  const strikeIndex = abilities.findIndex((ability) => String(ability?.effect || "") !== "self_level_up" && Number.isFinite(ability?.baseDamage) && ability.baseDamage > 0);
  const fallbackIndex = abilities.findIndex((ability) => ability);
  const recentEnemyIntents = Array.isArray(battleState?.recentEnemyIntents) ? battleState.recentEnemyIntents.slice(-3) : [];
  const lastIntentId = recentEnemyIntents[recentEnemyIntents.length - 1] || null;
  const sameIntentStreak = getRecentEnemyIntentStreak(recentEnemyIntents, lastIntentId);
  const lastCategory = getEnemyIntentCategory(lastIntentId);
  const threatIntentCandidates = [];
  const pushCandidate = (candidate) => {
    if (candidate && !threatIntentCandidates.some((entry) => entry.id === candidate.id)) {
      threatIntentCandidates.push(candidate);
    }
  };

  if (hasEffect("self_level_up")) {
    pushCandidate(buildEnemyIntentCandidate(threatType === "ddos" || threatType === "botnet" ? "charge" : "shield", threat, threatType === "ddos" || threatType === "botnet" ? Math.max(0, abilities.findIndex((ability) => String(ability?.effect || "") === "self_level_up")) : abilities.findIndex((ability) => String(ability?.effect || "") === "self_level_up"), 3));
  }

  if (hasEffect("damage_all") && (threatType === "ddos" || threatType === "botnet")) {
    pushCandidate(buildEnemyIntentCandidate(severity === "high" ? "overload" : "swarm", threat, highestDamageIndex, severity === "high" ? 3 : 2));
  } else if (hasEffect("damage_all")) {
    pushCandidate(buildEnemyIntentCandidate("swarm", threat, highestDamageIndex, 2));
  }

  if (hasEffect("status_isolated")) {
    pushCandidate(buildEnemyIntentCandidate("lockout", threat, indexOfEffect("status_isolated"), 2));
  }

  if (hasEffect("status_encrypted")) {
    pushCandidate(buildEnemyIntentCandidate("corrupt", threat, indexOfEffect("status_encrypted"), 2));
  }

  if (hasEffect("status_detected")) {
    pushCandidate(buildEnemyIntentCandidate("trace", threat, indexOfEffect("status_detected"), 2));
  }

  if (strikeIndex >= 0 || !threatIntentCandidates.length) {
    pushCandidate(buildEnemyIntentCandidate("strike", threat, strikeIndex >= 0 ? strikeIndex : fallbackIndex, 1.2));
  }

  const scoredCandidates = threatIntentCandidates.map((candidate) => {
    let score = candidate.baseWeight;
    const candidateCategory = getEnemyIntentCategory(candidate.id);
    const isSameIntent = candidate.id === lastIntentId;

    if (isSameIntent) {
      score *= sameIntentStreak >= 2 ? 0.04 : 0.65;
    }

    if (sameIntentStreak >= 2 && isSameIntent) {
      score *= 0.2;
    }

    if (lastCategory === "setup" && candidateCategory === "setup") {
      score *= 0.18;
    } else if (lastCategory === "setup" && candidateCategory === "direct") {
      score *= 1.55;
    } else if (lastCategory === "setup" && candidateCategory === "disruption") {
      score *= 1.35;
    }

    if (lastCategory === "defensive" && candidateCategory === "defensive") {
      score *= 0.2;
    } else if (lastCategory === "defensive" && candidateCategory === "direct") {
      score *= 1.35;
    }

    if (lastCategory === "disruption" && candidateCategory === "setup") {
      score *= 0.7;
    } else if (lastCategory === "disruption" && candidateCategory === "direct") {
      score *= 1.15;
    }

    if (lastCategory === "direct" && candidateCategory === "direct") {
      score *= 0.9;
    }

    if (candidateCategory === "setup" && candidate.id !== lastIntentId) {
      score *= lastCategory === "direct" ? 1.2 : 1;
    }

    return {
      ...candidate,
      score
    };
  }).sort((left, right) => right.score - left.score);

  let selectedCandidate = scoredCandidates[0] && scoredCandidates[0].score > 0
    ? scoredCandidates[0]
    : buildEnemyIntentCandidate("strike", threat, strikeIndex >= 0 ? strikeIndex : fallbackIndex, 1);

  if (sameIntentStreak >= 2 && selectedCandidate.id === lastIntentId) {
    const avoidedCandidate = scoredCandidates.find((candidate) => candidate.id !== lastIntentId);
    if (avoidedCandidate) {
      selectedCandidate = avoidedCandidate;
      console.log("[Intent] avoided repeat:", avoidedCandidate.id);
    } else if (selectedCandidate.id !== "strike") {
      selectedCandidate = buildEnemyIntentCandidate("strike", threat, strikeIndex >= 0 ? strikeIndex : fallbackIndex, 1);
      console.log("[Intent] avoided repeat:", selectedCandidate.id);
    }
  }

  console.log("[Intent] recent:", recentEnemyIntents);
  console.log("[Intent] selected:", selectedCandidate.id);

  const forecastNote = battleState?.pantheonInsight ? String(battleState.pantheonInsight) : "";

  if (!abilities.length) {
    console.warn("[Combat] Enemy intent fallback to STRIKE due to missing threat abilities.", threat?.id || threat?.title || "unknown threat");
  }

  return {
    ...getEnemyIntentMetadata(selectedCandidate.id, battleState),
    abilityIndex: Number.isInteger(selectedCandidate.abilityIndex) && selectedCandidate.abilityIndex >= 0 ? selectedCandidate.abilityIndex : 0,
    abilityId: selectedCandidate.abilityId || "",
    abilityName: selectedCandidate.abilityName || "",
    threatName: threat?.title || "THREAT",
    forecastNote,
    clarified: Boolean(forecastNote)
  };
}

// getThreatLevel() scales the encounter around the current party average so the run ramps naturally.
function getThreatLevel() {
  const avgPartyLevel = Math.floor(programs.reduce((sum, program) => sum + program.level, 0) / 4);
  return Math.min(10, Math.max(1, avgPartyLevel + getRandomInt(0, 2)));
}

// buildScaledThreat() clones the source threat and adjusts its combat stats to the requested level.
function buildScaledThreat(sourceThreat, targetLevel) {
  const encounter = cloneThreatBlueprint(sourceThreat);
  const baseLevel = encounter.level || 1;
  const levelDelta = targetLevel - baseLevel;
  // HP and stat scaling stay deliberately lighter here so regular battles resolve in a few strong turns.
  const hpScale = Math.max(0.42, Math.min(1.08, 0.74 + (levelDelta * 0.09)));
  const statScale = Math.max(0.7, Math.min(1.08, 0.9 + (levelDelta * 0.04)));

  encounter.level = targetLevel;
  encounter.battleLevel = targetLevel;
  encounter.maxHp = Math.max(40, Math.round((encounter.maxHp || 100) * hpScale));
  encounter.hp = encounter.maxHp;
  encounter.atk = Math.max(1, Math.round((encounter.atk || 1) * statScale));
  encounter.def = Math.max(1, Math.round((encounter.def || 1) * statScale));
  encounter.spd = Math.max(1, Math.round((encounter.spd || 1) * Math.max(0.7, 1 + (levelDelta * 0.04))));
  encounter.statusEffects = [];
  encounter.intentTags = getThreatIntentTags(encounter);
  encounter.weakTo = getThreatResponseTagList(encounter, "weakTo");
  encounter.resists = getThreatResponseTagList(encounter, "resists");
  encounter.immuneTo = getThreatResponseTagList(encounter, "immuneTo");

  return encounter;
}

// buildTurnOrder() sorts the party and the threat by SPD so the fastest actor starts the cycle.
function buildTurnOrder(playerParty, threat) {
  return [
    ...playerParty.map((program) => ({
      kind: "program",
      ref: program
    })),
    {
      kind: "threat",
      ref: threat
    }
  ].sort((left, right) => {
    const speedDelta = (right.ref.spd || 0) - (left.ref.spd || 0);
    if (speedDelta !== 0) {
      return speedDelta;
    }

    if (left.kind === right.kind) {
      return 0;
    }

    return left.kind === "program" ? -1 : 1;
  });
}

// getTypeAdvantage() applies the four-way combat triangle used across the battle layer.
function getTypeAdvantage(attackerType, defenderType) {
  const beats = {
    defense: "offense",
    offense: "deception",
    deception: "purge",
    purge: "defense"
  };

  if (beats[attackerType] === defenderType) {
    return {
      state: "super-effective",
      multiplier: 1.5
    };
  }

  if (beats[defenderType] === attackerType) {
    return {
      state: "weak",
      multiplier: 0.5
    };
  }

  return {
    state: "neutral",
    multiplier: 1
  };
}

// calculateDamage() computes final damage based on stats, level difference, and ability scaling.
// Level difference: attacker.level - defender.level.
// Every level difference = +/-10% damage.
// Example: lvl 5 vs lvl 3 = 1.2x damage (20% bonus)
function calculateDamage(attacker, defender, ability) {
  const baseDamage = ((attacker.atk || 1) * (ability.baseDamage || 0)) / ((defender.def || 0) + 10);
  const attackerLevel = Number.isFinite(attacker?.battleLevel) ? attacker.battleLevel : (attacker.level || 1);
  const defenderLevel = Number.isFinite(defender?.battleLevel) ? defender.battleLevel : (defender.level || 1);
  const levelDiff = attackerLevel - defenderLevel;
  const levelMultiplier = 1 + (levelDiff * 0.1);
  const attackerType = getActorCombatType(attacker);
  const defenderType = getActorCombatType(defender, true);
  const typeInfo = getTypeAdvantage(attackerType, defenderType);

  let finalMultiplier = levelMultiplier * typeInfo.multiplier;

    if (hasCombatantStatus(attacker, "encrypted")) {
      finalMultiplier *= 0.8;
    }

    if (hasCombatantStatus(attacker, "isolated")) {
      finalMultiplier *= 0.5;
    }

    if (hasCombatantStatus(defender, "detected")) {
      finalMultiplier *= 1.15;
    }

  const finalDamage = Math.max(1, Math.round(baseDamage * finalMultiplier));

  return {
    damage: finalDamage,
    levelMultiplier,
    typeMultiplier: typeInfo.multiplier,
    typeState: typeInfo.state,
    isSuperEffective: typeInfo.state === "super-effective"
  };
}

function attachEquippedModulesToParty(playerParty, runState) {
  if (!Array.isArray(playerParty)) {
    return;
  }

  playerParty.forEach((program) => {
    const equippedModule = typeof getEquippedModuleForDefenderId === "function"
      ? getEquippedModuleForDefenderId(runState, program?.id)
      : null;
    program.equippedModule = equippedModule ? JSON.parse(JSON.stringify(equippedModule)) : null;
  });
}

function getPartyModuleStartGauge(playerParty) {
  if (!Array.isArray(playerParty)) {
    return 0;
  }

  return playerParty.reduce((total, program) => {
    const value = typeof getDefenderModuleStat === "function"
      ? getDefenderModuleStat(program, "startGauge")
      : 0;
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function buildModuleBattleMessages(playerParty) {
  if (!Array.isArray(playerParty)) {
    return [];
  }

  return playerParty
    .filter((program) => program?.equippedModule)
    .map((program) => {
      const module = program.equippedModule;
      return {
        status: "opening",
        label: `${program.name || "DEFENDER"} / ${module.name || "RECOVERED MODULE"}`,
        text: module.effectText || "Recovered module online."
      };
    });
}

// buildCombatState() seeds the live battle state using the clicked threat and the current party.
function buildCombatState(sourceThreat) {
  const encounterLevel = getThreatLevel();
  const threat = buildScaledThreat(sourceThreat, encounterLevel);
  const playerParty = programs;
  const turnOrder = buildTurnOrder(playerParty, threat);
  const firstProgram = turnOrder.find((entry) => entry.kind === "program" && entry.ref.hp > 0);
  const runState = typeof defenderSaveState !== "undefined" && defenderSaveState && defenderSaveState.currentRun ? defenderSaveState.currentRun : null;
  const storyState = typeof defenderSaveState !== "undefined" && defenderSaveState && defenderSaveState.story ? defenderSaveState.story : null;
  attachEquippedModulesToParty(playerParty, runState);
  const pendingQueue = Array.isArray(runState?.pendingNextBattleBoons) ? runState.pendingNextBattleBoons.slice() : [];
  const legacyGaugeBonus = Number.isFinite(runState?.nextBattleGaugeBonus) ? runState.nextBattleGaugeBonus : 0;
  const legacyChargeRestoreGaugeBonus = Number.isFinite(runState?.chargeRestoreBattleGaugeBonus) ? runState.chargeRestoreBattleGaugeBonus : 0;
  const moduleStartGaugeBonus = getPartyModuleStartGauge(playerParty);
  const legacyAccuracyBonus = Number.isFinite(runState?.nextBattleAccuracyBonus) ? runState.nextBattleAccuracyBonus : 0;
  const legacyOpeningDamageBonus = Number.isFinite(runState?.nextBattleOpeningDamageBonus) ? runState.nextBattleOpeningDamageBonus : 0;
  const legacyThreatHint = typeof runState?.nextThreatHint === "string" && runState.nextThreatHint.trim() ? runState.nextThreatHint.trim() : "";
  const queueHasGaugeBonus = pendingQueue.some((boon) => String(boon?.effectType || "") === "start_gauge_bonus_next");
  const queueHasAccuracyBonus = pendingQueue.some((boon) => String(boon?.effectType || "") === "accuracy_boost_next");
  const queueHasOpeningDamageBonus = pendingQueue.some((boon) => String(boon?.effectType || "") === "bonus_damage_next");
  const queueHasThreatHint = pendingQueue.some((boon) => String(boon?.effectType || "") === "reveal_next_weakness");
  const enemyForecastActive = queueHasThreatHint || Boolean(legacyThreatHint);
  const unlockedConcepts = typeof getUnlockedCyberConceptIds === "function" ? getUnlockedCyberConceptIds() : [];
  const learningObjective = typeof getThreatLearningObjective === "function" ? getThreatLearningObjective(threat) : "";
  const protocolGaugeBonus = (queueHasGaugeBonus ? 0 : legacyGaugeBonus) + legacyChargeRestoreGaugeBonus;
  const pendingGaugeBonus = protocolGaugeBonus + moduleStartGaugeBonus;
  const pendingAccuracyBonus = queueHasAccuracyBonus ? 0 : legacyAccuracyBonus;
  const pendingOpeningDamageBonus = queueHasOpeningDamageBonus ? 0 : legacyOpeningDamageBonus;
  const pendingThreatHint = queueHasThreatHint ? "" : legacyThreatHint;
  const activeBoons = Array.isArray(runState?.activeBoons) ? runState.activeBoons.slice() : [];
  const activeRunDamageReduction = activeBoons.reduce((total, boon) => {
    if (String(boon?.effectType || "") !== "damage_reduction_run") {
      return total;
    }

    return total + (Number.isFinite(boon?.effectValue) ? boon.effectValue : 0);
  }, 0);
  const battleBoonMessages = [];
  const activeBoonMessages = typeof buildActiveBoonMessages === "function" ? buildActiveBoonMessages(runState) : [];
  const pendingBattleEffects = {
    responseGauge: pendingGaugeBonus,
    battleAccuracyBonus: pendingAccuracyBonus,
    openingDamageBonus: pendingOpeningDamageBonus,
    pantheonInsight: pendingThreatHint
  };
  const previewBattleState = {
    threat,
    playerParty,
    turnOrder,
    responseGauge: pendingQueue.length ? pendingBattleEffects.responseGauge : pendingGaugeBonus,
    battleAccuracyBonus: pendingQueue.length ? pendingBattleEffects.battleAccuracyBonus : pendingAccuracyBonus,
    openingDamageBonus: pendingQueue.length ? pendingBattleEffects.openingDamageBonus : pendingOpeningDamageBonus,
    pantheonInsight: pendingQueue.length
      ? (pendingBattleEffects.pantheonInsight || (storyState?.lastPantheonDialogue || ""))
      : (pendingThreatHint || (storyState?.lastPantheonDialogue || "")),
    activeBoons
  };
  const enemyIntent = typeof prepareNextEnemyIntent === "function"
    ? prepareNextEnemyIntent(previewBattleState)
    : (typeof chooseEnemyIntent === "function" ? chooseEnemyIntent(threat, previewBattleState) : null);

  if (runState) {
    runState.chargeRestoreBattleGaugeBonus = 0;
    runState.nextBattleGaugeBonus = 0;
    runState.nextThreatHint = "";
    runState.nextBattleAccuracyBonus = 0;
    runState.nextBattleOpeningDamageBonus = 0;
  }

  if (typeof saveGame === "function" && (pendingGaugeBonus > 0 || pendingAccuracyBonus > 0 || pendingOpeningDamageBonus > 0 || pendingThreatHint)) {
    saveGame();
  }

  if (runState && pendingQueue.length && typeof applyPendingNextBattleBoons === "function") {
    battleBoonMessages.push(...applyPendingNextBattleBoons(runState, pendingBattleEffects));
  }

  if (protocolGaugeBonus > 0) {
    battleBoonMessages.push({
      status: "opening",
      label: "PROTOCOL GOD / STARTUP ROUTE",
      text: `Tactical Gauge +${protocolGaugeBonus}.`
    });
  }

  if (moduleStartGaugeBonus > 0) {
    battleBoonMessages.push({
      status: "opening",
      label: "RECOVERED MODULE / STARTUP CACHE",
      text: `Tactical Gauge +${moduleStartGaugeBonus}.`
    });
  }

  battleBoonMessages.push(...buildModuleBattleMessages(playerParty));

  if (pendingAccuracyBonus > 0) {
    battleBoonMessages.push({
      status: "opening",
      label: "PROTOCOL GOD / FORECAST",
      text: `Accuracy boosted by ${pendingAccuracyBonus} for this battle.`
    });
  }

  if (pendingOpeningDamageBonus > 0) {
    battleBoonMessages.push({
      status: "opening",
      label: "PROTOCOL GOD / OPENING STRIKE",
      text: `Opening strike bonus +${pendingOpeningDamageBonus}.`
    });
  }

  if (pendingThreatHint) {
    battleBoonMessages.push({
      status: "opening",
      label: "PROTOCOL GOD / THREAT HINT",
      text: pendingThreatHint
    });
  }

  return resetBattleIntroState({
    sourceThreat,
    threat,
    playerParty,
    turnOrder,
    currentTurnIndex: 0,
    activeProgramId: firstProgram ? firstProgram.ref.id : playerParty[0].id,
    responseGauge: pendingQueue.length ? pendingBattleEffects.responseGauge : pendingGaugeBonus,
    battleLog: [],
    combatFeed: [],
    battleHistory: [],
    historyDrawerOpen: false,
    cyberCodexOpen: false,
    threatAnalyzed: false,
    revealedThreatInfo: {},
    learningObjective,
    shownConceptHintsThisBattle: [],
    conceptsUnlockedThisBattle: [],
    unlockedConcepts,
    battleOutcome: null,
    victorySummary: null,
    victoryProcessed: false,
    rewardsApplied: false,
    pendingVictoryRewardLines: [],
    moduleRewardChoices: [],
    pendingModuleReward: null,
    moduleRewardStep: "",
    moduleRewardInstalled: null,
    battleMessage: "",
    battleSubmessage: "",
    visualEffect: null,
    actionLocked: false,
    commandMode: "main",
    outcome: "ongoing",
    phase: "intro",
    enemyIntent,
    nextDamageReduction: 0,
    nextCounterDamage: 0,
    encounterLevel,
    pantheonInsight: previewBattleState.pantheonInsight,
    battleAccuracyBonus: pendingQueue.length ? pendingBattleEffects.battleAccuracyBonus : pendingAccuracyBonus,
    openingDamageBonus: pendingQueue.length ? pendingBattleEffects.openingDamageBonus : pendingOpeningDamageBonus,
    openingDamageBonusConsumed: false,
    runDamageReductionPercent: activeRunDamageReduction,
    enemyForecastActive,
    recentEnemyIntents: [],
    resolvedEnemyIntent: null,
    lastEnemyIntentId: enemyIntent?.id || null,
    responsePhase: false,
    pendingEnemyAction: null,
    selectedResponse: null,
    responseResult: null,
    enemyActionQueue: [],
    enemyActionTargets: [],
    enemyResponseUsedThisTurn: false,
    recentlyHitProgramId: null,
    recentlyHitProgramIds: [],
    recentlyHitAt: 0,
    recentlyHitThreatId: null,
    recentlyHitThreatAt: 0,
    expAwarded: false,
    pantheonBoonMessages: activeBoonMessages.concat(battleBoonMessages),
    activeBoons: activeBoons
  });
}
