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

See [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md) for visual implementation rules.
