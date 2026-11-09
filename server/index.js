#!/usr/bin/env node
/**
 * Mecra mux server.
 *
 * Nuvio cannot merge two separate audio/video files by itself. This small server
 * turns two HLS sources into one HLS master with selectable audio tracks:
 *
 *   /mux?video=<sub-or-original-hls>&audio=<dub-hls>&referer=<page>
 *
 * ffmpeg remuxes video from the first source and audio from both sources, writes
 * an event playlist, and the server starts serving as soon as the master exists.
 * The player can start while the rest is still processing.
 */
'use strict';

const fs = require('fs');
const fsp = fs.promises;
const http = require('http');
const https = require('https');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 8787;
const CACHE_DIR = path.resolve(process.env.CACHE_DIR || path.join(__dirname, 'cache'));
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const MUX_TOKEN = process.env.MUX_TOKEN || '';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const HLS_TIME = Number(process.env.HLS_TIME) || 4;
const MASTER_TIMEOUT_MS = Number(process.env.MASTER_TIMEOUT_MS) || 45000;
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 7 * 24 * 60 * 60 * 1000;
const DEFAULT_ALLOWED_HOSTS = [
  'diziyou.one',
  'dystream.com',
  'vmget.online',
  'vmpx.online',
  'vidmoly.biz',
  'vidmoly.me'
];
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || DEFAULT_ALLOWED_HOSTS.join(','))
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const jobs = new Map();

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function fail(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message + '\n');
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || host.endsWith('.local')) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  if (match) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function hostAllowed(hostname) {
  const host = hostname.toLowerCase();
  if (isPrivateHost(host)) return false;
  if (!ALLOWED_HOSTS.length) return true;
  for (const rule of ALLOWED_HOSTS) {
    if (rule === '*') return true;
    if (rule.charAt(0) === '*' && host.endsWith(rule.slice(1))) return true;
    if (host === rule || host.endsWith('.' + rule)) return true;
  }
  return false;
}

function validateSource(value, name) {
  if (!value) throw new Error(name + ' is required');
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new Error(name + ' is not a valid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(name + ' must be http(s)');
  }
  if (!hostAllowed(parsed.hostname)) {
    throw new Error(name + ' host is not allowed: ' + parsed.hostname);
  }
  return parsed.href;
}

function sessionId(video, audio, referer) {
  return crypto
    .createHash('sha1')
    .update(video + '|' + audio + '|' + referer)
    .digest('hex')
    .slice(0, 20);
}

function baseUrl(req) {
  if (PUBLIC_BASE_URL) return PUBLIC_BASE_URL;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return proto + '://' + host;
}

function masterPath(id) {
  return path.join(CACHE_DIR, id, 'master.m3u8');
}

async function waitForFile(file, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await fsp.access(file);
      return true;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  return false;
}

function startJob(id, video, audio, referer) {
  if (jobs.has(id)) return jobs.get(id);

  const dir = path.join(CACHE_DIR, id);
  fs.mkdirSync(dir, { recursive: true });

  const args = ['-hide_banner', '-loglevel', 'error', '-y'];
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

  for (const input of [video, audio]) {
    args.push('-user_agent', userAgent);
    if (referer) args.push('-referer', referer);
    args.push('-i', input);
  }

  args.push('-map', '0:v:0');
  args.push('-map', '0:a:0?');
  if (audio) args.push('-map', '1:a:0?');

  args.push('-c', 'copy');
  args.push('-f', 'hls');
  args.push('-hls_time', String(HLS_TIME));
  args.push('-hls_playlist_type', 'event');
  args.push(
    '-var_stream_map',
    audio
      ? 'v:0,agroup:aud a:0,agroup:aud,language:und a:1,agroup:aud,language:tur'
      : 'v:0,agroup:aud a:0,agroup:aud,language:und'
  );
  args.push('-hls_segment_filename', path.join(dir, 'stream_%v', 'seg_%05d.ts'));
  args.push(path.join(dir, 'stream_%v', 'index.m3u8'));

  log('job start', id, new URL(video).hostname, audio ? new URL(audio).hostname : 'no-audio');

  const child = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const job = { id, dir, child, done: false, error: '' };
  jobs.set(id, job);

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text) log('ffmpeg[' + id + ']', text.slice(0, 300));
  });

  child.on('error', (error) => {
    job.error = error.message;
    job.done = true;
    jobs.delete(id);
    log('job error', id, error.message);
  });

  child.on('close', (code) => {
    job.done = true;
    if (code !== 0) {
      job.error = 'ffmpeg exited with ' + code;
      log('job failed', id, job.error);
    } else {
      log('job done', id);
    }
    jobs.delete(id);
  });

  writeMasterWhenReady(id, dir, audio ? 2 : 1).catch((error) => {
    log('master error', id, error.message);
  });

  return job;
}

function rewriteMaster(master, requestBase, id) {
  const lines = master.split(/\r?\n/);
  const out = [];

  for (const line of lines) {
    if (line.indexOf('#EXT-X-MEDIA:TYPE=AUDIO') === 0) {
      let next = line.replace(/URI="([^"]+)"/, (all, uri) => {
        return 'URI="' + requestBase + '/mux/' + id + '/' + uri + '"';
      });
      out.push(next);
      continue;
    }

    if (line && line.charAt(0) !== '#') {
      out.push(requestBase + '/mux/' + id + '/' + line);
      continue;
    }

    out.push(line);
  }

  return out.join('\n');
}

function hasSegment(file) {
  try {
    return fs.readFileSync(file, 'utf8').indexOf('#EXTINF') !== -1;
  } catch (error) {
    return false;
  }
}

async function writeMasterWhenReady(id, dir, audioCount) {
  const video = path.join(dir, 'stream_0', 'index.m3u8');
  const audio1 = path.join(dir, 'stream_1', 'index.m3u8');
  const audio2 = path.join(dir, 'stream_2', 'index.m3u8');
  const started = Date.now();

  while (Date.now() - started < MASTER_TIMEOUT_MS) {
    const ready =
      hasSegment(video) &&
      (!audioCount || (hasSegment(audio1) && (audioCount < 2 || hasSegment(audio2))));
    if (ready) {
      const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
      lines.push(
        '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="group_aud",NAME="Orijinal",' +
          'DEFAULT=YES,LANGUAGE="und",CHANNELS="2",URI="stream_1/index.m3u8"'
      );
      if (audioCount > 1) {
        lines.push(
          '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="group_aud",NAME="T\u00fcrk\u00e7e Dublaj",' +
            'DEFAULT=NO,LANGUAGE="tur",CHANNELS="2",URI="stream_2/index.m3u8"'
        );
      }
      lines.push(
        '#EXT-X-STREAM-INF:BANDWIDTH=3000000,CODECS="avc1.4d401f,mp4a.40.2",AUDIO="group_aud"'
      );
      lines.push('stream_0/index.m3u8');
      await fsp.writeFile(path.join(dir, 'master.m3u8'), lines.join('\n') + '\n');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function contentType(file) {
  if (file.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (file.endsWith('.ts')) return 'video/mp2t';
  if (file.endsWith('.m4s')) return 'video/iso.segment';
  if (file.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

function serveFile(req, res, file) {
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) return fail(res, 404, 'not found');
    const type = contentType(file);
    const range = req.headers.range;
    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Number(match[2]) : stat.size - 1;
        if (start >= stat.size || end >= stat.size || start > end) {
          res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size });
          return res.end();
        }
        res.writeHead(206, {
          'Content-Type': type,
          'Content-Length': end - start + 1,
          'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*'
        });
        return fs.createReadStream(file, { start, end }).pipe(res);
      }
    }
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(file).pipe(res);
  });
}

async function handleMux(req, res, query) {
  if (MUX_TOKEN && query.get('token') !== MUX_TOKEN) return fail(res, 403, 'forbidden');

  let video;
  let audio;
  try {
    video = validateSource(query.get('video'), 'video');
    audio = query.get('audio') ? validateSource(query.get('audio'), 'audio') : '';
  } catch (error) {
    return fail(res, 400, error.message);
  }

  const referer = query.get('referer') || '';
  const id = sessionId(video, audio, referer);
  const master = masterPath(id);

  if (!fs.existsSync(master)) {
    startJob(id, video, audio, referer);
    const ready = await waitForFile(master, MASTER_TIMEOUT_MS);
    if (!ready) return fail(res, 504, 'mux is still starting, retry in a moment');
  }

  const body = await fsp.readFile(master, 'utf8');
  const rewritten = rewriteMaster(body, baseUrl(req), id);
  res.writeHead(200, {
    'Content-Type': 'application/vnd.apple.mpegurl',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(rewritten);
}

async function handleStatic(req, res, pathname) {
  const match = pathname.match(/^\/mux\/([a-f0-9]+)\/(.+)$/);
  if (!match) return fail(res, 404, 'not found');
  const id = match[1];
  const rel = decodeURIComponent(match[2]);
  const root = path.join(CACHE_DIR, id);
  const file = path.resolve(root, rel);
  if (file.indexOf(root + path.sep) !== 0) return fail(res, 403, 'forbidden');
  if (rel.endsWith('.m3u8')) {
    try {
      const body = await fsp.readFile(file, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(body);
    } catch (error) {
      return fail(res, 404, 'not found');
    }
  }
  return serveFile(req, res, file);
}

async function cleanup() {
  try {
    const entries = await fsp.readdir(CACHE_DIR, { withFileTypes: true });
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(CACHE_DIR, entry.name);
      const stat = await fsp.stat(dir);
      if (now - stat.mtimeMs > CACHE_TTL_MS) {
        await fsp.rm(dir, { recursive: true, force: true });
      }
    }
  } catch (error) {}
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, 'http://localhost');
  const pathname = parsed.pathname;

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, jobs: jobs.size }));
  }

  if (pathname === '/mux' || pathname === '/mux/') {
    return handleMux(req, res, parsed.searchParams).catch((error) => {
      log('mux error', error.message);
      fail(res, 500, 'mux failed');
    });
  }

  if (pathname.indexOf('/mux/') === 0) {
    return handleStatic(req, res, pathname).catch(() => fail(res, 500, 'read failed'));
  }

  fail(res, 404, 'not found');
});

fs.mkdirSync(CACHE_DIR, { recursive: true });
cleanup();
server.listen(PORT, () => {
  log('mecra mux listening on http://0.0.0.0:' + PORT);
  log('cache', CACHE_DIR);
});

function shutdown() {
  for (const job of jobs.values()) {
    try {
      job.child.kill('SIGTERM');
    } catch (error) {}
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
