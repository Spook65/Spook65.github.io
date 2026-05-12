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

  let intentId = "strike";
  if (hasEffect("self_level_up")) {
    intentId = threatType === "ddos" || threatType === "botnet" ? "charge" : "shield";
  } else if (hasEffect("damage_all") && (threatType === "ddos" || threatType === "botnet")) {
    intentId = severity === "high" ? "overload" : "swarm";
  } else if (hasEffect("status_isolated")) {
    intentId = "lockout";
  } else if (hasEffect("status_encrypted")) {
    intentId = "corrupt";
  } else if (hasEffect("status_detected")) {
    intentId = "trace";
  } else if (hasEffect("damage_all")) {
    intentId = "swarm";
  }

  const catalogEntry = getEnemyIntentMetadata(intentId, battleState);

  const selectedIndex = (
    intentId === "overload" || intentId === "swarm"
      ? highestDamageIndex
      : intentId === "lockout"
        ? (indexOfEffect("status_isolated") >= 0 ? indexOfEffect("status_isolated") : indexOfEffect("status_encrypted") >= 0 ? indexOfEffect("status_encrypted") : strikeIndex)
        : intentId === "corrupt"
          ? (indexOfEffect("status_encrypted") >= 0 ? indexOfEffect("status_encrypted") : indexOfEffect("status_detected") >= 0 ? indexOfEffect("status_detected") : strikeIndex)
          : intentId === "trace"
            ? (indexOfEffect("status_detected") >= 0 ? indexOfEffect("status_detected") : strikeIndex)
            : intentId === "charge" || intentId === "shield"
              ? (indexOfEffect("self_level_up") >= 0 ? indexOfEffect("self_level_up") : highestDamageIndex)
              : strikeIndex
  );

  const fallbackAbility = abilities[fallbackIndex] || abilities[0] || null;
  const selectedAbility = abilities[selectedIndex] || fallbackAbility;
  const forecastNote = battleState?.pantheonInsight ? String(battleState.pantheonInsight) : "";

  if (!abilities.length) {
    console.warn("[Combat] Enemy intent fallback to STRIKE due to missing threat abilities.", threat?.id || threat?.title || "unknown threat");
  }

  return {
    id: intentId,
    type: intentId,
    label: catalogEntry.label,
    description: catalogEntry.description,
    effectText: catalogEntry.effectText,
    counterplayText: catalogEntry.counterplayText,
    severity: catalogEntry.severity,
    iconLabel: catalogEntry.iconLabel,
    abilityIndex: Number.isInteger(selectedIndex) && selectedIndex >= 0 ? selectedIndex : (Number.isInteger(fallbackIndex) ? fallbackIndex : 0),
    abilityId: selectedAbility?.id || "",
    abilityName: selectedAbility?.name || "",
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
  encounter.maxHp = Math.max(40, Math.round((encounter.maxHp || 100) * hpScale));
  encounter.hp = encounter.maxHp;
  encounter.atk = Math.max(1, Math.round((encounter.atk || 1) * statScale));
  encounter.def = Math.max(1, Math.round((encounter.def || 1) * statScale));
  encounter.spd = Math.max(1, Math.round((encounter.spd || 1) * Math.max(0.7, 1 + (levelDelta * 0.04))));
  encounter.statusEffects = [];

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
  const levelDiff = (attacker.level || 1) - (defender.level || 1);
  const levelMultiplier = 1 + (levelDiff * 0.1);
  const attackerType = getActorCombatType(attacker);
  const defenderType = getActorCombatType(defender, true);
  const typeInfo = getTypeAdvantage(attackerType, defenderType);

  let finalMultiplier = levelMultiplier * typeInfo.multiplier;

  if (Array.isArray(attacker.statusEffects) && attacker.statusEffects.includes("encrypted")) {
    finalMultiplier *= 0.8;
  }

  if (Array.isArray(attacker.statusEffects) && attacker.statusEffects.includes("isolated")) {
    finalMultiplier *= 0.5;
  }

  if (Array.isArray(defender.statusEffects) && defender.statusEffects.includes("detected")) {
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

// buildCombatState() seeds the live battle state using the clicked threat and the current party.
function buildCombatState(sourceThreat) {
  const encounterLevel = getThreatLevel();
  const threat = buildScaledThreat(sourceThreat, encounterLevel);
  const playerParty = programs;
  const turnOrder = buildTurnOrder(playerParty, threat);
  const firstProgram = turnOrder.find((entry) => entry.kind === "program" && entry.ref.hp > 0);
  const runState = typeof defenderSaveState !== "undefined" && defenderSaveState && defenderSaveState.currentRun ? defenderSaveState.currentRun : null;
  const storyState = typeof defenderSaveState !== "undefined" && defenderSaveState && defenderSaveState.story ? defenderSaveState.story : null;
  const pendingQueue = Array.isArray(runState?.pendingNextBattleBoons) ? runState.pendingNextBattleBoons.slice() : [];
  const legacyGaugeBonus = Number.isFinite(runState?.nextBattleGaugeBonus) ? runState.nextBattleGaugeBonus : 0;
  const legacyChargeRestoreGaugeBonus = Number.isFinite(runState?.chargeRestoreBattleGaugeBonus) ? runState.chargeRestoreBattleGaugeBonus : 0;
  const legacyAccuracyBonus = Number.isFinite(runState?.nextBattleAccuracyBonus) ? runState.nextBattleAccuracyBonus : 0;
  const legacyOpeningDamageBonus = Number.isFinite(runState?.nextBattleOpeningDamageBonus) ? runState.nextBattleOpeningDamageBonus : 0;
  const legacyThreatHint = typeof runState?.nextThreatHint === "string" && runState.nextThreatHint.trim() ? runState.nextThreatHint.trim() : "";
  const queueHasGaugeBonus = pendingQueue.some((boon) => String(boon?.effectType || "") === "start_gauge_bonus_next");
  const queueHasAccuracyBonus = pendingQueue.some((boon) => String(boon?.effectType || "") === "accuracy_boost_next");
  const queueHasOpeningDamageBonus = pendingQueue.some((boon) => String(boon?.effectType || "") === "bonus_damage_next");
  const queueHasThreatHint = pendingQueue.some((boon) => String(boon?.effectType || "") === "reveal_next_weakness");
  const enemyForecastActive = queueHasThreatHint || Boolean(legacyThreatHint);
  const pendingGaugeBonus = (queueHasGaugeBonus ? 0 : legacyGaugeBonus) + legacyChargeRestoreGaugeBonus;
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

  if (pendingGaugeBonus > 0) {
    battleBoonMessages.push({
      status: "opening",
      label: "PROTOCOL GOD / STARTUP ROUTE",
      text: `Tactical Gauge +${pendingGaugeBonus}.`
    });
  }

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
    resolvedEnemyIntent: null,
    lastEnemyIntentId: enemyIntent?.id || null,
    pantheonBoonMessages: activeBoonMessages.concat(battleBoonMessages),
    activeBoons: activeBoons
  });
}
