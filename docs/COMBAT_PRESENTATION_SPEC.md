# Combat Presentation Spec

This document is the North Star for THREATGRID Arena combat presentation work. It exists to stop reactive visual guessing and to make future combat changes measurable against real screenshots.

## Architecture Ownership

- Three.js owns the combat world: floor, camera, enemy body, eventual defender body visuals, environment, lighting, and spatial composition.
- HTML owns command UI, HUD, text readouts, inspect modal, battle history, settings, and accessibility/status overlays.
- HTML battlefield sprites are transitional only. Remove them once Three.js replacements are readable and state-safe.
- Combat presentation must mirror existing combat state. It must not create new gameplay state unless a gameplay task explicitly requests it.
- One combat presentation pass should change one layer of ownership at a time.

## Current Migration Order

Stage A:
- Full-screen Three.js combat world.
- 3D enemy/breach owns enemy battlefield visual.
- HTML defenders remain temporarily.
- HTML enemy readout remains.

Stage B:
- Align HTML defenders to the 3D stage.
- Add a presentation adapter from combat state so Three.js can consume clean visual-state data without owning combat rules.

Stage C:
- Render defender placeholders in Three.js.
- Hide HTML defender battlefield sprites.
- Keep party HUD, HP/status, inspect entry points, and command UI in HTML.

Stage D:
- Add camera presets and a virtual-camera-style system.
- Use no extra renderers or canvases.

Stage E:
- Add attack and ability camera focus.
- Add short readable action animations that mirror existing combat events.

Stage F:
- Replace placeholders with local procedural, GLB, WebP, SVG, or sprite assets.
- Every asset must be local, optimized, licensed, and documented.

## Camera Rules

- Use one `PerspectiveCamera`.
- Use one renderer.
- Use one canvas.
- Use named camera presets only.
- Do not add multiple canvases for combat cameras, effects, or inspect views.
- Required future preset names:
  - `defaultBattleView`
  - `activeDefenderView`
  - `enemyThreatView`
  - `attackFocusView`
  - `victoryView`
- Camera changes should mirror combat visual state only.
- Camera changes must not create new combat mechanics, targeting rules, damage rules, or turn order state.
- UI readability wins over cinematic framing.

## Performance Rules

- Keep one active combat renderer.
- Do not run the combat render loop when `screenState` is not `combat`.
- Dispose geometry, materials, textures, and renderer on destroy.
- Do not leave hidden duplicate canvases mounted.
- Do not add postprocessing until the baseline diorama is stable.
- Do not add heavy shadows.
- Do not add bloom, physics, or expensive particle systems during baseline migration.
- Do not add raycasting unless targeting moves into 3D in an explicit future task.
- Do not add external assets without a license record.
- Do not hotlink assets.

## Visual Rules

- Do not add decorative overlays without purpose.
- Do not use random grids, glows, particles, or haze as a substitute for place.
- Combat should read as a 3D tactical JRPG diorama.
- Defenders must feel grounded.
- The enemy must be anchored to a breach, system, corruption source, or environment object.
- UI must not block the important battlefield center.
- HTML UI should feel like tactical overlays attached to the battlefield, not a boxed webpage on top of it.
- Screenshots are required for visual approval whenever browser automation is available.
- If screenshots cannot be captured, report the exact blocker and do not claim visual verification.

## Quality Scoring

Every combat visual pass must report:
- Technical correctness: 0-10.
- Visual composition: 0-10.
- Game feel: 0-10.
- Performance risk: low / medium / high.
- What still looks fake.
- What should not be touched next.

## Screenshot Harness Rule

- Use the screenshot harness before claiming visual success when possible.
- Run it with `node scripts/capture-screenshots.mjs`.
- Save screenshots under `artifacts/screenshots/`.
- The harness must also write `artifacts/screenshots/visual-critic-report.json` and `artifacts/screenshots/visual-critic-report.md`.
- The critic may reject deterministic technical failures, but it must not fake computer-vision judgment.
- Subjective composition items must be labeled as manual review when image understanding is not available.
- Capture before/after frames when practical.
- Use `window.devStartHospitalCombat()` or `window.devStartCombatByThreatId("tg-001")` for deterministic combat capture.
- If deterministic combat entry is unavailable in a future branch, capture menu/globe and report the missing combat-entry hook honestly.
- Do not fake screenshots.

Deterministic critic gates:
- Combat screenshot exists.
- Combat marker exists.
- Combat diorama canvas count equals one.
- Viewport size is recorded.
- No page errors are recorded.
- Combat shell is approximately viewport-sized.
- Diorama mount approximately fills the combat shell.
- Party HUD is visible.
- Command menu is visible.

Manual-review prompts:
- Does combat read as a full-screen 3D battlefield?
- Does the 3D world avoid box-inside-box framing?
- Are defenders grounded or still pasted on?
- Is the enemy anchored to the breach?
- Does command UI block the battlefield center?
- Does party HUD sit bottom-right?
- Are there duplicate enemy/defender representations?
- What still looks fake?

## Deterministic Combat Entry

Automation may use these dev-only helpers:

```js
window.devStartHospitalCombat();
window.devStartCombatByThreatId("tg-001");
```

Guardrails for deterministic helpers:
- They must be dev-only.
- They must not appear in production UI.
- They must not change normal gameplay flow.
- It must not alter combat math, rewards, save state, threat data, or run progression.
- They should exist only to make screenshot verification deterministic.
