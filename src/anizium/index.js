var config = require('../shared/config');
var http = require('../shared/http');
var tmdb = require('../shared/tmdb');
var text = require('../shared/text');
var quality = require('../shared/quality');

var BASE = config.sites.aniziumApi;
var SITE = config.sites.aniziumSite;
var TOKEN_KEY = 'hlxjl1c2w281ax473rt1ofgrvhyjvi';

function cleanStr(value) {
  return text.clean(value);
}

function istanbulDay() {
  var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var now = new Date();
  var utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return days[new Date(utc + 3600000 * 3).getDay()];
}

function xorHex(input, key) {
  var out = '';
  for (var i = 0; i < input.length; i++) {
    var hex = (input.charCodeAt(i) ^ key.charCodeAt(i % key.length)).toString(16);
    out += hex.length < 2 ? '0' + hex : hex;
  }
  return out;
}

function cfControl() {
  var key = TOKEN_KEY + '_' + istanbulDay();
  var random = Math.random().toString(36).substring(2, 8);
  var payload = {};
  payload[random] = Date.now();
  return xorHex(JSON.stringify(payload), key);
}

async function aniziumFetch(endpoint, params) {
  var url = BASE + endpoint;
  if (params) {
    var parts = [];
    for (var key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        if (params[key] !== undefined && params[key] !== null) {
          parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
      }
    }
    if (parts.length) url += (url.indexOf('?') === -1 ? '?' : '&') + parts.join('&');
  }

  return http.fetchJson(url, {
    headers: http.headers({
      Origin: SITE,
      Referer: SITE + '/',
      Accept: 'application/json, text/plain, */*',
      'Cf-Control': cfControl(),
      device: 'browser',
      language: 'tr',
      site: 'main'
    })
  });
}

function langInfo(group) {
  switch (String(group || '').toLowerCase()) {
    case 'tr':
      return { id: 'tr', lang: 'tur', label: 'Türkçe' };
    case 'en':
      return { id: 'en', lang: 'eng', label: 'İngilizce' };
    case 'de':
      return { id: 'de', lang: 'ger', label: 'Almanca' };
    case 'fr':
      return { id: 'fr', lang: 'fre', label: 'Fransızca' };
    case 'es':
      return { id: 'es', lang: 'spa', label: 'İspanyolca' };
    default:
      return {
        id: group || 'und',
        lang: group || 'und',
        label: group ? String(group).toUpperCase() : 'Altyazı'
      };
  }
}

function formatSubtitles(list) {
  if (!Array.isArray(list)) return [];
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item || !item.link) continue;
    var info = langInfo(item.group);
    var label = item.name || info.label;
    out.push({
      id: info.id + '_' + (i + 1),
      url: item.link,
      lang: info.lang,
      label: label
    });
  }
  return out;
}

async function tmdbQueries(info) {
  var queries = [];
  var seen = {};

  function add(value) {
    var raw = String(value || '').trim();
    var key = cleanStr(raw);
    if (!key || key.length < 2 || seen[key]) return;
    seen[key] = true;
    queries.push(raw);
  }

  add(info.title);
  add(info.originalTitle);
  add(info.englishTitle);

  if (info.id) {
    var type = info.isTv ? 'tv' : 'movie';
    var url =
      'https://api.themoviedb.org/3/' +
      type +
      '/' +
      info.id +
      '/alternative_titles?api_key=' +
      encodeURIComponent(config.tmdbKey()) +
      '&language=tr-TR';
    var alt = await http.fetchJson(url);
    var list = (alt && (alt.titles || alt.results)) || [];
    for (var i = 0; i < Math.min(list.length, 8); i++) {
      add(list[i].title);
    }
  }

  return queries;
}

function typeAllowed(item, isTv) {
  if (!item) return false;
  if (isTv) return item.type !== 'movie';
  return item.type === 'movie';
}

async function searchAnizium(queries, isTv) {
  var best = null;
  var bestScore = 0;

  for (var i = 0; i < queries.length; i++) {
    var data = await aniziumFetch('/page/search', { value: queries[i], page: 1 });
    var items = (data && data.page && data.page.data) || [];
    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      if (!typeAllowed(item, isTv)) continue;
      var score = text.score(queries[i], item.name);
      if (score >= 100) return item;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (best) return best;
  }

  if (!best && queries.length) {
    var word = String(queries[0]).split(' ')[0];
    if (word && word.length >= 4) {
      var fallback = await aniziumFetch('/page/search', { value: word, page: 1 });
      var list = (fallback && fallback.page && fallback.page.data) || [];
      for (var k = 0; k < list.length; k++) {
        if (!typeAllowed(list[k], isTv)) continue;
        for (var m = 0; m < queries.length; m++) {
          var value = text.score(queries[m], list[k].name);
          if (value > bestScore) {
            bestScore = value;
            best = list[k];
          }
        }
      }
    }
  }

  return bestScore > 0 ? best : null;
}

function mapAbsolute(seasons, absolute) {
  var total = 0;
  for (var i = 0; i < seasons.length; i++) {
    var episodes = seasons[i].episodes || [];
    var count = episodes.length;
    if (absolute <= total + count) {
      return {
        season: seasons[i].number || 1,
        episode: absolute - total
      };
    }
    total += count;
  }
  if (seasons.length === 1) {
    return { season: seasons[0].number || 1, episode: absolute };
  }
  return null;
}

async function resolveEpisode(aniziumId, season, episode, tmdbId) {
  var detail = await aniziumFetch('/anime/get', { id: aniziumId });
  var data = detail && detail.success ? detail.data : null;
  var seasons = (data && data.seasons) || [];
  if (!seasons.length) return { season: 1, episode: Number(episode) || 1 };

  var s = season == null ? null : Number(season);
  var e = Number(episode) || 1;

  if (s != null) {
    for (var i = 0; i < seasons.length; i++) {
      if (Number(seasons[i].number) !== s) continue;
      var eps = seasons[i].episodes || [];
      for (var j = 0; j < eps.length; j++) {
        if (Number(eps[j].number) === e) return { season: s, episode: e };
      }
    }
  }

  var absolute = season == null ? e : await tmdb.absoluteEpisode(tmdbId, season, episode);
  var mapped = mapAbsolute(seasons, absolute);
  if (mapped) return mapped;
  return { season: seasons[0].number || 1, episode: absolute };
}

function groupInfo(group) {
  var id = String(group.group || '');
  if (id === 'trdub') return { tag: 'Türkçe Dublaj', language: 'tr' };
  if (id === 'original') return { tag: 'Japonca [TR Altyazılı]', language: 'ja' };
  if (id === 'endub') return { tag: 'İngilizce Dublaj', language: 'en' };
  return { tag: group.name || 'Japonca', language: 'ja' };
}

async function sourceData(aniziumId, isSeries, season, episode, tmdbId) {
  var target = { season: 1, episode: Number(episode) || 1 };
  if (isSeries) {
    target = await resolveEpisode(aniziumId, season, episode, tmdbId);
  }
  var params = { id: aniziumId, site: 'main', server: '1' };
  if (isSeries) {
    params.season = target.season;
    params.episode = target.episode;
  }
  var data = await aniziumFetch('/anime/source', params);
  return { data: data, target: target };
}

async function getStreams(id, mediaType, season, episode) {
  try {
    var raw = String(id == null ? '' : id).trim();
    var isSeries = mediaType === 'tv' || mediaType === 'series';
    var aniziumId = null;
    var tmdbId = null;
    var directSeason = season;
    var directEpisode = episode;

    if (raw.indexOf('anizium:ep:') === 0) {
      var parts = raw.split(':');
      aniziumId = parts[2];
      directSeason = parts[3];
      directEpisode = parts[4];
      isSeries = true;
    } else if (raw.indexOf('anizium:movie:') === 0) {
      aniziumId = raw.replace('anizium:movie:', '');
      isSeries = false;
    } else if (raw.indexOf('anizium:anime:') === 0) {
      aniziumId = raw.replace('anizium:anime:', '');
      isSeries = true;
    } else {
      var info = await tmdb.resolveTmdbInfo(raw, mediaType || 'series');
      isSeries = info.isTv;
      tmdbId = info.id;
      var queries = await tmdbQueries(info);
      var matched = await searchAnizium(queries, isSeries);
      if (!matched) return [];
      aniziumId = matched.ID;
      isSeries = matched.type !== 'movie';
    }

    if (!aniziumId) return [];

    var result = await sourceData(aniziumId, isSeries, directSeason, directEpisode, tmdbId);
    var data = result.data;
    if (!data || !data.success || !Array.isArray(data.groups) || !data.groups.length) return [];

    var subtitles = formatSubtitles(data.subtitles);
    var streams = [];

    for (var g = 0; g < data.groups.length; g++) {
      var group = data.groups[g];
      var info2 = groupInfo(group);
      var items = group.items || [];
      items.sort(function (a, b) {
        return (Number(b.quality) || 0) - (Number(a.quality) || 0);
      });

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (!item || !item.link) continue;
        var label =
          Number(item.quality) === 2160
            ? '4K UHD'
            : Number(item.quality) === 1440
              ? '2K QHD'
              : Number(item.quality) + 'p';
        var headers = http.headers({ Referer: SITE + '/' });
        streams.push({
          name: 'Anizium',
          title: 'Anizium - ' + info2.tag + ' (' + label + ')',
          url: item.link,
          quality: label,
          format: item.type || 'mp4',
          isHls: item.type === 'hls',
          language: info2.language,
          provider: 'anizium',
          headers: headers,
          behaviorHints: { notWebReady: false, proxyHeaders: { request: headers } },
          subtitles: subtitles.length ? subtitles : undefined
        });
      }
    }

    console.log(
      '[Anizium] id=' + aniziumId + ' S' + result.target.season + 'E' + result.target.episode +
      ' -> ' + streams.length + ' stream(s)'
    );
    return quality.sortStreamsByQuality(streams);
  } catch (e) {
    console.log('[Anizium] error: ' + (e && e.message ? e.message : e));
    return [];
  }
}

async function getSubtitles(id, mediaType, season, episode) {
  try {
    var raw = String(id == null ? '' : id).trim();
    var isSeries = mediaType === 'tv' || mediaType === 'series';
    var aniziumId = null;
    var tmdbId = null;
    var directSeason = season;
    var directEpisode = episode;

    if (raw.indexOf('anizium:ep:') === 0) {
      var parts = raw.split(':');
      aniziumId = parts[2];
      directSeason = parts[3];
      directEpisode = parts[4];
      isSeries = true;
    } else if (raw.indexOf('anizium:movie:') === 0) {
      aniziumId = raw.replace('anizium:movie:', '');
      isSeries = false;
    } else if (raw.indexOf('anizium:anime:') === 0) {
      aniziumId = raw.replace('anizium:anime:', '');
      isSeries = true;
    } else {
      var info = await tmdb.resolveTmdbInfo(raw, mediaType || 'series');
      isSeries = info.isTv;
      tmdbId = info.id;
      var matched = await searchAnizium(await tmdbQueries(info), isSeries);
      if (!matched) return { subtitles: [] };
      aniziumId = matched.ID;
      isSeries = matched.type !== 'movie';
    }

    if (!aniziumId) return { subtitles: [] };

    var result = await sourceData(aniziumId, isSeries, directSeason, directEpisode, tmdbId);
    var data = result.data;
    if (!data || !data.subtitles) return { subtitles: [] };
    return { subtitles: formatSubtitles(data.subtitles) };
  } catch (e) {
    return { subtitles: [] };
  }
}

async function getMeta(args) {
  try {
    var raw = typeof args === 'string' ? args : args && args.id;
    if (!raw || raw.indexOf('anizium:') !== 0) return { meta: null };
    var cleanId = raw.replace('anizium:anime:', '').replace('anizium:movie:', '');
    var detail = await aniziumFetch('/anime/get', { id: cleanId });
    if (!detail || !detail.success || !detail.data) return { meta: null };
    var data = detail.data;
    var isMovie = data.type === 'movie';
    var videos = [];

    var seasons = data.seasons || [];
    for (var s = 0; s < seasons.length; s++) {
      var season = seasons[s];
      var seasonNumber = season.number || 1;
      var episodes = season.episodes || [];
      for (var e = 0; e < episodes.length; e++) {
        var ep = episodes[e];
        var epNumber = ep.number || e + 1;
        videos.push({
          id: 'anizium:ep:' + cleanId + ':' + seasonNumber + ':' + epNumber,
          title: ep.name
            ? seasonNumber + '. Sezon ' + epNumber + '. Bölüm - ' + ep.name
            : seasonNumber + '. Sezon ' + epNumber + '. Bölüm',
          season: seasonNumber,
          episode: epNumber
        });
      }
    }

    return {
      meta: {
        id: raw,
        type: isMovie ? 'movie' : 'series',
        name: data.name || 'Anime',
        poster: data.poster || data.details_banner || data.banner,
        background: data.banner || data.details_banner || data.poster,
        description: data.overview || data.name || 'Anizium',
        genres: ['Anime', 'Anizium'],
        videos: videos.length ? videos : undefined
      }
    };
  } catch (e) {
    return { meta: null };
  }
}

async function getCatalog() {
  try {
    var home = await aniziumFetch('/page/home');
    if (!home || !home.success) return { metas: [] };
    var all = [];
    if (home.settlement_top) all = all.concat(home.settlement_top);
    if (home.settlement_middle) all = all.concat(home.settlement_middle);
    if (home.settlement_lower) all = all.concat(home.settlement_lower);

    var metas = [];
    var seen = {};
    for (var i = 0; i < all.length; i++) {
      var item = all[i];
      if (!item || !item.ID || seen[item.ID]) continue;
      seen[item.ID] = true;
      var isMovie = item.type === 'movie';
      metas.push({
        id: (isMovie ? 'anizium:movie:' : 'anizium:anime:') + item.ID,
        type: isMovie ? 'movie' : 'series',
        name: item.name || 'Anime',
        poster: item.poster || item.details_banner || item.banner,
        background: item.banner || item.details_banner || item.poster,
        description: item.overview || item.name || 'Anizium',
        genres: ['Anime', 'Anizium']
      });
    }
    return { metas: metas };
  } catch (e) {
    return { metas: [] };
  }
}

module.exports = {
  getStreams: getStreams,
  getSubtitles: getSubtitles,
  getMeta: getMeta,
  getCatalog: getCatalog
};
