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

const recoveredModuleStatLabels = {
  detectionPowerPct: "Detection Power",
  accuracyPct: "Accuracy",
  attackPct: "Move Power",
  speedPct: "Speed",
  defensePct: "Defense",
  containmentPowerPct: "Containment Power",
  cleanupPowerPct: "Cleanup Power",
  recoveryPowerPct: "Recovery Power",
  statusResistancePct: "Status Resistance",
  corruptionResistancePct: "Corruption Resistance",
  responseStrengthPct: "Response Strength",
  gaugeGainPct: "Tactical Gauge Gain",
  startGauge: "Starting Tactical Gauge"
};

const recoveredModuleStatSupport = {
  accuracyPct: { active: true, note: "Applied to each move accuracy roll." },
  defensePct: { active: true, note: "Reduces incoming threat damage." },
  startGauge: { active: true, note: "Added when battle begins." },
  containmentPowerPct: { active: true, note: "Strengthens containment responses." },
  cleanupPowerPct: { active: true, note: "Strengthens purge responses." },
  recoveryPowerPct: { active: true, note: "Strengthens recovery responses." },
  detectionPowerPct: { active: true, partial: true, note: "Supports scan feedback and analysis." },
  attackPct: { active: false, note: "Planned move-power modifier." },
  speedPct: { active: false, note: "Planned initiative modifier." },
  statusResistancePct: { active: false, note: "Planned status-resistance modifier." },
  gaugeGainPct: { active: false, note: "Planned Tactical Gauge gain modifier." },
  corruptionResistancePct: { active: false, note: "Planned corruption-resistance modifier." },
  responseStrengthPct: { active: false, note: "Planned universal response modifier." }
};

// Affix definitions stay immutable; crafting can later mutate the rolled arrays stored on each module instance.
const recoveredModuleAffixRegistry = {
  prefixes: [
    { id: "calibrated", type: "prefix", label: "Calibrated", statBonuses: { accuracyPct: { min: 3, max: 7 } }, displayTemplate: "+{value}% Accuracy", conceptTags: ["detection", "incident_response"] },
    { id: "forensic", type: "prefix", label: "Forensic", statBonuses: { detectionPowerPct: { min: 3, max: 7 } }, displayTemplate: "+{value}% Detection Power", conceptTags: ["detection", "incident_response"] },
    { id: "overclocked", type: "prefix", label: "Overclocked", statBonuses: { attackPct: { min: 3, max: 6 } }, displayTemplate: "+{value}% Move Power", conceptTags: ["speed", "routing"] },
    { id: "rapid", type: "prefix", label: "Rapid", statBonuses: { speedPct: { min: 3, max: 6 } }, displayTemplate: "+{value}% Speed", conceptTags: ["speed", "routing"] },
    { id: "reinforced", type: "prefix", label: "Reinforced", statBonuses: { defensePct: { min: 3, max: 7 } }, displayTemplate: "+{value}% Defense", conceptTags: ["hardening", "containment", "patching"] },
    { id: "compiled", type: "prefix", label: "Compiled", statBonuses: { cleanupPowerPct: { min: 3, max: 7 } }, displayTemplate: "+{value}% Cleanup Power", conceptTags: ["malware_cleanup", "patching"] }
  ],
  suffixes: [
    { id: "of_quarantine", type: "suffix", label: "of Quarantine", statBonuses: { containmentPowerPct: { min: 4, max: 8 } }, displayTemplate: "+{value}% Containment Power", conceptTags: ["containment", "hardening"] },
    { id: "of_continuity", type: "suffix", label: "of Continuity", statBonuses: { recoveryPowerPct: { min: 4, max: 8 } }, displayTemplate: "+{value}% Recovery Power", conceptTags: ["recovery", "malware_cleanup"] },
    { id: "of_integrity", type: "suffix", label: "of Integrity", statBonuses: { statusResistancePct: { min: 3, max: 7 } }, displayTemplate: "+{value}% Status Resistance", conceptTags: ["hardening", "patching"] },
    { id: "of_countertrace", type: "suffix", label: "of Countertrace", statBonuses: { gaugeGainPct: { min: 3, max: 7 } }, displayTemplate: "+{value}% Tactical Gauge Gain", conceptTags: ["detection", "incident_response"] },
    { id: "of_sandboxing", type: "suffix", label: "of Sandboxing", statBonuses: { corruptionResistancePct: { min: 3, max: 7 } }, displayTemplate: "+{value}% Corruption Resistance", conceptTags: ["malware_cleanup", "containment"] },
    { id: "of_routing", type: "suffix", label: "of Routing", statBonuses: { responseStrengthPct: { min: 3, max: 7 } }, displayTemplate: "+{value}% Response Strength", conceptTags: ["routing", "incident_response"] }
  ],
  substats: [
    { id: "speed_substat", type: "substat", label: "Speed", statBonuses: { speedPct: { min: 2, max: 5 } }, displayTemplate: "+{value}% Speed", conceptTags: ["speed", "routing"] },
    { id: "defense_substat", type: "substat", label: "Defense", statBonuses: { defensePct: { min: 2, max: 5 } }, displayTemplate: "+{value}% Defense", conceptTags: ["hardening", "containment"] },
    { id: "accuracy_substat", type: "substat", label: "Accuracy", statBonuses: { accuracyPct: { min: 2, max: 5 } }, displayTemplate: "+{value}% Accuracy", conceptTags: ["detection", "routing"] },
    { id: "detection_substat", type: "substat", label: "Detection Power", statBonuses: { detectionPowerPct: { min: 2, max: 5 } }, displayTemplate: "+{value}% Detection Power", conceptTags: ["detection"] },
    { id: "cleanup_substat", type: "substat", label: "Cleanup Power", statBonuses: { cleanupPowerPct: { min: 2, max: 5 } }, displayTemplate: "+{value}% Cleanup Power", conceptTags: ["malware_cleanup"] },
    { id: "containment_substat", type: "substat", label: "Containment Power", statBonuses: { containmentPowerPct: { min: 2, max: 5 } }, displayTemplate: "+{value}% Containment Power", conceptTags: ["containment"] },
    { id: "recovery_substat", type: "substat", label: "Recovery Power", statBonuses: { recoveryPowerPct: { min: 2, max: 5 } }, displayTemplate: "+{value}% Recovery Power", conceptTags: ["recovery"] },
    { id: "gauge_gain_substat", type: "substat", label: "Tactical Gauge Gain", statBonuses: { gaugeGainPct: { min: 2, max: 5 } }, displayTemplate: "+{value}% Tactical Gauge Gain", conceptTags: ["incident_response", "routing"] }
  ]
};

const recoveredModuleRarityRules = {
  common: { prefixes: [0, 0], suffixes: [0, 0], substats: [0, 0], uniqueEffect: false },
  uncommon: { prefixes: [0, 1], suffixes: [0, 1], substats: [0, 1], uniqueEffect: false, singlePrimaryAffix: true },
  rare: { prefixes: [1, 1], suffixes: [1, 1], substats: [1, 1], uniqueEffect: false },
  epic: { prefixes: [1, 2], suffixes: [1, 2], substats: [1, 2], uniqueEffect: false },
  legendary: { prefixes: [2, 2], suffixes: [2, 2], substats: [2, 3], uniqueEffect: true }
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

function rollModuleRange(range, fallbackMin = 0, fallbackMax = fallbackMin) {
  const min = Number.isFinite(range?.min) ? range.min : fallbackMin;
  const max = Number.isFinite(range?.max) ? range.max : fallbackMax;
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Math.floor(Math.random() * ((high - low) + 1)) + low;
}

function getModuleStatLabel(statKey) {
  return recoveredModuleStatLabels[statKey] || String(statKey || "Module Power")
    .replace(/Pct$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function formatModuleStatText(statKey, value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const suffix = statKey === "startGauge" ? "" : "%";
  return `+${safeValue}${suffix} ${getModuleStatLabel(statKey)}`;
}

function getModuleBaseStat(module) {
  if (module?.baseStat && typeof module.baseStat === "object" && module.baseStat.statKey && Number.isFinite(module.baseStat.value)) {
    return {
      statKey: module.baseStat.statKey,
      value: module.baseStat.value,
      label: module.baseStat.label || formatModuleStatText(module.baseStat.statKey, module.baseStat.value)
    };
  }

  const legacyStats = module?.statBonuses && typeof module.statBonuses === "object" ? module.statBonuses : {};
  const statKey = Object.keys(legacyStats).find((key) => Number.isFinite(legacyStats[key]));
  const value = statKey ? legacyStats[statKey] : (Number.isFinite(module?.rolledValue) ? module.rolledValue : 0);
  return {
    statKey: statKey || "modulePower",
    value,
    label: formatModuleStatText(statKey || "modulePower", value)
  };
}

function getModuleAffixList(module, type) {
  const key = type === "prefix" ? "prefixes" : type === "suffix" ? "suffixes" : "substats";
  return Array.isArray(module?.[key]) ? module[key].filter((affix) => affix && typeof affix === "object") : [];
}

function getModuleAffixDisplayText(affix) {
  if (typeof affix?.displayText === "string" && affix.displayText.trim()) {
    return affix.displayText.trim();
  }
  return affix?.statKey && Number.isFinite(affix?.value) ? formatModuleStatText(affix.statKey, affix.value) : "";
}

function getModuleRarityRule(rarity) {
  return recoveredModuleRarityRules[String(rarity || "common").toLowerCase()] || recoveredModuleRarityRules.common;
}

function rollRecoveredModuleRarity(module, context = {}) {
  const requested = String(context.rarity || "").toLowerCase();
  if (["common", "uncommon", "rare"].includes(requested)) {
    return requested;
  }

  const baseRarity = String(module?.rarity || "common").toLowerCase();
  const roll = Math.random();
  if (baseRarity === "rare") {
    return "rare";
  }
  if (baseRarity === "uncommon") {
    return roll < 0.2 ? "rare" : "uncommon";
  }
  if (roll < 0.1) {
    return "rare";
  }
  return roll < 0.42 ? "uncommon" : "common";
}

function getModuleAffixCounts(rarity) {
  const rule = getModuleRarityRule(rarity);
  if (rule.singlePrimaryAffix) {
    const usePrefix = Math.random() < 0.5;
    return {
      prefixes: usePrefix ? 1 : 0,
      suffixes: usePrefix ? 0 : 1,
      substats: Math.random() < 0.5 ? 1 : 0
    };
  }

  return {
    prefixes: rollModuleRange({ min: rule.prefixes[0], max: rule.prefixes[1] }),
    suffixes: rollModuleRange({ min: rule.suffixes[0], max: rule.suffixes[1] }),
    substats: rollModuleRange({ min: rule.substats[0], max: rule.substats[1] })
  };
}

function getAffixPrimaryStatDefinition(affix) {
  const stats = affix?.statBonuses && typeof affix.statBonuses === "object" ? affix.statBonuses : {};
  const statKey = Object.keys(stats).find((key) => stats[key] && typeof stats[key] === "object");
  return statKey ? { statKey, range: stats[statKey] } : null;
}

function rollRecoveredModuleAffix(affix) {
  const statDefinition = getAffixPrimaryStatDefinition(affix);
  if (!affix?.id || !statDefinition) {
    return null;
  }

  const value = rollModuleRange(statDefinition.range);
  const displayText = typeof affix.displayTemplate === "string"
    ? affix.displayTemplate.replace(/\{value\}/g, String(value))
    : formatModuleStatText(statDefinition.statKey, value);
  return {
    id: affix.id,
    type: affix.type || "substat",
    label: affix.label || getModuleStatLabel(statDefinition.statKey),
    statKey: statDefinition.statKey,
    value,
    displayText,
    conceptTags: normalizeModuleConceptTags(affix.conceptTags || [])
  };
}

function selectRecoveredModuleAffixes(pool, count, conceptTags, usedAffixIds) {
  const safePool = Array.isArray(pool) ? pool.filter((affix) => affix?.id && !usedAffixIds.has(affix.id)) : [];
  const matching = safePool.filter((affix) => normalizeModuleConceptTags(affix.conceptTags || []).some((tag) => conceptTags.includes(tag)));
  const fallback = safePool.filter((affix) => !matching.some((match) => match.id === affix.id));
  const ordered = matching.sort(() => Math.random() - 0.5).concat(fallback.sort(() => Math.random() - 0.5));
  const selected = [];

  ordered.forEach((definition) => {
    if (selected.length >= count || usedAffixIds.has(definition.id)) {
      return;
    }
    const rolled = rollRecoveredModuleAffix(definition);
    if (rolled) {
      usedAffixIds.add(definition.id);
      selected.push(rolled);
    }
  });
  return selected;
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
  const baseStatKey = Object.keys(module.statBonuses || {}).find((statKey) => Number.isFinite(module.statBonuses[statKey])) || "modulePower";
  const baseStat = {
    statKey: baseStatKey,
    value: rolledValue,
    label: formatModuleStatText(baseStatKey, rolledValue)
  };
  const rarity = rollRecoveredModuleRarity(module, context);
  const affixCounts = getModuleAffixCounts(rarity);
  const conceptTags = normalizeModuleConceptTags(module.conceptTags || []);
  const usedAffixIds = new Set();
  const prefixes = selectRecoveredModuleAffixes(recoveredModuleAffixRegistry.prefixes, affixCounts.prefixes, conceptTags, usedAffixIds);
  const suffixes = selectRecoveredModuleAffixes(recoveredModuleAffixRegistry.suffixes, affixCounts.suffixes, conceptTags, usedAffixIds);
  const substats = selectRecoveredModuleAffixes(recoveredModuleAffixRegistry.substats, affixCounts.substats, conceptTags, usedAffixIds);

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
    rarity,
    slot: module.slot || "module",
    conceptTags,
    sourceId: sourceProfile.sourceId,
    sourceName: sourceProfile.sourceName || module.sourceName || "Hermes Relay",
    sourceTheme: sourceProfile.sourceTheme || module.sourceTheme || "Recovered Protocol",
    sourceDescription: sourceProfile.sourceDescription || module.sourceDescription || "Recovered modules specialize in a response strategy.",
    sourceLine: module.sourceLine || sourceProfile.sourceLine,
    itemClass: module.itemClass || "Recovered Relic",
    relicType: module.relicType || "lens",
    shortDescription: module.shortDescription || "Recovered combat module.",
    effectText: formatRecoveredModuleEffectText(module, rolledValue),
    statBonuses: {},
    baseStat,
    prefixes,
    suffixes,
    substats,
    uniqueEffect: getModuleRarityRule(rarity).uniqueEffect ? { id: "future_unique_effect", label: "Unique protocol dormant.", statBonuses: {} } : null,
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
  if (!module || !statKey) {
    return 0;
  }

  let total = getRecoveredModuleStat(module, statKey);
  if (module.baseStat?.statKey === statKey && Number.isFinite(module.baseStat.value)) {
    total += module.baseStat.value;
  }

  // All combat consumers read this aggregate, so future forge rerolls only need to update instance layers.
  ["prefixes", "suffixes", "substats"].forEach((key) => {
    const affixes = Array.isArray(module[key]) ? module[key] : [];
    affixes.forEach((affix) => {
      if (affix?.statKey === statKey && Number.isFinite(affix.value)) {
        total += affix.value;
      }
    });
  });

  const uniqueStats = module.uniqueEffect?.statBonuses && typeof module.uniqueEffect.statBonuses === "object"
    ? module.uniqueEffect.statBonuses
    : {};
  if (Number.isFinite(uniqueStats[statKey])) {
    total += uniqueStats[statKey];
  }
  return total;
}

function getModuleStatSupport(statKey) {
  return recoveredModuleStatSupport[statKey] || { active: false, note: "Future module stat." };
}

function getDefenderBaseStats(program) {
  const abilities = Array.isArray(program?.abilities) ? program.abilities : Array.isArray(program?.moves) ? program.moves : [];
  const accuracyValues = abilities
    .map((ability) => Number.isFinite(ability?.accuracy) ? ability.accuracy : null)
    .filter(Number.isFinite);
  const accuracyMin = accuracyValues.length ? Math.min(...accuracyValues) : 100;
  const accuracyMax = accuracyValues.length ? Math.max(...accuracyValues) : 100;

  return {
    hp: Number.isFinite(program?.maxHp) ? program.maxHp : Number.isFinite(program?.hp) ? program.hp : 0,
    currentHp: Number.isFinite(program?.hp) ? program.hp : 0,
    attack: Number.isFinite(program?.atk) ? program.atk : 0,
    defense: Number.isFinite(program?.def) ? program.def : 0,
    specialAttack: Number.isFinite(program?.spAtk) ? program.spAtk : 0,
    specialDefense: Number.isFinite(program?.spDef) ? program.spDef : 0,
    speed: Number.isFinite(program?.spd) ? program.spd : 0,
    moveAccuracyMin: accuracyMin,
    moveAccuracyMax: accuracyMax
  };
}

function getEquippedModuleForProgram(state, programId) {
  if (!programId) {
    return null;
  }

  const party = Array.isArray(state?.playerParty) ? state.playerParty : [];
  const partyModule = party.find((program) => program?.id === programId)?.equippedModule || null;
  if (partyModule) {
    return partyModule;
  }

  const runState = state?.currentRun || state;
  return typeof getEquippedModuleForDefenderId === "function"
    ? getEquippedModuleForDefenderId(runState, programId)
    : null;
}

function getDefenderEffectiveStats(state, program) {
  const base = getDefenderBaseStats(program);
  const module = program?.equippedModule || getEquippedModuleForProgram(state, program?.id);
  const bonus = (statKey) => getModuleStatBonus(module, statKey);
  const accuracyBonus = bonus("accuracyPct");
  const effectiveAccuracyMin = Math.min(100, base.moveAccuracyMin + accuracyBonus);
  const effectiveAccuracyMax = Math.min(100, base.moveAccuracyMax + accuracyBonus);
  const utilityKeys = [
    "detectionPowerPct",
    "containmentPowerPct",
    "cleanupPowerPct",
    "recoveryPowerPct",
    "startGauge",
    "statusResistancePct",
    "gaugeGainPct",
    "corruptionResistancePct",
    "responseStrengthPct"
  ];

  const stats = {
    hp: { key: "hp", label: "HP", base: base.hp, bonus: 0, total: base.hp, active: true },
    attack: { key: "attackPct", label: "Attack", base: base.attack, bonusPct: bonus("attackPct"), total: base.attack, ...getModuleStatSupport("attackPct") },
    defense: { key: "defensePct", label: "Defense", base: base.defense, bonusPct: bonus("defensePct"), total: base.defense, ...getModuleStatSupport("defensePct") },
    speed: { key: "speedPct", label: "Speed", base: base.speed, bonusPct: bonus("speedPct"), total: base.speed, ...getModuleStatSupport("speedPct") },
    accuracy: {
      key: "accuracyPct",
      label: "Move Accuracy",
      baseMin: base.moveAccuracyMin,
      baseMax: base.moveAccuracyMax,
      bonusPct: accuracyBonus,
      totalMin: effectiveAccuracyMin,
      totalMax: effectiveAccuracyMax,
      ...getModuleStatSupport("accuracyPct")
    }
  };

  utilityKeys.forEach((statKey) => {
    const moduleBonus = bonus(statKey);
    if (moduleBonus <= 0) {
      return;
    }
    stats[statKey] = {
      key: statKey,
      label: getModuleStatLabel(statKey),
      base: 0,
      bonus: moduleBonus,
      total: moduleBonus,
      unit: statKey === "startGauge" ? "flat" : "percent",
      ...getModuleStatSupport(statKey)
    };
  });

  return { base, module, stats };
}

function getRecoveredModuleShortLabel(module) {
  const name = String(module?.name || "MOD").trim();
  if (!name) {
    return "MOD";
  }

  return name.split(/\s+/).map((part) => part.charAt(0)).join("").slice(0, 3).toUpperCase() || "MOD";
}

function createRecoveredModuleInstanceId(module) {
  if (typeof module?.instanceId === "string" && module.instanceId.trim()) {
    return module.instanceId;
  }

  const baseId = typeof module?.id === "string" && module.id.trim() ? module.id.trim() : "module";
  return `${baseId}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function normalizeCurrentRunModule(module, equippedToDefenderId = null) {
  if (!module || typeof module !== "object") {
    return null;
  }

  const normalized = JSON.parse(JSON.stringify(module));
  normalized.instanceId = createRecoveredModuleInstanceId(normalized);
  normalized.name = String(normalized.name || "Recovered Module");
  normalized.rarity = String(normalized.rarity || "common");
  normalized.itemClass = String(normalized.itemClass || "Recovered Module");
  normalized.upgradeLevel = Number.isFinite(normalized.upgradeLevel)
    ? Math.max(0, Math.min(3, Math.floor(normalized.upgradeLevel)))
    : 0;
  normalized.equippedToDefenderId = equippedToDefenderId || normalized.equippedToDefenderId || null;
  normalized.acquiredAt = Number.isFinite(normalized.acquiredAt)
    ? normalized.acquiredAt
    : Number.isFinite(normalized.createdAt)
      ? normalized.createdAt
      : Date.now();
  return normalized;
}

function ensureCurrentRunModuleInventory(runState) {
  if (!runState || typeof runState !== "object") {
    return [];
  }

  const normalizedModules = Array.isArray(runState.recoveredModules)
    ? runState.recoveredModules.map((module) => normalizeCurrentRunModule(module)).filter(Boolean)
    : [];
  runState.recoveredModules = normalizedModules.reduce((modules, module) => {
    const existingIndex = modules.findIndex((existingModule) => existingModule.instanceId === module.instanceId);
    if (existingIndex === -1) {
      modules.push(module);
    } else {
      modules[existingIndex] = {
        ...modules[existingIndex],
        ...module,
        equippedToDefenderId: module.equippedToDefenderId || modules[existingIndex].equippedToDefenderId || null
      };
    }
    return modules;
  }, []);
  runState.equippedModulesByDefenderId = runState.equippedModulesByDefenderId && typeof runState.equippedModulesByDefenderId === "object"
    ? runState.equippedModulesByDefenderId
    : {};

  Object.entries(runState.equippedModulesByDefenderId).forEach(([defenderId, equippedModule]) => {
    if (!equippedModule) {
      delete runState.equippedModulesByDefenderId[defenderId];
      return;
    }

    if (typeof equippedModule === "string") {
      const inventoryMatch = runState.recoveredModules.find((module) => module.instanceId === equippedModule);
      if (inventoryMatch) {
        inventoryMatch.equippedToDefenderId = defenderId;
        runState.equippedModulesByDefenderId[defenderId] = inventoryMatch;
      } else {
        delete runState.equippedModulesByDefenderId[defenderId];
      }
      return;
    }

    const normalizedModule = normalizeCurrentRunModule(equippedModule, defenderId);
    if (!normalizedModule) {
      delete runState.equippedModulesByDefenderId[defenderId];
      return;
    }

    const existingIndex = runState.recoveredModules.findIndex((module) => module.instanceId === normalizedModule.instanceId);
    if (existingIndex === -1) {
      runState.recoveredModules.push(normalizedModule);
    } else {
      runState.recoveredModules[existingIndex] = {
        ...runState.recoveredModules[existingIndex],
        ...normalizedModule,
        equippedToDefenderId: defenderId
      };
    }
    runState.equippedModulesByDefenderId[defenderId] = runState.recoveredModules.find((module) => module.instanceId === normalizedModule.instanceId) || normalizedModule;
  });

  runState.recoveredModules.forEach((module) => {
    const defenderId = typeof module?.equippedToDefenderId === "string" ? module.equippedToDefenderId : "";
    if (!defenderId) {
      return;
    }

    const currentEntry = runState.equippedModulesByDefenderId[defenderId] || null;
    const currentModule = typeof currentEntry === "string"
      ? runState.recoveredModules.find((candidate) => candidate.instanceId === currentEntry) || null
      : currentEntry;
    const currentStillExists = currentModule?.instanceId
      ? runState.recoveredModules.some((candidate) => candidate.instanceId === currentModule.instanceId)
      : false;

    if (!currentStillExists) {
      runState.equippedModulesByDefenderId[defenderId] = module;
    }
  });

  return runState.recoveredModules;
}

function getCurrentRunModules(runState) {
  return ensureCurrentRunModuleInventory(runState);
}

const DEV_FORGE_SHARD_GRANT = 1000000;

function ensureForgeState(runState) {
  const sourceRun = runState?.currentRun || runState;
  if (!sourceRun || typeof sourceRun !== "object") {
    return null;
  }

  ensureCurrentRunModuleInventory(sourceRun);
  // DEV ONLY:
  // Temporary Forge Shard grant for rapid prototype testing.
  // Remove or replace with reward/drop economy before public release.
  if (!Number.isFinite(sourceRun.forgeShards) || sourceRun.forgeShards <= 0) {
    sourceRun.forgeShards = DEV_FORGE_SHARD_GRANT;
  }
  sourceRun.forgeShards = Math.max(0, Math.floor(sourceRun.forgeShards));
  sourceRun.recoveredModules.forEach((module) => {
    module.upgradeLevel = getModuleUpgradeLevel(module);
  });
  return sourceRun;
}

function devGrantForgeShards(runState, amount = DEV_FORGE_SHARD_GRANT) {
  const sourceRun = runState?.currentRun || runState;
  if (!sourceRun || typeof sourceRun !== "object") {
    return null;
  }

  ensureCurrentRunModuleInventory(sourceRun);
  sourceRun.forgeShards = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : DEV_FORGE_SHARD_GRANT));
  return sourceRun.forgeShards;
}

function getForgeShards(runState) {
  const sourceRun = ensureForgeState(runState);
  return Number.isFinite(sourceRun?.forgeShards) ? sourceRun.forgeShards : 0;
}

function getModuleUpgradeLevel(module) {
  return Number.isFinite(module?.upgradeLevel)
    ? Math.max(0, Math.min(3, Math.floor(module.upgradeLevel)))
    : 0;
}

function getModuleBaseStatUpgradePreview(module) {
  const baseStat = getModuleBaseStat(module);
  if (!baseStat?.statKey || !Number.isFinite(baseStat.value)) {
    return null;
  }

  const currentLevel = getModuleUpgradeLevel(module);
  const increment = 1;
  const isMaxed = currentLevel >= 3;
  const nextValue = isMaxed ? baseStat.value : baseStat.value + increment;
  return {
    statKey: baseStat.statKey,
    currentValue: baseStat.value,
    nextValue,
    currentLabel: formatModuleStatText(baseStat.statKey, baseStat.value),
    nextLabel: formatModuleStatText(baseStat.statKey, nextValue),
    increment,
    currentLevel,
    nextLevel: Math.min(3, currentLevel + 1),
    maxLevel: 3,
    cost: isMaxed ? 0 : currentLevel + 1
  };
}

function canUpgradeModuleBaseStat(module, runState) {
  const sourceRun = ensureForgeState(runState);
  const preview = getModuleBaseStatUpgradePreview(module);
  const shards = getForgeShards(sourceRun);
  if (!module || !preview) {
    return { ok: false, reason: "No base stat available for calibration.", preview, shards };
  }
  if (preview.currentLevel >= preview.maxLevel) {
    return { ok: false, reason: "Base stat calibration maxed for this prototype.", preview, shards };
  }
  if (shards < preview.cost) {
    return { ok: false, reason: "Not enough Forge Shards.", preview, shards };
  }
  return { ok: true, reason: "Forge ready.", preview, shards };
}

function upgradeModuleBaseStat(moduleInstanceId, runState) {
  const sourceRun = ensureForgeState(runState);
  if (!sourceRun || !moduleInstanceId) {
    return { ok: false, reason: "Forge state unavailable." };
  }

  const module = sourceRun.recoveredModules.find((candidate) => candidate?.instanceId === moduleInstanceId);
  const status = canUpgradeModuleBaseStat(module, sourceRun);
  if (!status.ok) {
    return { ok: false, reason: status.reason, preview: status.preview, module };
  }

  // canUpgradeModuleBaseStat normalizes the inventory; reacquire the live instance before mutating it.
  const liveModule = sourceRun.recoveredModules.find((candidate) => candidate?.instanceId === moduleInstanceId) || module;
  const preview = status.preview;
  const previousLabel = preview.currentLabel;
  const nextLabel = preview.nextLabel;
  if (!liveModule.baseStat || typeof liveModule.baseStat !== "object") {
    liveModule.baseStat = {
      statKey: preview.statKey,
      value: preview.currentValue,
      label: previousLabel
    };
  }

  liveModule.baseStat.statKey = preview.statKey;
  liveModule.baseStat.value = preview.nextValue;
  liveModule.baseStat.label = nextLabel;
  liveModule.upgradeLevel = preview.nextLevel;
  liveModule.upgradedAt = Date.now();
  const currentShards = Number.isFinite(sourceRun.forgeShards) ? sourceRun.forgeShards : 0;
  sourceRun.forgeShards = Math.max(0, currentShards - preview.cost);

  Object.entries(sourceRun.equippedModulesByDefenderId || {}).forEach(([defenderId, equippedModule]) => {
    const equippedInstanceId = typeof equippedModule === "string" ? equippedModule : equippedModule?.instanceId;
    if (equippedInstanceId === liveModule.instanceId) {
      sourceRun.equippedModulesByDefenderId[defenderId] = liveModule;
      liveModule.equippedToDefenderId = liveModule.equippedToDefenderId || defenderId;
    }
  });

  return {
    ok: true,
    module: liveModule,
    previousLabel,
    nextLabel,
    cost: preview.cost,
    upgradeLevel: liveModule.upgradeLevel,
    forgeShards: sourceRun.forgeShards
  };
}

function getEquippedModuleForDefenderId(runState, defenderId) {
  const sourceRun = runState?.currentRun || runState;
  ensureCurrentRunModuleInventory(sourceRun);
  const equipped = sourceRun?.equippedModulesByDefenderId;
  if (!equipped || typeof equipped !== "object" || !defenderId) {
    return null;
  }

  const equippedModule = equipped[defenderId] || null;
  if (typeof equippedModule === "string") {
    return sourceRun.recoveredModules.find((module) => module.instanceId === equippedModule) || null;
  }
  return equippedModule;
}

function equipRecoveredModule(runState, defenderId, moduleInstance) {
  if (!runState || !defenderId || !moduleInstance) {
    return null;
  }

  ensureCurrentRunModuleInventory(runState);
  const previousModule = getEquippedModuleForDefenderId(runState, defenderId);
  const nextModule = normalizeCurrentRunModule(moduleInstance, defenderId);
  if (!nextModule) {
    return previousModule;
  }

  nextModule.equippedAt = Date.now();

  Object.entries(runState.equippedModulesByDefenderId).forEach(([currentDefenderId, equippedModule]) => {
    const currentModule = typeof equippedModule === "string"
      ? runState.recoveredModules.find((module) => module.instanceId === equippedModule) || null
      : equippedModule;
    if (currentDefenderId !== defenderId && currentModule?.instanceId === nextModule.instanceId) {
      delete runState.equippedModulesByDefenderId[currentDefenderId];
    }
  });

  runState.recoveredModules.forEach((module) => {
    if (module?.instanceId === nextModule.instanceId && module.equippedToDefenderId && module.equippedToDefenderId !== defenderId) {
      module.equippedToDefenderId = null;
      delete module.equippedAt;
    }
  });

  if (previousModule?.instanceId && previousModule.instanceId !== nextModule.instanceId) {
    const previousIndex = runState.recoveredModules.findIndex((module) => module.instanceId === previousModule.instanceId);
    const unequippedPrevious = normalizeCurrentRunModule(previousModule, null);
    if (unequippedPrevious) {
      unequippedPrevious.equippedToDefenderId = null;
      delete unequippedPrevious.equippedAt;
      if (previousIndex === -1) {
        runState.recoveredModules.push(unequippedPrevious);
      } else {
        runState.recoveredModules[previousIndex] = {
          ...runState.recoveredModules[previousIndex],
          ...unequippedPrevious,
          equippedToDefenderId: null
        };
      }
    }
  }

  const nextIndex = runState.recoveredModules.findIndex((module) => module.instanceId === nextModule.instanceId);
  if (nextIndex === -1) {
    runState.recoveredModules.push(nextModule);
  } else {
    runState.recoveredModules[nextIndex] = {
      ...runState.recoveredModules[nextIndex],
      ...nextModule,
      equippedToDefenderId: defenderId
    };
  }

  const equippedInventoryModule = runState.recoveredModules.find((module) => module.instanceId === nextModule.instanceId) || nextModule;
  runState.equippedModulesByDefenderId[defenderId] = equippedInventoryModule;
  runState.recoveredModules.forEach((module) => {
    if (module?.instanceId !== equippedInventoryModule.instanceId && module?.equippedToDefenderId === defenderId) {
      module.equippedToDefenderId = null;
      delete module.equippedAt;
    }
  });
  return previousModule;
}

function getDefenderModuleStat(defender, statKey) {
  return getModuleStatBonus(defender?.equippedModule, statKey);
}

if (typeof window !== "undefined") {
  window.recoveredModuleSourceProfiles = recoveredModuleSourceProfiles;
  window.recoveredModuleRegistry = recoveredModuleRegistry;
  window.recoveredModuleAffixRegistry = recoveredModuleAffixRegistry;
  window.recoveredModuleRarityRules = recoveredModuleRarityRules;
  window.getRecoveredModuleBlueprint = getRecoveredModuleBlueprint;
  window.getRecoveredModuleSourceProfile = getRecoveredModuleSourceProfile;
  window.getRecoveredModuleConceptLabel = getRecoveredModuleConceptLabel;
  window.generateRecoveredModuleChoices = generateRecoveredModuleChoices;
  window.getModuleBaseStat = getModuleBaseStat;
  window.getModuleAffixList = getModuleAffixList;
  window.getModuleAffixDisplayText = getModuleAffixDisplayText;
  window.getModuleStatLabel = getModuleStatLabel;
  window.getModuleStatSupport = getModuleStatSupport;
  window.getModuleStatBonus = getModuleStatBonus;
  window.getDefenderBaseStats = getDefenderBaseStats;
  window.getEquippedModuleForProgram = getEquippedModuleForProgram;
  window.getDefenderEffectiveStats = getDefenderEffectiveStats;
  window.getRecoveredModuleShortLabel = getRecoveredModuleShortLabel;
  window.createRecoveredModuleInstanceId = createRecoveredModuleInstanceId;
  window.normalizeCurrentRunModule = normalizeCurrentRunModule;
  window.ensureCurrentRunModuleInventory = ensureCurrentRunModuleInventory;
  window.getCurrentRunModules = getCurrentRunModules;
  window.DEV_FORGE_SHARD_GRANT = DEV_FORGE_SHARD_GRANT;
  window.ensureForgeState = ensureForgeState;
  window.getForgeShards = getForgeShards;
  window.devGrantForgeShards = devGrantForgeShards;
  window.getModuleUpgradeLevel = getModuleUpgradeLevel;
  window.getModuleBaseStatUpgradePreview = getModuleBaseStatUpgradePreview;
  window.canUpgradeModuleBaseStat = canUpgradeModuleBaseStat;
  window.upgradeModuleBaseStat = upgradeModuleBaseStat;
  window.getEquippedModuleForDefenderId = getEquippedModuleForDefenderId;
  window.equipRecoveredModule = equipRecoveredModule;
  window.getDefenderModuleStat = getDefenderModuleStat;
}
