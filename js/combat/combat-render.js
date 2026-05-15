/* Combat render helpers keep the layered battlefield markup isolated from the app wiring. */

// renderStatusPills() keeps the status-effect labels compact and color-coded.
function renderStatusPills(statusEffects = []) {
  if (!statusEffects.length) {
    return "";
  }

  return `
    <div class="status-pill-row">
      ${statusEffects.map((status) => {
        const normalized = typeof normalizeCombatantStatusEffect === "function" ? normalizeCombatantStatusEffect(status) : null;
        const statusId = normalized?.id || String(status || "").toLowerCase();
        const className = statusId === "detected"
          ? "is-cyan"
          : statusId === "isolated"
            ? "is-alert"
            : statusId === "rot"
              ? "is-rot"
              : statusId === "flood"
                ? "is-flood"
                : "";
        const label = normalized && Number.isFinite(normalized.duration) && normalized.duration > 0
          ? `${normalized.label} ${normalized.duration}T`
          : normalized?.label || String(status).replace(/_/g, " ").toUpperCase();
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

// buildPantheonBoonBriefMarkup() shows the active and opening Protocol God boon effects without adding a new screen.
function buildPantheonBoonBriefMarkup(state) {
  const boonLines = Array.isArray(state.pantheonBoonMessages) ? state.pantheonBoonMessages : [];

  if (!boonLines.length) {
    return "";
  }

  return `
    <div class="combat-boon-panel">
      <div class="combat-panel-title">PANTHEON BOONS</div>
      <div class="combat-boon-list">
        ${boonLines.map((line) => `
          <div class="combat-boon-line ${line.status ? `is-${line.status}` : ""}">
            <span class="combat-boon-label">${line.label}</span>
            <span class="combat-boon-text">${line.text}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// buildActionableIntentBrief() renders the current threat forecast inside the tactical brief.
function buildActionableIntentBrief(intent, threat, battleState) {
  const safeIntent = intent && typeof intent === "object" ? intent : null;

  if (!safeIntent) {
    return "";
  }

  const panelLabel = battleState?.enemyForecastActive ? "ORACLE FORECAST" : "ENEMY INTENT";
  const threatName = String(threat?.title || "THE THREAT").toUpperCase();
  const intentLabel = String(safeIntent.label || "STRIKE").toUpperCase();
  const effectText = String(safeIntent.effectText || "Effect: Enemy deals normal damage.");
  const counterplayText = String(safeIntent.counterplayText || "Counterplay: Attack, defend, or use support.");
  const descriptionText = String(safeIntent.description || "The threat is preparing a direct attack.");
  const repeatSuffix = safeIntent.repeated ? " AGAIN" : "";
  const forecastNote = safeIntent.repeated ? `<div class="combat-intent-note is-repeat">REGENERATED FORECAST.</div>` : "";

  return `
    <div class="combat-intent-panel">
      <div class="combat-panel-title">${panelLabel}</div>
      <div class="combat-intent-headline">${threatName} PREPARES ${intentLabel}${repeatSuffix}.</div>
      <div class="combat-intent-text">${descriptionText}</div>
      <div class="combat-intent-effect">${effectText}</div>
      <div class="combat-intent-counterplay">${counterplayText}</div>
      ${battleState?.enemyForecastActive ? `<div class="combat-intent-note">ORACLE-9 CLARIFIES THE FORECAST.</div>` : ""}
      ${forecastNote}
    </div>
  `;
}

// buildEnemyIntentBrief() keeps the Tactical Brief hooked to the currently prepared enemy forecast.
function buildEnemyIntentBrief(state) {
  return buildActionableIntentBrief(state?.enemyIntent, state?.threat, state);
}

// buildFocusAvailabilityBrief() explains when FOCUS is the safe fallback for an active Defender.
function buildFocusAvailabilityBrief(state) {
  const currentActor = state?.turnOrder?.[state.currentTurnIndex];
  if (!currentActor || currentActor.kind !== "program" || currentActor.ref.hp <= 0) {
    return "";
  }

  const noUsableMoves = typeof hasUsableMove === "function" ? !hasUsableMove(currentActor.ref, state) : false;
  if (!noUsableMoves) {
    return "";
  }

  const actorName = String(currentActor.ref.name || "THIS DEFENDER").toUpperCase();
  return `
    <div class="combat-focus-hint-panel">
      <div class="combat-panel-title">FOCUS</div>
      <div class="combat-focus-hint-line">NO EXECUTABLE MOVES AVAILABLE.</div>
      <div class="combat-focus-hint-line is-secondary">${actorName} CAN FOCUS TO RECOVER TACTICAL GAUGE AND PASS THIS TURN.</div>
    </div>
  `;
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

// buildFocusCommandMarkup() renders the fallback command that always ends the active Defender's turn.
function buildFocusCommandMarkup(state) {
  const currentActor = state?.turnOrder?.[state.currentTurnIndex];
  if (!currentActor || currentActor.kind !== "program" || currentActor.ref.hp <= 0) {
    return "";
  }

  const noUsableMoves = typeof hasUsableMove === "function" ? !hasUsableMove(currentActor.ref, state) : false;

  return `
    <div class="combat-focus-row battle-command-focus-row ${noUsableMoves ? "is-focus-needed" : ""}">
      <button class="combat-action-button is-secondary combat-focus-button battle-command-choice battle-command-choice--focus ${noUsableMoves ? "is-focus-needed" : ""}" type="button" data-combat-command="focus">
        <span class="combat-command-name">FOCUS</span>
        <span class="combat-command-cost">RECOVER GAUGE / END TURN</span>
      </button>
    </div>
  `;
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
  const displayLevel = Number.isFinite(threat?.battleLevel) ? threat.battleLevel : threat.level;
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
          <span class="combat-lvl">LVL ${displayLevel}</span>
        </div>
        <div class="combat-subline">HP ${threat.hp}/${threat.maxHp}</div>
        ${renderBar(threat.hp, threat.maxHp, "is-hp")}
        <div class="combat-subline">WEAK TO: ${String(getActorCombatType(threat, true) || "UNKNOWN").toUpperCase()}</div>
        ${state.enemyIntent ? `
          <div class="combat-subline is-intent">INTENT: ${String(state.enemyIntent.label || "STRIKE").toUpperCase()}</div>
          <div class="combat-subline is-intent-hint">${String(state.enemyIntent.iconLabel || state.enemyIntent.severity || "").toUpperCase()}</div>
        ` : ""}
        ${statusMarkup}
      </div>
    </article>
  `;
}

// buildActionButtonMarkup() renders only the current actor's moves so the bottom bar feels like a battle menu.
function buildAttackMoveButtonMarkup(ability, index, availability) {
  const currentCharges = availability.charges;
  const maxCharges = availability.maxCharges;
  const isNoCharges = availability.reason === "charges";
  const isGaugeLow = availability.reason === "gauge";
  const disabledClass = isNoCharges ? "is-disabled" : isGaugeLow ? "is-gauge-low" : "is-ready";
  const moveAccuracy = Number.isFinite(ability.accuracy) ? `${ability.accuracy}% ACC` : null;
  const moveCharges = `CHG ${currentCharges}/${maxCharges}`;
  const moveMeta = [ability.domain, ability.category]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase())
    .concat([`PWR ${Number.isFinite(ability.power) ? ability.power : ability.baseDamage || 0}`, moveAccuracy, moveCharges].filter(Boolean))
    .join(" / ");
  const requirementMeta = isNoCharges
    ? availability.message || "NO CHARGES REMAINING."
    : isGaugeLow
      ? `${availability.message || "NOT ENOUGH TACTICAL GAUGE."} CURRENT ${availability.currentGauge}.`
      : availability.requiredGauge > 0
        ? `REQUIRES ${availability.requiredGauge} TACTICAL GAUGE.`
        : "NO TACTICAL GAUGE REQUIRED.";

  return `
    <button class="combat-action-button battle-move-option ${disabledClass}" type="button" data-combat-ability="${index}" data-combat-ability-id="${ability.id || ""}" data-ability-cost="${ability.cost}" data-availability-reason="${availability.reason}" ${isNoCharges ? 'aria-disabled="true"' : ""}>
      <span class="combat-command-name">${ability.name.toUpperCase()}</span>
      <span class="combat-command-meta">${moveMeta}</span>
      <span class="combat-command-cost">${requirementMeta}</span>
      <span class="combat-command-detail">${availability.canUse ? "READY TO EXECUTE." : availability.detail || availability.message || "SELECT ANOTHER MOVE."}</span>
    </button>
  `;
}

function buildAttackComboButtonsMarkup(state, extraClass = "") {
  const firewall = programs.find((program) => program.id === "firewall-7" && program.hp > 0);
  const ids = programs.find((program) => program.id === "ids-4" && program.hp > 0);
  const honeypot = programs.find((program) => program.id === "honeypot-3" && program.hp > 0);
  const antivirus = programs.find((program) => program.id === "antivirus-9" && program.hp > 0);
  const classSuffix = extraClass ? ` ${extraClass}` : "";
  const comboButtons = [];

  if (firewall && ids && state.responseGauge >= 3) {
    comboButtons.push(`
      <button class="combat-action-button is-secondary battle-move-option${classSuffix}" type="button" data-combat-combo="sync-defense">
        <span class="combat-command-name">SYNCHRONIZED DEFENSE</span>
        <span class="combat-command-cost">COST 3</span>
      </button>
    `);
  }

  if (honeypot && antivirus && state.responseGauge >= 3) {
    comboButtons.push(`
      <button class="combat-action-button is-secondary battle-move-option${classSuffix}" type="button" data-combat-combo="containment-protocol">
        <span class="combat-command-name">CONTAINMENT PROTOCOL</span>
        <span class="combat-command-cost">COST 3</span>
      </button>
    `);
  }

  return comboButtons;
}

function shouldAllowFooterAttackFallback() {
  if (typeof window === "undefined") {
    return true;
  }

  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(max-width: 700px)").matches;
  }

  return window.innerWidth <= 700;
}

function buildAttackStageFanMarkup(state) {
  const allowFooterFallback = shouldAllowFooterAttackFallback();
  const shouldForceFooterFallback = Boolean(state?.forceFooterAttackList && allowFooterFallback);
  console.log("[Attack Prototype] commandMode:", state?.commandMode);
  console.log("[Attack Prototype] overlay helper called:", true);
  console.log("[Attack Prototype] actionLocked:", state?.actionLocked);
  console.log("[Attack Prototype] forceFooterAttackList:", state?.forceFooterAttackList);
  console.log("[Attack Prototype] footer fallback allowed:", allowFooterFallback);
  if (!state || state.commandMode !== "attack" || state.actionLocked || shouldForceFooterFallback) {
    let fallbackReason = "missing state";
    if (state) {
      if (state.commandMode !== "attack") {
        fallbackReason = "commandMode is not attack";
      } else if (state.actionLocked) {
        fallbackReason = "action locked";
      } else if (shouldForceFooterFallback) {
        fallbackReason = "forceFooterAttackList enabled in narrow fallback mode";
      }
    }
    console.log("[Attack Prototype] fan enabled:", false);
    console.log("[Attack Prototype] fallback reason:", fallbackReason);
    return "";
  }

  const currentActor = state.turnOrder[state.currentTurnIndex];
  if (!currentActor || currentActor.kind !== "program" || currentActor.ref.hp <= 0) {
    console.log("[Attack Prototype] actor invalid for stage fan:", currentActor?.kind, currentActor?.ref?.hp);
    console.log("[Attack Prototype] fan enabled:", false);
    console.log("[Attack Prototype] fallback reason:", "active actor missing or not a living program");
    return "";
  }

  const actor = currentActor.ref;
  console.log("[Attack Prototype] actor:", actor?.name);
  console.log("[Attack Prototype] ability count:", actor?.abilities?.length);
  if (!Array.isArray(actor.abilities) || !actor.abilities.length || actor.abilities.length > 4) {
    const fallbackReason = !Array.isArray(actor.abilities)
      ? "abilities missing"
      : !actor.abilities.length
        ? "no abilities"
        : "ability count exceeds stage fan limit";
    console.log("[Attack Prototype] fan enabled:", false);
    console.log("[Attack Prototype] fallback reason:", fallbackReason);
    return "";
  }

  console.log("[Attack Prototype] fan enabled:", true);

  const moveCards = actor.abilities.map((ability, index) => {
    const availability = typeof getMoveUseAvailability === "function" ? getMoveUseAvailability(ability, state) : {
      canUse: state.responseGauge >= ability.cost && getMoveChargeCount(ability) > 0,
      reason: state.responseGauge >= ability.cost ? "ready" : "gauge",
      message: "",
      detail: "",
      charges: getMoveChargeCount(ability),
      maxCharges: Number.isFinite(ability.maxCharges) ? ability.maxCharges : getMoveChargeCount(ability),
      requiredGauge: Number.isFinite(ability.cost) ? ability.cost : 0,
      currentGauge: state.responseGauge
    };
    const availabilityClass = availability.canUse
      ? "is-ready"
      : availability.reason === "gauge"
        ? "is-gauge-low"
        : "is-blocked";
    const fanClass = index === 0 ? "is-primary" : "is-secondary";

    return `
      <div class="combat-attack-move-shell" style="--attack-fan-index:${index}">
        ${buildAttackMoveButtonMarkup(ability, index, availability).replace(
          'class="combat-action-button battle-move-option',
          `class="combat-action-button battle-move-option move-slot combat-attack-stage-card ${fanClass} ${availabilityClass}`
        )}
      </div>
    `;
  }).join("");

  return `
    <div class="combat-attack-stage-overlay move-lens" aria-label="Attack move fan" data-prototype-attack-overlay="true">
      <div class="combat-attack-stage-fan combat-attack-move-lens">
        ${moveCards}
      </div>
    </div>
  `;
}

function buildAttackStageUtilityMarkup(state) {
  const allowFooterFallback = shouldAllowFooterAttackFallback();
  if (!state || state.commandMode !== "attack" || state.actionLocked || (state.forceFooterAttackList && allowFooterFallback)) {
    return "";
  }

  const currentActor = state.turnOrder?.[state.currentTurnIndex];
  if (!currentActor || currentActor.kind !== "program" || currentActor.ref.hp <= 0) {
    return "";
  }

  const focusNeeded = typeof hasUsableMove === "function" ? !hasUsableMove(currentActor.ref, state) : false;
  const comboButtons = buildAttackComboButtonsMarkup(state, "combat-attack-prompt combat-attack-combo-prompt combat-attack-hitbox");

  return `
    <div class="combat-attack-utility-strip" aria-label="Attack controls">
      <div class="combat-attack-prompt-rail">
        <button class="combat-action-button is-secondary combat-attack-prompt combat-attack-back-prompt combat-attack-hitbox" type="button" data-combat-command="back">
          <span class="combat-attack-prompt-key">BACK</span>
          <span class="combat-attack-prompt-copy">RETURN</span>
        </button>
        ${comboButtons.join("")}
      </div>
      <div class="resource-ribbon combat-attack-resource-ribbon">
        <button class="combat-action-button is-secondary combat-focus-button focus-plate combat-attack-focus-prompt combat-attack-hitbox ${focusNeeded ? "is-focus-needed" : ""}" type="button" data-combat-command="focus">
          <span class="plate-title">FOCUS</span>
          <span class="plate-copy">Recover Gauge / End Turn</span>
        </button>
        <div class="gauge-lens combat-attack-gauge-lens combat-attack-hitbox ${focusNeeded ? "is-focus-needed" : ""}">
          <div class="gauge-head">
            <span class="gauge-label">TACTICAL GAUGE</span>
            <strong class="gauge-value">${state.responseGauge}/100</strong>
          </div>
          <div class="gauge-track" aria-hidden="true">
            <span class="gauge-fill" style="width:${state.responseGauge}%"></span>
          </div>
          <div class="gauge-caption">${focusNeeded ? "Focus reopens high-cost moves." : "Gauge gates high-cost moves."}</div>
        </div>
      </div>
    </div>
  `;
}

function buildAttackPartyRailMarkup(state) {
  const currentActor = state?.turnOrder?.[state.currentTurnIndex];
  if (!currentActor || currentActor.kind !== "program") {
    return "";
  }

  return `
    <div class="party-rail combat-attack-party-rail combat-attack-hitbox" aria-label="Defender lineup">
      ${state.playerParty.map((program) => `
        <div class="party-mark combat-attack-party-mark ${program.id === currentActor.ref.id ? "is-active" : ""} ${program.hp <= 0 ? "is-down" : ""}">
          <span class="party-dot combat-attack-party-dot"></span>
          <span class="party-copy combat-attack-party-copy">${program.name}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function buildAttackStageOverlayMarkup(state) {
  const fanMarkup = buildAttackStageFanMarkup(state);
  console.log("[Attack Prototype] overlay markup inserted:", Boolean(fanMarkup));
  if (!fanMarkup) {
    return "";
  }

  return `
    <div class="combat-attack-overlay" aria-label="Attack battlefield overlay">
      ${buildAttackPartyRailMarkup(state)}
      <div class="combat-attack-cluster command-anchor">
        <div class="combat-attack-main">
          ${fanMarkup}
          ${buildAttackStageUtilityMarkup(state)}
        </div>
      </div>
    </div>
  `;
}

function syncAttackFanFallbackState(state) {
  if (!state) {
    return;
  }

  const currentActor = state.turnOrder?.[state.currentTurnIndex];
  const actorId = currentActor?.kind === "program"
    ? String(currentActor.ref?.id || currentActor.ref?.name || "")
    : "";

  const allowFooterFallback = shouldAllowFooterAttackFallback();
  console.log("[Attack Prototype] active actor:", currentActor?.ref?.name);
  console.log("[Attack Prototype] forceFooterAttackList:", state.forceFooterAttackList);
  console.log("[Attack Prototype] footer fallback allowed:", allowFooterFallback);

  if (state.commandMode !== "attack") {
    state.forceFooterAttackList = false;
    state.attackFanFallbackActorId = "";
    state.attackFanFallbackReason = "";
    state.attackFanActiveActorId = actorId;
    return;
  }

  if (!allowFooterFallback && state.forceFooterAttackList) {
    console.log("[Attack Prototype] clearing desktop forceFooterAttackList");
    state.forceFooterAttackList = false;
    state.attackFanFallbackActorId = "";
    state.attackFanFallbackReason = "";
  }

  if (state.attackFanFallbackActorId && actorId && state.attackFanFallbackActorId !== actorId) {
    console.log("[Attack Fan] resetting fallback for new actor:", currentActor?.ref?.name);
    state.forceFooterAttackList = false;
    state.attackFanFallbackActorId = "";
    state.attackFanFallbackReason = "";
  }

  state.attackFanActiveActorId = actorId;
}

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
    const allowFooterFallback = shouldAllowFooterAttackFallback();
    const moveButtons = actor.abilities.map((ability, index) => {
      const availability = typeof getMoveUseAvailability === "function" ? getMoveUseAvailability(ability, state) : {
        canUse: state.responseGauge >= ability.cost && getMoveChargeCount(ability) > 0,
        reason: state.responseGauge >= ability.cost ? "ready" : "gauge",
        message: "",
        detail: "",
        charges: getMoveChargeCount(ability),
        maxCharges: Number.isFinite(ability.maxCharges) ? ability.maxCharges : getMoveChargeCount(ability),
        requiredGauge: Number.isFinite(ability.cost) ? ability.cost : 0,
        currentGauge: state.responseGauge
      };

      return buildAttackMoveButtonMarkup(ability, index, availability);
    }).join("");
    const useStageAttackFan = (!state.forceFooterAttackList || !allowFooterFallback) && actor.abilities.length > 0 && actor.abilities.length <= 4;
    const renderingOldFooterAttackList = !useStageAttackFan;
    console.log("[Attack Prototype] footer attack branch actor:", actor?.name);
    console.log("[Attack Prototype] attackStageActive:", useStageAttackFan);
    console.log("[Attack Prototype] rendering old footer attack list:", renderingOldFooterAttackList);
    if (!useStageAttackFan) {
      const fallbackReason = state.forceFooterAttackList
        ? "forceFooterAttackList enabled"
        : actor.abilities.length <= 0
          ? "no abilities"
          : "ability count exceeds stage fan limit";
      console.log("[Attack Prototype] fallback reason:", fallbackReason);
    }
    const comboButtons = buildAttackComboButtonsMarkup(state);

    if (!useStageAttackFan) {
      return `
        <div class="combat-command-subtitle">CHOOSE AN ACTION FOR ${actor.name.toUpperCase()}</div>
        <div class="combat-command-grid is-ability-grid">
          ${moveButtons}
        </div>
        <div class="combat-command-back-row">
          <button class="combat-action-button is-secondary" type="button" data-combat-command="back">BACK</button>
        </div>
        ${comboButtons.length ? `<div class="combat-command-subtitle is-secondary">COMBO OPTIONS</div><div class="combat-ability-row">${comboButtons.join("")}</div><div class="combat-action-note">RESPONSE GAUGE ${state.responseGauge}/100</div>` : ""}
        ${comboButtons.length ? "" : `<div class="combat-action-note">RESPONSE GAUGE ${state.responseGauge}/100</div>`}
      `;
    }

    return "";
  }

  return `
    <div class="combat-command-grid is-main-grid battle-command-selector">
      <button class="combat-action-button is-primary battle-command-choice battle-command-choice--attack is-selected" type="button" data-combat-command="attack">
        <span class="combat-command-name">ATTACK</span>
        <span class="combat-command-cost">OPEN MOVES</span>
      </button>
      <button class="combat-action-button is-secondary battle-command-choice battle-command-choice--programs" type="button" data-combat-command="programs">
        <span class="combat-command-name">PROGRAMS</span>
        <span class="combat-command-cost">PARTY</span>
      </button>
      <button class="combat-action-button is-secondary battle-command-choice battle-command-choice--items" type="button" data-combat-command="items">
        <span class="combat-command-name">ITEMS</span>
        <span class="combat-command-cost">SUPPLIES</span>
      </button>
      <button class="combat-action-button is-secondary battle-command-choice battle-command-choice--run" type="button" data-combat-command="run">
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
  const focusNeeded = typeof hasUsableMove === "function" ? !hasUsableMove(currentProgram, state) : false;
  const attackStageOverlayMarkup = buildAttackStageOverlayMarkup(state);
  const attackStageFanActive = Boolean(attackStageOverlayMarkup);
  if (state?.commandMode === "attack") {
    console.log("[Attack Prototype] stage markup generated:", Boolean(attackStageOverlayMarkup));
    console.log("[Attack Prototype] attackStageActive:", attackStageFanActive);
  }

  return `
    <div class="combat-shell ${state.battleIntroPlaying ? "is-intro-playing" : ""} ${attackStageFanActive ? "is-attack-stage-active" : ""}">
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
        ${attackStageOverlayMarkup}
        <div class="combat-reserve-strip">
          <div class="combat-reserve-row">
            ${buildReserveStripMarkup(state, currentProgram.id)}
          </div>
        </div>
      </section>

      <footer class="combat-footer ${attackStageFanActive ? "is-attack-stage-active" : ""}">
        <div class="combat-footer-left ${attackStageFanActive ? "is-attack-stage-active" : ""}">
          <div class="combat-voice-box ${attackStageFanActive ? "is-attack-stage-active" : ""}">
            <div class="combat-panel-title">TACTICAL BRIEF</div>
          <div id="battle-message" class="combat-voice-text">${getBattleMessageText(state)}</div>
          <div id="battle-submessage" class="combat-voice-subtext">${getBattleSubmessageText(state)}</div>
          <div id="battle-log" class="combat-history-strip">${buildBattleLogMarkup(state)}</div>
          ${buildEnemyIntentBrief(state)}
          ${buildFocusAvailabilityBrief(state)}
          ${buildPantheonBoonBriefMarkup(state)}
        </div>

          <div class="combat-command-box ${commandBoxClass} ${attackStageFanActive ? "is-attack-stage-active" : ""}">
            <div class="combat-panel-title">COMMAND DECK</div>
            ${buildActionButtonMarkup(state)}
            <div class="battle-focus-gauge-strip ${focusNeeded ? "is-focus-needed" : ""} ${attackStageFanActive ? "is-attack-stage-active" : ""}">
              ${buildFocusCommandMarkup(state)}
              <div class="combat-gauge-wrap ${focusNeeded ? "is-focus-needed" : ""}">
                <div class="combat-gauge-label">TACTICAL GAUGE</div>
                ${renderBar(state.responseGauge, 100, "is-gauge")}
                <div class="combat-gauge-text">${state.responseGauge}/100</div>
              </div>
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

  syncAttackFanFallbackState(combatState);

  threatPanelContent.innerHTML = buildCombatMarkup(combatState);
  threatPanelContent.scrollTop = 0;
  threatPanel.classList.add("is-open", "is-combat");
  threatPanel.setAttribute("aria-hidden", "false");

  const battleLog = document.getElementById("battle-log");
  if (battleLog) {
    battleLog.scrollTop = battleLog.scrollHeight;
  }

  if (combatState.commandMode === "attack" && !combatState.forceFooterAttackList) {
    const allowFooterFallback = shouldAllowFooterAttackFallback();
    const attackStageOverlay = threatPanelContent.querySelector(".combat-attack-overlay");
    const stage = threatPanelContent.querySelector(".combat-stage");
    console.log("[Attack Prototype] stage overlay found:", Boolean(attackStageOverlay));
    console.log("[Attack Prototype] stage found:", Boolean(stage));
    console.log("[Attack Prototype] overlay markup inserted:", Boolean(attackStageOverlay?.querySelector("[data-prototype-attack-overlay='true']")));

    if (attackStageOverlay && stage) {
      const stageRect = stage.getBoundingClientRect();
      const attackNodes = Array.from(attackStageOverlay.querySelectorAll(".combat-attack-stage-card, .combat-attack-hitbox"));
      console.log("[Attack Prototype] stage card count:", attackNodes.length);
      const forbiddenRects = [
        { name: "player status", node: threatPanelContent.querySelector(".combat-status-box-player") },
        { name: "enemy status", node: threatPanelContent.querySelector(".combat-status-box-enemy") },
        { name: "combat-voice-box", node: threatPanelContent.querySelector(".combat-voice-box") },
        { name: "combat-command-box", node: threatPanelContent.querySelector(".combat-command-box") }
      ].filter((entry) => entry.node).map((entry) => ({
        name: entry.name,
        rect: entry.node.getBoundingClientRect()
      }));

      const hasCollision = attackNodes.some((card) => {
        const cardRect = card.getBoundingClientRect();
        const outOfBounds = (
          cardRect.left < stageRect.left + 10 ||
          cardRect.top < stageRect.top + 10 ||
          cardRect.right > stageRect.right - 10 ||
          cardRect.bottom > stageRect.bottom - 10
        );
        const overlapsForbidden = forbiddenRects.find(({ rect }) => !(
          cardRect.right <= rect.left ||
          cardRect.left >= rect.right ||
          cardRect.bottom <= rect.top ||
          cardRect.top >= rect.bottom
        ));

        if (outOfBounds) {
          console.log("[Attack Prototype] fallback: card out of stage bounds");
        }

        if (overlapsForbidden) {
          console.log(`[Attack Prototype] fallback: overlaps ${overlapsForbidden.name}`);
        }

        return outOfBounds || Boolean(overlapsForbidden);
      });

      if (hasCollision) {
        console.log("[Attack Prototype] fallback reason:", "collision");
        const currentActor = combatState.turnOrder?.[combatState.currentTurnIndex];
        if (allowFooterFallback) {
          combatState.attackFanFallbackActorId = currentActor?.kind === "program"
            ? String(currentActor.ref?.id || currentActor.ref?.name || "")
            : "";
          combatState.attackFanFallbackReason = "collision";
          console.log("[Attack Prototype] forceFooterAttackList set to true after collision");
          combatState.forceFooterAttackList = true;
          renderCombatScreen();
          return;
        }

        console.log("[Attack Prototype] collision detected but desktop prototype overlay remains active");
      }

      console.log("[Attack Prototype] stage fan rendered without collision fallback");
    }
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
        combatState.forceFooterAttackList = false;
        combatState.attackFanFallbackActorId = "";
        combatState.attackFanFallbackReason = "";
        combatState.commandMode = "main";
        combatState.battleMessage = "";
        combatState.battleSubmessage = "";
        renderCombatScreen();
        return;
      }

      if (command === "attack") {
        combatState.forceFooterAttackList = false;
        combatState.attackFanFallbackActorId = "";
        combatState.attackFanFallbackReason = "";
        combatState.commandMode = "attack";
        combatState.battleMessage = "";
        combatState.battleSubmessage = "";
        renderCombatScreen();
        return;
      }

      if (command === "programs") {
        combatState.forceFooterAttackList = false;
        combatState.attackFanFallbackActorId = "";
        combatState.attackFanFallbackReason = "";
        combatState.commandMode = "programs";
        combatState.battleMessage = "";
        combatState.battleSubmessage = "";
        renderCombatScreen();
        return;
      }

      if (command === "items") {
        combatState.forceFooterAttackList = false;
        combatState.attackFanFallbackActorId = "";
        combatState.attackFanFallbackReason = "";
        combatState.commandMode = "items";
        combatState.battleMessage = "";
        combatState.battleSubmessage = "";
        renderCombatScreen();
        return;
      }

      if (command === "focus") {
        if (typeof focusActiveDefenderTurn === "function") {
          focusActiveDefenderTurn(combatEngine);
        }
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
        combatState.battleMessage = "MOVE UNAVAILABLE.";
        combatState.battleSubmessage = "SELECT ANOTHER MOVE.";
        renderCombatScreen();
        return;
      }

      const availability = typeof getMoveUseAvailability === "function"
        ? getMoveUseAvailability(ability, combatState)
        : {
            canUse: getMoveChargeCount(ability) > 0 && combatState.responseGauge >= (Number.isFinite(ability.cost) ? ability.cost : 0),
            reason: getMoveChargeCount(ability) <= 0 ? "charges" : "gauge",
            message: "",
            detail: "",
            charges: getMoveChargeCount(ability),
            maxCharges: Number.isFinite(ability.maxCharges) ? ability.maxCharges : getMoveChargeCount(ability),
            requiredGauge: Number.isFinite(ability.cost) ? ability.cost : 0,
            currentGauge: combatState.responseGauge
          };

      console.log("[Move Debug] availability:", availability);
      if (!availability.canUse) {
        combatState.battleMessage = availability.message || "MOVE UNAVAILABLE.";
        combatState.battleSubmessage = availability.detail || "SELECT ANOTHER MOVE.";
        if (availability.reason === "charges") {
          addBattleLog(`${actor.ref.name.toUpperCase()} TRIED ${ability.name.toUpperCase()} BUT HAD NO CHARGES LEFT.`, "buff");
        } else if (availability.reason === "gauge") {
          addBattleLog(`${actor.ref.name.toUpperCase()} NEEDS MORE TACTICAL GAUGE FOR ${ability.name.toUpperCase()}.`, "buff");
        } else {
          addBattleLog(`${actor.ref.name.toUpperCase()} COULD NOT USE ${ability.name.toUpperCase()}.`, "buff");
        }
        renderCombatScreen();
        return;
      }

      const requiredGauge = availability.requiredGauge;
      console.log("[Move Debug] response gauge:", combatState.responseGauge, "required gauge:", requiredGauge);
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
