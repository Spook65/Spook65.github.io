/* Defender roster, starter selection, and save-state helpers keep the new collection layer separate from combat. */

const DEFENDER_SAVE_KEY = "threatgrid.save.v1";

// defenderCatalog is the long-term roster source of truth for starter defenders and future recruitment UI.
const defenderCatalog = [
  {
    id: "firewall-7",
    name: "Firewall-7",
    domain: "Bastion",
    affinity: "Defense",
    temperament: "Stoic",
    rarity: "Common",
    variant: "Standard",
    coreTrait: "Bulwark Array",
    passiveModule: "Shell Resonance",
    stats: { hp: 100, atk: 3, def: 7, spd: 6 },
    hp: 100,
    maxHp: 100,
    atk: 3,
    def: 7,
    spd: 6,
    color: "#00ccff",
    statusEffects: [],
    summary: "A shield guardian built to absorb direct intrusion.",
    moveList: [
      { name: "Block Network", power: 0, accuracy: 100, uses: "∞", effect: "reduce_next_damage" },
      { name: "Harden Ports", power: 15, accuracy: 100, uses: "∞", effect: "boost_def" },
      { name: "Allocate Bandwidth", power: 25, accuracy: 95, uses: "∞", effect: "shared_ability" }
    ],
    abilities: [
      { name: "Block Network", cost: 0, baseDamage: 0, effect: "reduce_next_damage" },
      { name: "Harden Ports", cost: 1, baseDamage: 15, effect: "boost_def" },
      { name: "Allocate Bandwidth", cost: 2, baseDamage: 25, effect: "shared_ability" }
    ]
  },
  {
    id: "firewall-12",
    name: "Sentinel Firewall",
    domain: "Bastion",
    affinity: "Defense",
    temperament: "Resolute",
    rarity: "Uncommon",
    variant: "Standard",
    coreTrait: "Aegis Frame",
    passiveModule: "Ward Loop",
    stats: { hp: 108, atk: 3, def: 8, spd: 5 },
    hp: 108,
    maxHp: 108,
    atk: 3,
    def: 8,
    spd: 5,
    color: "#74e6ff",
    statusEffects: [],
    summary: "A heavier shield unit forged for frontline containment.",
    moveList: [
      { name: "Block Network", power: 0, accuracy: 100, uses: "∞", effect: "reduce_next_damage" },
      { name: "Harden Ports", power: 16, accuracy: 100, uses: "∞", effect: "boost_def" },
      { name: "Allocate Bandwidth", power: 24, accuracy: 95, uses: "∞", effect: "shared_ability" }
    ],
    abilities: [
      { name: "Block Network", cost: 0, baseDamage: 0, effect: "reduce_next_damage" },
      { name: "Harden Ports", cost: 1, baseDamage: 15, effect: "boost_def" },
      { name: "Allocate Bandwidth", cost: 2, baseDamage: 25, effect: "shared_ability" }
    ]
  },
  {
    id: "ids-4",
    name: "IDS",
    domain: "Detection",
    affinity: "Offense",
    temperament: "Analytical",
    rarity: "Common",
    variant: "Standard",
    coreTrait: "Signal Scan",
    passiveModule: "Trace Pulse",
    stats: { hp: 92, atk: 6, def: 4, spd: 8 },
    hp: 92,
    maxHp: 92,
    atk: 6,
    def: 4,
    spd: 8,
    color: "#00ff88",
    statusEffects: [],
    summary: "A precision scout that spots exploits before they bloom.",
    moveList: [
      { name: "Deep Packet Scan", power: 16, accuracy: 100, uses: "∞", effect: "status_detected" },
      { name: "Signature Burst", power: 22, accuracy: 95, uses: "∞", effect: "status_detected" },
      { name: "Quarantine Relay", power: 28, accuracy: 90, uses: "∞", effect: "shared_ability" }
    ],
    abilities: [
      { name: "Deep Packet Scan", cost: 0, baseDamage: 16, effect: "status_detected" },
      { name: "Signature Burst", cost: 1, baseDamage: 22, effect: "status_detected" },
      { name: "Quarantine Relay", cost: 2, baseDamage: 28, effect: "shared_ability" }
    ]
  },
  {
    id: "ids-9",
    name: "Pulse IDS",
    domain: "Detection",
    affinity: "Offense",
    temperament: "Methodical",
    rarity: "Uncommon",
    variant: "Standard",
    coreTrait: "Radar Crown",
    passiveModule: "Threat Echo",
    stats: { hp: 88, atk: 7, def: 4, spd: 9 },
    hp: 88,
    maxHp: 88,
    atk: 7,
    def: 4,
    spd: 9,
    color: "#7effc2",
    statusEffects: [],
    summary: "A faster analyzer tuned to expose hidden weaknesses.",
    moveList: [
      { name: "Deep Packet Scan", power: 17, accuracy: 100, uses: "∞", effect: "status_detected" },
      { name: "Signature Burst", power: 24, accuracy: 95, uses: "∞", effect: "status_detected" },
      { name: "Quarantine Relay", power: 28, accuracy: 90, uses: "∞", effect: "shared_ability" }
    ],
    abilities: [
      { name: "Deep Packet Scan", cost: 0, baseDamage: 16, effect: "status_detected" },
      { name: "Signature Burst", cost: 1, baseDamage: 22, effect: "status_detected" },
      { name: "Quarantine Relay", cost: 2, baseDamage: 28, effect: "shared_ability" }
    ]
  },
  {
    id: "honeypot-3",
    name: "Honeypot",
    domain: "Illusion",
    affinity: "Deception",
    temperament: "Cunning",
    rarity: "Common",
    variant: "Standard",
    coreTrait: "False Signal",
    passiveModule: "Lure Bloom",
    stats: { hp: 96, atk: 4, def: 5, spd: 7 },
    hp: 96,
    maxHp: 96,
    atk: 4,
    def: 5,
    spd: 7,
    color: "#ffcc00",
    statusEffects: [],
    summary: "A decoy construct that tempts threats into exposed positions.",
    moveList: [
      { name: "Lure Traffic", power: 14, accuracy: 100, uses: "∞", effect: "status_isolated" },
      { name: "Decoy Mesh", power: 20, accuracy: 95, uses: "∞", effect: "boost_def" },
      { name: "Sandtrap", power: 26, accuracy: 90, uses: "∞", effect: "status_isolated" }
    ],
    abilities: [
      { name: "Lure Traffic", cost: 0, baseDamage: 14, effect: "status_isolated" },
      { name: "Decoy Mesh", cost: 1, baseDamage: 20, effect: "boost_def" },
      { name: "Sandtrap", cost: 2, baseDamage: 26, effect: "status_isolated" }
    ]
  },
  {
    id: "honeypot-8",
    name: "Mirage Honeypot",
    domain: "Illusion",
    affinity: "Deception",
    temperament: "Playful",
    rarity: "Rare",
    variant: "Standard",
    coreTrait: "Afterimage Trap",
    passiveModule: "Ghost Lure",
    stats: { hp: 100, atk: 4, def: 5, spd: 8 },
    hp: 100,
    maxHp: 100,
    atk: 4,
    def: 5,
    spd: 8,
    color: "#ffd966",
    statusEffects: [],
    summary: "A more elusive trickster that leaves false trails behind.",
    moveList: [
      { name: "Lure Traffic", power: 15, accuracy: 100, uses: "∞", effect: "status_isolated" },
      { name: "Decoy Mesh", power: 20, accuracy: 95, uses: "∞", effect: "boost_def" },
      { name: "Sandtrap", power: 27, accuracy: 90, uses: "∞", effect: "status_isolated" }
    ],
    abilities: [
      { name: "Lure Traffic", cost: 0, baseDamage: 14, effect: "status_isolated" },
      { name: "Decoy Mesh", cost: 1, baseDamage: 20, effect: "boost_def" },
      { name: "Sandtrap", cost: 2, baseDamage: 26, effect: "status_isolated" }
    ]
  },
  {
    id: "antivirus-9",
    name: "Antivirus",
    domain: "Purity",
    affinity: "Purge",
    temperament: "Zealous",
    rarity: "Common",
    variant: "Standard",
    coreTrait: "Purge Lance",
    passiveModule: "Cleanse Circuit",
    stats: { hp: 108, atk: 5, def: 6, spd: 5 },
    hp: 108,
    maxHp: 108,
    atk: 5,
    def: 6,
    spd: 5,
    color: "#ff2233",
    statusEffects: [],
    summary: "A cleansing warrior that burns corruption out of the frame.",
    moveList: [
      { name: "Signature Sweep", power: 16, accuracy: 100, uses: "∞", effect: "cleanse" },
      { name: "Rapid Scan", power: 22, accuracy: 95, uses: "∞", effect: "status_detected" },
      { name: "Kernel Purge", power: 30, accuracy: 90, uses: "∞", effect: "cleanse" }
    ],
    abilities: [
      { name: "Signature Sweep", cost: 0, baseDamage: 16, effect: "cleanse" },
      { name: "Rapid Scan", cost: 1, baseDamage: 22, effect: "status_detected" },
      { name: "Kernel Purge", cost: 2, baseDamage: 30, effect: "cleanse" }
    ]
  },
  {
    id: "antivirus-2",
    name: "Purity Antivirus",
    domain: "Purity",
    affinity: "Purge",
    temperament: "Righteous",
    rarity: "Uncommon",
    variant: "Standard",
    coreTrait: "Radiant Cleave",
    passiveModule: "Sanctify Loop",
    stats: { hp: 112, atk: 6, def: 6, spd: 6 },
    hp: 112,
    maxHp: 112,
    atk: 6,
    def: 6,
    spd: 6,
    color: "#ff6677",
    statusEffects: [],
    summary: "A brighter purifier that cuts deeper into hostile code.",
    moveList: [
      { name: "Signature Sweep", power: 17, accuracy: 100, uses: "∞", effect: "cleanse" },
      { name: "Rapid Scan", power: 22, accuracy: 95, uses: "∞", effect: "status_detected" },
      { name: "Kernel Purge", power: 31, accuracy: 90, uses: "∞", effect: "cleanse" }
    ],
    abilities: [
      { name: "Signature Sweep", cost: 0, baseDamage: 16, effect: "cleanse" },
      { name: "Rapid Scan", cost: 1, baseDamage: 22, effect: "status_detected" },
      { name: "Kernel Purge", cost: 2, baseDamage: 30, effect: "cleanse" }
    ]
  }
];

// defenderSaveState stores the long-term roster data that should survive refreshes and future phases.
let defenderSaveState = null;

// defenderSelectionDraft tracks the starter party the player is editing before they lock it in.
let defenderSelectionDraft = [];

// defenderScreenContent is the dynamic container for the starter-selection screen.
const defenderScreen = document.getElementById("defender-screen");
const defenderScreenContent = document.getElementById("defender-screen-content");
const defenderSetupButton = document.getElementById("defender-setup-button");

// getDefaultStarterDefenderIds() returns the canonical four-defender loadout used when no save exists yet.
function getDefaultStarterDefenderIds() {
  return ["firewall-7", "ids-4", "honeypot-3", "antivirus-9"];
}

// cloneDefenderBlueprint() creates a deep copy so roster edits never mutate the catalog entries.
function cloneDefenderBlueprint(defender) {
  return JSON.parse(JSON.stringify(defender));
}

// createDefaultDefenderSave() builds the initial localStorage payload for the new progression layer.
function createDefaultDefenderSave() {
  return {
    version: 1,
    selectedStarterIds: getDefaultStarterDefenderIds(),
    unlockedDefenderIds: defenderCatalog.map((defender) => defender.id),
    capturedThreatIds: [],
    discoveredVariants: [],
    currentRun: {
      active: false,
      startedAt: null,
      endedAt: null,
      starterLoadoutIds: [],
      clearedThreatIds: [],
      capturedThreatIds: [],
      discoveredVariants: []
    }
  };
}

// normalizeStarterSelection() filters, de-duplicates, and pads a starter selection to four defenders.
function normalizeStarterSelection(defenderIds = []) {
  const uniqueIds = [];
  defenderIds.forEach((defenderId) => {
    if (!uniqueIds.includes(defenderId) && defenderCatalog.some((defender) => defender.id === defenderId)) {
      uniqueIds.push(defenderId);
    }
  });

  getDefaultStarterDefenderIds().forEach((fallbackId) => {
    if (uniqueIds.length < 4 && !uniqueIds.includes(fallbackId)) {
      uniqueIds.push(fallbackId);
    }
  });

  return uniqueIds.slice(0, 4);
}

// normalizeDefenderSave() guards against old or malformed save payloads before they reach the menu.
function normalizeDefenderSave(saveData) {
  const fallback = createDefaultDefenderSave();
  const source = saveData && typeof saveData === "object" ? saveData : {};
  const currentRunSource = source.currentRun && typeof source.currentRun === "object" ? source.currentRun : {};

  return {
    version: fallback.version,
    selectedStarterIds: normalizeStarterSelection(Array.isArray(source.selectedStarterIds) ? source.selectedStarterIds : fallback.selectedStarterIds),
    unlockedDefenderIds: Array.isArray(source.unlockedDefenderIds) && source.unlockedDefenderIds.length
      ? source.unlockedDefenderIds.filter((defenderId) => defenderCatalog.some((defender) => defender.id === defenderId))
      : fallback.unlockedDefenderIds.slice(),
    capturedThreatIds: Array.isArray(source.capturedThreatIds) ? source.capturedThreatIds.slice() : [],
    discoveredVariants: Array.isArray(source.discoveredVariants) ? source.discoveredVariants.slice() : [],
    currentRun: {
      ...fallback.currentRun,
      ...currentRunSource,
      starterLoadoutIds: Array.isArray(currentRunSource.starterLoadoutIds) ? currentRunSource.starterLoadoutIds.slice() : fallback.currentRun.starterLoadoutIds.slice(),
      clearedThreatIds: Array.isArray(currentRunSource.clearedThreatIds) ? currentRunSource.clearedThreatIds.slice() : fallback.currentRun.clearedThreatIds.slice(),
      capturedThreatIds: Array.isArray(currentRunSource.capturedThreatIds) ? currentRunSource.capturedThreatIds.slice() : fallback.currentRun.capturedThreatIds.slice(),
      discoveredVariants: Array.isArray(currentRunSource.discoveredVariants) ? currentRunSource.discoveredVariants.slice() : fallback.currentRun.discoveredVariants.slice()
    }
  };
}

// loadDefenderSave() reads the saved roster state from localStorage and falls back to defaults when needed.
function loadDefenderSave() {
  let parsedSave = null;

  try {
    const stored = window.localStorage.getItem(DEFENDER_SAVE_KEY);
    parsedSave = stored ? JSON.parse(stored) : null;
  } catch (error) {
    parsedSave = null;
  }

  defenderSaveState = normalizeDefenderSave(parsedSave);
  return defenderSaveState;
}

// persistDefenderSave() writes the current defender save payload back to localStorage.
function persistDefenderSave() {
  if (!defenderSaveState) {
    defenderSaveState = createDefaultDefenderSave();
  }

  try {
    window.localStorage.setItem(DEFENDER_SAVE_KEY, JSON.stringify(defenderSaveState));
  } catch (error) {
    // Saving is best-effort only, so the game keeps working even when storage is unavailable.
  }
}

// getDefenderTemplate() looks up a catalog entry by id so the selected party can be cloned later.
function getDefenderTemplate(defenderId) {
  return defenderCatalog.find((defender) => defender.id === defenderId) || null;
}

// getSelectedStarterIds() returns the active four-defender starter set from the current save state.
function getSelectedStarterIds() {
  if (!defenderSaveState) {
    loadDefenderSave();
  }

  return defenderSaveState.selectedStarterIds.slice();
}

// applySelectedDefenderRoster() copies the saved starter selection into the live party and reset templates.
function applySelectedDefenderRoster() {
  if (!defenderSaveState) {
    loadDefenderSave();
  }

  const selectedIds = normalizeStarterSelection(defenderSaveState.selectedStarterIds);
  const selectedTemplates = selectedIds.map((defenderId) => cloneDefenderBlueprint(getDefenderTemplate(defenderId) || getDefenderTemplate(getDefaultStarterDefenderIds()[0])));

  selectedTemplates.forEach((template, index) => {
    Object.assign(programs[index], cloneDefenderBlueprint(template));
    Object.assign(defaultPrograms[index], cloneDefenderBlueprint(template));
  });

  defenderSelectionDraft = selectedIds.slice();
  defenderSaveState.selectedStarterIds = selectedIds.slice();
  persistDefenderSave();
  return selectedIds;
}

// markDefenderRunStarted() stores a minimal run header so the save knows a deployment is in progress.
function markDefenderRunStarted() {
  if (!defenderSaveState) {
    loadDefenderSave();
  }

  defenderSaveState.currentRun = {
    ...createDefaultDefenderSave().currentRun,
    active: true,
    startedAt: Date.now(),
    endedAt: null,
    starterLoadoutIds: defenderSaveState.selectedStarterIds.slice()
  };
  persistDefenderSave();
}

// markDefenderRunEnded() clears the active flag so the save returns to a menu-safe state.
function markDefenderRunEnded() {
  if (!defenderSaveState) {
    loadDefenderSave();
  }

  defenderSaveState.currentRun = {
    ...createDefaultDefenderSave().currentRun,
    active: false,
    endedAt: Date.now(),
    starterLoadoutIds: defenderSaveState.selectedStarterIds.slice()
  };
  persistDefenderSave();
}

// setDefenderSelectionDraft() replaces the in-progress starter lineup without auto-padding it back to four.
function setDefenderSelectionDraft(nextDraft) {
  defenderSelectionDraft = [];
  nextDraft.forEach((defenderId) => {
    if (
      defenderCatalog.some((defender) => defender.id === defenderId) &&
      !defenderSelectionDraft.includes(defenderId) &&
      defenderSelectionDraft.length < 4
    ) {
      defenderSelectionDraft.push(defenderId);
    }
  });
  renderDefenderSelectionScreen();
}

// toggleDefenderSelection() adds or removes a defender from the in-progress four-slot starter lineup.
function toggleDefenderSelection(defenderId) {
  if (!defenderSaveState) {
    loadDefenderSave();
  }

  const nextDraft = defenderSelectionDraft.slice();
  const existingIndex = nextDraft.indexOf(defenderId);

  if (existingIndex !== -1) {
    nextDraft.splice(existingIndex, 1);
    setDefenderSelectionDraft(nextDraft);
    return;
  }

  if (nextDraft.length >= 4) {
    const statusNode = document.getElementById("defender-selection-status");
    if (statusNode) {
      statusNode.textContent = "SELECT FOUR DEFENDERS OR REMOVE ONE TO SWAP.";
    }
    return;
  }

  nextDraft.push(defenderId);
  setDefenderSelectionDraft(nextDraft);
}

// buildDefenderCardMarkup() renders one selection card with its identity, stats, and starter metadata.
function buildDefenderCardMarkup(defender, isSelected, isLocked) {
  const movePreview = defender.moveList.slice(0, 2).map((move) => `<span class="defender-move">${move.name}</span>`).join("");

  return `
    <button
      class="defender-card ${isSelected ? "is-selected" : ""} ${isLocked ? "is-locked" : ""}"
      type="button"
      data-defender-id="${defender.id}"
      aria-pressed="${isSelected ? "true" : "false"}"
      ${isLocked ? "disabled" : ""}
    >
      <div class="defender-card-head">
        <div>
          <div class="defender-card-name">${defender.name}</div>
          <div class="defender-card-domain">${defender.domain} / ${defender.affinity}</div>
        </div>
        <div class="defender-card-rarity">${defender.rarity}</div>
      </div>
      <div class="defender-card-summary">${defender.summary}</div>
      <div class="defender-card-meta">
        <span>CORE TRAIT: ${defender.coreTrait}</span>
        <span>PASSIVE: ${defender.passiveModule}</span>
        <span>TEMPERAMENT: ${defender.temperament}</span>
      </div>
      <div class="defender-card-stats">
        <span>HP ${defender.hp}</span>
        <span>ATK ${defender.atk}</span>
        <span>DEF ${defender.def}</span>
        <span>SPD ${defender.spd}</span>
      </div>
      <div class="defender-card-moves">${movePreview}</div>
      <div class="defender-card-foot">
        <span>${isSelected ? "LOCKED INTO LOADOUT" : "TAP TO ADD TO LOADOUT"}</span>
        <span>${defender.variant} / LVL 1</span>
      </div>
    </button>
  `;
}

// buildDefenderSelectionMarkup() assembles the starter lineup screen and the current draft loadout summary.
function buildDefenderSelectionMarkup() {
  const selectedIds = defenderSelectionDraft.slice();

  return `
    <div class="defender-shell">
      <div class="defender-header">
        <div>
          <h2 class="briefing-title">STARTER LINEUP</h2>
          <p class="briefing-copy defender-copy">CHOOSE FOUR ORIGINAL DEFENDERS TO SEED YOUR NEXT RUN. THE LOADOUT SAVES LOCALLY.</p>
        </div>
        <button id="defender-screen-back" class="back-button" type="button">← RETURN TO MENU</button>
      </div>

      <div class="defender-rule" aria-hidden="true"></div>

      <div class="defender-status-row">
        <div id="defender-selection-count" class="defender-selection-count">0 / 4 SELECTED</div>
        <div id="defender-selection-status" class="defender-selection-status">SELECT A PARTY OF FOUR.</div>
      </div>

      <div class="defender-grid">
        ${defenderCatalog.map((defender) => {
          const isSelected = selectedIds.includes(defender.id);
          const isLocked = !defenderSaveState.unlockedDefenderIds.includes(defender.id);
          return buildDefenderCardMarkup(defender, isSelected, isLocked);
        }).join("")}
      </div>

      <div class="defender-footer">
        <button id="defender-screen-reset" class="menu-button" type="button">RESET LOADOUT</button>
        <button id="defender-screen-confirm" class="menu-button" type="button" ${selectedIds.length === 4 ? "" : "disabled"}>LOCK IN LOADOUT</button>
      </div>
    </div>
  `;
}

// bindDefenderSelectionControls() wires the selection cards and footer buttons after the screen is rendered.
function bindDefenderSelectionControls() {
  const defenderSelectionCount = document.getElementById("defender-selection-count");
  const defenderSelectionStatus = document.getElementById("defender-selection-status");
  const defenderScreenConfirm = document.getElementById("defender-screen-confirm");
  const defenderScreenReset = document.getElementById("defender-screen-reset");
  const defenderScreenBack = document.getElementById("defender-screen-back");

  const selectionCards = defenderScreenContent.querySelectorAll("[data-defender-id]");
  selectionCards.forEach((card) => {
    card.addEventListener("click", () => {
      toggleDefenderSelection(card.getAttribute("data-defender-id"));
    });
  });

  if (defenderScreenBack) {
    defenderScreenBack.addEventListener("click", () => {
      showMenu();
    });
  }

  if (defenderScreenReset) {
    defenderScreenReset.addEventListener("click", () => {
      setDefenderSelectionDraft(getDefaultStarterDefenderIds());
      const statusNode = document.getElementById("defender-selection-status");
      if (statusNode) {
        statusNode.textContent = "DEFAULT PARTY RESTORED.";
      }
    });
  }

  if (defenderScreenConfirm) {
    defenderScreenConfirm.addEventListener("click", () => {
      if (defenderSelectionDraft.length !== 4) {
        const statusNode = document.getElementById("defender-selection-status");
        if (statusNode) {
          statusNode.textContent = "LOCK IN FOUR DEFENDERS BEFORE RETURNING TO THE MENU.";
        }
        return;
      }

      defenderSaveState.selectedStarterIds = defenderSelectionDraft.slice(0, 4);
      persistDefenderSave();
      applySelectedDefenderRoster();
      showMenu();
    });
  }
}

// renderDefenderSelectionScreen() redraws the loadout editor and keeps the counter/status text current.
function renderDefenderSelectionScreen() {
  if (!defenderScreenContent) {
    return;
  }

  defenderScreenContent.innerHTML = buildDefenderSelectionMarkup();
  const defenderSelectionCount = document.getElementById("defender-selection-count");
  const defenderSelectionStatus = document.getElementById("defender-selection-status");

  if (defenderSelectionCount) {
    defenderSelectionCount.textContent = `${defenderSelectionDraft.length} / 4 SELECTED`;
  }

  if (defenderSelectionStatus) {
    defenderSelectionStatus.textContent = defenderSelectionDraft.length === 4
    ? "LOADOUT READY. LOCK IT IN OR RETURN TO MENU."
    : "SELECT A PARTY OF FOUR.";
  }

  bindDefenderSelectionControls();
}

// showDefenderSelectionScreen() opens the starter setup screen inside the shared boot overlay.
function showDefenderSelectionScreen() {
  if (!defenderSaveState) {
    loadDefenderSave();
  }

  bootOverlay.style.display = "block";
  bootOverlay.classList.remove("is-hiding");
  setScreen("defenders");
  defenderSelectionDraft = defenderSaveState.selectedStarterIds.slice();
  renderDefenderSelectionScreen();
}

// initDefenderSystem() loads save data immediately so the selected loadout is active before the first run.
function initDefenderSystem() {
  loadDefenderSave();
  applySelectedDefenderRoster();
}

initDefenderSystem();
