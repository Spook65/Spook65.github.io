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
