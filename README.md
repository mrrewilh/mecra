# Mecra

Turkish Nuvio plugin: movies, series, anime, and cartoons.

## Providers

| Provider | Content | Notes |
|---|---|---|
| HDFilmCehennemi | movie + TV | 1080p dual TR/Original HLS |
| LiderFilm | movie + TV | dual TR/English HLS + VTT |
| DiziYou | TV | separate TR sub/dub rows |
| YabancıDizi | TV | VidMoly HLS |
| ÇizgiMax | anime/cartoon | Dzen/Tau MP4, site HLS relay, embeds |
| Anizium | anime | TR dub/sub, 4K; One Piece fixed |

## Install

Add this manifest URL in Nuvio → Settings → Content & Discovery → Plugins:

```
https://raw.githubusercontent.com/<your-user>/mecra/main/manifest.json
```

Only sideloaded Nuvio builds support plugins.

## Develop

```bash
npm install --prefix .deps
node build.js        # build src/<provider>/index.js -> providers/<name>.js
npm test             # scrape real sites and probe the first stream
```

## Debug & compare

`npm run debug` runs a provider with Nuvio's contract, traces every request, and
can emulate Nuvio's 1 MB fetch cap and 60 s timeout:

```bash
# One provider
npm run debug -- mecra/anizium 37854 tv 23 1173 --trace

# Compare Mecra with an Anthology provider
npm run debug -- compare 37854 tv 23 1173 \
  --providers mecra/anizium,anthology/anizium --trace

# JSON output
npm run debug -- compare 37854 tv 23 1173 --providers mecra/anizium,anthology/anizium --json
```

It reports time, request count, downloaded bytes, truncation, stream count, and
the first stream. Reference repos live under `reference/repos/`.

`providers/` is generated but committed: Nuvio loads those bundles.

Details and testing notes: `.opencode/scratchpad/README.md`.

## License

GPL-3.0. The Anizium provider is adapted from
[falsisdev/anthology](https://github.com/falsisdev/anthology) (GPL-3.0).
