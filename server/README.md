# Mecra mux server

Nuvio cannot merge two separate streams by itself. This server takes two HLS
sources that differ only in audio and returns one HLS master with selectable
audio tracks.

## Requirements

- Node.js 22+
- `ffmpeg` in `PATH`

## Run

From the repo root:

```bash
MUX_TOKEN=change-me PORT=8787 npm run mux
```

Or from `server/`:

```bash
MUX_TOKEN=change-me PORT=8787 node index.js
```

Then open the plugin config (`src/shared/config.js`) and set:

```js
var MUX_BASE = 'http://YOUR-LAN-IP:8787';
var MUX_TOKEN = 'change-me';
```

Rebuild and push:

```bash
node build.js
git add -A && git commit -m "enable mux" && git push
```

For a public/VPS setup, put it behind HTTPS (Caddy/Nginx) and set
`PUBLIC_BASE_URL=https://mux.example.com` so the generated playlists use the
right host.

## Test

```bash
npm run test:mux
```

It starts a temporary server, asks DiziYou and YabancıDizi for a dual stream, and
checks that the master has two audio tracks and that video/audio segments load.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8787` | HTTP port |
| `MUX_TOKEN` | empty | Require `?token=` on `/mux` |
| `CACHE_DIR` | `server/cache` | HLS session cache |
| `PUBLIC_BASE_URL` | request host | Public URL used in playlists |
| `ALLOWED_HOSTS` | DiziYou/VidMoly/CDN hosts | Comma-separated source host allowlist; `*` allows all public hosts |
| `HLS_TIME` | `4` | Segment length |
| `MASTER_TIMEOUT_MS` | `45000` | Wait for the first segments |
| `CACHE_TTL_MS` | 7 days | Delete old sessions on startup |

`ALLOWED_HOSTS` defaults to `diziyou.one`, `dystream.com`, `vmget.online`,
`vmpx.online`, `vidmoly.biz`, and `vidmoly.me`. Private/localhost targets are
always rejected.

## How it works

`ffmpeg` reads video+audio from the first source and audio from the second,
then writes an HLS event playlist. The server creates the master as soon as the
first video and audio segments exist, so playback starts quickly. The player can
switch between `Orijinal` and `Türkçe Dublaj` in its audio menu. Seeking beyond
the processed point waits until ffmpeg reaches it.

Do not expose the server without `MUX_TOKEN` and an allowlist; it is not meant as
an open proxy.
