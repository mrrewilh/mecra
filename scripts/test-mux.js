#!/usr/bin/env node
/**
 * Starts the mux server, asks the DiziYou and YabancıDizi providers for a dual
 * stream, and verifies the returned HLS master has two audio tracks whose
 * segments load.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const Module = require('module');
const { spawn } = require('child_process');

process.env.NODE_PATH = path.join(__dirname, '..', '.deps', 'node_modules');
Module._initPaths();

const PORT = Number(process.env.MUX_TEST_PORT) || 8788;
const BASE = 'http://127.0.0.1:' + PORT;
const CACHE = '/tmp/mecra-mux-test-cache';
const TOKEN = 'test';
const TMDB_KEY = process.env.TMDB_API_KEY || '500330721680edb6d5f7f12ba7cd9023';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitHealth() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE + '/health');
      if (res.ok) return;
    } catch (error) {}
    await sleep(250);
  }
  throw new Error('mux server did not start');
}

async function firstSegment(playlistUrl) {
  const res = await fetch(playlistUrl);
  if (!res.ok) throw new Error('playlist ' + res.status);
  const body = await res.text();
  const line = body.split('\n').find((entry) => entry && entry.charAt(0) !== '#');
  if (!line) throw new Error('empty playlist');
  const url = new URL(line, playlistUrl).href;
  const segment = await fetch(url);
  return {
    status: segment.status,
    type: segment.headers.get('content-type'),
    bytes: (await segment.arrayBuffer()).byteLength
  };
}

async function checkMux(label, streams) {
  if (!streams || streams.length !== 1) {
    throw new Error(label + ': expected one dual stream, got ' + (streams ? streams.length : 0));
  }
  const stream = streams[0];
  if (!/\/mux\?/.test(stream.url)) throw new Error(label + ': not a mux URL');

  const res = await fetch(stream.url);
  if (!res.ok) throw new Error(label + ': mux HTTP ' + res.status + ' ' + (await res.text()).slice(0, 120));
  const master = await res.text();
  const audio = [...master.matchAll(/#EXT-X-MEDIA:TYPE=AUDIO[^\n]*URI="([^"]+)"/g)].map((m) => m[1]);
  if (audio.length < 2) throw new Error(label + ': found ' + audio.length + ' audio tracks');

  const videoLine = master.split('\n').find((line) => line && line.charAt(0) !== '#');
  if (!videoLine) throw new Error(label + ': no video variant');

  const audioProbe = [];
  for (const uri of audio) {
    audioProbe.push(await firstSegment(uri));
  }
  const videoProbe = await firstSegment(videoLine);

  return {
    label,
    title: stream.title,
    audioTracks: audio.map((uri, index) => {
      const names = [...master.matchAll(/#EXT-X-MEDIA:TYPE=AUDIO[^\n]*NAME="([^"]+)"/g)].map((m) => m[1]);
      return names[index] || 'audio-' + (index + 1);
    }),
    audioProbe,
    videoProbe
  };
}

async function main() {
  fs.rmSync(CACHE, { recursive: true, force: true });

  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: {
      ...process.env,
      PORT: String(PORT),
      CACHE_DIR: CACHE,
      MUX_TOKEN: TOKEN,
      ALLOWED_HOSTS: 'diziyou.one,dystream.com,vmget.online,vmpx.online'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.stdout.on('data', (chunk) => process.stdout.write('  [mux] ' + chunk));
  server.stderr.on('data', (chunk) => process.stdout.write('  [mux:err] ' + chunk));

  try {
    const { Impit } = require('impit');
    const client = new Impit({ browser: 'chrome' });
    const fallback = globalThis.fetch;
    globalThis.fetch = function (url, options) {
      return client.fetch(url, options).catch(function () {
        return fallback(url, options);
      });
    };

    globalThis.TMDB_API_KEY = TMDB_KEY;
    globalThis.MECRA_MUX_BASE = BASE;
    globalThis.MECRA_MUX_TOKEN = TOKEN;

    await waitHealth();

    const diziyou = require(path.join(__dirname, '..', 'providers', 'diziyou.js'));
    const yabancidizi = require(path.join(__dirname, '..', 'providers', 'yabancidizi.js'));

    const results = [];
    results.push(
      await checkMux('DiziYou Breaking Bad S1E1', await diziyou.getStreams('1396', 'tv', 1, 1))
    );
    results.push(
      await checkMux('YabancıDizi The Office S1E1', await yabancidizi.getStreams('2316', 'tv', 1, 1))
    );

    for (const result of results) {
      console.log(
        'PASS ' + result.label + ': audio=[' + result.audioTracks.join(', ') + ']' +
        ' video=' + result.videoProbe.status + ' ' + result.videoProbe.type +
        ' audioSegments=' + result.audioProbe.map((p) => p.status + ' ' + p.type).join(' / ')
      );
    }
    console.log('all mux cases passed');
  } finally {
    server.kill('SIGTERM');
    await sleep(500);
  }
}

main().catch((error) => {
  console.error('FAIL', error.message);
  process.exit(1);
});
