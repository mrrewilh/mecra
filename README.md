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

`providers/` is generated but committed: Nuvio loads those bundles.

Details and testing notes: `.opencode/scratchpad/README.md`.

## License

GPL-3.0. The Anizium provider is adapted from
[falsisdev/anthology](https://github.com/falsisdev/anthology) (GPL-3.0).
