var config = require('../shared/config');
var http = require('../shared/http');
var tmdb = require('../shared/tmdb');
var text = require('../shared/text');
var quality = require('../shared/quality');
var b64 = require('../shared/b64');

var BASE = config.sites.cizgimax;
var TAU = config.sites.tauVideo;

function pageHeaders(extra) {
  return http.headers(extra || { Referer: BASE + '/' });
}

function parseSearch(html) {
  var items = [];
  var tagRe = /<a\b[^>]*>/gi;
  var match;
  while ((match = tagRe.exec(html)) !== null) {
    var tag = match[0];
    if (tag.indexOf('film-name') === -1 && tag.indexOf('phc-title') === -1) continue;
    var href = tag.match(/href="([^"]+)"/i);
    if (!href) continue;
    var url = href[1];
    if (url.indexOf('/diziler/') === -1 && url.indexOf('/film/') === -1) continue;
    var inner = html.slice(match.index + tag.length, match.index + tag.length + 220);
    var title = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!title) continue;
    items.push({ url: url.indexOf('http') === 0 ? url : BASE + url, title: title });
  }
  return items;
}

async function searchSuggest(query) {
  var data = await http.fetchJson(
    BASE + '/api/search/suggest/?q=' + encodeURIComponent(query),
    { headers: pageHeaders() }
  );
  var animes = (data && data.animes) || [];
  var out = [];
  for (var i = 0; i < animes.length; i++) {
    var item = animes[i];
    if (!item || !item.url) continue;
    out.push({
      url: item.url.indexOf('http') === 0 ? item.url : BASE + item.url,
      title: item.name || ''
    });
  }
  return out;
}

async function findShowPage(info, titles) {
  var all = [];
  for (var i = 0; i < titles.length; i++) {
    if (!titles[i]) continue;
    var html = await http.fetchText(BASE + '/ara/?q=' + encodeURIComponent(titles[i]), {
      headers: pageHeaders()
    });
    if (!html) continue;
    var items = parseSearch(html);
    for (var j = 0; j < items.length; j++) all.push(items[j]);
    if (all.length) break;
  }
  return text.bestMatch(all, titles, function (item) {
    return item.title;
  });
}

function titleVariants(title) {
  var raw = String(title || '').trim();
  var out = [];
  if (!raw) return out;
  out.push(raw);
  var head = raw.split(/\s*[:\-\u2013\u2014]\s*/)[0].trim();
  if (head && head !== raw) out.push(head);
  var words = raw.split(/\s+/);
  if (words.length > 2) out.push(words.slice(0, 2).join(' '));
  return out;
}

async function findShow(info) {
  var titles = [info.title, info.originalTitle, info.englishTitle];
  var queries = [];
  var seen = {};
  for (var t = 0; t < titles.length; t++) {
    var variants = titleVariants(titles[t]);
    for (var v = 0; v < variants.length; v++) {
      var key = text.clean(variants[v]);
      if (key && !seen[key]) {
        seen[key] = true;
        queries.push(variants[v]);
      }
    }
  }

  for (var i = 0; i < queries.length; i++) {
    var items = await searchSuggest(queries[i]);
    if (!items.length) continue;
    var best = text.bestMatch(items, titles, function (item) {
      return item.title + ' ' + item.url;
    });
    if (best) return best;
    return items[0];
  }

  return findShowPage(info, titles);
}

function slugFromShowUrl(url) {
  var match = String(url).match(/\/(?:diziler|film)\/([^\/]+)\/?$/);
  return match ? match[1] : '';
}

function stripSuffix(slug) {
  return String(slug || '').replace(/-izle$/, '').replace(/-izle-\d+$/, '');
}

async function tryEpisodePage(url) {
  var html = await http.fetchText(url, { headers: pageHeaders() });
  if (!html) return null;
  if (html.indexOf('serversByLang') === -1 && html.indexOf('var servers') === -1) return null;
  return { html: html, url: url };
}

function parseEpisodeLinks(html) {
  var links = [];
  var seen = {};
  var re = /href="\/([^"\/]+)-(\d+)-sezon-(\d+)-bolum-izle\/?"/gi;
  var match;
  while ((match = re.exec(html)) !== null) {
    var key = match[1] + ':' + match[2] + ':' + match[3];
    if (seen[key]) continue;
    seen[key] = true;
    links.push({
      url: BASE + '/' + match[1] + '-' + match[2] + '-sezon-' + match[3] + '-bolum-izle/',
      season: Number(match[2]),
      episode: Number(match[3])
    });
  }
  return links;
}

async function findEpisode(info, show, season, episode) {
  var slug = stripSuffix(slugFromShowUrl(show.url));
  if (!slug) return null;

  var s = season == null ? 1 : Number(season);
  var e = Number(episode) || 1;
  var first = await tryEpisodePage(BASE + '/' + slug + '-' + s + '-sezon-' + e + '-bolum-izle/');
  if (first) return first;

  var absolute = season == null ? e : await tmdb.absoluteEpisode(info.id, season, episode);
  if (absolute && absolute !== e) {
    var fallback = await tryEpisodePage(
      BASE + '/' + slug + '-1-sezon-' + absolute + '-bolum-izle/'
    );
    if (fallback) return { html: fallback.html, url: fallback.url, absolute: absolute };
  }

  var showHtml = await http.fetchText(show.url, { headers: pageHeaders() });
  if (!showHtml) return null;
  var links = parseEpisodeLinks(showHtml);
  for (var i = 0; i < links.length; i++) {
    if (links[i].season === s && links[i].episode === e) {
      var exact = await tryEpisodePage(links[i].url);
      if (exact) return exact;
    }
  }
  for (var j = 0; j < links.length; j++) {
    if (links[j].episode === absolute) {
      var abs = await tryEpisodePage(links[j].url);
      if (abs) return abs;
    }
  }
  return null;
}

function decodeServerList(html) {
  var match = html.match(/var\s+servers\s*=\s*JSON\.parse\(atob\(("(?:\\.|[^"\\])*")\)\)/);
  if (match) {
    try {
      return JSON.parse(b64.decode(JSON.parse(match[1])));
    } catch (e) {}
  }

  match = html.match(/var\s+serversByLang\s*=\s*JSON\.parse\(atob\(("(?:\\.|[^"\\])*")\)\)/);
  if (match) {
    try {
      var groups = JSON.parse(b64.decode(JSON.parse(match[1])));
      return (
        (groups && groups.dub && groups.dub.length && groups.dub) ||
        (groups && groups.any && groups.any.length && groups.any) ||
        (groups && groups.sub && groups.sub.length && groups.sub) ||
        []
      );
    } catch (e) {}
  }
  return [];
}

function absolute(base, href) {
  if (!href) return '';
  if (href.indexOf('//') === 0) return 'https:' + href;
  if (href.indexOf('http') === 0) return href;
  return new URL(href, base).href;
}

async function resolveServer(server) {
  if (!server || !server.resolveUrl) return null;
  var resolved = await http.fetchJson(BASE + server.resolveUrl, { headers: pageHeaders() });
  if (!resolved || !resolved.id) return null;
  return resolved.id;
}

function streamRow(label, url, referer, forceHls) {
  if (!url) return null;
  var isHls = forceHls === undefined ? /\.m3u8/i.test(url) : forceHls;
  var headers = http.headers({ Referer: referer || BASE + '/' });
  return {
    name: 'ÇizgiMax',
    title: 'ÇizgiMax - ' + label + ' (' + (isHls ? 'HLS' : 'MP4') + ')',
    url: url,
    quality: 'auto',
    format: isHls ? 'hls' : 'mp4',
    isHls: isHls,
    language: 'tr',
    provider: 'cizgimax',
    headers: headers,
    behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
    subtitles: []
  };
}

function extractMedia(html, embedUrl, label, episodeUrl) {
  var out = [];
  var seen = {};
  function add(url, referer, name) {
    if (!url || seen[url]) return;
    if (!/^https?:/i.test(url)) return;
    seen[url] = true;
    var row = streamRow(String(name || label || '').trim(), url, referer || embedUrl);
    if (row) out.push(row);
  }

  var sib = html.match(/player\.src\(\[\{src:\s*"([^"]+)"/);
  if (sib) add(sib[1], embedUrl);

  var files = /(?:file|src)\s*:\s*['"]([^'"]*\.(?:m3u8|mp4)[^'"]*)['"]/gi;
  var match;
  while ((match = files.exec(html)) !== null) add(match[1], embedUrl);

  var direct = /https?:\/\/[^"'\s<>]+\.(?:m3u8|mp4)[^"'\s<>]*/gi;
  while ((match = direct.exec(html)) !== null) add(match[0], embedUrl);

  var videos = html.match(/"videos"\s*:\s*(\[[^\]]*\])/);
  if (videos) {
    try {
      var list = JSON.parse(videos[1]);
      for (var i = 0; i < list.length; i++) {
        var url = list[i] && list[i].url;
        add(url && url.indexOf('//') === 0 ? 'https:' + url : url, 'https://ok.ru/');
      }
    } catch (e) {}
  }

  return out;
}

async function serverStreams(server, episodeUrl) {
  if (!server) return [];

  if (server.resolveUrl) {
    var embedId = await resolveServer(server);
    if (!embedId) return [];
    var data = await fetchTau(embedId);
    return buildStreams(data, captionsFrom(data));
  }

  if (server.streamUrl) {
    var streamUrl = absolute(episodeUrl, server.streamUrl);
    var isMp4 = server.type === 'mailru' || /mp4=1/.test(server.streamUrl);
    var stream = streamRow(server.label || server.type || 'Kaynak', streamUrl, episodeUrl, !isMp4);
    return stream ? [stream] : [];
  }

  if (server.src) {
    var embed = absolute(BASE, server.src);
    var html = await http.fetchText(embed, { headers: pageHeaders({ Referer: episodeUrl }) });
    if (!html) return [];
    return extractMedia(html, embed, server.label || 'Kaynak', episodeUrl);
  }

  return [];
}

function tauIdFromUrl(url) {
  if (!url) return null;
  var match = String(url).match(/tau-video\.xyz\/embed\/([^"'/?#]+)/i);
  return match ? match[1] : null;
}

async function fetchTau(embedId) {
  return http.fetchJson(TAU + '/api/video/' + encodeURIComponent(embedId), {
    headers: pageHeaders()
  });
}

function captionsFrom(data) {
  var out = [];
  var list = data && data.captions;
  if (!Array.isArray(list)) return out;
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item || !item.url) continue;
    out.push({
      id: 'cizgimax-sub-' + i,
      url: item.url,
      lang: String(item.language || 'tr').toLowerCase(),
      label: item.name || 'Türkçe'
    });
  }
  return out;
}

function buildStreams(data, subtitles) {
  if (!data || !Array.isArray(data.urls)) return [];
  var headers = pageHeaders();
  var streams = [];
  for (var i = 0; i < data.urls.length; i++) {
    var item = data.urls[i];
    if (!item || !item.url) continue;
    var label = String(item.label || '').toLowerCase();
    if (!/^\d+p$/.test(label)) continue;
    streams.push({
      name: 'ÇizgiMax',
      title: 'ÇizgiMax - Türkçe (' + label + ')',
      url: item.url,
      quality: label,
      format: 'mp4',
      isHls: false,
      language: 'tr',
      provider: 'cizgimax',
      headers: headers,
      behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
      subtitles: subtitles
    });
  }
  return streams;
}

async function getStreams(id, mediaType, season, episode) {
  try {
    var info = await tmdb.resolveTmdbInfo(id, mediaType || 'tv');
    if (!info.isTv) return [];

    var show = await findShow(info);
    if (!show) {
      console.log('[CizgiMax] no show for ' + info.title);
      return [];
    }

    var found = await findEpisode(info, show, season, episode);
    if (!found) {
      console.log('[CizgiMax] no episode for ' + show.title + ' S' + season + 'E' + episode);
      return [];
    }

    var servers = decodeServerList(found.html);
    if (!servers.length) return [];

    var streams = [];
    var seen = {};
    for (var i = 0; i < servers.length; i++) {
      var rows = await serverStreams(servers[i], found.url);
      for (var j = 0; j < rows.length; j++) {
        if (!rows[j] || !rows[j].url || seen[rows[j].url]) continue;
        seen[rows[j].url] = true;
        streams.push(rows[j]);
      }
    }
    if (!streams.length) return [];

    console.log(
      '[CizgiMax] ' + show.title + ' S' + season + 'E' + episode +
      ' -> ' + streams.length + ' stream(s)'
    );
    return quality.sortStreamsByQuality(streams);
  } catch (e) {
    console.log('[CizgiMax] error: ' + (e && e.message ? e.message : e));
    return [];
  }
}

module.exports = { getStreams: getStreams };
