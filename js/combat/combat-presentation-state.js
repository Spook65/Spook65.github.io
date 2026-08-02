/* Visual-only adapter for combat presentation.
   It mirrors combat state for Three.js without mutating gameplay state. */
function getCombatPresentationNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getCombatPresentationRatio(value, maxValue) {
  const safeMax = getCombatPresentationNumber(maxValue, 0);
  if (safeMax <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, getCombatPresentationNumber(value, 0) / safeMax));
}

function getCombatPresentationSpriteKey(entity) {
  const raw = String(entity?.id || entity?.spriteKey || entity?.name || "").toLowerCase();
  if (raw.includes("firewall")) {
    return "firewall";
  }
  if (raw.includes("ids") || raw.includes("intrusion")) {
    return "ids";
  }
  if (raw.includes("honeypot")) {
    return "honeypot";
  }
  if (raw.includes("antivirus") || raw.includes("purifier")) {
    return "antivirus";
  }
  if (raw.includes("ransom")) {
    return "ransomware";
  }
  if (raw.includes("phish")) {
    return "phishing";
  }
  if (raw.includes("bot")) {
    return "botnet";
  }
  if (raw.includes("trojan")) {
    return "trojan";
  }
  if (raw.includes("zero")) {
    return "zero-day";
  }
  return "standard";
}

function getCombatPresentationActiveDefenderId(combatState) {
  const currentActor = combatState?.turnOrder?.[combatState?.currentTurnIndex];
  if (currentActor?.kind === "program" && currentActor.ref) {
    return currentActor.ref.id || currentActor.ref.name || "";
  }
  return combatState?.activeProgramId || "";
}

function getCombatPresentationState(combatState) {
  const activeDefenderId = getCombatPresentationActiveDefenderId(combatState);
  const recentlyHitIds = Array.isArray(combatState?.recentlyHitProgramIds)
    ? combatState.recentlyHitProgramIds
    : [];
  const defenders = Array.isArray(combatState?.playerParty)
    ? combatState.playerParty.slice(0, 4).map((program, index) => {
        const hp = getCombatPresentationNumber(program?.hp, 0);
        const maxHp = getCombatPresentationNumber(program?.maxHp, 0);
        const id = program?.id || program?.name || `defender-${index + 1}`;
        return {
          id,
          name: program?.name || `Defender ${index + 1}`,
          slotIndex: index + 1,
          hp,
          maxHp,
          hpRatio: getCombatPresentationRatio(hp, maxHp),
          fainted: hp <= 0,
          active: id === activeDefenderId,
          recentlyHit: combatState?.recentlyHitProgramId === id || recentlyHitIds.includes(id),
          role: program?.role || "",
          domain: program?.domain || "",
          affinity: program?.affinity || "",
          color: program?.color || "#6fefe0",
          spriteKey: getCombatPresentationSpriteKey(program),
          statusFlags: Array.isArray(program?.statusEffects)
            ? program.statusEffects.map((effect) => String(effect?.id || effect?.name || effect)).filter(Boolean)
            : []
        };
      })
    : [];

  const threat = combatState?.threat || {};
  const enemyHp = getCombatPresentationNumber(threat.hp, 0);
  const enemyMaxHp = getCombatPresentationNumber(threat.maxHp, 0);
  const environmentKey = combatState?.sourceThreat?.environmentKey
    || threat.environmentKey
    || combatState?.environmentKey
    || "";

  return {
    marker: "combat-presentation-state-v1",
    phase: combatState?.commandMode || "main",
    activeDefenderId,
    currentTurnIndex: getCombatPresentationNumber(combatState?.currentTurnIndex, 0),
    battleIntroPlaying: Boolean(combatState?.battleIntroPlaying),
    battleIntroStage: combatState?.battleIntroStage || "",
    visualEffect: combatState?.visualEffect || null,
    defenders,
    enemy: {
      id: threat.id || threat.title || "threat",
      title: threat.title || "Unknown Threat",
      hp: enemyHp,
      maxHp: enemyMaxHp,
      hpRatio: getCombatPresentationRatio(enemyHp, enemyMaxHp),
      level: getCombatPresentationNumber(threat.level, 1),
      type: threat.type || threat.category || getCombatPresentationSpriteKey(threat),
      environmentKey
    },
    threatTitle: threat.title || combatState?.sourceThreat?.title || "Unknown Threat",
    environmentKey
  };
}

if (typeof globalThis !== "undefined") {
  globalThis.getCombatPresentationState = getCombatPresentationState;
}
