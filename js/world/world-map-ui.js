/* HTML overlay helpers for the Hospital City Incident Layer MVP. */
function escapeWorldMapText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildWorldCityScreenMarkup(cityData) {
  const safeTitle = escapeWorldMapText(cityData?.title || "Hospital City Incident Layer");
  const safeEyebrow = escapeWorldMapText(cityData?.eyebrow || "WORLD-CITY");
  const safeSummary = escapeWorldMapText(cityData?.summary || "");
  const safeDistrict = escapeWorldMapText(cityData?.district || "Incident district");

  return `
    <div class="world-city-shell" data-world-city-key="${escapeWorldMapText(cityData?.cityKey || "hospital-lockout")}">
      <div class="world-city-scene-mount" data-world-city-scene></div>
      <div class="world-city-topbar">
        <div class="world-city-heading">
          <div class="world-city-eyebrow">${safeEyebrow}</div>
          <h1>${safeTitle}</h1>
          <p>${safeSummary}</p>
        </div>
        <button class="world-city-return" type="button" data-world-city-return>RETURN TO GLOBE</button>
      </div>
      <div class="world-city-district-tag">
        <span>District</span>
        <strong>${safeDistrict}</strong>
      </div>
      <div class="world-city-action-message" data-world-city-message>Hover an incident ring to inspect the local breach.</div>
      <div class="world-city-hologram" data-world-city-hologram aria-hidden="true"></div>
    </div>
  `;
}

function getWorldCityHologramElement() {
  return document.querySelector("[data-world-city-hologram]");
}

function hideWorldCityHologram() {
  const hologram = getWorldCityHologramElement();
  if (!hologram) {
    return;
  }
  hologram.classList.remove("is-visible");
  hologram.setAttribute("aria-hidden", "true");
}

function showWorldCityHologram(incident, pointer = {}) {
  const hologram = getWorldCityHologramElement();
  if (!hologram || !incident) {
    hideWorldCityHologram();
    return;
  }

  const severity = escapeWorldMapText(incident.severity || "unknown");
  const title = escapeWorldMapText(incident.title || "Incident");
  const system = escapeWorldMapText(incident.system || "Affected system");
  const summary = escapeWorldMapText(incident.summary || "");
  const hint = escapeWorldMapText(incident.actionHint || "Select Incident");
  const status = escapeWorldMapText(incident.status || "active");
  const canEnterCombat = Boolean(incident.combatThreatId);

  hologram.innerHTML = `
    <div class="world-city-hologram-kicker">${severity} / ${status}</div>
    <div class="world-city-hologram-title">${title}</div>
    <div class="world-city-hologram-system">${system}</div>
    <p>${summary}</p>
    <div class="world-city-hologram-action">${canEnterCombat ? hint : "Recon node - combat route pending"}</div>
  `;

  const x = Math.min(window.innerWidth - 340, Math.max(24, Number(pointer.clientX || window.innerWidth / 2) + 24));
  const y = Math.min(window.innerHeight - 230, Math.max(96, Number(pointer.clientY || window.innerHeight / 2) - 24));
  hologram.style.left = `${x}px`;
  hologram.style.top = `${y}px`;
  hologram.classList.add("is-visible");
  hologram.setAttribute("aria-hidden", "false");
}

function setWorldCityActionMessage(message, tone = "") {
  const element = document.querySelector("[data-world-city-message]");
  if (!element) {
    return;
  }
  element.textContent = String(message || "");
  element.dataset.tone = tone;
}

if (typeof window !== "undefined") {
  window.THREATGRID_WORLD_MAP_UI = {
    buildWorldCityScreenMarkup,
    showWorldCityHologram,
    hideWorldCityHologram,
    setWorldCityActionMessage
  };
}
