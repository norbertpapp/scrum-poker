# Changelog

## 2026-07-06

### Features
- log and store last 5 completed voting rounds per room with average, median, mode, and range
- sync voting history through room state so late joiners see same historical round data
- show recent rounds in non-disruptive collapsible dropdown inside the revealed results container

## 2026-06-23

### Features
- add median to revealed session results statistics (`ca94087`, `2026-06-23`)

## 2026-06-08

### Features
- add custom vote emoji picker with meme options for coffee vote (`f82e6e2`, `2026-06-08`)
- change coffee custom vote selection from dropdown to popup picker (`f82e6e2`, `2026-06-08`)

### Fixes
- fix coffee vote emoji updates after vote so reveal shows latest selected emoji (`f82e6e2`, `2026-06-08`)
- fix coffee emoji asset URLs on GitHub Pages subpath deployments via `baseURL` (`a94c1a4`, `2026-06-08`)

### Refactors
- extract public asset path resolution into `usePublicAssetPath` composable (`c4f5544`, `2026-06-08`)

## 2026-06-01

### Features
- add `/changelog` page with server-rendered markdown content
- add participant kick functionality with hidden keyboard shortcut activation (`71eb704`, `2026-05-11`)
- add keyboard navigation and accessibility to poker card selection (`570042b`, `2026-04-30`)
- add dark mode support with theme toggle and system preference detection (`ce7ab8c`, `2026-04-30`)
- add confetti animation for perfect vote alignment and update favicon to SVG (`93087c3`, `2026-04-30`)
- add footer with copyright and GitHub link (`ed3d1b9`, `2026-04-30`)
- add emoji to leave room button (`00294e5`, `2026-04-29`)

### Fixes
- fix changelog API file loading by reading `CHANGELOG.md` from filesystem
- add fallback message when changelog API response is unavailable
- use `baseURL` from runtime config for room URL generation (`ccd4789`, `2026-05-27`)

### Refactors
- move markdown rendering from client page to server API endpoint
- reduce changelog page typography overrides to preserve Uno theme styles
- replace text logo with playing card emoji and increase logo size (`6cd45c9`, `2026-04-30`)
- migrate room code from query parameter to path parameter (`91d3818`, `2026-04-30`)
- shorten leave room button text (`198d492`, `2026-04-30`)
- improve header layout responsiveness and spacing consistency (`0082206`, `2026-04-30`)
- migrate from Tailwind CSS to UnoCSS (`1c54f6e`, `2026-04-30`)

### Docs
- add local font loading and layout shift reduction to roadmap (`6683d24`, `2026-05-27`)

### Chore
- add `sanitize-html` dependency and sanitize changelog HTML before `v-html`
- add footer link to `/changelog`
- enable UnoCSS typography preset (`presetTypography`)
- add `package-lock.json` for WebSocket server dependencies (`c35281c`, `2026-04-30`)

### Cleanup
- remove bolt config file (`ea1cdc3`, `2026-06-01`)
