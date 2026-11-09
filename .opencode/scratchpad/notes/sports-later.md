# Sports phase (deferred)

Use `rajhodedara/live-sport-plugin` when the plugin core works.

- Node ≥ 22.
- Before building: `npm run timezone:prepare` and export
  `ICU_TIMEZONE_FILES_DIR="$PWD/.timezone-data/2026f-le"`.
- Scripts: `npm run dev`, `npm run build`, `npm start`, `npm test`,
  `npm run test:e2e-client`, `npm run check-sources`, `npm run test:247`.
- Providers extend `BaseProvider` (`getMatches()`, `resolveStream()`).
- Register a new provider in `src/container.js`,
  `src/services/MatchAggregator.js`, `src/streams.js`, and `src/index.js`
  (route + `STREAM_PREFIXES`).
- YAML providers: `src/providers/yaml` + `YamlProviderBuilder`.
- Turkish gaps: no native Turkish provider. Reuse Anthology
  `anthology_spor.js` endpoints (Taraftarium24, B-In Sports, TRT Spor, etc.).
  ScoreZone already covers Süper Lig; Vavoo has a Turkey catalogue.
- Never deploy scrapers to Render/Vercel/Railway. Use a VPS, Docker, or a tunnel.
