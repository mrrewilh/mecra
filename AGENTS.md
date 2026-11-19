# Mecra — Turkish Nuvio plugin

Own plugin. Plugin-only; sports deferred.

## Sources

`yabancidizi.news`, `liderfilmizle.nl`, `hdfilmcehennemi.nl`, plus Anizium.
Domains rotate — keep them in `src/shared/config.js`. DiziYou and ÇizgiMax are
disabled until they get working domains. Site traps: `docs/sources.md`.

## Rules

- **No hacks.** If a stream needs the site's DRM/AES envelope decrypted, a
  proof-of-work or anti-bot gate solved, a crypto/obfuscation module bundled, or
  keys/tokens added to reach the player, drop the provider. Only the site's own
  search/page/player endpoints are allowed. A player that only answers a
  Chrome-impersonating client is a hack. Selcukflix was removed for this.
- **Scrape the target site.** Do not use another site's API as a content source.
- **Speed is a feature.** A few requests, a few seconds, no brute force, no
  redundant fetches, no bloat. If it is slow, it is broken.
- **Versions are derived, never written.** `scripts/version.js` stamps from the
  latest commit time. Never edit a version by hand. `manifest.json` is generated
  from `providers.json`; CI publishes `manifest.json` + `providers/` to `dist`.
- **Don't commit generated or local files.** `.opencode/`, `.deps/`,
  `node_modules/`, `providers/`, `manifest.json`, `dist/` are ignored. Source is
  `src/` + `providers.json`; CI owns the rest.
- **Flag fragility when you add a source.** Domains and tokens rotate; say so and
  wire the new site into `config.js` + `docs/sources.md` in the same change.

## Contract

Nuvio plugins run in QuickJS and return **streams only**:
`getStreams(tmdbId, mediaType, season, episode)`. 60 s timeout, 1 MB fetch cap.

- Audio: label "Dual" only when the HLS master has `#EXT-X-MEDIA:TYPE=AUDIO` or
  the file has multiple audio streams. Never merge separate dub/sub URLs.
- Anime: map TMDB S/E to absolute episodes and match exact title + type first.
  TMDB One Piece S20+ already stores absolute episode numbers (S23E1173 = 1173);
  older seasons are 1-based. Anizium/ÇizgiMax store it as one flat season.
- Anizium: never call `/anime/get` just to resolve a stream (One Piece is ~959 KB,
  near Nuvio's 1 MB cap). Try `/anime/source`, then season 1 + absolute, then get.

## Commands

```bash
npm install
npm run build       # src/<provider>/index.js -> providers/<name>.js
npm test            # scrape real sites and probe the first stream
npm run dist        # build + stage dist/ for CI
npm run version     # print the commit-stamped version
```

Build `src/<provider>/index.js` → `providers/<name>.js` with esbuild (CJS).
Nuvio loads the published bundle from `dist`; do not commit it.
