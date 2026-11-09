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

Use `--cap` to reproduce NuvioTV's 1 MB limit. ÇizgiMax episode pages around
1.8 MB will be truncated and return no streams; that is a real client limit, not
a provider bug.

## On-device logs

The debugger simulates the contract; it does not render the Nuvio UI. For a real
device, use:

```bash
./scripts/nuvio-logcat.sh
```

and look for `PluginRuntime`, `PluginManager`, `StreamRepository`, and
`Plugin:<provider>`.
