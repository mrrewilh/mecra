# Anime episode mapping (Anizium "One Piece")

Verified against the live Anizium API and NuvioTV on 2026-11-09.

- TMDB `37854` has 23 seasons. **S1–S19 are 1-based; S20+ already store absolute
  episode numbers.** S20 = 878–891, S21 = 892–1088, S22 = 1089–1155,
  S23 = 1156–1180. So S23E1173 must map to **1173**, not 1155 + 1173 = 2328.
- Anizium `745549414` is one season × 1180 episodes. CizgiMax is also a flat
  season.
- Passing a wrong absolute (e.g. 2328) to `/anime/source` returns no groups.
- Searching `"one piece"` returns **One Piece Fan Letter** (movie `278017748`)
  before the series. Anthology takes the first loose match, so it resolves the
  movie source — this is why it looks like the same episode every time.
- Fix: exact title + media-type match; use the season episode count from the
  already-fetched TMDB series data. If `episode > season.episode_count`, the number
  is already absolute; else add prior season counts. Then call
  `/anime/source?season=1&episode=<absolute>`.
- **Never fetch `/anime/get` just to resolve a stream.** One Piece's payload is
  ~959 KB (close to Nuvio's 1 MB cap) and is the main reason Anizium felt slow.
  Try the requested `/anime/source` first; if empty, try season 1 + absolute;
  only fall back to `/anime/get` when both fail.
- If `season == null` (absolute anime ID), use the episode number directly.
- Anizium requires the generated `Cf-Control` weekly XOR header.
- General rule for every absolute-episode source, including ÇizgiMax.
