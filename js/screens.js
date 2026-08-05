/* Screen-state and mode-selection behavior for THREATGRID's menu, briefing, and gameplay transitions. */
// screenState controls which overlay is visible: menu, briefing, defender setup, gameplay, combat, world-city, or the end-state branch.
let screenState = "menu"; // 'menu' | 'howtoplay' | 'defenders' | 'expedition-loadout' | 'forge' | 'game' | 'world-city' | 'combat' | 'game-over'
let globeStarted = false;
window.screenState = screenState;

// gameMode is chosen before the game starts so later UI logic knows whether to show passive or typed actions.
let gameMode = "analyst"; // 'analyst' | 'operator'

// DOM references let the screen functions switch overlays without recreating elements.
const bootOverlay = document.getElementById("boot-overlay");
const menuScreen = document.getElementById("menu-screen");
const howtoScreen = document.getElementById("howto-screen");
const defenderScreen = document.getElementById("defender-screen");
const worldCityScreen = document.getElementById("world-city-screen");
const worldCityContent = document.getElementById("world-city-content");
const analystModeButton = document.getElementById("analyst-mode-button");
const operatorModeButton = document.getElementById("operator-mode-button");
const defenderSetupButton = document.getElementById("defender-setup-button");
const howtoButton = document.getElementById("howto-button");
const audioSettingsButton = document.getElementById("audio-settings-button");
const audioSettingsPanel = document.getElementById("audio-settings-panel");
const audioSettingsCloseButton = document.getElementById("audio-settings-close-button");
const audioMutedToggle = document.getElementById("audio-muted-toggle");
const audioMutedValue = document.getElementById("audio-muted-value");
const audioMasterVolume = document.getElementById("audio-master-volume");
const audioMasterValue = document.getElementById("audio-master-value");
const audioMusicVolume = document.getElementById("audio-music-volume");
const audioMusicValue = document.getElementById("audio-music-value");
const audioSfxVolume = document.getElementById("audio-sfx-volume");
const audioSfxValue = document.getElementById("audio-sfx-value");
const backButton = document.getElementById("back-button");
const returnButton = document.getElementById("return-button");
const hudMenuButton = document.getElementById("hud-menu-button");
const expeditionLoadoutButton = document.getElementById("expedition-loadout-button");
const menuModeDescription = document.getElementById("menu-mode-description");

// The mode descriptions explain the two start paths without adding another full menu screen.
const modeDescriptionLookup = {
  analyst: "OBSERVE AND DIRECT — NO TYPING REQUIRED",
  operator: "TYPE COMMANDS YOURSELF — HINTS AVAILABLE"
};

const audioSettingsFallback = {
  master: 0.78,
  music: 0.68,
  sfx: 0.82,
  muted: false
};

// The menu button uses a two-step confirm pattern so players do not exit the mission by accident.
let menuExitConfirmArmed = false;
let menuExitTimerId = null;

// updateHudMenuButton() keeps the HUD label in sync with whether exit confirmation is armed.
function updateHudMenuButton() {
  hudMenuButton.textContent = menuExitConfirmArmed ? "[ CONFIRM? ]" : "[ MENU ]";
}

// updateModeDescription() swaps the one-line menu help text to match the hovered or selected mode.
function updateModeDescription(mode) {
  menuModeDescription.textContent = modeDescriptionLookup[mode] || modeDescriptionLookup.analyst;
}

// setGameMode() stores the chosen mode before the game boots so the panel logic can render the right controls immediately.
function setGameMode(mode) {
  gameMode = mode;
  updateModeDescription(mode);
}

// clearMenuExitConfirm() resets the exit guard and cancels any pending timer.
function clearMenuExitConfirm() {
  menuExitConfirmArmed = false;
  if (menuExitTimerId !== null) {
    window.clearTimeout(menuExitTimerId);
    menuExitTimerId = null;
  }
  updateHudMenuButton();
}

function routeAudioScreen(nextScreen) {
  if (typeof window !== "undefined" && window.THREATGRID_AUDIO && typeof window.THREATGRID_AUDIO.setScreen === "function") {
    window.THREATGRID_AUDIO.setScreen(nextScreen === "world-city" ? "game" : nextScreen);
  }
}

function getAudioManagerSettings() {
  const audioManager = typeof window !== "undefined" ? window.THREATGRID_AUDIO : null;
  if (audioManager && typeof audioManager.getSettings === "function") {
    return { ...audioSettingsFallback, ...audioManager.getSettings() };
  }

  const debugState = audioManager && typeof audioManager.getDebugState === "function" ? audioManager.getDebugState() : null;
  return {
    ...audioSettingsFallback,
    ...(debugState?.volumes || {}),
    muted: Boolean(debugState?.muted)
  };
}

function formatAudioPercent(value) {
  return `${Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100)}%`;
}

function setAudioSliderState(input, output, value) {
  if (!input || !output) {
    return;
  }

  const normalizedValue = Math.max(0, Math.min(1, Number(value) || 0));
  input.value = String(Math.round(normalizedValue * 100));
  output.textContent = formatAudioPercent(normalizedValue);
}

function renderAudioSettingsControls() {
  const settings = getAudioManagerSettings();
  if (audioMutedToggle) {
    audioMutedToggle.checked = Boolean(settings.muted);
  }
  if (audioMutedValue) {
    audioMutedValue.textContent = settings.muted ? "ON" : "OFF";
  }

  setAudioSliderState(audioMasterVolume, audioMasterValue, settings.master);
  setAudioSliderState(audioMusicVolume, audioMusicValue, settings.music);
  setAudioSliderState(audioSfxVolume, audioSfxValue, settings.sfx);
}

function openAudioSettingsPanel() {
  if (!audioSettingsPanel) {
    return;
  }

  renderAudioSettingsControls();
  audioSettingsPanel.classList.add("is-open");
  audioSettingsPanel.setAttribute("aria-hidden", "false");
  audioSettingsCloseButton?.focus();
}

function closeAudioSettingsPanel() {
  if (!audioSettingsPanel) {
    return;
  }

  const wasOpen = audioSettingsPanel.classList.contains("is-open");
  audioSettingsPanel.classList.remove("is-open");
  audioSettingsPanel.setAttribute("aria-hidden", "true");
  if (wasOpen) {
    audioSettingsButton?.focus();
  }
}

function setAudioVolumeFromInput(group, input, output) {
  if (!input || !output) {
    return;
  }

  const normalizedValue = Math.max(0, Math.min(1, Number(input.value) / 100));
  output.textContent = formatAudioPercent(normalizedValue);
  if (typeof window === "undefined" || !window.THREATGRID_AUDIO) {
    return;
  }

  window.THREATGRID_AUDIO.setVolume(group, normalizedValue);
  if (group === "music") {
    window.THREATGRID_AUDIO.setVolume("ambience", normalizedValue);
  }
}

function setAudioMutedFromInput() {
  if (!audioMutedToggle) {
    return;
  }

  if (audioMutedValue) {
    audioMutedValue.textContent = audioMutedToggle.checked ? "ON" : "OFF";
  }
  if (typeof window === "undefined" || !window.THREATGRID_AUDIO) {
    return;
  }

  window.THREATGRID_AUDIO.setMuted(audioMutedToggle.checked);
}

// setScreen() toggles which overlay panel is active inside the shared boot screen.
function setScreen(nextScreen) {
  const previousScreen = screenState;
  screenState = nextScreen;
  window.screenState = nextScreen;
  menuScreen.classList.toggle("is-active", nextScreen === "menu");
  howtoScreen.classList.toggle("is-active", nextScreen === "howtoplay");
  if (worldCityScreen) {
    worldCityScreen.classList.toggle("is-active", nextScreen === "world-city");
  }
  if (defenderScreen) {
    defenderScreen.classList.toggle("is-active", nextScreen === "defenders" || nextScreen === "expedition-loadout" || nextScreen === "forge");
  }
  if (previousScreen === "world-city" && nextScreen !== "world-city") {
    destroyWorldCityScreen();
  }
  routeAudioScreen(nextScreen);
}

// showMenu() restores the main menu and keeps the overlay visible.
function showMenu() {
  bootOverlay.style.display = "block";
  bootOverlay.classList.remove("is-hiding");
  setScreen("menu");
  closeAudioSettingsPanel();
  if (typeof closeThreatPanel === "function") {
    closeThreatPanel(true);
  }
  updateModeDescription(gameMode);
}

// showHowToPlay() crossfades to the briefing screen without touching the globe logic.
function showHowToPlay() {
  bootOverlay.style.display = "block";
  bootOverlay.classList.remove("is-hiding");
  setScreen("howtoplay");
}

// showDefenderSelection() opens the starter lineup editor without starting a run yet.
function showDefenderSelection() {
  bootOverlay.style.display = "block";
  bootOverlay.classList.remove("is-hiding");
  setScreen("defenders");
  if (typeof getSelectedDefenderIds === "function") {
    defenderSelectionDraft = getSelectedDefenderIds();
  }
  if (typeof renderDefenderSelectionScreen === "function") {
    renderDefenderSelectionScreen();
  }
}

// showExpeditionLoadout() reuses the RPG loadout shell as a read-only between-battle overlay.
function showExpeditionLoadout() {
  if (typeof combatState !== "undefined" && combatState) {
    return;
  }

  bootOverlay.style.display = "block";
  bootOverlay.classList.remove("is-hiding");
  setScreen("expedition-loadout");
  if (typeof renderExpeditionLoadoutScreen === "function") {
    renderExpeditionLoadoutScreen();
  }
}

// closeExpeditionLoadout() returns to the already-running globe without resetting currentRun or nodes.
function closeExpeditionLoadout() {
  if (screenState !== "expedition-loadout") {
    return;
  }

  setScreen("game");
  bootOverlay.classList.add("is-hiding");
  window.setTimeout(() => {
    if (screenState === "game") {
      bootOverlay.style.display = "none";
    }
  }, 150);
}

function showForgeScreen() {
  if (typeof combatState !== "undefined" && combatState) {
    return;
  }

  if (typeof window !== "undefined" && window.THREATGRID_FORGE_DEBUG === true) {
    console.info("[FORGE DEBUG] showForgeScreen called");
    console.info("[FORGE DEBUG] screenState before", screenState);
  }
  bootOverlay.style.display = "block";
  bootOverlay.classList.remove("is-hiding");
  setScreen("forge");
  if (typeof renderForgeScreen === "function") {
    renderForgeScreen();
  } else if (typeof window !== "undefined" && typeof window.renderForgeScreen === "function") {
    window.renderForgeScreen();
  }
  if (typeof window !== "undefined" && window.THREATGRID_FORGE_DEBUG === true) {
    console.info("[FORGE DEBUG] screenState after", screenState);
  }
}

function destroyWorldCityScreen() {
  if (typeof window !== "undefined" && typeof window.destroyCityIncidentScene === "function") {
    window.destroyCityIncidentScene();
  }
  if (typeof window !== "undefined" && window.THREATGRID_WORLD_MAP_UI) {
    window.THREATGRID_WORLD_MAP_UI.hideWorldCityHologram?.();
  }
}

function handleWorldCityIncidentHover(incident, event) {
  if (screenState !== "world-city") {
    return;
  }

  window.THREATGRID_WORLD_STATE?.setHover?.(incident?.id || "");
  window.THREATGRID_WORLD_MAP_UI?.showWorldCityHologram?.(incident, event);
}

function handleWorldCityIncidentLeave() {
  if (screenState !== "world-city") {
    return;
  }

  window.THREATGRID_WORLD_STATE?.setHover?.("");
  window.THREATGRID_WORLD_MAP_UI?.hideWorldCityHologram?.();
}

function findWorldCityCombatThreat(incident) {
  if (window.THREATGRID_WORLD_DATA?.findCombatThreatForWorldIncident) {
    return window.THREATGRID_WORLD_DATA.findCombatThreatForWorldIncident(incident);
  }

  if (!incident?.combatThreatId || !Array.isArray(threats)) {
    return null;
  }

  return threats.find((threat) => threat?.id === incident.combatThreatId) || null;
}

function enterWorldCityIncidentCombat(incident) {
  if (screenState !== "world-city" || !incident) {
    return false;
  }

  const threat = findWorldCityCombatThreat(incident);
  if (!threat || threat.status !== "active") {
    window.THREATGRID_WORLD_MAP_UI?.setWorldCityActionMessage?.("Incident route unavailable. Combat threat is not active.", "warning");
    return false;
  }

  window.THREATGRID_WORLD_STATE?.setSelection?.(incident.id);
  destroyWorldCityScreen();
  setScreen("game");
  bootOverlay.classList.add("is-hiding");
  window.setTimeout(() => {
    if (screenState === "game") {
      bootOverlay.style.display = "none";
    }
  }, 150);

  if (typeof startCombatEncounter === "function") {
    startCombatEncounter(threat);
    return true;
  }

  window.THREATGRID_WORLD_MAP_UI?.setWorldCityActionMessage?.("Combat route unavailable. Existing combat entry path was not found.", "warning");
  return false;
}

function handleWorldCityIncidentSelect(incident) {
  if (screenState !== "world-city" || !incident) {
    return false;
  }

  window.THREATGRID_WORLD_STATE?.setSelection?.(incident.id);
  if (!incident.combatThreatId) {
    window.THREATGRID_WORLD_MAP_UI?.setWorldCityActionMessage?.(`${incident.title}: recon node only in this MVP.`, "info");
    return false;
  }

  return enterWorldCityIncidentCombat(incident);
}

function renderWorldCityScreen(cityData) {
  if (!worldCityContent || !window.THREATGRID_WORLD_MAP_UI) {
    return false;
  }

  worldCityContent.innerHTML = window.THREATGRID_WORLD_MAP_UI.buildWorldCityScreenMarkup(cityData);
  worldCityContent.querySelector("[data-world-city-return]")?.addEventListener("click", closeWorldCityScreen);
  const mount = worldCityContent.querySelector("[data-world-city-scene]");
  const mounted = typeof window.mountCityIncidentScene === "function"
    ? window.mountCityIncidentScene(mount, cityData, {
      onIncidentHover: handleWorldCityIncidentHover,
      onIncidentLeave: handleWorldCityIncidentLeave,
      onIncidentSelect: handleWorldCityIncidentSelect
    })
    : false;

  window.THREATGRID_WORLD_MAP_UI.setWorldCityActionMessage(
    mounted ? "Hover an incident ring to inspect the local breach." : "City incident renderer unavailable.",
    mounted ? "" : "warning"
  );
  return mounted;
}

function showWorldCityScreen(cityKey = "hospital-lockout", options = {}) {
  if (typeof combatState !== "undefined" && combatState) {
    return { ok: false, reason: "Combat is active." };
  }

  const dependenciesReady = Boolean(
    window.THREATGRID_WORLD_DATA?.getWorldCityLayer
    && window.THREATGRID_WORLD_MAP_UI?.buildWorldCityScreenMarkup
    && typeof window.mountCityIncidentScene === "function"
  );
  if (!dependenciesReady) {
    const reason = "World-city modules are not ready. Refresh with cache disabled or verify world script loading.";
    console.warn("[WorldCity]", reason, {
      data: Boolean(window.THREATGRID_WORLD_DATA?.getWorldCityLayer),
      ui: Boolean(window.THREATGRID_WORLD_MAP_UI?.buildWorldCityScreenMarkup),
      scene: typeof window.mountCityIncidentScene === "function"
    });
    return { ok: false, reason };
  }

  const cityData = window.THREATGRID_WORLD_DATA?.getWorldCityLayer?.(cityKey);
  if (!cityData) {
    const reason = `Unknown city layer: ${cityKey}`;
    console.warn("[WorldCity]", reason);
    return { ok: false, reason };
  }

  bootOverlay.style.display = "block";
  bootOverlay.classList.remove("is-hiding");
  window.THREATGRID_WORLD_STATE?.setCity?.(cityData.cityKey, {
    returnTarget: options.returnTarget || "game",
    entrySource: options.entrySource || "",
    sourceThreatId: options.sourceThreatId || ""
  });
  setScreen("world-city");
  const mounted = renderWorldCityScreen(cityData);
  const debug = window.getCityIncidentSceneDebugState?.() || {};
  if (!mounted) {
    const reason = debug.lastError || "City incident scene failed to mount.";
    console.warn("[WorldCity]", reason, debug);
    return { ok: false, reason, ...debug };
  }

  return {
    ok: true,
    screen: "world-city",
    currentCityKey: cityData.cityKey,
    mounted: Boolean(debug.mounted),
    canvasCount: debug.canvasCount || 0,
    incidentNodeCount: debug.incidentNodeCount || 0,
    returnTarget: window.THREATGRID_WORLD_STATE?.getDebugState?.().returnTarget || options.returnTarget || "game",
    entrySource: window.THREATGRID_WORLD_STATE?.getDebugState?.().entrySource || options.entrySource || "",
    sourceThreatId: window.THREATGRID_WORLD_STATE?.getDebugState?.().sourceThreatId || options.sourceThreatId || "",
    lastError: debug.lastError || ""
  };
}

function closeWorldCityScreen() {
  if (screenState !== "world-city") {
    return;
  }

  const returnTarget = window.THREATGRID_WORLD_STATE?.getDebugState?.().returnTarget || "game";
  window.THREATGRID_WORLD_STATE?.clear?.();

  if (returnTarget === "menu" || !globeStarted) {
    showMenu();
    return;
  }

  setScreen("game");
  bootOverlay.classList.add("is-hiding");
  window.setTimeout(() => {
    if (screenState === "game") {
      bootOverlay.style.display = "none";
    }
  }, 150);
}

function closeForgeScreen() {
  if (screenState !== "forge") {
    return;
  }

  setScreen("expedition-loadout");
  if (typeof renderExpeditionLoadoutScreen === "function") {
    renderExpeditionLoadoutScreen();
  }
}

function restoreExpeditionPartyFromHud() {
  if (typeof combatState !== "undefined" && combatState) {
    return;
  }

  if (typeof healProgramRoster === "function") {
    healProgramRoster();
  }

  if (typeof addBattleLog === "function") {
    addBattleLog("EXPEDITION PARTY RESTORED TO FULL CAPACITY.", "buff");
  }

  if (typeof updateScoreDisplay === "function") {
    updateScoreDisplay();
  }
}

// startGame() resets the run, fades the overlay out, and boots the globe exactly once.
function startGame() {
  if (typeof resetRunState === "function") {
    resetRunState();
  }

  screenState = "game";
  window.screenState = "game";
  routeAudioScreen("game");
  // The globe rotates again as the game begins, so the background motion resumes before the fade ends.
  globe.autoRotateSpeed = 0.0012;
  clearMenuExitConfirm();
  bootOverlay.classList.add("is-hiding");

  if (!globeStarted) {
    globeStarted = true;
    globe.init();
    wireThreatResponses();
    if (typeof installWorldCityGlobeRouting === "function") {
      installWorldCityGlobeRouting();
    }
  } else if (typeof startRespawnInterval === "function") {
    startRespawnInterval();
  }

  // The delayed hide gives the fade-out time to finish before the overlay stops intercepting input.
  window.setTimeout(() => {
    if (screenState === "game") {
      bootOverlay.style.display = "none";
    }
  }, 600);
}

// requestReturnToMenu() handles the HUD button's two-step exit flow and only returns after confirmation.
function requestReturnToMenu() {
  if (menuExitConfirmArmed) {
    // A second click inside the window confirms the exit and freezes the globe behind the overlay.
    clearMenuExitConfirm();
    globe.autoRotateSpeed = 0;
    // The threat panel is also closed so the menu overlay returns to a clean boot state.
    if (typeof closeThreatPanel === "function") {
      closeThreatPanel(true);
    }
    showMenu();
    return;
  }

  // The first click arms the confirm state and starts a short timeout to cancel it automatically.
  menuExitConfirmArmed = true;
  updateHudMenuButton();

  menuExitTimerId = window.setTimeout(() => {
    // If the player does not confirm quickly, the HUD button returns to its normal label.
    clearMenuExitConfirm();
  }, 3000);
}

// Hover previews let the player compare both modes before actually committing to a start button.
analystModeButton.addEventListener("mouseenter", () => updateModeDescription("analyst"));
operatorModeButton.addEventListener("mouseenter", () => updateModeDescription("operator"));
analystModeButton.addEventListener("mouseleave", () => updateModeDescription(gameMode));
operatorModeButton.addEventListener("mouseleave", () => updateModeDescription(gameMode));

// The remaining buttons switch between the informational screens, and the HUD exit button returns to the menu.
howtoButton.addEventListener("click", showHowToPlay);
audioSettingsButton?.addEventListener("click", openAudioSettingsPanel);
audioSettingsCloseButton?.addEventListener("click", closeAudioSettingsPanel);
defenderSetupButton.addEventListener("click", showDefenderSelection);
backButton.addEventListener("click", showMenu);
returnButton.addEventListener("click", showMenu);
hudMenuButton.addEventListener("click", requestReturnToMenu);
console.info("[HUD BIND] loadout", Boolean(expeditionLoadoutButton));

if (expeditionLoadoutButton) {
  expeditionLoadoutButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    console.info("[HUD] LOADOUT / MODULES clicked");
    showExpeditionLoadout();
  });
}

// Mode selection now opens the starter lineup screen before the run begins.
analystModeButton.addEventListener("click", () => {
  setGameMode("analyst");
  showDefenderSelection();
});

operatorModeButton.addEventListener("click", () => {
  setGameMode("operator");
  showDefenderSelection();
});

audioMutedToggle?.addEventListener("change", setAudioMutedFromInput);
audioMasterVolume?.addEventListener("input", () => setAudioVolumeFromInput("master", audioMasterVolume, audioMasterValue));
audioMusicVolume?.addEventListener("input", () => setAudioVolumeFromInput("music", audioMusicVolume, audioMusicValue));
audioSfxVolume?.addEventListener("input", () => setAudioVolumeFromInput("sfx", audioSfxVolume, audioSfxValue));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && audioSettingsPanel?.classList.contains("is-open")) {
    closeAudioSettingsPanel();
  }
});

// Initialize the HUD exit button label and menu mode description so the boot screen starts fully populated.
updateHudMenuButton();
updateModeDescription(gameMode);
renderAudioSettingsControls();

// Exposes showMenu for older non-module game flow code that calls it from main.js.
window.showMenu = showMenu;
window.showExpeditionLoadout = showExpeditionLoadout;
window.closeExpeditionLoadout = closeExpeditionLoadout;
window.showForgeScreen = showForgeScreen;
window.closeForgeScreen = closeForgeScreen;
window.showWorldCityScreen = showWorldCityScreen;
window.closeWorldCityScreen = closeWorldCityScreen;
window.devOpenWorldCity = (cityKey = "hospital-lockout") => showWorldCityScreen(cityKey, {
  returnTarget: globeStarted ? "game" : "menu",
  entrySource: "dev-helper"
});
window.devReturnToWorldMap = closeWorldCityScreen;
window.devSelectIncidentNode = (incidentId = "hospital-main-lockout") => {
  const cityKey = window.THREATGRID_WORLD_STATE?.getDebugState?.().currentCityKey || "hospital-lockout";
  const incident = window.THREATGRID_WORLD_DATA?.getWorldCityIncident?.(cityKey, incidentId);
  return handleWorldCityIncidentSelect(incident);
};
window.devWorldState = () => window.THREATGRID_WORLD_STATE?.getDebugState?.() || {};
window.devRestoreParty = restoreExpeditionPartyFromHud;
