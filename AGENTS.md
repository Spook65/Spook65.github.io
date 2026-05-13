# THREATGRID UI Direction Rule

Apply this rule to future Codex work in this repository.

## Scope

- UI direction only.
- Default boundary: change only the specific screen/component named in the user’s prompt. If no screen is named, ask for clarification or make the smallest safe UI change. Do not touch unrelated screens.
- Do not touch gameplay logic unless explicitly requested.

## Visual Direction

THREATGRID should not look like generic Codex/AI UI.

Avoid:

- soft corporate gradients used as taste
- random glassmorphism panels
- oversized rounded rectangles everywhere
- generic dark SaaS dashboard look
- fake premium control-room UI
- decorative labels that do not come from THREATGRID lore
- random glows, conic donuts, blobs, or filler shapes
- huge redesigns that break working game systems

THREATGRID is a cyber-myth roguelike battle game, so the UI can still be expressive, sharp, stylized, and game-like when appropriate.

## Design References

Use these only as high-level inspiration:

- Persona 5: bold hierarchy, sharp graphic composition
- Metaphor: ReFantazio: fantasy menu layering and readable drama
- Hades: mythic presence and clear reward screens
- Super Smash Bros / Brawlhalla: roster and slot clarity
- Elden Ring: restrained dark fantasy mood
- Clair Obscur: Expedition 33: elegant, readable combat feedback

Do not copy exact layouts, assets, typography, logos, or names.

## THREATGRID Identity

The game should feel like:

cybersecurity + mythic gods + tactical command interface + roguelike battle ritual

Preferred lore language:

- Protocol Gods
- cursed domains
- Operator suppression order
- Defenders
- corrupted threats
- Tactical Gauge
- enemy intent forecasts
- Pantheon boons
- ROT / FLOOD / future cursed statuses

Avoid making the game feel like a Pokémon clone, a Hades clone, a Persona clone, or a generic AI dashboard.

## UI Traits

Use:

- sharp panels
- asymmetric but readable composition
- strong title hierarchy
- compact combat information
- readable button states
- clear tactical feedback
- dramatic but restrained encounter overlays
- lore-driven labels only
- crisp borders
- subtle glow only when it communicates power or status
- the project’s existing muted dark palette
- bone/silver text, muted teal, restrained gold/coral/violet accents

Avoid:

- random blue-heavy palettes unless already established
- overrounded cards
- overpadded panels
- repeated identical card shapes everywhere
- fake dashboard sections
- floating SaaS shells
- generic premium gradients
- meaningless decorative copy
- random particles
- excessive animation
- style changes that reduce readability

## Implementation Rules

Before changing any UI:

1. Inspect the existing project CSS.
2. Reuse current THREATGRID palette/classes where possible.
3. Keep the change localized.
4. Preserve current gameplay behavior.
5. Improve hierarchy and readability first.
6. Add style only if it supports the game identity.
7. Do not touch unrelated screens.
8. Do not create new systems unless requested.
9. Verify there is no black screen regression.
10. Verify there are no real console errors.

## Priority

Future UI passes should gradually move toward:

- Persona / Metaphor energy for menus and command choices
- Hades-style mythic presence for Pantheon boon encounters
- Smash / Brawlhalla clarity for future character or Defender selection
- Expedition 33-style readable cinematic combat feedback
- Elden Ring-style restraint and atmosphere for lore/world screens

Do not apply all references at once. Each screen should have one clear purpose and one clear inspiration direction.

