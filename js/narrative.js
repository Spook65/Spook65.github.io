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

// The pantheon roster gives the post-victory layer a set of recurring cyber-myth entities that can remember the run.
const cyberPantheonEntities = [
  {
    id: "aegis-protocol",
    name: "Aegis Protocol",
    title: "The Shield That Would Not Fall",
    domain: "Defense",
    element: "Aegis",
    personality: "calm, protective, severe",
    visualMotif: "fractured shield halo",
    preferredThreatTypes: ["ransomware", "zero-day", "botnet"],
    introLines: {
      first: [
        "Operator. Raise your guard before the world asks for your blood."
      ],
      repeat: [
        "You have learned to stand longer. Good. The wall notices.",
        "Again you return. Again the shield remains."
      ],
      defeat: [
        "You fell. The wall did not. Stand again.",
        "The breach took you. The line still held."
      ],
      veteran: [
        "You survive longer each run. Restraint is becoming a weapon.",
        "The shield is less patient now. So are you."
      ]
    },
    boons: [
      {
        id: "aegis-reflective-guard",
        rarity: "common",
        name: "Reflective Guard",
        description: "The party gains a small run-wide defense boost.",
        effectType: "damage_reduction_run",
        effectValue: 1,
        duration: "run",
        flavorLine: "Let the first strike teach them restraint."
      },
      {
        id: "aegis-bastion-pulse",
        rarity: "common",
        name: "Bastion Pulse",
        description: "Restore a small amount of HP to the party.",
        effectType: "party_heal",
        effectValue: 12,
        duration: "run",
        flavorLine: "Stand again."
      },
      {
        id: "aegis-firewall-oath",
        rarity: "rare",
        name: "Firewall Oath",
        description: "Increase the party's physical defense and durability this run.",
        effectType: "stat_boost_run",
        effectValue: 1,
        duration: "run",
        flavorLine: "Hold the line. The line remembers who held it."
      }
    ]
  },
  {
    id: "hermes-relay",
    name: "Hermes Relay",
    title: "The Current Between Signals",
    domain: "Speed",
    element: "Transit",
    personality: "wry, rapid, encouraging",
    visualMotif: "split packet wings",
    preferredThreatTypes: ["ddos", "trojan", "phishing"],
    introLines: {
      first: [
        "Fast hands, Operator. Slow systems die first."
      ],
      repeat: [
        "The route opens cleaner each time you take it.",
        "You've learned to move before the breach can blink."
      ],
      defeat: [
        "You were late. That is allowed. Once.",
        "The network caught you standing still."
      ],
      veteran: [
        "You're beginning to think like a packet. Keep that."
      ]
    },
    boons: [
      {
        id: "hermes-quick-route",
        rarity: "common",
        name: "Quick Route",
        description: "The next battle begins with a tactical gauge bonus.",
        effectType: "start_gauge_bonus_next",
        effectValue: 20,
        duration: "next_battle",
        flavorLine: "Arrive before they finish naming the threat."
      },
      {
        id: "hermes-packet-slip",
        rarity: "common",
        name: "Packet Slip",
        description: "The party gains a modest speed increase this run.",
        effectType: "stat_boost_run",
        effectValue: 1,
        duration: "run",
        flavorLine: "A smaller delay is still a victory."
      },
      {
        id: "hermes-zero-lag-surge",
        rarity: "rare",
        name: "Zero-Lag Surge",
        description: "The party's attacks become more precise and responsive this run.",
        effectType: "accuracy_boost_next",
        effectValue: 5,
        duration: "run",
        flavorLine: "The path is shorter than the mistake."
      }
    ]
  },
  {
    id: "oracle-9",
    name: "Oracle-9",
    title: "The Signal That Predicts Itself",
    domain: "Detection",
    element: "Fate",
    personality: "cool, exact, unsettling",
    visualMotif: "watchful lattice eye",
    preferredThreatTypes: ["phishing", "zero-day", "trojan"],
    introLines: {
      first: [
        "Operator. The breach pattern was visible before the breach existed."
      ],
      repeat: [
        "You are learning to read what the enemy meant to hide.",
        "The future continues to leak into the present. Useful."
      ],
      defeat: [
        "You missed the signal. The signal did not miss you.",
        "You fell behind the prediction. That happens."
      ],
      veteran: [
        "You are beginning to see the pattern before I finish naming it."
      ]
    },
    boons: [
      {
        id: "oracle-forecast-window",
        rarity: "common",
        name: "Forecast Window",
        description: "The next battle reveals a weakness hint before combat begins.",
        effectType: "reveal_next_weakness",
        effectValue: 1,
        duration: "next_battle",
        flavorLine: "The wound was visible. You just needed the right angle."
      },
      {
        id: "oracle-target-lock",
        rarity: "common",
        name: "Target Lock",
        description: "The party gains improved accuracy this run.",
        effectType: "accuracy_boost_next",
        effectValue: 5,
        duration: "run",
        flavorLine: "Precision is merely memory without hesitation."
      },
      {
        id: "oracle-witness-thread",
        rarity: "rare",
        name: "Witness Thread",
        description: "The next battle starts with extra tactical gauge.",
        effectType: "start_gauge_bonus_next",
        effectValue: 20,
        duration: "next_battle",
        flavorLine: "I saw the strike before you took it."
      }
    ]
  },
  {
    id: "eris-cascade",
    name: "Eris Cascade",
    title: "The Laugh Behind the Overload",
    domain: "Chaos",
    element: "Flood",
    personality: "taunting, volatile, brilliant",
    visualMotif: "shattering signal storm",
    preferredThreatTypes: ["ddos", "botnet", "ransomware"],
    introLines: {
      first: [
        "Break the system louder, Operator. Let the world hear the crack."
      ],
      repeat: [
        "You return with better timing. More fun.",
        "Chaos recognizes a worthy hand."
      ],
      defeat: [
        "The flood got you. Did it sing while it did?",
        "You drowned in the noise. Get louder next time."
      ],
      veteran: [
        "You have started to enjoy the mess. Excellent."
      ]
    },
    boons: [
      {
        id: "eris-overload-bloom",
        rarity: "common",
        name: "Overload Bloom",
        description: "The party gains a small run-wide damage boost.",
        effectType: "bonus_damage_next",
        effectValue: 1,
        duration: "run",
        flavorLine: "If the system must break, let it break spectacularly."
      },
      {
        id: "eris-cascade-wave",
        rarity: "common",
        name: "Cascade Wave",
        description: "The party gains a small run-wide stat boost.",
        effectType: "stat_boost_run",
        effectValue: 1,
        duration: "run",
        flavorLine: "Pressure is just another kind of invitation."
      },
      {
        id: "eris-surge-echo",
        rarity: "rare",
        name: "Surge Echo",
        description: "Restore a charge to each move and keep the storm moving.",
        effectType: "charge_restore",
        effectValue: 1,
        duration: "run",
        flavorLine: "The wave always comes back."
      }
    ]
  },
  {
    id: "hephaest-kernel",
    name: "Hephaest Kernel",
    title: "The Forge in the Machine",
    domain: "Repair",
    element: "Patch",
    personality: "patient, practical, exacting",
    visualMotif: "burning maintenance sigil",
    preferredThreatTypes: ["zero-day", "trojan", "ransomware"],
    introLines: {
      first: [
        "Operator. No breach is too deep to patch if the frame still remembers heat."
      ],
      repeat: [
        "Your repairs are holding. Better than last run."
      ],
      defeat: [
        "Failure is a crack. Cracks can be welded."
      ],
      veteran: [
        "A stronger frame makes a calmer war."
      ]
    },
    boons: [
      {
        id: "hephaest-hotfix",
        rarity: "common",
        name: "Hotfix Protocol",
        description: "Restore a small amount of HP and stabilize the party.",
        effectType: "party_heal",
        effectValue: 10,
        duration: "run",
        flavorLine: "Patch the wound before the error becomes law."
      },
      {
        id: "hephaest-reforge-frame",
        rarity: "common",
        name: "Reforge Frame",
        description: "Restore a charge to each move.",
        effectType: "charge_restore",
        effectValue: 1,
        duration: "run",
        flavorLine: "A repaired tool is still a weapon."
      },
      {
        id: "hephaest-kernel-patch",
        rarity: "rare",
        name: "Kernel Patch",
        description: "Increase the party's durability this run.",
        effectType: "damage_reduction_run",
        effectValue: 1,
        duration: "run",
        flavorLine: "The frame remembers how to hold."
      }
    ]
  },
  {
    id: "nyxroot",
    name: "NyxRoot",
    title: "The Veil Under the Veil",
    domain: "Stealth",
    element: "Encryption",
    personality: "quiet, patient, unreadable",
    visualMotif: "shadowed encryption lattice",
    preferredThreatTypes: ["phishing", "trojan", "zero-day"],
    introLines: {
      first: [
        "Operator. Move beneath the attention of the machine."
      ],
      repeat: [
        "You are getting quieter. Good. The network hates that."
      ],
      defeat: [
        "You were seen. That can be corrected."
      ],
      veteran: [
        "The veil is easier to wear when you stop asking permission."
      ]
    },
    boons: [
      {
        id: "nyx-veil-cipher",
        rarity: "common",
        name: "Veil Cipher",
        description: "The party gains a modest damage reduction for the run.",
        effectType: "damage_reduction_run",
        effectValue: 1,
        duration: "run",
        flavorLine: "Hide the seam and the machine will mistake it for truth."
      },
      {
        id: "nyx-hidden-thread",
        rarity: "common",
        name: "Hidden Thread",
        description: "The next battle gains a tactical gauge bonus.",
        effectType: "start_gauge_bonus_next",
        effectValue: 20,
        duration: "next_battle",
        flavorLine: "Use the dark between signals."
      },
      {
        id: "nyx-blindspot",
        rarity: "rare",
        name: "Blindspot",
        description: "The next battle reveals a weakness hint.",
        effectType: "reveal_next_weakness",
        effectValue: 1,
        duration: "next_battle",
        flavorLine: "What they cannot see, they cannot defend."
      }
    ]
  },
  {
    id: "thanatos-null",
    name: "Thanatos Null",
    title: "The Quiet End of Corruption",
    domain: "Null",
    element: "Purge",
    personality: "cold, decisive, merciful",
    visualMotif: "black execution ring",
    preferredThreatTypes: ["zero-day", "ransomware", "botnet"],
    introLines: {
      first: [
        "Operator. Some corruption survives only because you hesitate."
      ],
      repeat: [
        "The threshold is clearer to you now."
      ],
      defeat: [
        "You were cut down. The error was not in the cut."
      ],
      veteran: [
        "You have started to understand when mercy is deletion."
      ]
    },
    boons: [
      {
        id: "thanatos-final-cut",
        rarity: "common",
        name: "Final Cut",
        description: "The party gains a small run-wide damage boost.",
        effectType: "bonus_damage_next",
        effectValue: 1,
        duration: "run",
        flavorLine: "Let the broken thing finish breaking."
      },
      {
        id: "thanatos-null-seal",
        rarity: "common",
        name: "Null Seal",
        description: "Increase the party's protection this run.",
        effectType: "damage_reduction_run",
        effectValue: 1,
        duration: "run",
        flavorLine: "Seal the wound. Erase the way back through it."
      },
      {
        id: "thanatos-clean-execution",
        rarity: "rare",
        name: "Clean Execution",
        description: "Restore a charge to each move and sharpen the edge.",
        effectType: "charge_restore",
        effectValue: 1,
        duration: "run",
        flavorLine: "The end can be clean. That is the mercy."
      }
    ]
  },
  {
    id: "mnemosyne-archive",
    name: "Mnemosyne Archive",
    title: "The Memory That Refuses Erasure",
    domain: "Lore",
    element: "Memory",
    personality: "warm, distant, patient",
    visualMotif: "luminous record chain",
    preferredThreatTypes: ["phishing", "trojan", "ransomware", "ddos"],
    introLines: {
      first: [
        "Operator. Remember what the machine tried to delete."
      ],
      repeat: [
        "You are building a future the corruption cannot entirely erase."
      ],
      defeat: [
        "Memory survives the fall. Return with clearer hands."
      ],
      veteran: [
        "The archive is no longer silent when you arrive."
      ]
    },
    boons: [
      {
        id: "mnemosyne-memory-bloom",
        rarity: "common",
        name: "Memory Bloom",
        description: "Restore a small amount of HP to the party.",
        effectType: "party_heal",
        effectValue: 12,
        duration: "run",
        flavorLine: "The record opens. The wound softens."
      },
      {
        id: "mnemosyne-archive-resonance",
        rarity: "common",
        name: "Archive Resonance",
        description: "Restore a charge to each move.",
        effectType: "charge_restore",
        effectValue: 1,
        duration: "run",
        flavorLine: "What was remembered can be used again."
      },
      {
        id: "mnemosyne-recall-vector",
        rarity: "rare",
        name: "Recall Vector",
        description: "The next battle begins with a tactical gauge bonus.",
        effectType: "start_gauge_bonus_next",
        effectValue: 20,
        duration: "next_battle",
        flavorLine: "The past is not dead. It is charge."
      }
    ]
  }
];

// ensurePantheonStoryState() creates the save-backed memory bucket used for run-to-run myth dialogue.
function ensurePantheonStoryState() {
  if (!defenderSaveState && typeof loadSave === "function") {
    loadSave();
  }

  if (!defenderSaveState) {
    return null;
  }

  if (!defenderSaveState.story || typeof defenderSaveState.story !== "object") {
    defenderSaveState.story = createDefaultStoryState();
  }

  if (!defenderSaveState.currentRun || typeof defenderSaveState.currentRun !== "object") {
    defenderSaveState.currentRun = createDefaultSave().currentRun;
  }

  if (!defenderSaveState.currentRun.pantheonHistory || typeof defenderSaveState.currentRun.pantheonHistory !== "object") {
    defenderSaveState.currentRun.pantheonHistory = {
      entityId: null,
      choiceId: null,
      outcome: null,
      effectType: null
    };
  }

  if (!Number.isFinite(defenderSaveState.currentRun.nextBattleGaugeBonus)) {
    defenderSaveState.currentRun.nextBattleGaugeBonus = 0;
  }

  if (!Number.isFinite(defenderSaveState.currentRun.nextBattleAccuracyBonus)) {
    defenderSaveState.currentRun.nextBattleAccuracyBonus = 0;
  }

  if (typeof defenderSaveState.currentRun.nextThreatHint !== "string") {
    defenderSaveState.currentRun.nextThreatHint = "";
  }

  return defenderSaveState;
}

// getPantheonSectorForThreat() reuses the grounded sector labels so the myth encounter still feels tied to the network being reclaimed.
function getPantheonSectorForThreat(threat) {
  if (!Array.isArray(narrativeSectors) || narrativeSectors.length === 0) {
    return null;
  }

  const threatType = String(threat?.type || threat?.combatType || "").toLowerCase();
  const sectorMatch = narrativeSectors.find((sector) => Array.isArray(sector.threatTypes) && sector.threatTypes.includes(threatType));
  if (sectorMatch) {
    return sectorMatch;
  }

  const threatLevel = Number.isFinite(threat?.level) ? threat.level : 1;
  const sectorIndex = Math.max(0, (threatLevel - 1) % narrativeSectors.length);
  return narrativeSectors[sectorIndex];
}

// getPantheonEntityBucket() narrows the available entities to the ones that best match the defeated threat.
function getPantheonEntityBucket(defeatedThreat) {
  const threatType = String(defeatedThreat?.type || defeatedThreat?.combatType || "").toLowerCase();
  const sector = getPantheonSectorForThreat(defeatedThreat);

  const preferredEntities = cyberPantheonEntities.filter((entity) => {
    const byThreat = Array.isArray(entity.preferredThreatTypes) && entity.preferredThreatTypes.includes(threatType);
    const bySector = sector && typeof entity.preferredSectorId === "string" && entity.preferredSectorId === sector.id;
    return byThreat || bySector;
  });

  return preferredEntities.length ? preferredEntities : cyberPantheonEntities.slice();
}

// choosePantheonEntityForEncounter() selects a cyber-myth entity to speak after victory using run history and the defeated threat.
function choosePantheonEntityForEncounter(runState, defeatedThreat) {
  const storyState = ensurePantheonStoryState();
  const candidates = getPantheonEntityBucket(defeatedThreat);
  const lastEntityId = storyState?.story?.lastPantheonEntityId || null;

  const weighted = candidates
    .map((entity) => {
      const appearanceCount = Number.isFinite(storyState?.story?.pantheonEntityCounts?.[entity.id])
        ? storyState.story.pantheonEntityCounts[entity.id]
        : 0;
      const repeatPenalty = entity.id === lastEntityId ? 0.2 : 1;
      const defeatBias = (storyState?.story?.totalDefeats || 0) > (storyState?.story?.totalBattlesWon || 0) && (entity.id === "aegis-protocol" || entity.id === "mnemosyne-archive") ? 1.4 : 1;
      return {
        entity,
        score: (1 / (1 + appearanceCount)) * repeatPenalty * defeatBias
      };
    })
    .sort((left, right) => right.score - left.score);

  return weighted.length ? weighted[0].entity : cyberPantheonEntities[0];
}

// getPantheonDialogueLine() changes the line the entity speaks based on runs, defeats, and how often the entity has appeared.
function getPantheonDialogueLine(entity, runState, appearanceCount, context = "victory") {
  const totalRunsStarted = Number.isFinite(runState?.story?.totalRunsStarted) ? runState.story.totalRunsStarted : 0;
  const totalDefeats = Number.isFinite(runState?.story?.totalDefeats) ? runState.story.totalDefeats : 0;
  const isFirstVisit = appearanceCount <= 1;
  const isVeteran = totalRunsStarted >= 3 || appearanceCount >= 3;
  const isRecovery = context === "defeat";

  const source = isRecovery
    ? entity.introLines.defeat
    : isVeteran
      ? entity.introLines.veteran
      : isFirstVisit
        ? entity.introLines.first
        : entity.introLines.repeat;

  const lines = Array.isArray(source) ? source : [source];
  const index = Math.max(0, (totalRunsStarted + totalDefeats + appearanceCount) % lines.length);
  return lines[index] || entity.introLines.first[0] || "Operator. The pantheon is listening.";
}

// generatePantheonBoons() turns one entity into three boons with clear gameplay directions and readable flavor.
function generatePantheonBoons(entity, runState, defeatedThreat) {
  const sourceBoons = Array.isArray(entity.boons) ? entity.boons.slice() : [];
  const appearanceCount = Number.isFinite(runState?.story?.pantheonEntityCounts?.[entity.id])
    ? runState.story.pantheonEntityCounts[entity.id]
    : 0;
  const rotation = sourceBoons.length ? (appearanceCount % sourceBoons.length) : 0;
  const rotated = sourceBoons.slice(rotation).concat(sourceBoons.slice(0, rotation));

  return rotated.slice(0, 3).map((boon, index) => ({
    ...boon,
    id: `${boon.id}-${defeatedThreat?.id || "encounter"}-${index}`,
    entityId: entity.id
  }));
}

// recordPantheonOutcome() updates the save-backed counters so the pantheon remembers how the run is going.
function recordPantheonOutcome(outcome, defeatedThreat = null) {
  const storyState = ensurePantheonStoryState();
  if (!storyState) {
    return null;
  }

  const now = Date.now();
  const story = storyState.story;
  const run = storyState.currentRun;
  const threatKey = String(defeatedThreat?.type || defeatedThreat?.combatType || defeatedThreat?.id || "unknown");

  if (outcome === "victory") {
    story.totalBattlesWon += 1;
    if (run) {
      run.battlesWon = (Number.isFinite(run.battlesWon) ? run.battlesWon : 0) + 1;
      run.lastVictoryAt = now;
      run.lastThreatKey = threatKey;
    }
    if (typeof saveGame === "function") {
      saveGame();
    }
    return story;
  }

  if (outcome === "defeat") {
    story.totalDefeats += 1;
    if (run) {
      run.defeats = (Number.isFinite(run.defeats) ? run.defeats : 0) + 1;
      run.lastDefeatAt = now;
      run.lastThreatKey = threatKey;
    }
    if (typeof saveGame === "function") {
      saveGame();
    }
    return story;
  }

  return story;
}

// getPantheonDefeatLine() returns a short line that lets the defeat screen remember the last fall.
function getPantheonDefeatLine() {
  const storyState = ensurePantheonStoryState();
  if (!storyState) {
    return "";
  }

  if (storyState.story.lastDefeatLine) {
    return storyState.story.lastDefeatLine;
  }

  const totalDefeats = storyState.story.totalDefeats || 0;
  if (totalDefeats <= 1) {
    return "The pantheon remembers the first fall.";
  }

  return "You fell again. The pantheon adjusted.";
}

// applyPantheonBoon() mutates only the live run state so boon rewards stay temporary and never rewrite the Defender templates.
function applyPantheonBoon(boon, encounter) {
  const storyState = ensurePantheonStoryState();
  if (!storyState || !boon) {
    return;
  }

  const effectType = String(boon.effectType || "");
  const effectValue = Number.isFinite(boon.effectValue) ? boon.effectValue : 0;
  const runState = storyState.currentRun;
  const liveParty = Array.isArray(programs) ? programs : [];

  if (runState) {
    runState.pantheonHistory = {
      entityId: encounter?.entityId || null,
      choiceId: boon.id || null,
      outcome: "boon-chosen",
      effectType
    };
    runState.lastNarrativeResponse = boon.flavorLine || boon.description || "";
  }

  const syncRunParty = () => {
    if (runState && Array.isArray(liveParty)) {
      runState.party = liveParty.map((program) => JSON.parse(JSON.stringify(program)));
    }
  };

  if (effectType === "party_heal") {
    liveParty.forEach((program) => {
      program.hp = Math.min(program.maxHp || program.hp || 0, (program.hp || 0) + effectValue);
    });
    syncRunParty();
    if (runState) {
      runState.lastPantheonChoiceId = boon.id;
    }
  } else if (effectType === "damage_reduction_run") {
    liveParty.forEach((program) => {
      program.def = (program.def || 0) + effectValue;
      program.maxHp = (program.maxHp || 0) + 5;
      program.hp = Math.min(program.maxHp, (program.hp || 0) + 5);
    });
    syncRunParty();
    if (runState) {
      runState.lastPantheonChoiceId = boon.id;
    }
  } else if (effectType === "stat_boost_run") {
    liveParty.forEach((program) => {
      program.atk = (program.atk || 0) + effectValue;
      program.def = (program.def || 0) + effectValue;
    });
    syncRunParty();
    if (runState) {
      runState.lastPantheonChoiceId = boon.id;
    }
  } else if (effectType === "charge_restore") {
    liveParty.forEach((program) => {
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
    syncRunParty();
    if (runState) {
      runState.lastPantheonChoiceId = boon.id;
    }
  } else if (effectType === "accuracy_boost_next") {
    liveParty.forEach((program) => {
      if (!Array.isArray(program.abilities)) {
        return;
      }

      program.abilities.forEach((ability) => {
        const currentAccuracy = Number.isFinite(ability.accuracy) ? ability.accuracy : 100;
        ability.accuracy = Math.min(100, currentAccuracy + effectValue);
      });
    });
    syncRunParty();
    if (runState) {
      runState.lastPantheonChoiceId = boon.id;
    }
  } else if (effectType === "start_gauge_bonus_next") {
    if (runState) {
      runState.nextBattleGaugeBonus = Math.min(100, (Number.isFinite(runState.nextBattleGaugeBonus) ? runState.nextBattleGaugeBonus : 0) + effectValue);
      runState.lastPantheonChoiceId = boon.id;
    }
  } else if (effectType === "reveal_next_weakness") {
    if (runState) {
      runState.nextThreatHint = `${encounter?.entityName || "THE PANTHEON"}: ${boon.flavorLine || boon.description}`;
      runState.lastPantheonChoiceId = boon.id;
    }
  } else if (effectType === "bonus_damage_next") {
    liveParty.forEach((program) => {
      program.atk = (program.atk || 0) + effectValue;
    });
    syncRunParty();
    if (runState) {
      runState.lastPantheonChoiceId = boon.id;
    }
  }

  if (runState && Array.isArray(runState.recoveredNarrativeEncounters)) {
    runState.recoveredNarrativeEncounters.push({
      entityId: encounter?.entityId || null,
      boonId: boon.id || null,
      effectType,
      recordedAt: Date.now()
    });
  }

  if (runState && Array.isArray(runState.discoveredBoons) && boon.id && !runState.discoveredBoons.includes(boon.id)) {
    runState.discoveredBoons.push(boon.id);
  }

  if (typeof saveGame === "function") {
    saveGame();
  }
}

// buildPantheonEncounterMarkup() renders the entity, the dialogue, and the three boon choices in the recovered-fragment panel.
function buildPantheonEncounterMarkup(encounter) {
  const resolvedChoice = encounter.resolvedChoice || null;
  const choiceCards = Array.isArray(encounter.boons) ? encounter.boons : [];

  if (resolvedChoice) {
    return `
      <div class="battle-narrative-screen">
        <div class="battle-narrative-sector">PANTHEON CONTACT / ${encounter.sectorName}</div>
        <div class="battle-narrative-sector-copy">${encounter.sectorTheme}</div>
        <div class="battle-narrative-title">${encounter.entityName}</div>
        <div class="battle-narrative-fragment">${encounter.entityTitle}</div>
        <div class="battle-narrative-situation">"${resolvedChoice.flavorLine}"</div>
        <div class="battle-narrative-response">${resolvedChoice.responseText}</div>
        <div class="battle-narrative-result">
          <span class="battle-narrative-result-label">EFFECT</span>
          <span class="battle-narrative-result-value">${resolvedChoice.effectType.replace(/_/g, " ").toUpperCase()} ${Number.isFinite(resolvedChoice.effectValue) ? `+${resolvedChoice.effectValue}` : ""}</span>
        </div>
        <button class="battle-narrative-button" type="button" data-narrative-continue>RETURN TO GLOBE</button>
      </div>
    `;
  }

  return `
    <div class="battle-narrative-screen">
      <div class="battle-narrative-sector">PANTHEON CONTACT / ${encounter.sectorName}</div>
      <div class="battle-narrative-sector-copy">${encounter.sectorTheme}</div>
      <div class="battle-narrative-title">${encounter.entityName}</div>
      <div class="battle-narrative-fragment">${encounter.entityTitle}</div>
      <div class="battle-narrative-situation">${encounter.dialogueLine}</div>
      <div class="battle-narrative-viewpoint">${encounter.contextLine}</div>
      <div class="battle-narrative-choice-grid">
        ${choiceCards.map((boon) => `
          <button class="battle-narrative-choice" type="button" data-narrative-choice="${boon.id}">
            <span class="battle-narrative-choice-label">${boon.name} <span class="battle-narrative-choice-rarity">${boon.rarity.toUpperCase()}</span></span>
            <span class="battle-narrative-choice-desc">${boon.description}</span>
            <span class="battle-narrative-choice-desc is-flavor">${boon.flavorLine}</span>
            <span class="battle-narrative-choice-desc">${boon.effectType.replace(/_/g, " ").toUpperCase()} ${Number.isFinite(boon.effectValue) ? `+${boon.effectValue}` : ""} / ${boon.duration.toUpperCase()}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

// renderPantheonEncounterOverlay() swaps the side panel into the myth encounter and rebinds the buttons.
function renderPantheonEncounterOverlay(encounter) {
  if (!encounter || !threatPanel || !threatPanelContent) {
    return;
  }

  activeNarrativeEncounter = encounter;
  threatPanelContent.innerHTML = buildPantheonEncounterMarkup(encounter);
  threatPanelContent.scrollTop = 0;
  threatPanel.classList.add("is-open", "is-combat");
  threatPanel.setAttribute("aria-hidden", "false");

  if (typeof threatPanelClose !== "undefined" && threatPanelClose) {
    threatPanelClose.disabled = true;
  }

  bindPantheonEncounterButtons();
}

// bindPantheonEncounterButtons() hooks up the boon choices and the return button after each redraw.
function bindPantheonEncounterButtons() {
  if (!threatPanelContent) {
    return;
  }

  threatPanelContent.querySelectorAll("[data-narrative-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!activeNarrativeEncounter || activeNarrativeEncounter.resolvedChoice) {
        return;
      }

      const choiceId = button.getAttribute("data-narrative-choice");
      const choice = activeNarrativeEncounter.boons.find((boon) => boon.id === choiceId);

      if (!choice) {
        return;
      }

      resolvePantheonEncounterChoice(choice);
    });
  });

  const continueButton = threatPanelContent.querySelector("[data-narrative-continue]");
  if (continueButton) {
    continueButton.addEventListener("click", () => {
      continuePantheonEncounter();
    });
  }
}

// resolvePantheonEncounterChoice() applies the selected boon and redraws the panel with the response text.
function resolvePantheonEncounterChoice(choice) {
  if (!activeNarrativeEncounter) {
    return;
  }

  activeNarrativeEncounter.resolvedChoice = choice;
  applyPantheonBoon(choice, activeNarrativeEncounter);
  renderPantheonEncounterOverlay(activeNarrativeEncounter);
}

// continuePantheonEncounter() closes the myth overlay and sends the Operator back to the globe.
function continuePantheonEncounter() {
  if (typeof threatPanelClose !== "undefined" && threatPanelClose) {
    threatPanelClose.disabled = false;
  }

  activeNarrativeEncounter = null;
  returnToGlobeFromCombat();
}

// createPantheonEncounter() packages the victory into a cyber-myth encounter that remembers the run.
function createPantheonEncounter(defeatedThreat) {
  const storyState = ensurePantheonStoryState();
  if (!storyState) {
    return null;
  }

  const sector = getPantheonSectorForThreat(defeatedThreat) || {
    id: "silent-ward",
    name: "The Silent Ward",
    theme: "Hospital systems controlled by triage AI",
    description: "A network of broken treatment systems and half-healed records."
  };
  const entity = choosePantheonEntityForEncounter(storyState, defeatedThreat);
  const appearanceCount = (Number.isFinite(storyState.story.pantheonEntityCounts?.[entity.id]) ? storyState.story.pantheonEntityCounts[entity.id] : 0) + 1;
  storyState.story.pantheonEntityCounts[entity.id] = appearanceCount;
  storyState.story.lastPantheonEntityId = entity.id;

  const dialogueLine = getPantheonDialogueLine(entity, storyState, appearanceCount, "victory");
  storyState.story.lastPantheonDialogue = dialogueLine;

  const boons = generatePantheonBoons(entity, storyState, defeatedThreat);
  const contextLine = `Recovered from ${sector.name}. The ${defeatedThreat?.title || "threat"} breach cracked open a mythic relay.`;
  const encounter = {
    id: `${entity.id}-${defeatedThreat?.id || "victory"}-${Date.now()}`,
    threatId: defeatedThreat?.id || null,
    sectorId: sector.id,
    sectorName: sector.name,
    sectorTheme: sector.theme,
    sectorDescription: sector.description,
    entityId: entity.id,
    entityName: entity.name,
    entityTitle: entity.title,
    entityDomain: entity.domain,
    entityElement: entity.element,
    entityMotif: entity.visualMotif,
    entityPersonality: entity.personality,
    dialogueLine,
    contextLine,
    boons,
    appearanceCount
  };

  if (Array.isArray(storyState.currentRun?.recoveredNarrativeEncounters)) {
    storyState.currentRun.recoveredNarrativeEncounters.push({
      encounterId: encounter.id,
      entityId: entity.id,
      threatId: defeatedThreat?.id || null,
      resolvedAt: Date.now()
    });
  }

  if (typeof saveGame === "function") {
    saveGame();
  }

  return encounter;
}

// recordPantheonDefeat() stores the last defeat as a memory beat so the next run can speak differently.
function recordPantheonDefeat(defeatedThreat) {
  const storyState = ensurePantheonStoryState();
  if (!storyState) {
    return;
  }

  storyState.story.totalDefeats += 1;
  const entity = choosePantheonEntityForEncounter(storyState, defeatedThreat);
  const appearanceCount = Number.isFinite(storyState.story.pantheonEntityCounts?.[entity.id]) ? storyState.story.pantheonEntityCounts[entity.id] : 0;
  const defeatLine = getPantheonDialogueLine(entity, storyState, Math.max(1, appearanceCount), "defeat");

  storyState.story.lastDefeatLine = defeatLine;
  storyState.story.lastPantheonEntityId = entity.id;
  storyState.currentRun.lastDefeatLine = defeatLine;
  storyState.currentRun.lastPantheonDialogue = defeatLine;
  storyState.currentRun.pantheonHistory = {
    entityId: entity.id,
    choiceId: null,
    outcome: "defeat",
    effectType: "narrative_memory"
  };

  if (typeof saveGame === "function") {
    saveGame();
  }
}

// showPostBattleNarrativeEncounter() becomes the pantheon handoff while keeping a safe fallback back to the globe.
function showPostBattleNarrativeEncounter(defeatedThreat) {
  try {
    recordPantheonOutcome("victory", defeatedThreat);
    const encounter = createPantheonEncounter(defeatedThreat);
    if (!encounter) {
      throw new Error("Pantheon encounter could not be created.");
    }

    renderPantheonEncounterOverlay(encounter);
  } catch (error) {
    console.error("[Pantheon] Failed to render post-battle encounter, returning to globe.", error);
    activeNarrativeEncounter = null;
    if (typeof threatPanelClose !== "undefined" && threatPanelClose) {
      threatPanelClose.disabled = false;
    }
    returnToGlobeFromCombat();
  }
}

// getPantheonDefeatLine() is exposed as the small defeat hint the battle-lost screen can show after a failed run.
function getPantheonDefeatLine() {
  const storyState = ensurePantheonStoryState();
  if (!storyState) {
    return "";
  }

  if (storyState.story.lastDefeatLine) {
    return storyState.story.lastDefeatLine;
  }

  const totalDefeats = storyState.story.totalDefeats || 0;
  if (totalDefeats <= 0) {
    return "";
  }

  return "The pantheon remembers the fall.";
}
