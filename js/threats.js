/* Threat data for THREATGRID lives here as the single source of truth for all active and future layers. */
const threats = [
  {
    id: "tg-001",
    type: "ransomware",
    severity: "critical",
    title: "Hospital Network Lockout",
    location: { lat: 40.7128, lng: -74.0060, city: "New York", country: "USA" },
    target: "Hospital network",
    vector: "Phishing email attachment",
    description: "Initial access was likely gained through a weaponized invoice attachment delivered to clinical staff. The payload is now encrypting radiology workstations and attempting lateral movement into electronic health record infrastructure. Recovery urgency is high because patient scheduling, imaging, and medication workflows are already degrading.",
    iocs: [
      "Mass file renames ending in .ryuklock",
      "SMB beaconing from radiology VLAN to domain controllers",
      "New scheduled task named Windows Backup Health"
    ],
    affectedSystems: [
      "Radiology workstations",
      "Electronic health record servers",
      "Active Directory domain controllers"
    ],
    status: "active",
    combatType: "offense",
    level: 4,
    hp: 118,
    maxHp: 118,
    atk: 6,
    def: 4,
    spd: 5,
    weakType: "defense",
    weakPoint: "isolate",
    difficultyTier: 6,
    learningStage: "response_ransomware_recovery",
    teachesConcepts: ["encryption", "recovery", "incident_response"],
    recommendedConcepts: ["containment", "recovery", "malware_cleanup"],
    beginnerSummary: "A ransomware lockout. Contain spread, clean hostile code, and recover service.",
    learningObjective: "Recover from ransomware pressure by containing spread and using cleanup responses.",
    intentTags: ["swarm", "spread", "lockout"],
    relatedConcepts: ["encryption", "lateral_movement", "phishing", "incident_response"],
    weakTo: ["isolate", "countertrace"],
    resists: ["purge"],
    immuneTo: ["bait"],
    abilities: [
      { name: "Encrypt Files", cost: 0, baseDamage: 20, effect: "status_encrypted", teachesConcepts: ["encryption", "malware_cleanup"] },
      { name: "Spread Network", cost: 1, baseDamage: 12, effect: "damage_all", teachesConcepts: ["lateral_movement", "containment"] },
      { name: "Escalate", cost: 2, baseDamage: 0, effect: "self_level_up", teachesConcepts: ["privilege_escalation"] }
    ]
  },
  {
    id: "tg-002",
    type: "phishing",
    severity: "medium",
    title: "Credential Harvest Cluster",
    location: { lat: -23.5505, lng: -46.6333, city: "Sao Paulo", country: "Brazil" },
    target: "Regional payment processors",
    vector: "Spoofed single sign-on portal",
    description: "A coordinated phishing wave is impersonating cloud identity providers used by finance teams in Sao Paulo. Victims are being redirected to cloned login pages that proxy passwords and session tokens in real time. Current telemetry suggests the campaign is focused on payroll and treasury roles.",
    iocs: [
      "Lookalike domain using sso-secure-brazil.com",
      "Repeated OAuth token requests from unfamiliar ASN",
      "Inbound messages with HTML smuggling attachments"
    ],
    affectedSystems: [
      "Corporate email accounts",
      "Single sign-on portals",
      "Finance department endpoints"
    ],
    status: "active",
    combatType: "deception",
    level: 2,
    hp: 88,
    maxHp: 88,
    atk: 4,
    def: 3,
    spd: 8,
    weakType: "offense",
    weakPoint: "revoke",
    difficultyTier: 5,
    learningStage: "social_engineering_phishing",
    teachesConcepts: ["phishing", "detection", "incident_response"],
    recommendedConcepts: ["detection", "countertrace", "incident_response"],
    beginnerSummary: "A credential theft campaign. Detection and countertrace expose deceptive access paths.",
    learningObjective: "Identify phishing behavior and use detection to choose safer counterplay.",
    intentTags: ["deceive", "harvest", "redirect"],
    relatedConcepts: ["phishing", "detection", "incident_response"],
    weakTo: ["scan", "reveal", "countertrace"],
    resists: ["redirect"],
    immuneTo: [],
    abilities: [
      { name: "Harvest Credentials", cost: 0, baseDamage: 14, effect: "status_detected", teachesConcepts: ["phishing", "detection"] },
      { name: "Spoof Tenant", cost: 1, baseDamage: 10, effect: "damage_all", teachesConcepts: ["phishing", "lateral_movement"] },
      { name: "Escalate", cost: 2, baseDamage: 0, effect: "self_level_up", teachesConcepts: ["privilege_escalation"] }
    ]
  },
  {
    id: "tg-003",
    type: "ddos",
    severity: "high",
    title: "Transit Gateway Flood",
    location: { lat: 51.5072, lng: -0.1276, city: "London", country: "United Kingdom" },
    target: "Transit gateway edge routers",
    vector: "Volumetric UDP amplification",
    description: "Edge telemetry indicates a sustained volumetric denial-of-service event targeting transit gateway infrastructure serving London exchanges. The traffic mix is dominated by reflected UDP payloads, with spikes consistent with CLDAP and NTP amplification. If the flood persists, downstream enterprise customers will start losing session stability across multiple carriers.",
    iocs: [
      "Inbound UDP surge above baseline by 430 percent",
      "Source distribution concentrated in open resolver networks",
      "Sustained CLDAP reflection signatures on port 389"
    ],
    affectedSystems: [
      "Border routers",
      "Transit gateway load balancers",
      "Customer-facing edge links"
    ],
    status: "active",
    combatType: "offense",
    level: 3,
    hp: 98,
    maxHp: 98,
    atk: 5,
    def: 4,
    spd: 6,
    weakType: "purge",
    weakPoint: "reroute",
    difficultyTier: 7,
    learningStage: "network_flood_containment",
    teachesConcepts: ["containment", "incident_response"],
    recommendedConcepts: ["containment", "hardening", "incident_response"],
    beginnerSummary: "A network flood. Mitigation and routing controls limit service disruption.",
    learningObjective: "Contain flood pressure before it disrupts multiple Defenders.",
    intentTags: ["swarm", "flood", "saturate"],
    relatedConcepts: ["containment", "incident_response"],
    weakTo: ["mitigate", "redirect", "isolate"],
    resists: ["purge"],
    immuneTo: ["decoy"],
    behaviorProfile: {
      archetype: "flood",
      actionsPerTurn: 2,
      targetPattern: "differentIfPossible",
      actionWeight: "light"
    },
    abilities: [
      { name: "Amplify Flood", cost: 0, baseDamage: 18, effect: "damage_all", requiresResponse: true, threatLevel: "major", payloadType: "flood", telegraphed: true, teachesConcepts: ["containment", "incident_response"] },
      { name: "Fragment Route", cost: 1, baseDamage: 14, effect: "status_isolated", teachesConcepts: ["containment"] },
      { name: "Escalate", cost: 2, baseDamage: 0, effect: "self_level_up", teachesConcepts: ["privilege_escalation"] }
    ]
  },
  {
    id: "tg-004",
    type: "botnet",
    severity: "low",
    title: "IoT Beacon Swarm",
    location: { lat: 6.5244, lng: 3.3792, city: "Lagos", country: "Nigeria" },
    target: "Consumer IoT camera fleet",
    vector: "Default credential abuse",
    description: "Low-volume beaconing suggests a botnet is quietly enrolling internet-exposed IoT devices in the Lagos region. Most callbacks are short lived and originate from poorly secured camera and DVR installations still using factory credentials. The activity is early stage but could be weaponized into a larger command-and-control cluster if left unchecked.",
    iocs: [
      "Outbound telnet attempts to known malware controllers",
      "Frequent DNS lookups for rotating dynamic DNS hosts",
      "Mirai-like process names on exposed DVR consoles"
    ],
    affectedSystems: [
      "IP cameras",
      "DVR appliances",
      "Small-office edge gateways"
    ],
    status: "active",
    combatType: "deception",
    level: 1,
    hp: 70,
    maxHp: 70,
    atk: 3,
    def: 2,
    spd: 9,
    weakType: "purge",
    weakPoint: "sinkhole",
    difficultyTier: 3,
    learningStage: "worm_lateral_movement",
    teachesConcepts: ["lateral_movement", "containment", "malware_cleanup"],
    recommendedConcepts: ["containment", "detection", "malware_cleanup"],
    beginnerSummary: "A spreading device swarm. Scan, isolate, and purge before it multiplies.",
    learningObjective: "Watch for lateral movement and contain the swarm before it spreads.",
    intentTags: ["swarm", "beacon", "spread"],
    relatedConcepts: ["lateral_movement", "malware_cleanup", "incident_response"],
    weakTo: ["scan", "isolate", "purge"],
    resists: ["redirect"],
    immuneTo: [],
    behaviorProfile: {
      archetype: "swarm",
      actionsPerTurn: 2,
      targetPattern: "randomLiving",
      actionWeight: "light"
    },
    abilities: [
      { name: "Beacon C2", cost: 0, baseDamage: 12, effect: "status_detected", teachesConcepts: ["detection", "malware_cleanup"] },
      { name: "Multiply Nodes", cost: 1, baseDamage: 10, effect: "damage_all", requiresResponse: true, threatLevel: "major", payloadType: "swarm", telegraphed: true, teachesConcepts: ["lateral_movement", "containment"] },
      { name: "Reinfect", cost: 2, baseDamage: 0, effect: "self_level_up", teachesConcepts: ["malware_cleanup"] }
    ]
  },
  {
    id: "tg-005",
    type: "zero-day",
    severity: "critical",
    title: "Kernel Exploit Propagation",
    location: { lat: 35.6762, lng: 139.6503, city: "Tokyo", country: "Japan" },
    target: "Financial trading servers",
    vector: "Unpatched kernel privilege escalation",
    description: "Incident data points to an in-the-wild kernel zero-day being chained with a remote foothold inside Tokyo-based trading environments. Once initial access is established, the exploit elevates to system privileges and disables endpoint controls before spreading. The attacker appears to be pursuing persistence on latency-sensitive servers that support order routing and market data handling.",
    iocs: [
      "Unexpected unsigned kernel module loads",
      "Endpoint protection service termination events",
      "Crash dumps referencing ntoskrnl privilege checks"
    ],
    affectedSystems: [
      "Trading application servers",
      "Market data collectors",
      "Privileged jump hosts"
    ],
    status: "active",
    combatType: "purge",
    level: 6,
    hp: 138,
    maxHp: 138,
    atk: 7,
    def: 5,
    spd: 7,
    weakType: "offense",
    weakPoint: "patch",
    difficultyTier: 4,
    learningStage: "vulnerability_patching",
    teachesConcepts: ["vulnerability", "patching", "hardening", "privilege_escalation"],
    recommendedConcepts: ["detection", "hardening", "malware_cleanup"],
    beginnerSummary: "An exploit chain abusing an unpatched service. Harden and patch weaknesses.",
    learningObjective: "Recognize the vulnerability path and harden systems against escalation.",
    intentTags: ["escalate", "corrupt", "breach"],
    relatedConcepts: ["vulnerability", "privilege_escalation", "patching", "incident_response"],
    weakTo: ["countertrace", "cleanse", "mitigate"],
    resists: ["decoy"],
    immuneTo: ["bait"],
    behaviorProfile: {
      archetype: "elite",
      actionsPerTurn: 2,
      targetPattern: "lowestHp",
      actionWeight: "mixed"
    },
    abilities: [
      { name: "Privilege Escalate", cost: 0, baseDamage: 22, effect: "status_encrypted", requiresResponse: true, threatLevel: "major", payloadType: "exploit", telegraphed: true, teachesConcepts: ["privilege_escalation", "vulnerability"] },
      { name: "Disable EDR", cost: 1, baseDamage: 18, effect: "damage_all", requiresResponse: true, threatLevel: "major", payloadType: "corrupt", telegraphed: true, teachesConcepts: ["hardening", "incident_response"] },
      { name: "Kernel Chain", cost: 2, baseDamage: 0, effect: "self_level_up", requiresResponse: true, threatLevel: "major", payloadType: "escalate", telegraphed: true, teachesConcepts: ["privilege_escalation", "patching"] }
    ]
  },
  {
    id: "tg-006",
    type: "trojan",
    severity: "medium",
    title: "Banking Trojan Relay",
    location: { lat: 25.2048, lng: 55.2708, city: "Dubai", country: "UAE" },
    target: "Retail banking endpoints",
    vector: "Malvertising drive-by download",
    description: "A banking trojan cluster is relaying staged payloads through compromised advertising infrastructure targeting browsers in the Dubai financial corridor. Infected systems are establishing encrypted outbound sessions, injecting fake login forms, and harvesting browser-stored credentials. The operation remains contained but the malware family is capable of account takeover and fraudulent wire initiation.",
    iocs: [
      "Encrypted callbacks to rotating CDN subdomains",
      "Injected browser process with unusual DLL sideload path",
      "Registry run key named SecureBrowserUpdate"
    ],
    affectedSystems: [
      "Retail banker laptops",
      "Customer service desktops",
      "Shared browser session hosts"
    ],
    status: "active",
    combatType: "offense",
    level: 3,
    hp: 94,
    maxHp: 94,
    atk: 5,
    def: 3,
    spd: 6,
    weakType: "purge",
    weakPoint: "isolate",
    difficultyTier: 2,
    learningStage: "malware_cleanup_basics",
    teachesConcepts: ["malware_cleanup", "containment", "detection"],
    recommendedConcepts: ["detection", "containment", "malware_cleanup"],
    beginnerSummary: "A malware dropper. Detect the payload, isolate it, then clean hostile code.",
    learningObjective: "Use detection and cleanup to remove malware without letting it persist.",
    intentTags: ["stealth", "harvest", "persist"],
    relatedConcepts: ["malware_cleanup", "detection", "phishing"],
    weakTo: ["scan", "cleanse", "isolate"],
    resists: ["redirect"],
    immuneTo: [],
    abilities: [
      { name: "Inject Form", cost: 0, baseDamage: 15, effect: "status_detected", teachesConcepts: ["malware_cleanup", "detection"] },
      { name: "Steal Sessions", cost: 1, baseDamage: 13, effect: "damage_all", teachesConcepts: ["phishing", "lateral_movement"] },
      { name: "Reconnect", cost: 2, baseDamage: 0, effect: "self_level_up", teachesConcepts: ["malware_cleanup"] }
    ]
  },
  {
    id: "tg-007",
    type: "ddos",
    severity: "high",
    title: "Subsea Cable Saturation",
    location: { lat: -33.9249, lng: 18.4241, city: "Cape Town", country: "South Africa" },
    target: "Subsea cable landing network",
    vector: "SYN flood and GRE spray",
    description: "Cape Town telemetry shows a multi-vector denial-of-service campaign focused on links servicing a subsea cable landing network. The attacker is mixing SYN floods with GRE encapsulated traffic to exhaust upstream filtering capacity and congest aggregation devices. Regional latency has already begun to rise for enterprise tenants relying on those paths for international transit.",
    iocs: [
      "SYN queue exhaustion on coastal edge firewalls",
      "GRE tunnel packets from spoofed global address space",
      "Abrupt packet loss on saturation-prone peering links"
    ],
    affectedSystems: [
      "Peering firewalls",
      "Aggregation switches",
      "International transit circuits"
    ],
    status: "active",
    combatType: "offense",
    level: 5,
    hp: 112,
    maxHp: 112,
    atk: 6,
    def: 4,
    spd: 6,
    weakType: "defense",
    weakPoint: "divert",
    difficultyTier: 8,
    learningStage: "advanced_infrastructure_containment",
    teachesConcepts: ["containment", "hardening", "incident_response"],
    recommendedConcepts: ["containment", "hardening", "incident_response"],
    beginnerSummary: "A larger infrastructure flood. Strong response planning keeps services online.",
    learningObjective: "Coordinate containment and hardening against a larger disruption.",
    intentTags: ["swarm", "saturate", "disrupt"],
    relatedConcepts: ["containment", "incident_response"],
    weakTo: ["mitigate", "redirect", "isolate"],
    resists: ["purge"],
    immuneTo: ["decoy"],
    behaviorProfile: {
      archetype: "flood",
      actionsPerTurn: 2,
      targetPattern: "differentIfPossible",
      actionWeight: "light"
    },
    abilities: [
      { name: "Saturate Peering", cost: 0, baseDamage: 19, effect: "damage_all", requiresResponse: true, threatLevel: "major", payloadType: "saturate", telegraphed: true, teachesConcepts: ["containment", "incident_response"] },
      { name: "GRE Spray", cost: 1, baseDamage: 15, effect: "status_isolated", teachesConcepts: ["containment"] },
      { name: "Escalate", cost: 2, baseDamage: 0, effect: "self_level_up", teachesConcepts: ["privilege_escalation"] }
    ]
  },
  {
    id: "tg-008",
    type: "phishing",
    severity: "low",
    title: "Regional Mail Spoof Wave",
    location: { lat: -33.8688, lng: 151.2093, city: "Sydney", country: "Australia" },
    target: "Regional government mail users",
    vector: "Spoofed password reset campaign",
    description: "A low-severity phishing wave is spoofing internal password reset notices across public-sector mailboxes in Sydney. Most messages are unsophisticated, but several include convincing branding and short-lived redirect chains that obscure the final credential capture page. The campaign is still early and can likely be contained with rapid filtering and user notification.",
    iocs: [
      "Messages failing DMARC but passing display-name trust checks",
      "Redirect chains through compromised WordPress sites",
      "Login prompts hosted behind shortened URL services"
    ],
    affectedSystems: [
      "Government email tenants",
      "User identity portals",
      "Shared webmail access terminals"
    ],
    status: "active",
    combatType: "deception",
    level: 1,
    hp: 74,
    maxHp: 74,
    atk: 3,
    def: 2,
    spd: 7,
    weakType: "offense",
    weakPoint: "inspect",
    difficultyTier: 1,
    learningStage: "basics_detection",
    teachesConcepts: ["detection", "phishing", "incident_response"],
    recommendedConcepts: ["detection", "countertrace"],
    beginnerSummary: "A suspicious login pattern. Scan to reveal behavior before responding.",
    learningObjective: "Use Detection to reveal threat behavior before choosing a response.",
    intentTags: ["deceive", "redirect", "harvest"],
    relatedConcepts: ["phishing", "detection"],
    weakTo: ["scan", "reveal", "countertrace"],
    resists: ["redirect"],
    immuneTo: [],
    abilities: [
      { name: "Reset Request", cost: 0, baseDamage: 11, effect: "status_detected", teachesConcepts: ["phishing", "detection"] },
      { name: "Redirect Chain", cost: 1, baseDamage: 9, effect: "damage_all", teachesConcepts: ["phishing", "lateral_movement"] },
      { name: "Escalate", cost: 2, baseDamage: 0, effect: "self_level_up", teachesConcepts: ["privilege_escalation"] }
    ]
  }
];

const beginnerThreatProgression = [
  {
    threatId: "tg-008",
    learningStage: "basics_detection",
    concepts: ["detection", "phishing"],
    objective: "Use Detection to reveal threat behavior before choosing a response."
  },
  {
    threatId: "tg-006",
    learningStage: "malware_cleanup_basics",
    concepts: ["malware_cleanup", "containment"],
    objective: "Detect the payload, isolate it, and clean hostile code."
  },
  {
    threatId: "tg-004",
    learningStage: "worm_lateral_movement",
    concepts: ["lateral_movement", "containment"],
    objective: "Watch for lateral movement and contain the swarm before it spreads."
  },
  {
    threatId: "tg-005",
    learningStage: "vulnerability_patching",
    concepts: ["vulnerability", "patching", "hardening"],
    objective: "Recognize the vulnerability path and harden systems against escalation."
  },
  {
    threatId: "tg-002",
    learningStage: "social_engineering_phishing",
    concepts: ["phishing", "detection", "incident_response"],
    objective: "Identify phishing behavior and use detection to choose safer counterplay."
  },
  {
    threatId: "tg-001",
    learningStage: "response_ransomware_recovery",
    concepts: ["recovery", "encryption", "incident_response"],
    objective: "Recover from ransomware pressure by containing spread and using cleanup responses."
  }
];

function normalizeThreatConceptIds(conceptIds = []) {
  if (typeof normalizeCyberConceptIds === "function") {
    return normalizeCyberConceptIds(conceptIds);
  }

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

function getThreatLearningConcepts(threat) {
  return normalizeThreatConceptIds([
    ...(Array.isArray(threat?.teachesConcepts) ? threat.teachesConcepts : []),
    ...(Array.isArray(threat?.relatedConcepts) ? threat.relatedConcepts : []),
    ...(Array.isArray(threat?.recommendedConcepts) ? threat.recommendedConcepts : [])
  ]);
}

function getBeginnerThreatProgressionStep(progressIndex = 0) {
  const safeIndex = Math.max(0, Math.floor(Number.isFinite(progressIndex) ? progressIndex : 0));
  return beginnerThreatProgression[safeIndex] || null;
}

function getThreatLearningObjective(threat) {
  if (typeof threat?.learningObjective === "string" && threat.learningObjective.trim()) {
    return threat.learningObjective.trim();
  }

  if (typeof threat?.beginnerSummary === "string" && threat.beginnerSummary.trim()) {
    return threat.beginnerSummary.trim();
  }

  return "";
}

function selectBeginnerThreatForProgression(clickedThreat, progressIndex = 0) {
  const step = getBeginnerThreatProgressionStep(progressIndex);
  if (!step) {
    return clickedThreat || null;
  }

  const activeThreats = threats.filter((threat) => threat.status === "active");
  const exactThreat = activeThreats.find((threat) => threat.id === step.threatId);
  if (exactThreat) {
    return exactThreat;
  }

  const stepConcepts = normalizeThreatConceptIds(step.concepts || []);
  const conceptMatch = activeThreats.find((threat) => {
    const threatConcepts = getThreatLearningConcepts(threat);
    return stepConcepts.some((conceptId) => threatConcepts.includes(conceptId));
  });

  return conceptMatch || clickedThreat || activeThreats[0] || null;
}
