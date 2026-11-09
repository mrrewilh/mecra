# Mecra — Turkish Nuvio plugin

Own plugin, not an Anthology fork. Plugin-only; sports deferred.

## Sources

`yabancidizi.news`, `liderfilmizle.vip`, `cizgimax.online`, `diziyou.one`,
`hdfilmcehennemi.nl`, plus Anizium. Domains rotate — keep them in
`src/shared/config.js`.

## Non-obvious rules

- Scrape the target site. Do not use another site's API as a content source.
  A site's own search/player/embed endpoints are fine for resolving its streams.
- Nuvio plugins run in QuickJS and return **streams only**:
  `getStreams(tmdbId, mediaType, season, episode)`. 60 s timeout, 1 MB fetch cap.
- Audio: label "Dual" only when the HLS master has `#EXT-X-MEDIA:TYPE=AUDIO` or
  the file has multiple audio streams. Never merge separate dub/sub URLs.
- Anime: map TMDB S/E to absolute episodes and match exact title + type first.
  TMDB One Piece S20+ already stores absolute episode numbers (S23E1173 = 1173);
  older seasons are 1-based. Anizium/ÇizgiMax store it as one flat season.
- Anizium: never call `/anime/get` just to resolve a stream (One Piece is ~959 KB,
  near Nuvio's 1 MB cap). Try `/anime/source`, then season 1 + absolute, then get.
- Build `src/<provider>/index.js` → `providers/<name>.js` with esbuild (CJS).
  Nuvio loads the bundle; commit it.
- Anthology is GPL-3.0 despite its `package.json` saying MIT. Reference only.

## Commands

```bash
npm install --prefix .deps   # esbuild + test tools
node build.js                # build all providers
npm test                     # scrape real sites, probe the first stream
npm run debug -- compare 37854 tv 23 1173 \
  --providers mecra/anizium,anthology/anizium --trace
```

## Details

See `.opencode/scratchpad/README.md` for the plugin contract, source notes,
episode mapping, testing setup, and sports plan.
