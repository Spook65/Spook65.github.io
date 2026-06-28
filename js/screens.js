/* Screen-state and mode-selection behavior for THREATGRID's menu, briefing, and gameplay transitions. */
// screenState controls which overlay is visible: menu, briefing, defender setup, gameplay, combat, or the end-state branch.
let screenState = "menu"; // 'menu' | 'howtoplay' | 'defenders' | 'expedition-loadout' | 'game' | 'combat' | 'game-over'
let globeStarted = false;

// gameMode is chosen before the game starts so later UI logic knows whether to show passive or typed actions.
let gameMode = "analyst"; // 'analyst' | 'operator'

// DOM references let the screen functions switch overlays without recreating elements.
const bootOverlay = document.getElementById("boot-overlay");
const menuScreen = document.getElementById("menu-screen");
const howtoScreen = document.getElementById("howto-screen");
const defenderScreen = document.getElementById("defender-screen");
const analystModeButton = document.getElementById("analyst-mode-button");
const operatorModeButton = document.getElementById("operator-mode-button");
const defenderSetupButton = document.getElementById("defender-setup-button");
const howtoButton = document.getElementById("howto-button");
const backButton = document.getElementById("back-button");
const returnButton = document.getElementById("return-button");
const hudMenuButton = document.getElementById("hud-menu-button");
const expeditionLoadoutButton = document.getElementById("expedition-loadout-button");
const expeditionFlagButton = document.getElementById("expedition-flag-button");
const menuModeDescription = document.getElementById("menu-mode-description");

// The mode descriptions explain the two start paths without adding another full menu screen.
const modeDescriptionLookup = {
  analyst: "OBSERVE AND DIRECT — NO TYPING REQUIRED",
  operator: "TYPE COMMANDS YOURSELF — HINTS AVAILABLE"
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

// setScreen() toggles which overlay panel is active inside the shared boot screen.
function setScreen(nextScreen) {
  screenState = nextScreen;
  menuScreen.classList.toggle("is-active", nextScreen === "menu");
  howtoScreen.classList.toggle("is-active", nextScreen === "howtoplay");
  if (defenderScreen) {
    defenderScreen.classList.toggle("is-active", nextScreen === "defenders" || nextScreen === "expedition-loadout");
  }
}

// showMenu() restores the main menu and keeps the overlay visible.
function showMenu() {
  bootOverlay.style.display = "block";
  bootOverlay.classList.remove("is-hiding");
  setScreen("menu");
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
  // The globe rotates again as the game begins, so the background motion resumes before the fade ends.
  globe.autoRotateSpeed = 0.0012;
  clearMenuExitConfirm();
  bootOverlay.classList.add("is-hiding");

  if (!globeStarted) {
    globeStarted = true;
    globe.init();
    wireThreatResponses();
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
defenderSetupButton.addEventListener("click", showDefenderSelection);
backButton.addEventListener("click", showMenu);
returnButton.addEventListener("click", showMenu);
hudMenuButton.addEventListener("click", requestReturnToMenu);
console.info("[HUD BIND] loadout", Boolean(expeditionLoadoutButton));
console.info("[HUD BIND] restore", Boolean(expeditionFlagButton));

if (expeditionLoadoutButton) {
  expeditionLoadoutButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    console.info("[HUD] LOADOUT / MODULES clicked");
    showExpeditionLoadout();
  });
}

if (expeditionFlagButton) {
  expeditionFlagButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    console.info("[HUD] RESTORE PARTY clicked");
    restoreExpeditionPartyFromHud();
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

// Initialize the HUD exit button label and menu mode description so the boot screen starts fully populated.
updateHudMenuButton();
updateModeDescription(gameMode);

// Exposes showMenu for older non-module game flow code that calls it from main.js.
window.showMenu = showMenu;
window.showExpeditionLoadout = showExpeditionLoadout;
window.closeExpeditionLoadout = closeExpeditionLoadout;
