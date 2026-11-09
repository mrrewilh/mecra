var config = require('../shared/config');
var http = require('../shared/http');
var tmdb = require('../shared/tmdb');
var text = require('../shared/text');
var quality = require('../shared/quality');

var BASE = config.sites.diziyou;
var STORAGE = config.sites.diziyouStorage;

function pageHeaders() {
  return http.headers({ Referer: BASE + '/' });
}

function parseShowLinks(html) {
  var items = [];
  var tagRe = /<a\b[^>]*>/gi;
  var match;
  while ((match = tagRe.exec(html)) !== null) {
    var tag = match[0];
    var href = tag.match(/href="([^"]+)"/i);
    var title = tag.match(/title="([^"]+)"/i);
    if (!href || !title) continue;
    var url = href[1];
    if (url.indexOf(BASE) !== 0 && url.charAt(0) === '/') url = BASE + url;
    if (url.indexOf(BASE) !== 0) continue;
    if (url.indexOf('/kategori/') !== -1 || url.indexOf('/player/') !== -1) continue;
    items.push({ url: url, title: title[1] });
  }
  return items;
}

async function findShow(info) {
  var titles = [info.title, info.originalTitle, info.englishTitle];
  for (var i = 0; i < titles.length; i++) {
    if (!titles[i]) continue;
    var html = await http.fetchText(
      BASE + '/?s=' + encodeURIComponent(titles[i]),
      { headers: pageHeaders() }
    );
    if (!html) continue;
    var items = parseShowLinks(html);
    var best = text.bestMatch(items, titles, function (item) {
      return item.title;
    });
    if (best) return best;
  }
  return null;
}

function slugFromUrl(url) {
  var parts = String(url).replace(/\/+$/, '').split('/');
  return parts[parts.length - 1];
}

async function hasEpisode(url) {
  var html = await http.fetchText(url, { headers: pageHeaders() });
  if (!html) return null;
  if (html.indexOf('diziyouPlayer') === -1) return null;
  return { url: url, html: html };
}

async function findEpisode(show, info, season, episode) {
  var slug = slugFromUrl(show.url);
  var baseSlug = slug.replace(/\d+$/, '');
  var candidates = [];
  var s = season == null ? 1 : Number(season);
  var e = Number(episode) || 1;

  candidates.push(BASE + '/' + baseSlug + '-' + s + '-sezon-' + e + '-bolum/');
  candidates.push(BASE + '/' + slug + '-' + s + '-sezon-' + e + '-bolum/');

  if (s !== 1 || season == null) {
    candidates.push(BASE + '/' + baseSlug + '-1-sezon-' + e + '-bolum/');
  }

  for (var i = 0; i < candidates.length; i++) {
    var found = await hasEpisode(candidates[i]);
    if (found) return found;
  }

  var showHtml = await http.fetchText(show.url, { headers: pageHeaders() });
  if (!showHtml) return null;

  var absolute =
    season == null ? e : await tmdb.absoluteEpisode(info.id, season, episode, info.seasons);
  var links = [];
  var re = /href="([^"]*?(\d+)-sezon-(\d+)-bolum\/?)"/gi;
  var match;
  while ((match = re.exec(showHtml)) !== null) {
    links.push({
      url: match[1].indexOf('http') === 0 ? match[1] : BASE + match[1],
      season: Number(match[2]),
      episode: Number(match[3])
    });
  }

  var chosen = null;
  for (var a = 0; a < links.length; a++) {
    if (links[a].season === s && links[a].episode === e) {
      chosen = links[a];
      break;
    }
  }
  if (!chosen) {
    for (var b = 0; b < links.length; b++) {
      if (links[b].episode === absolute) {
        chosen = links[b];
        break;
      }
    }
  }
  if (!chosen) return null;
  return hasEpisode(chosen.url);
}

function buildStreams(info, html, episodeUrl) {
  var src = html.match(/id="diziyouPlayer"[^>]*src="([^"]+)"/i);
  if (!src) src = html.match(/src="([^"]*\/player\/[^"]+)"/i);
  if (!src) return [];

  var itemId = src[1].split('/').pop().split('?')[0].replace('.html', '');
  if (!itemId) return [];

  var subs = [
    {
      id: 'diziyou-tr',
      url: STORAGE + '/subtitles/' + itemId + '/tr.vtt',
      lang: 'tr',
      label: 'Türkçe'
    }
  ];
  var headers = pageHeaders();
  var streams = [];
  var hasSub = html.indexOf('turkceAltyazili') !== -1;
  var hasDub = html.indexOf('turkceDublaj') !== -1;

  if (hasSub) {
    streams.push({
      name: 'DiziYou',
      title: 'DiziYou - Türkçe Altyazılı (1080p)',
      url: STORAGE + '/episodes/' + itemId + '/play.m3u8',
      quality: '1080p',
      format: 'hls',
      isHls: true,
      language: 'tr',
      provider: 'diziyou',
      headers: headers,
      behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
      subtitles: subs
    });
  }

  if (hasDub) {
    streams.push({
      name: 'DiziYou',
      title: 'DiziYou - Türkçe Dublaj (1080p)',
      url: STORAGE + '/episodes/' + itemId + '_tr/play.m3u8',
      quality: '1080p',
      format: 'hls',
      isHls: true,
      language: 'tr',
      provider: 'diziyou',
      headers: headers,
      behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
      subtitles: subs
    });
  }

  if (streams.length === 0) {
    streams.push({
      name: 'DiziYou',
      title: 'DiziYou - Türkçe (1080p)',
      url: STORAGE + '/episodes/' + itemId + '/play.m3u8',
      quality: '1080p',
      format: 'hls',
      isHls: true,
      language: 'tr',
      provider: 'diziyou',
      headers: headers,
      behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
      subtitles: subs
    });
  }

  return streams;
}

async function getStreams(id, mediaType, season, episode) {
  try {
    var info = await tmdb.resolveTmdbInfo(id, mediaType || 'tv');
    if (!info.isTv) return [];
    var titles = [info.title, info.originalTitle, info.englishTitle];
    if (!titles[0] && !titles[1]) return [];

    var show = await findShow(info);
    if (!show) return [];

    var found = await findEpisode(show, info, season, episode);
    if (!found) return [];

    console.log(
      '[DiziYou] ' + show.title + ' S' + (season == null ? '-' : season) + 'E' + episode
    );
    return quality.sortStreamsByQuality(buildStreams(info, found.html, found.url));
  } catch (e) {
    console.log('[DiziYou] error: ' + (e && e.message ? e.message : e));
    return [];
  }
}

module.exports = { getStreams: getStreams };
