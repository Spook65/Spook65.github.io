/* Dev-only world map state helpers for the first THREATGRID city incident slice. */
const threatgridWorldState = {
  screen: "game",
  currentCityKey: "",
  hoveredIncidentId: "",
  selectedIncidentId: "",
  returnTarget: "game",
  entrySource: "",
  sourceThreatId: "",
  lastAction: ""
};

function setWorldMapState(nextState = {}) {
  Object.assign(threatgridWorldState, nextState);
  return getWorldMapDebugState();
}

function clearWorldMapState() {
  threatgridWorldState.screen = "game";
  threatgridWorldState.currentCityKey = "";
  threatgridWorldState.hoveredIncidentId = "";
  threatgridWorldState.selectedIncidentId = "";
  threatgridWorldState.returnTarget = "game";
  threatgridWorldState.entrySource = "";
  threatgridWorldState.sourceThreatId = "";
  threatgridWorldState.lastAction = "clear";
  return getWorldMapDebugState();
}

function setWorldCityState(cityKey, options = {}) {
  threatgridWorldState.screen = "world-city";
  threatgridWorldState.currentCityKey = String(cityKey || "");
  threatgridWorldState.hoveredIncidentId = "";
  threatgridWorldState.selectedIncidentId = "";
  threatgridWorldState.returnTarget = options.returnTarget || "game";
  threatgridWorldState.entrySource = options.entrySource || "";
  threatgridWorldState.sourceThreatId = options.sourceThreatId || "";
  threatgridWorldState.lastAction = "open-city";
  return getWorldMapDebugState();
}

function setWorldCityHover(incidentId = "") {
  threatgridWorldState.hoveredIncidentId = String(incidentId || "");
  threatgridWorldState.lastAction = incidentId ? "hover-incident" : "clear-hover";
  return getWorldMapDebugState();
}

function setWorldCitySelection(incidentId = "") {
  threatgridWorldState.selectedIncidentId = String(incidentId || "");
  threatgridWorldState.lastAction = incidentId ? "select-incident" : "clear-selection";
  return getWorldMapDebugState();
}

function getWorldMapDebugState() {
  const cityScene = typeof window !== "undefined" && typeof window.getCityIncidentSceneDebugState === "function"
    ? window.getCityIncidentSceneDebugState()
    : null;
  return {
    ...threatgridWorldState,
    cityMounted: Boolean(cityScene?.mounted),
    canvasCount: cityScene?.canvasCount || 0,
    incidentNodeCount: cityScene?.incidentNodeCount || 0,
    cityHoveredIncidentId: cityScene?.hoveredIncidentId || "",
    lastError: cityScene?.lastError || ""
  };
}

if (typeof window !== "undefined") {
  window.THREATGRID_WORLD_STATE = {
    setState: setWorldMapState,
    clear: clearWorldMapState,
    setCity: setWorldCityState,
    setHover: setWorldCityHover,
    setSelection: setWorldCitySelection,
    getDebugState: getWorldMapDebugState
  };
  window.devWorldState = getWorldMapDebugState;
}
