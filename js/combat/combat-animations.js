/* Combat animation helpers keep the battle timing and visual cue state out of the main loop. */
let combatVisualEffectSequence = 0;

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
  combatVisualEffectSequence += 1;
  const attackerKind = actorEntry?.kind || "unknown";
  const targetKind = targetEntry?.kind || "unknown";
  const attackerRef = actorEntry?.ref || {};
  const targetRef = targetEntry?.ref || {};
  const threat = state?.threat || {};
  const attackerId = attackerKind === "program" ? attackerRef.id : threat.id;
  const targetId = targetKind === "program" ? targetRef.id : threat.id;
  const vfxProfile = typeof getCombatAbilityVfxProfile === "function"
    ? getCombatAbilityVfxProfile(ability, { attackerKind, targetKind, phase, damageResult })
    : {
        key: "generic-strike",
        family: "generic_strike",
        color: "#f5d07a",
        secondaryColor: "#ff6f4d",
        intensity: phase === "impact" ? 1 : 0.72,
        targetMode: "enemy",
        durationMs: 820
      };
  const legacyStyle = typeof getCombatAbilityLegacyStyle === "function"
    ? getCombatAbilityLegacyStyle(vfxProfile)
    : getAbilityPresentation(ability);

  return {
    effectId: `combat-vfx-${Date.now()}-${combatVisualEffectSequence}`,
    sequenceId: combatVisualEffectSequence,
    abilityName: ability?.name || "",
    abilityEffect: ability?.effect || "",
    vfxFamily: vfxProfile.family || "generic_strike",
    vfxProfile,
    attackerKind,
    targetKind,
    attackerId,
    targetId,
    phase,
    style: legacyStyle,
    damage: damageResult ? damageResult.damage : 0,
    typeState: damageResult ? damageResult.typeState : "neutral",
    createdAt: Date.now()
  };
}
