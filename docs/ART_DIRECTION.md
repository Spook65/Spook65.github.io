# Art Direction / Visual Implementation Rules

These rules guide future THREATGRID Arena visual work. They exist so visual passes produce reliable game-space improvements instead of vague terminal/dashboard polish.

## Visual Direction

THREATGRID should move away from pure terminal/dashboard UI and toward cyber-fantasy game spaces. Screens should feel like physical places or interactive systems, not just bordered HTML panels.

Current target:
- Cyber-fantasy roguelike.
- Grounded cybersecurity theme.
- Scene-first composition.
- Physical machines, rooms, props, storage racks, diagnostic consoles, and holograms.
- UI attached to the world, not floating as generic boxes.

## Visual Implementation Rule

Before any visual redesign, inspect and report:
- Active render path.
- Exact functions involved.
- Exact files involved.
- Current CSS selectors/classes.
- Whether the screen uses Three.js, HTML/CSS, assets, or mixed rendering.
- Known lifecycle/input risks.

## Prompting Rule

Do not accept vague goals like:
- "Make it better."
- "Make it realistic."
- "Make it premium."
- "Make it less terminal."

Instead, prompts must specify:
- Exact screen.
- Exact render path.
- Exact files allowed.
- Exact files/systems not to touch.
- Screenshot-level visual acceptance criteria.
- Cache-busting requirements.
- Browser verification requirements.

## Scene-First Rule

For major screens, prefer:
- Environment/station/room composition.
- Physical anchors.
- Prop silhouettes.
- Lighting and depth.
- Diegetic UI attached to the environment.
- Clear game interaction states.

Avoid:
- Adding more borders only.
- Adding more glow only.
- Stacking more text panels.
- Shrinking important cards until unreadable.
- Broad global CSS changes.

## Forge Lessons Learned

Forge v1 was mostly the old UI with decorative CSS layers. It added machine/cradle/sparks/smoke elements, but the screen still read as left admin panel, center admin panel, and right admin panel.

Forge v2 improved because it recomposed the screen into a scene-first cyber-blacksmith station:
- The central Forge machine became the dominant object.
- Current-run modules became a storage rack/tray.
- The upgrade preview became a diagnostic console.
- Signal Calibration was embedded into the machine instead of feeling like a detached form panel.

Future passes should follow the same process:
- Audit the active render path.
- Implement one scoped screen change.
- Verify in browser with a cache-busted URL.
- Report limitations honestly.

## Technical Guardrails

Rules:
- Keep visual work screen-scoped.
- Read `docs/COMBAT_PRESENTATION_SPEC.md` before combat presentation, combat camera, combat diorama, battlefield composition, or combat UI/world ownership work.
- Avoid global CSS unless absolutely necessary.
- Preserve existing `data-*` click contracts.
- Preserve mechanics unless the task explicitly says otherwise.
- Use cache-busting for changed CSS/JS.
- Verify active render path in browser.
- Check z-index, pointer-events, overflow, and clipping.
- Hidden screens must not process hover/click/key input.
- Persistent Three.js scenes must be gated by `screenState` and have cleanup/dispose rules.
- Do not hotlink random external assets.
- Use local, legally licensed or original placeholder assets only.
- Do not use ripped or copyrighted game art.

## Verification Checklist

Every visual pass must report:
- Files changed.
- Active render path confirmed.
- Exact functions changed.
- Major classes added/changed.
- Mechanics preserved.
- Cache-busting updated.
- Browser verification result.
- Screenshot-level visual result.
- Known limitations.
