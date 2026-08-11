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

## Region-First Progression

Target player-facing flow:

Globe -> Region Hover/Select -> Sector/State/Province Selection -> City Incident Layer -> Incident Node -> Combat -> Reward/Combat Resolution -> Return To City/Sector/Globe

Region-first progression means the player should understand the world threat layer in broad, readable steps before committing to a specific incident. The globe should first communicate large cyber-pressure zones such as North America, Europe, East Asia, South America, Africa, Oceania, or other future region groups. Selecting a region then reveals fictionalized state, province, or sector entries. Those sectors route into city incident layers that stage actual cyber incidents as places rather than dashboard rows.

City and sector names should be inspired by real geography and infrastructure, but they should not require exact real-world geography knowledge. THREATGRID is a cyber-fantasy roguelike, not a GIS quiz. Use fictionalized sector names that imply infrastructure, threat flavor, and mission tone while staying recognizable enough for the player to orient themselves.

Current first-slice framing:

- Globe node: `tg-001` / Hospital Network Lockout.
- Region: North America.
- Sector: Atlantic Medical Corridor.
- City layer: New York Medical Corridor.
- Incident: Hospital Network Lockout.
- Runtime route today: `game` globe -> `world-city` hospital-lockout -> incident node -> existing combat.

### Region Hover Behavior Contract

Future globe region hover should:

- Highlight broad world regions, not individual city nodes only.
- Make the selected region feel like a cyber-threat zone rather than a flat menu item.
- Use readable atmospheric emphasis: glow bands, arcs, cluster energy, regional pulse fields, or similar restrained effects.
- Avoid exact political border complexity for the MVP if geo-boundary data is not ready.
- Allow approximate region glow, arc, or cluster highlighting for the first implementation.
- Reserve proper region/country polygon boundaries for a later data-backed upgrade.

Example behavior:

- Hover North America -> continent or region pressure glow appears around the relevant globe area.
- Select North America -> sector options appear.
- Select a sector -> city incident layer opens.

Do not require accurate GIS boundaries in the first region-hover pass. The goal is readable game progression, not cartographic precision.

### Sector/State/Province Selection Contract

After selecting a region, show a sector selection layer. This can be an HTML/Three.js hybrid scene or a scoped UI overlay attached to the selected region, but it must feel like a mission route choice rather than a generic list panel.

Example North America sector options:

- Atlantic Medical Corridor.
- Pacific Grid Sector.
- Midwest Logistics Spine.
- Gulf Energy Belt.
- Northern Research Arc.

Current first-slice route:

North America -> Atlantic Medical Corridor -> New York Medical Corridor -> Hospital Network Lockout.

Rules:

- Sector names should be fictionalized but clearly inspired by real places.
- Avoid turning map progression into a geography quiz.
- Each sector should imply cyber infrastructure and threat flavor.
- Each sector can contain multiple future city incident layers.
- Each city layer should represent a cyber incident zone, not an exact recreation of a real city.

### Major Threat Routing Rule

All major player-facing threats should eventually route through at least one world/map layer before combat:

Globe -> Region/Sector/City Context -> Incident Node -> Combat

Direct globe-to-combat is allowed only as:

- Temporary legacy fallback during migration.
- Minor threat quick-start behavior.
- Debug or screenshot-harness route.
- Emergency fallback if a map layer fails to mount.

Current migration status:

- `tg-001` Hospital Network Lockout routes to the `hospital-lockout` city layer.
- Non-hospital nodes still route directly to combat for now.
- This is temporary while region, sector, and city-layer coverage is built out.

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
- `world-region`
- `world-sector`
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
- `world-region` -> `world-sector`
- `world-sector` -> `world-city`
- `world-city` -> `world-sector`
- `world-sector` -> `world-region`
- `world-region` -> `game`

Future full progression transitions:

- `game` -> `world-region`
- `world-region` -> `world-sector`
- `world-sector` -> `world-city`
- `world-city` -> `incident-detail`
- `world-city` -> `combat`
- `incident-detail` -> `combat`
- `combat` -> `reward/combat-resolution`
- `reward/combat-resolution` -> `world-city`
- `reward/combat-resolution` -> `world-sector`
- `reward/combat-resolution` -> `game`

Cleanup rules:

- Hidden scenes must not process input.
- Hidden scenes must stop animation loops or be explicitly gated by `screenState`.
- No hidden globe, region, sector, or city listeners may respond behind combat.
- No duplicate Three.js renderers may remain mounted.
- Only one active Three.js renderer should exist per active scene.
- No map or combat audio should leak across states.
- Exiting a map scene must remove or disable hover holograms.
- Returning from combat must use an explicit return target, such as `world-city` or `game`.
- Region and sector layers must not bloat `js/globe.js`.
- Region, sector, and city scenes should follow the city/combat lifecycle patterns: mount only while active, gate input by `screenState`, stop loops on exit, and dispose resources.

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

Future region shape:

```js
{
  id,
  title,
  worldLayer,
  regionKey,
  displayName,
  inspiredBy,
  centerLatLng,
  approximateBounds,
  threatPressure,
  sectorIds,
  unlockTier,
  summary,
  visualTheme
}
```

Future sector/state/province shape:

```js
{
  id,
  regionKey,
  title,
  sectorType,
  inspiredBy,
  fictionalName,
  cityLayerIds,
  dominantThreatFamilies,
  infrastructureTags,
  recommendedLevel,
  riskIndex,
  summary,
  visualTheme
}
```

Future city layer shape:

```js
{
  id,
  sectorId,
  title,
  cityDisplayName,
  inspiredBy,
  environmentKey,
  sceneKey,
  incidentNodeIds,
  returnTargets,
  visualTheme
}
```

Future incident node shape:

```js
{
  id,
  cityLayerId,
  title,
  severity,
  threatFamily,
  affectedSystem,
  cityPosition,
  buildingKey,
  combatThreatId,
  hologramSummary,
  rewardsPreview,
  status
}
```

Data rules:

- Add fields only when an implementation pass explicitly requests them.
- Metadata must be additive.
- Existing threat objects must continue to work when metadata is missing.
- Do not mutate existing threat objects for presentation state.
- Use adapters before migrating `js/threats.js`.
- Current threats can be mapped to region, sector, city, and incident nodes through route adapters.
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

## Hybrid Tactical / 3D City Map Direction

City incident layers should combine top-down tactical readability with isometric or 3D diorama depth. They should be easy to scan like tactical maps, but still feel like physical places the player is entering.

Use:

- Top-down tactical district clarity.
- Isometric or 3D depth.
- Physical infrastructure landmarks.
- Building rooftops, towers, tunnels, yards, or command rooms as threat-node anchors.
- Dim, moody, Gotham-like cyber atmosphere where appropriate.
- District backgrounds richer than a few boxes.
- Holograms pinned to infrastructure rather than floating as generic panels.

For the New York Medical Corridor, future visual upgrades should consider:

- Dense hospital district massing.
- Emergency roads.
- Ambulance bay.
- Rooftop medical helipad.
- Radiology/EHR tower.
- Backup generator yard.
- Subway or utility tunnel hint.
- Rain or dim night atmosphere if cheap and performant.
- Incident nodes pinned to rooftops, infrastructure cores, or emergency systems.

Avoid:

- Bland few-building dioramas.
- Random panels.
- Generic neon grids.
- Too many map markers.
- Exact real-world copies.
- Overbuilding realism before interaction, routing, and lifecycle are stable.

## New York Medical Corridor Composition Spec

The New York Medical Corridor city layer should be a hybrid top-down/isometric tactical district map with 3D depth. It should read as a hospital campus under ransomware pressure, a tactical mission board, and a cyber-medical infrastructure district. It should not read as a realistic city simulation, a greybox blockout, a cluttered pile of landmarks, or a checklist of procedural props.

This layer exists to stage the `hospital-lockout` city incident. Composition comes before object count.

### Four-Zone District Composition

Use only four primary readable zones.

Zone A: Main Hospital Campus

- Purpose: visual anchor and largest mass.
- Represents the hospital system under pressure.
- Use one connected hospital complex rather than random towers.
- Give it a clear entrance or front face.
- Medical identity should be readable through massing, entrance language, controlled signage, or rooftop structure.
- A subtle rooftop helipad is allowed only if it supports the campus read and does not become the dominant icon.

Zone B: Emergency Intake Route

- Purpose: ambulance, triage, and patient routing.
- Supports the `triage-routing-failure` node.
- Use a simple curved or L-shaped road, driveway, or intake path.
- Include an ambulance bay or intake canopy if it improves readability.
- The road should guide the eye through the district, not dominate the scene.

Zone C: Network / Radiology Core

- Purpose: EHR, radiology, server, and network breach focal point.
- Supports the `hospital-main-lockout` node.
- Use one contained network/radiology structure such as a rooftop array, server core, dish, diagnostic column, or controlled glow column.
- It should feel corrupted, important, and system-critical.
- This is the only zone allowed to compete visually with the main hospital campus.

Zone D: Backup Infrastructure Yard

- Purpose: generator, power, and utility support.
- Supports the `backup-generator-handshake` node.
- Use a compact utility yard.
- Generator blocks or one or two cylinders may be used sparingly.
- This zone should be quieter than the main hospital and network core.

Optional minor element: Dispatch / Comms Point

- Supports the `ambulance-comms-delay` node.
- Keep it small and secondary.
- It may be a mast, dispatch kiosk, comms relay, or marked section of the emergency route.
- It must not become a fifth major zone.

### Focal Hierarchy

The scene hierarchy must be:

1. Main hospital campus.
2. Network/radiology core.
3. Emergency route/intake.
4. Incident nodes.
5. Backup yard/comms props.
6. Background/support buildings.

Rules:

- No object should compete with the hospital unless it is the network/radiology core.
- Roads should guide the eye and explain flow.
- Support buildings should stay dark, simple, and secondary.
- Neon should be reserved for state, threat, route, or diagnostic meaning.
- If every object is bright, important, or equally detailed, the composition has failed.

### Camera And Framing

Use a hybrid top-down/isometric camera.

Requirements:

- High enough to read the whole district layout.
- Angled enough to show 3D depth and object hierarchy.
- Wide enough that the scene is not cramped.
- Close enough that nodes and zone identities remain readable.
- Avoid camera framing that makes props feel like isolated toys.
- Avoid pulling so far back that incident nodes become tiny map dust.

The standard screenshot should show:

- The whole hospital campus.
- The emergency route/intake zone.
- The network/radiology core.
- The backup infrastructure yard.
- All four incident nodes.

### Incident Node Placement Rules

Incident nodes must be attached to infrastructure.

`hospital-main-lockout`:

- Pin to the Network / Radiology Core.
- It should feel like the main breach source.

`triage-routing-failure`:

- Pin to the Emergency Intake Route or ambulance bay.
- It should read as patient routing or admissions trouble.

`backup-generator-handshake`:

- Pin to the Backup Infrastructure Yard.
- It should read as power, generator, or utility system trouble.

`ambulance-comms-delay`:

- Pin to the Dispatch / Comms Point or the emergency road route.
- It should read as dispatch, routing, or field-unit communication delay.

Rules:

- No floating random nodes.
- Every node must have a physical reason to exist.
- Hover holograms should appear near the selected node or connect to it with a subtle line.
- Node styling should not overpower the infrastructure it is attached to.

### Procedural Form Language

Use simple procedural geometry with restraint.

Allowed shapes:

- Large connected slabs for the hospital campus.
- Simple towers only when they clarify hierarchy.
- Thin road strips.
- Small utility blocks.
- One or two cylindrical generator forms.
- One mast, dish, or array if needed for the comms/network read.
- Subtle cables or lines only when they clarify system connections.

Avoid:

- Random orange cylinders.
- Many equal-height boxes.
- Unrelated props.
- Generic sci-fi panels.
- Noisy neon grids.
- Too many colors.
- Landmark checklist thinking.
- Adding objects just because the prompt mentioned them.

### Color And Lighting

Base:

- Dark blue/black city floor.
- Deep green/teal building shadows.
- Bone/silver text and UI accents outside the scene.

Meaning colors:

- Cyan means diagnostics, network systems, scans, or system links.
- Coral/red means active threat, corruption, ransomware pressure, or breach focus.
- Amber/gold means route, priority, emergency lighting, or mission emphasis.
- Green means recovery, safe, or restored state only.

Lighting:

- Moody night.
- Restrained emergency glow.
- No bright toy colors.
- No object should glow unless the glow communicates state.
- Atmosphere should support depth, not hide weak composition.

### UI Relationship

The UI must support the map instead of becoming the map.

Rules:

- The title/header should not cover the main district.
- The return button stays peripheral.
- The district plaque stays small.
- Instruction text stays low priority.
- Hover dossiers should feel attached to selected nodes.
- Avoid huge detached dashboard panels.
- If the player remembers the panel more than the district, the screen has failed.

### Hard Rejection Criteria

Reject the next city implementation if:

- It looks like a pile of boxes.
- It adds many landmarks without composition.
- The hospital identity is only a plus sign.
- Nodes float randomly.
- The road layout is unreadable.
- UI dominates the district.
- Colors feel toy-like.
- It looks more cluttered than the reverted version.
- Screenshot improvement is not obvious.

### Next Implementation Constraints

The next Hospital City implementation should:

- Replace or demote existing clutter rather than layering over it.
- Use fewer, larger, clearer forms.
- Prioritize layout over props.
- Preserve existing behavior, routes, and incident IDs.
- Preserve `world-city` lifecycle and one active city canvas.
- Preserve all four incident nodes.
- Run screenshots and critic.
- Require manual screenshot judgment; deterministic gates alone are not visual approval.

### City Visual Anti-Cycle Rule

For city visual work:

1. Write one spec pass.
2. Do one implementation pass.
3. Do one screenshot critique.
4. Do one replacement pass only if representation is wrong.
5. Then stop and either accept the direction or write an asset/model spec.

Do not keep layering new geometry on top of a bad composition.

## Recommended Module Structure

Small first version:

- `js/world/world-state.js`
- `js/world/world-data.js`
- `js/world/city-incident-scene.js`
- `js/world/world-map-ui.js`

Later expansion:

- `js/world/world-region-scene.js`
- `js/world/world-sector-scene.js`
- `js/world/world-transitions.js`

Ownership rules:

- `js/globe.js` owns the current globe only.
- `js/world/world-state.js` should own world map routing state, active world layer, selected region/sector/city, and return targets.
- `js/world/world-data.js` should adapt existing threat data into region, sector, city, and incident node data without mutating it.
- `js/world/world-region-scene.js` should own future region hover/select lifecycle if the selected layer needs its own scene.
- `js/world/world-sector-scene.js` should own future sector/state/province selection lifecycle.
- `js/world/city-incident-scene.js` should own the city scene lifecycle.
- `js/world/world-map-ui.js` should own city hover holograms and incident detail markup.

## Dev Helpers And Harness Requirements

Future dev helpers:

- `window.devOpenWorldRegion("north-america")`
- `window.devOpenWorldSector("atlantic-medical-corridor")`
- `window.devOpenWorldCity("hospital-lockout")`
- `window.devSelectIncidentNode("tg-001")`
- `window.devWorldState()`
- `window.devReturnToWorldMap()`

Rules:

- Helpers must be dev-only.
- Helpers must not appear in player UI.
- Helpers must not change normal player flow.
- Helpers must not mutate threat data, combat math, rewards, save state, or run progression.
- The screenshot harness should eventually capture globe region hover, region selected, sector selection, city layer, city node hover, city node combat entry, and return behavior.
- Harness reports must not claim visual success without captured screenshots or an explicit blocker.

Future critic checks should include:

- Screen visible opacity and title/header visibility.
- Correct `screenState`.
- Active renderer/canvas count.
- No duplicate listeners or canvases.
- Hover/selection debug state.
- No page errors.

## Implementation Stages

Stage 0: Current city MVP exists.

- `tg-001` Hospital Network Lockout routes from globe to `world-city` hospital-lockout.
- The main hospital city incident node enters existing combat.
- Non-hospital nodes still use direct combat as temporary migration fallback.

Stage 1: Region-to-city progression spec.

- Document region hover, sector selection, city routing, data contracts, visual direction, lifecycle rules, and harness expectations.
- Do not change runtime files in this stage.

Stage 2: Region/sector data adapters only.

- Add planning data for North America and Atlantic Medical Corridor.
- Map current hospital city data through adapters.
- Do not alter threat object shape or gameplay behavior.

Stage 3: Globe region hover MVP.

- Use approximate region highlight, glow, arcs, or cluster emphasis.
- Do not require exact borders.
- Keep `js/globe.js` focused on globe rendering and expose only minimal hooks if needed.

Stage 4: Region select -> sector selection UI/scene.

- Show sector/state/province choices as scene-attached route options.
- Preserve `screenState` boundaries and cleanup.

Stage 5: Sector select -> New York Medical Corridor city layer.

- Route North America -> Atlantic Medical Corridor -> New York Medical Corridor -> `hospital-lockout`.
- Keep city combat entry through existing combat start path.

Stage 6: Upgrade Hospital City visual design into a richer hybrid tactical district.

- Improve city depth, landmarks, building anchors, and district atmosphere.
- Do not redesign region or combat in the same pass.

Stage 7: Route additional major threats through their city layers.

- Add more city/sector adapters for major threats.
- Direct globe-to-combat remains only as legacy/minor/debug fallback.

Stage 8: Future proper geo boundaries and expanded regions.

- Add real region/country polygon boundaries only after the region/sector/city flow is stable.
- Expand additional regions and sectors incrementally.

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
