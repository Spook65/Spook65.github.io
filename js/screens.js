/* Screen-state and boot-overlay behavior for THREATGRID's menu, briefing, and game transitions. */
// screenState controls which overlay is visible: menu, briefing, or gameplay.
let screenState = "menu"; // 'menu' | 'howtoplay' | 'game'
let globeStarted = false;

// DOM references let the screen functions switch overlays without recreating elements.
const bootOverlay = document.getElementById("boot-overlay");
const menuScreen = document.getElementById("menu-screen");
const howtoScreen = document.getElementById("howto-screen");
const initializeButton = document.getElementById("initialize-button");
const howtoButton = document.getElementById("howto-button");
const backButton = document.getElementById("back-button");
const returnButton = document.getElementById("return-button");
const hudMenuButton = document.getElementById("hud-menu-button");

// The menu button uses a two-step confirm pattern so players do not exit the mission by accident.
let menuExitConfirmArmed = false;
let menuExitTimerId = null;

// updateHudMenuButton() keeps the HUD label in sync with whether exit confirmation is armed.
function updateHudMenuButton() {
  hudMenuButton.textContent = menuExitConfirmArmed ? "[ CONFIRM? ]" : "[ MENU ]";
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

// The buttons simply switch between the three screen states.
initializeButton.addEventListener("click", startGame);
howtoButton.addEventListener("click", showHowToPlay);
backButton.addEventListener("click", showMenu);
returnButton.addEventListener("click", showMenu);
hudMenuButton.addEventListener("click", requestReturnToMenu);

// Initialize the HUD exit button label so the menu state starts in its neutral form.
updateHudMenuButton();
