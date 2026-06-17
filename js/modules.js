/* Recovered Modules are run-local Defender upgrades awarded after contained incidents. */
const recoveredModuleSourceProfiles = {
  oracle_ids: {
    sourceId: "oracle_ids",
    sourceName: "Oracle IDS",
    sourceTheme: "Detection / Scan / Reveal / Countertrace",
    sourceDescription: "Reveals hidden behavior and improves threat analysis.",
    sourceLine: "Nothing hides forever once the signal is clean."
  },
  hermes_relay: {
    sourceId: "hermes_relay",
    sourceName: "Hermes Relay",
    sourceTheme: "Routing / Speed / Tactical Gauge / Initiative",
    sourceDescription: "Improves tempo, routing, and early battle momentum.",
    sourceLine: "A cleaner route is a faster command."
  },
  athena_firewall: {
    sourceId: "athena_firewall",
    sourceName: "Athena Firewall",
    sourceTheme: "Defense / Containment / Mitigation",
    sourceDescription: "Strengthens defensive responses and limits spread.",
    sourceLine: "A clean boundary is a sacred law."
  },
  hephaestus_forge: {
    sourceId: "hephaestus_forge",
    sourceName: "Hephaestus Forge",
    sourceTheme: "Patching / Hardware / Durability",
    sourceDescription: "Reinforces systems and turns lessons into hardened code.",
    sourceLine: "Every scar becomes a stronger plate."
  },
  asclepius_recovery: {
    sourceId: "asclepius_recovery",
    sourceName: "Asclepius Recovery",
    sourceTheme: "Healing / Backup / Recovery / Continuity",
    sourceDescription: "Restores stability after damage or corruption.",
    sourceLine: "What was corrupted can still be made whole."
  },
  arachne_web: {
    sourceId: "arachne_web",
    sourceName: "Arachne Web",
    sourceTheme: "Honeypot / Deception / Traps / Evasion",
    sourceDescription: "Misdirects threats and turns enemy behavior against them.",
    sourceLine: "The trap is strongest when it looks like a path."
  }
};

const recoveredModuleRegistry = [
  {
    id: "packet_sieve",
    name: "Packet Sieve",
    rarity: "common",
    slot: "module",
    conceptTags: ["detection"],
    sourceId: "oracle_ids",
    sourceName: "Oracle IDS",
    sourceTheme: "Detection / Analysis / Countertrace",
    sourceLine: "Nothing hides forever once the signal is clean.",
    itemClass: "Scan Lens",
    relicType: "lens",
    shortDescription: "Improves scan and reveal actions.",
    effectText: "+{value}% Detection Power. Scan actions reveal threat behavior more reliably.",
    statBonuses: { detectionPowerPct: 0 },
    rollRange: { min: 4, max: 7 },
    effect: { type: "detection_power_bonus", valuePct: 0 },
    flavorText: "Filters noise until the threat has nowhere left to hide."
  },
  {
    id: "signal_amplifier",
    name: "Signal Amplifier",
    rarity: "common",
    slot: "module",
    conceptTags: ["detection"],
    sourceId: "hermes_relay",
    sourceName: "Hermes Relay",
    sourceTheme: "Routing / Speed / Accuracy",
    sourceLine: "A cleaner route is a faster command.",
    itemClass: "Signal Coil",
    relicType: "relay",
    shortDescription: "Boosts move accuracy.",
    effectText: "+{value}% Accuracy. Cleaner signal paths reduce missed actions.",
    statBonuses: { accuracyPct: 0 },
    rollRange: { min: 4, max: 7 },
    effect: { type: "accuracy_bonus", valuePct: 0 },
    flavorText: "A little more signal. A little less fear."
  },
  {
    id: "trace_cache",
    name: "Trace Cache",
    rarity: "uncommon",
    slot: "module",
    conceptTags: ["detection", "incident_response"],
    sourceId: "hermes_relay",
    sourceName: "Hermes Relay",
    sourceTheme: "Routing / Tempo / Tactical Gauge",
    sourceLine: "The route remembers where the attacker panicked.",
    itemClass: "Relay Core",
    relicType: "relay",
    shortDescription: "Starts the next battle with extra Tactical Gauge.",
    effectText: "+{value} starting Tactical Gauge.",
    statBonuses: { startGauge: 0 },
    rollRange: { min: 5, max: 8 },
    effect: { type: "start_gauge_bonus", value: 0 },
    flavorText: "The route remembers where the attacker panicked."
  },
  {
    id: "quarantine_key",
    name: "Quarantine Key",
    rarity: "common",
    slot: "module",
    conceptTags: ["containment"],
    sourceId: "athena_firewall",
    sourceName: "Athena Firewall",
    sourceTheme: "Containment / Guard / Isolation",
    sourceLine: "A clean boundary is a sacred law.",
    itemClass: "Firewall Key",
    relicType: "shield",
    shortDescription: "Strengthens isolate and mitigation responses.",
    effectText: "+{value}% Containment Power.",
    statBonuses: { containmentPowerPct: 0 },
    rollRange: { min: 5, max: 9 },
    effect: { type: "containment_power_bonus", valuePct: 0 },
    flavorText: "A sealed command signed by a system that survived."
  },
  {
    id: "segmentation_chip",
    name: "Segmentation Chip",
    rarity: "uncommon",
    slot: "module",
    conceptTags: ["containment", "hardening"],
    sourceId: "athena_firewall",
    sourceName: "Athena Firewall",
    sourceTheme: "Hardening / Segmentation / Defense",
    sourceLine: "Cut the path. Save the node.",
    itemClass: "Quarantine Chip",
    relicType: "shield",
    shortDescription: "Reduces incoming damage.",
    effectText: "+{value}% Defense against incoming threat damage.",
    statBonuses: { defensePct: 0 },
    rollRange: { min: 10, max: 15 },
    effect: { type: "defense_bonus", valuePct: 0 },
    flavorText: "Cut the path. Save the node."
  },
  {
    id: "cleanroom_firmware",
    name: "Cleanroom Firmware",
    rarity: "common",
    slot: "module",
    conceptTags: ["malware_cleanup"],
    sourceId: "asclepius_recovery",
    sourceName: "Asclepius Recovery",
    sourceTheme: "Cleanse / Recovery / Restore",
    sourceLine: "What was corrupted can still be made whole.",
    itemClass: "Recovery Cache",
    relicType: "disk",
    shortDescription: "Improves purge and cleanse actions.",
    effectText: "+{value}% Cleanup Power.",
    statBonuses: { cleanupPowerPct: 0 },
    rollRange: { min: 5, max: 9 },
    effect: { type: "cleanup_power_bonus", valuePct: 0 },
    flavorText: "Compiled in a room the malware never touched."
  },
  {
    id: "backup_image",
    name: "Backup Image",
    rarity: "common",
    slot: "module",
    conceptTags: ["recovery", "malware_cleanup"],
    sourceId: "asclepius_recovery",
    sourceName: "Asclepius Recovery",
    sourceTheme: "Backup / Recovery / Continuity",
    sourceLine: "A clean ghost of the system wakes after the breach.",
    itemClass: "Backup Disk",
    relicType: "disk",
    shortDescription: "Improves recovery capacity.",
    effectText: "+{value}% Recovery Power.",
    statBonuses: { recoveryPowerPct: 0 },
    rollRange: { min: 4, max: 7 },
    effect: { type: "recovery_power_bonus", valuePct: 0 },
    flavorText: "A clean ghost of the system before it broke."
  },
  {
    id: "patch_compiler",
    name: "Patch Compiler",
    rarity: "common",
    slot: "module",
    conceptTags: ["patching", "hardening", "vulnerability"],
    sourceId: "hephaestus_forge",
    sourceName: "Hephaestus Forge",
    sourceTheme: "Patching / Durability / Forgework",
    sourceLine: "Every scar becomes a stronger plate.",
    itemClass: "Compiler Plate",
    relicType: "plate",
    shortDescription: "Improves defensive hardening.",
    effectText: "+{value}% Defense.",
    statBonuses: { defensePct: 0 },
    rollRange: { min: 4, max: 7 },
    effect: { type: "defense_bonus", valuePct: 0 },
    flavorText: "Turns lessons learned into code the threat cannot reuse."
  },
  {
    id: "redundant_cache",
    name: "Redundant Cache",
    rarity: "uncommon",
    slot: "module",
    conceptTags: ["recovery", "hardening"],
    sourceId: "hephaestus_forge",
    sourceName: "Hephaestus Forge",
    sourceTheme: "Redundancy / Durability / Backup",
    sourceLine: "If the first copy burns, the second one wakes.",
    itemClass: "Redundant Cache",
    relicType: "plate",
    shortDescription: "Improves recovery and starting response tempo.",
    effectText: "+{value} starting Tactical Gauge.",
    statBonuses: { startGauge: 0 },
    rollRange: { min: 6, max: 10 },
    effect: { type: "start_gauge_bonus", value: 0 },
    flavorText: "If the first copy burns, the second one wakes."
  },
  {
    id: "incident_lens",
    name: "Incident Lens",
    rarity: "common",
    slot: "module",
    conceptTags: ["incident_response", "detection"],
    sourceId: "oracle_ids",
    sourceName: "Oracle IDS",
    sourceTheme: "Incident Analysis / Reveal / Countertrace",
    sourceLine: "The breach is easier to command once the pattern has a name.",
    itemClass: "Incident Lens",
    relicType: "lens",
    shortDescription: "Improves response accuracy.",
    effectText: "+{value}% Accuracy.",
    statBonuses: { accuracyPct: 0 },
    rollRange: { min: 4, max: 7 },
    effect: { type: "accuracy_bonus", valuePct: 0 },
    flavorText: "The breach is easier to command once the pattern has a name."
  }
];

function normalizeModuleConceptTags(conceptIds = []) {
  if (typeof normalizeCyberConceptIds === "function") {
    return normalizeCyberConceptIds(conceptIds);
  }

  const sourceIds = Array.isArray(conceptIds) ? conceptIds : [conceptIds];
  const seen = new Set();
  const normalized = [];
  sourceIds.flat().forEach((conceptId) => {
    if (typeof conceptId !== "string") {
      return;
    }

    const id = conceptId.trim().toLowerCase();
    if (!id || seen.has(id)) {
      return;
    }

    seen.add(id);
    normalized.push(id);
  });
  return normalized;
}

function getRecoveredModuleBlueprint(moduleId) {
  return recoveredModuleRegistry.find((module) => module.id === moduleId) || null;
}

function getRecoveredModuleSourceProfile(sourceId) {
  return recoveredModuleSourceProfiles[sourceId] || recoveredModuleSourceProfiles.hermes_relay;
}

function getRecoveredModuleConceptLabel(conceptId) {
  const concept = typeof getCyberConcept === "function" ? getCyberConcept(conceptId) : null;
  if (concept?.title) {
    return concept.title;
  }

  return String(conceptId || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function rollRecoveredModuleValue(module) {
  const min = Number.isFinite(module?.rollRange?.min) ? module.rollRange.min : 4;
  const max = Number.isFinite(module?.rollRange?.max) ? module.rollRange.max : min;
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Math.floor(Math.random() * ((high - low) + 1)) + low;
}

function formatRecoveredModuleEffectText(module, rolledValue) {
  const template = typeof module?.effectText === "string" && module.effectText.trim()
    ? module.effectText
    : "+{value} Module Power.";
  return template.replace(/\{value\}/g, String(Number.isFinite(rolledValue) ? rolledValue : 0));
}

function createRecoveredModuleInstance(module, context = {}) {
  if (!module || typeof module !== "object") {
    return null;
  }

  const rolledValue = rollRecoveredModuleValue(module);
  const statBonuses = {};
  Object.keys(module.statBonuses || {}).forEach((statKey) => {
    statBonuses[statKey] = rolledValue;
  });

  const effect = module.effect && typeof module.effect === "object" ? { ...module.effect } : {};
  if ("valuePct" in effect) {
    effect.valuePct = rolledValue;
  } else {
    effect.value = rolledValue;
  }
  const sourceProfile = getRecoveredModuleSourceProfile(module.sourceId);

  return {
    instanceId: `${module.id}-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    id: module.id,
    name: module.name || "Recovered Module",
    rarity: module.rarity || "common",
    slot: module.slot || "module",
    conceptTags: normalizeModuleConceptTags(module.conceptTags || []),
    sourceId: sourceProfile.sourceId,
    sourceName: sourceProfile.sourceName || module.sourceName || "Hermes Relay",
    sourceTheme: sourceProfile.sourceTheme || module.sourceTheme || "Recovered Protocol",
    sourceDescription: sourceProfile.sourceDescription || module.sourceDescription || "Recovered modules specialize in a response strategy.",
    sourceLine: module.sourceLine || sourceProfile.sourceLine,
    itemClass: module.itemClass || "Recovered Relic",
    relicType: module.relicType || "lens",
    shortDescription: module.shortDescription || "Recovered combat module.",
    effectText: formatRecoveredModuleEffectText(module, rolledValue),
    statBonuses,
    effect,
    rolledValue,
    flavorText: module.flavorText || "Recovered from a contained incident.",
    sourceThreatId: context.threatId || null,
    sourceThreatName: context.threatName || "",
    createdAt: Date.now()
  };
}

function generateRecoveredModuleChoices(context = {}) {
  const conceptIds = normalizeModuleConceptTags(context.conceptIds || []);
  const count = Number.isFinite(context.count) ? Math.max(1, context.count) : 3;
  const matching = recoveredModuleRegistry.filter((module) => {
    const moduleConcepts = normalizeModuleConceptTags(module.conceptTags || []);
    return conceptIds.some((conceptId) => moduleConcepts.includes(conceptId));
  });
  const general = recoveredModuleRegistry.filter((module) => !matching.some((match) => match.id === module.id));
  const ordered = matching.concat(general).sort(() => Math.random() - 0.5);
  const selected = [];

  ordered.forEach((module) => {
    if (selected.length >= count || selected.some((item) => item.id === module.id)) {
      return;
    }

    const instance = createRecoveredModuleInstance(module, context);
    if (instance) {
      selected.push(instance);
    }
  });

  return selected;
}

function getRecoveredModuleStat(module, statKey) {
  const value = module?.statBonuses?.[statKey];
  return Number.isFinite(value) ? value : 0;
}

function getModuleStatBonus(module, statKey) {
  return getRecoveredModuleStat(module, statKey);
}

function getRecoveredModuleShortLabel(module) {
  const name = String(module?.name || "MOD").trim();
  if (!name) {
    return "MOD";
  }

  return name.split(/\s+/).map((part) => part.charAt(0)).join("").slice(0, 3).toUpperCase() || "MOD";
}

function getEquippedModuleForDefenderId(runState, defenderId) {
  const equipped = runState?.equippedModulesByDefenderId;
  if (!equipped || typeof equipped !== "object" || !defenderId) {
    return null;
  }

  return equipped[defenderId] || null;
}

function equipRecoveredModule(runState, defenderId, moduleInstance) {
  if (!runState || !defenderId || !moduleInstance) {
    return null;
  }

  runState.equippedModulesByDefenderId = runState.equippedModulesByDefenderId && typeof runState.equippedModulesByDefenderId === "object"
    ? runState.equippedModulesByDefenderId
    : {};
  const previousModule = runState.equippedModulesByDefenderId[defenderId] || null;
  runState.equippedModulesByDefenderId[defenderId] = {
    ...moduleInstance,
    equippedToDefenderId: defenderId,
    equippedAt: Date.now()
  };
  return previousModule;
}

function getDefenderModuleStat(defender, statKey) {
  return getModuleStatBonus(defender?.equippedModule, statKey);
}

if (typeof window !== "undefined") {
  window.recoveredModuleSourceProfiles = recoveredModuleSourceProfiles;
  window.recoveredModuleRegistry = recoveredModuleRegistry;
  window.getRecoveredModuleBlueprint = getRecoveredModuleBlueprint;
  window.getRecoveredModuleSourceProfile = getRecoveredModuleSourceProfile;
  window.getRecoveredModuleConceptLabel = getRecoveredModuleConceptLabel;
  window.generateRecoveredModuleChoices = generateRecoveredModuleChoices;
  window.getModuleStatBonus = getModuleStatBonus;
  window.getRecoveredModuleShortLabel = getRecoveredModuleShortLabel;
  window.getEquippedModuleForDefenderId = getEquippedModuleForDefenderId;
  window.equipRecoveredModule = equipRecoveredModule;
  window.getDefenderModuleStat = getDefenderModuleStat;
}
