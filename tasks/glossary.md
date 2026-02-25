# Glossary & Learnings

## Technical Terms
- **PWA (Progressive Web App)** — A website that can be installed on your phone like a regular app. It works offline and gets an icon on your home screen.
- **Service Worker** — A background script that makes your PWA work offline by caching files. It's why you sometimes see old versions after an update.
- **Vite** — The tool that builds your app's code into something browsers can understand. It also runs a local preview server for development.
- **Supabase** — Your cloud database where photos and backups are stored. Think of it as your app's online storage locker.
- **Supabase Storage Bucket** — A cloud folder inside Supabase used to store files (like image thumbnails and full-size photos).
- **Supabase SQL Editor** — The place in Supabase where you run SQL scripts to create tables, indexes, and security policies.
- **Anonymous Auth** — Login without username/password. The app still gets a user identity in the background so data can stay linked to one person.
- **RLS (Row Level Security)** — Database rules that decide who can read or change each row. It protects user data even when many users share one backend.
- **ELO** — A rating system from chess. Higher number = "better." Used behind the scenes to rank your cat photos and create fair matchups.
- **Build Timestamp** — A date/time string inserted during build so the app can show exactly when that version was shipped.
- **GitHub Pages** — A free hosting service from GitHub that turns your code into a live website. Your app lives at deusnero.github.io/schwubbi.
- **GitHub Actions** — Automation that runs when you push code. Your deploy.yml file tells it to build and publish your app automatically.

## UX/UI Terms
- **Janky / Stuttering** — When an animation doesn't flow smoothly — it stops and starts instead of moving in one continuous motion. In German: "stockend."
- **Favicon** — The tiny icon in the browser tab next to your page title.
- **Manifest** — A settings file that tells the phone what your app is called, what icon to use, and how to display it when installed.
- **Viewport** — The visible area of the screen. When we say "images must stay in the viewport," we mean they can't go off-screen.
- **Keyframes** — Points along an animation path. More keyframes = smoother motion, fewer = choppier.
- **Hero Image** — The main large image shown at the top of the home screen to represent the app's current "featured" photo.
- **Confirmation Modal** — A small popup asking the user to confirm a risky action (like resetting the leaderboard) before it happens.
- **Upload Progress State** — Live status text/counters that show what is currently happening during upload (new, duplicates, failed, queue).

## Programming Concepts
- **Race condition** — When two things happen at almost the same time and cause a bug because they interfere with each other (like the grey image issue).
- **Cache** — Saved copies of files so they load faster. Sometimes causes problems when you update the app but the phone still shows the old saved version.
- **Base path** — The subfolder your app lives in on a server (e.g. `/schwubbi/`). Both the build tool and the router need to know about it, or you get a blank screen.
- **Component** — A reusable building block of your app's UI. For example, `Battle.tsx` is the component that handles one cat-vs-cat matchup.
- **Props** — Data you pass into a component. Like handing someone a note with instructions — the component reads the props and acts accordingly.
- **React Context Provider** — A global state container for React. It lets many screens share the same data without passing props through every level.
- **Upload Queue** — A waiting line of files/batches. New selections can be added while earlier uploads are still running.
- **Deduplication (Dedup)** — Detecting repeated content and skipping extra copies so the same image is not stored twice.
- **Content Hash (SHA-256)** — A fingerprint generated from file content (not filename). If two images have the same hash, they are the same binary content.
- **Backfill** — A one-time process that updates old database rows to include new required fields (like missing image hashes).
- **Unique Index** — A database rule that blocks duplicate values in a column (used here to enforce one row per content hash).
- **Retry with Backoff** — If an upload fails, try again after short waits that increase gradually to reduce stress on network/server.
- **Partial Upload Cleanup** — Deleting already-uploaded pieces (thumb/full) when later steps fail, so broken leftovers do not cause future conflicts.
- **App Lifecycle / Visibility API** — Browser signals (`visibilitychange`, `blur`, `pagehide`) that tell the app when it is hidden, backgrounded, or losing focus.
- **Environment Variable (`VITE_*`)** — A configurable value provided at build time (for example upload password or Supabase keys) without hardcoding logic.
