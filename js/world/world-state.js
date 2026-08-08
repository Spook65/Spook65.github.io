/* Dev-only world map state helpers for the first THREATGRID city incident slice. */
const threatgridWorldState = {
  screen: "game",
  currentRegionKey: "",
  currentSectorKey: "",
  currentCityKey: "",
  hoveredRegionKey: "",
  selectedRegionKey: "",
  selectedSectorKey: "",
  regionSurfaceHighlightVisible: false,
  hoveredIncidentId: "",
  selectedIncidentId: "",
  returnTarget: "game",
  entrySource: "",
  sourceThreatId: "",
  routeChain: [],
  lastAction: ""
};

function resolveWorldCityRouteState(cityKey, options = {}) {
  const city = window.THREATGRID_WORLD_DATA?.getWorldCity?.(cityKey);
  const route = options.sourceThreatId
    ? window.THREATGRID_WORLD_DATA?.getWorldRouteForThreat?.(options.sourceThreatId)
    : null;
  const regionKey = options.regionId || route?.regionId || city?.regionKey || "";
  const sectorKey = options.sectorId || route?.sectorId || city?.sectorId || "";
  const resolvedCityKey = String(cityKey || city?.cityKey || "");
  const routeChain = Array.isArray(options.routeChain) && options.routeChain.length
    ? options.routeChain
    : route?.routeChain || [regionKey, sectorKey, resolvedCityKey].filter(Boolean);

  return {
    regionKey,
    sectorKey,
    routeChain
  };
}

function setWorldMapState(nextState = {}) {
  Object.assign(threatgridWorldState, nextState);
  return getWorldMapDebugState();
}

function clearWorldMapState() {
  threatgridWorldState.screen = "game";
  threatgridWorldState.currentRegionKey = "";
  threatgridWorldState.currentSectorKey = "";
  threatgridWorldState.currentCityKey = "";
  threatgridWorldState.hoveredRegionKey = "";
  threatgridWorldState.selectedRegionKey = "";
  threatgridWorldState.selectedSectorKey = "";
  threatgridWorldState.regionSurfaceHighlightVisible = false;
  threatgridWorldState.hoveredIncidentId = "";
  threatgridWorldState.selectedIncidentId = "";
  threatgridWorldState.returnTarget = "game";
  threatgridWorldState.entrySource = "";
  threatgridWorldState.sourceThreatId = "";
  threatgridWorldState.routeChain = [];
  threatgridWorldState.lastAction = "clear";
  return getWorldMapDebugState();
}

function setWorldRegionHover(regionKey = "") {
  threatgridWorldState.hoveredRegionKey = String(regionKey || "");
  threatgridWorldState.regionSurfaceHighlightVisible = Boolean(regionKey || threatgridWorldState.selectedRegionKey);
  threatgridWorldState.lastAction = regionKey ? "hover-region" : "clear-region-hover";
  return getWorldMapDebugState();
}

function setWorldRegionSelection(regionKey = "") {
  threatgridWorldState.selectedRegionKey = String(regionKey || "");
  threatgridWorldState.currentRegionKey = String(regionKey || threatgridWorldState.currentRegionKey || "");
  threatgridWorldState.regionSurfaceHighlightVisible = Boolean(regionKey || threatgridWorldState.hoveredRegionKey);
  threatgridWorldState.lastAction = regionKey ? "select-region" : "clear-region-selection";
  return getWorldMapDebugState();
}

function setWorldCityState(cityKey, options = {}) {
  const routeState = resolveWorldCityRouteState(cityKey, options);
  threatgridWorldState.screen = "world-city";
  threatgridWorldState.currentRegionKey = routeState.regionKey;
  threatgridWorldState.currentSectorKey = routeState.sectorKey;
  threatgridWorldState.currentCityKey = String(cityKey || "");
  threatgridWorldState.hoveredIncidentId = "";
  threatgridWorldState.selectedIncidentId = "";
  threatgridWorldState.returnTarget = options.returnTarget || "game";
  threatgridWorldState.entrySource = options.entrySource || "";
  threatgridWorldState.sourceThreatId = options.sourceThreatId || "";
  threatgridWorldState.routeChain = routeState.routeChain;
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
    regionHighlightMode: threatgridWorldState.selectedRegionKey
      ? "selected"
      : threatgridWorldState.hoveredRegionKey ? "hover" : "",
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
    setRegionHover: setWorldRegionHover,
    setRegionSelection: setWorldRegionSelection,
    setHover: setWorldCityHover,
    setSelection: setWorldCitySelection,
    getDebugState: getWorldMapDebugState
  };
  window.devWorldState = getWorldMapDebugState;
}
