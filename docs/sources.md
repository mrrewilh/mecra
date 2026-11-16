# Sources

Domains rotate. Every domain lives in `src/shared/config.js`; update it and this
file together when a site moves.

| Site | How it is scraped | Notes |
|---|---|---|
| `yabancidizi.news` | POST `/search?qr=` then episode HTML → VidMoly embed | 1080p HLS; `vidmoly.biz` embed |
| `liderfilmizle.vip` | `/api/search.php` → page `window._vs` → `/vod/` or `/embed-` | The site 301s to `liderfilmizle.nl`; the player host only accepts a Referer from the domain the page was served from, so keep `res.url` |
| `diziyou.one` | `/?s=` search → episode page → `#diziyouPlayer` | Separate sub (`/episodes/id/`) and dub (`_tr`) rows |
| `hdfilmcehennemi.nl` | search → movie/episode page → `video/embed/ID/` iframe on `hdfilmcehennemi.mobi` → packed `sources` script | Dual TR/Original HLS; TV section is `/yabancidiziizle-14/` |
| `cizgimax.online` | `/api/search/suggest/` → episode slug → inline `serversByLang` | Dzen/Tau MP4, site HLS relay, `/oynat/` + Sibnet/ok.ru embeds; anime + cartoons |
| Anizium | its own `/page/search`, `/anime/get`, `/anime/source` | Requires the weekly `Cf-Control` XOR header |

## Out of scope: fingerprint-gated players

Some players answer differently depending on the TLS fingerprint or browser
shape: `four.pichive.online` passed with curl/impit but returned 403 to Node
`fetch`, which is what Nuvio uses. A provider that only works when the client
impersonates Chrome is a hack and is not shipped. No crypto envelopes, no
proof-of-work gates, no injected keys.

## HDFilmCehennemi traps

- The player iframe lives on `hdfilmcehennemi.mobi`. A Chrome User-Agent without
  `Sec-Fetch-Dest/Mode/Site` is answered with `404 0 bytes`; with them the same
  request returns the player. `http.frameHeaders(parentUrl, embedUrl)` sends the
  set a real iframe navigation does. Same rule bit `play.liderfilm.cc`.
- The embed page carries JSON-LD `VideoObject.contentUrl`, but it is a decoy: it
  is the same file for every item (`…filmakinesimp4-f9gx1M12BwC.mp4`). The real
  URL is the packed `sources: [{file: <var>}]` script.
- The decoder is randomized per request: it reads a `data-*` attribute from a
  hidden element (via `getAttribute`, `attributes[...]` or `dataset`) and appends
  a browser-shape `o=` value. The provider runs the page's own script in a
  minimal DOM (`evaluateScript`) and pulls the attribute by the name the script
  asks for (`domHint`). Do not hardcode the attribute or the `o=` value.
- Search results title their links with HTML entities (`M&uuml;sl&uuml;m`), so
  titles must be decoded (`text.decodeEntities`) before matching TMDB titles.
- Pages the site no longer serves keep their URL and have a trailer iframe or an
  empty `player-container`, and there is no bypass: those titles return no
  streams (e.g. Dune Part Two, Barbie 2023, Game of Thrones).

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
- Separate dub/sub files → separate clearly labelled rows. No merge/proxy.


