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

// The buttons simply switch between the three screen states.
initializeButton.addEventListener("click", startGame);
howtoButton.addEventListener("click", showHowToPlay);
backButton.addEventListener("click", showMenu);
returnButton.addEventListener("click", showMenu);
