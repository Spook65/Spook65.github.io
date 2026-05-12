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
    nextDamageReduction: 0,
    nextCounterDamage: 0,
    encounterLevel,
    pantheonInsight: pendingQueue.length
      ? (pendingBattleEffects.pantheonInsight || (storyState?.lastPantheonDialogue || ""))
      : (pendingThreatHint || (storyState?.lastPantheonDialogue || "")),
    battleAccuracyBonus: pendingQueue.length ? pendingBattleEffects.battleAccuracyBonus : pendingAccuracyBonus,
    openingDamageBonus: pendingQueue.length ? pendingBattleEffects.openingDamageBonus : pendingOpeningDamageBonus,
    openingDamageBonusConsumed: false,
    runDamageReductionPercent: activeRunDamageReduction,
    pantheonBoonMessages: activeBoonMessages.concat(battleBoonMessages),
    activeBoons: activeBoons
  });
}
