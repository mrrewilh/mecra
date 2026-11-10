/**
 * Anizium provider.
 * Directly based on falsisdev/anthology's Anizium provider (GPL-3.0), with the
 * One Piece fixes: exact/type search and absolute episode mapping.
 */
const quality = require("../shared/quality.js");
const text = require("../shared/text.js");
const tmdb = require("../shared/tmdb.js");

const sortStreamsByQuality = quality.sortStreamsByQuality;

/**
 * Anthology - Anizium Provider
 * 4K & 1080p Türkçe Dublaj ve Altyazılı Anime Kaynağı
 * Doğrudan Backblaze / Cloudflare CDN MP4 akışları ve WebVTT altyazıları sunar.
 */

var BASE_URL = 'https://api.anizium.co';
var SITE_ORIGIN = 'https://anizium.co';
var TOKEN_KEY = 'hlxjl1c2w281ax473rt1ofgrvhyjvi';
var CLIENT_KEY = '16ghkdz5qnwinkyebwopbd94b49xhs';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Origin': 'https://anizium.co',
  'Referer': SITE_ORIGIN + '/',
  'Accept': 'application/json, text/plain, */*'
};

/**
 * QuickJS uyumlu harf katlama ve temizleme
 */
function cleanStr(str) {
  if (!str) return '';
  var s = str.toString().toLowerCase();
  try {
    if (typeof s.normalize === 'function') {
      s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
  } catch (e) {}

  return s
    .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * İstanbul (UTC+3) haftanın günü adını döndürür (küçük harfle)
 */
function getIstanbulDay() {
  var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  var now = new Date();
  var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  var istDate = new Date(utc + (3600000 * 3));
  return days[istDate.getDay()];
}

/**
 * XOR hex şifreleme fonksiyonu (saf JS, QuickJS ve tarayıcı uyumlu)
 */
function xorEncryptHex(text, key) {
  var out = '';
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    var hex = code.toString(16);
    out += hex.length < 2 ? '0' + hex : hex;
  }
  return out;
}

/**
 * Anizium API güvenlik başlığı üretici (Cf-Control)
 */
function generateCfControl() {
  var weekday = getIstanbulDay();
  var key = TOKEN_KEY + '_' + weekday;
  var randomKey = Math.random().toString(36).substring(2, 8);
  var payload = {};
  payload[randomKey] = Date.now();
  return xorEncryptHex(JSON.stringify(payload), key);
}

/**
 * Anizium API GET isteği yardımcısı
 */
async function aniziumFetch(endpoint, params) {
  var url = BASE_URL + endpoint;
  if (params && Object.keys(params).length > 0) {
    var parts = [];
    for (var k in params) {
      if (params[k] !== undefined && params[k] !== null) {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
      }
    }
    if (parts.length > 0) {
      url += (url.indexOf('?') === -1 ? '?' : '&') + parts.join('&');
    }
  }

  var headers = Object.assign({}, DEFAULT_HEADERS, {
    'Cf-Control': generateCfControl(),
    'device': 'browser',
    'language': 'tr',
    'site': 'main'
  });

  var res = await fetch(url, { headers: headers });
  if (!res.ok) return null;
  return await res.json();
}

/**
 * Altyazı dil kodlarını Stremio, Nuvio ve ExoPlayer standartlarına dönüştürür
 */
function mapLangCode(group) {
  var g = (group || '').toLowerCase();
  switch (g) {
    case 'tr': return { id: 'tr', lang: 'tur', language: 'tr', label: 'Türkçe' };
    case 'en': return { id: 'en', lang: 'eng', language: 'en', label: 'İngilizce' };
    case 'de': return { id: 'de', lang: 'ger', language: 'de', label: 'Almanca' };
    case 'fr': return { id: 'fr', lang: 'fre', language: 'fr', label: 'Fransızca' };
    case 'es': return { id: 'es', lang: 'spa', language: 'es', label: 'İspanyolca' };
    case 'it': return { id: 'it', lang: 'ita', language: 'it', label: 'İtalyanca' };
    case 'ar': return { id: 'ar', lang: 'ara', language: 'ar', label: 'Arapça' };
    default:   return { id: g || 'unknown', lang: g || 'und', language: g || 'und', label: (g ? g.toUpperCase() : 'Altyazı') };
  }
}

/**
 * Ham Anizium altyazı dizisini zenginleştirir
 */
function formatSubtitles(rawSubs) {
  if (!rawSubs || rawSubs.length === 0) return [];
  var subs = [];
  for (var i = 0; i < rawSubs.length; i++) {
    var s = rawSubs[i];
    if (!s || !s.link) continue;
    var info = mapLangCode(s.group);
    var label = s.name || info.label;

    subs.push({
      id: info.id + '_' + (i + 1),
      url: s.link,
      file: s.link,
      link: s.link,
      lang: info.lang,
      language: info.language,
      label: label,
      name: label,
      title: label,
      format: 'vtt',
      type: 'text/vtt',
      mimeType: 'text/vtt',
      headers: {
        'Referer': SITE_ORIGIN + '/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });
  }
  return subs;
}

/**
 * TMDB / IMDb ID'den çok dilli başlık araması çözer
 */
async function resolveTmdbInfo(id, mediaType) {
  try {
    var cleanId = String(id || '').trim();
    if (cleanId.indexOf(':') !== -1) cleanId = cleanId.split(':')[0];

    var numericId = null;
    var titles = [];

    if (cleanId.indexOf('tt') === 0) {
      var findRes = await fetch('https://api.themoviedb.org/3/find/' + cleanId + '?api_key=' + TMDB_API_KEY + '&external_source=imdb_id');
      if (findRes.ok) {
        var fData = await findRes.json();
        var item = (mediaType === 'tv' || mediaType === 'series')
          ? (fData.tv_results && fData.tv_results[0])
          : (fData.movie_results && fData.movie_results[0]);
        if (item) {
          numericId = item.id;
          if (item.name) titles.push(item.name);
          if (item.title) titles.push(item.title);
          if (item.original_name) titles.push(item.original_name);
          if (item.original_title) titles.push(item.original_title);
        }
      }
    } else {
      numericId = cleanId;
    }

    if (numericId) {
      var type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
      
      // İngilizce ana başlık
      var enRes = await fetch('https://api.themoviedb.org/3/' + type + '/' + numericId + '?api_key=' + TMDB_API_KEY);
      if (enRes.ok) {
        var enData = await enRes.json();
        if (enData.name) titles.push(enData.name);
        if (enData.title) titles.push(enData.title);
        if (enData.original_name) titles.push(enData.original_name);
        if (enData.original_title) titles.push(enData.original_title);
      }

      // Türkçe başlık
      var trRes = await fetch('https://api.themoviedb.org/3/' + type + '/' + numericId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
      if (trRes.ok) {
        var trData = await trRes.json();
        if (trData.name) titles.push(trData.name);
        if (trData.title) titles.push(trData.title);
      }

      // Alternatif başlıklar
      var altRes = await fetch('https://api.themoviedb.org/3/' + type + '/' + numericId + '/alternative_titles?api_key=' + TMDB_API_KEY);
      if (altRes.ok) {
        var altData = await altRes.json();
        var alts = altData.titles || altData.results || [];
        for (var i = 0; i < Math.min(alts.length, 6); i++) {
          if (alts[i].title) titles.push(alts[i].title);
        }
      }
    }

    var uniqueQueries = [];
    for (var j = 0; j < titles.length; j++) {
      var c = cleanStr(titles[j]);
      if (c && c.length >= 2 && uniqueQueries.indexOf(c) === -1) {
        uniqueQueries.push(c);
      }
    }

    return { numericId: numericId, uniqueQueries: uniqueQueries };
  } catch (e) {
    return { numericId: null, uniqueQueries: [] };
  }
}

/**
 * Anizium üzerinde anime arayıp en iyi eşleşmeyi bulur
 */
function typeAllowed(item, isTv) {
  if (!item) return false;
  if (isTv) return item.type !== 'movie';
  return item.type === 'movie';
}

async function searchAnizium(queries, isTv) {
  if (!queries || queries.length === 0) return null;
  var fallback = null;

  for (var i = 0; i < queries.length; i++) {
    var q = queries[i];
    var query = cleanStr(q);
    if (!query) continue;

    var sData = await aniziumFetch('/page/search', { value: q, page: 1 });
    var items = (sData && sData.page && sData.page.data) ? sData.page.data : [];
    var prefix = null;
    var contains = null;

    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      if (!typeAllowed(item, isTv)) continue;
      var name = cleanStr(item.name || '');
      if (name === query) return item;
      if (!prefix && name.indexOf(query) === 0) prefix = item;
      if (!contains && name.indexOf(query) !== -1) contains = item;
      if (!fallback && name.indexOf(query.split(' ')[0]) !== -1) fallback = item;
    }

    if (prefix) return prefix;
    if (contains) return contains;
  }

  return fallback;
}

/**
 * Video akışlarını çeker (Her stream'e tam altyazı listesini iliştirir)
 */
async function getStreams(id, mediaType, season, episode) {
  try {
    var rawId = String(id || '').trim();
    var isTv = mediaType === 'tv' || mediaType === 'series';
    var sNum = parseInt(season) || 1;
    var eNum = parseInt(episode) || 1;

    var aniziumId = null;
    var isSeries = isTv;
    var tmdbNumericId = null;

    // Doğrudan anizium ID formatları
    if (rawId.indexOf('anizium:ep:') === 0) {
      // Format: anizium:ep:id:season:episode
      var parts = rawId.split(':');
      aniziumId = parts[2];
      sNum = parseInt(parts[3]) || 1;
      eNum = parseInt(parts[4]) || 1;
      isSeries = true;
    } else if (rawId.indexOf('anizium:movie:') === 0) {
      aniziumId = rawId.replace('anizium:movie:', '');
      isSeries = false;
    } else if (rawId.indexOf('anizium:anime:') === 0) {
      aniziumId = rawId.replace('anizium:anime:', '');
    } else {
      // IMDb veya TMDB ID üzerinden arama
      var t0 = Date.now();
      var tmdbInfo = await resolveTmdbInfo(rawId, mediaType);
      tmdbNumericId = tmdbInfo.numericId;
      console.log('[Anizium] tmdb ' + (Date.now() - t0) + 'ms');
      var t1 = Date.now();
      var matched = await searchAnizium(tmdbInfo.uniqueQueries, isSeries);
      console.log(
        '[Anizium] search ' + (Date.now() - t1) + 'ms ' + (matched ? matched.name : 'no match')
      );
      if (!matched) return [];
      aniziumId = matched.ID;
      if (matched.type === 'movie') isSeries = false;
    }

    if (!aniziumId) return [];

    var sourceParams = {
      id: aniziumId,
      site: 'main',
      server: '1'
    };

    if (isSeries) {
      sourceParams.season = sNum;
      sourceParams.episode = eNum;
    }

    var t2 = Date.now();
    var srcData = await aniziumFetch('/anime/source', sourceParams);

    // One Piece S20+ and other flat-season sources: the requested season does
    // not exist, so retry the absolute episode in season 1.
    if (
      isSeries &&
      (!srcData || !srcData.success || !srcData.groups || srcData.groups.length === 0)
    ) {
      var absolute = tmdbNumericId
        ? await tmdb.absoluteEpisode(tmdbNumericId, sNum, eNum, null)
        : eNum;
      if (absolute && (absolute !== eNum || sNum !== 1)) {
        var flatData = await aniziumFetch('/anime/source', {
          id: aniziumId,
          site: 'main',
          server: '1',
          season: 1,
          episode: absolute
        });
        if (flatData && flatData.success && flatData.groups && flatData.groups.length) {
          srcData = flatData;
          sNum = 1;
          eNum = absolute;
        }
      }
    }
    console.log('[Anizium] source ' + (Date.now() - t2) + 'ms');

    if (!srcData || !srcData.success || !srcData.groups || srcData.groups.length === 0) {
      return [];
    }

    // Altyazıları standart formatta hazırla
    var subtitles = formatSubtitles(srcData.subtitles);

    var streams = [];
    var groups = srcData.groups;

    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var isDub = group.group === 'trdub';
      var isOriginal = group.group === 'original';
      var isEnDub = group.group === 'endub';

      var groupTag = isDub ? 'Türkçe Dublaj' : (isOriginal ? 'Japonca [TR Altyazılı]' : (isEnDub ? 'İngilizce Dublaj' : (group.name || 'Japonca')));
      var items = group.items || [];

      // En yüksek kalite en başta olacak şekilde sırala (2160p -> 1080p -> ...)
      items.sort(function(a, b) {
        return (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0);
      });

      for (var it = 0; it < items.length; it++) {
        var item = items[it];
        if (!item.link) continue;

        var qLabel = item.quality === 2160 ? '4K UHD' : (item.quality === 1440 ? '2K QHD' : item.quality + 'p');

        var contentLang = isDub ? 'tr' : (isEnDub ? 'en' : 'ja');
        var streamHeaders = {
          'User-Agent': DEFAULT_HEADERS['User-Agent'],
          'Referer': SITE_ORIGIN + '/'
        };

        streams.push({
          name: 'Anizium',
          title: '⌜ Anizium ⌟ | ' + groupTag + ' [' + qLabel + ']',
          url: item.link,
          quality: qLabel,
          format: item.type || 'mp4',
          isHls: item.type === 'hls',
          contentLanguage: contentLang,
          provider: 'anizium',
          headers: streamHeaders,
          behaviorHints: {
            notWebReady: false,
            proxyHeaders: { request: streamHeaders }
          },
          subtitles: subtitles.length > 0 ? subtitles : undefined
        });
      }
    }

    return streams;
  } catch (e) {
    return [];
  }
}

/**
 * Harici altyazı çekme endpoint'i (Stremio / Nuvio Subtitles Resource API)
 */
async function getSubtitles(id, mediaType, season, episode) {
  try {
    var rawId = String(id || '').trim();
    var isTv = mediaType === 'tv' || mediaType === 'series';
    var sNum = parseInt(season) || 1;
    var eNum = parseInt(episode) || 1;

    var aniziumId = null;
    var isSeries = isTv;
    var tmdbNumericId = null;

    if (rawId.indexOf('anizium:ep:') === 0) {
      var parts = rawId.split(':');
      aniziumId = parts[2];
      sNum = parseInt(parts[3]) || 1;
      eNum = parseInt(parts[4]) || 1;
      isSeries = true;
    } else if (rawId.indexOf('anizium:movie:') === 0) {
      aniziumId = rawId.replace('anizium:movie:', '');
      isSeries = false;
    } else if (rawId.indexOf('anizium:anime:') === 0) {
      aniziumId = rawId.replace('anizium:anime:', '');
    } else {
      var tmdbInfo = await resolveTmdbInfo(rawId, mediaType);
      tmdbNumericId = tmdbInfo.numericId;
      var matched = await searchAnizium(tmdbInfo.uniqueQueries, isSeries);
      if (!matched) return { subtitles: [] };
      aniziumId = matched.ID;
      if (matched.type === 'movie') isSeries = false;
    }

    if (!aniziumId) return { subtitles: [] };

    var sourceParams = { id: aniziumId, site: 'main', server: '1' };
    if (isSeries) {
      sourceParams.season = sNum;
      sourceParams.episode = eNum;
    }

    var srcData = await aniziumFetch('/anime/source', sourceParams);
    if (
      isSeries &&
      (!srcData || !srcData.subtitles || !srcData.subtitles.length)
    ) {
      var absolute = tmdbNumericId
        ? await tmdb.absoluteEpisode(tmdbNumericId, sNum, eNum, null)
        : eNum;
      if (absolute && (absolute !== eNum || sNum !== 1)) {
        var flatData = await aniziumFetch('/anime/source', {
          id: aniziumId,
          site: 'main',
          server: '1',
          season: 1,
          episode: absolute
        });
        if (flatData && flatData.subtitles) srcData = flatData;
      }
    }
    if (!srcData || !srcData.subtitles) return { subtitles: [] };

    return { subtitles: formatSubtitles(srcData.subtitles) };
  } catch (e) {
    return { subtitles: [] };
  }
}

/**
 * Anizium vitrin kataloğu
 */
async function getCatalog(args) {
  try {
    var homeData = await aniziumFetch('/page/home');
    if (!homeData || !homeData.success) return { metas: [] };

    var allAnimes = [];
    if (homeData.settlement_top) allAnimes = allAnimes.concat(homeData.settlement_top);
    if (homeData.settlement_middle) allAnimes = allAnimes.concat(homeData.settlement_middle);
    if (homeData.settlement_lower) allAnimes = allAnimes.concat(homeData.settlement_lower);

    var metas = [];
    var seen = {};

    for (var i = 0; i < allAnimes.length; i++) {
      var item = allAnimes[i];
      if (!item || !item.ID || seen[item.ID]) continue;
      seen[item.ID] = true;

      var isMovie = item.type === 'movie';
      metas.push({
        id: isMovie ? ('anizium:movie:' + item.ID) : ('anizium:anime:' + item.ID),
        type: isMovie ? 'movie' : 'series',
        name: item.name || 'Anime',
        poster: item.poster || item.details_banner || item.banner,
        background: item.banner || item.details_banner || item.poster,
        description: item.overview || (item.name + ' - Anizium 4K Anime'),
        genres: ['Anime', 'Anizium']
      });
    }

    return { metas: metas };
  } catch (e) {
    return { metas: [] };
  }
}

/**
 * Anizium detay ve bölüm listesi
 */
async function getMeta(args) {
  try {
    var rawId = (typeof args === 'string') ? args : (args && args.id ? args.id : '');
    if (!rawId || rawId.indexOf('anizium:') !== 0) return { meta: null };

    var cleanId = rawId.replace('anizium:anime:', '').replace('anizium:movie:', '');
    var dRes = await aniziumFetch('/anime/get', { id: cleanId });
    if (!dRes || !dRes.success || !dRes.data) return { meta: null };

    var d = dRes.data;
    var name = d.name || 'Anime';
    var poster = d.poster || d.details_banner || d.banner;
    var bg = d.banner || d.details_banner || poster;
    var desc = d.overview || (name + ' - Anizium');
    var isMovie = d.type === 'movie';

    var videos = [];
    if (!isMovie && d.seasons && d.seasons.length > 0) {
      for (var s = 0; s < d.seasons.length; s++) {
        var season = d.seasons[s];
        var sNum = season.number || 1;
        var eps = season.episodes || [];
        for (var e = 0; e < eps.length; e++) {
          var ep = eps[e];
          var eNum = ep.number || (e + 1);
          videos.push({
            id: 'anizium:ep:' + cleanId + ':' + sNum + ':' + eNum,
            title: ep.name ? (sNum + '. Sezon ' + eNum + '. Bölüm - ' + ep.name) : (sNum + '. Sezon ' + eNum + '. Bölüm'),
            season: sNum,
            episode: eNum
          });
        }
      }
    }

    return {
      meta: {
        id: rawId,
        type: isMovie ? 'movie' : 'series',
        name: name,
        poster: poster,
        background: bg,
        description: desc,
        genres: ['Anime', 'Anizium'],
        videos: videos.length > 0 ? videos : undefined
      }
    };
  } catch (e) {
    return { meta: null };
  }
}

// ── Universal Quality Sorter ──────────────────────────────────────────
if (typeof getStreams === "function") {
    var _origGetStreams = getStreams;
    getStreams = async function() {
        var res = await _origGetStreams.apply(this, arguments);
        return sortStreamsByQuality(res);
    };
}

if (typeof module !== 'undefined') {
  module.exports = {
    getStreams: getStreams,
    getSubtitles: getSubtitles,
    getCatalog: getCatalog,
    getMeta: getMeta
  };
}
if (typeof globalThis !== 'undefined') {
  globalThis.getStreams = getStreams;
  globalThis.getSubtitles = getSubtitles;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}
