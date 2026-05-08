/* Main wiring for THREATGRID: create the globe, run game rules, and drive the Layer 2 and Layer 3 panel UI. */
const globe = new ThreatGlobe(document.getElementById("globe-root"), threats);
const initialThreatBlueprints = threats.map((threat) => JSON.parse(JSON.stringify(threat)));

// activePanelThreat tracks which threat is currently being shown in the side panel.
let activePanelThreat = null;

// Score state is stored here because it belongs to game rules, not rendering.
let playerScore = 0;
let playerAccuracy = 100;
let threatsNeutralized = 0;
let totalCommandAttempts = 0;
let correctCommandAttempts = 0;

// stepHintState resets for each new threat because hints and mistakes should not leak between separate missions.
let stepHintState = {}; // { stepIndex: mistakeCount }

let panelNeutralizing = false;
let panelOpenedAt = 0;
let currentOperatorSession = null;
let threatResponsesWired = false;
let escalationTimersStarted = false;
let deadlineTimerIntervalId = null;
let respawnIntervalId = null;
let typewriterIntervalId = null;
let missionTimerIntervalId = null;
let escalationTickerId = null;
let closePanelTimeoutId = null;
let panelTimeoutIds = [];
let deadlineStartTime = null;
// Deadline = threat_count * 1.5 min (8 threats = 12 min), so the clock scales with the live roster.
let deadlineMs = 12 * 60 * 1000;
let playerDeadlineExpired = false;
let missionEnded = false;
let pendingGameOverOutcome = null;
let playerPath = null;

// The party roster persists across battles so the run keeps its roguelike progression state.
const programs = [
  {
    id: "firewall-7",
    name: "Firewall-7",
    type: "defense",
    level: 1,
    hp: 100,
    maxHp: 100,
    atk: 3,
    def: 7,
    spd: 6,
    color: "#00ccff",
    xp: 0,
    statusEffects: [],
    abilities: [
      {
        name: "Block Network",
        cost: 0,
        baseDamage: 0,
        effect: "reduce_next_damage"
      },
      {
        name: "Harden Ports",
        cost: 1,
        baseDamage: 15,
        effect: "boost_def"
      },
      {
        name: "Allocate Bandwidth",
        cost: 2,
        baseDamage: 25,
        effect: "shared_ability"
      }
    ]
  },
  {
    id: "ids-4",
    name: "IDS",
    type: "offense",
    level: 1,
    hp: 92,
    maxHp: 92,
    atk: 6,
    def: 4,
    spd: 8,
    color: "#00ff88",
    xp: 0,
    statusEffects: [],
    abilities: [
      {
        name: "Deep Packet Scan",
        cost: 0,
        baseDamage: 16,
        effect: "status_detected"
      },
      {
        name: "Signature Burst",
        cost: 1,
        baseDamage: 22,
        effect: "status_detected"
      },
      {
        name: "Quarantine Relay",
        cost: 2,
        baseDamage: 28,
        effect: "shared_ability"
      }
    ]
  },
  {
    id: "honeypot-3",
    name: "Honeypot",
    type: "deception",
    level: 1,
    hp: 96,
    maxHp: 96,
    atk: 4,
    def: 5,
    spd: 7,
    color: "#ffcc00",
    xp: 0,
    statusEffects: [],
    abilities: [
      {
        name: "Lure Traffic",
        cost: 0,
        baseDamage: 14,
        effect: "status_isolated"
      },
      {
        name: "Decoy Mesh",
        cost: 1,
        baseDamage: 20,
        effect: "boost_def"
      },
      {
        name: "Sandtrap",
        cost: 2,
        baseDamage: 26,
        effect: "status_isolated"
      }
    ]
  },
  {
    id: "antivirus-9",
    name: "Antivirus",
    type: "purge",
    level: 1,
    hp: 108,
    maxHp: 108,
    atk: 5,
    def: 6,
    spd: 5,
    color: "#ff2233",
    xp: 0,
    statusEffects: [],
    abilities: [
      {
        name: "Signature Sweep",
        cost: 0,
        baseDamage: 16,
        effect: "cleanse"
      },
      {
        name: "Rapid Scan",
        cost: 1,
        baseDamage: 22,
        effect: "status_detected"
      },
      {
        name: "Kernel Purge",
        cost: 2,
        baseDamage: 30,
        effect: "cleanse"
      }
    ]
  }
];

// The default roster snapshot lets the run reset cleanly when the player returns to the menu.
const defaultPrograms = JSON.parse(JSON.stringify(programs));

// combatState stays global so DevTools can inspect the active battle without digging through closures.
let combatState = null;
let combatEngine = null;
let encounterTransitionActive = false;
let encounterTransitionTimerId = null;

// Escalation state is tracked outside globe.js because these are game rules, while globe.js only renders state.
const escalationStateByThreatId = {};

// DOM references are cached once so panel updates stay simple and readable.
const threatPanel = document.getElementById("threat-panel");
const threatPanelContent = document.getElementById("threat-panel-content");
const threatPanelClose = document.getElementById("threat-panel-close");
const scoreDisplay = document.getElementById("score-display");
const accuracyDisplay = document.getElementById("accuracy-display");
const deadlineDisplay = document.getElementById("deadline-display");
const expeditionFlagButton = document.getElementById("expedition-flag-button");
const encounterOverlay = document.getElementById("encounter-overlay");
const gameStateContent = document.getElementById("game-state-content");

// Severity colors are reused in the panel so the text UI matches the node colors on the globe.
const severityColorLookup = {
  critical: "#ff2233",
  high: "#ff6600",
  medium: "#ffcc00",
  low: "#00ffcc"
};

// These labels keep type names consistent anywhere the panel needs human-friendly text.
const threatTypeLabelLookup = {
  ransomware: "RANSOMWARE",
  phishing: "PHISHING",
  ddos: "DDOS",
  botnet: "BOTNET",
  "zero-day": "ZERO-DAY",
  trojan: "TROJAN"
};

// Each type gets staged response steps so the operator mode has commands to validate.
const mitigationLookup = {
  ransomware: [
    {
      label: "ISOLATE INFECTED HOSTS",
      command: "isolate-endpoint --tag clinical-ransomware --segment radiology-vlan"
    },
    {
      label: "BLOCK ENCRYPTOR LATERAL MOVEMENT",
      command: "firewallctl deny smb --source infected-subnet --target ad-core"
    },
    {
      label: "RESTORE CLEAN RECOVERY PATH",
      command: "backup-verify --scope ehr-core --latest-clean --prepare restore-window"
    }
  ],
  phishing: [
    {
      label: "DISABLE ACTIVE LURE DOMAINS",
      command: "mailguard quarantine --campaign phishing-cluster --revoke sender-reputation"
    },
    {
      label: "REVOKE STOLEN TOKENS",
      command: "identityctl revoke-sessions --group finance-users --reason suspected-credential-harvest"
    },
    {
      label: "ENFORCE USER REAUTHENTICATION",
      command: "identityctl force-password-reset --scope exposed-mailboxes --notify soc-team"
    }
  ],
  ddos: [
    {
      label: "REROUTE TRAFFIC THROUGH SCRUBBER",
      command: "traffic-engine divert --profile volumetric-shield --target transit-edge"
    },
    {
      label: "DROP AMPLIFICATION SIGNATURES",
      command: "acl push --template udp-reflection-block --ports 123,389,1900"
    },
    {
      label: "RAISE UPSTREAM RATE LIMITS",
      command: "carrier-sync apply --burst-cap emergency-ddos --region affected-edge"
    }
  ],
  botnet: [
    {
      label: "SINKHOLE COMMAND DOMAINS",
      command: "dns-sinkhole add --feed iot-botnet-c2 --ttl 300"
    },
    {
      label: "BLOCK DEFAULT-CREDENTIAL PROBES",
      command: "ids tune --signature telnet-bruteforce --action drop"
    },
    {
      label: "TAG EXPOSED DEVICES FOR PATCHING",
      command: "assetctl mark --class iot-edge --status quarantine-review"
    }
  ],
  "zero-day": [
    {
      label: "CONTAIN PRIVILEGED SYSTEMS",
      command: "segctl isolate --tier privileged-compute --reason kernel-exploit-containment"
    },
    {
      label: "PUSH EMERGENCY DETECTION RULES",
      command: "edr deploy-hunt --package kernel-zero-day-watch --priority immediate"
    },
    {
      label: "ROTATE HIGH-RISK CREDENTIALS",
      command: "vaultctl rotate --scope tier0-admin --force --ticket tg-zero-day"
    }
  ],
  trojan: [
    {
      label: "CUT MALWARE CALLBACK PATHS",
      command: "proxyctl block --feed banking-trojan-c2 --category malware-relay"
    },
    {
      label: "REMOVE PERSISTENCE ARTIFACTS",
      command: "edr remediate --artifact SecureBrowserUpdate --scope finance-endpoints"
    },
    {
      label: "RESET EXPOSED BANKING SESSIONS",
      command: "sessionctl invalidate --app retail-banking --users affected-operators"
    }
  ]
};

// Debrief guidance is hardcoded per type so the game can teach prevention ideas without any backend calls.
const preventionTipsLookup = {
  ransomware: [
    "ENFORCE OFFLINE BACKUP VERIFICATION ON CRITICAL SYSTEMS",
    "SEGMENT HIGH-VALUE CLINICAL AND IDENTITY INFRASTRUCTURE",
    "BLOCK MACRO-BASED ATTACHMENTS AT THE MAIL GATEWAY"
  ],
  phishing: [
    "REQUIRE PHISH-RESISTANT MFA FOR SENSITIVE USERS",
    "MONITOR LOOKALIKE DOMAINS AND DISPLAY-NAME SPOOFING",
    "ROLL OUT JUST-IN-TIME USER REPORTING FOR SUSPICIOUS EMAIL"
  ],
  ddos: [
    "PRE-STAGE UPSTREAM SCRUBBING ROUTES WITH CARRIERS",
    "MAINTAIN RATE-LIMIT TEMPLATES FOR REFLECTION TRAFFIC",
    "DISTRIBUTE EDGE SERVICES ACROSS MULTIPLE TRANSIT PATHS"
  ],
  botnet: [
    "DISABLE DEFAULT CREDENTIALS BEFORE DEVICE DEPLOYMENT",
    "INVENTORY INTERNET-EXPOSED IOT ASSETS CONTINUOUSLY",
    "BLOCK OUTBOUND MANAGEMENT PROTOCOLS FROM UNTRUSTED SEGMENTS"
  ],
  "zero-day": [
    "PATCH KERNEL AND EDR DEPENDENCIES ON AN EMERGENCY CADENCE",
    "LIMIT ADMIN ACCESS THROUGH HARDENED PRIVILEGED JUMP HOSTS",
    "ENABLE BEHAVIORAL DETECTION FOR DRIVER AND MODULE ANOMALIES"
  ],
  trojan: [
    "FILTER MALVERTISING AND SCRIPT INJECTION AT THE PROXY LAYER",
    "HARDEN BROWSER SESSION STORAGE ON FINANCIAL ENDPOINTS",
    "HUNT REGULARLY FOR SIDELOADED MODULES IN USER PROFILE PATHS"
  ]
};

// updateScoreDisplay() refreshes the HUD so score and accuracy reflect the latest game state immediately.
function updateScoreDisplay() {
  playerAccuracy = totalCommandAttempts === 0
    ? 100
    : Math.round((correctCommandAttempts / totalCommandAttempts) * 100);

  scoreDisplay.textContent = `SCORE: ${String(Math.max(0, playerScore)).padStart(5, "0")}`;
  accuracyDisplay.textContent = `ACC: ${playerAccuracy}%`;
}

// addScore() applies a delta and keeps the HUD in sync after every reward or penalty.
function addScore(amount) {
  playerScore = Math.max(0, playerScore + amount);
  updateScoreDisplay();
}

// cloneThreatBlueprint() keeps restart data isolated from the live threat objects that mutate during play.
function cloneThreatBlueprint(threat) {
  return JSON.parse(JSON.stringify(threat));
}

// restoreThreatRoster() resets the shared threat array back to the original eight live targets.
function restoreThreatRoster() {
  const restoredThreats = initialThreatBlueprints.map(cloneThreatBlueprint);
  threats.length = 0;
  restoredThreats.forEach((threat) => {
    threats.push(threat);
  });

  Object.keys(escalationStateByThreatId).forEach((threatId) => {
    delete escalationStateByThreatId[threatId];
  });
}

// updateDeadlineDisplay() keeps the HUD countdown synchronized with the mission clock.
function updateDeadlineDisplay() {
  if (!deadlineDisplay) {
    return;
  }

  if (screenState !== "game" || deadlineStartTime === null) {
    deadlineDisplay.textContent = "DEADLINE: --:--";
    deadlineDisplay.classList.remove("is-warning", "is-danger");
    return;
  }

  const elapsed = Date.now() - deadlineStartTime;
  const remaining = Math.max(0, deadlineMs - elapsed);

  deadlineDisplay.textContent = `DEADLINE: ${formatClock(remaining)}`;
  deadlineDisplay.classList.toggle("is-warning", remaining <= 180000 && remaining > 60000);
  deadlineDisplay.classList.toggle("is-danger", remaining <= 60000);
}

// stopMissionSystems() clears the long-running mission timers so an ended run cannot keep mutating state.
function stopMissionSystems() {
  clearPanelAsyncWork();

  if (deadlineTimerIntervalId !== null) {
    window.clearInterval(deadlineTimerIntervalId);
    deadlineTimerIntervalId = null;
  }

  if (respawnIntervalId !== null) {
    window.clearInterval(respawnIntervalId);
    respawnIntervalId = null;
  }

  if (escalationTickerId !== null) {
    window.clearInterval(escalationTickerId);
    escalationTickerId = null;
  }

  escalationTimersStarted = false;
}

// resetMissionState() restores score, timers, and the threat roster before a fresh mission starts.
function resetMissionState() {
  stopMissionSystems();

  if (globe && globe.nodeMap) {
    Array.from(globe.nodeMap.keys()).forEach((threatId) => {
      globe.removeThreatNode(threatId);
    });
  }

  restoreThreatRoster();

  playerScore = 0;
  playerAccuracy = 100;
  threatsNeutralized = 0;
  totalCommandAttempts = 0;
  correctCommandAttempts = 0;
  stepHintState = {};
  panelNeutralizing = false;
  panelOpenedAt = 0;
  currentOperatorSession = null;
  playerDeadlineExpired = false;
  missionEnded = false;
  pendingGameOverOutcome = null;
  deadlineStartTime = null;
  playerPath = null;

  updateScoreDisplay();
  updateDeadlineDisplay();
  globe.syncThreatNodes();
  globe.updateActiveCount();
}

// startRespawnInterval() keeps the earlier-layer background lifecycle running while the mission is active.
function startRespawnInterval() {
  if (respawnIntervalId !== null) {
    window.clearInterval(respawnIntervalId);
  }

  respawnIntervalId = window.setInterval(() => {
    if (missionEnded || screenState !== "game") {
      return;
    }

    globe.respawnRandomThreat();
    globe.syncThreatNodes();

    threats.forEach((threat) => {
      if (threat.status === "active") {
        ensureEscalationState(threat, false);
      }
    });
  }, 12000);
}

// checkDeadlineExpired() ends the mission if the clock reaches zero before all eight threats are cleared.
function checkDeadlineExpired() {
  if (missionEnded || playerDeadlineExpired || deadlineStartTime === null) {
    return;
  }

  const remaining = deadlineMs - (Date.now() - deadlineStartTime);

  if (remaining <= 0 && threatsNeutralized < 8) {
    playerDeadlineExpired = true;
    missionEnded = true;
    pendingGameOverOutcome = null;
    stopMissionSystems();
    closeThreatPanel(true);
    showGameOverScreen("lose");
  }
}

// startDeadlineTimer() drives the HUD countdown and the fail-state check every second.
function startDeadlineTimer() {
  if (deadlineTimerIntervalId !== null) {
    window.clearInterval(deadlineTimerIntervalId);
  }

  if (deadlineStartTime === null) {
    deadlineStartTime = Date.now();
  }

  updateDeadlineDisplay();
  checkDeadlineExpired();

  deadlineTimerIntervalId = window.setInterval(() => {
    updateDeadlineDisplay();
    checkDeadlineExpired();
  }, 1000);
}

// startMissionSystems() restarts the mission-level timers together so their state stays synchronized.
function startMissionSystems() {
  startRespawnInterval();
  startEscalationTimers();
  startDeadlineTimer();
}

// registerWrongAttempt() applies the wrong-command penalty and lowers accuracy because the player missed a step.
function registerWrongAttempt() {
  totalCommandAttempts += 1;
  addScore(-10);
}

// registerCorrectAttempt() counts a successful operator command as both an attempt and a correct response.
function registerCorrectAttempt() {
  totalCommandAttempts += 1;
  correctCommandAttempts += 1;
  updateScoreDisplay();
}

// getThreatTypeLabel() converts stored type keys into consistent UI labels.
function getThreatTypeLabel(type) {
  return threatTypeLabelLookup[type] || String(type).toUpperCase();
}

// getSeverityColor() returns the glow color used for both nodes and panel severity styling.
function getSeverityColor(severity) {
  return severityColorLookup[severity] || "#00ff88";
}

// getNextSeverity() defines the escalation path from low up to critical.
function getNextSeverity(severity) {
  const severityOrder = {
    low: "medium",
    medium: "high",
    high: "critical",
    critical: "critical"
  };

  return severityOrder[severity] || "critical";
}

// getMitigationStepsForThreat() chooses the staged protocol rows used in the live mission panel.
function getMitigationStepsForThreat(threat) {
  return mitigationLookup[threat.type] || [
    {
      label: "CONTAIN AFFECTED SYSTEMS",
      command: "contain --scope incident-systems --reason threatgrid-manual-response"
    },
    {
      label: "COLLECT FORENSIC ARTIFACTS",
      command: "collect-iocs --incident active-threat --export secure-bundle"
    },
    {
      label: "RESTORE TRUSTED OPERATIONS",
      command: "recover --mode controlled --validate system-integrity"
    }
  ];
}

// getPreventionTips() pulls the debrief tips for the given type, falling back to generic guidance if needed.
function getPreventionTips(type) {
  return preventionTipsLookup[type] || [
    "REVIEW DETECTION COVERAGE FOR THIS THREAT CATEGORY",
    "VALIDATE SEGMENTATION AROUND HIGH-VALUE SYSTEMS",
    "DOCUMENT IOC MATCHES FOR FUTURE HUNT OPERATIONS"
  ];
}

// formatClock() converts milliseconds into MM:SS text for mission and escalation timers.
function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// getClockTimestamp() formats the local time in HH:MM:SS so the debrief has a mission-complete timestamp.
function getClockTimestamp() {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

// queuePanelTimeout() remembers delayed callbacks so they can all be cancelled if the panel closes or switches threats.
function queuePanelTimeout(callback, delay) {
  const timeoutId = window.setTimeout(() => {
    panelTimeoutIds = panelTimeoutIds.filter((id) => id !== timeoutId);
    callback();
  }, delay);

  panelTimeoutIds.push(timeoutId);
  return timeoutId;
}

// clearPanelAsyncWork() cancels in-flight panel timers so old animations do not leak into a new threat view.
function clearPanelAsyncWork() {
  if (typewriterIntervalId !== null) {
    window.clearInterval(typewriterIntervalId);
    typewriterIntervalId = null;
  }

  if (missionTimerIntervalId !== null) {
    window.clearInterval(missionTimerIntervalId);
    missionTimerIntervalId = null;
  }

  if (closePanelTimeoutId !== null) {
    window.clearTimeout(closePanelTimeoutId);
    closePanelTimeoutId = null;
  }

  panelTimeoutIds.forEach((timeoutId) => {
    window.clearTimeout(timeoutId);
  });
  panelTimeoutIds = [];
}

// resetThreatPanelState() clears transient panel state so every newly opened threat starts from a clean baseline.
function resetThreatPanelState() {
  clearPanelAsyncWork();
  panelNeutralizing = false;
  activePanelThreat = null;
  currentOperatorSession = null;
  stepHintState = {};
  panelOpenedAt = 0;
  threatPanelClose.disabled = false;
}

// ensureEscalationState() creates runtime escalation tracking the first time an active threat enters the game.
function ensureEscalationState(threat, forceReset = false) {
  if (forceReset || !escalationStateByThreatId[threat.id]) {
    escalationStateByThreatId[threat.id] = {
      stageStartedAt: Date.now(),
      echoSpawned: threat.id.indexOf("-echo") !== -1,
      lastStatus: threat.status
    };
  }

  return escalationStateByThreatId[threat.id];
}

// getEscalationTimeRemaining() returns the remaining time in the current 45-second escalation window.
function getEscalationTimeRemaining(threat) {
  const state = escalationStateByThreatId[threat.id];
  if (!state) {
    return 45000;
  }

  return Math.max(0, 45000 - (Date.now() - state.stageStartedAt));
}

// updatePanelSeverityBadge() refreshes the selected panel's severity color and label when escalation changes.
function updatePanelSeverityBadge(threat) {
  const badge = document.getElementById("panel-severity-badge");
  const dot = document.getElementById("panel-severity-dot");
  const label = document.getElementById("panel-severity-label");

  if (!badge || !dot || !label) {
    return;
  }

  const severityColor = getSeverityColor(threat.severity);
  badge.style.color = severityColor;
  dot.style.background = severityColor;
  dot.style.color = severityColor;
  label.textContent = threat.severity.toUpperCase();
}

// updateMissionTimerDisplay() shows response time inside the panel and changes color as the bonus window closes.
function updateMissionTimerDisplay() {
  const missionTimer = document.getElementById("panel-mission-timer");
  if (!missionTimer || panelOpenedAt === 0) {
    return;
  }

  const elapsed = Date.now() - panelOpenedAt;
  missionTimer.textContent = `MISSION TIME: ${formatClock(elapsed)}`;
  missionTimer.classList.toggle("is-warning", elapsed >= 30000 && elapsed < 60000);
  missionTimer.classList.toggle("is-danger", elapsed >= 60000);
}

// updatePanelEscalationDisplay() shows the active threat's escalation countdown separately from the mission timer.
function updatePanelEscalationDisplay() {
  const escalationWrap = document.getElementById("panel-escalation-wrap");
  const escalationTimer = document.getElementById("panel-escalation-timer");
  const escalationFill = document.getElementById("panel-escalation-bar-fill");

  if (!escalationWrap || !escalationTimer || !escalationFill || !activePanelThreat || activePanelThreat.status !== "active") {
    return;
  }

  const isUrgent = activePanelThreat.severity === "high" || activePanelThreat.severity === "critical";
  escalationWrap.classList.toggle("is-visible", isUrgent);

  if (!isUrgent) {
    return;
  }

  const remaining = getEscalationTimeRemaining(activePanelThreat);
  const progress = remaining / 45000;

  escalationTimer.textContent = `ESCALATES IN: ${formatClock(remaining)}`;
  escalationFill.style.transform = `scaleX(${progress})`;
}

// startMissionTimer() begins the panel-only response timer, which is separate from global threat escalation.
function startMissionTimer() {
  if (missionTimerIntervalId !== null) {
    window.clearInterval(missionTimerIntervalId);
  }

  updateMissionTimerDisplay();
  updatePanelEscalationDisplay();

  missionTimerIntervalId = window.setInterval(() => {
    updateMissionTimerDisplay();
    updatePanelEscalationDisplay();
  }, 1000);
}

// buildThreatPanelMarkup() creates the live mission layout before the typewriter and protocol sequences start.
function buildThreatPanelMarkup(threat) {
  const severityColor = getSeverityColor(threat.severity);
  const threatTypeLabel = getThreatTypeLabel(threat.type);

  return `
    <div class="threat-panel-stack">
      <section class="threat-panel-header">
        <div id="panel-mission-timer" class="panel-mission-timer">MISSION TIME: 00:00</div>
        <div id="panel-escalation-wrap" class="panel-escalation-wrap">
          <div id="panel-escalation-timer" class="panel-escalation-timer">ESCALATES IN: 00:45</div>
          <div class="panel-escalation-bar">
            <div id="panel-escalation-bar-fill" class="panel-escalation-bar-fill"></div>
          </div>
        </div>
        <div id="panel-severity-badge" class="threat-severity-badge" style="color: ${severityColor};">
          <span id="panel-severity-dot" class="threat-severity-dot" style="background: ${severityColor}; color: ${severityColor};"></span>
          <span id="panel-severity-label">${threat.severity.toUpperCase()}</span>
        </div>
        <div class="threat-type-label">${threatTypeLabel}</div>
        <h2 class="threat-panel-title">${threat.title}</h2>
        <div class="threat-location">📍 ${threat.location.city}, ${threat.location.country}</div>
        <div class="threat-meta-grid">
          <div class="threat-meta-row">
            <span class="threat-meta-label">TARGET</span>
            <span class="threat-meta-value">${threat.target}</span>
          </div>
          <div class="threat-meta-row">
            <span class="threat-meta-label">VECTOR</span>
            <span class="threat-meta-value">${threat.vector}</span>
          </div>
        </div>
        <div class="threat-panel-rule" aria-hidden="true"></div>
      </section>

      <section>
        <div class="panel-section-label is-booting">[ AI ANALYST DEPLOYED ]</div>
        <div class="panel-typewriter">
          <span id="panel-analyst-text"></span><span id="panel-analyst-cursor" class="typewriter-cursor">_</span>
        </div>
      </section>

      <section id="panel-protocol-section" hidden>
        <div class="panel-section-label">NEUTRALIZATION PROTOCOL</div>
        <div id="panel-steps" class="panel-steps"></div>
      </section>

      <section id="operator-terminal-wrap" class="operator-terminal-wrap">
        <div id="operator-terminal-shell" class="operator-terminal-shell">
          <div id="operator-terminal-label" class="operator-terminal-label">STEP 1 OF 3 - EXECUTE COMMAND</div>
          <div class="operator-terminal-hint-zone">
            <div id="operator-terminal-hint" class="operator-terminal-hint"></div>
            <div id="operator-suggested-command" class="operator-suggested-command"></div>
          </div>
          <div class="operator-terminal-input-row">
            <span class="operator-terminal-prefix">&gt;</span>
            <input id="operator-terminal-input" class="operator-terminal-input" type="text" spellcheck="false" autocomplete="off" aria-label="Operator command input">
          </div>
          <div id="operator-terminal-feedback" class="operator-terminal-feedback"></div>
        </div>
        <button id="operator-hint-button" class="operator-hint-button" type="button">[ HINT ]</button>
      </section>

      <div id="panel-action-wrap" class="panel-action-wrap">
        <button id="neutralize-threat-button" class="panel-action-button" type="button">[ NEUTRALIZE THREAT ]</button>
      </div>
    </div>
  `;
}

// buildDebriefMarkup() replaces the live mission view with a mission-complete summary for the resolved threat.
function buildDebriefMarkup(threat) {
  const threatTypeLabel = getThreatTypeLabel(threat.type);
  const preventionTips = getPreventionTips(threat.type);

  return `
    <div class="debrief-stack">
      <section>
        <div class="panel-section-label">[ MISSION COMPLETE ]</div>
        <div class="threat-panel-rule" aria-hidden="true"></div>
      </section>

      <section>
        <div class="debrief-threat-name">${threat.title}</div>
        <div class="threat-type-label">${threatTypeLabel}</div>
        <div class="panel-debrief-time">THREAT NEUTRALIZED ${getClockTimestamp()}</div>
      </section>

      <section>
        <div class="panel-section-label">SUMMARY</div>
        <p class="panel-debrief-copy">${threat.description}</p>
      </section>

      <section>
        <div class="panel-section-label">INDICATORS OF COMPROMISE</div>
        <ul class="panel-bullet-list">
          ${threat.iocs.map((ioc) => `<li>${ioc}</li>`).join("")}
        </ul>
      </section>

      <section>
        <div class="panel-section-label">PREVENTION RECOMMENDATIONS</div>
        <ul class="panel-bullet-list">
          ${preventionTips.map((tip) => `<li>${tip}</li>`).join("")}
        </ul>
      </section>

      <button id="close-debrief-button" class="debrief-close-button" type="button">[ CLOSE DEBRIEF ]</button>
    </div>
  `;
}

// closeThreatPanel() slides the panel away and clears its content after the CSS transition finishes.
function closeThreatPanel(forceClose = false) {
  if (panelNeutralizing && !forceClose) {
    return;
  }

  resetThreatPanelState();
  threatPanel.classList.remove("is-open");
  threatPanel.setAttribute("aria-hidden", "true");

  closePanelTimeoutId = window.setTimeout(() => {
    threatPanelContent.innerHTML = "";
    closePanelTimeoutId = null;
  }, 320);
}

// runTypewriter() writes text character by character so the analyst briefing feels like a live system output.
function runTypewriter(text, element, onComplete) {
  if (typewriterIntervalId !== null) {
    window.clearInterval(typewriterIntervalId);
    typewriterIntervalId = null;
  }

  const cursor = document.getElementById("panel-analyst-cursor");
  let index = 0;
  element.textContent = "";

  if (cursor) {
    cursor.classList.remove("is-hidden");
  }

  typewriterIntervalId = window.setInterval(() => {
    index += 1;
    element.textContent = text.slice(0, index);

    if (index >= text.length) {
      window.clearInterval(typewriterIntervalId);
      typewriterIntervalId = null;
      if (cursor) {
        cursor.classList.add("is-hidden");
      }
      if (typeof onComplete === "function") {
        onComplete();
      }
    }
  }, 1000 / 28);
}

// createStepMarkup() returns one mitigation step row with its label and terminal-style command block.
function createStepMarkup(step, index) {
  return `
    <article id="panel-step-${index}" class="panel-step is-pending">
      <div class="panel-step-heading">
        <span class="panel-step-index">STEP ${index + 1}</span>
        <span class="panel-step-label">${step.label}</span>
      </div>
      <pre class="panel-code-block">${step.command}</pre>
    </article>
  `;
}

// showMitigationSteps() reveals protocol steps on a stagger so the response plan unfolds in sequence.
function showMitigationSteps(steps, onComplete) {
  const protocolSection = document.getElementById("panel-protocol-section");
  const stepsContainer = document.getElementById("panel-steps");

  protocolSection.hidden = false;
  stepsContainer.innerHTML = "";

  steps.forEach((step, index) => {
    queuePanelTimeout(() => {
      stepsContainer.insertAdjacentHTML("beforeend", createStepMarkup(step, index));

      if (index === steps.length - 1 && typeof onComplete === "function") {
        onComplete();
      }
    }, index * 400);
  });
}

// setStepVisualState() marks protocol rows as pending, success, or assisted so players can scan their progress.
function setStepVisualState(stepIndex, stateName) {
  const stepRow = document.getElementById(`panel-step-${stepIndex}`);
  if (!stepRow) {
    return;
  }

  stepRow.classList.remove("is-pending", "is-success", "is-warning");
  stepRow.classList.add(stateName);
}

// showTerminalFeedback() updates the operator feedback line with the right alert color for the current state.
function showTerminalFeedback(message, variant = "") {
  const feedback = document.getElementById("operator-terminal-feedback");
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.classList.remove("is-error", "is-warning");

  if (variant) {
    feedback.classList.add(variant);
  }
}

// clearTerminalFeedback() removes prior hint and error text when the operator moves to a fresh step.
function clearTerminalFeedback() {
  const hint = document.getElementById("operator-terminal-hint");
  const suggested = document.getElementById("operator-suggested-command");
  const feedback = document.getElementById("operator-terminal-feedback");

  if (hint) {
    hint.textContent = "";
  }
  if (suggested) {
    suggested.textContent = "";
  }
  if (feedback) {
    feedback.textContent = "";
    feedback.classList.remove("is-error", "is-warning");
  }
}

// focusOperatorInput() keeps keyboard play smooth by returning focus to the command line after each state change.
function focusOperatorInput() {
  const input = document.getElementById("operator-terminal-input");
  if (input) {
    input.focus();
  }
}

// showStepHintTier() renders hint text based on how many mistakes the player has made on the current step.
function showStepHintTier(stepIndex, expectedCommand) {
  const hint = document.getElementById("operator-terminal-hint");
  const suggested = document.getElementById("operator-suggested-command");
  const hintCount = stepHintState[stepIndex] || 0;
  const firstWord = expectedCommand.trim().split(/\s+/)[0] || "";

  if (!hint || !suggested) {
    return;
  }

  hint.textContent = "";
  suggested.textContent = "";

  if (hintCount >= 1) {
    hint.textContent = `HINT: COMMAND BEGINS WITH ${firstWord}`;
  }

  if (hintCount >= 2) {
    suggested.textContent = `SUGGESTED: ${expectedCommand}`;
  }
}

// shakeOperatorTerminal() gives quick physical feedback when a typed command does not match the expected action.
function shakeOperatorTerminal() {
  const terminalShell = document.getElementById("operator-terminal-shell");
  if (!terminalShell) {
    return;
  }

  terminalShell.classList.remove("is-shaking");
  void terminalShell.offsetWidth;
  terminalShell.classList.add("is-shaking");
  queuePanelTimeout(() => {
    terminalShell.classList.remove("is-shaking");
  }, 200);
}

// The command check only compares the first word, so beginners can learn the action verb without memorizing every flag.
function checkCommand(inputText, expectedCommand) {
  const inputFirstWord = (inputText.trim().split(/\s+/)[0] || "").toLowerCase();
  const expectedFirstWord = (expectedCommand.trim().split(/\s+/)[0] || "").toLowerCase();

  return inputFirstWord !== "" && inputFirstWord === expectedFirstWord;
}

// showNeutralizeButton() switches back to the passive action once analyst mode finishes or operator mode clears all steps.
function showNeutralizeButton(threat) {
  const actionWrap = document.getElementById("panel-action-wrap");
  const terminalWrap = document.getElementById("operator-terminal-wrap");
  const neutralizeButton = document.getElementById("neutralize-threat-button");

  if (!actionWrap || !neutralizeButton || !terminalWrap) {
    return;
  }

  terminalWrap.classList.remove("is-visible");
  actionWrap.classList.add("is-visible");

  // The action button appears last so the player sees the mitigation plan before committing.
  neutralizeButton.textContent = "[ NEUTRALIZE THREAT ]";
  neutralizeButton.disabled = false;
  neutralizeButton.onclick = () => {
    neutralizeThreat(threat);
  };
}

// updateOperatorPrompt() redraws the terminal label and hint state for whichever step the player is on now.
function updateOperatorPrompt() {
  if (!currentOperatorSession) {
    return;
  }

  const label = document.getElementById("operator-terminal-label");
  const input = document.getElementById("operator-terminal-input");
  const step = currentOperatorSession.steps[currentOperatorSession.currentStepIndex];

  if (!label || !input || !step) {
    return;
  }

  label.textContent = `STEP ${currentOperatorSession.currentStepIndex + 1} OF ${currentOperatorSession.steps.length} - EXECUTE COMMAND`;
  input.value = "";
  clearTerminalFeedback();
  showStepHintTier(currentOperatorSession.currentStepIndex, step.command);
  focusOperatorInput();
}

// completeOperatorStep() advances the terminal flow, applies the flawless-step bonus, and unlocks neutralization at the end.
function completeOperatorStep(assisted = false) {
  if (!currentOperatorSession) {
    return;
  }

  const completedIndex = currentOperatorSession.currentStepIndex;
  const mistakeCount = stepHintState[completedIndex] || 0;

  if (!assisted) {
    setStepVisualState(completedIndex, "is-success");
    if (mistakeCount === 0) {
      // A perfect step earns a bonus because the operator executed cleanly without any hint or error.
      addScore(25);
    }
  } else {
    setStepVisualState(completedIndex, "is-warning");
  }

  currentOperatorSession.currentStepIndex += 1;

  if (currentOperatorSession.currentStepIndex >= currentOperatorSession.steps.length) {
    showNeutralizeButton(currentOperatorSession.threat);
    return;
  }

  updateOperatorPrompt();
}

// triggerAssistedExecution() resolves a failed operator step automatically after the third mistake with an extra penalty.
function triggerAssistedExecution() {
  if (!currentOperatorSession) {
    return;
  }

  const input = document.getElementById("operator-terminal-input");
  const hintButton = document.getElementById("operator-hint-button");

  if (input) {
    input.disabled = true;
  }
  if (hintButton) {
    hintButton.disabled = true;
  }

  showTerminalFeedback("ASSISTED EXECUTION - PENALTY APPLIED", "is-warning");
  addScore(-40);

  queuePanelTimeout(() => {
    if (input) {
      input.disabled = false;
    }
    if (hintButton) {
      hintButton.disabled = false;
    }

    if (currentOperatorSession) {
      completeOperatorStep(true);
    }
  }, 1200);
}

// registerStepMistake() centralizes wrong-command and hint penalties so every failure path behaves the same.
function registerStepMistake(shouldShake = true) {
  if (!currentOperatorSession) {
    return;
  }

  const stepIndex = currentOperatorSession.currentStepIndex;
  stepHintState[stepIndex] = (stepHintState[stepIndex] || 0) + 1;
  registerWrongAttempt();

  if (shouldShake) {
    shakeOperatorTerminal();
    showTerminalFeedback("ERROR: UNRECOGNIZED PROTOCOL", "is-error");
  } else {
    showTerminalFeedback("", "");
  }

  const step = currentOperatorSession.steps[stepIndex];
  showStepHintTier(stepIndex, step.command);

  if ((stepHintState[stepIndex] || 0) >= 3) {
    triggerAssistedExecution();
  }
}

// processOperatorCommand() checks the typed value and either advances the step or records a mistake.
function processOperatorCommand() {
  if (!currentOperatorSession) {
    return;
  }

  const input = document.getElementById("operator-terminal-input");
  const step = currentOperatorSession.steps[currentOperatorSession.currentStepIndex];
  const typedValue = input ? input.value : "";

  if (checkCommand(typedValue, step.command)) {
    registerCorrectAttempt();
    completeOperatorStep(false);
    return;
  }

  registerStepMistake(true);
}

// startOperatorMode() shows the terminal block and wires the keyboard and hint controls for the current threat.
function startOperatorMode(threat, steps) {
  currentOperatorSession = {
    threat,
    steps,
    currentStepIndex: 0
  };

  const terminalWrap = document.getElementById("operator-terminal-wrap");
  const actionWrap = document.getElementById("panel-action-wrap");
  const input = document.getElementById("operator-terminal-input");
  const hintButton = document.getElementById("operator-hint-button");

  if (!terminalWrap || !actionWrap || !input || !hintButton) {
    return;
  }

  actionWrap.classList.remove("is-visible");
  terminalWrap.classList.add("is-visible");

  input.disabled = false;
  hintButton.disabled = false;

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      processOperatorCommand();
    }
  });

  hintButton.addEventListener("click", () => {
    registerStepMistake(false);
  });

  updateOperatorPrompt();
}

// showDebriefScreen() swaps the live mission content for a mission-complete report in the same panel.
function showDebriefScreen(threat) {
  if (missionTimerIntervalId !== null) {
    window.clearInterval(missionTimerIntervalId);
    missionTimerIntervalId = null;
  }

  panelNeutralizing = false;
  currentOperatorSession = null;
  threatPanelClose.disabled = false;
  threatPanelContent.scrollTop = 0;
  threatPanelContent.innerHTML = buildDebriefMarkup(threat);

  const closeDebriefButton = document.getElementById("close-debrief-button");
  if (!closeDebriefButton) {
    return;
  }

  if (pendingGameOverOutcome === "win") {
    closeDebriefButton.textContent = "[ CONTINUE ]";
  }
  closeDebriefButton.addEventListener("click", () => {
    if (pendingGameOverOutcome) {
      const nextOutcome = pendingGameOverOutcome;
      pendingGameOverOutcome = null;
      closeThreatPanel(true);
      showGameOverScreen(nextOutcome);
      return;
    }

    closeThreatPanel();
  });
}

// createGameOverMarkup() builds the win, lose, path, and waiting overlays as terminal-style screen copy.
function createGameOverMarkup(outcome) {
  if (outcome === "win") {
    return `
      <div class="terminal-shell">
        <div class="terminal-headline">MISSION COMPLETE</div>
        <div class="terminal-rule" aria-hidden="true"></div>
        <p class="terminal-copy">ALL THREATS NEUTRALIZED.</p>
        <p class="terminal-copy">NEXUS SECURITY IS SECURE.</p>
        <p class="terminal-copy">GOOD WORK, INTERN.</p>
        <button id="game-over-advance-button" class="menu-button" type="button">[ CONTINUE ]</button>
      </div>
    `;
  }

  if (outcome === "lose") {
    return `
      <div class="terminal-shell">
        <div class="terminal-headline">MISSION FAILED</div>
        <div class="terminal-rule" aria-hidden="true"></div>
        <p class="terminal-copy">DEADLINE EXCEEDED.</p>
        <p class="terminal-copy">THE HACKERS HAVE TAKEN CONTROL.</p>
        <p class="terminal-copy">NEXUS SECURITY IS COMPROMISED.</p>
        <p class="terminal-copy">YOU'RE FIRED.</p>
        <button id="game-over-advance-button" class="menu-button" type="button">[ ACCEPT FATE ]</button>
      </div>
    `;
  }

  if (outcome === "path-choice") {
    return `
      <div class="terminal-shell">
        <div class="terminal-headline">WHAT'S YOUR NEXT MOVE?</div>
        <div class="terminal-rule" aria-hidden="true"></div>
        <p class="terminal-copy">[ JOIN THE HACKERS ]</p>
        <p class="terminal-copy">EMBRACE THE CHAOS. STRIKE FROM THE SHADOWS.</p>
        <p class="terminal-copy">[ JOIN THE RESISTANCE ]</p>
        <p class="terminal-copy">FIGHT TO RECLAIM WHAT WAS LOST.</p>
        <div class="path-choice-actions">
          <button id="path-hackers-button" class="menu-button" type="button">[ JOIN THE HACKERS ]</button>
          <button id="path-resistance-button" class="menu-button" type="button">[ JOIN THE RESISTANCE ]</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="terminal-shell">
      <div class="terminal-headline">PATH CHOSEN</div>
      <div class="terminal-rule" aria-hidden="true"></div>
      <p class="terminal-copy">PATH CHOSEN. CONTINUE TO LAYER 5...</p>
      <p class="terminal-copy">SELECTED PATH: ${String(playerPath || "UNSET").toUpperCase()}</p>
      <button id="game-over-advance-button" class="menu-button" type="button">[ RETURN TO MENU ]</button>
    </div>
  `;
}

// showGameOverScreen() swaps the boot overlay content to the requested end-state branch and wires its actions.
function showGameOverScreen(outcome) {
  stopMissionSystems();
  missionEnded = true;

  const nextScreen = outcome === "path-choice" || outcome === "waiting-for-layer-5"
    ? outcome
    : "game-over";

  setScreen(nextScreen);
  updateDeadlineDisplay();
  bootOverlay.style.display = "block";
  bootOverlay.classList.remove("is-hiding");

  if (!gameStateContent) {
    return;
  }

  gameStateContent.innerHTML = createGameOverMarkup(outcome);

  if (outcome === "win" || outcome === "lose") {
    const advanceButton = document.getElementById("game-over-advance-button");
    if (advanceButton) {
      advanceButton.addEventListener("click", () => {
        showGameOverScreen("path-choice");
      });
    }
    return;
  }

  if (outcome === "path-choice") {
    const hackersButton = document.getElementById("path-hackers-button");
    const resistanceButton = document.getElementById("path-resistance-button");

    if (hackersButton) {
      hackersButton.addEventListener("click", () => {
        playerPath = "hackers";
        console.log("PATH CHOSEN: HACKERS");
        console.log("Path chosen. Continue to Layer 5...");
        showGameOverScreen("waiting-for-layer-5");
      });
    }

    if (resistanceButton) {
      resistanceButton.addEventListener("click", () => {
        playerPath = "resistance";
        console.log("PATH CHOSEN: RESISTANCE");
        console.log("Path chosen. Continue to Layer 5...");
        showGameOverScreen("waiting-for-layer-5");
      });
    }
    return;
  }

  const advanceButton = document.getElementById("game-over-advance-button");
  if (advanceButton) {
    advanceButton.addEventListener("click", () => {
      showMenu();
    });
  }
}

// animateThreatRemoval() speeds up the marker pulse, shrinks it, and darkens its materials before removal.
function animateThreatRemoval(threat, onComplete) {
  const node = globe.nodeMap.get(threat.id);

  if (!node) {
    if (typeof onComplete === "function") {
      onComplete();
    }
    return;
  }

  const originalPulseSpeed = node.group.userData.pulseSpeed;
  const originalPulseAmp = node.group.userData.pulseAmp;
  const originalGroupScale = node.group.scale.x;
  const pointStart = node.pointMesh.material.color.clone();
  const ringStart = node.ringMesh.material.color.clone();
  const glowStart = node.glowMesh.material.color.clone();
  const fadeTarget = new THREE.Color("#04150d");

  node.group.userData.hovered = false;
  node.group.userData.pulseSpeed = Math.max(originalPulseSpeed, 12);
  node.group.userData.pulseAmp = Math.max(originalPulseAmp, 0.52);

  queuePanelTimeout(() => {
    const fadeDuration = 400;
    const fadeStart = performance.now();

    function step(now) {
      const progress = Math.min((now - fadeStart) / fadeDuration, 1);
      const eased = progress * progress * (3 - (2 * progress));

      node.group.scale.setScalar(originalGroupScale * (1 - (eased * 0.9)));
      node.pointMesh.material.color.lerpColors(pointStart, fadeTarget, eased);
      node.ringMesh.material.color.lerpColors(ringStart, fadeTarget, eased);
      node.glowMesh.material.color.lerpColors(glowStart, fadeTarget, eased);

      if (progress < 1) {
        window.requestAnimationFrame(step);
        return;
      }

      node.group.userData.pulseSpeed = originalPulseSpeed;
      node.group.userData.pulseAmp = originalPulseAmp;
      node.group.scale.setScalar(originalGroupScale);

      if (typeof onComplete === "function") {
        onComplete();
      }
    }

    window.requestAnimationFrame(step);
  }, 800);
}

// neutralizeThreat() runs the staged resolution flow, then replaces the panel with the final debrief.
function neutralizeThreat(threat) {
  if (panelNeutralizing || activePanelThreat !== threat) {
    return;
  }

  panelNeutralizing = true;
  threatPanelClose.disabled = true;

  const neutralizeButton = document.getElementById("neutralize-threat-button");
  if (neutralizeButton) {
    neutralizeButton.textContent = "[ NEUTRALIZING... ]";
    neutralizeButton.disabled = true;
  }

  animateThreatRemoval(threat, () => {
    threat.status = "neutralized";
    threatsNeutralized += 1;

    // Every successful neutralization grants a base score because the threat was actually resolved.
    addScore(100);

    // The speed bonus rewards finishing within 30 seconds of panel open, before the yellow timer threshold.
    if (panelOpenedAt !== 0 && (Date.now() - panelOpenedAt) <= 30000) {
      addScore(50);
    }

    globe.removeThreatNode(threat.id);
    globe.updateActiveCount();

    if (threatsNeutralized >= 8) {
      pendingGameOverOutcome = "win";
      missionEnded = true;
      stopMissionSystems();
    }

    if (activePanelThreat !== threat || screenState !== "game") {
      panelNeutralizing = false;
      threatPanelClose.disabled = false;
      return;
    }

    showDebriefScreen(threat);
  });
}

// buildEchoThreat() clones a critical threat into a nearby echo node when it is ignored past the second escalation window.
function buildEchoThreat(sourceThreat) {
  const latOffset = (Math.random() * 10) - 5;
  const lngOffset = (Math.random() * 10) - 5;
  const nextLat = Math.max(-85, Math.min(85, sourceThreat.location.lat + latOffset));
  let nextLng = sourceThreat.location.lng + lngOffset;

  if (nextLng > 180) {
    nextLng -= 360;
  }
  if (nextLng < -180) {
    nextLng += 360;
  }

  return {
    ...sourceThreat,
    id: `${sourceThreat.id}-echo-${Date.now().toString(36).slice(-4)}`,
    severity: "critical",
    title: `${sourceThreat.title} Echo`,
    location: {
      ...sourceThreat.location,
      lat: nextLat,
      lng: nextLng
    },
    status: "active"
  };
}

// refreshThreatNodeVisual() re-renders a node after a severity change without changing any globe.js internals.
function refreshThreatNodeVisual(threat) {
  if (threat.status !== "active") {
    return;
  }

  globe.removeThreatNode(threat.id);
  globe.addThreatNode(threat);
}

// escalateThreat() upgrades a threat one level, refreshes its node color, and updates any open panel header.
function escalateThreat(threat) {
  threat.severity = getNextSeverity(threat.severity);
  refreshThreatNodeVisual(threat);

  if (activePanelThreat === threat) {
    updatePanelSeverityBadge(threat);
    updatePanelEscalationDisplay();
  }
}

// spawnEchoThreat() creates a nearby critical clone and adds it to both the data model and the rendered globe.
function spawnEchoThreat(sourceThreat) {
  const echoThreat = buildEchoThreat(sourceThreat);
  threats.push(echoThreat);
  ensureEscalationState(echoThreat, true);
  globe.addThreatNode(echoThreat);
  globe.updateActiveCount();
}

// tickThreatEscalation() advances threat timers and applies upgrades or echo spawns once a window expires.
function tickThreatEscalation() {
  if (screenState !== "game" || missionEnded) {
    return;
  }

  const now = Date.now();

  threats.forEach((threat) => {
    const existingState = escalationStateByThreatId[threat.id];

    if (threat.status !== "active") {
      if (existingState) {
        existingState.lastStatus = threat.status;
      }
      return;
    }

    const state = ensureEscalationState(threat, !existingState || existingState.lastStatus !== "active");
    state.lastStatus = "active";

    if ((now - state.stageStartedAt) < 45000) {
      return;
    }

    if (threat.severity !== "critical") {
      state.stageStartedAt = now;
      escalateThreat(threat);
      return;
    }

    if (!state.echoSpawned && threat.id.indexOf("-echo") === -1) {
      state.echoSpawned = true;
      state.stageStartedAt = now;
      spawnEchoThreat(threat);
      return;
    }

    state.stageStartedAt = now;
  });

  if (activePanelThreat) {
    updatePanelSeverityBadge(activePanelThreat);
    updatePanelEscalationDisplay();
  }
}

// startEscalationTimers() owns threat countdown rules here in main.js because escalation is gameplay, not rendering.
function startEscalationTimers() {
  if (escalationTickerId !== null) {
    window.clearInterval(escalationTickerId);
  }

  escalationTimersStarted = true;
  threats.forEach((threat) => {
    if (threat.status === "active") {
      ensureEscalationState(threat, true);
    }
  });

  escalationTickerId = window.setInterval(() => {
    tickThreatEscalation();
  }, 1000);
}

// openThreatPanel() fills the panel for the clicked threat, opens it, and starts the staged panel timeline.
function openThreatPanel(threat) {
  if (panelNeutralizing || missionEnded || playerDeadlineExpired || threat.status !== "active") {
    return;
  }

  clearPanelAsyncWork();

  // stepHintState is reset here because every threat is its own mission with its own command attempt history.
  stepHintState = {};
  activePanelThreat = threat;
  currentOperatorSession = null;
  panelNeutralizing = false;
  panelOpenedAt = Date.now();

  threatPanelClose.disabled = false;
  threatPanelContent.scrollTop = 0;
  threatPanelContent.innerHTML = buildThreatPanelMarkup(threat);
  threatPanel.classList.add("is-open");
  threatPanel.setAttribute("aria-hidden", "false");

  startMissionTimer();
  updatePanelSeverityBadge(threat);
  updatePanelEscalationDisplay();

  const analystText = document.getElementById("panel-analyst-text");
  const steps = getMitigationStepsForThreat(threat);

  runTypewriter(threat.description, analystText, () => {
    if (activePanelThreat !== threat) {
      return;
    }

    showMitigationSteps(steps, () => {
      if (activePanelThreat !== threat) {
        return;
      }

      if (gameMode === "operator") {
        startOperatorMode(threat, steps);
        return;
      }

      showNeutralizeButton(threat);
    });
  });
}

// The threat map below converts the narrative threat categories into combat stance for turn resolution.
const threatCombatTypeLookup = {
  ransomware: "offense",
  phishing: "deception",
  ddos: "offense",
  botnet: "purge",
  "zero-day": "purge",
  trojan: "offense"
};

// getRandomInt() keeps the level scaling and damage ranges compact and readable.
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// getActorCombatType() normalizes attacker types so the type-advantage rules can stay simple.
function getActorCombatType(actor, asDefender = false) {
  if (!actor) {
    return "";
  }

  if (asDefender && actor.weakType) {
    return actor.weakType;
  }

  if (actor.combatType) {
    return actor.combatType;
  }

  if (actor.type && ["defense", "offense", "deception", "purge"].includes(actor.type)) {
    return actor.type;
  }

  return threatCombatTypeLookup[actor.type] || actor.type || "";
}

// resetProgramRoster() restores the party to its default run-start values without re-creating the array.
function resetProgramRoster() {
  defaultPrograms.forEach((template, index) => {
    Object.assign(programs[index], JSON.parse(JSON.stringify(template)));
  });
}

// healProgramRoster() fully restores the party between battles when the expedition flag is used.
function healProgramRoster() {
  programs.forEach((program) => {
    program.hp = program.maxHp;
    program.statusEffects = [];
  });
}

// resetRunState() returns the game to a clean starting point for a fresh run.
function resetRunState() {
  stopMissionSystems();
  closeCombatOverlay(true);
  restoreThreatRoster();
  resetProgramRoster();

  playerScore = 0;
  playerAccuracy = 100;
  threatsNeutralized = 0;
  totalCommandAttempts = 0;
  correctCommandAttempts = 0;
  stepHintState = {};
  panelNeutralizing = false;
  panelOpenedAt = 0;
  currentOperatorSession = null;
  playerDeadlineExpired = false;
  missionEnded = false;
  pendingGameOverOutcome = null;
  combatState = null;
  combatEngine = null;

  updateScoreDisplay();
  globe.syncThreatNodes();
  globe.updateActiveCount();
}

// getThreatLevel() scales the encounter around the current party average so the run ramps naturally.
function getThreatLevel() {
  const avgPartyLevel = Math.floor(programs.reduce((sum, program) => sum + program.level, 0) / 4);
  return Math.min(10, Math.max(1, avgPartyLevel + getRandomInt(0, 2)));
}

// buildScaledThreat() clones the source threat and adjusts its combat stats to the requested level.
function buildScaledThreat(sourceThreat, targetLevel) {
  const encounter = cloneThreatBlueprint(sourceThreat);
  const baseLevel = encounter.level || 1;
  const levelDelta = targetLevel - baseLevel;
  const hpScale = Math.max(0.6, 1 + (levelDelta * 0.16));
  const statScale = Math.max(0.7, 1 + (levelDelta * 0.08));

  encounter.level = targetLevel;
  encounter.maxHp = Math.max(40, Math.round((encounter.maxHp || 100) * hpScale));
  encounter.hp = encounter.maxHp;
  encounter.atk = Math.max(1, Math.round((encounter.atk || 1) * statScale));
  encounter.def = Math.max(1, Math.round((encounter.def || 1) * statScale));
  encounter.spd = Math.max(1, Math.round((encounter.spd || 1) * Math.max(0.7, 1 + (levelDelta * 0.04))));
  encounter.statusEffects = [];

  return encounter;
}

// buildTurnOrder() sorts the party and the threat by SPD so the fastest actor starts the cycle.
function buildTurnOrder(playerParty, threat) {
  return [
    ...playerParty.map((program) => ({
      kind: "program",
      ref: program
    })),
    {
      kind: "threat",
      ref: threat
    }
  ].sort((left, right) => {
    const speedDelta = (right.ref.spd || 0) - (left.ref.spd || 0);
    if (speedDelta !== 0) {
      return speedDelta;
    }

    if (left.kind === right.kind) {
      return 0;
    }

    return left.kind === "program" ? -1 : 1;
  });
}

// getTypeAdvantage() applies the four-way combat triangle used across the battle layer.
function getTypeAdvantage(attackerType, defenderType) {
  const beats = {
    defense: "offense",
    offense: "deception",
    deception: "purge",
    purge: "defense"
  };

  if (beats[attackerType] === defenderType) {
    return {
      state: "super-effective",
      multiplier: 1.5
    };
  }

  if (beats[defenderType] === attackerType) {
    return {
      state: "weak",
      multiplier: 0.5
    };
  }

  return {
    state: "neutral",
    multiplier: 1
  };
}

// calculateDamage() computes final damage based on stats, level difference, and ability scaling.
// Level difference: attacker.level - defender.level.
// Every level difference = +/-10% damage.
// Example: lvl 5 vs lvl 3 = 1.2x damage (20% bonus)
function calculateDamage(attacker, defender, ability) {
  const baseDamage = ((attacker.atk || 1) * (ability.baseDamage || 0)) / ((defender.def || 0) + 10);
  const levelDiff = (attacker.level || 1) - (defender.level || 1);
  const levelMultiplier = 1 + (levelDiff * 0.1);
  const attackerType = getActorCombatType(attacker);
  const defenderType = getActorCombatType(defender, true);
  const typeInfo = getTypeAdvantage(attackerType, defenderType);

  let finalMultiplier = levelMultiplier * typeInfo.multiplier;

  if (Array.isArray(attacker.statusEffects) && attacker.statusEffects.includes("encrypted")) {
    finalMultiplier *= 0.8;
  }

  if (Array.isArray(attacker.statusEffects) && attacker.statusEffects.includes("isolated")) {
    finalMultiplier *= 0.5;
  }

  if (Array.isArray(defender.statusEffects) && defender.statusEffects.includes("detected")) {
    finalMultiplier *= 1.15;
  }

  const finalDamage = Math.max(1, Math.round(baseDamage * finalMultiplier));

  return {
    damage: finalDamage,
    levelMultiplier,
    typeMultiplier: typeInfo.multiplier,
    typeState: typeInfo.state,
    isSuperEffective: typeInfo.state === "super-effective"
  };
}

// buildCombatState() seeds the live battle state using the clicked threat and the current party.
function buildCombatState(sourceThreat) {
  const encounterLevel = getThreatLevel();
  const threat = buildScaledThreat(sourceThreat, encounterLevel);
  const playerParty = programs;
  const turnOrder = buildTurnOrder(playerParty, threat);
  const firstProgram = turnOrder.find((entry) => entry.kind === "program" && entry.ref.hp > 0);

  return {
    sourceThreat,
    threat,
    playerParty,
    turnOrder,
    currentTurnIndex: 0,
    activeProgramId: firstProgram ? firstProgram.ref.id : playerParty[0].id,
    responseGauge: 0,
    battleLog: [],
    outcome: "ongoing",
    phase: "battle",
    nextDamageReduction: 0,
    nextCounterDamage: 0,
    encounterLevel
  };
}

// addBattleLog() stores each action so the panel can render the last six turns cleanly.
function addBattleLog(message, variant = "") {
  if (!combatState) {
    return;
  }

  combatState.battleLog.push({
    message,
    variant
  });
}

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
  const previewCount = Math.min(4, state.turnOrder.length);
  const preview = [];

  for (let index = 0; index < previewCount; index += 1) {
    const turnIndex = (state.currentTurnIndex + index) % state.turnOrder.length;
    const entry = state.turnOrder[turnIndex];
    const actor = entry.ref;
    const label = entry.kind === "program"
      ? `${actor.name} LVL ${actor.level}`
      : `${actor.title} LVL ${actor.level}`;
    preview.push(`<span class="combat-turn-chip ${index === 0 ? "is-current" : ""} ${entry.kind === "threat" ? "is-threat" : ""}">${label}</span>`);
  }

  return preview.join('<span class="combat-turn-separator" aria-hidden="true">→</span>');
}

// buildBattleLogMarkup() keeps the last few combat events visible without stealing the whole screen.
function buildBattleLogMarkup(state) {
  const entries = state.battleLog.slice(-5);

  if (!entries.length) {
    return '<div class="combat-log-entry">SYSTEM READY. AWAITING FIRST TURN.</div>';
  }

  return entries.map((entry) => {
    const variantClass = entry.variant ? `is-${entry.variant}` : "";
    return `<div class="combat-log-entry ${variantClass}">${entry.message}</div>`;
  }).join("");
}

// buildProgramBattlefieldMarkup() renders the active program as the primary fighter on the left side.
function buildProgramBattlefieldMarkup(program, isCurrentTurn) {
  const statusMarkup = renderStatusPills(program.statusEffects);

  return `
    <article class="battle-figure ${isCurrentTurn ? "is-active" : ""}" style="color: ${program.color};">
      <div class="battle-figure-body">
        <div class="battle-sprite ${getProgramSpriteClass(program)}" aria-hidden="true"></div>
        <div class="battle-figure-meta">
          <div class="combat-name-row">
            <span class="combat-name">${program.name}</span>
            <span class="combat-lvl">LVL ${program.level}</span>
          </div>
          <div class="combat-subline">TYPE ${String(program.type).toUpperCase()}</div>
          <div class="combat-subline">HP ${program.hp}/${program.maxHp}</div>
          ${renderBar(program.hp, program.maxHp, "is-hp")}
          <div class="combat-subline">XP ${program.xp}/${program.level * 100}</div>
          ${renderBar(program.xp, program.level * 100, "is-xp")}
          ${statusMarkup}
        </div>
      </div>
    </article>
  `;
}

// buildProgramBenchMarkup() shows the rest of the party as smaller cards so the active fighter stays readable.
function buildProgramBenchMarkup(program, isCurrentTurn) {
  const statusMarkup = renderStatusPills(program.statusEffects);

  return `
    <article class="battle-bench-card ${program.hp <= 0 ? "is-down" : ""} ${isCurrentTurn ? "is-current" : ""}" style="color: ${program.color};">
      <div class="battle-bench-name">${program.name}</div>
      <div class="battle-bench-meta">LVL ${program.level} | HP ${program.hp}/${program.maxHp}</div>
      ${statusMarkup}
    </article>
  `;
}

// buildThreatVisualMarkup() keeps the enemy side theatrical while still showing the threat's combat stats.
function buildThreatVisualMarkup(state) {
  const threat = state.threat;
  const statusMarkup = renderStatusPills(threat.statusEffects);
  const activeProgram = getActiveBattleProgram(state);
  const matchup = getTypeAdvantage(getActorCombatType(activeProgram), getActorCombatType(threat, true));
  const matchupLabel = matchup.state === "super-effective" ? "SUPER EFFECTIVE" : matchup.state === "weak" ? "NOT VERY EFFECTIVE" : "NEUTRAL";

  return `
    <div class="battle-figure is-enemy">
      <div class="battle-figure-body">
        <div class="battle-figure-meta">
          <div class="combat-name-row">
            <span class="combat-name">${threat.title}</span>
            <span class="combat-lvl">LVL ${threat.level}</span>
          </div>
          <div class="combat-subline">${getThreatTypeLabel(threat.type)}</div>
          <div class="combat-subline">HP ${threat.hp}/${threat.maxHp}</div>
          ${renderBar(threat.hp, threat.maxHp, "is-hp")}
          <div class="combat-subline">WEAK: ${String(threat.weakPoint || "UNKNOWN").toUpperCase()}</div>
          <div class="threat-weakness">WEAK TO: ${String(getActorCombatType(threat, true) || "UNKNOWN").toUpperCase()}</div>
          <div class="combat-matchup-hint is-${matchup.state}">TYPE MATCHUP: ${String(activeProgram.type || "UNKNOWN").toUpperCase()} → ${String(getActorCombatType(threat, true) || "UNKNOWN").toUpperCase()} [${matchupLabel}]</div>
          ${statusMarkup}
        </div>
        <div class="battle-sprite threat-sprite ${getThreatSpriteClass(threat)}" aria-hidden="true"></div>
      </div>
    </div>
  `;
}

// buildActionButtonMarkup() renders only the current actor's moves so the bottom bar feels like a battle menu.
function buildActionButtonMarkup(state) {
  const currentActor = state.turnOrder[state.currentTurnIndex];
  const activeProgram = getActiveBattleProgram(state);
  const matchup = activeProgram ? getTypeAdvantage(getActorCombatType(activeProgram), getActorCombatType(state.threat, true)) : { state: "neutral" };

  if (!currentActor || currentActor.kind !== "program" || currentActor.ref.hp <= 0) {
    return `
      <div class="combat-action-note">THREAT TURN IN PROGRESS.</div>
      <div class="combat-matchup-hint is-${matchup.state}">TYPE MATCHUP: ${String(activeProgram.type || "UNKNOWN").toUpperCase()} → ${String(getActorCombatType(state.threat, true) || "UNKNOWN").toUpperCase()} [${matchup.state === "super-effective" ? "SUPER EFFECTIVE" : matchup.state === "weak" ? "NOT VERY EFFECTIVE" : "NEUTRAL"}]</div>
    `;
  }

  const actor = currentActor.ref;
  const comboButtons = [];
  const firewall = programs.find((program) => program.id === "firewall-7" && program.hp > 0);
  const ids = programs.find((program) => program.id === "ids-4" && program.hp > 0);
  const honeypot = programs.find((program) => program.id === "honeypot-3" && program.hp > 0);
  const antivirus = programs.find((program) => program.id === "antivirus-9" && program.hp > 0);

  if (firewall && ids && state.responseGauge >= 3) {
    comboButtons.push(`
      <button class="combat-action-button" type="button" data-combat-combo="sync-defense">
        [ SYNCHRONIZED DEFENSE | COST 3 ]
      </button>
    `);
  }

  if (honeypot && antivirus && state.responseGauge >= 3) {
    comboButtons.push(`
      <button class="combat-action-button" type="button" data-combat-combo="containment-protocol">
        [ CONTAINMENT PROTOCOL | COST 3 ]
      </button>
    `);
  }

  return `
    <div class="combat-action-note">CURRENT ACTOR: ${actor.name} (LVL ${actor.level})</div>
    <div class="combat-matchup-hint is-${matchup.state}">TYPE MATCHUP: ${String(actor.type || "UNKNOWN").toUpperCase()} → ${String(getActorCombatType(state.threat, true) || "UNKNOWN").toUpperCase()} [${matchup.state === "super-effective" ? "SUPER EFFECTIVE" : matchup.state === "weak" ? "NOT VERY EFFECTIVE" : "NEUTRAL"}]</div>
    <div class="combat-actions">
      ${actor.abilities.map((ability, index) => {
        const disabled = state.responseGauge < ability.cost ? "disabled" : "";
        return `
          <button class="combat-action-button" type="button" data-combat-ability="${index}" ${disabled}>
            [ ${ability.name.toUpperCase()} | COST ${ability.cost} ]
          </button>
        `;
      }).join("")}
    </div>
    ${comboButtons.length ? `<div class="combat-ability-row">${comboButtons.join("")}</div><div class="combat-action-note">COMBO AVAILABLE: RESPONSE GAUGE ${state.responseGauge}/100</div>` : ""}
  `;
}

// buildCombatMarkup() turns the battle into a battlefield scene with one featured program and one featured threat.
function buildCombatMarkup(state) {
  const currentActor = state.turnOrder[state.currentTurnIndex];
  const currentProgram = getActiveBattleProgram(state);
  const benchPrograms = state.playerParty.filter((program) => program.id !== currentProgram.id);

  return `
    <div class="combat-shell">
      <header class="combat-header">
        <div class="combat-title-block">
          <div class="combat-panel-title">THREATGRID COMBAT</div>
          <div class="combat-encounter-name">${state.threat.title} / LEVEL ${state.threat.level}</div>
        </div>
        <div class="combat-turn-preview">
          <div class="combat-panel-title">TURN ORDER</div>
          <div class="combat-turn-preview-row">
            ${buildTurnOrderMarkup(state)}
          </div>
        </div>
      </header>

      <section class="combat-battlefield">
        <div class="battle-side battle-side-player">
          <div class="combat-panel-title">ACTIVE PROGRAM</div>
          ${buildProgramBattlefieldMarkup(currentProgram, true)}
          <div class="battle-bench">
            ${benchPrograms.map((program) => buildProgramBenchMarkup(program, currentActor && currentActor.kind === "program" && currentActor.ref.id === program.id)).join("")}
          </div>
        </div>

        <div class="battle-midpoint">
          <div class="combat-vs">VS</div>
          <div class="battle-field-note">CYBER RESPONSE ONLINE</div>
        </div>

        <div class="battle-side battle-side-enemy">
          <div class="combat-panel-title">THREAT TARGET</div>
          ${buildThreatVisualMarkup(state)}
        </div>
      </section>

      <footer class="battle-footer combat-footer">
        <aside class="combat-log-panel">
          <div class="combat-panel-title">BATTLE LOG</div>
          <div id="battle-log" class="combat-log">${buildBattleLogMarkup(state)}</div>
        </aside>

        <section class="combat-action-panel">
          <div class="combat-panel-title">ACTIONS</div>
          <div class="combat-gauge-wrap">
            <div class="combat-gauge-label">RESPONSE GAUGE</div>
            ${renderBar(state.responseGauge, 100, "is-gauge")}
            <div class="combat-gauge-text">${state.responseGauge}/100</div>
          </div>
          <div class="combat-action-grid">
            ${buildActionButtonMarkup(state)}
          </div>
        </section>
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
  return `
    <div class="battle-end-screen">
      <div class="battle-end-headline">BATTLE LOST</div>
      <div class="terminal-rule" aria-hidden="true"></div>
      <div class="battle-end-copy">
        THE PARTY WAS WIPED OUT.
        <br>
        THE THREAT REMAINS ACTIVE.
      </div>
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

  threatPanelContent.querySelectorAll("[data-combat-ability]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!combatEngine || !actor || actor.kind !== "program") {
        return;
      }

      const abilityIndex = Number(button.getAttribute("data-combat-ability"));
      const ability = actor.ref.abilities[abilityIndex];

      if (!ability) {
        return;
      }

      combatEngine.takeTurn(actor, ability);
    });
  });

  threatPanelContent.querySelectorAll("[data-combat-combo]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!combatEngine || !actor || actor.kind !== "program") {
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

// returnToGlobeFromCombat() closes the victory overlay and restores the globe for a manual next-click.
function returnToGlobeFromCombat() {
  hideEncounterTransition();
  closeCombatOverlay(true);
  screenState = "game";
  if (typeof globe !== "undefined") {
    globe.autoRotateSpeed = 0.0012;
  }
}

// continueToNextThreat() now preserves the old name as an alias for the post-battle return flow.
function continueToNextThreat() {
  returnToGlobeFromCombat();
}

// getRandomActiveThreat() selects the next live target from the global roster.
function getRandomActiveThreat() {
  const activeThreats = threats.filter((threat) => threat.status === "active");
  if (!activeThreats.length) {
    return null;
  }

  return activeThreats[getRandomInt(0, activeThreats.length - 1)];
}

// showCombatScreen() opens the battle overlay and advances immediately into the first turn.
function showCombatScreen(state) {
  hideEncounterTransition();
  combatState = state;
  combatEngine = new ThreatCombat(combatState);
  combatEngine.init();
}

// showCombatReward() keeps the overlay open after victory until the player chooses what comes next.
function showCombatReward(rewardLines) {
  if (!combatState) {
    return;
  }

  combatState.phase = "reward";
  renderCombatReward(rewardLines);
}

// showGameOverScreen() handles the defeat branch and returns the player to the menu when they are ready.
function showGameOverScreen(outcome) {
  if (outcome !== "lose") {
    return;
  }

  if (combatState) {
    combatState.phase = "defeat";
  }

  renderBattleLostScreen();
}

// hideEncounterTransition() clears the short cinematic overlay so a battle can take over cleanly.
function hideEncounterTransition() {
  if (encounterTransitionTimerId !== null) {
    window.clearTimeout(encounterTransitionTimerId);
    encounterTransitionTimerId = null;
  }

  encounterTransitionActive = false;

  if (encounterOverlay) {
    encounterOverlay.classList.remove("is-visible");
    encounterOverlay.setAttribute("aria-hidden", "true");
  }
}

// showEncounterTransition() gives the click a short cinematic beat before the combat screen appears.
function showEncounterTransition(threat) {
  if (!threat || threat.status !== "active" || combatState || encounterTransitionActive) {
    return;
  }

  closeCombatOverlay(true);
  hideEncounterTransition();
  encounterTransitionActive = true;

  if (encounterOverlay) {
    encounterOverlay.setAttribute("aria-hidden", "false");
    encounterOverlay.classList.add("is-visible");
  }

  encounterTransitionTimerId = window.setTimeout(() => {
    encounterTransitionTimerId = null;
    if (!encounterTransitionActive) {
      return;
    }

    encounterTransitionActive = false;
    if (encounterOverlay) {
      encounterOverlay.classList.remove("is-visible");
      encounterOverlay.setAttribute("aria-hidden", "true");
    }

    if (screenState !== "game" || combatState || threat.status !== "active") {
      return;
    }

    showCombatScreen(buildCombatState(threat));
  }, 1000);
}

// closeCombatOverlay() clears the overlay state when a battle ends or the player returns to the menu.
function closeCombatOverlay(forceClose = false) {
  if (combatEngine && !forceClose && combatState && combatState.phase === "battle") {
    return;
  }

  hideEncounterTransition();

  if (combatEngine) {
    combatEngine.destroy();
  }

  combatEngine = null;
  combatState = null;

  threatPanel.classList.remove("is-open", "is-combat");
  threatPanel.setAttribute("aria-hidden", "true");

  window.setTimeout(() => {
    if (!threatPanel.classList.contains("is-open")) {
      threatPanelContent.innerHTML = "";
    }
  }, 180);
}

// closeThreatPanel() stays as a compatibility alias so the existing menu flow can close combat cleanly.
function closeThreatPanel(forceClose = false) {
  closeCombatOverlay(forceClose);
}

// awardBattleRewards() applies the roguelike XP loop and returns the summary text for the victory screen.
function awardBattleRewards(defeatedThreat) {
  const baseXP = 50 * defeatedThreat.level;
  const rewardLines = [];

  programs.forEach((program) => {
    const gainedXP = baseXP;
    program.xp += gainedXP;

    let levelUpCount = 0;

    while (program.level < 10 && program.xp >= (program.level * 100)) {
      program.xp -= (program.level * 100);
      program.level = Math.min(10, program.level + 1);
      program.atk += 1;
      program.def += 1;
      program.maxHp += 15;
      program.hp = program.maxHp;
      levelUpCount += 1;
    }

    rewardLines.push({
      levelUp: levelUpCount > 0,
      text: levelUpCount > 0
        ? `${program.name} gained ${gainedXP} XP! NOW LEVEL ${program.level} | MAX HP +15 | ATK +1 | DEF +1`
        : `${program.name} gained ${gainedXP} XP. CURRENT LEVEL ${program.level}.`
    });
  });

  updateScoreDisplay();
  return rewardLines;
}

// ThreatCombat owns the battle loop, auto-turns, and battle resolution for the current encounter.
class ThreatCombat {
  constructor(state) {
    this.state = state;
    this.turnTimeoutId = null;
  }

  init() {
    this.state.turnOrder = buildTurnOrder(this.state.playerParty, this.state.threat);
    this.state.currentTurnIndex = 0;
    this.state.phase = "battle";
    this.state.activeProgramId = this.state.turnOrder.find((entry) => entry.kind === "program" && entry.ref.hp > 0)?.ref.id || this.state.activeProgramId;
    screenState = "combat";
    addBattleLog(`ENGAGING ${this.state.threat.title.toUpperCase()} AT LEVEL ${this.state.threat.level}.`);
    renderCombatScreen();
    this.resolveCurrentTurn();
  }

  destroy() {
    if (this.turnTimeoutId !== null) {
      window.clearTimeout(this.turnTimeoutId);
      this.turnTimeoutId = null;
    }
  }

  getCurrentActor() {
    return this.state.turnOrder[this.state.currentTurnIndex];
  }

  resolveCurrentTurn() {
    if (this.state.phase !== "battle") {
      return;
    }

    const currentActor = this.getCurrentActor();

    if (!currentActor) {
      return;
    }

    if (currentActor.kind === "threat") {
      this.turnTimeoutId = window.setTimeout(() => {
        this.turnTimeoutId = null;
        this.takeTurn(currentActor, null);
      }, 650);
      return;
    }

    renderCombatScreen();
  }

  advanceTurn() {
    if (this.state.phase !== "battle") {
      return;
    }

    const totalActors = this.state.turnOrder.length;
    let safety = 0;

    do {
      this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % totalActors;
      safety += 1;
      const nextActor = this.getCurrentActor();

      if (!nextActor) {
        break;
      }

      if (nextActor.kind === "program" && nextActor.ref.hp > 0) {
        this.state.activeProgramId = nextActor.ref.id;
        break;
      }

      if (nextActor.kind === "threat" && nextActor.ref.hp > 0) {
        break;
      }
    } while (safety <= totalActors + 1);

    renderCombatScreen();
    this.resolveCurrentTurn();
  }

  applyTypeAdvantage(attackerType, defenderType) {
    return getTypeAdvantage(attackerType, defenderType);
  }

  calculateDamage(attacker, defender, ability) {
    return calculateDamage(attacker, defender, ability);
  }

  applyStatusEffect(target, effect) {
    if (!target) {
      return;
    }

    target.statusEffects = Array.isArray(target.statusEffects) ? target.statusEffects : [];

    if (effect === "status_detected") {
      if (!target.statusEffects.includes("detected")) {
        target.statusEffects.push("detected");
      }
      return;
    }

    if (effect === "status_isolated") {
      if (!target.statusEffects.includes("isolated")) {
        target.statusEffects.push("isolated");
      }
      return;
    }

    if (effect === "status_encrypted") {
      if (!target.statusEffects.includes("encrypted")) {
        target.statusEffects.push("encrypted");
      }
    }
  }

  clearStatusEffects(target) {
    if (!target) {
      return;
    }

    target.statusEffects = [];
  }

  applyPlayerEffect(actor, ability, damageResult) {
    if (ability.effect === "reduce_next_damage") {
      this.state.nextDamageReduction = 0.5;
      addBattleLog(`${actor.name.toUpperCase()} BRACED THE NETWORK. NEXT INCOMING DAMAGE HALVED.`, "buff");
      return;
    }

    if (ability.effect === "boost_def") {
      actor.def += 2;
      addBattleLog(`${actor.name.toUpperCase()} HARDENED PORTS. DEFENSE +2.`, "buff");
      return;
    }

    if (ability.effect === "shared_ability") {
      this.state.responseGauge = Math.min(100, this.state.responseGauge + 5);
      addBattleLog(`${actor.name.toUpperCase()} SHARED BANDWIDTH ACROSS THE PARTY. GAUGE +5.`, "buff");
      return;
    }

    if (ability.effect === "status_detected") {
      this.applyStatusEffect(this.state.threat, "status_detected");
      addBattleLog(`${this.state.threat.title.toUpperCase()} WAS TAGGED [DETECTED].`, "buff");
      return;
    }

    if (ability.effect === "status_isolated") {
      this.applyStatusEffect(this.state.threat, "status_isolated");
      addBattleLog(`${this.state.threat.title.toUpperCase()} WAS TAGGED [ISOLATED].`, "buff");
      return;
    }

    if (ability.effect === "cleanse") {
      programs.forEach((program) => {
        this.clearStatusEffects(program);
      });
      this.clearStatusEffects(this.state.threat);
      addBattleLog(`${actor.name.toUpperCase()} CLEARED PARTY AND THREAT STATUS EFFECTS.`, "buff");
      return;
    }

    if (ability.effect === "combo_sync_defense") {
      this.state.nextDamageReduction = 0.5;
      this.state.nextCounterDamage = 15;
      addBattleLog(`SYNCHRONIZED DEFENSE ONLINE. NEXT HIT REDUCED BY 50% AND COUNTER DAMAGE ARMED.`, "buff");
      return;
    }

    if (ability.effect === "combo_containment") {
      this.clearStatusEffects(this.state.threat);
      programs.forEach((program) => this.clearStatusEffects(program));
      addBattleLog(`CONTAINMENT PROTOCOL ENGAGED. STATUS EFFECTS CLEARED.`, "buff");
    }
  }

  applyThreatEffect(threat, ability) {
    if (ability.effect === "self_level_up") {
      threat.level = Math.min(10, threat.level + 1);
      threat.atk += 1;
      threat.def += 1;
      threat.maxHp += 15;
      threat.hp = Math.min(threat.maxHp, threat.hp + 15);
      addBattleLog(`${threat.title.toUpperCase()} ESCALATED TO LEVEL ${threat.level}.`, "buff");
      return;
    }

    if (ability.effect === "status_encrypted") {
      const livingPrograms = programs.filter((program) => program.hp > 0);
      const target = livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
      this.applyStatusEffect(target, "status_encrypted");
      addBattleLog(`${target.name.toUpperCase()} IS ENCRYPTED. DAMAGE OUTPUT REDUCED.`, "damage");
      return;
    }

    if (ability.effect === "status_detected") {
      const livingPrograms = programs.filter((program) => program.hp > 0);
      const target = livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
      this.applyStatusEffect(target, "status_detected");
      addBattleLog(`${target.name.toUpperCase()} WAS TAGGED [DETECTED].`, "damage");
      return;
    }

    if (ability.effect === "status_isolated") {
      const livingPrograms = programs.filter((program) => program.hp > 0);
      const target = livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
      this.applyStatusEffect(target, "status_isolated");
      addBattleLog(`${target.name.toUpperCase()} WAS PULLED INTO AN [ISOLATED] SEGMENT.`, "damage");
    }
  }

  resolveDamage(attacker, defender, ability, options = {}) {
    const damageResult = this.calculateDamage(attacker, defender, ability);
    let damage = damageResult.damage;

    if (options.isThreatAttack && this.state.nextDamageReduction > 0) {
      damage = Math.max(1, Math.round(damage * (1 - this.state.nextDamageReduction)));
      this.state.nextDamageReduction = 0;
    }

    if (defender === this.state.threat && Array.isArray(defender.statusEffects) && defender.statusEffects.includes("isolated")) {
      damage = Math.max(1, Math.round(damage * 1.1));
    }

    if (options.multiplier) {
      damage = Math.max(1, Math.round(damage * options.multiplier));
    }

    defender.hp = Math.max(0, defender.hp - damage);
    return {
      ...damageResult,
      damage
    };
  }

  takeTurn(actorEntry, ability) {
    if (this.state.phase !== "battle" || !actorEntry) {
      return;
    }

    const currentActor = this.getCurrentActor();
    if (currentActor !== actorEntry) {
      return;
    }

    const actor = actorEntry.ref;

    if (actorEntry.kind === "program") {
      if (actor.hp <= 0) {
        this.advanceTurn();
        return;
      }

      if (!ability || (actor.abilities.indexOf(ability) === -1 && !String(ability.effect || "").startsWith("combo_"))) {
        return;
      }

      if (this.state.responseGauge < ability.cost) {
        addBattleLog(`${actor.name.toUpperCase()} NEEDS MORE RESPONSE GAUGE.`, "buff");
        renderCombatScreen();
        return;
      }

      this.state.responseGauge = Math.max(0, this.state.responseGauge - ability.cost);
      const damageResult = this.resolveDamage(actor, this.state.threat, ability);
      this.state.responseGauge = Math.min(100, this.state.responseGauge + getRandomInt(10, 15));

      if (damageResult.typeState === "super-effective") {
        addBattleLog(`${actor.name.toUpperCase()} USED ${ability.name.toUpperCase()} - ${damageResult.damage} DAMAGE [SUPER-EFFECTIVE!]`, "damage");
      } else {
        addBattleLog(`${actor.name.toUpperCase()} USED ${ability.name.toUpperCase()} - ${damageResult.damage} DAMAGE [${damageResult.levelMultiplier.toFixed(1)}X LEVEL BONUS]`, "damage");
      }

      this.applyPlayerEffect(actor, ability, damageResult);

      if (this.state.threat.hp <= 0) {
        this.end("victory");
        return;
      }

      this.advanceTurn();
      return;
    }

    if (actorEntry.kind === "threat") {
      const threatAbility = ability || actor.abilities[getRandomInt(0, actor.abilities.length - 1)];
      const livingPrograms = programs.filter((program) => program.hp > 0);

      if (!livingPrograms.length) {
        this.end("defeat");
        return;
      }

      this.applyThreatEffect(actor, threatAbility);

      if (threatAbility.effect === "self_level_up") {
        renderCombatScreen();
        if (this.checkWinCondition()) {
          return;
        }
        this.advanceTurn();
        return;
      }

      if (threatAbility.effect === "damage_all") {
        livingPrograms.forEach((program) => {
          const damageResult = this.resolveDamage(actor, program, threatAbility, { multiplier: 0.75, isThreatAttack: true });
          addBattleLog(`${actor.title.toUpperCase()} SPLASHED ${program.name.toUpperCase()} FOR ${damageResult.damage} DAMAGE.`, "damage");
        });
      } else {
        const target = livingPrograms[getRandomInt(0, livingPrograms.length - 1)];
        const damageResult = this.resolveDamage(actor, target, threatAbility, { isThreatAttack: true });
        addBattleLog(`${actor.title.toUpperCase()} USED ${threatAbility.name.toUpperCase()} - ${damageResult.damage} DAMAGE ON ${target.name.toUpperCase()}.`, "damage");
      }

      if (this.state.nextCounterDamage > 0) {
        this.state.threat.hp = Math.max(0, this.state.threat.hp - this.state.nextCounterDamage);
        addBattleLog(`COUNTER DAMAGE DEALT ${this.state.nextCounterDamage} TO ${this.state.threat.title.toUpperCase()}.`, "buff");
        this.state.nextCounterDamage = 0;
      }

      if (this.checkWinCondition()) {
        return;
      }

      this.advanceTurn();
    }
  }

  checkWinCondition() {
    const allProgramsDown = programs.every((program) => program.hp <= 0);
    if (allProgramsDown) {
      this.end("defeat");
      return true;
    }

    if (this.state.threat.hp <= 0) {
      this.end("victory");
      return true;
    }

    return false;
  }

  end(outcome) {
    if (this.state.phase !== "battle") {
      return;
    }

    this.destroy();
    this.state.outcome = outcome;

    if (outcome === "victory") {
      this.state.phase = "reward";
      this.state.sourceThreat.status = "neutralized";
      this.state.sourceThreat.hp = this.state.sourceThreat.maxHp;
      threatsNeutralized += 1;
      addScore(100);
      globe.removeThreatNode(this.state.sourceThreat.id);
      globe.updateActiveCount();
      const rewardLines = awardBattleRewards(this.state.threat);
      addBattleLog(`${this.state.sourceThreat.title.toUpperCase()} NEUTRALIZED. REWARD PACKAGE ISSUED.`, "buff");
      showCombatReward(rewardLines);
      return;
    }

    this.state.phase = "defeat";
    addBattleLog(`ALL PROGRAMS FAILED. BATTLE LOST.`, "damage");
    showGameOverScreen("lose");
  }
}

// openThreatPanel() now routes the click through the short encounter transition before combat starts.
function openThreatPanel(threat) {
  if (screenState !== "game" || combatState || encounterTransitionActive || !threat || threat.status !== "active") {
    return;
  }

  showEncounterTransition(threat);
}

// wireThreatResponses() connects globe clicks to battle encounters and keeps the earlier respawn layer alive.
function wireThreatResponses() {
  if (threatResponsesWired) {
    return;
  }

  threatResponsesWired = true;

  globe.onThreatClick((threat) => {
    if (screenState !== "game" || threat.status !== "active" || combatState || encounterTransitionActive) {
      return;
    }

    openThreatPanel(threat);
  });

  startRespawnInterval();
}

// The panel close button stays wired for cleanup, even though combat hides the button in CSS.
threatPanelClose.addEventListener("click", () => {
  closeCombatOverlay(true);
});

// The expedition flag fully restores the party between battles.
if (expeditionFlagButton) {
  expeditionFlagButton.addEventListener("click", () => {
    if (screenState !== "game" || combatState) {
      return;
    }

    healProgramRoster();
    addBattleLog("EXPEDITION FLAG DEPLOYED. PARTY RESTORED TO FULL CAPACITY.", "buff");
    updateScoreDisplay();
  });
}

// Start on the main menu so the globe can boot behind it when the player is ready.
updateScoreDisplay();
showMenu();
