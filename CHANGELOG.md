# Changelog

## 2026-06-01

### Features
- add participant kick functionality with hidden keyboard shortcut activation (`71eb704`, `2026-05-11`)
- add keyboard navigation and accessibility to poker card selection (`570042b`, `2026-04-30`)
- add dark mode support with theme toggle and system preference detection (`ce7ab8c`, `2026-04-30`)
- add confetti animation for perfect vote alignment and update favicon to SVG (`93087c3`, `2026-04-30`)
- add footer with copyright and GitHub link (`ed3d1b9`, `2026-04-30`)
- add emoji to leave room button (`00294e5`, `2026-04-29`)

### Fixes
- use `baseURL` from runtime config for room URL generation (`ccd4789`, `2026-05-27`)

### Refactors
- replace text logo with playing card emoji and increase logo size (`6cd45c9`, `2026-04-30`)
- migrate room code from query parameter to path parameter (`91d3818`, `2026-04-30`)
- shorten leave room button text (`198d492`, `2026-04-30`)
- improve header layout responsiveness and spacing consistency (`0082206`, `2026-04-30`)
- migrate from Tailwind CSS to UnoCSS (`1c54f6e`, `2026-04-30`)

### Docs
- add local font loading and layout shift reduction to roadmap (`6683d24`, `2026-05-27`)

### Chore
- add `package-lock.json` for WebSocket server dependencies (`c35281c`, `2026-04-30`)

### Cleanup
- remove bolt config file (`ea1cdc3`, `2026-06-01`)
