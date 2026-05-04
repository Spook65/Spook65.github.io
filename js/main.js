/* Main wiring for THREATGRID: create the globe, run game rules, and drive the Layer 2 and Layer 3 panel UI. */
const globe = new ThreatGlobe(document.getElementById("globe-root"), threats);

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
let typewriterIntervalId = null;
let missionTimerIntervalId = null;
let escalationTickerId = null;
let closePanelTimeoutId = null;
let panelTimeoutIds = [];

// Escalation state is tracked outside globe.js because these are game rules, while globe.js only renders state.
const escalationStateByThreatId = {};

// DOM references are cached once so panel updates stay simple and readable.
const threatPanel = document.getElementById("threat-panel");
const threatPanelContent = document.getElementById("threat-panel-content");
const threatPanelClose = document.getElementById("threat-panel-close");
const scoreDisplay = document.getElementById("score-display");
const accuracyDisplay = document.getElementById("accuracy-display");

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
  closeDebriefButton.addEventListener("click", () => {
    closeThreatPanel();
  });
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
  if (screenState !== "game") {
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
  if (escalationTimersStarted) {
    return;
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
  if (panelNeutralizing || threat.status !== "active") {
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

// wireThreatResponses() connects globe clicks to the panel and starts long-running game systems once the globe exists.
function wireThreatResponses() {
  if (threatResponsesWired) {
    return;
  }

  threatResponsesWired = true;

  globe.onThreatClick((threat) => {
    if (threat.status !== "active") {
      return;
    }

    openThreatPanel(threat);
  });

  // Respawn checks keep the original Layer 1 source-of-truth behavior running underneath later layers.
  window.setInterval(() => {
    globe.respawnRandomThreat();
    globe.syncThreatNodes();

    threats.forEach((threat) => {
      if (threat.status === "active") {
        ensureEscalationState(threat, false);
      }
    });
  }, 12000);

  startEscalationTimers();
}

// The panel close button resets the view and slides the panel back off screen.
threatPanelClose.addEventListener("click", () => {
  closeThreatPanel();
});

// Start on the main menu so the globe can boot behind it when the player is ready.
updateScoreDisplay();
showMenu();
