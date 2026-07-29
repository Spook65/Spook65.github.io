# Spook65.github.io

## Security / Prototype Limitations

THREATGRID Arena is currently a single-player browser prototype. Current-run saves, module inventory, rewards, score, and progression are stored client-side for development and portfolio/demo purposes.

Because the game runs in the browser, local save data and gameplay state should not be treated as secure or tamper-proof. Players can modify client-side JavaScript or localStorage through browser developer tools.

Current limitations:
- No sensitive personal data should be stored in localStorage.
- Local scores, rewards, module rolls, and progression are not trusted for competitive use.
- No public leaderboard, trading, multiplayer, or account-based economy should rely on client-side state.
- Future online progression should use a backend-authoritative model where the server validates rewards, inventory changes, combat results, and player progression.

This is acceptable for a single-player prototype, but not for production multiplayer, competitive ranking, or real-money systems.

## Art Direction / Visual Implementation Rules

### Visual Direction

THREATGRID should move away from pure terminal/dashboard UI. Avoid solving visual polish by adding more bordered rectangles, tables, thin-line panels, or dense labels. The target direction is cyber-fantasy roguelike with grounded physical spaces, interactive machinery, readable character/module silhouettes, and atmospheric environments.

### Game Space Over Web UI

Whenever upgrading visuals, prefer turning screens into believable game spaces:
- Forge = cyber-blacksmith station / calibration bay
- Loadout = defender staging bay
- Reward = recovered relic chamber
- Combat = grounded arena / intrusion environment
- Globe = world-threat navigation layer

### Hybrid Web Game Stack

The current project uses vanilla JavaScript modules, HTML, CSS, and Three.js. Use the stack intentionally:
- HTML/CSS for UI overlays, buttons, labels, and layout
- CSS animation for lightweight glow, scan, pulse, smoke, sparks, and hover feedback
- local WebP/PNG/SVG assets for layered backgrounds, props, and icons
- Three.js only for contained 3D objects/scenes where it adds clear value
- GLB/glTF assets are allowed later only if local, optimized, licensed, and properly disposed

### Asset Rules

Do not hotlink external assets. Do not use ripped game assets. Do not add random CDN asset dependencies. Do not add unlicensed art. Prefer local, compressed, optimized assets. If placeholder art is needed, clearly label it as placeholder. Do not pretend placeholder CSS boxes are final realism.

### Screen-Scoped Implementation

Do not make broad global CSS changes for visual experiments. All visual work must be scoped to the target screen. Use screen-specific classes such as:
- `.forge-screen`
- `.forge-shell`
- `.reward-screen`
- `.loadout-screen`

Avoid touching unrelated screens.

### Three.js / Scene Lifecycle Rules

Any new Three.js scene must:
- mount only when its screen is active
- dispose geometry/materials/textures/renderers on exit
- stop animation loops when hidden
- avoid processing pointer/hover events when inactive
- follow the globe hologram lesson: always gate persistent listeners by `screenState`

### Interaction Rules

Visual upgrades must preserve existing mechanics. Do not change gameplay math during visual passes unless explicitly requested. Do not redesign multiple systems at once. Do not break routing, save state, module inventory, combat, globe, or loadout behavior.

### Verification Rules

Every visual pass must verify:
- exact active render path
- cache-busted local browser URL
- screenshot-level visual change
- no clipped controls
- no hidden screen receiving clicks
- z-index and pointer-events are correct
- no console errors
- `node --check` for edited JS
- `git diff --check`

### Current Priority

The first art-direction vertical slice should be Forge / Module Upgrade. The goal is to make Forge feel like a physical cyber-blacksmith room before applying the same approach to reward, loadout, combat, or globe.
