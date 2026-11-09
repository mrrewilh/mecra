var config = require('../shared/config');
var http = require('../shared/http');
var tmdb = require('../shared/tmdb');
var text = require('../shared/text');
var quality = require('../shared/quality');
var hls = require('../shared/hls');

var BASE = config.sites.hdfilmcehennemi;
var EMBED = config.sites.hdfilmcehennemiEmbed;

function pageHeaders(extra) {
  return http.headers(extra || {});
}

function absolute(value, base) {
  if (!value) return '';
  if (value.indexOf('//') === 0) return 'https:' + value;
  if (value.indexOf('http') === 0) return value;
  return new URL(value, base).href;
}

function parseLinks(html) {
  var items = [];
  var tagRe = /<a\b[^>]*>/gi;
  var match;
  while ((match = tagRe.exec(html)) !== null) {
    var tag = match[0];
    var href = tag.match(/href="([^"]+)"/i);
    var title = tag.match(/title="([^"]+)"/i);
    if (!href || !title) continue;
    var url = href[1];
    if (url.indexOf(BASE) !== 0) continue;
    var path = url.slice(BASE.length).replace(/^\/|\/$/g, '');
    if (!path || path.indexOf('/') !== -1) continue;
    items.push({ slug: path, title: title[1] });
  }
  return items;
}

function parseSearchResults(results) {
  var out = [];
  if (!Array.isArray(results)) return out;
  for (var i = 0; i < results.length; i++) {
    var html = results[i];
    if (!html) continue;
    var href = html.match(/href="([^"]+)"/i);
    var title = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
    if (!href) continue;
    out.push({
      url: href[1],
      title: title ? title[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : ''
    });
  }
  return out;
}

async function searchSite(info, isTv) {
  var titles = [info.title, info.originalTitle, info.englishTitle];
  for (var i = 0; i < titles.length; i++) {
    if (!titles[i]) continue;
    var data = await http.fetchJson(
      BASE + '/search/?q=' + encodeURIComponent(titles[i]),
      {
        headers: pageHeaders({
          Referer: BASE + '/',
          'X-Requested-With': 'fetch',
          Accept: 'application/json, text/javascript, */*; q=0.01'
        })
      }
    );
    var items = parseSearchResults(data && data.results);
    if (!items.length) continue;
    var typed = items.filter(function (item) {
      return isTv ? item.url.indexOf('/dizi/') !== -1 : item.url.indexOf('/dizi/') === -1;
    });
    var best = text.bestMatch(typed.length ? typed : items, titles, function (item) {
      return item.title;
    });
    if (best) return best;
  }
  return null;
}

function candidateSlugs(info) {
  var out = [];
  var titles = [info.englishTitle, info.originalTitle, info.title];
  var year = info.year;
  for (var i = 0; i < titles.length; i++) {
    var slug = text.slugify(titles[i]);
    if (!slug) continue;
    out.push(slug);
    if (year) out.push(slug + '-' + year);
    out.push('hd-' + slug + '-izle');
    out.push('1-' + slug + '-izle-6');
    out.push('1-' + slug + '-izle-7');
    out.push('1-' + slug + '-izle-8');
    out.push('1-' + slug + '-izle-10');
    out.push(slug + '-izle');
    out.push(slug + '-hdf');
    out.push(slug + '-film-izle');
    out.push(slug + '-film-izle-hdf-hdf-6');
    out.push(slug + '-film-izle-hdf-hdf-7');
  }
  return out;
}

async function pageIsMatch(slug, info) {
  var url = BASE + '/' + slug + '/';
  var html = await http.fetchText(url, { headers: pageHeaders({ Referer: BASE + '/' }) });
  if (!html) return null;
  if (html.indexOf('video/embed') === -1) return null;

  var imdb = html.match(/imdb\.com\/title\/(tt\d+)/i);
  if (imdb && info.imdbId && imdb[1] === info.imdbId) return html;

  var title = html.match(/<title>([^<]+)<\/title>/i);
  var pageTitle = title ? title[1] : '';
  var score = Math.max(
    text.score(info.title, pageTitle),
    text.score(info.originalTitle, pageTitle)
  );
  if (score > 0) return html;
  return null;
}

function slugFromUrl(url) {
  var parts = String(url).replace(/\/+$/, '').split('/');
  return parts[parts.length - 1];
}

async function findPage(info) {
  var hit = await searchSite(info, false);
  if (hit) {
    var hitSlug = slugFromUrl(hit.url);
    var hitHtml = await pageIsMatch(hitSlug, info);
    if (hitHtml) return { slug: hitSlug, html: hitHtml };
  }

  var home = await http.fetchText(BASE + '/', { headers: pageHeaders({ Referer: BASE + '/' }) });
  if (home) {
    var items = parseLinks(home);
    var best = text.bestMatch(items, [info.title, info.originalTitle, info.englishTitle], function (item) {
      return item.title;
    });
    if (best) {
      var bestHtml = await pageIsMatch(best.slug, info);
      if (bestHtml) return { slug: best.slug, html: bestHtml };
    }
  }

  var candidates = candidateSlugs(info);
  var seen = {};
  for (var i = 0; i < candidates.length; i++) {
    var slug = candidates[i];
    if (!slug || seen[slug]) continue;
    seen[slug] = true;
    var html = await pageIsMatch(slug, info);
    if (html) return { slug: slug, html: html };
  }
  return null;
}

function evaluateScript(script, host, varName) {
  var code =
    'var window={location:{hostname:"' + host + '",origin:"https://' + host + '",' +
    'href:"https://' + host + '/",pathname:"/",search:"",hash:""}};' +
    'var self=window;' +
    'var document={location:window.location};' +
    'var location=window.location;' +
    'var __atob=(typeof globalThis!=="undefined"&&globalThis.atob)?globalThis.atob:null;' +
    'var atob=__atob||function(s){var c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";' +
    's=String(s).replace(/[^A-Za-z0-9+/=]/g,"");var o="",b=0,n=0;' +
    'for(var i=0;i<s.length;i++){var v=c.indexOf(s.charAt(i));if(v<0)break;b=(b<<6)|v;n+=6;' +
    'if(n>=8){n-=8;o+=String.fromCharCode((b>>n)&255)}}return o};' +
    script +
    '\nreturn (typeof ' + varName + ' !== "undefined") ? ' + varName + ' : null;';
  try {
    return new Function(code)();
  } catch (e) {
    return null;
  }
}

function decryptStream(embedHtml, host) {
  var src = embedHtml.match(/sources:\s*\[\{\s*file:\s*([a-zA-Z0-9_$]+)/i);
  if (!src) return null;
  var varName = src[1];

  var blocks = embedHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i]
      .replace(/^<script[^>]*>/i, '')
      .replace(/<\/script>$/i, '');
    if (block.indexOf('var ' + varName) === -1) continue;
    var value = evaluateScript(block, host, varName);
    if (typeof value === 'string' && value.indexOf('http') === 0) return value;
  }
  return null;
}

function parseSubtitles(embedHtml) {
  var tracks = embedHtml.match(/tracks:\s*(\[[^\]]*\])/i);
  if (!tracks) return [];
  var list;
  try {
    list = JSON.parse(tracks[1]);
  } catch (e) {
    return [];
  }
  if (!Array.isArray(list)) return [];

  var out = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item || !item.file || item.kind !== 'captions') continue;
    var label = item.label || 'Subtitle';
    var lower = label.toLowerCase();
    var lang = 'tr';
    if (lower.indexOf('eng') !== -1 || lower.indexOf('ing') !== -1) lang = 'en';
    else if (lower.indexOf('fre') !== -1 || lower.indexOf('fra') !== -1) lang = 'fr';
    else if (lower.indexOf('ger') !== -1 || lower.indexOf('alm') !== -1) lang = 'de';
    else if (lower.indexOf('spa') !== -1 || lower.indexOf('isp') !== -1) lang = 'es';
    out.push({
      id: 'hdfc-sub-' + i,
      url: item.file,
      lang: lang,
      label: label
    });
  }
  return out;
}

async function resolvePage(page) {
  var html = await http.fetchText(page, { headers: pageHeaders({ Referer: BASE + '/' }) });
  if (!html) return null;

  var iframe = html.match(/data-src="([^"]*video\/embed[^"]*)"/i);
  if (!iframe) iframe = html.match(/<iframe[^>]+src="([^"]*video\/embed[^"]*)"/i);
  if (!iframe) return null;

  var embedUrl = absolute(iframe[1], page);
  var host = 'hdfilmcehennemi.mobi';
  try {
    host = new URL(embedUrl).hostname;
  } catch (e) {}

  var embedHtml = await http.fetchText(embedUrl, {
    headers: pageHeaders({ Referer: BASE + '/' })
  });
  if (!embedHtml) {
    console.log('[HDFilmCehennemi] embed fetch failed: ' + embedUrl);
    return null;
  }

  var streamUrl = decryptStream(embedHtml, host);
  if (!streamUrl) {
    console.log('[HDFilmCehennemi] decrypt failed: ' + embedUrl);
    return null;
  }

  var headers = pageHeaders({ Referer: 'https://' + host + '/' });
  var audio = await hls.inspect(streamUrl, headers);
  var dual = audio.dual ? hls.label(audio.tracks) : '';
  var title = dual
    ? 'HDFilmCehennemi - Dual [' + dual + '] (1080p)'
    : 'HDFilmCehennemi - Türkçe (1080p)';

  return {
    name: 'HDFilmCehennemi',
    title: title,
    url: streamUrl.indexOf('#') === -1 ? streamUrl + '#.m3u8' : streamUrl,
    quality: '1080p',
    format: 'hls',
    isHls: true,
    language: 'tr',
    provider: 'hdfilmcehennemi',
    headers: headers,
    behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
    subtitles: parseSubtitles(embedHtml)
  };
}

function parseSeriesLinks(html) {
  var items = [];
  var tagRe = /<a\b[^>]*>/gi;
  var match;
  while ((match = tagRe.exec(html)) !== null) {
    var tag = match[0];
    var href = tag.match(/href="([^"]+\/dizi\/[^"]+)"/i);
    var title = tag.match(/title="([^"]+)"/i);
    if (!href || !title) continue;
    items.push({ url: href[1], title: title[1] });
  }
  return items;
}

async function findSeries(info) {
  var hit = await searchSite(info, true);
  if (hit) return { url: hit.url, title: hit.title };

  var html = await http.fetchText(BASE + '/yabancidiziizle-14/', {
    headers: pageHeaders({ Referer: BASE + '/' })
  });
  if (!html) return null;
  return text.bestMatch(
    parseSeriesLinks(html),
    [info.title, info.originalTitle, info.englishTitle],
    function (item) {
      return item.title;
    }
  );
}

async function findEpisodePage(info, show, season, episode) {
  var html = await http.fetchText(show.url, { headers: pageHeaders({ Referer: BASE + '/' }) });
  if (!html) return null;

  var links = [];
  var re = /href="([^"]+\/sezon-(\d+)\/bolum-(\d+)[^"]*)"/gi;
  var match;
  while ((match = re.exec(html)) !== null) {
    links.push({
      url: match[1],
      season: Number(match[2]),
      episode: Number(match[3])
    });
  }

  var s = season == null ? 1 : Number(season);
  var e = Number(episode) || 1;
  var absolute =
    season == null ? e : await tmdb.absoluteEpisode(info.id, season, episode, info.seasons);

  for (var i = 0; i < links.length; i++) {
    if (links[i].season === s && links[i].episode === e) return links[i].url;
  }
  for (var j = 0; j < links.length; j++) {
    if (links[j].episode === absolute) return links[j].url;
  }
  return null;
}

async function getStreams(id, mediaType, season, episode) {
  try {
    var raw = String(id == null ? '' : id);
    if (raw.indexOf('hdfilmcehennemi:movie:') === 0) {
      var direct = await resolvePage(BASE + '/' + raw.replace('hdfilmcehennemi:movie:', '') + '/');
      return direct ? [direct] : [];
    }

    var info = await tmdb.resolveTmdbInfo(id, mediaType || 'movie');

    if (info.isTv) {
      var show = await findSeries(info);
      if (!show) {
        console.log('[HDFilmCehennemi] no series page for ' + info.title);
        return [];
      }
      var episodePage = await findEpisodePage(info, show, season, episode);
      if (!episodePage) {
        console.log('[HDFilmCehennemi] no episode for ' + show.title + ' S' + season + 'E' + episode);
        return [];
      }
      var episodeStream = await resolvePage(episodePage);
      if (!episodeStream) {
        console.log('[HDFilmCehennemi] no stream on ' + episodePage);
        return [];
      }
      console.log('[HDFilmCehennemi] ' + show.title + ' S' + season + 'E' + episode + ' -> ' + episodeStream.title);
      return quality.sortStreamsByQuality([episodeStream]);
    }

    var found = await findPage(info);
    if (!found) {
      console.log('[HDFilmCehennemi] no page for ' + info.title + ' (' + info.originalTitle + ')');
      return [];
    }

    var stream = await resolvePage(BASE + '/' + found.slug + '/');
    if (!stream) {
      console.log('[HDFilmCehennemi] no stream on ' + found.slug);
      return [];
    }

    console.log('[HDFilmCehennemi] ' + found.slug + ' -> ' + stream.title);
    return quality.sortStreamsByQuality([stream]);
  } catch (e) {
    console.log('[HDFilmCehennemi] error: ' + (e && e.message ? e.message : e));
    return [];
  }
}

module.exports = { getStreams: getStreams };
