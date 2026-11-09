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
  the file has multiple audio streams. Separate dub/sub files need the companion
  `server/` mux (`MUX_BASE` in `src/shared/config.js`); without it, return
  separate rows.
- Anime: map TMDB S/E to absolute episodes and match exact title + type first.
  One Piece is flat (Anizium 1×1180, ÇizgiMax 1×N), so S21E1 must become episode
  892, not season 21.
- Build `src/<provider>/index.js` → `providers/<name>.js` with esbuild (CJS).
  Nuvio loads the bundle; commit it.
- Anthology is GPL-3.0 despite its `package.json` saying MIT. Reference only.

## Commands

```bash
npm install --prefix .deps   # esbuild + test tools
node build.js                # build all providers
npm test                     # scrape real sites, probe the first stream
npm run mux                  # start the optional audio-mux server
npm run test:mux             # verify two audio tracks + playable segments
```

## Details

See `.opencode/scratchpad/README.md` for the plugin contract, source notes,
episode mapping, testing setup, and sports plan.
