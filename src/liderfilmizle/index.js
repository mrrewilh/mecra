var config = require('../shared/config');
var http = require('../shared/http');
var tmdb = require('../shared/tmdb');
var text = require('../shared/text');
var quality = require('../shared/quality');
var hls = require('../shared/hls');

var BASE = config.sites.liderfilmizle;
var PLAY = config.sites.liderfilmPlay;

function pageHeaders(extra) {
  return http.headers(extra || {});
}

function decodeBase64(value) {
  try {
    var binary = atob(value);
    var encoded = '';
    for (var i = 0; i < binary.length; i++) {
      var hex = binary.charCodeAt(i).toString(16);
      encoded += '%' + (hex.length < 2 ? '0' + hex : hex);
    }
    return decodeURIComponent(encoded);
  } catch (e) {
    return '';
  }
}

async function search(query) {
  var data = await http.fetchJson(BASE + '/api/search.php?q=' + encodeURIComponent(query), {
    headers: pageHeaders({ Referer: BASE + '/' })
  });
  return data && Array.isArray(data.results) ? data.results : [];
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

  return text.bestMatch(
    all,
    titles,
    function (item) {
      return item.title || item.original_title;
    },
    function (item) {
      return info.isTv ? item.type === 'series' : item.type === 'movie';
    }
  );
}

function absoluteUrl(path, base) {
  if (!path) return '';
  if (path.indexOf('http') === 0) return path;
  return new URL(path, base).href;
}

async function resolveVod(sourceUrl, pageUrl) {
  var html = await http.fetchText(sourceUrl, { headers: http.frameHeaders(pageUrl, sourceUrl) });
  if (!html) return null;

  // Prefer the jwplayer source; a generic `file:` match hits subtitle entries first.
  var file = html.match(/sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/i);
  if (!file) file = html.match(/file:\s*["'](\/player\/stream\.php\?url=[^"']+)["']/i);
  if (!file) return null;

  var streamUrl = absoluteUrl(file[1].replace(/\\/g, ''), sourceUrl);
  var subtitles = [];
  var re = /file:\s*["']([^"']+\.vtt[^"']*)["']\s*,\s*label:\s*["']([^"']+)["']/gi;
  var match;
  while ((match = re.exec(html)) !== null) {
    var label = match[2];
    var lower = label.toLowerCase();
    var lang = lower.indexOf('ing') !== -1 || lower.indexOf('eng') !== -1 ? 'en' : 'tr';
    subtitles.push({
      id: 'lider-sub-' + subtitles.length,
      url: absoluteUrl(match[1].replace(/\\/g, ''), sourceUrl),
      lang: lang,
      label: label
    });
  }

  return {
    url: streamUrl,
    quality: '1080p',
    subtitles: subtitles,
    headers: http.headers({ Referer: sourceUrl })
  };
}

async function resolveEmbed(sourceUrl, pageUrl) {
  var html = await http.fetchText(sourceUrl, { headers: http.frameHeaders(pageUrl, sourceUrl) });
  if (!html) return null;

  var iframe = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  var innerUrl = iframe ? iframe[1] : '';
  if (!innerUrl) {
    var guessed = html.match(/https:\/\/[^"']*\/embed-[^"']+\.html/i);
    innerUrl = guessed ? guessed[0] : '';
  }
  if (!innerUrl) return null;
  innerUrl = absoluteUrl(innerUrl, sourceUrl);

  var innerHtml = await http.fetchText(innerUrl, { headers: pageHeaders({ Referer: sourceUrl }) });
  if (!innerHtml) return null;

  var dl = innerHtml.match(/fetch\(['"](\/dl\?[^'"]+)['"]\)/i);
  if (!dl) dl = innerHtml.match(/get\(['"](https?:\/\/[^'"]+\/dl\?[^'"]+)['"]\)/i);
  if (!dl) return null;

  var dlUrl = absoluteUrl(dl[1], innerUrl);
  var origin = new URL(innerUrl).origin;
  var data = await http.fetchJson(dlUrl, {
    headers: pageHeaders({
      Referer: innerUrl,
      Origin: origin
    })
  });
  if (!data || !data.url) return null;

  return {
    url: data.url,
    quality: '1080p',
    subtitles: [],
    headers: http.headers({ Referer: origin + '/', Origin: origin })
  };
}

async function resolveSource(sourceUrl, pageUrl) {
  if (!sourceUrl || sourceUrl.indexOf('youtube.com') !== -1) return null;
  // Player pages now expose a direct jwplayer source; read that first.
  var direct = await resolveVod(sourceUrl, pageUrl);
  if (direct) return direct;
  if (sourceUrl.indexOf('/vod/') !== -1) return null;
  return resolveEmbed(sourceUrl, pageUrl);
}

async function extractStreams(page) {
  // liderfilmizle.vip 301s to liderfilmizle.nl and the player host rejects a
  // Referer from the old domain, so everything after this uses page.url (the
  // URL the document was really served from).
  if (!page || !page.html) return [];
  var html = page.html;

  var vs = html.match(/window\._vs\s*=\s*['"]([^'"]+)['"]/);
  if (!vs) return [];
  var decoded = decodeBase64(vs[1]);
  if (!decoded) return [];

  var sources;
  try {
    sources = JSON.parse(decoded);
  } catch (e) {
    return [];
  }
  if (!Array.isArray(sources)) return [];

  var streams = [];
  for (var i = 0; i < sources.length; i++) {
    var src = sources[i];
    if (!src || !src.url || src.id === 'trailer') continue;
    var resolved = await resolveSource(src.url, page.url);
    if (!resolved || !resolved.url) continue;

    var playUrl = resolved.url.indexOf('#') === -1 ? resolved.url + '#.m3u8' : resolved.url;
    var audio = await hls.inspect(resolved.url, resolved.headers);
    var dual = audio.dual ? hls.label(audio.tracks) : '';
    var title = dual
      ? 'LiderFilm - Dual [' + dual + '] (' + resolved.quality + ')'
      : 'LiderFilm - Türkçe (' + resolved.quality + ')';

    streams.push({
      name: 'LiderFilm',
      title: title,
      url: playUrl,
      quality: resolved.quality,
      format: 'hls',
      isHls: true,
      language: 'tr',
      provider: 'liderfilmizle',
      headers: resolved.headers,
      behaviorHints: { notWebReady: true, proxyHeaders: { request: resolved.headers } },
      subtitles: resolved.subtitles
    });
  }
  return streams;
}

async function findPage(info, show, season, episode) {
  if (!info.isTv) return loadPage(BASE + '/' + show.slug);

  var s = season == null ? 1 : Number(season);
  var e = Number(episode) || 1;
  var page = await loadPage(BASE + '/dizi/' + show.slug + '/sezon-' + s + '/bolum-' + e);
  if (page) return page;

  var absolute =
    season == null ? e : await tmdb.absoluteEpisode(info.id, season, episode, info.seasons);
  if (absolute && absolute !== e) {
    return loadPage(BASE + '/dizi/' + show.slug + '/sezon-1/bolum-' + absolute);
  }
  return null;
}

async function loadPage(url) {
  var page = await http.fetchPage(url, { headers: pageHeaders({ Referer: BASE + '/' }) });
  if (!page || page.html.indexOf('window._vs') === -1) return null;
  return page;
}

async function getStreams(id, mediaType, season, episode) {
  try {
    var info = await tmdb.resolveTmdbInfo(id, mediaType || 'movie');
    var show = await findShow(info);
    if (!show) return [];

    var page = await findPage(info, show, season, episode);
    if (!page) return [];

    var streams = await extractStreams(page);
    console.log(
      '[LiderFilm] ' + (show.title || show.slug) +
      (info.isTv ? ' S' + season + 'E' + episode : ' movie') +
      ' -> ' + streams.length
    );
    return quality.sortStreamsByQuality(streams);
  } catch (e) {
    console.log('[LiderFilm] error: ' + (e && e.message ? e.message : e));
    return [];
  }
}

module.exports = { getStreams: getStreams };
