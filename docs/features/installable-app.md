---
title: Installable app
audience: everyone
covers:
  - src/components/InstallPrompt.tsx
  - public/sw.js
  - public/manifest.webmanifest
---

# Installable app

The app is a PWA, so board members get their own icon and window. The icon is CIC's logo (`public/icon-192.png`, `icon-512.png`); it isn't marked maskable, because the brackets run to the edges and a mask would crop them.

- **Phones and tablets:** a banner offers to install it. Android shows an Install button; iPhone and iPad show Share → Add to Home Screen directions.
- **Desktop:** use "Install app" in Chrome or Edge.

The service worker (`public/sw.js`) caches only the app shell, so the app opens offline. `/api` data is never cached.
