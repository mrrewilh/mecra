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

async function fetchText(url, options) {
  try {
    var res = await fetch(url, options);
    if (!res || !res.ok) return null;
    return await res.text();
  } catch (e) {
    return null;
  }
}

async function fetchJson(url, options) {
  try {
    var res = await fetch(url, options);
    if (!res || !res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function fetchStatus(url, options) {
  try {
    var res = await fetch(url, options);
    return res ? res.status : 0;
  } catch (e) {
    return 0;
  }
}

module.exports = {
  headers: headers,
  fetchText: fetchText,
  fetchJson: fetchJson,
  fetchStatus: fetchStatus
};
