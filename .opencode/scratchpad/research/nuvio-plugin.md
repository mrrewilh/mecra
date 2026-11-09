# Nuvio plugin contract

Verified against `NuvioMedia/NuvioTV` on 2026-11-09.

## Two systems

- **Addons** — Stremio protocol, remote HTTP server. Catalogs, meta, streams,
  subtitles, live TV.
- **Plugins** — local QuickJS JS, **streams only**. Installed from a repo
  `manifest.json` under Settings → Content & Discovery → Plugins. Only sideloaded
  Nuvio builds support plugins.

## Provider entrypoint

`getStreams(tmdbId, mediaType, season, episode) -> Promise<stream[]>`

- `mediaType` is `"tv"` or `"series"`.
- Optional exports: `getSubtitles`, `getCatalog`, `getMeta`.
- Export on `module.exports` and `globalThis`; Nuvio accepts either.
- Nuvio passes `season = null` for absolute anime IDs (`kitsu:`, `mal:`,
  `anilist:`, `anidb:`).

## Manifest

```json
{
  "name": "Mecra",
  "version": "0.1.0",
  "author": "…",
  "description": "…",
  "scrapers": [{
    "id": "hdfilmcehennemi",
    "name": "HDFilmCehennemi",
    "version": "0.1.0",
    "filename": "providers/hdfilmcehennemi.js",
    "supportedTypes": ["movie", "tv"],
    "enabled": true,
    "contentLanguage": ["tr"]
  }]
}
```

## Stream fields Nuvio reads

`name`, `title`, `url`, `quality`, `size`, `language`, `headers`, `provider`,
`subtitles`, `infoHash`, and `behaviorHints` (`notWebReady`, `proxyHeaders`,
`bingeGroup`, `filename`, `audioDelayMs`, `audioDelayLanguage`).

## Runtime

- 60 s per provider call.
- 1 MB fetch response cap.
- `fetch`, `URL`, `URLSearchParams`, `console`, cheerio shim, `crypto-js`.
- No Node built-ins (`fs`, `path`, native `crypto`).
- Nuvio loads `providers/<name>.js`, not `src/`.

## Build

- esbuild: `src/<provider>/index.js` → `providers/<name>.js`.
- `format: cjs`, `platform: neutral`, `target: es2016`, external cheerio.
- Commit generated bundles.
