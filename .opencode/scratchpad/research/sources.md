# Turkish sources

Domains rotate. Keep every domain in `src/shared/config.js`.

| Site | How it is scraped | Notes |
|---|---|---|
| `yabancidizi.news` | POST `/search?qr=` then episode HTML → VidMoly embed | 1080p HLS; `vidmoly.biz` embed |
| `liderfilmizle.vip` | `/api/search.php` → page `window._vs` → `/vod/` or `/embed-` | Dual TR/English HLS when the master has two audio groups |
| `diziyou.one` | `/?s=` search → episode page → `#diziyouPlayer` | Separate sub (`/episodes/id/`) and dub (`_tr`) rows |
| `hdfilmcehennemi.nl` | homepage/slug search → CloseLoad embed script | Dual TR/Original HLS; TV section is `/yabancidiziizle-14/` |
| `cizgimax.online` | `/api/search/suggest/` → episode slug → inline `serversByLang` | Dzen/Tau MP4, site HLS relay, `/oynat/` + Sibnet/ok.ru embeds; anime + cartoons |
| Anizium | its own `/page/search`, `/anime/get`, `/anime/source` | Requires the weekly `Cf-Control` XOR header |

## ÇizgiMax size limit

Its episode HTML is large (One Piece ~1.8 MB) and Nuvio's QuickJS fetch is capped
at 1 MB, so a build that truncates the body cannot reach the inline
`serversByLang` block. The provider scrapes the site as required; if a Nuvio build
truncates this page, that episode returns no streams. Smaller cartoon pages
(e.g. Miraculous ~0.6 MB) fit. Do not replace this with another site's API.

## Audio

- Nuvio switches audio tracks embedded in one file/HLS master only.
- Label "Dual" only when the master has `#EXT-X-MEDIA:TYPE=AUDIO` (2+ entries) or
  the file has multiple audio streams.
- Separate dub/sub files → separate clearly labelled rows, unless `MUX_BASE` points
  at `server/`. The mux server returns one HLS master with both audio tracks.

## Licensing

- Anthology `LICENSE` is GPL-3.0 even though `package.json` says MIT. Treat
  derivative code as GPL-3.0; do not copy code verbatim into a differently
  licensed repo.
- MoonCrown (`mooncrown04/nuviotr`) was a parser reference only.
- Research clones: `/tmp/opencode/mecra-research/{anthology,mooncrown-nuviotr,live-sport-plugin,nuvio-tv}`.
