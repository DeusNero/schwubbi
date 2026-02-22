# Glossary & Learnings

## Technical Terms
- **PWA (Progressive Web App)** — A website that can be installed on your phone like a regular app. It works offline and gets an icon on your home screen.
- **Service Worker** — A background script that makes your PWA work offline by caching files. It's why you sometimes see old versions after an update.
- **Vite** — The tool that builds your app's code into something browsers can understand. It also runs a local preview server for development.
- **Supabase** — Your cloud database where photos and backups are stored. Think of it as your app's online storage locker.
- **ELO** — A rating system from chess. Higher number = "better." Used behind the scenes to rank your cat photos and create fair matchups.
- **GitHub Pages** — A free hosting service from GitHub that turns your code into a live website. Your app lives at deusnero.github.io/schwubbi.
- **GitHub Actions** — Automation that runs when you push code. Your deploy.yml file tells it to build and publish your app automatically.

## UX/UI Terms
- **Janky / Stuttering** — When an animation doesn't flow smoothly — it stops and starts instead of moving in one continuous motion. In German: "stockend."
- **Favicon** — The tiny icon in the browser tab next to your page title.
- **Manifest** — A settings file that tells the phone what your app is called, what icon to use, and how to display it when installed.
- **Viewport** — The visible area of the screen. When we say "images must stay in the viewport," we mean they can't go off-screen.
- **Keyframes** — Points along an animation path. More keyframes = smoother motion, fewer = choppier.

## Programming Concepts
- **Race condition** — When two things happen at almost the same time and cause a bug because they interfere with each other (like the grey image issue).
- **Cache** — Saved copies of files so they load faster. Sometimes causes problems when you update the app but the phone still shows the old saved version.
- **Base path** — The subfolder your app lives in on a server (e.g. `/schwubbi/`). Both the build tool and the router need to know about it, or you get a blank screen.
- **Component** — A reusable building block of your app's UI. For example, `Battle.tsx` is the component that handles one cat-vs-cat matchup.
- **Props** — Data you pass into a component. Like handing someone a note with instructions — the component reads the props and acts accordingly.
