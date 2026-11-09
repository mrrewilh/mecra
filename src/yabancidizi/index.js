var config = require('../shared/config');
var http = require('../shared/http');
var tmdb = require('../shared/tmdb');
var text = require('../shared/text');
var quality = require('../shared/quality');

var BASE = config.sites.yabancidizi;

function pageHeaders() {
  return http.headers({ Referer: BASE + '/' });
}

async function search(query) {
  var data = await http.fetchJson(BASE + '/search?qr=' + encodeURIComponent(query), {
    method: 'POST',
    headers: http.headers({
      Referer: BASE + '/',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/javascript, */*; q=0.01'
    })
  });
  var results = data && data.data && data.data.result;
  return Array.isArray(results) ? results : [];
}

async function findShow(info) {
  var titles = [info.title, info.originalTitle, info.englishTitle];
  var all = [];
  for (var i = 0; i < titles.length; i++) {
    if (!titles[i]) continue;
    var results = await search(titles[i]);
    for (var j = 0; j < results.length; j++) all.push(results[j]);
    if (all.length) break;
  }
  if (!all.length) return null;

  var best = text.bestMatch(
    all,
    titles,
    function (item) {
      return item.s_name;
    },
    function (item) {
      return info.isTv ? item.s_type !== '1' : item.s_type === '1';
    }
  );
  return best || null;
}

function extractVidmoly(html) {
  var out = [];
  var seen = {};
  var re = /<a\b[^>]*href="(https?:\/\/vidmoly\.[^"]+\/(?:dl\/|embed-)([a-zA-Z0-9_-]+))"[^>]*>([\s\S]*?)<\/a>/gi;
  var match;
  while ((match = re.exec(html)) !== null) {
    var id = match[2];
    if (seen[id]) continue;
    seen[id] = true;
    var label = match[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    out.push({ id: id, label: label });
  }
  if (out.length === 0) {
    var idRe = /vidmoly\.[a-z0-9]+\/(?:dl\/|embed-)([a-zA-Z0-9_-]+)/gi;
    while ((match = idRe.exec(html)) !== null) {
      if (seen[match[1]]) continue;
      seen[match[1]] = true;
      out.push({ id: match[1], label: '' });
    }
  }
  return out;
}

async function resolveVidmoly(id) {
  var embed = 'https://vidmoly.biz/embed-' + id + '.html';
  var html = await http.fetchText(embed, {
    headers: http.headers({ Referer: BASE + '/' })
  });
  if (!html) return null;
  var match = html.match(/file\s*:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i);
  return match ? match[1] : null;
}

async function episodePage(slug, season, episode) {
  var s = season == null ? 1 : Number(season);
  var e = Number(episode) || 1;
  var urls = [
    BASE + '/dizi/' + slug + '/sezon-' + s + '/bolum-' + e,
    BASE + '/dizi/' + slug + '/sezon-' + s + '/bolum-' + e + '/'
  ];
  for (var i = 0; i < urls.length; i++) {
    var html = await http.fetchText(urls[i], { headers: pageHeaders() });
    if (html && html.indexOf('vidmoly') !== -1) return html;
  }
  return null;
}

async function findEpisode(info, show, season, episode) {
  var exact = await episodePage(show.s_link, season, episode);
  if (exact) return exact;

  var absolute = season == null ? episode : await tmdb.absoluteEpisode(info.id, season, episode);
  if (absolute && absolute !== Number(episode)) {
    return episodePage(show.s_link, 1, absolute);
  }
  return null;
}

function labelFor(raw) {
  var lower = String(raw || '').toLowerCase();
  if (lower.indexOf('dublaj') !== -1) return 'Türkçe Dublaj';
  if (lower.indexOf('altyaz') !== -1) return 'Türkçe Altyazılı';
  if (lower.indexOf('ingilizce') !== -1) return 'İngilizce Altyazılı';
  return 'Türkçe Altyazılı';
}

async function getStreams(id, mediaType, season, episode) {
  try {
    var info = await tmdb.resolveTmdbInfo(id, mediaType || 'tv');
    if (!info.isTv) return [];
    var show = await findShow(info);
    if (!show) return [];

    var html = await findEpisode(info, show, season, episode);
    if (!html) return [];

    var items = extractVidmoly(html);
    var streams = [];
    var subStream = null;
    var dubStream = null;
    for (var i = 0; i < items.length; i++) {
      var url = await resolveVidmoly(items[i].id);
      if (!url) continue;
      var headers = http.headers({ Referer: 'https://vidmoly.biz/' });
      var label = labelFor(items[i].label);
      var stream = {
        name: 'YabancıDizi',
        title: 'YabancıDizi - ' + label + ' (1080p)',
        url: url,
        quality: '1080p',
        format: 'hls',
        isHls: true,
        language: 'tr',
        provider: 'yabancidizi',
        headers: headers,
        behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } }
      };
      streams.push(stream);
      if (label.indexOf('Dublaj') !== -1) {
        if (!dubStream) dubStream = stream;
      } else if (!subStream) {
        subStream = stream;
      }
    }

    if (config.muxBase && subStream && dubStream) {
      var mux =
        config.muxBase.replace(/\/+$/, '') +
        '/mux?video=' +
        encodeURIComponent(subStream.url) +
        '&audio=' +
        encodeURIComponent(dubStream.url) +
        '&referer=' +
        encodeURIComponent('https://vidmoly.biz/');
      if (config.muxToken) mux += '&token=' + encodeURIComponent(config.muxToken);
      console.log(
        '[YabanciDizi] ' + show.s_name + ' S' + season + 'E' + episode + ' -> dual mux'
      );
      return [
        {
          name: 'YabancıDizi',
          title: 'YabancıDizi - Dual [Orijinal / Türkçe Dublaj] (1080p)',
          url: mux,
          quality: '1080p',
          format: 'hls',
          isHls: true,
          language: 'tr',
          provider: 'yabancidizi',
          headers: {},
          behaviorHints: {},
          subtitles: []
        }
      ];
    }

    console.log('[YabanciDizi] ' + show.s_name + ' S' + season + 'E' + episode + ' -> ' + streams.length);
    return quality.sortStreamsByQuality(streams);
  } catch (e) {
    console.log('[YabanciDizi] error: ' + (e && e.message ? e.message : e));
    return [];
  }
}

module.exports = { getStreams: getStreams };
