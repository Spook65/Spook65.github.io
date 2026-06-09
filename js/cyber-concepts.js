/* Cyber fundamentals registry for lightweight combat teaching hints and future Codex unlocks. */

const cyberConcepts = [
  {
    id: "detection",
    title: "Detection",
    beginnerDefinition: "Finding suspicious activity before it can spread or hide.",
    gameplayMeaning: "Scans and tags reveal threat behavior.",
    example: "An IDS notices unusual login attempts and raises an alert.",
    relatedCounters: ["scan", "reveal", "countertrace"]
  },
  {
    id: "containment",
    title: "Containment",
    beginnerDefinition: "Limiting a threat so it cannot move freely through a network.",
    gameplayMeaning: "Isolation and routing controls reduce incoming pressure.",
    example: "A compromised workstation is segmented away from critical servers.",
    relatedCounters: ["isolate", "redirect", "mitigate"]
  },
  {
    id: "malware_cleanup",
    title: "Malware Cleanup",
    beginnerDefinition: "Removing hostile code and the changes it leaves behind.",
    gameplayMeaning: "Purge and cleanse actions remove corruption from the field.",
    example: "Antivirus removes a trojan and clears persistence hooks.",
    relatedCounters: ["cleanse", "purge", "recover"]
  },
  {
    id: "hardening",
    title: "Hardening",
    beginnerDefinition: "Strengthening systems so attacks have less room to work.",
    gameplayMeaning: "Defensive posture lowers the impact of future attacks.",
    example: "Closing unused ports reduces the attack surface.",
    relatedCounters: ["guard", "mitigate", "isolate"]
  },
  {
    id: "recovery",
    title: "Recovery",
    beginnerDefinition: "Restoring safe service after disruption or compromise.",
    gameplayMeaning: "Recovery keeps Defenders operational during long fights.",
    example: "Backups restore files after ransomware encryption.",
    relatedCounters: ["recover", "cleanse", "purge"]
  },
  {
    id: "encryption",
    title: "Encryption",
    beginnerDefinition: "Locking data so it cannot be read without the right key.",
    gameplayMeaning: "Ransomware-style threats use encryption to create urgent pressure.",
    example: "A ransomware payload encrypts hospital workstations.",
    relatedCounters: ["isolate", "recover", "purge"]
  },
  {
    id: "phishing",
    title: "Phishing",
    beginnerDefinition: "Tricking people into giving away access or running a payload.",
    gameplayMeaning: "Deceptive threats often need detection and countertrace.",
    example: "A fake login page steals credentials from an employee.",
    relatedCounters: ["scan", "reveal", "countertrace"]
  },
  {
    id: "lateral_movement",
    title: "Lateral Movement",
    beginnerDefinition: "Moving from one compromised system to another.",
    gameplayMeaning: "Spread attacks are best slowed by containment.",
    example: "Malware jumps from a workstation toward a domain controller.",
    relatedCounters: ["isolate", "redirect", "mitigate"]
  },
  {
    id: "privilege_escalation",
    title: "Privilege Escalation",
    beginnerDefinition: "Gaining higher access to do more damage.",
    gameplayMeaning: "Escalation threats need fast detection, cleanup, or mitigation.",
    example: "An exploit gains admin-level control after a foothold.",
    relatedCounters: ["countertrace", "cleanse", "mitigate"]
  },
  {
    id: "incident_response",
    title: "Incident Response",
    beginnerDefinition: "The coordinated process of detecting, containing, and recovering from an attack.",
    gameplayMeaning: "Response choices turn enemy intent into tactical decisions.",
    example: "A team triages alerts, isolates hosts, and restores service.",
    relatedCounters: ["scan", "isolate", "recover"]
  },
  {
    id: "vulnerability",
    title: "Vulnerability",
    beginnerDefinition: "A weakness an attacker can exploit.",
    gameplayMeaning: "Exploit threats punish unpatched or exposed systems.",
    example: "An unpatched kernel bug allows attacker code to run.",
    relatedCounters: ["patch", "mitigate", "countertrace"]
  },
  {
    id: "patching",
    title: "Patching",
    beginnerDefinition: "Updating software to close known weaknesses.",
    gameplayMeaning: "Patching is a future recovery and hardening path.",
    example: "Applying a vendor fix closes an exploited flaw.",
    relatedCounters: ["harden", "recover", "mitigate"]
  }
];

const cyberConceptRegistry = cyberConcepts.reduce((registry, concept) => {
  registry[concept.id] = concept;
  return registry;
}, {});

function normalizeCyberConceptIds(conceptIds = []) {
  const sourceIds = Array.isArray(conceptIds) ? conceptIds : [conceptIds];
  const seen = new Set();
  const normalizedIds = [];

  sourceIds.flat().forEach((conceptId) => {
    if (typeof conceptId !== "string") {
      return;
    }

    const normalizedId = conceptId.trim().toLowerCase();
    if (!normalizedId || seen.has(normalizedId)) {
      return;
    }

    seen.add(normalizedId);
    normalizedIds.push(normalizedId);
  });

  return normalizedIds;
}

function getCyberConcept(conceptId) {
  const normalizedId = typeof conceptId === "string" ? conceptId.trim().toLowerCase() : "";
  return normalizedId ? cyberConceptRegistry[normalizedId] || null : null;
}

function buildCyberConceptHintText(conceptId) {
  const concept = getCyberConcept(conceptId);
  if (!concept) {
    return "";
  }

  return `${concept.title}: ${concept.gameplayMeaning}`;
}

function getFirstUnshownCyberConceptId(conceptIds = [], shownConceptIds = []) {
  const shownIds = new Set(normalizeCyberConceptIds(shownConceptIds));
  return normalizeCyberConceptIds(conceptIds).find((conceptId) => getCyberConcept(conceptId) && !shownIds.has(conceptId)) || "";
}

if (typeof window !== "undefined") {
  window.cyberConcepts = cyberConcepts;
  window.cyberConceptRegistry = cyberConceptRegistry;
  window.normalizeCyberConceptIds = normalizeCyberConceptIds;
  window.getCyberConcept = getCyberConcept;
  window.buildCyberConceptHintText = buildCyberConceptHintText;
  window.getFirstUnshownCyberConceptId = getFirstUnshownCyberConceptId;
}
