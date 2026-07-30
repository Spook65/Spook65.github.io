# THREATGRID Audio Assets

Runtime audio is currently generated with Web Audio API placeholder tones in `js/audio-manager.js`.

Future audio files should live under this directory as local, optimized assets such as `.ogg`, `.mp3`, or `.wav` files. Prefer short loops and stingers that can be layered by screen state.

Rules:

- Do not hotlink internet audio.
- Do not add unlicensed audio or ripped game audio.
- Use original, licensed, or clearly labeled placeholder assets only.
- User voice memos are acceptable only when intentionally added by the developer.
- Keep background voices rare and atmospheric rather than constant or overwhelming.
- Replace the generated placeholder layers with local assets once the art and audio direction is stable.

Planned groups:

- `music/` for menu, globe, combat, victory, and defeat loops.
- `ambience/` for loadout, Forge, world map, and environment beds.
- `sfx/` for UI confirms, attacks, module calibration, rewards, and stingers.
- `voice/` for rare background barks or deliberately recorded ambience.
