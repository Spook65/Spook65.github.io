/* Main wiring for THREATGRID: create the globe, connect click behavior, start respawn timing, and boot the menu. */
const globe = new ThreatGlobe(document.getElementById("globe-root"), threats);

// This callback hook is the bridge for future side panels and threat detail UI.
function wireThreatResponses() {
  globe.onThreatClick((threat) => {
    console.log("THREATGRID node selected:", threat);
    // TODO: Layer 2 will open a threat detail panel using this callback.
  });

  // The respawn loop will eventually bring neutralized threats back into play.
  window.setInterval(() => {
    globe.respawnRandomThreat();
    globe.syncThreatNodes();
  }, 12000);

  // TODO: Layer 2 will subscribe to threat state updates instead of reading the scene directly.
}

// Start on the main menu so the globe can boot behind it when the player is ready.
showMenu();
