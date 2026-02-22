# Lessons Learned

## Deployment
- When deploying to a subfolder (e.g. GitHub Pages `/schwubbi/`), both Vite `base` and `BrowserRouter basename` must match — otherwise blank screen
- Add `skipWaiting` and `clientsClaim` to workbox config so PWA updates go live on refresh
- Android caches PWA icons at install time — users must uninstall and re-add to see a new icon

## Images
- `sips -z` stretches non-square images. Crop first (`sips -c`), then resize

## UX
- Raw ELO numbers are meaningless to users. Keep ELO internally for matchmaking, show rank + win rate + W/L instead
