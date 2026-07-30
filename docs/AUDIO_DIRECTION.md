# Audio Direction / Implementation Rules

This document defines future audio rules for THREATGRID Arena. It is planning guidance only; the current project should not add runtime audio playback until a specific implementation pass requests it.

## Direction

Audio should support THREATGRID's cyber-fantasy roguelike tone: serious, dystopian, tactical, and mythic, with occasional chaotic reactions when the game state earns them.

Avoid constant noise. Audio should clarify state and deepen atmosphere, not distract from tactical decisions.

## Browser Autoplay Rule

Browsers restrict autoplay. Future audio must follow this pattern:

- Initialize the audio system silently on page load.
- Do not start audible playback until after the first user gesture.
- The first intentional user action should unlock or resume the audio context.
- If unlock fails, fail quietly and keep the game playable.
- Never block game input on audio availability.

Good unlock candidates:

- `STARTER SETUP`
- `BEGIN RUN`
- `[ MENU ]`
- `[ LOADOUT / MODULES ]`
- `OPEN FORGE`
- combat command buttons
- globe threat node click

## Asset Rules

- Use local placeholder paths first.
- Do not hotlink external audio.
- Do not add random internet audio without a clear license.
- Do not add CDN audio dependencies.
- User voice memos are acceptable local assets only when intentionally added to the repo.
- Placeholder audio must be labeled as placeholder.
- No real audio files should be added until a dedicated audio implementation pass requests them.

## Voice / Ambience Rules

Background voices should be rare ambience, not constant screaming.

Use voice-like layers sparingly:

- low, distant operator chatter
- corrupted radio fragments
- short Protocol God reactions
- brief panic bursts only during high-risk combat states

Avoid:

- constant combat yelling
- repeated jump-scare voices
- comedic spam
- long dialogue over tactical choices

## Required Future Audio States

Future adaptive audio should understand these states:

- menu
- globe
- loadout
- Forge
- combat base
- combat high-risk
- low HP
- enemy major action
- victory
- defeat

These states should map from existing `screenState`, combat phase, active threat severity, party HP, and major enemy action telemetry.

## Adaptive Audio Approach

Use layered audio rather than one monolithic track:

- base loop: screen-specific ambient foundation
- layered tension: risk/severity pressure
- low HP layer: danger texture when party health is low
- combat intensity layer: active battle escalation
- short stingers: clicks, major enemy actions, victory, defeat, Forge calibration result

Layers should fade in/out. Do not abruptly stack loud loops.

## Future Settings

Future settings should include:

- master volume
- music volume
- SFX volume
- ambience volume
- mute all
- reduced panic voices

Settings should persist client-side for the prototype, but should not be treated as secure or authoritative.

## Proposed Future Architecture

When implemented, prefer a small, isolated manager:

- `js/audio-manager.js`
- loaded after core state files and before event-heavy UI files when practical
- no dependency on combat internals beyond public state/event calls
- no hidden playback behind inactive screens

Likely future API:

- `initAudioManager()`
- `unlockAudioFromGesture()`
- `setAudioScreenState(screenState)`
- `setCombatAudioState({ phase, threatSeverity, partyHpRatio, enemyMajorAction })`
- `playStinger(id)`
- `stopAllAudio({ fadeMs })`
- `setAudioSettings(settings)`

The manager should be screen-state gated like the globe hologram fix: if a screen is inactive, it must not continue processing input or starting new playback for that screen.

## Implementation Guardrails

- Do not implement audio during visual-only passes.
- Do not change combat math to support audio.
- Do not add audio assets without license/source notes.
- Do not let combat audio continue behind reward, Forge, loadout, menu, or globe screens.
- Do not add long quizzes or repeated voice prompts as "learning."
- Verify in browser with user gesture unlock.
- Report autoplay behavior honestly.
