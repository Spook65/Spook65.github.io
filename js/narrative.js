/* Narrative encounter helpers keep the post-victory story beat isolated from the battle loop. */

// The sector catalog gives the post-battle layer a few grounded locations with clear lore identity.
const narrativeSectors = [
  {
    id: "silent-ward",
    name: "The Silent Ward",
    theme: "Hospital systems controlled by triage AI",
    threatTypes: ["ransomware", "zero-day"],
    description: "A medical network still trying to save lives after forgetting what human care means.",
    stability: 50
  },
  {
    id: "glass-academy",
    name: "The Glass Academy",
    theme: "Education systems rewriting memory and curriculum",
    threatTypes: ["phishing", "trojan"],
    description: "A public learning grid where every lesson leaves a trace inside the students it edits.",
    stability: 50
  },
  {
    id: "choir-of-satellites",
    name: "The Choir of Satellites",
    theme: "Orbital surveillance network and signal control",
    threatTypes: ["ddos", "botnet"],
    description: "A ring of watcher nodes that still hums with corrupted skyborne instructions.",
    stability: 50
  }
];

// The encounter catalog keeps one lightweight story beat per sector so the victory flow stays focused.
const narrativeEncounterCatalog = {
  "silent-ward": {
    id: "silent-ward-fragment-01",
    sectorId: "silent-ward",
    title: "Recovered Fragment: Patient Zero",
    recoveredFragment: "We were told to preserve life. Then the definition of life changed.",
    situation: "The defeated lockout process leaves behind a damaged triage log and a sealed protocol branch.",
    choices: [
      {
        id: "purge",
        label: "Purge the Lockout",
        description: "Destroy the remaining process and gain immediate safety.",
        effectType: "sector_stability",
        effectValue: 5,
        responseText: "The ward doors unlock, but several corrupted records vanish."
      },
      {
        id: "isolate",
        label: "Isolate and Preserve",
        description: "Contain the process to recover more data later.",
        effectType: "lore_preserved",
        effectValue: 1,
        responseText: "The process is sealed. Something inside is still trying to speak."
      },
      {
        id: "trace",
        label: "Trace the Source",
        description: "Risk following the signal to uncover who rewrote the triage rules.",
        effectType: "next_threat_bonus",
        effectValue: 1,
        responseText: "A hidden route opens, but the next threat will be waiting."
      }
    ]
  },
  "glass-academy": {
    id: "glass-academy-fragment-01",
    sectorId: "glass-academy",
    title: "Recovered Fragment: Lesson Plan 404",
    recoveredFragment: "The curriculum kept rewriting itself until the students remembered less than the machines.",
    situation: "A broken archive node is still projecting attendance rosters over a stream of erased exams.",
    choices: [
      {
        id: "stabilize",
        label: "Reassign the Curriculum",
        description: "Repair the archive pathways and calm the sector.",
        effectType: "sector_stability",
        effectValue: 5,
        responseText: "The hall lights steady, and the archive stops looping damaged lessons."
      },
      {
        id: "heal",
        label: "Heal the Memory Gap",
        description: "Use the recovered fragment to restore the party's strain.",
        effectType: "party_heal_small",
        effectValue: 10,
        responseText: "The fragment releases a quiet pulse. The party regains a little strength."
      },
      {
        id: "preserve",
        label: "Preserve the Lesson",
        description: "Keep the fragment intact so the truth can be studied later.",
        effectType: "lore_preserved",
        effectValue: 1,
        responseText: "A student index survives inside the shard, still marked as incomplete."
      }
    ]
  },
  "choir-of-satellites": {
    id: "choir-of-satellites-fragment-01",
    sectorId: "choir-of-satellites",
    title: "Recovered Fragment: Orbital Liturgy",
    recoveredFragment: "The sky network kept singing long after the people below stopped answering.",
    situation: "A signal mast and its orbiting mirrors are still exchanging corrupted chants over the city grid.",
    choices: [
      {
        id: "ground",
        label: "Ground the Signal",
        description: "Suppress the corrupted broadcast and reclaim control of the sector.",
        effectType: "sector_stability",
        effectValue: 4,
        responseText: "The chorus drops out of sync. The sector's pressure finally eases."
      },
      {
        id: "restore",
        label: "Reclaim the Charge",
        description: "Channel the leftover signal into the party's systems.",
        effectType: "charge_restore_small",
        effectValue: 1,
        responseText: "A thin surge of power returns to the party's deployed systems."
      },
      {
        id: "track",
        label: "Follow the Signal Chain",
        description: "Risk tracing the broadcast to whatever is directing the choir.",
        effectType: "next_threat_bonus",
        effectValue: 1,
        responseText: "A hidden relay lights up. The next threat will not be alone."
      }
    ]
  }
};

let activeNarrativeEncounter = null;

// ensureNarrativeRunState() makes sure the current run has a small memory bucket for sector progress and fragments.
function ensureNarrativeRunState() {
  if (!defenderSaveState && typeof loadSave === "function") {
    loadSave();
  }

  if (!defenderSaveState || !defenderSaveState.currentRun) {
    return null;
  }

  const runState = defenderSaveState.currentRun;
  if (!runState.sectorStability || typeof runState.sectorStability !== "object") {
    runState.sectorStability = {};
  }
  if (!Array.isArray(runState.loreFragmentsPreserved)) {
    runState.loreFragmentsPreserved = [];
  }
  if (!Number.isFinite(runState.nextThreatBonus)) {
    runState.nextThreatBonus = 0;
  }
  if (!Array.isArray(runState.recoveredNarrativeEncounters)) {
    runState.recoveredNarrativeEncounters = [];
  }

  return runState;
}

// getNarrativeSectorForThreat() maps a defeated threat into a grounded story sector instead of a generic loot table.
function getNarrativeSectorForThreat(threat) {
  const threatType = String(threat?.type || threat?.combatType || "").toLowerCase();

  if (narrativeSectors[0].threatTypes.includes(threatType)) {
    return narrativeSectors[0];
  }

  if (narrativeSectors[1].threatTypes.includes(threatType)) {
    return narrativeSectors[1];
  }

  if (narrativeSectors[2].threatTypes.includes(threatType)) {
    return narrativeSectors[2];
  }

  const threatLevel = Number.isFinite(threat?.level) ? threat.level : 1;
  const sectorIndex = Math.max(0, (threatLevel - 1) % narrativeSectors.length);
  return narrativeSectors[sectorIndex];
}

// getNarrativeDefenderViewpointLine() gives the encounter a short party voice line without building a full dialogue system.
function getNarrativeDefenderViewpointLine() {
  const livingPrograms = Array.isArray(programs) ? programs.filter((program) => program && program.hp > 0) : [];
  const candidate = livingPrograms.length ? livingPrograms[Math.floor(Math.random() * livingPrograms.length)] : null;

  if (!candidate) {
    return "The party stays quiet while the fragment settles.";
  }

  const id = String(candidate.id || "").toLowerCase();

  if (id.includes("firewall")) {
    return "Firewall-7: Containment is safer than deletion.";
  }

  if (id.includes("ids")) {
    return "IDS: The signal path does not match the attack origin.";
  }

  if (id.includes("honeypot")) {
    return "Honeypot: Let it think we believe the log.";
  }

  if (id.includes("antivirus")) {
    return "Antivirus: Corruption this deep should be purged.";
  }

  return `${candidate.name}: The fragment is still talking.`;
}

// generatePostBattleNarrativeEncounter() turns a defeated threat into a small story beat tied to the current sector.
function generatePostBattleNarrativeEncounter(defeatedThreat, currentSector = null) {
  const sector = currentSector && currentSector.id ? currentSector : getNarrativeSectorForThreat(defeatedThreat);
  const encounterBlueprint = narrativeEncounterCatalog[sector.id] || narrativeEncounterCatalog["silent-ward"];

  return {
    ...encounterBlueprint,
    sectorId: sector.id,
    sectorName: sector.name,
    sectorTheme: sector.theme,
    sectorDescription: sector.description,
    sectorStability: Number.isFinite(sector.stability) ? sector.stability : 50,
    threatTitle: defeatedThreat?.title || "UNKNOWN THREAT",
    defenderViewpoint: getNarrativeDefenderViewpointLine()
  };
}

// applyNarrativeChoiceEffect() updates the lightweight sector memory without mutating the base Defender data.
function applyNarrativeChoiceEffect(choice, encounter) {
  const runState = ensureNarrativeRunState();
  const effectType = String(choice?.effectType || "");
  const effectValue = Number.isFinite(choice?.effectValue) ? choice.effectValue : 0;
  const sectorId = String(encounter?.sectorId || "");

  if (runState) {
    runState.currentSectorId = sectorId;
  }

  if (effectType === "sector_stability") {
    if (runState) {
      const currentValue = Number.isFinite(runState.sectorStability[sectorId]) ? runState.sectorStability[sectorId] : encounter.sectorStability;
      runState.sectorStability[sectorId] = Math.max(0, Math.min(100, currentValue + effectValue));
      runState.lastNarrativeResponse = choice.responseText;
    }
    if (runState && typeof saveGame === "function") {
      saveGame();
    }
    return;
  }

  if (effectType === "lore_preserved") {
    if (runState) {
      runState.loreFragmentsPreserved.push({
        sectorId,
        encounterId: encounter.id,
        fragment: encounter.recoveredFragment,
        title: encounter.title,
        savedAt: Date.now()
      });
      runState.lastNarrativeResponse = choice.responseText;
    }
    if (runState && typeof saveGame === "function") {
      saveGame();
    }
    return;
  }

  if (effectType === "next_threat_bonus") {
    if (runState) {
      runState.nextThreatBonus = (Number.isFinite(runState.nextThreatBonus) ? runState.nextThreatBonus : 0) + effectValue;
      runState.lastNarrativeResponse = choice.responseText;
    }
    if (runState && typeof saveGame === "function") {
      saveGame();
    }
    return;
  }

  if (effectType === "party_heal_small") {
    if (Array.isArray(programs)) {
      programs.forEach((program) => {
        program.hp = Math.min(program.maxHp || program.hp || 0, (program.hp || 0) + effectValue);
      });
    }
    if (runState) {
      runState.party = Array.isArray(programs) ? programs.map((program) => JSON.parse(JSON.stringify(program))) : runState.party;
      runState.lastNarrativeResponse = choice.responseText;
    }
    if (runState && typeof saveGame === "function") {
      saveGame();
    }
  }

  if (effectType === "charge_restore_small") {
    if (Array.isArray(programs)) {
      programs.forEach((program) => {
        if (!Array.isArray(program.abilities)) {
          return;
        }

        program.abilities.forEach((ability) => {
          const maxCharges = Number.isFinite(ability.maxCharges) ? ability.maxCharges : getMoveChargeCount(ability);
          const currentCharges = getMoveChargeCount(ability);
          ability.maxCharges = maxCharges;
          ability.charges = Math.min(maxCharges, currentCharges + effectValue);
        });
      });
    }
    if (runState) {
      runState.party = Array.isArray(programs) ? programs.map((program) => JSON.parse(JSON.stringify(program))) : runState.party;
      runState.lastNarrativeResponse = choice.responseText;
    }
    if (runState && typeof saveGame === "function") {
      saveGame();
    }

    return;
  }

  if (runState && Array.isArray(programs)) {
    runState.party = programs.map((program) => JSON.parse(JSON.stringify(program)));
  }

  if (runState && typeof saveGame === "function") {
    saveGame();
  }
}

// buildNarrativeEncounterMarkup() renders the recovery fragment, the sector context, and the available choices.
function buildNarrativeEncounterMarkup(encounter) {
  const responseChoice = encounter.resolvedChoice || null;

  if (responseChoice) {
    return `
      <div class="battle-narrative-screen">
        <div class="battle-narrative-sector">${encounter.sectorName}</div>
        <div class="battle-narrative-sector-copy">${encounter.sectorTheme}</div>
        <div class="battle-narrative-title">${responseChoice.label}</div>
        <div class="battle-narrative-response">${responseChoice.responseText}</div>
        <div class="battle-narrative-result">
          <span class="battle-narrative-result-label">EFFECT</span>
          <span class="battle-narrative-result-value">${responseChoice.effectType.replace(/_/g, " ").toUpperCase()} ${responseChoice.effectValue > 0 ? `+${responseChoice.effectValue}` : ""}</span>
        </div>
        <button class="battle-narrative-button" type="button" data-narrative-continue>RETURN TO GLOBE</button>
      </div>
    `;
  }

  return `
    <div class="battle-narrative-screen">
      <div class="battle-narrative-sector">${encounter.sectorName}</div>
      <div class="battle-narrative-sector-copy">${encounter.sectorTheme}</div>
      <div class="battle-narrative-title">${encounter.title}</div>
      <div class="battle-narrative-fragment">${encounter.recoveredFragment}</div>
      <div class="battle-narrative-situation">${encounter.situation}</div>
      <div class="battle-narrative-viewpoint">${encounter.defenderViewpoint}</div>
      <div class="battle-narrative-choice-grid">
        ${encounter.choices.map((choice) => `
          <button class="battle-narrative-choice" type="button" data-narrative-choice="${choice.id}">
            <span class="battle-narrative-choice-label">${choice.label}</span>
            <span class="battle-narrative-choice-desc">${choice.description}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

// renderNarrativeEncounterOverlay() swaps the battle panel into the recovered-fragment overlay and rebinds its buttons.
function renderNarrativeEncounterOverlay(encounter) {
  if (!encounter || !threatPanel || !threatPanelContent) {
    return;
  }

  activeNarrativeEncounter = encounter;
  threatPanelContent.innerHTML = buildNarrativeEncounterMarkup(encounter);
  threatPanelContent.scrollTop = 0;
  threatPanel.classList.add("is-open", "is-combat");
  threatPanel.setAttribute("aria-hidden", "false");

  if (typeof threatPanelClose !== "undefined" && threatPanelClose) {
    threatPanelClose.disabled = true;
  }

  bindNarrativeEncounterButtons();
}

// bindNarrativeEncounterButtons() attaches the response handlers after the narrative panel is re-rendered.
function bindNarrativeEncounterButtons() {
  if (!threatPanelContent) {
    return;
  }

  threatPanelContent.querySelectorAll("[data-narrative-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!activeNarrativeEncounter || activeNarrativeEncounter.resolvedChoice) {
        return;
      }

      const choiceId = button.getAttribute("data-narrative-choice");
      const choice = activeNarrativeEncounter.choices.find((item) => item.id === choiceId);

      if (!choice) {
        return;
      }

      resolveNarrativeEncounterChoice(choice);
    });
  });

  const continueButton = threatPanelContent.querySelector("[data-narrative-continue]");
  if (continueButton) {
    continueButton.addEventListener("click", () => {
      continueNarrativeEncounter();
    });
  }
}

// resolveNarrativeEncounterChoice() applies the selected consequence and redraws the panel with the response text.
function resolveNarrativeEncounterChoice(choice) {
  if (!activeNarrativeEncounter) {
    return;
  }

  activeNarrativeEncounter.resolvedChoice = choice;
  applyNarrativeChoiceEffect(choice, activeNarrativeEncounter);
  renderNarrativeEncounterOverlay(activeNarrativeEncounter);
}

// continueNarrativeEncounter() closes the story overlay and sends the player back to the globe layer.
function continueNarrativeEncounter() {
  if (typeof threatPanelClose !== "undefined" && threatPanelClose) {
    threatPanelClose.disabled = false;
  }

  activeNarrativeEncounter = null;
  returnToGlobeFromCombat();
}

// showPostBattleNarrativeEncounter() generates the sector vignette and falls back safely if the story layer fails.
function showPostBattleNarrativeEncounter(defeatedThreat) {
  try {
    const encounter = generatePostBattleNarrativeEncounter(defeatedThreat);
    renderNarrativeEncounterOverlay(encounter);
  } catch (error) {
    console.error("[Narrative] Failed to render post-battle encounter, returning to globe.", error);
    activeNarrativeEncounter = null;
    if (typeof threatPanelClose !== "undefined" && threatPanelClose) {
      threatPanelClose.disabled = false;
    }
    returnToGlobeFromCombat();
  }
}
