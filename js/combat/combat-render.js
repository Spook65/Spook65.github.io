/* Combat render helpers keep the layered battlefield markup isolated from the app wiring. */

// renderStatusPills() keeps the status-effect labels compact and color-coded.
function renderStatusPills(statusEffects = []) {
  if (!statusEffects.length) {
    return "";
  }

  return `
    <div class="status-pill-row">
      ${statusEffects.map((status) => {
        const className = status === "detected" ? "is-cyan" : status === "isolated" ? "is-alert" : "";
        const label = status.replace(/_/g, " ").toUpperCase();
        return `<span class="status-pill ${className}">${label}</span>`;
      }).join("")}
    </div>
  `;
}

// renderBar() draws the same bar structure for HP, XP, and the shared response gauge.
function renderBar(current, max, fillClass) {
  const safeMax = Math.max(1, max);
  const pct = Math.max(0, Math.min(100, Math.round((current / safeMax) * 100)));

  return `
    <div class="combat-bar" aria-hidden="true">
      <div class="combat-bar-fill ${fillClass}" style="width: ${pct}%;"></div>
    </div>
  `;
}

// getProgramSpriteClass() maps the program id to its matching pixel-sprite class.
function getProgramSpriteClass(program) {
  return String(program && program.id ? program.id : "firewall-7").split("-")[0];
}

// getThreatSpriteClass() maps the threat type to a simple pixel-art silhouette class.
function getThreatSpriteClass(threat) {
  const threatType = String(threat && threat.type ? threat.type : "ransomware");
  if (threatType === "ddos") {
    return "botnet";
  }

  return threatType;
}

// getActiveBattleProgram() keeps one program visually centered even when the threat is taking its turn.
function getActiveBattleProgram(state) {
  if (!state) {
    return programs[0];
  }

  const focusedProgram = state.playerParty.find((program) => program.id === state.activeProgramId && program.hp > 0);
  if (focusedProgram) {
    return focusedProgram;
  }

  const currentActor = state.turnOrder[state.currentTurnIndex];
  if (currentActor && currentActor.kind === "program" && currentActor.ref.hp > 0) {
    return currentActor.ref;
  }

  return state.playerParty.find((program) => program.hp > 0) || state.playerParty[0];
}

// buildTurnOrderMarkup() keeps the turn queue compact so it reads like a tactical preview instead of a table.
function buildTurnOrderMarkup(state) {
  const previewCount = Math.min(3, state.turnOrder.length);
  const preview = [];

  for (let index = 0; index < previewCount; index += 1) {
    const turnIndex = (state.currentTurnIndex + index) % state.turnOrder.length;
    const entry = state.turnOrder[turnIndex];
    const actor = entry.ref;
    const label = entry.kind === "program" ? actor.name : actor.title;
    preview.push(`<span class="combat-turn-chip ${index === 0 ? "is-current" : ""} ${entry.kind === "threat" ? "is-threat" : ""}">${label}</span>`);
  }

  return preview.join('<span class="combat-turn-separator" aria-hidden="true">→</span>');
}

// buildBattleLogMarkup() keeps a tiny history summary available without turning the screen back into a dashboard.
function buildBattleLogMarkup(state) {
  const entries = state.battleLog.slice(-3);

  if (!entries.length) {
    return '<div class="combat-history-entry">SYSTEM READY. AWAITING FIRST TURN.</div>';
  }

  const summary = entries.slice(-1);

  return summary.map((entry) => {
    const variantClass = entry.variant ? `is-${entry.variant}` : "";
    return `<div class="combat-history-entry ${variantClass}">${entry.message}</div>`;
  }).join("");
}

// getBattleMessageText() keeps the primary battle prompt readable even while the engine is animating a move.
function getBattleMessageText(state) {
  if (state.battleIntroPlaying) {
    if (state.battleIntroStage === "operator") {
      return "OPERATOR READIES THE DISC.";
    }

    if (state.battleIntroStage === "launch") {
      return "COMMAND DISC LAUNCHED.";
    }

    if (state.battleIntroStage === "travel") {
      return "DISC IN TRANSIT.";
    }

    if (state.battleIntroStage === "impact") {
      return "SUMMON GATE OPENING.";
    }

    if (state.battleIntroStage === "materialize") {
      return "DEFENDER MATERIALIZING.";
    }

    return "DEPLOYMENT SEQUENCE INITIATED.";
  }

  if (state.battleMessage) {
    return state.battleMessage;
  }

  const currentActor = state.turnOrder[state.currentTurnIndex];
  if (!currentActor) {
    return "SYSTEM READY.";
  }

  if (currentActor.kind === "program") {
    if (state.commandMode === "attack") {
      return `CHOOSE AN ACTION FOR ${currentActor.ref.name.toUpperCase()}.`;
    }

    if (state.commandMode === "programs") {
      return "PROGRAM SWITCHING COMING SOON.";
    }

    if (state.commandMode === "items") {
      return "NO RECOVERY ITEMS AVAILABLE.";
    }

    return `WHAT WILL ${currentActor.ref.name.toUpperCase()} DO?`;
  }

  return `${currentActor.ref.title.toUpperCase()} IS PREPARING AN ATTACK.`;
}

// getBattleSubmessageText() keeps a smaller supporting line available for hit feedback and effect callouts.
function getBattleSubmessageText(state) {
  if (state.battleIntroPlaying) {
    if (state.battleIntroStage === "operator") {
      return "COMMAND GAUNTLET ARMED.";
    }

    if (state.battleIntroStage === "launch") {
      return "VECTOR TRACING THE FIELD.";
    }

    if (state.battleIntroStage === "travel") {
      return "LOCKING SUMMON VECTOR.";
    }

    if (state.battleIntroStage === "impact") {
      return "LIGHT BURST STABILIZING.";
    }

    if (state.battleIntroStage === "materialize") {
      return "BATTLE SYSTEMS ONLINE.";
    }

    return "DEPLOYMENT CHANNEL OPEN.";
  }

  if (state.battleSubmessage) {
    return state.battleSubmessage;
  }

  if (state.pantheonInsight) {
    return String(state.pantheonInsight).toUpperCase();
  }

  if (state.commandMode === "attack") {
    return "SELECT A PROGRAM ATTACK OR BACK OUT.";
  }

  if (state.commandMode === "programs") {
    return "ACTIVE PARTY VIEW. SWITCHING COMING SOON.";
  }

  if (state.commandMode === "items") {
    return "ITEMS MENU EMPTY.";
  }

  return "RESPONSE GATE ONLINE.";
}

// getAbilityPresentation() maps a move to a small animation family without changing the move's combat rules.
function getAbilityPresentation(ability) {
  const effect = String(ability && ability.effect ? ability.effect : "");

  if (
    effect === "reduce_next_damage" ||
    effect === "boost_def" ||
    effect === "shared_ability" ||
    effect === "cleanse" ||
    effect === "combo_sync_defense" ||
    effect === "combo_containment" ||
    effect === "self_level_up"
  ) {
    return "buff";
  }

  if (effect === "damage_all" || effect === "status_encrypted" || effect === "status_detected" || effect === "status_isolated") {
    return "beam";
  }

  return "impact";
}

// buildReserveStripMarkup() keeps the inactive party members visible without crowding the main battlefield.
function buildReserveStripMarkup(state, activeProgramId) {
  return state.playerParty.map((program) => {
    const isActive = program.id === activeProgramId;
    const isTargeted = state.visualEffect && state.visualEffect.targetId === program.id && state.visualEffect.phase !== "recover";

    return `
      <article class="combat-reserve-card ${isActive ? "is-active" : ""} ${program.hp <= 0 ? "is-down" : ""} ${isTargeted ? "is-targeted" : ""}" style="color: ${program.color};">
        <div class="combat-reserve-name">${program.name}</div>
        <div class="combat-reserve-meta">HP ${program.hp}/${program.maxHp}</div>
      </article>
    `;
  }).join("");
}

// renderCombatantSprite() builds each fighter from layered HTML parts so the silhouettes read like original characters.
function renderCombatantSprite(combatant, side) {
  const isProgram = side === "program";
  const spriteKey = isProgram ? getProgramSpriteClass(combatant) : getThreatSpriteClass(combatant);
  const roleClass = isProgram ? "combatant-program" : "combatant-threat";
  const typeClass = `is-${spriteKey}`;
  const detailLayers = isProgram
    ? renderProgramCombatantDetails(spriteKey)
    : renderThreatCombatantDetails(spriteKey);

  return `
    <div class="battle-sprite combatant-sprite ${roleClass} ${typeClass}" aria-hidden="true" data-combatant-key="${spriteKey}">
      <div class="combatant-shadow"></div>
      <div class="combatant-aura"></div>
      <div class="combatant-rim"></div>
      <div class="combatant-body"></div>
      <div class="combatant-core"></div>
      <div class="combatant-head"></div>
      <div class="combatant-shoulder is-left"></div>
      <div class="combatant-shoulder is-right"></div>
      ${detailLayers}
    </div>
  `;
}

// renderProgramCombatantDetails() gives each security program its own layered silhouette identity.
function renderProgramCombatantDetails(spriteKey) {
  switch (spriteKey) {
    case "firewall":
      return `
        <div class="combatant-detail combatant-shield"></div>
        <div class="combatant-detail combatant-armor is-left"></div>
        <div class="combatant-detail combatant-armor is-right"></div>
        <div class="combatant-detail combatant-plume"></div>
        <div class="combatant-detail combatant-sigil"></div>
      `;
    case "ids":
      return `
        <div class="combatant-detail combatant-ring is-main"></div>
        <div class="combatant-detail combatant-ring is-secondary"></div>
        <div class="combatant-detail combatant-sensor is-left"></div>
        <div class="combatant-detail combatant-sensor is-right"></div>
        <div class="combatant-detail combatant-scanline"></div>
        <div class="combatant-detail combatant-node is-upper"></div>
        <div class="combatant-detail combatant-node is-lower"></div>
      `;
    case "honeypot":
      return `
        <div class="combatant-detail combatant-mask"></div>
        <div class="combatant-detail combatant-lure-orb"></div>
        <div class="combatant-detail combatant-fragment is-left"></div>
        <div class="combatant-detail combatant-fragment is-right"></div>
        <div class="combatant-detail combatant-afterimage is-one"></div>
        <div class="combatant-detail combatant-afterimage is-two"></div>
      `;
    case "antivirus":
      return `
        <div class="combatant-detail combatant-halo"></div>
        <div class="combatant-detail combatant-lance"></div>
        <div class="combatant-detail combatant-crest"></div>
        <div class="combatant-detail combatant-wing is-left"></div>
        <div class="combatant-detail combatant-wing is-right"></div>
        <div class="combatant-detail combatant-blade"></div>
      `;
    default:
      return "";
  }
}

// renderThreatCombatantDetails() turns each hostile into a layered corrupted entity with readable weak cores.
function renderThreatCombatantDetails(spriteKey) {
  switch (spriteKey) {
    case "ransomware":
      return `
        <div class="combatant-detail combatant-lock-core"></div>
        <div class="combatant-detail combatant-shell"></div>
        <div class="combatant-detail combatant-shard is-left"></div>
        <div class="combatant-detail combatant-shard is-right"></div>
        <div class="combatant-detail combatant-chain"></div>
        <div class="combatant-detail combatant-fracture"></div>
      `;
    case "phishing":
      return `
        <div class="combatant-detail combatant-mask-core"></div>
        <div class="combatant-detail combatant-eye is-left"></div>
        <div class="combatant-detail combatant-eye is-right"></div>
        <div class="combatant-detail combatant-tendril is-left"></div>
        <div class="combatant-detail combatant-tendril is-right"></div>
        <div class="combatant-detail combatant-lure"></div>
      `;
    case "botnet":
      return `
        <div class="combatant-detail combatant-swarm-core"></div>
        <div class="combatant-detail combatant-node is-a"></div>
        <div class="combatant-detail combatant-node is-b"></div>
        <div class="combatant-detail combatant-node is-c"></div>
        <div class="combatant-detail combatant-link is-one"></div>
        <div class="combatant-detail combatant-link is-two"></div>
        <div class="combatant-detail combatant-link is-three"></div>
      `;
    case "trojan":
    case "zero-day":
      return `
        <div class="combatant-detail combatant-anomaly-core"></div>
        <div class="combatant-detail combatant-edge is-left"></div>
        <div class="combatant-detail combatant-edge is-right"></div>
        <div class="combatant-detail combatant-glitch is-one"></div>
        <div class="combatant-detail combatant-glitch is-two"></div>
        <div class="combatant-detail combatant-blade"></div>
      `;
    default:
      return "";
  }
}

// buildProgramBattlefieldMarkup() renders the active program as the foreground fighter on the left side.
function buildProgramBattlefieldMarkup(program, state, isCurrentTurn) {
  const statusMarkup = renderStatusPills(program.statusEffects);
  const effect = state.visualEffect || {};
  const programClass = `program-${getProgramSpriteClass(program)}`;
  const introClass = state.battleIntroPlaying ? `is-summoning is-stage-${state.battleIntroStage || "operator"}` : "";
  const figureClass = [
    "combat-battler",
    "combat-battler-player",
    programClass,
    introClass,
    isCurrentTurn ? "is-current" : "",
    effect.attackerKind === "program" && effect.attackerId === program.id ? `is-${effect.phase || "windup"}` : "",
    effect.targetKind === "program" && effect.targetId === program.id ? "is-hit" : "",
    program.hp <= 0 ? "is-fainted" : ""
  ].filter(Boolean).join(" ");

  return `
    <article class="${figureClass}" style="color: ${program.color};">
      <div class="combat-status-box combat-status-box-player">
        <div class="combat-name-row">
          <span class="combat-name">${program.name}</span>
          <span class="combat-lvl">LVL ${program.level}</span>
        </div>
        <div class="combat-subline">HP ${program.hp}/${program.maxHp}</div>
        ${renderBar(program.hp, program.maxHp, "is-hp")}
        <div class="combat-subline">XP ${program.xp}/${program.level * 100}</div>
        ${renderBar(program.xp, program.level * 100, "is-xp")}
        ${statusMarkup}
      </div>
      <div class="combat-battler-sprite-wrap">
        ${renderCombatantSprite(program, "program")}
        ${effect.phase === "impact" && effect.targetKind === "program" && effect.targetId === program.id ? `
          <div class="combat-hit-spark"></div>
          <div class="combat-damage-pop">-${effect.damage || 0}</div>
        ` : ""}
      </div>
    </article>
  `;
}

// buildProgramBenchMarkup() shows the rest of the party as smaller cards so the active fighter stays readable.
function buildProgramBenchMarkup(program, isCurrentTurn) {
  const statusMarkup = renderStatusPills(program.statusEffects);

  return `
    <article class="combat-reserve-card ${program.hp <= 0 ? "is-down" : ""} ${isCurrentTurn ? "is-active" : ""}" style="color: ${program.color};">
      <div class="combat-reserve-name">${program.name}</div>
      <div class="combat-reserve-meta">LVL ${program.level} | HP ${program.hp}/${program.maxHp}</div>
      ${statusMarkup}
    </article>
  `;
}

// buildThreatVisualMarkup() keeps the enemy side theatrical while still showing the threat's combat stats.
function buildThreatVisualMarkup(state) {
  const threat = state.threat;
  const statusMarkup = renderStatusPills(threat.statusEffects);
  const effect = state.visualEffect || {};
  const threatClass = `threat-${getThreatSpriteClass(threat)}`;
  const figureClass = [
    "combat-battler",
    "combat-battler-enemy",
    threatClass,
    effect.attackerKind === "threat" && effect.attackerId === threat.id ? `is-${effect.phase || "windup"}` : "",
    effect.targetKind === "threat" && effect.targetId === threat.id ? "is-hit" : "",
    threat.hp <= 0 ? "is-fainted" : ""
  ].filter(Boolean).join(" ");

  return `
    <article class="${figureClass}" style="color: #ff2233;">
      <div class="combat-battler-sprite-wrap">
        ${renderCombatantSprite(threat, "threat")}
        ${effect.phase === "impact" && effect.targetKind === "threat" && effect.targetId === threat.id ? `
          <div class="combat-hit-spark"></div>
          <div class="combat-damage-pop">-${effect.damage || 0}</div>
        ` : ""}
      </div>
      <div class="combat-status-box combat-status-box-enemy">
        <div class="combat-name-row">
          <span class="combat-name">${threat.title}</span>
          <span class="combat-lvl">LVL ${threat.level}</span>
        </div>
        <div class="combat-subline">HP ${threat.hp}/${threat.maxHp}</div>
        ${renderBar(threat.hp, threat.maxHp, "is-hp")}
        <div class="combat-subline">WEAK TO: ${String(getActorCombatType(threat, true) || "UNKNOWN").toUpperCase()}</div>
        ${statusMarkup}
      </div>
    </article>
  `;
}

// buildActionButtonMarkup() renders only the current actor's moves so the bottom bar feels like a battle menu.
function buildActionButtonMarkup(state) {
  const currentActor = state.turnOrder[state.currentTurnIndex];

  if (state.actionLocked) {
    return '<div class="combat-action-note">EXECUTING MOVE...</div>';
  }

  if (!currentActor || currentActor.kind !== "program" || currentActor.ref.hp <= 0) {
    return `
      <div class="combat-action-note">THREAT TURN IN PROGRESS.</div>
    `;
  }

  const actor = currentActor.ref;
  const commandMode = state.commandMode || "main";
  const firewall = programs.find((program) => program.id === "firewall-7" && program.hp > 0);
  const ids = programs.find((program) => program.id === "ids-4" && program.hp > 0);
  const honeypot = programs.find((program) => program.id === "honeypot-3" && program.hp > 0);
  const antivirus = programs.find((program) => program.id === "antivirus-9" && program.hp > 0);

  if (commandMode === "programs") {
    return `
      <div class="combat-command-subtitle">ACTIVE PARTY</div>
      <div class="combat-party-grid">
        ${state.playerParty.map((program) => `
          <div class="combat-party-card ${program.id === actor.id ? "is-active" : ""} ${program.hp <= 0 ? "is-down" : ""}">
            <div class="combat-party-name">${program.name}</div>
            <div class="combat-party-meta">HP ${program.hp}/${program.maxHp}</div>
            <div class="combat-party-meta">LVL ${program.level}</div>
            ${program.id === actor.id ? '<div class="combat-party-tag">ACTIVE</div>' : ""}
          </div>
        `).join("")}
      </div>
      <div class="combat-action-note">SWITCHING COMING SOON.</div>
      <div class="combat-command-back-row">
        <button class="combat-action-button is-secondary" type="button" data-combat-command="back">BACK</button>
      </div>
    `;
  }

  if (commandMode === "items") {
    return `
      <div class="combat-command-subtitle">ITEMS</div>
      <div class="combat-command-empty">NO RECOVERY ITEMS AVAILABLE.</div>
      <div class="combat-command-back-row">
        <button class="combat-action-button is-secondary" type="button" data-combat-command="back">BACK</button>
      </div>
    `;
  }

  if (commandMode === "attack") {
    const comboButtons = [];

    if (firewall && ids && state.responseGauge >= 3) {
      comboButtons.push(`
        <button class="combat-action-button is-secondary" type="button" data-combat-combo="sync-defense">
          <span class="combat-command-name">SYNCHRONIZED DEFENSE</span>
          <span class="combat-command-cost">COST 3</span>
        </button>
      `);
    }

    if (honeypot && antivirus && state.responseGauge >= 3) {
      comboButtons.push(`
        <button class="combat-action-button is-secondary" type="button" data-combat-combo="containment-protocol">
          <span class="combat-command-name">CONTAINMENT PROTOCOL</span>
          <span class="combat-command-cost">COST 3</span>
        </button>
      `);
    }

    return `
      <div class="combat-command-subtitle">CHOOSE AN ACTION FOR ${actor.name.toUpperCase()}</div>
      <div class="combat-command-grid is-ability-grid">
        ${actor.abilities.map((ability, index) => {
          const canUse = state.responseGauge >= ability.cost;
          const currentCharges = getMoveChargeCount(ability);
          const maxCharges = Number.isFinite(ability.maxCharges) ? ability.maxCharges : currentCharges;
          const outOfCharges = currentCharges <= 0;
          const disabledClass = outOfCharges ? "is-disabled" : "";
          const moveAccuracy = Number.isFinite(ability.accuracy) ? `${ability.accuracy}% ACC` : null;
          const moveCharges = `CHG ${currentCharges}/${maxCharges}`;
          const moveMeta = [ability.domain, ability.category]
            .filter(Boolean)
            .map((value) => String(value).toUpperCase())
            .concat([`PWR ${Number.isFinite(ability.power) ? ability.power : ability.baseDamage || 0}`, moveAccuracy, moveCharges].filter(Boolean))
            .join(" / ");
          return `
            <button class="combat-action-button ${disabledClass}" type="button" data-combat-ability="${index}" data-combat-ability-id="${ability.id || ""}" data-ability-cost="${ability.cost}" ${outOfCharges ? "disabled" : ""}>
              <span class="combat-command-name">${ability.name.toUpperCase()}</span>
              <span class="combat-command-cost">${moveMeta}${canUse ? "" : " / NO GAUGE"}</span>
            </button>
          `;
        }).join("")}
        <button class="combat-action-button is-secondary" type="button" data-combat-command="back">BACK</button>
      </div>
      ${comboButtons.length ? `<div class="combat-command-subtitle is-secondary">COMBO OPTIONS</div><div class="combat-ability-row">${comboButtons.join("")}</div><div class="combat-action-note">RESPONSE GAUGE ${state.responseGauge}/100</div>` : ""}
    `;
  }

  return `
    <div class="combat-command-grid is-main-grid">
      <button class="combat-action-button is-primary" type="button" data-combat-command="attack">
        <span class="combat-command-name">ATTACK</span>
        <span class="combat-command-cost">OPEN MOVES</span>
      </button>
      <button class="combat-action-button is-primary" type="button" data-combat-command="programs">
        <span class="combat-command-name">PROGRAMS</span>
        <span class="combat-command-cost">PARTY</span>
      </button>
      <button class="combat-action-button is-primary" type="button" data-combat-command="items">
        <span class="combat-command-name">ITEMS</span>
        <span class="combat-command-cost">SUPPLIES</span>
      </button>
      <button class="combat-action-button is-primary" type="button" data-combat-command="run">
        <span class="combat-command-name">RUN</span>
        <span class="combat-command-cost">FLEE</span>
      </button>
    </div>
  `;
}

// buildCombatMarkup() turns the battle into a battlefield scene with one featured program and one featured threat.
function buildCombatMarkup(state) {
  const currentProgram = getActiveBattleProgram(state);
  const introStage = state.battleIntroStage || "operator";
  const introStageClass = `is-stage-${introStage}`;
  const commandBoxClass = state.battleIntroPlaying ? "is-intro-hidden" : "is-intro-revealed";

  return `
    <div class="combat-shell ${state.battleIntroPlaying ? "is-intro-playing" : ""}">
      <header class="combat-header">
        <div class="combat-title-block">
          <div class="combat-panel-title">THREATGRID ARENA</div>
          <div class="combat-encounter-name">${state.threat.title} / LVL ${state.threat.level}</div>
        </div>
        <div class="combat-turn-preview">
          <div class="combat-panel-title">TURN ORDER</div>
          <div class="combat-turn-preview-row">
            ${buildTurnOrderMarkup(state)}
          </div>
        </div>
      </header>

      <section class="combat-stage">
        <div class="combat-floor-grid" aria-hidden="true"></div>
        <div class="combat-stage-glow" aria-hidden="true"></div>
        ${state.battleIntroPlaying ? `
          <div class="combat-summon-overlay ${introStageClass}" aria-hidden="true">
            <div class="combat-summon-operator">
              <span class="combat-summon-operator-body"></span>
              <span class="combat-summon-operator-arm"></span>
              <span class="combat-summon-operator-hand"></span>
            </div>
            <div class="combat-summon-arc"></div>
            <div class="combat-summon-cue"></div>
            <div class="combat-summon-disc"></div>
            <div class="combat-summon-ring"></div>
            <div class="combat-summon-glyph"></div>
            <div class="combat-summon-flash"></div>
          </div>
        ` : ""}
        ${state.visualEffect && state.visualEffect.style === "beam" ? `
          <div class="combat-beam ${state.visualEffect.attackerKind === "program" ? "from-player" : "from-enemy"} ${state.visualEffect.phase === "impact" ? "is-impact" : ""}"></div>
        ` : ""}
        ${state.visualEffect && state.visualEffect.style === "buff" ? `
          <div class="combat-aura ${state.visualEffect.attackerKind === "program" ? "from-player" : "from-enemy"} ${state.visualEffect.phase === "impact" ? "is-impact" : ""}"></div>
        ` : ""}
        <div class="combat-stage-enemy">
          ${buildThreatVisualMarkup(state)}
        </div>
        <div class="combat-stage-player">
          ${buildProgramBattlefieldMarkup(currentProgram, state, state.activeProgramId === currentProgram.id)}
        </div>
        <div class="combat-reserve-strip">
          <div class="combat-reserve-row">
            ${buildReserveStripMarkup(state, currentProgram.id)}
          </div>
        </div>
      </section>

      <footer class="combat-footer">
        <div class="combat-footer-left">
          <div class="combat-voice-box">
            <div class="combat-panel-title">TACTICAL BRIEF</div>
            <div id="battle-message" class="combat-voice-text">${getBattleMessageText(state)}</div>
          <div id="battle-submessage" class="combat-voice-subtext">${getBattleSubmessageText(state)}</div>
          <div id="battle-log" class="combat-history-strip">${buildBattleLogMarkup(state)}</div>
        </div>

          <div class="combat-command-box ${commandBoxClass}">
            <div class="combat-panel-title">COMMAND DECK</div>
            ${buildActionButtonMarkup(state)}
            <div class="combat-gauge-wrap">
              <div class="combat-gauge-label">TACTICAL GAUGE</div>
              ${renderBar(state.responseGauge, 100, "is-gauge")}
              <div class="combat-gauge-text">${state.responseGauge}/100</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `;
}

// buildRewardMarkup() keeps the player on the victory screen until they decide whether to continue or quit.
function buildRewardMarkup(state, rewardLines) {
  return `
    <div class="battle-reward-screen">
      <div class="battle-end-headline">VICTORY</div>
      <div class="terminal-rule" aria-hidden="true"></div>
      <div class="battle-reward-copy">THREAT NEUTRALIZED. XP GAINED. PARTY STATUS PRESERVED.</div>
      <div class="battle-reward-lines">
        ${rewardLines.map((line) => `<div class="battle-reward-line ${line.levelUp ? "is-levelup" : ""}">${line.text}</div>`).join("")}
      </div>
      <div class="battle-reward-actions">
        <button class="battle-reward-button" type="button" data-combat-next>CONTINUE EXPEDITION</button>
        <button class="battle-reward-button" type="button" data-combat-menu>BACK TO MENU</button>
      </div>
    </div>
  `;
}

// buildBattleLostMarkup() keeps the defeat flow stark and brief so the player can restart quickly.
function buildBattleLostMarkup() {
  const defeatLine = typeof getPantheonDefeatLine === "function" ? getPantheonDefeatLine() : "";

  return `
    <div class="battle-end-screen">
      <div class="battle-end-headline">BATTLE LOST</div>
      <div class="terminal-rule" aria-hidden="true"></div>
      <div class="battle-end-copy">
        THE PARTY WAS WIPED OUT.
        <br>
        THE THREAT REMAINS ACTIVE.
      </div>
      ${defeatLine ? `<div class="battle-end-copy is-secondary">${defeatLine}</div>` : ""}
      <div class="battle-end-actions">
        <button class="battle-end-button" type="button" data-combat-menu>BACK TO MENU</button>
      </div>
    </div>
  `;
}

// renderCombatScreen() swaps the panel HTML and rebinds the buttons for the current battle state.
function renderCombatScreen() {
  if (!combatState) {
    return;
  }

  threatPanelContent.innerHTML = buildCombatMarkup(combatState);
  threatPanelContent.scrollTop = 0;
  threatPanel.classList.add("is-open", "is-combat");
  threatPanel.setAttribute("aria-hidden", "false");

  const battleLog = document.getElementById("battle-log");
  if (battleLog) {
    battleLog.scrollTop = battleLog.scrollHeight;
  }

  bindCombatButtons();
}

// renderCombatReward() replaces the battle grid with a victory summary and the next-step buttons.
function renderCombatReward(rewardLines) {
  threatPanelContent.innerHTML = buildRewardMarkup(combatState, rewardLines);
  threatPanelContent.scrollTop = 0;
  threatPanel.classList.add("is-open", "is-combat");
  threatPanel.setAttribute("aria-hidden", "false");
  bindCombatButtons();
}

// renderBattleLostScreen() shows the failure branch without tearing down the overlay instantly.
function renderBattleLostScreen() {
  threatPanelContent.innerHTML = buildBattleLostMarkup();
  threatPanelContent.scrollTop = 0;
  threatPanel.classList.add("is-open", "is-combat");
  threatPanel.setAttribute("aria-hidden", "false");
  bindCombatButtons();
}

// bindCombatButtons() reattaches button listeners after each render because the combat pane is rebuilt often.
function bindCombatButtons() {
  const actor = combatState ? combatState.turnOrder[combatState.currentTurnIndex] : null;

  threatPanelContent.querySelectorAll("[data-combat-command]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!combatState || !actor || actor.kind !== "program" || combatState.actionLocked) {
        return;
      }

      const command = button.getAttribute("data-combat-command");

      if (command === "back") {
        combatState.commandMode = "main";
        combatState.battleMessage = "";
        combatState.battleSubmessage = "";
        renderCombatScreen();
        return;
      }

      if (command === "attack") {
        combatState.commandMode = "attack";
        combatState.battleMessage = "";
        combatState.battleSubmessage = "";
        renderCombatScreen();
        return;
      }

      if (command === "programs") {
        combatState.commandMode = "programs";
        combatState.battleMessage = "";
        combatState.battleSubmessage = "";
        renderCombatScreen();
        return;
      }

      if (command === "items") {
        combatState.commandMode = "items";
        combatState.battleMessage = "";
        combatState.battleSubmessage = "";
        renderCombatScreen();
        return;
      }

      if (command === "run") {
        combatState.battleMessage = "CANNOT FLEE FROM AN ACTIVE THREAT.";
        combatState.battleSubmessage = "THREAT LOCK ENGAGED.";
        renderCombatScreen();
      }
    });
  });

  threatPanelContent.querySelectorAll("[data-combat-ability]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!combatEngine || !actor || actor.kind !== "program" || combatState.actionLocked) {
        return;
      }

      const abilityIndex = Number(button.getAttribute("data-combat-ability"));
      const abilityId = button.getAttribute("data-combat-ability-id");
      const ability = abilityId
        ? actor.ref.abilities.find((candidate) => candidate && candidate.id === abilityId)
        : actor.ref.abilities[abilityIndex];

      console.log("[Move Debug] selected move id:", abilityId || abilityIndex);
      console.log("[Move Debug] active defender:", actor.ref?.id || actor.ref?.name);
      console.log("[Move Debug] move before execute:", ability);
      console.log("[Move Debug] charges before execute:", getMoveChargeCount(ability));

      if (!ability) {
        return;
      }

      if (getMoveChargeCount(ability) <= 0) {
        combatState.battleMessage = "NO CHARGES REMAINING.";
        combatState.battleSubmessage = "SELECT A DIFFERENT MOVE.";
        addBattleLog(`${actor.ref.name.toUpperCase()} TRIED ${ability.name.toUpperCase()} BUT HAD NO CHARGES LEFT.`, "buff");
        renderCombatScreen();
        return;
      }

      const requiredGauge = Number(button.getAttribute("data-ability-cost") || ability.cost || 0);
      console.log("[Move Debug] response gauge:", combatState.responseGauge, "required gauge:", requiredGauge);
      if (combatState.responseGauge < requiredGauge) {
        combatState.battleMessage = "NOT ENOUGH RESPONSE GAUGE.";
        combatState.battleSubmessage = "BUILD GAUGE OR CHOOSE ANOTHER COMMAND.";
        renderCombatScreen();
        return;
      }

      combatEngine.takeTurn(actor, ability);
    });
  });

  threatPanelContent.querySelectorAll("[data-combat-combo]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!combatEngine || !actor || actor.kind !== "program" || combatState.actionLocked) {
        return;
      }

      const comboKey = button.getAttribute("data-combat-combo");
      combatEngine.takeTurn(actor, {
        name: comboKey === "sync-defense" ? "Synchronized Defense" : "Containment Protocol",
        cost: 3,
        baseDamage: comboKey === "sync-defense" ? 15 : 18,
        effect: comboKey === "sync-defense" ? "combo_sync_defense" : "combo_containment"
      });
    });
  });

  const nextButton = threatPanelContent.querySelector("[data-combat-next]");
  if (nextButton) {
    nextButton.addEventListener("click", () => {
      returnToGlobeFromCombat();
    });
  }

  const menuButton = threatPanelContent.querySelector("[data-combat-menu]");
  if (menuButton) {
    menuButton.addEventListener("click", () => {
      closeCombatOverlay(true);
      showMenu();
    });
  }
}
