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
    this.state.phase = "battle";
    this.state.activeProgramId = this.state.turnOrder.find((entry) => entry.kind === "program" && entry.ref.hp > 0)?.ref.id || this.state.activeProgramId;
    this.state.commandMode = "main";
    this.state.battleMessage = "";
    this.state.battleSubmessage = "";
    this.state.visualEffect = null;
    this.state.actionLocked = false;
    screenState = "combat";
    addBattleLog(`ENGAGING ${this.state.threat.title.toUpperCase()} AT LEVEL ${this.state.threat.level}.`);
    renderCombatScreen();
    this.resolveCurrentTurn();
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

  resolveCurrentTurn() {
    if (this.state.phase !== "battle") {
      return;
    }

    const currentActor = this.getCurrentActor();

    if (!currentActor) {
      return;
    }

    if (currentActor.kind === "threat") {
      this.state.battleMessage = `${currentActor.ref.title.toUpperCase()} IS PREPARING AN ATTACK.`;
      this.state.battleSubmessage = "HOLD POSITION.";
      this.state.visualEffect = null;
      renderCombatScreen();
      this.turnTimeoutId = window.setTimeout(() => {
        this.turnTimeoutId = null;
        this.takeTurn(currentActor, null);
      }, 650);
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

    target.statusEffects = Array.isArray(target.statusEffects) ? target.statusEffects : [];

    if (effect === "status_detected") {
      if (!target.statusEffects.includes("detected")) {
        target.statusEffects.push("detected");
      }
      return;
    }

    if (effect === "status_isolated") {
      if (!target.statusEffects.includes("isolated")) {
        target.statusEffects.push("isolated");
      }
      return;
    }

    if (effect === "status_encrypted") {
      if (!target.statusEffects.includes("encrypted")) {
        target.statusEffects.push("encrypted");
      }
    }
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
      threat.level = Math.min(10, threat.level + 1);
      threat.atk += 1;
      threat.def += 1;
      threat.maxHp += 15;
      threat.hp = Math.min(threat.maxHp, threat.hp + 15);
      addBattleLog(`${threat.title.toUpperCase()} ESCALATED TO LEVEL ${threat.level}.`, "buff");
      return;
    }

    if (ability.effect === "status_encrypted") {
      const livingPrograms = programs.filter((program) => program.hp > 0);
      const target = livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
      this.applyStatusEffect(target, "status_encrypted");
      addBattleLog(`${target.name.toUpperCase()} IS ENCRYPTED. DAMAGE OUTPUT REDUCED.`, "damage");
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

  resolveDamage(attacker, defender, ability, options = {}) {
    const damageResult = this.calculateDamage(attacker, defender, ability);
    let damage = damageResult.damage;

    if (options.isThreatAttack && this.state.nextDamageReduction > 0) {
      damage = Math.max(1, Math.round(damage * (1 - this.state.nextDamageReduction)));
      this.state.nextDamageReduction = 0;
    }

    if (defender === this.state.threat && Array.isArray(defender.statusEffects) && defender.statusEffects.includes("isolated")) {
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

      if (this.state.responseGauge < ability.cost) {
        addBattleLog(`${actor.name.toUpperCase()} NEEDS MORE RESPONSE GAUGE.`, "buff");
        renderCombatScreen();
        return;
      }

      this.state.actionLocked = true;
      this.setBattleCue(
        `${actor.name.toUpperCase()} USED ${ability.name.toUpperCase()}!`,
        "ATTACK WINDING UP...",
        this.buildVisualEffect(actorEntry, { kind: "threat", ref: this.state.threat }, ability, null, "windup")
      );

      scheduleBattleStep(this, () => {
        this.state.responseGauge = Math.max(0, this.state.responseGauge - ability.cost);
        const damageResult = this.resolveDamage(actor, this.state.threat, ability);
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
          this.state.battleMessage = "";
          this.state.battleSubmessage = "";
          this.state.actionLocked = false;
          this.clearBattleVisual();
          this.advanceTurn();
        }, 420);
      }, 220);
      return;
    }

    if (actorEntry.kind === "threat") {
      const threatAbility = ability || actor.abilities[getRandomInt(0, actor.abilities.length - 1)];
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
          if (this.checkWinCondition()) {
            return;
          }
          this.advanceTurn();
        }, 360);
        return;
      }

      this.state.actionLocked = true;
      const chosenTarget = threatAbility.effect === "damage_all"
        ? livingPrograms[0]
        : livingPrograms[getRandomInt(0, livingPrograms.length - 1)];

      this.setBattleCue(
        `${actor.title.toUpperCase()} USED ${threatAbility.name.toUpperCase()}!`,
        "COUNTERMEASURE DEPLOYED.",
        this.buildVisualEffect(actorEntry, { kind: "program", ref: chosenTarget }, threatAbility, null, "windup")
      );

      scheduleBattleStep(this, () => {
        const damageResult = threatAbility.effect === "damage_all"
          ? this.resolveDamage(actor, chosenTarget, threatAbility, { multiplier: 0.75, isThreatAttack: true })
          : this.resolveDamage(actor, chosenTarget, threatAbility, { isThreatAttack: true });

        if (threatAbility.effect === "damage_all") {
          livingPrograms.forEach((program) => {
            if (program === chosenTarget) {
              return;
            }

            const splashResult = this.resolveDamage(actor, program, threatAbility, { multiplier: 0.75, isThreatAttack: true });
            addBattleLog(`${actor.title.toUpperCase()} SPLASHED ${program.name.toUpperCase()} FOR ${splashResult.damage} DAMAGE.`, "damage");
          });
        }

        addBattleLog(`${actor.title.toUpperCase()} USED ${threatAbility.name.toUpperCase()} - ${damageResult.damage} DAMAGE ON ${chosenTarget.name.toUpperCase()}.`, "damage");

        const effectText = damageResult.typeState === "super-effective"
          ? "PRESSURE INCREASED."
          : damageResult.typeState === "weak"
            ? "THE STRIKE WAS SOFTENED."
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

        if (this.checkWinCondition()) {
          this.state.actionLocked = false;
          return;
        }

        scheduleBattleStep(this, () => {
          this.state.battleMessage = "";
          this.state.battleSubmessage = "";
          this.state.actionLocked = false;
          this.clearBattleVisual();
          this.advanceTurn();
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
      this.state.phase = "reward";
      this.state.sourceThreat.status = "neutralized";
      this.state.sourceThreat.hp = this.state.sourceThreat.maxHp;
      threatsNeutralized += 1;
      addScore(100);
      globe.removeThreatNode(this.state.sourceThreat.id);
      globe.updateActiveCount();
      const rewardLines = awardBattleRewards(this.state.threat);
      addBattleLog(`${this.state.sourceThreat.title.toUpperCase()} NEUTRALIZED. REWARD PACKAGE ISSUED.`, "buff");
      showCombatReward(rewardLines);
      return;
    }

    this.state.phase = "defeat";
    addBattleLog(`ALL PROGRAMS FAILED. BATTLE LOST.`, "damage");
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
