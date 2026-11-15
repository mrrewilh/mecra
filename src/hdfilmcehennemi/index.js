var config = require('../shared/config');
var http = require('../shared/http');
var tmdb = require('../shared/tmdb');
var text = require('../shared/text');
var quality = require('../shared/quality');
var hls = require('../shared/hls');
var closeload = require('../shared/closeload');

var BASE = config.sites.hdfilmcehennemi;

// A movie page that carries a player looks like <iframe data-src=".../video/embed/ID/">.
// Pages for unreleased films only embed a YouTube trailer, and pages the site no
// longer hosts have no iframe at all, so both are skipped by playerEmbeds().
var MAX_PAGE_TRIES = 5;
var MAX_EMBEDS = 2;

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
    if (!href) continue;
    // Titles come entity-encoded ("M&uuml;sl&uuml;m"), which would break matching
    // against TMDB's UTF-8 titles unless decoded here.
    var title = html.match(/<h[1-6][^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h[1-6]>/i);
    if (!title) title = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
    out.push({
      url: href[1],
      title: title ? text.decodeEntities(title[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() : ''
    });
  }
  return out;
}

function titleQueries(info) {
  var list = [info.title, info.originalTitle, info.englishTitle];
  var alternatives = info.alternativeTitles || [];
  for (var i = 0; i < alternatives.length && list.length < 6; i++) {
    list.push(alternatives[i] && alternatives[i].title);
  }
  var out = [];
  var seen = {};
  for (var j = 0; j < list.length; j++) {
    var title = String(list[j] || '').trim();
    if (!title) continue;
    var key = text.clean(title);
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(title);
  }
  return out;
}

async function searchSite(info, isTv) {
  var queries = titleQueries(info).slice(0, 4);
  var items = [];
  var seenUrl = {};
  for (var i = 0; i < queries.length; i++) {
    var data = await http.fetchJson(
      BASE + '/search/?q=' + encodeURIComponent(queries[i]),
      {
        headers: pageHeaders({
          Referer: BASE + '/',
          'X-Requested-With': 'fetch',
          Accept: 'application/json, text/javascript, */*; q=0.01'
        })
      }
    );
    var found = parseSearchResults(data && data.results);
    for (var j = 0; j < found.length; j++) {
      var item = found[j];
      var isSeries = item.url.indexOf('/dizi/') !== -1;
      if (isSeries !== Boolean(isTv)) continue;
      if (seenUrl[item.url]) continue;
      seenUrl[item.url] = true;
      items.push(item);
    }
  }
  return items;
}

// Search results are not ranked by the site, so score every candidate against
// all of the titles TMDB gives us and keep the order for the page walk below.
function rankCandidates(items, info) {
  var titles = titleQueries(info);
  var ranked = [];
  for (var i = 0; i < items.length; i++) {
    var best = 0;
    for (var j = 0; j < titles.length; j++) {
      var value = text.score(titles[j], items[i].title);
      if (value > best) best = value;
    }
    if (best > 0) {
      ranked.push({ url: items[i].url, title: items[i].title, score: best });
    }
  }
  ranked.sort(function (a, b) {
    return b.score - a.score;
  });
  return ranked;
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

async function pageCandidates(info) {
  var out = [];
  var seen = {};

  function push(url, score) {
    if (!url || seen[url]) return;
    seen[url] = true;
    out.push({ url: url, score: score });
  }

  var ranked = rankCandidates(await searchSite(info, false), info);
  for (var i = 0; i < ranked.length; i++) push(ranked[i].url, ranked[i].score);
  return out;
}

function playerEmbeds(html) {
  var out = [];
  var seen = {};
  var tagRe = /<iframe\b[^>]*>/gi;
  var match;
  while ((match = tagRe.exec(html)) !== null) {
    var tag = match[0];
    var src = tag.match(/data-src="([^"]+)"/i) || tag.match(/\ssrc="([^"]+)"/i);
    if (!src) continue;
    var url = absolute(src[1], BASE + '/');
    if (url.indexOf('/video/embed/') === -1) continue;
    if (seen[url]) continue;
    seen[url] = true;
    out.push(url);
  }
  return out;
}

function pageTitle(html) {
  var title = html.match(/<title>([^<]+)<\/title>/i);
  if (title) return text.decodeEntities(title[1]).trim();
  var heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!heading) return '';
  return text.decodeEntities(heading[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function pageMatches(info, html) {
  var imdb = html.match(/imdb\.com\/title\/(tt\d+)/i);
  if (imdb && info.imdbId) return imdb[1] === info.imdbId;
  var title = pageTitle(html);
  var titles = titleQueries(info);
  for (var i = 0; i < titles.length; i++) {
    if (text.score(titles[i], title) > 0) return true;
  }
  return false;
}

// Walks a candidate list until one page really has a player, so a page the site
// took down (or a trailer-only page) no longer hides a playable one.
async function tryPages(candidates, info, limit) {
  var seen = {};
  var tries = 0;
  for (var i = 0; i < candidates.length && tries < limit; i++) {
    var url = candidates[i].url;
    if (!url || seen[url]) continue;
    seen[url] = true;
    tries++;
    var html = await http.fetchText(url, { headers: pageHeaders({ Referer: BASE + '/' }) });
    if (!html) continue;
    var embeds = playerEmbeds(html);
    if (!embeds.length) continue;
    if (!pageMatches(info, html)) continue;
    return { url: url, html: html, embeds: embeds };
  }
  return null;
}

async function homeCandidates(info) {
  var home = await http.fetchText(BASE + '/', { headers: pageHeaders({ Referer: BASE + '/' }) });
  if (!home) return [];
  var links = parseLinks(home).map(function (item) {
    return { url: BASE + '/' + item.slug + '/', title: item.title };
  });
  return rankCandidates(links, info);
}

async function findMoviePage(info) {
  var page = await tryPages(await pageCandidates(info), info, MAX_PAGE_TRIES);
  if (page) return page;

  page = await tryPages(await homeCandidates(info), info, 3);
  if (page) return page;

  return tryPages(
    candidateSlugs(info).map(function (slug) {
      return { url: BASE + '/' + slug + '/' };
    }),
    info,
    4
  );
}

async function resolvePage(page) {
  var streams = [];
  var subtitles = [];
  var seenSubtitle = {};
  var seenUrl = {};
  var limit = Math.min(page.embeds.length, MAX_EMBEDS);

  for (var i = 0; i < limit; i++) {
    var embedUrl = page.embeds[i];
    var host = http.hostOf(embedUrl);
    // The player host 404s browser-shaped requests that skip the frame headers.
    var embedHtml = await http.fetchText(embedUrl, { headers: http.frameHeaders(page.url, embedUrl) });
    if (!embedHtml) {
      console.log('[HDFilmCehennemi] player request failed: ' + embedUrl);
      continue;
    }

    var streamUrl = closeload.decryptStream(embedHtml, host);
    if (!streamUrl) {
      console.log('[HDFilmCehennemi] no stream in player: ' + embedUrl);
      continue;
    }

    var key = streamUrl.split('?')[0];
    if (seenUrl[key]) continue;
    seenUrl[key] = true;

    var headers = pageHeaders({ Referer: 'https://' + host + '/' });
    var audio = await hls.inspect(streamUrl, headers);
    var dual = audio.dual ? hls.label(audio.tracks) : '';
    var label = 'HDFilmCehennemi - ' + (dual ? 'Dual [' + dual + ']' : 'Türkçe');
    var qualityLabel = audio.quality;

    var subs = closeload.parseSubtitles(embedHtml);
    for (var j = 0; j < subs.length; j++) {
      if (seenSubtitle[subs[j].url]) continue;
      seenSubtitle[subs[j].url] = true;
      subtitles.push(subs[j]);
    }

    streams.push({
      name: 'HDFilmCehennemi',
      title: label + (qualityLabel ? ' (' + qualityLabel + ')' : ''),
      url: streamUrl.indexOf('#') === -1 ? streamUrl + '#.m3u8' : streamUrl,
      quality: qualityLabel,
      format: 'hls',
      isHls: true,
      language: 'tr',
      provider: 'hdfilmcehennemi',
      headers: headers,
      behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
      subtitles: subtitles
    });
  }

  return quality.sortStreamsByQuality(streams);
}

async function getMovieStreams(info) {
  var page = await findMoviePage(info);
  if (!page) {
    console.log('[HDFilmCehennemi] no playable page for ' + info.title + ' (' + info.originalTitle + ')');
    return [];
  }
  var streams = await resolvePage(page);
  console.log('[HDFilmCehennemi] ' + page.url.replace(BASE, '') + ' -> ' + streams.length + ' stream(s)');
  return streams;
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
    items.push({ url: href[1], title: text.decodeEntities(title[1]) });
  }
  return items;
}

async function findShowCandidates(info) {
  var ranked = rankCandidates(await searchSite(info, true), info);
  if (ranked.length) {
    return ranked.map(function (item) {
      return { url: item.url, title: item.title };
    });
  }

  var html = await http.fetchText(BASE + '/yabancidiziizle-14/', {
    headers: pageHeaders({ Referer: BASE + '/' })
  });
  if (!html) return [];
  return rankCandidates(parseSeriesLinks(html), info).map(function (item) {
    return { url: item.url, title: item.title };
  });
}

function episodeLinks(html) {
  var links = [];
  var seen = {};
  var re = /href="([^"]+\/sezon-(\d+)\/bolum-(\d+)[^"]*)"/gi;
  var match;
  while ((match = re.exec(html)) !== null) {
    if (seen[match[1]]) continue;
    seen[match[1]] = true;
    links.push({
      url: match[1],
      season: Number(match[2]),
      episode: Number(match[3])
    });
  }
  return links;
}

function pickEpisode(links, season, episode, absolute) {
  for (var i = 0; i < links.length; i++) {
    if (links[i].season === season && links[i].episode === episode) return links[i];
  }
  for (var j = 0; j < links.length; j++) {
    if (links[j].episode === absolute) return links[j];
  }
  return null;
}

async function findEpisode(info, season, episode) {
  var candidates = await findShowCandidates(info);
  var s = season == null ? 1 : Number(season);
  var e = Number(episode) || 1;
  var absolute =
    season == null ? e : await tmdb.absoluteEpisode(info.id, season, episode, info.seasons);

  var tries = 0;
  for (var i = 0; i < candidates.length && tries < MAX_PAGE_TRIES; i++) {
    tries++;
    var showHtml = await http.fetchText(candidates[i].url, {
      headers: pageHeaders({ Referer: BASE + '/' })
    });
    if (!showHtml) continue;

    var chosen = pickEpisode(episodeLinks(showHtml), s, e, absolute);
    if (!chosen) continue;

    var html = await http.fetchText(chosen.url, { headers: pageHeaders({ Referer: BASE + '/' }) });
    if (!html) continue;
    return { url: chosen.url, html: html, show: candidates[i].title };
  }
  return null;
}

async function getEpisodeStreams(info, season, episode) {
  var page = await findEpisode(info, season, episode);
  if (!page) {
    console.log('[HDFilmCehennemi] no episode for ' + info.title + ' S' + season + 'E' + episode);
    return [];
  }

  var embeds = playerEmbeds(page.html);
  if (!embeds.length) {
    console.log('[HDFilmCehennemi] episode page has no player: ' + page.url);
    return [];
  }

  var streams = await resolvePage({ url: page.url, html: page.html, embeds: embeds });
  console.log('[HDFilmCehennemi] ' + page.show + ' S' + season + 'E' + episode + ' -> ' + streams.length + ' stream(s)');
  return streams;
}

async function getStreams(id, mediaType, season, episode) {
  try {
    var info = await tmdb.resolveTmdbInfo(id, mediaType || 'movie');
    if (info.isTv) return await getEpisodeStreams(info, season, episode);
    return await getMovieStreams(info);
  } catch (e) {
    console.log('[HDFilmCehennemi] error: ' + (e && e.message ? e.message : e));
    return [];
  }
}

module.exports = { getStreams: getStreams };
