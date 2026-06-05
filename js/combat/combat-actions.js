/* Combat action helpers own the battle loop, turn resolution, and encounter flow. */

// addBattleLog() records a short combat event so the battle history can stay readable.
function addBattleLog(message, variant = "") {
  if (!combatState) {
    return;
  }

  combatState.battleLog.push({
    message,
    variant
  });
}

// returnToGlobeFromCombat() closes the victory overlay and restores the globe for a manual next-click.
function returnToGlobeFromCombat() {
  hideEncounterTransition();
  closeCombatOverlay(true);
  screenState = "game";
  if (typeof globe !== "undefined") {
    globe.autoRotateSpeed = 0.0012;
  }
}

// continueToNextThreat() now preserves the old name as an alias for the post-battle return flow.
function continueToNextThreat() {
  returnToGlobeFromCombat();
}

// consumeMoveCharge() reduces a move's current charge total when the player attempts to use it.
function consumeMoveCharge(move) {
  if (!move || typeof move !== "object") {
    return 0;
  }

  const currentCharges = getMoveChargeCount(move);
  const nextCharges = Math.max(0, currentCharges - 1);
  setMoveCharges(move, nextCharges);
  if (!Number.isFinite(move.maxCharges)) {
    move.maxCharges = currentCharges;
  }

  return nextCharges;
}

// rollMoveAccuracy() resolves a move attempt against its accuracy stat before damage is applied.
function rollMoveAccuracy(move, accuracyBonus = 0) {
  const accuracy = Number.isFinite(move?.accuracy) ? Math.max(0, Math.min(100, move.accuracy)) : 100;
  const bonus = Number.isFinite(accuracyBonus) ? Math.max(0, accuracyBonus) : 0;
  return (Math.floor(Math.random() * 100) + 1) <= Math.min(100, accuracy + bonus);
}

// resolveEnemyIntent() turns the forecast into the exact threat ability that will be used this turn.
function resolveEnemyIntent(intentOrBattleState, battleStateMaybe) {
  const hasExplicitBattleState = Boolean(battleStateMaybe);
  const battleState = hasExplicitBattleState ? battleStateMaybe : intentOrBattleState;
  const intent = hasExplicitBattleState ? intentOrBattleState : battleState?.enemyIntent;
  const threat = battleState?.threat;
  const abilities = Array.isArray(threat?.abilities) ? threat.abilities : [];
  const safeIntent = intent && typeof intent === "object" ? intent : null;
  let ability = null;

  if (safeIntent && Number.isInteger(safeIntent.abilityIndex) && abilities[safeIntent.abilityIndex]) {
    ability = abilities[safeIntent.abilityIndex];
  }

  if (!ability && safeIntent?.abilityId) {
    ability = abilities.find((candidate) => candidate && candidate.id === safeIntent.abilityId) || null;
  }

  if (!ability) {
    ability = abilities.find((candidate) => candidate && Number.isFinite(candidate.baseDamage) && candidate.baseDamage > 0 && String(candidate.effect || "") !== "self_level_up")
      || abilities[0]
      || {
        name: "System Strike",
        cost: 0,
        baseDamage: Number.isFinite(threat?.atk) ? threat.atk : 1,
        effect: ""
      };
  }

  if (battleState && safeIntent) {
    battleState.resolvedEnemyIntent = {
      ...safeIntent,
      resolvedAt: Date.now()
    };
    console.log("[Intent] resolving:", safeIntent.id);
  }

  return {
    intent: safeIntent,
    ability
  };
}

// getRandomActiveThreat() selects the next live target from the global roster.
function getRandomActiveThreat() {
  const activeThreats = threats.filter((threat) => threat.status === "active");
  if (!activeThreats.length) {
    return null;
  }

  return activeThreats[getRandomInt(0, activeThreats.length - 1)];
}

// showCombatScreen() opens the battle overlay and advances immediately into the first turn.
function showCombatScreen(state) {
  hideEncounterTransition();
  combatState = state;
  combatEngine = new ThreatCombat(combatState);
  combatEngine.init();
}

// playBattleSummonIntro() runs the short Defender deployment sequence before battle input becomes available.
function playBattleSummonIntro(engine) {
  if (!engine || !engine.state) {
    return;
  }

  const state = engine.state;
  state.phase = "intro";
  state.actionLocked = true;
  state.battleIntroPlaying = true;
  state.battleIntroComplete = false;
  state.battleIntroStage = "operator";
  state.commandMode = "main";
  state.battleMessage = "OPERATOR READIES THE DISC.";
  state.battleSubmessage = "COMMAND GAUNTLET ARMED.";
  state.visualEffect = null;
  renderCombatScreen();

  scheduleBattleStep(engine, () => {
    if (!engine.state || engine.state.phase !== "intro") {
      return;
    }

    engine.state.battleIntroStage = "launch";
    engine.state.battleMessage = "COMMAND DISC LAUNCHED.";
    engine.state.battleSubmessage = "VECTOR TRACING THE FIELD.";
    renderCombatScreen();
  }, 280);

  scheduleBattleStep(engine, () => {
    if (!engine.state || engine.state.phase !== "intro") {
      return;
    }

    engine.state.battleIntroStage = "travel";
    engine.state.battleMessage = "DISC IN TRANSIT.";
    engine.state.battleSubmessage = "LOCKING SUMMON VECTOR.";
    renderCombatScreen();
  }, 860);

  scheduleBattleStep(engine, () => {
    if (!engine.state || engine.state.phase !== "intro") {
      return;
    }

    engine.state.battleIntroStage = "impact";
    engine.state.battleMessage = "SUMMON GATE OPENING.";
    engine.state.battleSubmessage = "LIGHT BURST STABILIZING.";
    renderCombatScreen();
  }, 1180);

  scheduleBattleStep(engine, () => {
    if (!engine.state || engine.state.phase !== "intro") {
      return;
    }

    engine.state.battleIntroStage = "materialize";
    engine.state.battleMessage = "DEFENDER MATERIALIZING.";
    engine.state.battleSubmessage = "BATTLE SYSTEMS ONLINE.";
    renderCombatScreen();
  }, 1520);

  scheduleBattleStep(engine, () => {
    completeBattleSummonIntro(engine);
  }, 2140);
}

// completeBattleSummonIntro() clears the intro lock and hands control back to the normal battle turn loop.
function completeBattleSummonIntro(engine) {
  if (!engine || !engine.state || engine.state.phase !== "intro") {
    return;
  }

  engine.state.battleIntroStage = "complete";
  engine.state.battleIntroPlaying = false;
  engine.state.battleIntroComplete = true;
  engine.state.phase = "battle";
  engine.state.actionLocked = false;
  engine.state.battleMessage = "";
  engine.state.battleSubmessage = "";
  engine.state.visualEffect = null;
  renderCombatScreen();
  engine.resolveCurrentTurn();
}

// focusActiveDefenderTurn() restores Tactical Gauge when possible and ends the active Defender's turn.
function focusActiveDefenderTurn(engine) {
  if (!engine || !engine.state || engine.state.phase !== "battle") {
    return;
  }

  const state = engine.state;
  const currentActor = typeof engine.getCurrentActor === "function" ? engine.getCurrentActor() : state.turnOrder[state.currentTurnIndex];

  if (!currentActor || currentActor.kind !== "program" || currentActor.ref.hp <= 0 || state.actionLocked) {
    return;
  }

  const actor = currentActor.ref;
  const currentGauge = Number.isFinite(state.responseGauge) ? Math.max(0, Math.min(100, state.responseGauge)) : 0;
  const gaugeRecovery = typeof getFocusGaugeRecoveryAmount === "function" ? getFocusGaugeRecoveryAmount(actor) : 25;
  const nextGauge = currentGauge < 100 ? Math.min(100, currentGauge + gaugeRecovery) : currentGauge;
  const gaugeGain = nextGauge - currentGauge;
  const isFlooded = typeof hasFloodStatus === "function" ? hasFloodStatus(actor) : false;

  state.actionLocked = true;
  state.commandMode = "main";

  if (gaugeGain > 0) {
    state.responseGauge = nextGauge;
    state.battleMessage = isFlooded
      ? `${actor.name.toUpperCase()} FOCUSES THROUGH FLOOD.`
      : `${actor.name.toUpperCase()} FOCUSES AND RECHARGES THE RESPONSE GATE.`;
    state.battleSubmessage = `TACTICAL GAUGE +${gaugeGain}.`;
    addBattleLog(`${actor.name.toUpperCase()} FOCUSED. RESPONSE GAUGE +${gaugeGain}.`, "buff");
  } else {
    state.responseGauge = currentGauge;
    state.battleMessage = `${actor.name.toUpperCase()} HOLDS POSITION.`;
    state.battleSubmessage = "RESPONSE GATE IS ALREADY FULL.";
    addBattleLog(`${actor.name.toUpperCase()} HELD POSITION. RESPONSE GATE WAS ALREADY FULL.`, "buff");
  }

  renderCombatScreen();

  scheduleBattleStep(engine, () => {
    if (!engine.state || engine.state.phase !== "battle") {
      return;
    }

    engine.finishActedTurn(currentActor);
  }, 340);
}

// showCombatReward() keeps the overlay open after victory until the player chooses what comes next.
function showCombatReward(rewardLines) {
  if (!combatState) {
    return;
  }

  combatState.phase = "reward";
  renderCombatReward(rewardLines);
}

// showCombatDefeatScreen() handles the defeat branch without colliding with the boot screen game-over UI.
function showCombatDefeatScreen(outcome) {
  if (outcome !== "lose") {
    return;
  }

  if (combatState) {
    combatState.phase = "defeat";
  }

  renderBattleLostScreen();
}

// hideEncounterTransition() clears the short cinematic overlay so a battle can take over cleanly.
function hideEncounterTransition() {
  if (encounterTransitionTimerId !== null) {
    window.clearTimeout(encounterTransitionTimerId);
    encounterTransitionTimerId = null;
  }

  encounterTransitionActive = false;

  if (encounterOverlay) {
    encounterOverlay.classList.remove("is-visible");
    encounterOverlay.setAttribute("aria-hidden", "true");
  }
}

// showEncounterTransition() gives the click a short cinematic beat before the combat screen appears.
function showEncounterTransition(threat) {
  if (!threat || threat.status !== "active" || combatState || encounterTransitionActive) {
    return;
  }

  closeCombatOverlay(true);
  hideEncounterTransition();
  encounterTransitionActive = true;

  if (encounterOverlay) {
    encounterOverlay.setAttribute("aria-hidden", "false");
    encounterOverlay.classList.add("is-visible");
  }

  encounterTransitionTimerId = window.setTimeout(() => {
    encounterTransitionTimerId = null;
    if (!encounterTransitionActive) {
      return;
    }

    encounterTransitionActive = false;
    if (encounterOverlay) {
      encounterOverlay.classList.remove("is-visible");
      encounterOverlay.setAttribute("aria-hidden", "true");
    }

    if (screenState !== "game" || combatState || threat.status !== "active") {
      return;
    }

    showCombatScreen(buildCombatState(threat));
  }, 1000);
}

// closeCombatOverlay() clears the overlay state when a battle ends or the player returns to the menu.
function closeCombatOverlay(forceClose = false) {
  if (combatEngine && !forceClose && combatState && combatState.phase === "battle") {
    return;
  }

  hideEncounterTransition();

  if (combatEngine) {
    combatEngine.destroy();
  }

  combatEngine = null;
  combatState = null;

  threatPanel.classList.remove("is-open", "is-combat");
  threatPanel.setAttribute("aria-hidden", "true");

  window.setTimeout(() => {
    if (!threatPanel.classList.contains("is-open")) {
      threatPanelContent.innerHTML = "";
    }
  }, 180);
}

// awardBattleRewards() applies the roguelike XP loop and returns the summary text for the victory screen.
function awardBattleRewards(defeatedThreat) {
  const baseXP = 50 * defeatedThreat.level;
  const rewardLines = [];

  programs.forEach((program) => {
    const gainedXP = baseXP;
    program.xp += gainedXP;

    let levelUpCount = 0;

    while (program.level < 10 && program.xp >= (program.level * 100)) {
      program.xp -= (program.level * 100);
      program.level = Math.min(10, program.level + 1);
      program.atk += 1;
      program.def += 1;
      program.maxHp += 15;
      program.hp = program.maxHp;
      levelUpCount += 1;
    }

    rewardLines.push({
      levelUp: levelUpCount > 0,
      text: levelUpCount > 0
        ? `${program.name} gained ${gainedXP} XP! NOW LEVEL ${program.level} | MAX HP +15 | ATK +1 | DEF +1`
        : `${program.name} gained ${gainedXP} XP. CURRENT LEVEL ${program.level}.`
    });
  });

  updateScoreDisplay();
  return rewardLines;
}

// ThreatCombat owns the battle loop, auto-turns, and battle resolution for the current encounter.
class ThreatCombat {
  constructor(state) {
    this.state = state;
    this.turnTimeoutId = null;
    this.animationTimeoutIds = [];
  }

  init() {
    this.state.turnOrder = buildTurnOrder(this.state.playerParty, this.state.threat);
    this.state.currentTurnIndex = 0;
    this.state.activeProgramId = this.state.turnOrder.find((entry) => entry.kind === "program" && entry.ref.hp > 0)?.ref.id || this.state.activeProgramId;
    this.state.commandMode = "main";
    this.state.battleMessage = "";
    this.state.battleSubmessage = "";
    this.state.visualEffect = null;
    this.state.actionLocked = true;
    screenState = "combat";
    addBattleLog(`ENGAGING ${this.state.threat.title.toUpperCase()} AT LEVEL ${this.state.threat.level}.`);
    renderCombatScreen();
    playBattleSummonIntro(this);
  }

  destroy() {
    if (this.turnTimeoutId !== null) {
      window.clearTimeout(this.turnTimeoutId);
      this.turnTimeoutId = null;
    }

    this.animationTimeoutIds.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    this.animationTimeoutIds = [];
  }

  getCurrentActor() {
    return this.state.turnOrder[this.state.currentTurnIndex];
  }

  clearBattleVisual() {
    clearBattleVisual(this.state);
  }

  setBattleCue(message, submessage = "", visualEffect = null) {
    setBattleCue(this.state, message, submessage, visualEffect);
  }

  buildVisualEffect(actorEntry, targetEntry, ability, damageResult, phase) {
    return buildVisualEffect(this.state, actorEntry, targetEntry, ability, damageResult, phase);
  }

  getFallbackThreatAbility(threat) {
    const abilities = Array.isArray(threat?.abilities) ? threat.abilities : [];
    return abilities.find((candidate) => candidate && Number.isFinite(candidate.baseDamage) && candidate.baseDamage > 0 && String(candidate.effect || "") !== "self_level_up")
      || abilities[0]
      || {
        name: "System Strike",
        cost: 0,
        baseDamage: Number.isFinite(threat?.atk) ? threat.atk : 1,
        effect: ""
      };
  }

  getThreatBehaviorProfile(threat) {
    return threat && typeof threat.behaviorProfile === "object" ? threat.behaviorProfile : {};
  }

  getEnemyActionCount(threat) {
    const profile = this.getThreatBehaviorProfile(threat);
    const rawCount = Number.isFinite(profile.actionsPerTurn)
      ? profile.actionsPerTurn
      : Number.isFinite(threat?.actionsPerTurn)
        ? threat.actionsPerTurn
        : Number.isFinite(threat?.maxActions)
          ? threat.maxActions
          : 1;

    return Math.max(1, Math.min(2, Math.round(rawCount)));
  }

  getThreatTargetPattern(threat, action = null) {
    const profile = this.getThreatBehaviorProfile(threat);
    return String(action?.targetPattern || profile.targetPattern || threat?.targetPattern || "randomLiving");
  }

  getThreatActionWeight(threat) {
    const profile = this.getThreatBehaviorProfile(threat);
    return String(profile.actionWeight || threat?.actionWeight || "normal").toLowerCase();
  }

  getBasicThreatAbility(threat, majorAbility = null) {
    const abilities = Array.isArray(threat?.abilities) ? threat.abilities : [];
    return abilities.find((candidate) => candidate && candidate !== majorAbility && Number.isFinite(candidate.baseDamage) && candidate.baseDamage > 0 && String(candidate.effect || "") !== "damage_all")
      || abilities.find((candidate) => candidate && candidate !== majorAbility && Number.isFinite(candidate.baseDamage) && candidate.baseDamage > 0)
      || this.getFallbackThreatAbility(threat);
  }

  getThreatActionIntentTags(action = null) {
    const intent = action?.resolvedEnemyIntent?.intent || null;
    return normalizeResponseTagList([
      action?.threatLevel,
      action?.payloadType,
      action?.ability?.threatLevel,
      action?.ability?.payloadType,
      ...(Array.isArray(action?.ability?.intentTags) ? action.ability.intentTags : []),
      intent?.id,
      intent?.type,
      intent?.severity,
      intent?.iconLabel,
      ...(Array.isArray(intent?.intentTags) ? intent.intentTags : [])
    ]);
  }

  shouldThreatActionTriggerResponse(action = null) {
    if (!action) {
      return false;
    }

    if (action.requiresResponse === true || action.ability?.requiresResponse === true) {
      return true;
    }

    const threatLevel = String(action.threatLevel || action.ability?.threatLevel || "").toLowerCase();
    if (threatLevel === "major") {
      return true;
    }

    return action.telegraphed === true || action.ability?.telegraphed === true;
  }

  buildEnemyActionQueue(actorEntry) {
    const actor = actorEntry?.ref;
    if (!actor || actor.hp <= 0) {
      return [];
    }

    const resolvedEnemyIntent = typeof resolveEnemyIntent === "function"
      ? resolveEnemyIntent(this.state)
      : null;
    const majorAbility = resolvedEnemyIntent?.ability || this.getFallbackThreatAbility(actor);
    const actionCount = this.getEnemyActionCount(actor);
    const actionWeight = this.getThreatActionWeight(actor);
    const baseTargetPattern = this.getThreatTargetPattern(actor);
    const majorAction = {
      id: "major",
      kind: "major",
      ability: majorAbility,
      resolvedEnemyIntent,
      damageMultiplier: actionCount > 1 ? 0.95 : 1,
      targetPattern: majorAbility?.targetPattern || baseTargetPattern,
      threatLevel: majorAbility?.threatLevel || resolvedEnemyIntent?.intent?.threatLevel || "",
      payloadType: majorAbility?.payloadType || resolvedEnemyIntent?.intent?.type || "",
      telegraphed: majorAbility?.telegraphed === true || resolvedEnemyIntent?.intent?.telegraphed === true
    };
    majorAction.requiresResponse = this.shouldThreatActionTriggerResponse(majorAction);
    const basicAbility = this.getBasicThreatAbility(actor, majorAbility);

    const actionQueue = actionCount <= 1
      ? [majorAction]
      : [
          {
            id: "basic",
            kind: "basic",
            ability: basicAbility,
            resolvedEnemyIntent: null,
            damageMultiplier: 0.85,
            targetPattern: basicAbility?.targetPattern || baseTargetPattern,
            threatLevel: "minor",
            requiresResponse: false,
            telegraphed: false
          },
          majorAction
        ];

    const indexedQueue = actionQueue.map((queueAction, index) => ({
      ...queueAction,
      index: index + 1,
      total: actionQueue.length
    }));

    console.log("[ENEMY TURN]", actor.title || actor.name || actor.id || "Threat", {
      actionsPerTurn: indexedQueue.length,
      configuredActions: actionCount,
      targetPattern: baseTargetPattern,
      actionWeight
    });
    console.log("[ENEMY ACTION QUEUE]", indexedQueue.map((queueAction) => ({
      index: queueAction.index,
      total: queueAction.total,
      type: queueAction.kind,
      ability: queueAction.ability?.name || "Unknown",
      requiresResponse: Boolean(queueAction.requiresResponse),
      damageMultiplier: queueAction.damageMultiplier,
      threatLevel: queueAction.threatLevel || "none"
    })));

    return indexedQueue;
  }

  getLivingEnemyTargets() {
    return programs.filter((program) => program && program.hp > 0);
  }

  selectEnemyActionTarget(action = null, previousTargets = []) {
    const livingPrograms = this.getLivingEnemyTargets();
    if (!livingPrograms.length) {
      return null;
    }

    const pattern = String(action?.targetPattern || "randomLiving").toLowerCase();
    const activeTarget = livingPrograms.find((program) => program.id === this.state.activeProgramId) || livingPrograms[0];

    if (pattern === "active") {
      return activeTarget;
    }

    if (pattern === "lowesthp") {
      return livingPrograms.slice().sort((left, right) => {
        const leftPercent = (left.hp || 0) / Math.max(1, left.maxHp || left.hp || 1);
        const rightPercent = (right.hp || 0) / Math.max(1, right.maxHp || right.hp || 1);
        return leftPercent - rightPercent;
      })[0];
    }

    if (pattern === "differentifpossible") {
      const previousTargetIds = previousTargets.map((target) => target?.id).filter(Boolean);
      const availableTargets = livingPrograms.filter((program) => !previousTargetIds.includes(program.id));
      if (availableTargets.length) {
        return availableTargets[getRandomInt(0, availableTargets.length - 1)];
      }
    }

    return livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
  }

  buildEnemyResponseResult(evaluation) {
    const safeEvaluation = evaluation && typeof evaluation === "object" ? evaluation : null;
    if (!safeEvaluation) {
      return {
        id: "none",
        name: "RESPONSE",
        status: "NORMAL",
        damageReduction: 0,
        gaugeGain: 0,
        message: "NO DEFENSIVE RESPONSE SELECTED.",
        submessage: "INCOMING PAYLOAD LANDS WITHOUT MITIGATION.",
        logMessage: "NO DEFENSIVE RESPONSE SELECTED. PAYLOAD LANDED WITHOUT MITIGATION.",
        variant: "damage"
      };
    }

    const gaugeText = safeEvaluation.gaugeGain > 0 ? ` Tactical Gauge restored +${safeEvaluation.gaugeGain}.` : "";
    const reducedText = safeEvaluation.damageReduction > 0 ? " Incoming damage reduced." : "";
    const responseCopy = {
      isolate: {
        normal: `ISOLATE contained part of the payload.${reducedText}`,
        resisted: `Response resisted. ISOLATE applied only minor mitigation.${reducedText}`,
        ineffective: "Response ineffective. Threat ignored this countermeasure.",
        recommended: `ISOLATE contained the payload.${reducedText}`,
        empowered: `ISOLATE contained the payload.${reducedText}`
      },
      countertrace: {
        normal: `COUNTERTRACE mapped part of the route.${reducedText}${gaugeText}`,
        resisted: `Response resisted. COUNTERTRACE recovered only a partial route.${reducedText}${gaugeText}`,
        ineffective: "Response ineffective. Threat kept the route hidden.",
        recommended: `COUNTERTRACE mapped the route.${reducedText}${gaugeText}`,
        empowered: `COUNTERTRACE mapped the route.${reducedText}${gaugeText}`
      },
      redirect: {
        normal: `REDIRECT diverted part of the incoming payload.${reducedText}`,
        resisted: `Response resisted. REDIRECT applied only minor mitigation.${reducedText}`,
        ineffective: "REDIRECT failed. Target ignored decoy routing.",
        recommended: `REDIRECT diverted the incoming payload.${reducedText}`,
        empowered: `REDIRECT diverted the incoming payload.${reducedText}`
      },
      purge: {
        normal: `PURGE cleaned hostile residue.${reducedText}`,
        resisted: `Response resisted. PURGE applied only minor mitigation.${reducedText}`,
        ineffective: "Response ineffective. Hostile residue remained active.",
        recommended: `PURGE cleaned hostile residue. Incoming effect reduced.`,
        empowered: `PURGE cleaned hostile residue. Incoming effect reduced.`
      }
    };
    const copyKey = safeEvaluation.status === "INEFFECTIVE"
      ? "ineffective"
      : safeEvaluation.status === "RESISTED"
        ? "resisted"
        : safeEvaluation.status === "RECOMMENDED"
          ? "recommended"
          : safeEvaluation.status === "EMPOWERED"
            ? "empowered"
            : "normal";
    const message = responseCopy[safeEvaluation.id]?.[copyKey]
      || (safeEvaluation.damageReduction > 0 ? "Incoming payload partially mitigated." : "No strong counter. Payload continues.");

    return {
      ...safeEvaluation,
      message,
      submessage: safeEvaluation.status === "INEFFECTIVE"
        ? "RESPONSE INEFFECTIVE - NO MITIGATION APPLIED."
        : `INCOMING DAMAGE MITIGATED ${Math.round(safeEvaluation.damageReduction * 100)}%${safeEvaluation.gaugeGain > 0 ? ` / GAUGE +${safeEvaluation.gaugeGain}` : ""}.`,
      logMessage: message.toUpperCase(),
      variant: safeEvaluation.status === "INEFFECTIVE" ? "damage" : "buff"
    };
  }

  getEnemyResponseEffectivenessLabel(responseResult) {
    const status = String(responseResult?.status || "").toUpperCase();
    if (status === "RECOMMENDED") {
      return "STRONG COUNTER";
    }
    if (status === "EMPOWERED") {
      return "EMPOWERED";
    }
    if (status === "RESISTED") {
      return "RESISTED";
    }
    if (status === "INEFFECTIVE") {
      return "INEFFECTIVE";
    }
    return "PARTIAL";
  }

  previewThreatDamage(attacker, defender, ability, options = {}) {
    const damageResult = this.calculateDamage(attacker, defender, ability);
    let damage = damageResult.damage;
    const bonusDamage = Number.isFinite(options.bonusDamage) ? Math.max(0, options.bonusDamage) : 0;

    if (bonusDamage > 0) {
      damage += bonusDamage;
    }

    if (options.isThreatAttack && this.state.nextDamageReduction > 0) {
      damage = Math.max(1, Math.round(damage * (1 - this.state.nextDamageReduction)));
    }

    if (options.isThreatAttack && Number.isFinite(this.state.runDamageReductionPercent) && this.state.runDamageReductionPercent > 0) {
      const reduction = Math.min(0.5, Math.max(0, this.state.runDamageReductionPercent / 100));
      damage = Math.max(1, Math.round(damage * (1 - reduction)));
    }

    if (defender === this.state.threat && hasCombatantStatus(defender, "isolated")) {
      damage = Math.max(1, Math.round(damage * 1.1));
    }

    if (options.multiplier) {
      damage = Math.max(1, Math.round(damage * options.multiplier));
    }

    return {
      ...damageResult,
      damage
    };
  }

  buildEnemyResponseOutcome(responseResult, incomingDamage, finalDamage) {
    const safeResult = responseResult && typeof responseResult === "object" ? responseResult : null;
    const responseName = String(safeResult?.name || "RESPONSE").toUpperCase();
    const effectiveness = this.getEnemyResponseEffectivenessLabel(safeResult);
    const safeIncomingDamage = Number.isFinite(incomingDamage) ? Math.max(0, incomingDamage) : 0;
    const safeFinalDamage = Number.isFinite(finalDamage) ? Math.max(0, finalDamage) : 0;
    const reducedBy = Math.max(0, safeIncomingDamage - safeFinalDamage);
    const gaugeGain = Number.isFinite(safeResult?.gaugeGain) ? Math.max(0, safeResult.gaugeGain) : 0;
    const gaugeText = gaugeGain > 0 ? ` Tactical Gauge +${gaugeGain}.` : "";

    let message = "";
    if (!safeResult) {
      message = `Mitigation applied. Damage reduced from ${safeIncomingDamage} to ${safeFinalDamage}.`;
    } else if (safeResult.status === "INEFFECTIVE") {
      message = `${responseName} failed. Threat ignored this countermeasure.`;
    } else if (safeResult.status === "RESISTED") {
      message = `${responseName} was resisted. Damage only reduced from ${safeIncomingDamage} to ${safeFinalDamage}.${gaugeText}`;
    } else if (safeResult.id === "countertrace") {
      message = `${responseName} mapped the route. Damage reduced from ${safeIncomingDamage} to ${safeFinalDamage}.${gaugeText}`;
    } else if (safeResult.id === "isolate" && safeResult.status === "RECOMMENDED") {
      message = `${responseName} contained the payload. Damage reduced from ${safeIncomingDamage} to ${safeFinalDamage}.`;
    } else if (safeResult.id === "isolate") {
      message = `${responseName} partially contained the payload. Damage reduced from ${safeIncomingDamage} to ${safeFinalDamage}.`;
    } else if (safeResult.id === "redirect") {
      message = `${responseName} diverted part of the payload. Damage reduced from ${safeIncomingDamage} to ${safeFinalDamage}.`;
    } else if (safeResult.id === "purge") {
      message = `${responseName} cleaned hostile residue. Damage reduced from ${safeIncomingDamage} to ${safeFinalDamage}.`;
    } else {
      message = `Mitigation applied. Damage reduced from ${safeIncomingDamage} to ${safeFinalDamage}.${gaugeText}`;
    }

    return {
      responseId: safeResult?.id || "none",
      label: responseName,
      effectiveness,
      incomingDamage: safeIncomingDamage,
      finalDamage: safeFinalDamage,
      reducedBy,
      gaugeGain,
      message,
      submessage: `DEFEND RESULT / ${responseName} - ${effectiveness} / DAMAGE ${safeIncomingDamage} -> ${safeFinalDamage}${gaugeGain > 0 ? ` / GAUGE +${gaugeGain}` : ""}`
    };
  }

  clearEnemyResponseState() {
    this.state.responsePhase = false;
    this.state.pendingEnemyAction = null;
    this.state.selectedResponse = null;
    this.state.responseResult = null;
    if (this.state.commandMode === "response") {
      this.state.commandMode = "main";
    }
  }

  enterEnemyResponsePhase(actorEntry, queuedAction = null) {
    const actor = actorEntry?.ref;
    if (!actor || actor.hp <= 0) {
      return;
    }

    const resolvedEnemyIntent = queuedAction?.resolvedEnemyIntent || (typeof resolveEnemyIntent === "function"
      ? resolveEnemyIntent(this.state)
      : null);
    const threatAbility = queuedAction?.ability || resolvedEnemyIntent?.ability || this.getFallbackThreatAbility(actor);
    if (resolvedEnemyIntent?.intent) {
      this.state.enemyIntent = resolvedEnemyIntent.intent;
    }

    this.state.responsePhase = true;
    this.state.enemyResponseUsedThisTurn = true;
    this.state.pendingEnemyAction = {
      actorId: actor.id || actor.title || "threat",
      ability: threatAbility,
      resolvedEnemyIntent,
      queuedAction: {
        ...(queuedAction || {}),
        ability: threatAbility,
        resolvedEnemyIntent
      }
    };
    this.state.selectedResponse = null;
    this.state.responseResult = null;
    this.state.actionLocked = false;
    this.state.commandMode = "response";
    this.state.battleMessage = "DEFEND PHASE.";
    this.state.battleSubmessage = "ENEMY PAYLOAD INCOMING. CHOOSE ONE RESPONSE BEFORE IMPACT.";
    this.state.visualEffect = null;
    const actionIndex = Number.isFinite(queuedAction?.index) ? queuedAction.index : 1;
    const actionTotal = Number.isFinite(queuedAction?.total) ? queuedAction.total : 1;
    console.log("[DEFEND PHASE]", actor.title || actor.name || actor.id || "Threat", {
      action: `${actionIndex}/${actionTotal}`,
      ability: threatAbility?.name || "Unknown",
      requiresResponse: Boolean(queuedAction?.requiresResponse),
      threatLevel: queuedAction?.threatLevel || threatAbility?.threatLevel || "none",
      queueContinuesAfterResponse: Array.isArray(this.state.enemyActionQueue) && this.state.enemyActionQueue.length > 0
    });
    addBattleLog(`ENEMY ACTION ${actionIndex}/${actionTotal}: MAJOR PAYLOAD DETECTED. CHOOSE A DEFENSIVE RESPONSE.`, "buff");
    renderCombatScreen();
  }

  resolveEnemyResponse(responseId) {
    if (!this.state || this.state.phase !== "battle" || !this.state.responsePhase) {
      return;
    }

    const currentActor = this.getCurrentActor();
    if (!currentActor || currentActor.kind !== "threat" || currentActor.ref.hp <= 0) {
      return;
    }

    const evaluation = typeof getEnemyResponseEvaluation === "function"
      ? getEnemyResponseEvaluation(this.state, responseId)
      : null;
    const responseResult = this.buildEnemyResponseResult(evaluation);

    this.state.responsePhase = false;
    this.state.actionLocked = true;
    this.state.commandMode = "main";
    this.state.selectedResponse = responseResult.id;
    this.state.responseResult = responseResult;

    if (responseResult.gaugeGain > 0) {
      this.state.responseGauge = Math.min(100, Math.max(0, this.state.responseGauge + responseResult.gaugeGain));
    }

    this.setBattleCue(responseResult.message, responseResult.submessage);
    renderCombatScreen();

    scheduleBattleStep(this, () => {
      if (!this.state || this.state.phase !== "battle") {
        return;
      }

      this.takeTurn(currentActor, this.state.pendingEnemyAction?.ability || null);
    }, 360);
  }

  resolveCurrentTurn() {
    if (this.state.phase !== "battle") {
      return;
    }

    const currentActor = this.getCurrentActor();

    if (!currentActor) {
      return;
    }

    if (currentActor.kind === "threat") {
      this.state.enemyActionQueue = this.buildEnemyActionQueue(currentActor);
      this.state.enemyActionTargets = [];
      this.state.enemyResponseUsedThisTurn = false;
      this.state.pendingEnemyAction = null;
      this.state.selectedResponse = null;
      this.state.responseResult = null;
      this.takeTurn(currentActor, null);
      return;
    }

    this.state.battleMessage = "";
    this.state.battleSubmessage = "";
    this.state.visualEffect = null;
    renderCombatScreen();
  }

  advanceTurn() {
    if (this.state.phase !== "battle") {
      return;
    }

    const totalActors = this.state.turnOrder.length;
    let safety = 0;

    do {
      this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % totalActors;
      safety += 1;
      const nextActor = this.getCurrentActor();

      if (!nextActor) {
        break;
      }

      if (nextActor.kind === "program" && nextActor.ref.hp > 0) {
        this.state.activeProgramId = nextActor.ref.id;
        this.state.commandMode = "main";
        if (typeof prepareNextEnemyIntent === "function") {
          prepareNextEnemyIntent(this.state);
        } else if (typeof chooseEnemyIntent === "function") {
          this.state.enemyIntent = chooseEnemyIntent(this.state.threat, this.state);
        }
        break;
      }

      if (nextActor.kind === "threat" && nextActor.ref.hp > 0) {
        break;
      }
    } while (safety <= totalActors + 1);

    this.state.battleMessage = "";
    this.state.battleSubmessage = "";
    this.state.visualEffect = null;
    renderCombatScreen();
    this.resolveCurrentTurn();
  }

  applyTypeAdvantage(attackerType, defenderType) {
    return getTypeAdvantage(attackerType, defenderType);
  }

  calculateDamage(attacker, defender, ability) {
    return calculateDamage(attacker, defender, ability);
  }

  applyStatusEffect(target, effect) {
    if (!target) {
      return;
    }

    if (effect === "status_detected") {
      applyStatusEffect(target, "detected");
      return;
    }

    if (effect === "status_isolated") {
      applyStatusEffect(target, "isolated");
      return;
    }

    if (effect === "status_encrypted") {
      applyStatusEffect(target, "encrypted");
      return;
    }

    applyStatusEffect(target, effect);
  }

  clearStatusEffects(target) {
    if (!target) {
      return;
    }

    target.statusEffects = [];
  }

  applyPlayerEffect(actor, ability, damageResult) {
    if (ability.effect === "reduce_next_damage") {
      this.state.nextDamageReduction = 0.5;
      addBattleLog(`${actor.name.toUpperCase()} BRACED THE NETWORK. NEXT INCOMING DAMAGE HALVED.`, "buff");
      return;
    }

    if (ability.effect === "boost_def") {
      actor.def += 2;
      addBattleLog(`${actor.name.toUpperCase()} HARDENED PORTS. DEFENSE +2.`, "buff");
      return;
    }

    if (ability.effect === "shared_ability") {
      this.state.responseGauge = Math.min(100, this.state.responseGauge + 5);
      addBattleLog(`${actor.name.toUpperCase()} SHARED BANDWIDTH ACROSS THE PARTY. GAUGE +5.`, "buff");
      return;
    }

    if (ability.effect === "status_detected") {
      this.applyStatusEffect(this.state.threat, "status_detected");
      addBattleLog(`${this.state.threat.title.toUpperCase()} WAS TAGGED [DETECTED].`, "buff");
      return;
    }

    if (ability.effect === "status_isolated") {
      this.applyStatusEffect(this.state.threat, "status_isolated");
      addBattleLog(`${this.state.threat.title.toUpperCase()} WAS TAGGED [ISOLATED].`, "buff");
      return;
    }

    if (ability.effect === "cleanse") {
      programs.forEach((program) => {
        this.clearStatusEffects(program);
      });
      this.clearStatusEffects(this.state.threat);
      addBattleLog(`${actor.name.toUpperCase()} CLEARED PARTY AND THREAT STATUS EFFECTS.`, "buff");
      return;
    }

    if (ability.effect === "combo_sync_defense") {
      this.state.nextDamageReduction = 0.5;
      this.state.nextCounterDamage = 15;
      addBattleLog(`SYNCHRONIZED DEFENSE ONLINE. NEXT HIT REDUCED BY 50% AND COUNTER DAMAGE ARMED.`, "buff");
      return;
    }

    if (ability.effect === "combo_containment") {
      this.clearStatusEffects(this.state.threat);
      programs.forEach((program) => this.clearStatusEffects(program));
      addBattleLog(`CONTAINMENT PROTOCOL ENGAGED. STATUS EFFECTS CLEARED.`, "buff");
    }
  }

  applyThreatEffect(threat, ability, targetOverride = null) {
    if (ability.effect === "self_level_up") {
      addBattleLog(`${threat.title.toUpperCase()} TRIED TO ESCALATE, BUT THE BATTLE LEVEL IS LOCKED.`, "buff");
      return;
    }

    if (ability.effect === "damage_all" && String(this.state?.resolvedEnemyIntent?.intent?.id || this.state?.enemyIntent?.id || "").toLowerCase() === "overload") {
      const livingPrograms = programs.filter((program) => program.hp > 0);
      if (livingPrograms.length) {
        const target = targetOverride && targetOverride.hp > 0 ? targetOverride : livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
        this.applyStatusEffect(target, {
          id: "flood",
          label: "FLOOD",
          type: "gauge_disruption",
          duration: 3,
          potency: 10,
          sourceId: threat.id || null,
          description: "Flooded command traffic reduces Tactical Gauge recovery."
        });
        addBattleLog(`${target.name.toUpperCase()} IS FLOODED BY HOSTILE TRAFFIC.`, "damage");
        addBattleLog(`FOCUS RESTORES LESS TACTICAL GAUGE WHILE FLOOD LASTS.`, "damage");
      }
      return;
    }

    if (ability.effect === "status_encrypted") {
      const livingPrograms = programs.filter((program) => program.hp > 0);
      const target = targetOverride && targetOverride.hp > 0 ? targetOverride : livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
      this.applyStatusEffect(target, {
        id: "rot",
        label: "ROT",
        type: "damage_over_time",
        duration: 3,
        potency: 4,
        sourceId: threat.id || null,
        description: "Corruption deals damage at the end of the affected unit's turn."
      });
      addBattleLog(`${target.name.toUpperCase()} IS INFECTED WITH ROT.`, "damage");
      addBattleLog(`CORRUPTION WILL DAMAGE ${target.name.toUpperCase()} AT THE END OF ITS TURNS.`, "damage");
      return;
    }

    if (ability.effect === "status_detected") {
      const livingPrograms = programs.filter((program) => program.hp > 0);
      const target = targetOverride && targetOverride.hp > 0 ? targetOverride : livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
      this.applyStatusEffect(target, "status_detected");
      addBattleLog(`${target.name.toUpperCase()} WAS TAGGED [DETECTED].`, "damage");
      return;
    }

    if (ability.effect === "status_isolated") {
      const livingPrograms = programs.filter((program) => program.hp > 0);
      const target = targetOverride && targetOverride.hp > 0 ? targetOverride : livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
      this.applyStatusEffect(target, "status_isolated");
      addBattleLog(`${target.name.toUpperCase()} WAS PULLED INTO AN [ISOLATED] SEGMENT.`, "damage");
    }
  }

  // resolveTurnEndStatusEffects() applies end-of-turn status ticks for the actor whose turn just finished.
  resolveTurnEndStatusEffects(actorEntry) {
    const combatant = actorEntry && actorEntry.ref ? actorEntry.ref : null;
    if (!combatant || typeof resolveEndOfTurnStatusEffects !== "function") {
      return [];
    }

    return resolveEndOfTurnStatusEffects(combatant, this.state);
  }

  // finishActedTurn() resolves end-of-turn statuses, then clears the battle cue and advances play.
  finishActedTurn(actorEntry) {
    const statusEvents = this.resolveTurnEndStatusEffects(actorEntry);

    if (Array.isArray(statusEvents) && statusEvents.length) {
      statusEvents.forEach((event) => {
        addBattleLog(event.message, event.variant || "");
      });
      this.setBattleCue(
        statusEvents[0].message,
        statusEvents[1] ? statusEvents[1].message : "STATUS RESOLVED."
      );
      renderCombatScreen();
      scheduleBattleStep(this, () => {
        if (this.checkWinCondition()) {
          return;
        }

        this.state.battleMessage = "";
        this.state.battleSubmessage = "";
        this.state.actionLocked = false;
        this.clearBattleVisual();
        this.advanceTurn();
      }, 420);
      return;
    }

    if (this.checkWinCondition()) {
      this.state.actionLocked = false;
      return;
    }

    this.state.battleMessage = "";
    this.state.battleSubmessage = "";
    this.state.actionLocked = false;
    this.clearBattleVisual();
    this.advanceTurn();
  }

  resolveDamage(attacker, defender, ability, options = {}) {
    const damageResult = this.calculateDamage(attacker, defender, ability);
    let damage = damageResult.damage;
    const bonusDamage = Number.isFinite(options.bonusDamage) ? Math.max(0, options.bonusDamage) : 0;

    if (bonusDamage > 0) {
      damage += bonusDamage;
    }

    if (options.isThreatAttack && this.state.nextDamageReduction > 0) {
      damage = Math.max(1, Math.round(damage * (1 - this.state.nextDamageReduction)));
      this.state.nextDamageReduction = 0;
    }

    if (options.isThreatAttack && Number.isFinite(this.state.runDamageReductionPercent) && this.state.runDamageReductionPercent > 0) {
      const reduction = Math.min(0.5, Math.max(0, this.state.runDamageReductionPercent / 100));
      damage = Math.max(1, Math.round(damage * (1 - reduction)));
    }

    if (defender === this.state.threat && hasCombatantStatus(defender, "isolated")) {
      damage = Math.max(1, Math.round(damage * 1.1));
    }

    if (options.multiplier) {
      damage = Math.max(1, Math.round(damage * options.multiplier));
    }

    defender.hp = Math.max(0, defender.hp - damage);
    return {
      ...damageResult,
      damage
    };
  }

  completeThreatAction(actorEntry, action = null, resolvedEnemyIntent = null, delay = 420) {
    if (this.checkWinCondition()) {
      this.state.actionLocked = false;
      return;
    }

    scheduleBattleStep(this, () => {
      if (typeof recordEnemyIntentHistory === "function" && resolvedEnemyIntent?.intent?.id) {
        this.state.resolvedEnemyIntent = {
          ...resolvedEnemyIntent.intent,
          consumedAt: Date.now()
        };
        recordEnemyIntentHistory(this.state, resolvedEnemyIntent.intent.id);
      }

      this.state.enemyIntent = null;

      if (Array.isArray(this.state.enemyActionQueue) && this.state.enemyActionQueue.length) {
        console.log("[ENEMY TURN]", actorEntry?.ref?.title || actorEntry?.ref?.name || actorEntry?.ref?.id || "Threat", {
          completedAction: action?.index && action?.total ? `${action.index}/${action.total}` : "unknown",
          queueContinuesAfterAction: true,
          remainingActions: this.state.enemyActionQueue.length
        });
        this.clearEnemyResponseState();
        this.takeTurn(actorEntry, null);
        return;
      }

      console.log("[ENEMY TURN]", actorEntry?.ref?.title || actorEntry?.ref?.name || actorEntry?.ref?.id || "Threat", {
        completedAction: action?.index && action?.total ? `${action.index}/${action.total}` : "unknown",
        queueContinuesAfterAction: false,
        remainingActions: 0
      });
      this.clearEnemyResponseState();
      this.state.enemyActionQueue = [];
      this.state.enemyActionTargets = [];
      this.state.enemyResponseUsedThisTurn = false;
      this.finishActedTurn(actorEntry);
    }, delay);
  }

  executeThreatAction(actorEntry, action = null, responseResult = null) {
    const actor = actorEntry?.ref;
    if (!actor || actor.hp <= 0) {
      this.finishActedTurn(actorEntry);
      return;
    }

    const threatAbility = action?.ability || this.getFallbackThreatAbility(actor);
    const resolvedEnemyIntent = action?.resolvedEnemyIntent || null;
    const actionIndex = Number.isFinite(action?.index) ? action.index : 1;
    const actionTotal = Number.isFinite(action?.total) ? action.total : 1;
    const livingPrograms = this.getLivingEnemyTargets();
    if (!livingPrograms.length) {
      this.end("defeat");
      return;
    }

    const chosenTarget = threatAbility.effect === "damage_all"
      ? livingPrograms[0]
      : this.selectEnemyActionTarget(action, this.state.enemyActionTargets || []);
    if (!chosenTarget) {
      this.end("defeat");
      return;
    }

    this.state.enemyActionTargets = Array.isArray(this.state.enemyActionTargets) ? this.state.enemyActionTargets : [];
    this.state.enemyActionTargets.push(chosenTarget);
    this.state.actionLocked = true;
    this.applyThreatEffect(actor, threatAbility, chosenTarget);
    console.log(`[ENEMY ACTION ${actionIndex}/${actionTotal}]`, actor.title || actor.name || actor.id || "Threat", {
      type: action?.kind || "major",
      ability: threatAbility?.name || "Unknown",
      requiresResponse: Boolean(action?.requiresResponse),
      target: threatAbility.effect === "damage_all" ? "All Defenders" : chosenTarget.name,
      targetPattern: action?.targetPattern || "randomLiving",
      damageMultiplier: Number.isFinite(action?.damageMultiplier) ? action.damageMultiplier : 1
    });

    if (threatAbility.effect === "self_level_up") {
      if (responseResult) {
        const responseOutcome = this.buildEnemyResponseOutcome(responseResult, 0, 0);
        this.state.responseResult = {
          ...responseResult,
          ...responseOutcome
        };
        addBattleLog(responseOutcome.message.toUpperCase(), responseResult.variant);
      }

      this.setBattleCue(
        `${actor.title.toUpperCase()} UPGRADED ITS CORE!`,
        "THREAT POWER INCREASED.",
        this.buildVisualEffect(actorEntry, { kind: "threat", ref: this.state.threat }, threatAbility, null, "buff")
      );
      this.completeThreatAction(actorEntry, action, resolvedEnemyIntent, 360);
      return;
    }

    const actionLabel = action?.kind === "basic" ? "MINOR PROBE" : "MAJOR PAYLOAD";
    const targetLabel = threatAbility.effect === "damage_all" ? "ALL DEFENDERS" : chosenTarget.name.toUpperCase();

    this.setBattleCue(
      `${actor.title.toUpperCase()} USED ${threatAbility.name.toUpperCase()}!`,
      `${actionLabel} TARGETING ${targetLabel}.`,
      this.buildVisualEffect(actorEntry, { kind: "program", ref: chosenTarget }, threatAbility, null, "windup")
    );

    scheduleBattleStep(this, () => {
      const actionDamageMultiplier = Number.isFinite(action?.damageMultiplier) ? action.damageMultiplier : 1;
      const baseThreatMultiplier = (threatAbility.effect === "damage_all" ? 0.75 : 1) * actionDamageMultiplier;
      const responseMultiplier = responseResult && Number.isFinite(responseResult.damageReduction)
        ? Math.max(0, 1 - Math.max(0, Math.min(0.95, responseResult.damageReduction)))
        : 1;
      const incomingDamageResult = this.previewThreatDamage(actor, chosenTarget, threatAbility, {
        multiplier: baseThreatMultiplier,
        isThreatAttack: true
      });
      const damageResult = this.resolveDamage(actor, chosenTarget, threatAbility, {
        multiplier: baseThreatMultiplier * responseMultiplier,
        isThreatAttack: true
      });
      const responseOutcome = responseResult
        ? this.buildEnemyResponseOutcome(responseResult, incomingDamageResult.damage, damageResult.damage)
        : null;
      console.log("[ENEMY DAMAGE]", actor.title || actor.name || actor.id || "Threat", {
        action: `${actionIndex}/${actionTotal}`,
        type: action?.kind || "major",
        ability: threatAbility?.name || "Unknown",
        target: threatAbility.effect === "damage_all" ? "All Defenders" : chosenTarget.name,
        rawDamage: incomingDamageResult.damage,
        finalDamage: damageResult.damage,
        responseApplied: Boolean(responseResult),
        queueContinuesAfterAction: Array.isArray(this.state.enemyActionQueue) && this.state.enemyActionQueue.length > 0
      });

      if (responseOutcome) {
        this.state.responseResult = {
          ...responseResult,
          ...responseOutcome
        };
        addBattleLog(responseOutcome.message.toUpperCase(), responseResult.variant);
      }

      if (threatAbility.effect === "damage_all") {
        this.getLivingEnemyTargets().forEach((program) => {
          if (program === chosenTarget) {
            return;
          }

          const splashResult = this.resolveDamage(actor, program, threatAbility, {
            multiplier: baseThreatMultiplier * responseMultiplier,
            isThreatAttack: true
          });
          addBattleLog(`${actor.title.toUpperCase()} SPLASHED ${program.name.toUpperCase()} FOR ${splashResult.damage} DAMAGE.`, "damage");
        });
      }

      const playerActionLabel = action?.kind === "basic" ? "Minor probe" : "Major payload";
      const damageTargetLabel = threatAbility.effect === "damage_all" ? "all Defenders" : chosenTarget.name.toUpperCase();
      addBattleLog(`ENEMY ACTION ${actionIndex}/${actionTotal}: ${playerActionLabel} hit ${damageTargetLabel} for ${damageResult.damage}.`, "damage");

      const effectText = responseOutcome
        ? responseOutcome.submessage
        : damageResult.typeState === "super-effective"
          ? "PRESSURE INCREASED."
          : damageResult.typeState === "weak"
            ? "THE STRIKE WAS SOFTENED."
            : `${damageResult.levelMultiplier.toFixed(1)}X LEVEL BONUS.`;

      this.setBattleCue(
        responseOutcome ? `DEFEND RESULT: ${responseOutcome.label} - ${responseOutcome.effectiveness}` : `${chosenTarget.name.toUpperCase()} TOOK ${damageResult.damage} DAMAGE!`,
        effectText,
        this.buildVisualEffect(actorEntry, { kind: "program", ref: chosenTarget }, threatAbility, damageResult, "impact")
      );

      if (this.state.nextCounterDamage > 0) {
        this.state.threat.hp = Math.max(0, this.state.threat.hp - this.state.nextCounterDamage);
        addBattleLog(`COUNTER DAMAGE DEALT ${this.state.nextCounterDamage} TO ${this.state.threat.title.toUpperCase()}.`, "buff");
        this.state.nextCounterDamage = 0;
      }

      this.completeThreatAction(actorEntry, action, resolvedEnemyIntent, 420);
    }, 260);
  }

  takeTurn(actorEntry, ability) {
    if (this.state.phase !== "battle" || !actorEntry) {
      return;
    }

    const currentActor = this.getCurrentActor();
    if (currentActor !== actorEntry) {
      return;
    }

    const actor = actorEntry.ref;

    if (actorEntry.kind === "program") {
      if (actor.hp <= 0) {
        this.advanceTurn();
        return;
      }

      if (!ability || (actor.abilities.indexOf(ability) === -1 && !String(ability.effect || "").startsWith("combo_"))) {
        return;
      }

      const availability = typeof getMoveUseAvailability === "function"
        ? getMoveUseAvailability(ability, this.state)
        : {
            canUse: getMoveChargeCount(ability) > 0 && this.state.responseGauge >= (Number.isFinite(ability.cost) ? ability.cost : 0),
            reason: getMoveChargeCount(ability) <= 0 ? "charges" : "gauge",
            message: "",
            detail: "",
            charges: getMoveChargeCount(ability),
            maxCharges: Number.isFinite(ability.maxCharges) ? ability.maxCharges : getMoveChargeCount(ability),
            requiredGauge: Number.isFinite(ability.cost) ? ability.cost : 0,
            currentGauge: this.state.responseGauge
          };

      if (!availability.canUse) {
        if (availability.reason === "charges") {
          addBattleLog(`${actor.name.toUpperCase()} TRIED ${ability.name.toUpperCase()} BUT HAD NO CHARGES LEFT.`, "buff");
        } else if (availability.reason === "gauge") {
          addBattleLog(`${actor.name.toUpperCase()} NEEDS MORE TACTICAL GAUGE FOR ${ability.name.toUpperCase()}.`, "buff");
        } else {
          addBattleLog(`${actor.name.toUpperCase()} COULD NOT USE ${ability.name.toUpperCase()}.`, "buff");
        }
        this.setBattleCue(
          availability.message || "MOVE UNAVAILABLE.",
          availability.detail || "SELECT A DIFFERENT MOVE."
        );
        renderCombatScreen();
        return;
      }

      consumeMoveCharge(ability);
      const attackHits = rollMoveAccuracy(ability, this.state.battleAccuracyBonus || 0);
      this.state.actionLocked = true;
      this.setBattleCue(
        `${actor.name.toUpperCase()} USED ${ability.name.toUpperCase()}!`,
        "ATTACK WINDING UP...",
        this.buildVisualEffect(actorEntry, { kind: "threat", ref: this.state.threat }, ability, null, "windup")
      );

      scheduleBattleStep(this, () => {
        this.state.responseGauge = Math.max(0, this.state.responseGauge - ability.cost);
        if (!attackHits) {
          addBattleLog(`${actor.name.toUpperCase()} USED ${ability.name.toUpperCase()}, BUT IT MISSED.`, "damage");
          this.setBattleCue(
            `${actor.name.toUpperCase()} USED ${ability.name.toUpperCase()}, BUT IT MISSED.`,
            "NO DAMAGE DEALT."
          );

          scheduleBattleStep(this, () => {
            this.finishActedTurn(actorEntry);
          }, 420);
          return;
        }

        const openingDamageBonus = !this.state.openingDamageBonusConsumed && Number.isFinite(this.state.openingDamageBonus) ? this.state.openingDamageBonus : 0;
        const damageResult = this.resolveDamage(actor, this.state.threat, ability, {
          bonusDamage: openingDamageBonus
        });
        if (openingDamageBonus > 0) {
          this.state.openingDamageBonusConsumed = true;
        }
        this.state.responseGauge = Math.min(100, this.state.responseGauge + getRandomInt(10, 15));
        this.applyPlayerEffect(actor, ability, damageResult);

        const effectivenessText = damageResult.typeState === "super-effective"
          ? "IT WAS SUPER-EFFECTIVE!"
          : damageResult.typeState === "weak"
            ? "THE ATTACK FALTERED."
            : `${damageResult.levelMultiplier.toFixed(1)}X LEVEL BONUS.`;

        this.setBattleCue(
          `${this.state.threat.title.toUpperCase()} TOOK ${damageResult.damage} DAMAGE!`,
          effectivenessText,
          this.buildVisualEffect(actorEntry, { kind: "threat", ref: this.state.threat }, ability, damageResult, "impact")
        );

        if (this.state.threat.hp <= 0) {
          scheduleBattleStep(this, () => {
            this.state.actionLocked = false;
            this.clearBattleVisual();
            this.end("victory");
          }, 420);
          return;
        }

        scheduleBattleStep(this, () => {
          this.finishActedTurn(actorEntry);
        }, 420);
      }, 220);
      return;
    }

    if (actorEntry.kind === "threat") {
      const pendingEnemyAction = this.state.pendingEnemyAction && this.state.pendingEnemyAction.actorId === (actor.id || actor.title || "threat")
        ? this.state.pendingEnemyAction
        : null;
      const responseResult = this.state.responseResult && this.state.selectedResponse ? this.state.responseResult : null;

      if (!this.getLivingEnemyTargets().length) {
        this.end("defeat");
        return;
      }

      if (pendingEnemyAction) {
        this.executeThreatAction(actorEntry, pendingEnemyAction.queuedAction, responseResult);
        return;
      }

      if (!Array.isArray(this.state.enemyActionQueue) || !this.state.enemyActionQueue.length) {
        this.state.enemyActionQueue = this.buildEnemyActionQueue(actorEntry);
        this.state.enemyActionTargets = [];
        this.state.enemyResponseUsedThisTurn = false;
      }

      const nextAction = this.state.enemyActionQueue.shift();
      if (!nextAction) {
        this.finishActedTurn(actorEntry);
        return;
      }

      if (nextAction.requiresResponse && !this.state.enemyResponseUsedThisTurn) {
        this.enterEnemyResponsePhase(actorEntry, nextAction);
        return;
      }

      this.executeThreatAction(actorEntry, nextAction, null);
    }
  }

  checkWinCondition() {
    const allProgramsDown = programs.every((program) => program.hp <= 0);
    if (allProgramsDown) {
      this.end("defeat");
      return true;
    }

    if (this.state.threat.hp <= 0) {
      this.end("victory");
      return true;
    }

    return false;
  }

  end(outcome) {
    if (this.state.phase !== "battle") {
      return;
    }

    this.destroy();
    this.state.outcome = outcome;
    this.state.actionLocked = false;
    this.state.battleMessage = "";
    this.state.battleSubmessage = "";
    this.state.visualEffect = null;

    if (outcome === "victory") {
      if (this.state.expAwarded) {
        return;
      }

      this.state.expAwarded = true;
      this.state.phase = "narrative";
      this.state.sourceThreat.status = "neutralized";
      this.state.sourceThreat.hp = this.state.sourceThreat.maxHp;
      threatsNeutralized += 1;
      addScore(100);
      globe.removeThreatNode(this.state.sourceThreat.id);
      globe.updateActiveCount();
      addBattleLog(`${this.state.sourceThreat.title.toUpperCase()} NEUTRALIZED. RECOVERING NARRATIVE FRAGMENT.`, "buff");

      try {
        const rewardLines = awardBattleRewards(this.state.sourceThreat);
        if (Array.isArray(rewardLines) && rewardLines.length) {
          rewardLines.forEach((line) => {
            addBattleLog(line.text.toUpperCase(), line.levelUp ? "buff" : "");
          });
        }
        showPostBattleNarrativeEncounter(this.state.sourceThreat, rewardLines);
      } catch (error) {
        console.error("[Narrative] Unexpected victory overlay failure, returning to globe.", error);
        returnToGlobeFromCombat();
      }
      return;
    }

    this.state.phase = "defeat";
    addBattleLog(`ALL PROGRAMS FAILED. BATTLE LOST.`, "damage");
    try {
      if (typeof recordPantheonDefeat === "function") {
        recordPantheonDefeat(this.state.sourceThreat);
      }
    } catch (error) {
      console.error("[Pantheon] Failed to record defeat memory.", error);
    }
    showCombatDefeatScreen("lose");
  }
}

// startCombatEncounter() routes the globe click through the short encounter transition before combat starts.
function startCombatEncounter(threat) {
  if (screenState !== "game" || combatState || encounterTransitionActive || !threat || threat.status !== "active") {
    return;
  }

  showEncounterTransition(threat);
}

// wireThreatResponses() connects globe clicks to battle encounters and keeps the earlier respawn layer alive.
function wireThreatResponses() {
  if (threatResponsesWired) {
    return;
  }

  threatResponsesWired = true;

  globe.onThreatClick((threat) => {
    if (screenState !== "game" || threat.status !== "active" || combatState || encounterTransitionActive) {
      return;
    }

    startCombatEncounter(threat);
  });

  startRespawnInterval();
}
