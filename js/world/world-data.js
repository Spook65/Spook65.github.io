/* Planning-adapter data for the Hospital Network Lockout city incident MVP. */
const threatgridWorldRegions = {
  "north-america": {
    id: "north-america",
    title: "North America",
    displayName: "North America",
    worldLayer: "region",
    regionKey: "north-america",
    inspiredBy: "Broad North America",
    centerLatLng: { lat: 39.5, lng: -98.35 },
    approximateBounds: {
      north: 72,
      south: 15,
      west: -168,
      east: -52
    },
    threatPressure: "critical medical infrastructure pressure along the Atlantic corridor",
    sectorIds: ["atlantic-medical-corridor"],
    unlockTier: 1,
    summary: "A broad region of dense civic, medical, research, logistics, and energy systems under escalating protocol pressure.",
    visualTheme: "continent-scale threat glow, satellite scan arcs, restrained teal/coral pressure clusters"
  }
};

const threatgridWorldSectors = {
  "atlantic-medical-corridor": {
    id: "atlantic-medical-corridor",
    regionKey: "north-america",
    title: "Atlantic Medical Corridor",
    sectorType: "fictionalized infrastructure corridor",
    inspiredBy: "Dense East Coast hospital, research, emergency, and civic infrastructure",
    fictionalName: "Atlantic Medical Corridor",
    cityLayerIds: ["hospital-lockout"],
    dominantThreatFamilies: ["ransomware", "lateral_movement", "clinical_system_lockout"],
    infrastructureTags: ["hospital", "emergency_services", "radiology", "identity", "backup_power"],
    recommendedLevel: 4,
    riskIndex: "critical",
    summary: "A medical infrastructure spine where clinical networks, emergency routing, and backup systems are tightly coupled.",
    visualTheme: "rain-dark medical district routes, emergency amber, cyan diagnostic scanlines, muted civic silhouettes"
  }
};

const threatgridWorldThreatRoutes = {
  "tg-001": {
    threatId: "tg-001",
    regionId: "north-america",
    sectorId: "atlantic-medical-corridor",
    cityKey: "hospital-lockout",
    incidentNodeId: "hospital-main-lockout",
    routeChain: ["north-america", "atlantic-medical-corridor", "hospital-lockout"],
    entrySource: "globe",
    returnTarget: "game"
  }
};

const threatgridWorldCities = {
  "hospital-lockout": {
    id: "hospital-lockout",
    cityKey: "hospital-lockout",
    sectorId: "atlantic-medical-corridor",
    cityDisplayName: "New York Medical Corridor",
    inspiredBy: "New York medical district / dense East Coast emergency infrastructure",
    title: "New York Medical Corridor",
    eyebrow: "WORLD-CITY / HOSPITAL NETWORK LOCKOUT",
    region: "North America",
    regionKey: "north-america",
    country: "United States",
    state: "New York",
    city: "New York",
    district: "Emergency medical corridor",
    environmentKey: "hospital-lockout",
    sceneKey: "hospital-lockout",
    threatFamily: "ransomware",
    incidentNodeIds: ["hospital-main-lockout", "triage-routing-failure", "backup-generator-handshake", "ambulance-comms-delay"],
    returnTargets: ["game", "world-sector"],
    visualTheme: "dystopian night hospital corridor, emergency roads, EHR tower, backup systems, rain-dark civic infrastructure",
    summary: "A rain-dark hospital corridor is holding triage, imaging, dispatch, and backup power together under ransomware pressure.",
    incidents: [
      {
        id: "hospital-main-lockout",
        title: "Hospital Network Lockout",
        severity: "critical",
        system: "EHR / radiology core",
        summary: "Clinical scheduling, imaging, and medication workflows are degrading under active encryption pressure.",
        actionHint: "Select Incident",
        combatThreatId: "tg-001",
        status: "active",
        cityPosition: { x: 1.65, y: 0.08, z: -1.25 }
      },
      {
        id: "triage-routing-failure",
        title: "Triage Routing Failure",
        severity: "high",
        system: "Admissions routing",
        summary: "Patient intake queues are falling back to manual triage while routing services lose trust signals.",
        actionHint: "Recon only",
        combatThreatId: "",
        status: "contained",
        cityPosition: { x: -0.55, y: 0.08, z: -0.8 }
      },
      {
        id: "backup-generator-handshake",
        title: "Backup Handshake Drift",
        severity: "medium",
        system: "Generator network bridge",
        summary: "Emergency power telemetry is online, but stale credentials are polluting recovery handshakes.",
        actionHint: "Recon only",
        combatThreatId: "",
        status: "monitoring",
        cityPosition: { x: -1.75, y: 0.08, z: 0.55 }
      },
      {
        id: "ambulance-comms-delay",
        title: "Ambulance Comms Delay",
        severity: "medium",
        system: "Dispatch relay",
        summary: "Field units are receiving delayed routing updates as dispatch relays shed encrypted packets.",
        actionHint: "Recon only",
        combatThreatId: "",
        status: "monitoring",
        cityPosition: { x: 0.9, y: 0.08, z: 1.15 }
      }
    ]
  }
};

function cloneWorldData(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}

function getWorldRegion(regionId = "north-america") {
  return cloneWorldData(threatgridWorldRegions[String(regionId || "north-america")] || null);
}

function getWorldSectorsForRegion(regionId = "north-america") {
  const normalizedRegionId = String(regionId || "north-america");
  return Object.values(threatgridWorldSectors)
    .filter((sector) => sector.regionKey === normalizedRegionId)
    .map(cloneWorldData);
}

function getWorldSector(sectorId = "atlantic-medical-corridor") {
  return cloneWorldData(threatgridWorldSectors[String(sectorId || "atlantic-medical-corridor")] || null);
}

function getWorldCitiesForSector(sectorId = "atlantic-medical-corridor") {
  const sector = threatgridWorldSectors[String(sectorId || "atlantic-medical-corridor")];
  if (!sector) {
    return [];
  }

  return sector.cityLayerIds
    .map((cityKey) => threatgridWorldCities[cityKey])
    .filter(Boolean)
    .map(cloneWorldData);
}

function getWorldCity(cityKey = "hospital-lockout") {
  const layer = threatgridWorldCities[String(cityKey || "hospital-lockout")] || threatgridWorldCities["hospital-lockout"];
  return cloneWorldData(layer);
}

function getWorldCityLayer(cityKey = "hospital-lockout") {
  return getWorldCity(cityKey);
}

function getWorldCityIncident(cityKey, incidentId) {
  const layer = getWorldCityLayer(cityKey);
  return layer?.incidents?.find((incident) => incident.id === incidentId) || null;
}

function findCombatThreatForWorldIncident(incident) {
  if (!incident?.combatThreatId || !Array.isArray(threats)) {
    return null;
  }

  return threats.find((threat) => threat?.id === incident.combatThreatId) || null;
}

function getWorldRouteForThreat(threatOrId) {
  const threatId = typeof threatOrId === "string" ? threatOrId : threatOrId?.id;
  const route = threatgridWorldThreatRoutes[String(threatId || "")];
  if (!route) {
    return null;
  }

  const city = getWorldCity(route.cityKey);
  const sector = getWorldSector(route.sectorId);
  const region = getWorldRegion(route.regionId);
  return {
    ...cloneWorldData(route),
    sourceThreatId: route.threatId,
    city,
    sector,
    region
  };
}

function getWorldCityRouteForThreat(threat) {
  const route = getWorldRouteForThreat(threat);
  if (!route) {
    return null;
  }

  return {
    cityKey: route.cityKey,
    regionId: route.regionId,
    sectorId: route.sectorId,
    incidentNodeId: route.incidentNodeId,
    routeChain: route.routeChain,
    entrySource: route.entrySource,
    sourceThreatId: route.threatId,
    returnTarget: route.returnTarget
  };
}

if (typeof window !== "undefined") {
  window.THREATGRID_WORLD_DATA = {
    getWorldRegion,
    getWorldSectorsForRegion,
    getWorldSector,
    getWorldCitiesForSector,
    getWorldCity,
    getWorldCityLayer,
    getWorldCityIncident,
    findCombatThreatForWorldIncident,
    getWorldRouteForThreat,
    getWorldCityRouteForThreat
  };

  window.devWorldRouteForThreat = (threatId = "tg-001") => getWorldRouteForThreat(threatId);
}
