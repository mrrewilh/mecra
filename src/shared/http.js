var config = require('./config');

function headers(extra) {
  var out = {
    'User-Agent': config.ua,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
  };
  if (extra) {
    for (var key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) out[key] = extra[key];
    }
  }
  return out;
}

function hostOf(url) {
  try {
    return new URL(String(url)).hostname;
  } catch (e) {
    return '';
  }
}

function registrableDomain(host) {
  var parts = String(host || '').split('.');
  return parts.length > 2 ? parts.slice(-2).join('.') : parts.join('.');
}

// Sec-Fetch-Site for a document requested by a page. Mirrors what browsers send;
// some player hosts reject browser-shaped requests that omit it.
function siteRelation(parentUrl, targetUrl) {
  var from = hostOf(parentUrl);
  var to = hostOf(targetUrl);
  if (!from || !to) return 'cross-site';
  if (from === to) return 'same-origin';
  return registrableDomain(from) === registrableDomain(to) ? 'same-site' : 'cross-site';
}

// Headers for fetching an iframe/embed document. A real browser navigates the
// frame with these; player hosts may 404 anything else that looks like a browser.
function frameHeaders(parentUrl, targetUrl) {
  return headers({
    Referer: parentUrl || '',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Sec-Fetch-Dest': 'iframe',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': siteRelation(parentUrl, targetUrl),
    'Upgrade-Insecure-Requests': '1'
  });
}

var DEFAULT_TIMEOUT = 12000;

function withTimeout(promise, ms) {
  if (typeof setTimeout !== 'function') return promise;
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () {
      reject(new Error('timeout'));
    }, ms || DEFAULT_TIMEOUT);
    promise.then(
      function (value) {
        clearTimeout(timer);
        resolve(value);
      },
      function (error) {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function request(url, options) {
  var ms = (options && options.timeout) || DEFAULT_TIMEOUT;
  return withTimeout(fetch(url, options), ms);
}

async function fetchText(url, options) {
  try {
    var ms = (options && options.timeout) || DEFAULT_TIMEOUT;
    var res = await request(url, options);
    if (!res || !res.ok) return null;
    return await withTimeout(res.text(), ms);
  } catch (e) {
    return null;
  }
}

// Same as fetchText, but also reports the URL the response came from. Sites
// rotate domains with 301s, and some player hosts check the Referer against the
// domain the page actually lives on.
async function fetchPage(url, options) {
  try {
    var ms = (options && options.timeout) || DEFAULT_TIMEOUT;
    var res = await request(url, options);
    if (!res || !res.ok) return null;
    return {
      url: res.url || url,
      html: await withTimeout(res.text(), ms)
    };
  } catch (e) {
    return null;
  }
}

async function fetchJson(url, options) {
  try {
    var ms = (options && options.timeout) || DEFAULT_TIMEOUT;
    var res = await request(url, options);
    if (!res || !res.ok) return null;
    return await withTimeout(res.json(), ms);
  } catch (e) {
    return null;
  }
}

async function fetchStatus(url, options) {
  try {
    var res = await request(url, options);
    return res ? res.status : 0;
  } catch (e) {
    return 0;
  }
}

module.exports = {
  headers: headers,
  frameHeaders: frameHeaders,
  hostOf: hostOf,
  fetchText: fetchText,
  fetchPage: fetchPage,
  fetchJson: fetchJson,
  fetchStatus: fetchStatus
};
