# Scratchpad

Long-form notes for Mecra. `AGENTS.md` stays short; details live here.

- `research/nuvio-plugin.md` — plugin contract, manifest, runtime limits, stream fields.
- `research/sources.md` — sites, parser notes, audio rules, licensing.
- `research/anime-episode-mapping.md` — absolute-episode rule and the One Piece case.
- `notes/testing.md` — how the CLI test works and what it proves.
- `notes/sports-later.md` — deferred live-sports phase.

## Status (2026-11-09)

Six providers built and passing against real sites:

- HDFilmCehennemi (movie + TV, dual TR/Original)
- LiderFilm (movie + TV, dual TR/English)
- DiziYou (TV, separate dub/sub rows)
- YabancıDizi (TV, VidMoly)
- ÇizgiMax (anime, scraped page → Tau player)
- Anizium (anime, fixed One Piece absolute mapping)

`npm test` builds first. `server/` is the optional mux service that turns
DiziYou/YabancıDizi dub+sub files into one stream with selectable audio;
`npm run test:mux` verifies it.
