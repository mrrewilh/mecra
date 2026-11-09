# Provider debugger

`scripts/nuvio-debug.js` runs a provider with the same contract Nuvio uses and
shows what it actually does.

```bash
npm run debug -- mecra/anizium 37854 tv 23 1173 --trace
npm run debug -- compare 37854 tv 23 1173 \
  --providers mecra/anizium,anthology/anizium --trace
npm run debug -- compare 37854 tv 23 1173 \
  --providers mecra/anizium,anthology/anizium --json
```

## What it does

- Calls `getStreams(tmdbId, mediaType, season, episode)`.
- Uses `impit` (Chrome TLS) instead of plain Node fetch.
- Emulates Nuvio's 1 MB fetch cap (`--cap=1048576`, default; `--no-cap` to disable).
- Emulates the 60 s plugin timeout (`--timeout=60000`).
- Logs every request: method, status, bytes, time, truncated flag.
- Hides `process.versions.node` while a provider runs, so reference providers use
  the traced `fetch` instead of their Node `http(s)` fallback.
- Loads reference bundles from `reference/repos/<repo>/providers/<name>.js`.

Provider specs:

- `mecra/<name>` → `providers/<name>.js`
- `anthology/<name>` → `reference/repos/falsisdev_anthology/providers/<name>.js`
- `<repo>/<name>` → `reference/repos/<repo>/providers/<name>.js`
- an explicit `.js` path

## Reading the comparison

```
provider                     time      req   data     streams  status
mecra/anizium               530ms     4     116.5KB  5        ok
anthology/anizium           271ms     5     42.0KB   5        ok
```

Anthology can be faster but wrong: for One Piece S23E1173 it returns the
Fan Letter source (`one-piece-fan-letter`), while Mecra returns `/1173/`.

Serial Experiments Lain (`1087`, S1E1) after the cleanup:

```
mecra/anizium      332ms   3 requests   6.3KB   10 streams
anthology/anizium  369ms   5 requests   8.3KB   10 streams
```

Anizium now logs `tmdb`, `search`, and `source` timings to `Plugin:<id>`, so
`nuvio-logcat.sh` shows which step is slow on a real device.

Use `--cap` to reproduce NuvioTV's 1 MB limit. ÇizgiMax episode pages around
1.8 MB will be truncated and return no streams; that is a real client limit, not
a provider bug.

## Nuvio Desktop in a sandbox

`scripts/nuvio-desktop.sh` runs the real Nuvio Desktop AppImage on an off-screen
Xvfb display (`:99`) with its own HOME under `.deps/gui/`. It never appears on the
user's screen.

```bash
scripts/nuvio-desktop.sh start
scripts/nuvio-desktop.sh shot .deps/gui/shot.png
scripts/nuvio-desktop.sh click 500 400
scripts/nuvio-desktop.sh type "Serial Experiments Lain"
scripts/nuvio-desktop.sh key Return
scripts/nuvio-desktop.sh scroll down 5
scripts/nuvio-desktop.sh stop
```

Tested with Nuvio Desktop `0.1.35-alpha`, Mecra `0.1.5`, and Cinemeta. On
Serial Experiments Lain S1E1 the source list showed all Anizium rows within
~2 seconds while LiderFilm, DiziYou, and ÇizgiMax still said "Alınıyor...".
Anizium is the fastest Mecra provider in that test, not the slowest.

## On-device logs

The debugger simulates the contract; it does not render the Nuvio UI. For a real
device, use:

```bash
./scripts/nuvio-logcat.sh
```

and look for `PluginRuntime`, `PluginManager`, `StreamRepository`, and
`Plugin:<provider>`.
