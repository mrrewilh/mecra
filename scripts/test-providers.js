#!/usr/bin/env node
/**
 * Runs built providers against real sites through the same public contract
 * Nuvio uses: getStreams(tmdbId, mediaType, season, episode).
 */
const path = require('path');
const Module = require('module');

process.env.NODE_PATH = path.join(__dirname, '..', '.deps', 'node_modules');
Module._initPaths();

const TMDB_KEY = process.env.TMDB_API_KEY || '500330721680edb6d5f7f12ba7cd9023';
globalThis.TMDB_API_KEY = TMDB_KEY;

// Nuvio uses a native HTTP client. Node's built-in fetch is blocked by
// Cloudflare on some sources, so local tests use a Chrome-impersonating client.
try {
  const { Impit } = require('impit');
  const client = new Impit({ browser: 'chrome' });
  const fallback = globalThis.fetch;
  globalThis.fetch = function (url, options) {
    return client.fetch(url, options).catch(function () {
      return fallback(url, options);
    });
  };
} catch (error) {
  console.warn('impit unavailable, using Node fetch: ' + error.message);
}

function load(name) {
  return require(path.join(__dirname, '..', 'providers', name + '.js'));
}

function shortUrl(url) {
  if (!url) return '';
  return String(url).split('?')[0].slice(0, 110);
}

const cases = [
  { name: 'hdfilmcehennemi', id: '872585', type: 'movie', label: 'Oppenheimer' },
  { name: 'hdfilmcehennemi', id: '66732', type: 'tv', season: 1, episode: 1, label: 'Stranger Things S1E1' },
  { name: 'liderfilmizle', id: '872585', type: 'movie', label: 'Oppenheimer' },
  { name: 'liderfilmizle', id: '1396', type: 'tv', season: 1, episode: 1, label: 'Breaking Bad S1E1' },
  { name: 'diziyou', id: '1396', type: 'tv', season: 1, episode: 1, label: 'Breaking Bad S1E1' },
  { name: 'yabancidizi', id: '1408', type: 'tv', season: 1, episode: 1, label: 'House M.D. S1E1' },
  { name: 'cizgimax', id: '37854', type: 'tv', season: 1, episode: 1, label: 'One Piece S1E1' },
  { name: 'cizgimax', id: '37854', type: 'tv', season: 23, episode: 1173, label: 'One Piece S23E1173' },
  { name: 'cizgimax', id: '46260', type: 'tv', season: 1, episode: 1, label: 'Naruto S1E1' },
  { name: 'cizgimax', id: '65334', type: 'tv', season: 6, episode: 26, label: 'Miraculous S6E26' },
  { name: 'cizgimax', id: '46922', type: 'tv', season: 1, episode: 1, label: 'Ben 10 Omniverse S1E1' },
  { name: 'anizium', id: '37854', type: 'tv', season: 1, episode: 1, label: 'One Piece S1E1' },
  { name: 'anizium', id: '37854', type: 'tv', season: 23, episode: 1173, label: 'One Piece S23E1173' },
  { name: 'anizium', id: '46260', type: 'tv', season: 1, episode: 1, label: 'Naruto S1E1' }
];

async function probe(stream) {
  const headers = Object.assign({}, stream.headers || {});
  if (!stream.isHls) headers.Range = 'bytes=0-2047';
  try {
    const res = await fetch(stream.url, { headers });
    const type = res.headers && res.headers.get ? res.headers.get('content-type') : '';
    let ok = res.status === 200 || res.status === 206;
    let body = '';
    if (stream.isHls) {
      body = await res.text();
      ok = ok && body.indexOf('#EXTM3U') === 0;
    }
    return { ok, status: res.status, type, body: body.slice(0, 20) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function probeAny(streams) {
  let last = null;
  const limit = Math.min(3, streams.length);
  for (let i = 0; i < limit; i++) {
    last = await probe(streams[i]);
    if (last.ok) return last;
  }
  return last;
}

async function run(item) {
  const provider = load(item.name);
  if (!provider || typeof provider.getStreams !== 'function') {
    return { item, error: 'no getStreams' };
  }
  const started = Date.now();
  let streams;
  try {
    streams = await provider.getStreams(item.id, item.type, item.season, item.episode);
  } catch (error) {
    return { item, error: error.message };
  }
  streams = Array.isArray(streams) ? streams : [];
  const played = streams.length ? await probeAny(streams) : null;
  return { item, streams, played, ms: Date.now() - started };
}

async function main() {
  const only = process.argv[2];
  let failed = 0;

  for (const item of cases) {
    if (only && item.name !== only) continue;
    const result = await run(item);
    console.log('\n=== ' + item.name + ' | ' + item.label + ' ===');

    if (result.error) {
      failed++;
      console.log('FAIL: ' + result.error);
      continue;
    }

    if (!result.streams.length) {
      failed++;
      console.log('FAIL: 0 streams (' + result.ms + ' ms)');
      continue;
    }

    if (!result.played || !result.played.ok) {
      failed++;
      console.log(
        'FAIL: streams found but the first playable one did not load (' +
        JSON.stringify(result.played) + ')'
      );
      continue;
    }

    console.log(
      'PASS: ' + result.streams.length + ' stream(s) in ' + result.ms + ' ms' +
      ' | probe=' + result.played.status + ' ' + (result.played.type || '')
    );
    result.streams.slice(0, 4).forEach((stream, index) => {
      console.log(
        '  [' + (index + 1) + '] ' + stream.title +
        ' | quality=' + (stream.quality || '-') +
        ' | subs=' + ((stream.subtitles && stream.subtitles.length) || 0) +
        '\n      ' + shortUrl(stream.url)
      );
    });
  }

  if (!only) {
    const ep1 = await run({ name: 'anizium', id: '37854', type: 'tv', season: 1, episode: 1 });
    const ep1173 = await run({ name: 'anizium', id: '37854', type: 'tv', season: 23, episode: 1173 });
    const url1 = ep1.streams && ep1.streams[0] && ep1.streams[0].url;
    const url1173 = ep1173.streams && ep1173.streams[0] && ep1173.streams[0].url;
    if (!url1 || !url1173 || url1 === url1173 || url1173.indexOf('1173') === -1) {
      failed++;
      console.log('\nFAIL: Anizium One Piece S1E1 and S23E1173 did not map to different episodes');
    } else {
      console.log('\nPASS: Anizium One Piece S23E1173 maps to episode 1173');
    }

    const cz1 = await run({ name: 'cizgimax', id: '37854', type: 'tv', season: 1, episode: 1 });
    const cz1173 = await run({ name: 'cizgimax', id: '37854', type: 'tv', season: 23, episode: 1173 });
    const czUrl1 = cz1.streams && cz1.streams[0] && cz1.streams[0].url;
    const czUrl1173 = cz1173.streams && cz1173.streams[0] && cz1173.streams[0].url;
    if (!czUrl1 || !czUrl1173 || czUrl1 === czUrl1173) {
      failed++;
      console.log('FAIL: ÇizgiMax One Piece S1E1 and S23E1173 did not map to different episodes');
    } else {
      console.log('PASS: ÇizgiMax One Piece S23E1173 maps to a different episode than S1E1');
    }
  }

  console.log('\n' + (failed ? failed + ' case(s) failed' : 'all cases passed'));
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
