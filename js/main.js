/* Main wiring for THREATGRID: create the globe, drive the threat panel, and connect mission actions to the scene. */
const globe = new ThreatGlobe(document.getElementById("globe-root"), threats);

// activePanelThreat tracks which threat is currently being shown in the side panel.
let activePanelThreat = null;
let panelNeutralizing = false;
let typewriterIntervalId = null;
let closePanelTimeoutId = null;
let stepRevealTimeoutIds = [];

// These DOM references let the panel logic update content and open/close state without querying repeatedly.
const threatPanel = document.getElementById("threat-panel");
const threatPanelContent = document.getElementById("threat-panel-content");
const threatPanelClose = document.getElementById("threat-panel-close");

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

// Mitigation steps are hardcoded per threat type so the panel can stage realistic actions without an API.
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

// Prevention tips are shown after neutralization so the debrief still teaches the player something useful.
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
    "HUNT REGULARLY FOR SIDELoaded MODULES IN USER PROFILE PATHS"
  ]
};

// clearPanelAsyncWork() cancels in-flight panel timers so old animations do not leak into a new threat view.
function clearPanelAsyncWork() {
  if (typewriterIntervalId !== null) {
    window.clearInterval(typewriterIntervalId);
    typewriterIntervalId = null;
  }

  if (closePanelTimeoutId !== null) {
    window.clearTimeout(closePanelTimeoutId);
    closePanelTimeoutId = null;
  }

  stepRevealTimeoutIds.forEach((timeoutId) => {
    window.clearTimeout(timeoutId);
  });
  stepRevealTimeoutIds = [];
}

// getThreatTypeLabel() converts stored type keys into consistent UI labels.
function getThreatTypeLabel(type) {
  return threatTypeLabelLookup[type] || String(type).toUpperCase();
}

// getSeverityColor() returns the glow color used for both nodes and panel severity styling.
function getSeverityColor(severity) {
  return severityColorLookup[severity] || "#00ff88";
}

// getPreventionTips() pulls the debrief tips for the given type, falling back to generic guidance if needed.
function getPreventionTips(type) {
  return preventionTipsLookup[type] || [
    "REVIEW DETECTION COVERAGE FOR THIS THREAT CATEGORY",
    "VALIDATE SEGMENTATION AROUND HIGH-VALUE SYSTEMS",
    "DOCUMENT IOC MATCHES FOR FUTURE HUNT OPERATIONS"
  ];
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

// getClockTimestamp() formats the local time in HH:MM:SS so the debrief has a mission-complete timestamp.
function getClockTimestamp() {
  return new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

// buildThreatPanelMarkup() creates the live mission layout before the typewriter and protocol sequences start.
function buildThreatPanelMarkup(threat) {
  const severityColor = getSeverityColor(threat.severity);
  const threatTypeLabel = getThreatTypeLabel(threat.type);

  return `
    <div class="threat-panel-stack">
      <section class="threat-panel-header">
        <div class="threat-severity-badge" style="color: ${severityColor};">
          <span class="threat-severity-dot" style="background: ${severityColor}; color: ${severityColor};"></span>
          <span>${threat.severity.toUpperCase()}</span>
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

// resetThreatPanelView() clears panel state so every new threat opens from a clean baseline.
function resetThreatPanelView() {
  clearPanelAsyncWork();
  panelNeutralizing = false;
  activePanelThreat = null;
  threatPanelClose.disabled = false;
  threatPanelContent.scrollTop = 0;
  threatPanelContent.innerHTML = "";
}

// closeThreatPanel() slides the panel away and clears its content after the CSS transition finishes.
function closeThreatPanel(forceClose = false) {
  if (panelNeutralizing && !forceClose) {
    return;
  }

  clearPanelAsyncWork();
  panelNeutralizing = false;
  activePanelThreat = null;
  threatPanel.classList.remove("is-open");
  threatPanel.setAttribute("aria-hidden", "true");
  threatPanelClose.disabled = false;

  closePanelTimeoutId = window.setTimeout(() => {
    threatPanelContent.innerHTML = "";
    closePanelTimeoutId = null;
  }, 320);
}

// runTypewriter() writes text character by character so the analyst briefing feels like a live system output.
function runTypewriter(text, element, onComplete) {
  clearPanelAsyncWork();

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
    <article class="panel-step">
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
    const timeoutId = window.setTimeout(() => {
      stepsContainer.insertAdjacentHTML("beforeend", createStepMarkup(step, index));

      if (index === steps.length - 1 && typeof onComplete === "function") {
        onComplete();
      }
    }, index * 400);

    stepRevealTimeoutIds.push(timeoutId);
  });
}

// showDebriefScreen() swaps the live mission content for a mission-complete report in the same panel.
function showDebriefScreen(threat) {
  panelNeutralizing = false;
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

  window.setTimeout(() => {
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
  neutralizeButton.textContent = "[ NEUTRALIZING... ]";
  neutralizeButton.disabled = true;

  animateThreatRemoval(threat, () => {
    threat.status = "neutralized";
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

// openThreatPanel() fills the panel for the clicked threat, opens it, and starts the staged panel timeline.
function openThreatPanel(threat) {
  if (panelNeutralizing) {
    return;
  }

  clearPanelAsyncWork();
  activePanelThreat = threat;
  threatPanelClose.disabled = false;
  threatPanelContent.scrollTop = 0;
  threatPanelContent.innerHTML = buildThreatPanelMarkup(threat);
  threatPanel.classList.add("is-open");
  threatPanel.setAttribute("aria-hidden", "false");

  const analystText = document.getElementById("panel-analyst-text");
  const actionWrap = document.getElementById("panel-action-wrap");
  const steps = getMitigationStepsForThreat(threat);

  runTypewriter(threat.description, analystText, () => {
    if (activePanelThreat !== threat) {
      return;
    }

    showMitigationSteps(steps, () => {
      if (activePanelThreat !== threat) {
        return;
      }

      // The action button appears last so the player sees the mitigation plan before committing.
      actionWrap.classList.add("is-visible");

      const neutralizeButton = document.getElementById("neutralize-threat-button");
      neutralizeButton.addEventListener("click", () => {
        neutralizeThreat(threat);
      });
    });
  });
}

// wireThreatResponses() connects globe clicks to the panel and keeps the respawn loop alive in the background.
function wireThreatResponses() {
  globe.onThreatClick((threat) => {
    if (threat.status !== "active") {
      return;
    }

    openThreatPanel(threat);
  });

  // The respawn loop will eventually bring neutralized threats back into play.
  window.setInterval(() => {
    globe.respawnRandomThreat();
    globe.syncThreatNodes();
  }, 12000);

  // TODO: Layer 3 can subscribe to threat state updates here for map-level mission systems.
}

// The panel close button resets the view and slides the panel back off screen.
threatPanelClose.addEventListener("click", () => {
  closeThreatPanel();
});

// Start on the main menu so the globe can boot behind it when the player is ready.
showMenu();
