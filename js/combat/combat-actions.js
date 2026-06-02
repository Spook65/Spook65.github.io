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

  buildEnemyResponseResult(evaluation) {
    const safeEvaluation = evaluation && typeof evaluation === "object" ? evaluation : null;
    if (!safeEvaluation) {
      return {
        id: "none",
        name: "RESPONSE",
        status: "NORMAL",
        damageReduction: 0,
        gaugeGain: 0,
        message: "NO RESPONSE SELECTED.",
        submessage: "PAYLOAD LANDS WITHOUT COUNTERPLAY.",
        logMessage: "NO RESPONSE SELECTED. PAYLOAD LANDED WITHOUT COUNTERPLAY.",
        variant: "damage"
      };
    }

    const gaugeText = safeEvaluation.gaugeGain > 0 ? ` Tactical Gauge +${safeEvaluation.gaugeGain}.` : "";
    const reducedText = safeEvaluation.damageReduction > 0 ? " Damage reduced." : "";
    const responseCopy = {
      isolate: {
        normal: `ISOLATE contained part of the spread.${reducedText}`,
        resisted: `ISOLATE met resistance.${reducedText}`,
        ineffective: "ISOLATE failed. Target ignored containment.",
        recommended: `ISOLATE contained the spread.${reducedText}`,
        empowered: `ISOLATE contained the spread.${reducedText}`
      },
      countertrace: {
        normal: `COUNTERTRACE traced part of the route.${reducedText}${gaugeText}`,
        resisted: `COUNTERTRACE was partially blocked.${reducedText}${gaugeText}`,
        ineffective: "COUNTERTRACE failed. Source route stayed hidden.",
        recommended: `COUNTERTRACE found the attack route.${reducedText}${gaugeText}`,
        empowered: `COUNTERTRACE found the attack route.${reducedText}${gaugeText}`
      },
      redirect: {
        normal: `REDIRECT routed part of the payload into decoy space.${reducedText}`,
        resisted: `REDIRECT was resisted.${reducedText}`,
        ineffective: "REDIRECT failed. Target ignored decoy routing.",
        recommended: `REDIRECT routed the payload into decoy space.${reducedText}`,
        empowered: `REDIRECT routed the payload into decoy space.${reducedText}`
      },
      purge: {
        normal: `PURGE cleaned hostile residue.${reducedText}`,
        resisted: `PURGE was resisted.${reducedText}`,
        ineffective: "PURGE failed. Hostile residue remained active.",
        recommended: `PURGE cleaned hostile residue.${reducedText}`,
        empowered: `PURGE cleaned hostile residue.${reducedText}`
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
      || (safeEvaluation.damageReduction > 0 ? "Payload partially mitigated." : "No strong counter. Payload continues.");

    return {
      ...safeEvaluation,
      message,
      submessage: safeEvaluation.status === "INEFFECTIVE"
        ? "NO MITIGATION APPLIED."
        : `${Math.round(safeEvaluation.damageReduction * 100)}% DAMAGE MITIGATION${safeEvaluation.gaugeGain > 0 ? ` / GAUGE +${safeEvaluation.gaugeGain}` : ""}.`,
      logMessage: message.toUpperCase(),
      variant: safeEvaluation.status === "INEFFECTIVE" ? "damage" : "buff"
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

  enterEnemyResponsePhase(actorEntry) {
    const actor = actorEntry?.ref;
    if (!actor || actor.hp <= 0) {
      return;
    }

    const resolvedEnemyIntent = typeof resolveEnemyIntent === "function"
      ? resolveEnemyIntent(this.state)
      : null;
    const threatAbility = resolvedEnemyIntent?.ability || this.getFallbackThreatAbility(actor);
    if (resolvedEnemyIntent?.intent) {
      this.state.enemyIntent = resolvedEnemyIntent.intent;
    }

    this.state.responsePhase = true;
    this.state.pendingEnemyAction = {
      actorId: actor.id || actor.title || "threat",
      ability: threatAbility,
      resolvedEnemyIntent
    };
    this.state.selectedResponse = null;
    this.state.responseResult = null;
    this.state.actionLocked = false;
    this.state.commandMode = "response";
    this.state.battleMessage = "ENEMY RESPONSE.";
    this.state.battleSubmessage = "CHOOSE A COUNTER BEFORE THE PAYLOAD LANDS.";
    this.state.visualEffect = null;
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

    addBattleLog(responseResult.logMessage, responseResult.variant);
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
      this.enterEnemyResponsePhase(currentActor);
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

  applyThreatEffect(threat, ability) {
    if (ability.effect === "self_level_up") {
      addBattleLog(`${threat.title.toUpperCase()} TRIED TO ESCALATE, BUT THE BATTLE LEVEL IS LOCKED.`, "buff");
      return;
    }

    if (ability.effect === "damage_all" && String(this.state?.resolvedEnemyIntent?.intent?.id || this.state?.enemyIntent?.id || "").toLowerCase() === "overload") {
      const livingPrograms = programs.filter((program) => program.hp > 0);
      if (livingPrograms.length) {
        const target = livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
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
      const target = livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
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
      const target = livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
      this.applyStatusEffect(target, "status_detected");
      addBattleLog(`${target.name.toUpperCase()} WAS TAGGED [DETECTED].`, "damage");
      return;
    }

    if (ability.effect === "status_isolated") {
      const livingPrograms = programs.filter((program) => program.hp > 0);
      const target = livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
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
      const responseMultiplier = responseResult && Number.isFinite(responseResult.damageReduction)
        ? Math.max(0, 1 - Math.max(0, Math.min(0.95, responseResult.damageReduction)))
        : 1;
      const resolvedEnemyIntent = pendingEnemyAction?.resolvedEnemyIntent || (typeof resolveEnemyIntent === "function"
        ? resolveEnemyIntent(this.state)
        : null);
      const threatAbility = pendingEnemyAction?.ability || resolvedEnemyIntent?.ability || ability || this.getFallbackThreatAbility(actor);
      if (resolvedEnemyIntent && resolvedEnemyIntent.intent) {
        this.state.enemyIntent = resolvedEnemyIntent.intent;
      }
      const livingPrograms = programs.filter((program) => program.hp > 0);

      if (!livingPrograms.length) {
        this.end("defeat");
        return;
      }

      this.applyThreatEffect(actor, threatAbility);
      if (threatAbility.effect === "self_level_up") {
        this.state.actionLocked = true;
        this.setBattleCue(
          `${actor.title.toUpperCase()} UPGRADED ITS CORE!`,
          "THREAT POWER INCREASED.",
          this.buildVisualEffect(actorEntry, { kind: "threat", ref: this.state.threat }, threatAbility, null, "buff")
        );

        scheduleBattleStep(this, () => {
          this.state.actionLocked = false;
          renderCombatScreen();
          if (typeof recordEnemyIntentHistory === "function" && resolvedEnemyIntent?.intent?.id) {
            recordEnemyIntentHistory(this.state, resolvedEnemyIntent.intent.id);
          }
          this.clearEnemyResponseState();
          this.finishActedTurn(actorEntry);
        }, 360);
        return;
      }

      this.state.actionLocked = true;
      const chosenTarget = threatAbility.effect === "damage_all"
        ? livingPrograms[0]
        : livingPrograms[getRandomInt(0, livingPrograms.length - 1)];

      this.setBattleCue(
        `${actor.title.toUpperCase()} USED ${threatAbility.name.toUpperCase()}!`,
        resolvedEnemyIntent?.intent?.description ? resolvedEnemyIntent.intent.description.toUpperCase() : "COUNTERMEASURE DEPLOYED.",
        this.buildVisualEffect(actorEntry, { kind: "program", ref: chosenTarget }, threatAbility, null, "windup")
      );

      scheduleBattleStep(this, () => {
        const damageResult = threatAbility.effect === "damage_all"
          ? this.resolveDamage(actor, chosenTarget, threatAbility, { multiplier: 0.75 * responseMultiplier, isThreatAttack: true })
          : this.resolveDamage(actor, chosenTarget, threatAbility, { multiplier: responseMultiplier, isThreatAttack: true });

        if (threatAbility.effect === "damage_all") {
          livingPrograms.forEach((program) => {
            if (program === chosenTarget) {
              return;
            }

            const splashResult = this.resolveDamage(actor, program, threatAbility, { multiplier: 0.75 * responseMultiplier, isThreatAttack: true });
            addBattleLog(`${actor.title.toUpperCase()} SPLASHED ${program.name.toUpperCase()} FOR ${splashResult.damage} DAMAGE.`, "damage");
          });
        }

        addBattleLog(`${actor.title.toUpperCase()} USED ${threatAbility.name.toUpperCase()} - ${damageResult.damage} DAMAGE ON ${chosenTarget.name.toUpperCase()}.`, "damage");

        const effectText = damageResult.typeState === "super-effective"
          ? "PRESSURE INCREASED."
          : damageResult.typeState === "weak"
            ? "THE STRIKE WAS SOFTENED."
            : responseResult && responseResult.damageReduction > 0
              ? `${responseResult.name} MITIGATED ${Math.round(responseResult.damageReduction * 100)}%.`
              : `${damageResult.levelMultiplier.toFixed(1)}X LEVEL BONUS.`;

        this.setBattleCue(
          `${chosenTarget.name.toUpperCase()} TOOK ${damageResult.damage} DAMAGE!`,
          effectText,
          this.buildVisualEffect(actorEntry, { kind: "program", ref: chosenTarget }, threatAbility, damageResult, "impact")
        );

        if (this.state.nextCounterDamage > 0) {
          this.state.threat.hp = Math.max(0, this.state.threat.hp - this.state.nextCounterDamage);
          addBattleLog(`COUNTER DAMAGE DEALT ${this.state.nextCounterDamage} TO ${this.state.threat.title.toUpperCase()}.`, "buff");
          this.state.nextCounterDamage = 0;
        }

        this.clearEnemyResponseState();

        if (this.checkWinCondition()) {
          this.state.actionLocked = false;
          return;
        }

        scheduleBattleStep(this, () => {
          this.state.resolvedEnemyIntent = resolvedEnemyIntent?.intent ? { ...resolvedEnemyIntent.intent, consumedAt: Date.now() } : this.state.resolvedEnemyIntent;
          if (typeof recordEnemyIntentHistory === "function" && resolvedEnemyIntent?.intent?.id) {
            recordEnemyIntentHistory(this.state, resolvedEnemyIntent.intent.id);
          }
          this.state.enemyIntent = null;
          this.finishActedTurn(actorEntry);
        }, 420);
      }, 260);
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
