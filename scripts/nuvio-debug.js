#!/usr/bin/env node
/**
 * Nuvio provider debugger / comparator.
 *
 * Runs a provider with the same contract Nuvio uses, optionally emulating
 * Nuvio's 1 MB fetch cap and 60 s timeout, and prints every request it makes.
 *
 * Examples:
 *   node scripts/nuvio-debug.js mecra/anizium 37854 tv 23 1173 --trace
 *   node scripts/nuvio-debug.js compare 37854 tv 23 1173 \
 *     --providers mecra/anizium,anthology/anizium --trace
 *   node scripts/nuvio-debug.js compare 37854 tv 23 1173 --providers mecra/anizium,anthology/anizium --json
 */
'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
process.env.NODE_PATH = path.join(ROOT, '.deps', 'node_modules');
Module._initPaths();

// Reference repos may require cheerio under React Native names.
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'cheerio-without-node-native' || request === 'react-native-cheerio') {
    request = 'cheerio';
  }
  return resolveFilename.call(this, request, parent, isMain, options);
};

const args = process.argv.slice(2);
const options = {
  cap: 1024 * 1024,
  timeout: 60000,
  trace: false,
  json: false,
  providers: []
};

const positional = [];
for (const arg of args) {
  if (arg === '--trace') options.trace = true;
  else if (arg === '--json') options.json = true;
  else if (arg === '--no-cap') options.cap = 0;
  else if (arg.startsWith('--cap=')) options.cap = Number(arg.slice(6)) || 0;
  else if (arg.startsWith('--timeout=')) options.timeout = Number(arg.slice(10)) || 60000;
  else if (arg.startsWith('--providers=')) {
    options.providers = arg
      .slice(12)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  } else {
    positional.push(arg);
  }
}

const mode = positional[0];
const mediaId = positional[1];
const mediaType = positional[2] || 'tv';
const season = positional[3] != null ? Number(positional[3]) : null;
const episode = positional[4] != null ? Number(positional[4]) : null;

function fail(message) {
  console.error(message);
  process.exit(2);
}

if (!mode || !mediaId) {
  fail(
    'usage: node scripts/nuvio-debug.js <provider|compare> <tmdbId> [type] [season] [episode] [--trace] [--json] [--cap=1048576] [--timeout=60000] [--providers=a,b]'
  );
}

function resolveProvider(spec) {
  if (!spec) return null;
  if (fs.existsSync(spec) && spec.endsWith('.js')) return path.resolve(spec);

  if (spec.startsWith('mecra/')) {
    return path.join(ROOT, 'providers', spec.slice(6) + '.js');
  }
  if (spec.startsWith('anthology/')) {
    return path.join(
      ROOT,
      'reference',
      'repos',
      'falsisdev_anthology',
      'providers',
      spec.slice(10) + '.js'
    );
  }
  if (spec.includes('/')) {
    const parts = spec.split('/');
    const repo = parts[0];
    const name = parts.slice(1).join('/');
    return path.join(ROOT, 'reference', 'repos', repo, 'providers', name + '.js');
  }
  return path.join(ROOT, 'providers', spec + '.js');
}

function redact(url) {
  return String(url)
    .replace(/([?&](?:api_key|token|t|s|sig|hash)=)[^&]*/gi, '$1***')
    .replace(/(\/dl\/|\/embed-)[^/?#]+/gi, '$1***')
    .slice(0, 180);
}

function bytesLabel(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + 'MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return bytes + 'B';
}

const { Impit } = require('impit');
const client = new Impit({ browser: 'chrome' });
const nativeFetch = globalThis.fetch;
let trace = null;

globalThis.fetch = async function (url, fetchOptions) {
  const started = Date.now();
  const method = (fetchOptions && fetchOptions.method) || 'GET';
  let res;
  try {
    res = await client.fetch(url, fetchOptions).catch(function () {
      return nativeFetch(url, fetchOptions);
    });
  } catch (error) {
    if (trace) {
      trace.push({
        url: redact(url),
        method,
        status: 0,
        bytes: 0,
        ms: Date.now() - started,
        error: error.message
      });
    }
    throw error;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const bytes = buffer.length;
  const truncated = options.cap > 0 && bytes > options.cap;
  const body = truncated ? buffer.subarray(0, options.cap) : buffer;
  const wrapped = new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers
  });

  if (trace) {
    trace.push({
      url: redact(url),
      method,
      status: res.status,
      bytes: bytes,
      ms: Date.now() - started,
      truncated
    });
  }
  return wrapped;
};

globalThis.TMDB_API_KEY =
  process.env.TMDB_API_KEY || '500330721680edb6d5f7f12ba7cd9023';

function withTimeout(promise, ms) {
  let timer = null;
  const timeout = new Promise(function (resolve, reject) {
    timer = setTimeout(function () {
      reject(new Error('provider timeout after ' + ms + 'ms'));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(function () {
    if (timer) clearTimeout(timer);
  });
}

function loadProvider(spec) {
  const file = resolveProvider(spec);
  if (!file || !fs.existsSync(file)) {
    return { spec, error: 'not found: ' + (file || spec) };
  }
  try {
    delete require.cache[require.resolve(file)];
    const mod = require(file);
    if (!mod || typeof mod.getStreams !== 'function') {
      return { spec, file, error: 'no getStreams export' };
    }
    return { spec, file, mod };
  } catch (error) {
    return { spec, file, error: error.message };
  }
}

async function runProvider(spec) {
  const loaded = loadProvider(spec);
  if (loaded.error) {
    return { provider: spec, error: loaded.error };
  }

  trace = [];
  const started = Date.now();
  let streams = [];
  let error = '';
  const nodeDescriptor = Object.getOwnPropertyDescriptor(process.versions, 'node');
  try {
    // Reference providers use a Node http(s) fallback when they see
    // process.versions.node. Hide it so every provider goes through the traced
    // fetch path (and the optional 1 MB cap).
    Object.defineProperty(process.versions, 'node', {
      value: undefined,
      configurable: true,
      writable: true
    });
    const result = await withTimeout(
      loaded.mod.getStreams(mediaId, mediaType, season, episode),
      options.timeout
    );
    streams = Array.isArray(result) ? result : [];
  } catch (caught) {
    error = caught && caught.message ? caught.message : String(caught);
  } finally {
    if (nodeDescriptor) {
      Object.defineProperty(process.versions, 'node', nodeDescriptor);
    }
  }
  const ms = Date.now() - started;
  const requests = trace.slice();
  trace = null;

  const bytes = requests.reduce((total, request) => total + request.bytes, 0);
  const truncated = requests.filter((request) => request.truncated).length;
  const first = streams[0] || null;

  return {
    provider: spec,
    file: loaded.file,
    ms,
    requests: requests.length,
    bytes,
    truncated,
    streams: streams.length,
    error,
    firstTitle: first ? first.title || first.name || '' : '',
    firstUrl: first ? redact(first.url || '') : '',
    subtitles: first && first.subtitles ? first.subtitles.length : 0,
    trace: requests
  };
}

function printResult(result, showTrace) {
  console.log('\n=== ' + result.provider + ' ===');
  if (result.error) {
    console.log('ERROR: ' + result.error);
    return;
  }
  console.log(
    'time=' + result.ms + 'ms  requests=' + result.requests +
    '  data=' + bytesLabel(result.bytes) +
    (result.truncated ? ' (' + result.truncated + ' truncated)' : '') +
    '  streams=' + result.streams
  );
  if (result.firstTitle) console.log('first: ' + result.firstTitle);
  if (result.firstUrl) console.log('url:   ' + result.firstUrl);
  if (result.subtitles) console.log('subs:  ' + result.subtitles);

  if (showTrace && result.trace) {
    result.trace.forEach(function (request, index) {
      console.log(
        '  #' + (index + 1) + ' ' + request.ms + 'ms ' + request.status + ' ' +
        bytesLabel(request.bytes) + (request.truncated ? ' TRUNCATED' : '') +
        ' ' + request.method + ' ' + request.url
      );
    });
  }
}

async function main() {
  if (mode === 'compare') {
    const specs = options.providers.length
      ? options.providers
      : ['mecra/anizium', 'anthology/anizium'];
    const results = [];
    for (const spec of specs) {
      const result = await runProvider(spec);
      results.push(result);
      if (!options.json) printResult(result, options.trace);
    }

    if (!options.json) {
      console.log('\nprovider                     time      req   data     streams  status');
      for (const result of results) {
        const status = result.error
          ? 'ERROR'
          : result.streams
            ? 'ok'
            : 'no streams';
        console.log(
          result.provider.padEnd(28) +
          String(result.ms + 'ms').padEnd(10) +
          String(result.requests).padEnd(6) +
          bytesLabel(result.bytes).padEnd(9) +
          String(result.streams).padEnd(9) +
          status
        );
      }
    }
    if (options.json) console.log(JSON.stringify(results, null, 2));
    return;
  }

  const result = await runProvider(mode);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printResult(result, options.trace);
  }
  if (result.error || !result.streams) process.exitCode = 1;
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
