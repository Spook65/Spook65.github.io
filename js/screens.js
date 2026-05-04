/* Screen-state and mode-selection behavior for THREATGRID's menu, briefing, and gameplay transitions. */
// screenState controls which overlay is visible: menu, briefing, or gameplay.
let screenState = "menu"; // 'menu' | 'howtoplay' | 'game'
let globeStarted = false;

// gameMode is chosen before the game starts so later UI logic knows whether to show passive or typed actions.
let gameMode = "analyst"; // 'analyst' | 'operator'

// DOM references let the screen functions switch overlays without recreating elements.
const bootOverlay = document.getElementById("boot-overlay");
const menuScreen = document.getElementById("menu-screen");
const howtoScreen = document.getElementById("howto-screen");
const analystModeButton = document.getElementById("analyst-mode-button");
const operatorModeButton = document.getElementById("operator-mode-button");
const howtoButton = document.getElementById("howto-button");
const backButton = document.getElementById("back-button");
const returnButton = document.getElementById("return-button");
const hudMenuButton = document.getElementById("hud-menu-button");
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
}

// showMenu() restores the main menu and keeps the overlay visible.
function showMenu() {
  bootOverlay.style.display = "block";
  bootOverlay.classList.remove("is-hiding");
  setScreen("menu");
  updateModeDescription(gameMode);
}

// showHowToPlay() crossfades to the briefing screen without touching the globe logic.
function showHowToPlay() {
  bootOverlay.style.display = "block";
  bootOverlay.classList.remove("is-hiding");
  setScreen("howtoplay");
}

// startGame() flips into gameplay, fades the overlay out, and boots the globe exactly once.
function startGame() {
  screenState = "game";
  // The globe rotates again as the game begins, so the background motion resumes before the fade ends.
  globe.autoRotateSpeed = 0.0012;
  clearMenuExitConfirm();
  bootOverlay.classList.add("is-hiding");

  if (!globeStarted) {
    globeStarted = true;
    globe.init();
    wireThreatResponses();
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
    // Returning to the menu also flips the shared screen state back to the menu branch.
    screenState = "menu";
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

// Each mode button stores the mode first, then starts the game, so downstream UI code knows which behavior to build.
analystModeButton.addEventListener("click", () => {
  setGameMode("analyst");
  startGame();
});

operatorModeButton.addEventListener("click", () => {
  setGameMode("operator");
  startGame();
});

// The remaining buttons simply switch between the three screen states.
howtoButton.addEventListener("click", showHowToPlay);
backButton.addEventListener("click", showMenu);
returnButton.addEventListener("click", showMenu);
hudMenuButton.addEventListener("click", requestReturnToMenu);

// Initialize the HUD exit button label and menu mode description so the boot screen starts fully populated.
updateHudMenuButton();
updateModeDescription(gameMode);
