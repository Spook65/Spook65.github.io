/* Combat animation helpers keep the battle timing and visual cue state out of the main loop. */

// scheduleBattleStep() queues a delayed combat callback and tracks the timer on the active engine.
function scheduleBattleStep(engine, callback, delay) {
  const timeoutId = window.setTimeout(() => {
    engine.animationTimeoutIds = engine.animationTimeoutIds.filter((activeId) => activeId !== timeoutId);
    callback();
  }, delay);

  engine.animationTimeoutIds.push(timeoutId);
  return timeoutId;
}

// clearBattleVisual() clears transient battle effects so the next frame starts from a clean state.
function clearBattleVisual(state) {
  state.visualEffect = null;
  renderCombatScreen();
}

// setBattleCue() updates the main battle message, submessage, and current effect in one render pass.
function setBattleCue(state, message, submessage = "", visualEffect = null) {
  state.battleMessage = message;
  state.battleSubmessage = submessage;
  state.visualEffect = visualEffect;
  renderCombatScreen();
}

// buildVisualEffect() packages attacker, target, and animation metadata for the current combat action.
function buildVisualEffect(state, actorEntry, targetEntry, ability, damageResult, phase) {
  const attackerKind = actorEntry.kind;
  const targetKind = targetEntry.kind;
  const attackerId = attackerKind === "program" ? actorEntry.ref.id : state.threat.id;
  const targetId = targetKind === "program" ? targetEntry.ref.id : state.threat.id;

  return {
    attackerKind,
    targetKind,
    attackerId,
    targetId,
    phase,
    style: getAbilityPresentation(ability),
    damage: damageResult ? damageResult.damage : 0,
    typeState: damageResult ? damageResult.typeState : "neutral"
  };
}
