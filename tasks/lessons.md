# Lessons Learned

## Deployment
- When deploying to a subfolder (e.g. GitHub Pages `/schwubbi/`), both Vite `base` and `BrowserRouter basename` must match — otherwise blank screen
- Add `skipWaiting` and `clientsClaim` to workbox config so PWA updates go live on refresh
- Android caches PWA icons at install time — users must uninstall and re-add to see a new icon

## Images
- `sips -z` stretches non-square images. Crop first (`sips -c`), then resize

## UX
- Raw ELO numbers are meaningless to users. Keep ELO internally for matchmaking, show rank + win rate + W/L instead
- If an icon gets too stylized, users stop recognizing it; preserve clear silhouette/readability first, then layer in sketch texture.
- When routing from a finished game into another screen, use history replacement for that transition; otherwise mobile native Back can reopen gameplay state unexpectedly.
- Keep deployment statements strictly consistent with git state; if a user reports behavior that conflicts with expected rollout, verify `git log`/remote status first before giving test instructions.

## Code Quality
- React hook lint rules can fail on synchronous state updates in `useEffect`; scheduling startup work asynchronously (e.g. `setTimeout(..., 0)`) avoids cascading render warnings.
- For `useCallback`, keep dependency arrays aligned with inferred dependencies (`allImages`, `startTournament`, etc.) to avoid preserve-manual-memoization errors.
- When `vite.config.ts` uses a subpath `base` (like `/schwubbi/`), local preview may show only background if Router basename is forced to that subpath on `localhost/`; resolve basename dynamically based on current path.
- Background lifecycle bugs can bypass one handler path; guard at multiple layers (sound playback gate + gameplay progression gate + visibility listeners) so hidden apps cannot continue audio loops.
- Add a `*` catch-all route for SPA safety; if path matching drifts (PWA stale URL or basename mismatch), fallback to home instead of rendering an empty screen.

## CRITICAL — Shared Origin
- Multiple apps on the same GitHub Pages domain (deusnero.github.io) share the SAME origin. Service workers, caches, and localStorage are all shared.
- NEVER run scripts that clear all caches or unregister all service workers — it will affect ALL apps on that domain
- NEVER tell the user to clear site data, cookies, or storage — it will wipe localStorage for ALL apps on the domain, including speak's data
- Only safe to clear: "Cached images and files" (this does NOT touch localStorage)
- Consider moving apps to separate domains or adding cloud backup to prevent data loss
