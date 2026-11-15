var config = require('../shared/config');
var http = require('../shared/http');
var tmdb = require('../shared/tmdb');
var text = require('../shared/text');
var quality = require('../shared/quality');
var hls = require('../shared/hls');
var closeload = require('../shared/closeload');

var BASE = config.sites.filmmakinesi;

function pageHeaders(extra) {
  return http.headers(extra || {});
}

function titleQueries(info, limit) {
  var list = [info.title, info.originalTitle, info.englishTitle];
  var alternatives = info.alternativeTitles || [];
  var max = limit || 6;
  for (var i = 0; i < alternatives.length && list.length < max; i++) {
    list.push(alternatives[i] && alternatives[i].title);
  }
  var out = [];
  var seen = {};
  for (var j = 0; j < list.length && out.length < max; j++) {
    var title = String(list[j] || '').trim();
    if (!title) continue;
    var key = text.clean(title);
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(title);
  }
  return out;
}

function absolute(value) {
  if (!value) return '';
  if (value.indexOf('//') === 0) return 'https:' + value;
  if (/^https?:/i.test(value)) return value;
  return BASE + (value.charAt(0) === '/' ? value : '/' + value);
}

function parseCards(html) {
  var items = [];
  var seen = {};
  var tagRe = /<a\b[^>]*>/gi;
  var match;
  while ((match = tagRe.exec(html)) !== null) {
    var tag = match[0];
    if (!/\bclass="[^"]*\bitem\b[^"]*"/i.test(tag)) continue;
    var href = (tag.match(/\bhref="([^"]+)"/i) || [])[1];
    var title = (tag.match(/\bdata-title="([^"]*)"/i) || [])[1];
    if (!href || !title) continue;
    if (href.indexOf('/film/') !== 0 && href.indexOf('/dizi/') !== 0) continue;

    var end = html.indexOf('</a>', match.index);
    var chunk = html.slice(match.index, end === -1 ? match.index + 2500 : end);
    var year = (chunk.match(/<div class="info">[\s\S]*?<span>(\d{4})<\/span>/i) || [])[1] || '';
    var url = absolute(href);
    if (seen[url]) continue;
    seen[url] = true;
    items.push({
      url: url,
      title: text.decodeEntities(title).trim(),
      year: year,
      isTv: href.indexOf('/dizi/') === 0,
      dual: chunk.indexOf('Dual') !== -1
    });
  }
  return items;
}

async function searchQuery(query) {
  if (!query) return [];
  var html = await http.fetchText(BASE + '/arama/?s=' + encodeURIComponent(query), {
    headers: pageHeaders({ Referer: BASE + '/' })
  });
  return html ? parseCards(html) : [];
}

async function searchSite(info) {
  var queries = titleQueries(info).slice(0, 5);
  var items = [];
  var seen = {};
  for (var i = 0; i < queries.length; i++) {
    var cards = await searchQuery(queries[i]);
    for (var j = 0; j < cards.length; j++) {
      if (seen[cards[j].url]) continue;
      seen[cards[j].url] = true;
      items.push(cards[j]);
    }
  }
  return items;
}

function rankCandidates(items, info, isTv) {
  var titles = titleQueries(info);
  var ranked = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (item.isTv !== Boolean(isTv)) continue;
    var best = 0;
    for (var j = 0; j < titles.length; j++) {
      var value = text.score(titles[j], item.title);
      if (value > best) best = value;
    }
    if (item.year && info.year) {
      var diff = Math.abs(Number(item.year) - Number(info.year));
      if (diff === 0) best += 12;
      else if (diff > 1) best -= 35;
    }
    if (best > 0) ranked.push({ card: item, score: best });
  }
  ranked.sort(function (a, b) {
    return b.score - a.score;
  });
  return ranked;
}

async function findContent(info, isTv) {
  if (info.imdbId) {
    var exact = await searchQuery(info.imdbId);
    for (var i = 0; i < exact.length; i++) {
      if (exact[i].isTv === Boolean(isTv)) return exact[i];
    }
  }
  var ranked = rankCandidates(await searchSite(info), info, isTv);
  return ranked.length && ranked[0].score >= 55 ? ranked[0].card : null;
}

function episodeUrl(card, season, episode) {
  return card.url.replace(/\/+$/, '') + '/sezon-' + season + '/bolum-' + episode + '/';
}

function findEmbed(html) {
  var urls = html.match(/https?:\/\/[^"'\s]+\/video\/embed\/[^"'\s]+/gi) || [];
  for (var i = 0; i < urls.length; i++) {
    if (urls[i].indexOf('youtube') === -1) return urls[i].replace(/&amp;/g, '&');
  }
  return '';
}

async function resolvePage(pageUrl) {
  var html = await http.fetchText(pageUrl, { headers: pageHeaders({ Referer: BASE + '/' }) });
  if (!html) return [];

  var embed = findEmbed(html);
  if (!embed) return [];

  var host = http.hostOf(embed);
  var embedHtml = await http.fetchText(embed, { headers: http.frameHeaders(pageUrl, embed) });
  if (!embedHtml) {
    console.log('[FilmMakinesi] player request failed: ' + embed);
    return [];
  }

  var url = closeload.decryptStream(embedHtml, host);
  if (!url) {
    console.log('[FilmMakinesi] no stream in player: ' + embed);
    return [];
  }

  var subtitles = closeload.parseSubtitles(embedHtml);
  var headers = http.headers({ Referer: 'https://' + host + '/' });
  var audio = await hls.inspect(url, headers);
  var label = audio.dual
    ? 'Dual [' + (hls.label(audio.tracks) || 'Turkish / Original') + ']'
    : (hls.label(audio.tracks) || 'Türkçe');

  var stream = {
    name: 'Film Makinesi',
    title: 'Film Makinesi - ' + label + (audio.quality ? ' (' + audio.quality + ')' : ''),
    url: url,
    quality: audio.quality,
    format: 'hls',
    isHls: true,
    language: 'tr',
    provider: 'filmmakinesi',
    headers: headers,
    behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
    subtitles: subtitles
  };
  return quality.sortStreamsByQuality([stream]);
}

async function getStreams(id, mediaType, season, episode) {
  try {
    var info = await tmdb.resolveTmdbInfo(id, mediaType || 'movie');
    var card = await findContent(info, info.isTv);
    if (!card) {
      console.log('[FilmMakinesi] no page for ' + info.title);
      return [];
    }

    var streams = [];
    if (info.isTv) {
      var s = season == null ? 1 : Number(season);
      var e = Number(episode) || 1;
      streams = await resolvePage(episodeUrl(card, s, e));
      if (!streams.length && s !== 1) {
        var absolute = await tmdb.absoluteEpisode(info.id, season, episode, info.seasons);
        streams = await resolvePage(episodeUrl(card, 1, absolute || e));
      }
    } else {
      streams = await resolvePage(card.url);
    }

    if (!streams.length) {
      console.log('[FilmMakinesi] no stream for ' + info.title);
      return [];
    }

    console.log(
      '[FilmMakinesi] ' + info.title +
      (info.isTv ? ' S' + season + 'E' + episode : '') +
      ' -> ' + streams.length + ' stream(s)'
    );
    return streams;
  } catch (e) {
    console.log('[FilmMakinesi] error: ' + (e && e.message ? e.message : e));
    return [];
  }
}

module.exports = { getStreams: getStreams };
