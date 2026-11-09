# Anime episode mapping (Anizium "One Piece")

Verified against the live Anizium API and NuvioTV on 2026-11-09.

- TMDB `37854` has 23 seasons. S21E1 = absolute 892 (sum seasons 1–20, specials
  excluded).
- Anizium `745549414` is one season × 1180 episodes.
- Passing TMDB S21E1 to `/anime/source` returns no groups.
- Searching `"one piece"` returns **One Piece Fan Letter** (movie `278017748`)
  before the series. Anthology takes the first loose match, so it resolves the
  movie source — this is why it looks like the same episode every time.
- Fix: exact title + media-type match, convert S/E to an absolute episode, then
  call `/anime/source?season=1&episode=<absolute>`.
- If `season == null` (absolute anime ID), use the episode number directly.
- Anizium requires the generated `Cf-Control` weekly XOR header; see Anthology
  `src/anizium/index.js`.
- General rule for every absolute-episode source, including Çizgimax.
