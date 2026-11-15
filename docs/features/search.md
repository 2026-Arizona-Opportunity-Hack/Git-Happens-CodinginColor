---
title: Search
audience: everyone
covers:
  - src/components/SiteSearch.tsx
  - src/lib/search.ts
---

# Search

At the bottom of the sidebar on every page. Type a page or task ("api key", "import", "password") or a donor's name, organization, email or phone, then press Enter to go there. **Ctrl+K** or **/** jumps to it.

It finds only the pages and donors you can see: a board member finds only their own donors.

The search words for each page are the `keywords` in `NAV` in `src/App.tsx`. When you add a page, give it keywords for the words people would type.

Tests: `search.test.ts`.
