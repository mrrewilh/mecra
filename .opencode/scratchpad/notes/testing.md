# Testing

`npm test` runs `scripts/test-providers.js`. It calls the built providers with
the same contract Nuvio uses:

```js
getStreams(tmdbId, mediaType, season, episode)
```

## What it does

- Loads `providers/<name>.js` (the built bundle, not `src/`).
- Sets a TMDB key for local metadata lookup.
- Wraps global `fetch` with `impit` (Chrome TLS fingerprint) because plain Node
  fetch is Cloudflare-blocked on some sources. Nuvio uses a native HTTP client.
- Probes the first playable stream: HLS must return `#EXTM3U`; MP4 must answer
  `200/206` to a small Range request.
- Asserts One Piece S1E1 and S21E1 resolve to different URLs for both Anizium and
  ÇizgiMax (absolute episode mapping).

## Commands

```bash
npm install --prefix .deps
node build.js
npm test
node scripts/test-providers.js anizium   # one provider
```

## Current cases

HDFilmCehennemi movie + TV, LiderFilm movie + TV, DiziYou, YabancıDizi,
ÇizgiMax One Piece + Naruto + Miraculous + Ben 10, Anizium One Piece + Naruto.

## QuickJS smoke check

The bundles also evaluate in `quickjs-emscripten` and expose `getStreams`.
HDFilmCehennemi's CloseLoad decryptor was verified in QuickJS with the provider's
own `atob` fallback (QuickJS has no native `atob`).
