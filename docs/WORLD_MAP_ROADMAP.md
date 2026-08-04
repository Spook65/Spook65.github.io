# World Map / Incident Progression Roadmap

This document defines future map and location-progression direction for THREATGRID Arena. It is documentation only; do not implement full region/state/city maps until scene, audio, and lifecycle foundations are stable.

## Current State

The current globe nodes are MVP incident nodes.

They already provide:

- threat identity
- severity
- latitude/longitude
- city/country text
- target/system narrative
- vector
- risk/profile data derived for the game-facing hologram
- combat entry

They do not yet represent a full nested world map.

## Future Progression Concept

Long-term route flow:

Globe -> Region -> Country/State -> City Incident Map -> Battle -> Reward/Forge -> Return

Intent:

- The globe remains the world-threat navigation layer.
- Region/country/state maps provide route choice and local context.
- City incident maps provide place-first mission staging.
- Combat scenes can load environment art based on incident metadata.
- Rewards and Forge remain between-incident progression beats.

Do not build the full map now.

## World Map Architecture

Chosen architecture: Option C, the hybrid staged approach.

Contract:

- The current globe remains the world-threat entry layer.
- The first deeper map layer should be a focused city incident layer, not a full region/state/city hierarchy.
- City incident rendering must live outside `js/globe.js`.
- Do not put region, state, city, district, incident graph, or route-progression systems directly into `js/globe.js`.
- Future map scene modules should follow the combat diorama lifecycle pattern more than the current persistent globe pattern.
- Only the active map or combat scene may process pointer, hover, keyboard, or animation work.
- Hidden map scenes must either stop their render loop or be explicitly gated by `screenState`.
- Map scenes must not create duplicate Three.js renderers.
- Map routing must preserve existing combat, reward, Forge, loadout, and globe behavior unless an implementation pass explicitly changes that contract.

Reasoning:

- Extending the current globe directly is low cost, but it risks turning the world map into dashboard overlays.
- A full nested world-map rewrite is too much risk before one place-first slice proves the design.
- A separate city incident layer lets the game test deeper world progression while keeping the stable globe as the entry point.

## First Vertical Slice

First playable slice: Hospital Network Lockout City Incident Layer MVP.

Scope:

- One city or hospital district scene.
- Two to four incident nodes.
- Diegetic hover holograms attached to scene locations.
- One main Hospital Network Lockout node that enters the existing combat flow.
- Combat reward or resolution can return to the city layer or the globe.
- No full region, state, country, or procedural city hierarchy yet.

Intent:

- Prove that THREATGRID can move from the globe into a grounded location without becoming another panel stack.
- Let the player feel that a threat exists inside a real infrastructure context.
- Keep the city layer small enough that lifecycle, hover, routing, and screenshot verification can be made reliable.

Out of scope for the first slice:

- Procedural city generation.
- Multiple real regions.
- Country/state selection.
- Persistent route economy.
- New combat mechanics.
- New reward rules.
- New save schema.

## State Machine Contract

Future world progression should use explicit states and allowed transitions.

Planned states:

- `menu`
- `defenders`
- `game`
- `world-city`
- `incident-detail`
- `combat`
- `reward/combat-resolution`

Current compatibility rule:

- `game` remains the current globe state for now.
- Do not rename `game` to `globe` until a dedicated routing migration is requested.

Allowed first-slice transitions:

- `game` -> `world-city`
- `world-city` -> `incident-detail`
- `world-city` -> `combat`
- `incident-detail` -> `combat`
- `combat` -> `reward/combat-resolution`
- `reward/combat-resolution` -> `world-city`
- `reward/combat-resolution` -> `game`

Optional later transitions:

- `game` -> `world-region`
- `world-region` -> `world-state`
- `world-state` -> `world-city`
- `world-city` -> `world-state`
- `world-state` -> `world-region`
- `world-region` -> `game`

Cleanup rules:

- Hidden scenes must not process input.
- Hidden scenes must stop animation loops or be explicitly gated by `screenState`.
- No hidden globe or city listeners may respond behind combat.
- No duplicate Three.js renderers may remain mounted.
- No map or combat audio should leak across states.
- Exiting a map scene must remove or disable hover holograms.
- Returning from combat must use an explicit return target, such as `world-city` or `game`.

Fallback behavior:

- If a future city scene fails to mount, show a simple safe incident list or return to `game`.
- Do not silently skip the city layer and start combat unless the user action explicitly requested combat.
- If Three.js is unavailable, map scenes should fail gracefully without crashing the game.

## Data Contract Proposal

Future map nodes should use an additive planning-only shape:

```js
{
  id,
  title,
  worldLayer,
  region,
  country,
  state,
  city,
  district,
  environmentKey,
  biomeKey,
  sceneKey,
  threatFamily,
  riskIndex,
  severity,
  recommendedLevel,
  coordinates,
  cityPosition,
  unlockTier,
  incidentChain,
  nodeClusterId,
  mapRoute,
  combatThreatId,
  hologramSummary,
  rewardsPreview
}
```

Data rules:

- Add fields only when an implementation pass explicitly requests them.
- Metadata must be additive.
- Existing threat objects must continue to work when metadata is missing.
- Do not mutate existing threat objects for presentation state.
- Use adapters before migrating `js/threats.js`.
- Migrate threat data only after the Hospital City Incident Layer proves itself.
- Keep `location.lat`, `location.lng`, `location.city`, and `location.country` stable.
- `combatThreatId` should point to the existing combat threat source when city nodes are presentation wrappers.
- `riskIndex` is game-facing fiction and should not pretend to be real CVE/CVSS scoring.

## World Layer Visual Direction

World layers must be scene-first.

Use:

- Physical locations.
- Infrastructure silhouettes.
- Diegetic holograms attached to places.
- Incident nodes pinned to recognizable systems.
- Calm but tense mission-map pacing.
- Lighting, depth, and readable spatial anchors.

Avoid:

- Dashboard overlays.
- Flat panels pasted over the globe.
- Random grids.
- More bordered rectangles as a substitute for place.
- Noisy neon decoration.
- Unscoped global CSS.
- Visuals that imply real-world intelligence accuracy beyond the game fiction.

Hospital city visual target:

- Dystopian night hospital district.
- Compromised hospital network tower or core.
- Emergency lights and backup power atmosphere.
- Subtle ambulance, staff, or civic silhouettes only if cheap and readable.
- Holographic incident rings pinned to hospital systems.
- A calm strategic map tone, not combat intensity and not Forge industrial noise.

## Recommended Module Structure

Small first version:

- `js/world/world-state.js`
- `js/world/world-data.js`
- `js/world/city-incident-scene.js`
- `js/world/world-map-ui.js`

Later expansion:

- `js/world/world-region-scene.js`
- `js/world/world-state-scene.js`
- `js/world/world-transitions.js`

Ownership rules:

- `js/globe.js` owns the current globe only.
- `js/world/world-state.js` should own world map routing state and return targets.
- `js/world/world-data.js` should adapt existing threat data without mutating it.
- `js/world/city-incident-scene.js` should own the city scene lifecycle.
- `js/world/world-map-ui.js` should own city hover holograms and incident detail markup.

## Dev Helpers And Harness Requirements

Future dev helpers:

- `window.devOpenWorldCity("hospital-lockout")`
- `window.devSelectIncidentNode("tg-001")`
- `window.devWorldState()`
- `window.devReturnToWorldMap()`

Rules:

- Helpers must be dev-only.
- Helpers must not appear in player UI.
- Helpers must not change normal player flow.
- Helpers must not mutate threat data, combat math, rewards, save state, or run progression.
- The screenshot harness should eventually capture globe, city layer, incident hover, combat, and return behavior.
- Harness reports must not claim visual success without captured screenshots or an explicit blocker.

## Staged Implementation Plan

Stage 1:

- World map spec and data contract docs.

Stage 2:

- Hospital City Incident Layer MVP only.

Stage 3:

- Globe -> city transition for one selected threat or region.

Stage 4:

- City incident nodes and hover holograms.

Stage 5:

- Node -> combat -> reward -> return to city or globe.

Stage 6:

- Region/state hierarchy after the city slice is stable.

Stage 7:

- More districts and environments.

## Future Metadata Concepts

Add only when an implementation pass explicitly requests them:

- `region`
- `country`
- `state`
- `city`
- `district`
- `environmentKey`
- `threatFamily`
- `riskIndex`
- `incidentChain`

These fields should be additive and optional. Existing threats without them must continue to work.

## Example Future Branch

Hospital Network Lockout:

- `region`: North America
- `country`: United States
- `state`: New York
- `city`: New York
- `district`: Medical corridor
- `environmentKey`: hospital-lockout
- `threatFamily`: ransomware
- `riskIndex`: game-facing risk score, not real CVE/CVSS
- `incidentChain`: hospital-ransomware-nyc-01

This could later route to:

- globe node hover: high-level route decision
- region view: North America incident cluster
- state/city view: hospital network lockout map
- combat scene: hospital network / clinical infrastructure environment

## Future Environment Keys

Possible place-first combat environments:

- hospital network
- financial credential center
- transit operations
- smart-city grid
- university network
- cloud data center
- telecom switching hub
- public infrastructure command room

`environmentKey` should eventually select combat background/scene layers, ambience, stingers, and UI copy, but must not change combat math unless explicitly requested.

## Safe Metadata Strategy

When future implementation begins:

- Add metadata to `js/threats.js` as optional fields.
- Keep existing `location.lat`, `location.lng`, `location.city`, and `location.country`.
- Do not remove or rename current fields used by globe, combat, rewards, or hologram logic.
- Update renderers to use fallbacks when metadata is missing.
- Keep map routing gated by `screenState`.
- Keep hidden map layers from processing hover/click events.

## What Not To Build Yet

Do not implement these before scene/audio foundations are stable:

- full country/state/city map stack
- procedural city maps
- selectable district graph
- route economy
- backend map state
- real geospatial datasets
- live CVE/CVSS feeds
- multiplayer/leaderboard progression

## Future Implementation Guardrails

- Audit active render path before map work.
- Keep the globe click-to-combat path stable unless the task explicitly changes routing.
- Prefer one vertical slice first, such as `Hospital Network Lockout -> hospital-lockout combat environment`.
- Make metadata additive.
- Browser-verify every screen transition.
- Check z-index, pointer-events, hidden listener behavior, and cache-busting.
