/* Combat VFX map: visual-only categorization for ability effects.
   This file must not own combat math, targeting, turn order, or status behavior. */

function normalizeCombatVfxToken(value) {
  return String(value || "").trim().toLowerCase();
}

function getCombatAbilityVfxProfile(ability, context = {}) {
  const name = normalizeCombatVfxToken(ability?.name);
  const effect = normalizeCombatVfxToken(ability?.effect || context?.abilityEffect);
  const type = normalizeCombatVfxToken(ability?.type || ability?.category || ability?.domain);
  const attackerKind = normalizeCombatVfxToken(context?.attackerKind);
  const phase = normalizeCombatVfxToken(context?.phase);
  const typeState = normalizeCombatVfxToken(context?.damageResult?.typeState || context?.typeState);

  let family = "generic_strike";
  let key = "generic-strike";
  let color = "#f5d07a";
  let secondaryColor = "#ff6f4d";
  let intensity = phase === "impact" ? 1 : 0.72;
  let targetMode = "enemy";
  let durationMs = 820;

  const has = (...needles) => needles.some((needle) => name.includes(needle) || effect.includes(needle) || type.includes(needle));

  if (typeState === "miss" || effect === "miss") {
    family = "miss";
    key = "miss";
    color = "#8aa0b8";
    secondaryColor = "#516070";
    intensity = 0.45;
    durationMs = 520;
  } else if (attackerKind === "threat" || attackerKind === "enemy" || has("encrypted", "payload", "malware", "damage_all")) {
    family = "enemy_payload";
    key = "enemy-payload";
    color = "#ff4864";
    secondaryColor = "#9f2448";
    targetMode = "defender";
    durationMs = 760;
  } else if (has("scan", "packet", "signature", "detect", "detected")) {
    family = "scan";
    key = "scan-pulse";
    color = "#58fff1";
    secondaryColor = "#3f96ff";
    durationMs = 920;
  } else if (has("purge", "sweep", "cleanse", "kernel")) {
    family = "purge";
    key = "purge-lance";
    color = "#ff6f4d";
    secondaryColor = "#ffd18a";
    durationMs = 780;
  } else if (has("lure", "sandtrap", "contain", "isolate", "isolated")) {
    family = "containment";
    key = "containment-cage";
    color = "#f2ba4c";
    secondaryColor = "#ff7e3b";
    durationMs = 1050;
  } else if (has("block", "harden", "firewall", "shield", "boost_def", "reduce_next_damage", "sync_defense")) {
    family = "firewall";
    key = "defender-firewall";
    color = "#6fefe0";
    secondaryColor = "#f5d07a";
    targetMode = "defender";
    durationMs = 960;
  } else if (has("recover", "repair", "restore", "recovery", "shared_ability", "support", "allocate", "relay")) {
    family = "recovery";
    key = "recovery-pulse";
    color = "#78ffab";
    secondaryColor = "#61d8ff";
    targetMode = "defender";
    durationMs = 980;
  }

  return {
    key,
    family,
    color,
    secondaryColor,
    intensity,
    targetMode,
    durationMs
  };
}

function getCombatAbilityLegacyStyle(vfxProfile) {
  const family = normalizeCombatVfxToken(vfxProfile?.family);
  if (family === "firewall" || family === "recovery") {
    return "buff";
  }
  if (family === "miss") {
    return "impact";
  }
  return "beam";
}

if (typeof globalThis !== "undefined") {
  globalThis.getCombatAbilityVfxProfile = getCombatAbilityVfxProfile;
  globalThis.getCombatAbilityLegacyStyle = getCombatAbilityLegacyStyle;
}
