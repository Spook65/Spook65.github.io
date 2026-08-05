/* Planning-adapter data for the Hospital Network Lockout city incident MVP. */
const threatgridWorldCities = {
  "hospital-lockout": {
    cityKey: "hospital-lockout",
    title: "Hospital Network Lockout",
    eyebrow: "WORLD-CITY / NEW YORK MEDICAL CORRIDOR",
    region: "North America",
    country: "United States",
    state: "New York",
    city: "New York",
    district: "Medical corridor",
    environmentKey: "hospital-lockout",
    threatFamily: "ransomware",
    summary: "A hospital district is running on backup coordination while ransomware pressure spreads across clinical systems.",
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
  return JSON.parse(JSON.stringify(value));
}

function getWorldCityLayer(cityKey = "hospital-lockout") {
  const layer = threatgridWorldCities[String(cityKey || "hospital-lockout")] || threatgridWorldCities["hospital-lockout"];
  return cloneWorldData(layer);
}

function getWorldCityIncident(cityKey, incidentId) {
  const layer = getWorldCityLayer(cityKey);
  return layer.incidents.find((incident) => incident.id === incidentId) || null;
}

function findCombatThreatForWorldIncident(incident) {
  if (!incident?.combatThreatId || !Array.isArray(threats)) {
    return null;
  }

  return threats.find((threat) => threat?.id === incident.combatThreatId) || null;
}

function getWorldCityRouteForThreat(threat) {
  if (threat?.id !== "tg-001") {
    return null;
  }

  return {
    cityKey: "hospital-lockout",
    entrySource: "globe",
    sourceThreatId: threat.id,
    returnTarget: "game"
  };
}

if (typeof window !== "undefined") {
  window.THREATGRID_WORLD_DATA = {
    getWorldCityLayer,
    getWorldCityIncident,
    findCombatThreatForWorldIncident,
    getWorldCityRouteForThreat
  };
}
