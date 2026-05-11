/**
 * THREATGRID Starter Lineup prototype only.
 *
 * This file is intentionally disconnected from the live app.
 * It does not change routing, save state, combat, or the existing
 * renderDefenderSelectionScreen() path that powers the working Starter Lineup.
 */

// getPrototypeDefenderCatalog() prefers the live defender catalog when the game has already loaded it.
function getPrototypeDefenderCatalog() {
  if (typeof window !== "undefined") {
    if (typeof window.getStarterDefenderCatalog === "function") {
      return window.getStarterDefenderCatalog().slice();
    }

    if (Array.isArray(window.defenderCatalog)) {
      return window.defenderCatalog.slice();
    }
  }

  return [
    {
      id: "firewall-7",
      name: "Firewall-7",
      role: "Shield Guardian",
      domain: "Bastion",
      affinity: "Defense",
      summary: "A shield guardian built to absorb direct intrusion.",
      coreTrait: "Bulwark Array",
      passiveModule: "Shell Resonance",
      temperament: "Steadfast",
      variant: "normal",
      hp: 100,
      atk: 4,
      def: 8,
      spAtk: 3,
      spDef: 8,
      spd: 4,
      color: "#87e4ff",
      level: 1,
      moves: [
        { name: "Block Network", category: "support", power: 0, accuracy: 100, charges: 15, maxCharges: 15, description: "Absorb pressure." },
        { name: "Harden Ports", category: "support", power: 12, accuracy: 100, charges: 10, maxCharges: 10, description: "Reinforce the line." }
      ]
    },
    {
      id: "ids",
      name: "IDS",
      role: "Scanner Scout",
      domain: "Detection",
      affinity: "Offense",
      summary: "A precision scout that spots exploits before they bloom.",
      coreTrait: "Signal Scan",
      passiveModule: "Trace Pulse",
      temperament: "Analytical",
      variant: "normal",
      hp: 92,
      atk: 6,
      def: 4,
      spAtk: 8,
      spDef: 5,
      spd: 10,
      color: "#46d8c8",
      level: 1,
      moves: [
        { name: "Deep Packet Scan", category: "special", power: 16, accuracy: 100, charges: 15, maxCharges: 15, description: "Expose hidden threats." },
        { name: "Signature Burst", category: "special", power: 24, accuracy: 95, charges: 10, maxCharges: 10, description: "Strike with certainty." }
      ]
    },
    {
      id: "honeypot",
      name: "HONEYPOT",
      role: "Trickster Decoy",
      domain: "Illusion",
      affinity: "Deception",
      summary: "A decoy construct that tempts threats into exposed positions.",
      coreTrait: "False Signal",
      passiveModule: "Lure Bloom",
      temperament: "Cunning",
      variant: "normal",
      hp: 96,
      atk: 5,
      def: 5,
      spAtk: 6,
      spDef: 6,
      spd: 8,
      color: "#d9be73",
      level: 1,
      moves: [
        { name: "Lure Traffic", category: "support", power: 12, accuracy: 100, charges: 15, maxCharges: 15, description: "Pull aggression off-course." },
        { name: "Decoy Mesh", category: "support", power: 18, accuracy: 95, charges: 10, maxCharges: 10, description: "Split threat attention." }
      ]
    },
    {
      id: "antivirus",
      name: "ANTIVIRUS",
      role: "Purifier Lancer",
      domain: "Purity",
      affinity: "Purge",
      summary: "A cleansing warrior that burns corruption out of the frame.",
      coreTrait: "Purge Lance",
      passiveModule: "Cleanse Circuit",
      temperament: "Zealous",
      variant: "normal",
      hp: 108,
      atk: 7,
      def: 5,
      spAtk: 7,
      spDef: 6,
      spd: 6,
      color: "#ff6e4a",
      level: 1,
      moves: [
        { name: "Signature Sweep", category: "physical", power: 16, accuracy: 100, charges: 15, maxCharges: 15, description: "Clear the line." },
        { name: "Rapid Scan", category: "special", power: 22, accuracy: 95, charges: 10, maxCharges: 10, description: "Purge and expose." }
      ]
    }
  ];
}

// getPrototypeMonogram() keeps the prototype readable without depending on external art assets.
function getPrototypeMonogram(defender) {
  const source = [defender?.name, defender?.role, defender?.domain].filter(Boolean).join(" ");
  const letters = source.match(/[A-Z0-9]/gi) || [];
  return (letters.slice(0, 2).join("") || "TG").toUpperCase();
}

// buildStarterRosterPrototypeStyles() scopes the prototype styling to one isolated class tree.
function buildStarterRosterPrototypeStyles() {
  return `
    .tg-starter-prototype {
      position: relative;
      min-height: 100vh;
      padding: clamp(16px, 2.6vw, 28px);
      background:
        radial-gradient(circle at 20% 12%, rgba(135, 228, 255, 0.06), transparent 16%),
        radial-gradient(circle at 82% 18%, rgba(255, 110, 74, 0.05), transparent 18%),
        linear-gradient(180deg, #04050a 0%, #090b13 48%, #04050a 100%);
      color: #f4efe3;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      letter-spacing: 0.08em;
    }

    .tg-starter-prototype * {
      box-sizing: border-box;
    }

    .tg-starter-prototype__shell {
      width: min(1320px, 100%);
      margin: 0 auto;
      display: grid;
      gap: 12px;
    }

    .tg-starter-prototype__header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(240px, 0.8fr) auto;
      gap: 12px;
      align-items: start;
    }

    .tg-starter-prototype__header-copy {
      display: grid;
      gap: 8px;
    }

    .tg-starter-prototype__kicker,
    .tg-starter-prototype__label {
      color: rgba(244, 239, 227, 0.56);
      font-size: 0.6rem;
      letter-spacing: 0.24em;
      text-transform: uppercase;
    }

    .tg-starter-prototype__title {
      margin: 0;
      font-size: clamp(1.8rem, 3vw, 2.5rem);
      line-height: 0.95;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .tg-starter-prototype__copy {
      margin: 0;
      color: rgba(244, 239, 227, 0.68);
      font-size: 0.72rem;
      line-height: 1.7;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .tg-starter-prototype__panel,
    .tg-starter-prototype__slot,
    .tg-starter-prototype__tile,
    .tg-starter-prototype__button {
      border: 1px solid rgba(244, 239, 227, 0.08);
      background: linear-gradient(180deg, rgba(23, 17, 29, 0.86), rgba(16, 13, 24, 0.96));
      box-shadow: 0 10px 22px rgba(5, 5, 9, 0.18);
    }

    .tg-starter-prototype__panel {
      display: grid;
      gap: 10px;
      padding: 14px;
    }

    .tg-starter-prototype__grid {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      gap: 12px;
      min-height: 0;
    }

    .tg-starter-prototype__roster {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .tg-starter-prototype__tile {
      appearance: none;
      display: grid;
      gap: 8px;
      padding: 12px;
      min-height: 132px;
      color: #f4efe3;
      text-align: left;
    }

    .tg-starter-prototype__tile.is-selected {
      border-color: rgba(255, 110, 74, 0.22);
    }

    .tg-starter-prototype__tile-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }

    .tg-starter-prototype__name {
      font-size: 0.9rem;
      line-height: 1.1;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .tg-starter-prototype__role,
    .tg-starter-prototype__summary,
    .tg-starter-prototype__field-value,
    .tg-starter-prototype__stat-value,
    .tg-starter-prototype__move-meta,
    .tg-starter-prototype__slot-role {
      color: rgba(244, 239, 227, 0.66);
      font-size: 0.68rem;
      line-height: 1.45;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .tg-starter-prototype__mini-stats,
    .tg-starter-prototype__detail-stats,
    .tg-starter-prototype__party,
    .tg-starter-prototype__actions {
      display: grid;
      gap: 8px;
    }

    .tg-starter-prototype__mini-stats,
    .tg-starter-prototype__detail-stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .tg-starter-prototype__mini-stat,
    .tg-starter-prototype__field,
    .tg-starter-prototype__move,
    .tg-starter-prototype__slot {
      padding: 10px 12px;
    }

    .tg-starter-prototype__preview {
      display: grid;
      gap: 10px;
      align-content: start;
    }

    .tg-starter-prototype__watermark {
      font-size: clamp(2rem, 4vw, 4rem);
      letter-spacing: 0.18em;
      text-transform: uppercase;
      opacity: 0.12;
    }

    .tg-starter-prototype__detail-title {
      margin: 0;
      font-size: clamp(1.35rem, 2.8vw, 2.1rem);
      line-height: 0.96;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .tg-starter-prototype__detail-fields,
    .tg-starter-prototype__moves {
      display: grid;
      gap: 8px;
    }

    .tg-starter-prototype__footer {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: end;
    }

    .tg-starter-prototype__party {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .tg-starter-prototype__slot.is-empty {
      opacity: 0.72;
      border-style: dashed;
    }

    .tg-starter-prototype__actions {
      grid-auto-flow: column;
      grid-auto-columns: minmax(0, 1fr);
      gap: 10px;
    }

    .tg-starter-prototype__button {
      appearance: none;
      min-height: 48px;
      padding: 12px 18px;
      color: #f4efe3;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      clip-path: polygon(0 0, 100% 0, 98% 100%, 2% 100%);
    }

    @media (max-width: 1040px) {
      .tg-starter-prototype__header,
      .tg-starter-prototype__grid,
      .tg-starter-prototype__footer {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 860px) {
      .tg-starter-prototype__roster,
      .tg-starter-prototype__detail-stats,
      .tg-starter-prototype__party {
        grid-template-columns: 1fr;
      }

      .tg-starter-prototype__actions {
        grid-auto-flow: row;
      }
    }
  `;
}

// buildStarterRosterPrototypeMarkup() returns a complete prototype layout without touching the live screen.
function buildStarterRosterPrototypeMarkup() {
  const catalog = getPrototypeDefenderCatalog();
  const activeDefender = catalog[0] || null;
  const party = catalog.slice(0, 4);

  const rosterTiles = catalog.map((defender, index) => `
    <div class="tg-starter-prototype__tile ${index === 0 ? "is-selected" : ""}">
      <div class="tg-starter-prototype__tile-head">
        <div>
          <div class="tg-starter-prototype__kicker">STARTER DEFENDER</div>
          <div class="tg-starter-prototype__name">${defender.name}</div>
          <div class="tg-starter-prototype__role">${defender.role} / ${defender.domain}</div>
        </div>
        <div class="tg-starter-prototype__label">${index === 0 ? "ACTIVE" : "READY"}</div>
      </div>
      <div class="tg-starter-prototype__summary">${defender.summary}</div>
      <div class="tg-starter-prototype__mini-stats">
        <div class="tg-starter-prototype__mini-stat">HP ${defender.hp}</div>
        <div class="tg-starter-prototype__mini-stat">DEF ${defender.def}</div>
        <div class="tg-starter-prototype__mini-stat">SPD ${defender.spd}</div>
      </div>
    </div>
  `).join("");

  const partySlots = Array.from({ length: 4 }, (_, index) => {
    const defender = party[index] || null;

    if (!defender) {
      return `
        <div class="tg-starter-prototype__slot is-empty">
          <div class="tg-starter-prototype__kicker">SLOT ${index + 1}</div>
          <div class="tg-starter-prototype__name">EMPTY</div>
          <div class="tg-starter-prototype__slot-role">WAITING FOR DEFENDER</div>
        </div>
      `;
    }

    return `
      <div class="tg-starter-prototype__slot">
        <div class="tg-starter-prototype__kicker">SLOT ${index + 1}</div>
        <div class="tg-starter-prototype__name">${defender.name}</div>
        <div class="tg-starter-prototype__slot-role">${defender.role}</div>
      </div>
    `;
  }).join("");

  const moveList = (activeDefender?.moves || []).map((move) => `
    <div class="tg-starter-prototype__move">
      <div class="tg-starter-prototype__tile-head">
        <div class="tg-starter-prototype__name">${move.name}</div>
        <div class="tg-starter-prototype__label">${String(move.category || "").toUpperCase()}</div>
      </div>
      <div class="tg-starter-prototype__move-meta">
        PWR ${move.power}${Number.isFinite(move.accuracy) ? ` / ${move.accuracy}% ACC` : ""}${Number.isFinite(move.charges) && Number.isFinite(move.maxCharges) ? ` / ${move.charges}/${move.maxCharges} CHG` : ""}
      </div>
      <div class="tg-starter-prototype__summary">${move.description}</div>
    </div>
  `).join("");

  return `
    <div class="tg-starter-prototype">
      <style>${buildStarterRosterPrototypeStyles()}</style>
      <section class="tg-starter-prototype__shell" aria-label="Starter Lineup prototype">
        <header class="tg-starter-prototype__header">
          <div class="tg-starter-prototype__header-copy">
            <div class="tg-starter-prototype__kicker">PROTOTYPE ONLY / DISCONNECTED FROM LIVE APP</div>
            <h2 class="tg-starter-prototype__title">STARTER LINEUP</h2>
            <p class="tg-starter-prototype__copy">A safe future-state roster-select layout for THREATGRID. This prototype is intentionally isolated and does not change the current working render path.</p>
          </div>
          <div class="tg-starter-prototype__panel" aria-hidden="true">
            <div class="tg-starter-prototype__label">ACTIVE PREVIEW</div>
            <div class="tg-starter-prototype__watermark">${activeDefender ? activeDefender.name : "THREATGRID"}</div>
          </div>
          <div class="tg-starter-prototype__button" aria-hidden="true">RETURN TO MENU</div>
        </header>

        <div class="tg-starter-prototype__grid">
          <section class="tg-starter-prototype__panel" aria-label="Defender roster">
            <div class="tg-starter-prototype__label">ROSTER TILES</div>
            <div class="tg-starter-prototype__roster">${rosterTiles}</div>
          </section>

          <aside class="tg-starter-prototype__panel" aria-label="Active defender detail">
            <div class="tg-starter-prototype__label">ACTIVE DEFENDER DETAIL</div>
            <div class="tg-starter-prototype__watermark">${activeDefender ? getPrototypeMonogram(activeDefender) : "TG"}</div>
            <h3 class="tg-starter-prototype__detail-title">${activeDefender ? activeDefender.name : "NO DEFENDER"}</h3>
            <div class="tg-starter-prototype__copy">${activeDefender ? activeDefender.summary : "Select a defender to inspect the prototype panel."}</div>

            <div class="tg-starter-prototype__detail-fields">
              <div class="tg-starter-prototype__field">
                <div class="tg-starter-prototype__kicker">CORE TRAIT</div>
                <div class="tg-starter-prototype__field-value">${activeDefender ? activeDefender.coreTrait : "-"}</div>
              </div>
              <div class="tg-starter-prototype__field">
                <div class="tg-starter-prototype__kicker">PASSIVE MODULE</div>
                <div class="tg-starter-prototype__field-value">${activeDefender ? activeDefender.passiveModule : "-"}</div>
              </div>
              <div class="tg-starter-prototype__field">
                <div class="tg-starter-prototype__kicker">TEMPERAMENT</div>
                <div class="tg-starter-prototype__field-value">${activeDefender ? activeDefender.temperament : "-"}</div>
              </div>
              <div class="tg-starter-prototype__field">
                <div class="tg-starter-prototype__kicker">VARIANT</div>
                <div class="tg-starter-prototype__field-value">${activeDefender ? activeDefender.variant : "-"}</div>
              </div>
            </div>

            <div class="tg-starter-prototype__detail-stats" aria-label="Defender stats">
              <div class="tg-starter-prototype__field"><div class="tg-starter-prototype__kicker">HP</div><div class="tg-starter-prototype__stat-value">${activeDefender ? activeDefender.hp : "-"}</div></div>
              <div class="tg-starter-prototype__field"><div class="tg-starter-prototype__kicker">ATK</div><div class="tg-starter-prototype__stat-value">${activeDefender ? activeDefender.atk : "-"}</div></div>
              <div class="tg-starter-prototype__field"><div class="tg-starter-prototype__kicker">DEF</div><div class="tg-starter-prototype__stat-value">${activeDefender ? activeDefender.def : "-"}</div></div>
              <div class="tg-starter-prototype__field"><div class="tg-starter-prototype__kicker">SP ATK</div><div class="tg-starter-prototype__stat-value">${activeDefender ? activeDefender.spAtk : "-"}</div></div>
              <div class="tg-starter-prototype__field"><div class="tg-starter-prototype__kicker">SP DEF</div><div class="tg-starter-prototype__stat-value">${activeDefender ? activeDefender.spDef : "-"}</div></div>
              <div class="tg-starter-prototype__field"><div class="tg-starter-prototype__kicker">SPD</div><div class="tg-starter-prototype__stat-value">${activeDefender ? activeDefender.spd : "-"}</div></div>
            </div>

            <div class="tg-starter-prototype__moves">
              <div class="tg-starter-prototype__label">MOVE MODULES</div>
              ${moveList || `<div class="tg-starter-prototype__summary">No moves available in the prototype preview.</div>`}
            </div>
          </aside>
        </div>

        <footer class="tg-starter-prototype__footer">
          <section class="tg-starter-prototype__panel" aria-label="Party slots">
            <div class="tg-starter-prototype__label">LOCKED PARTY / 4 SLOTS</div>
            <div class="tg-starter-prototype__party">${partySlots}</div>
          </section>

          <div class="tg-starter-prototype__actions" aria-hidden="true">
            <div class="tg-starter-prototype__button">RESET LOADOUT</div>
            <div class="tg-starter-prototype__button">BEGIN RUN</div>
          </div>
        </footer>
      </section>
    </div>
  `;
}

// renderStarterRosterPrototype() is a manual-only helper for experimenting with the future layout in isolation.
function renderStarterRosterPrototype(target) {
  const markup = buildStarterRosterPrototypeMarkup();

  if (!target) {
    return markup;
  }

  const resolvedTarget = typeof target === "string" ? document.querySelector(target) : target;
  if (!resolvedTarget) {
    return markup;
  }

  resolvedTarget.innerHTML = markup;
  return resolvedTarget;
}
