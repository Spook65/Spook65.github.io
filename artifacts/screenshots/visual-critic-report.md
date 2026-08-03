# Combat Visual Critic Report

- Accepted: true
- Acceptance scope: deterministic technical gates only
- Manual review required: true
- Performance risk: low

## Scores

- Technical correctness: 10/10
- Visual composition: 6/10
- Game feel: 6/10
- UI readability: 8/10

## Deterministic Checks

- PASS: capture-report.json exists and is parseable (required)
- PASS: combat screenshot exists (required)
  /Users/bhann/Documents/cyber-globe/Spook65.github.io/artifacts/screenshots/combat-hospital.png
- PASS: combat marker exists (required)
  marker: composition-alignment-v1
- PASS: combat diorama canvas count equals 1 (required)
  canvasCount: 1
- PASS: viewport size recorded (required)
  1440x900
- PASS: no page errors recorded (required)
  No console error/pageerror entries.
- PASS: combat shell is approximately viewport-sized (required)
  shell: 1440x900
- PASS: diorama mount approximately fills combat shell (required)
  mount: 1440x900
- PASS: party HUD is visible (required)
- PASS: command menu is visible (required)
  visible command buttons: 7
- PASS: enemy readout/status is visible (informational)
- PASS: old HTML enemy sprite is hidden if detectable (informational)
  hidden: true
- PASS: scan VFX screenshot exists (required)
  /Users/bhann/Documents/cyber-globe/Spook65.github.io/artifacts/screenshots/combat-vfx-scan-000ms.png
- PASS: scan VFX burst screenshots exist (required)
  burst frame count: 6
- PASS: best scan VFX frame was identified (required)
  /Users/bhann/Documents/cyber-globe/Spook65.github.io/artifacts/screenshots/combat-vfx-scan-000ms.png
- PASS: scan VFX active frame was observed (required)
  activeVfxCountAtCapture: 1
- PASS: old combat beam hidden during scan VFX capture (required)
  oldBeamHidden: true
- PASS: scan VFX capture kept one diorama canvas (required)
  canvasCount: 1

## Failures

- None for deterministic technical gates.

## Manual Review Rubric

- Does combat read as a full-screen 3D battlefield?
  Inspect combat-hospital.png for full-viewport world ownership rather than a framed inner stage.
- Does the 3D world avoid box-inside-box framing?
  Look for black margins, visible old panel frames, or a diorama that appears trapped inside another container.
- Are defenders grounded or still pasted on?
  Check whether HTML defenders align with stage pads/floor perspective.
- Is the enemy anchored to the breach?
  Confirm the visible enemy-side 3D breach/core owns the threat body presence without duplicate enemy sprites.
- Does command UI block the battlefield center?
  Check whether tactical controls obscure the main action silhouette or preserve readable combat space.
- Does party HUD sit bottom-right?
  Use the screenshot and DOM rects to verify the reserve strip feels anchored to the combat viewport.
- Are there duplicate enemy/defender representations?
  Look for repeated combatants caused by HTML sprites plus 3D placeholders competing for ownership.

## Ability VFX Capture

- Scan screenshot exists: true
- Burst frame count: 6
- Best VFX frame: /Users/bhann/Documents/cyber-globe/Spook65.github.io/artifacts/screenshots/combat-vfx-scan-000ms.png
- Active VFX observed: true
- VFX family captured: scan
- Active VFX count at capture: 1
- Old beam hidden: true
- Canvas count: 1
- Manual review required: true

## What Still Looks Fake

- Automated tooling cannot judge whether the battlefield feels cinematic or grounded without human review.
- Defender grounding and enemy anchoring still require screenshot inspection against the combat presentation spec.
- This critic detects layout/runtime failures, not subjective art quality.

## What Should Not Be Touched Next

- Combat math, targeting, turn order, modules, rewards, Forge, globe, AudioManager, and save data.
- Additional decorative CSS overlays that do not solve a specific composition problem.
- Multiple combat canvases or independent render loops.

## Artifacts

- capture_report: /Users/bhann/Documents/cyber-globe/Spook65.github.io/artifacts/screenshots/capture-report.json
- menu: /Users/bhann/Documents/cyber-globe/Spook65.github.io/artifacts/screenshots/menu.png
- globe: /Users/bhann/Documents/cyber-globe/Spook65.github.io/artifacts/screenshots/globe.png
- combat: /Users/bhann/Documents/cyber-globe/Spook65.github.io/artifacts/screenshots/combat-hospital.png
- combat_resting: /Users/bhann/Documents/cyber-globe/Spook65.github.io/artifacts/screenshots/combat-resting.png
- combat_vfx_scan: /Users/bhann/Documents/cyber-globe/Spook65.github.io/artifacts/screenshots/combat-vfx-scan-000ms.png
- visual_critic_json: /Users/bhann/Documents/cyber-globe/Spook65.github.io/artifacts/screenshots/visual-critic-report.json
- visual_critic_md: /Users/bhann/Documents/cyber-globe/Spook65.github.io/artifacts/screenshots/visual-critic-report.md
