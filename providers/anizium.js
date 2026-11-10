/** Mecra provider: anizium | v0.1.6 */
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/shared/quality.js
var require_quality = __commonJS({
  "src/shared/quality.js"(exports2, module2) {
    function qualityScore(stream) {
      if (!stream) return 0;
      var text2 = ((stream.quality || "") + " " + (stream.title || "") + " " + (stream.name || "")).toLowerCase();
      if (/\b(4k|2160p?|uhd)\b/.test(text2)) return 2160;
      if (/\b(2k|1440p?|qhd)\b/.test(text2)) return 1440;
      if (/\b(1080p?|fhd)\b/.test(text2)) return 1080;
      if (/\b(720p?)\b/.test(text2)) return 720;
      if (/\b(540p?)\b/.test(text2)) return 540;
      if (/\b(480p?)\b/.test(text2)) return 480;
      if (/\b(360p?)\b/.test(text2)) return 360;
      if (stream.isHls) return 500;
      return 1;
    }
    function sortStreamsByQuality2(streams) {
      if (!Array.isArray(streams) || streams.length < 2) return streams || [];
      return streams.slice().sort(function(a, b) {
        return qualityScore(b) - qualityScore(a);
      });
    }
    module2.exports = {
      qualityScore,
      sortStreamsByQuality: sortStreamsByQuality2
    };
  }
});

// src/shared/text.js
var require_text = __commonJS({
  "src/shared/text.js"(exports2, module2) {
    function clean(value) {
      if (!value) return "";
      var s = String(value).toLowerCase();
      try {
        if (typeof s.normalize === "function") {
          s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
      } catch (e) {
      }
      return s.replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[ûÛ]/g, "u").replace(/[^a-z0-9]/g, "").trim();
    }
    function slugify(value) {
      if (!value) return "";
      var s = String(value).toLowerCase();
      try {
        if (typeof s.normalize === "function") {
          s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
      } catch (e) {
      }
      return s.replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[ûÛ]/g, "u").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    }
    function score(query, candidate) {
      var q = clean(query);
      var c = clean(candidate);
      if (!q || !c) return 0;
      if (q === c) return 100;
      if (c.indexOf(q) === 0) return 80 - Math.min(20, c.length - q.length);
      if (c.indexOf(q) !== -1) return 60 - Math.min(20, c.length - q.length);
      if (q.indexOf(c) === 0) return 40 - Math.min(20, q.length - c.length);
      return 0;
    }
    function bestMatch(items, titles, getTitle, filter) {
      var best = null;
      var bestScore = 0;
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (filter && !filter(item)) continue;
        var itemTitle = getTitle(item) || "";
        for (var j = 0; j < titles.length; j++) {
          var value = score(titles[j], itemTitle);
          if (value > bestScore) {
            bestScore = value;
            best = item;
          }
        }
      }
      return best;
    }
    module2.exports = {
      clean,
      slugify,
      score,
      bestMatch
    };
  }
});

// src/shared/config.js
var require_config = __commonJS({
  "src/shared/config.js"(exports2, module2) {
    var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    function tmdbKey() {
      try {
        if (typeof TMDB_API_KEY !== "undefined" && TMDB_API_KEY) return TMDB_API_KEY;
      } catch (e) {
      }
      try {
        if (typeof globalThis !== "undefined" && globalThis.TMDB_API_KEY) {
          return globalThis.TMDB_API_KEY;
        }
      } catch (e) {
      }
      return "";
    }
    module2.exports = {
      ua: UA,
      tmdbKey,
      sites: {
        hdfilmcehennemi: "https://www.hdfilmcehennemi.nl",
        hdfilmcehennemiEmbed: "https://hdfilmcehennemi.mobi",
        diziyou: "https://www.diziyou.one",
        diziyouStorage: "https://storage.diziyou.one",
        yabancidizi: "https://yabancidizi.news",
        liderfilmizle: "https://liderfilmizle.vip",
        liderfilmPlay: "https://play.liderfilm.cc",
        cizgimax: "https://cizgimax.online",
        tauVideo: "https://tau-video.xyz",
        aniziumApi: "https://api.anizium.co",
        aniziumSite: "https://anizium.co"
      }
    };
  }
});

// src/shared/http.js
var require_http = __commonJS({
  "src/shared/http.js"(exports2, module2) {
    var config = require_config();
    function headers(extra) {
      var out = {
        "User-Agent": config.ua,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
      };
      if (extra) {
        for (var key in extra) {
          if (Object.prototype.hasOwnProperty.call(extra, key)) out[key] = extra[key];
        }
      }
      return out;
    }
    function fetchText(url, options) {
      return __async(this, null, function* () {
        try {
          var res = yield fetch(url, options);
          if (!res || !res.ok) return null;
          return yield res.text();
        } catch (e) {
          return null;
        }
      });
    }
    function fetchJson(url, options) {
      return __async(this, null, function* () {
        try {
          var res = yield fetch(url, options);
          if (!res || !res.ok) return null;
          return yield res.json();
        } catch (e) {
          return null;
        }
      });
    }
    function fetchStatus(url, options) {
      return __async(this, null, function* () {
        try {
          var res = yield fetch(url, options);
          return res ? res.status : 0;
        } catch (e) {
          return 0;
        }
      });
    }
    module2.exports = {
      headers,
      fetchText,
      fetchJson,
      fetchStatus
    };
  }
});

// src/shared/tmdb.js
var require_tmdb = __commonJS({
  "src/shared/tmdb.js"(exports2, module2) {
    var config = require_config();
    var http = require_http();
    function isTv(mediaType) {
      return mediaType === "tv" || mediaType === "series";
    }
    function api(path, params) {
      var query = "api_key=" + encodeURIComponent(config.tmdbKey());
      if (params) {
        for (var key in params) {
          if (Object.prototype.hasOwnProperty.call(params, key)) {
            query += "&" + key + "=" + encodeURIComponent(params[key]);
          }
        }
      }
      return "https://api.themoviedb.org/3" + path + "?" + query;
    }
    function details(id, type) {
      return __async(this, null, function* () {
        return http.fetchJson(
          api("/" + type + "/" + id, {
            language: "tr-TR",
            append_to_response: "alternative_titles"
          })
        );
      });
    }
    function alternativeTitles(data) {
      var alt = data && data.alternative_titles || {};
      var list = alt.results || alt.titles || [];
      var out = [];
      var seen = {};
      for (var i = 0; i < list.length; i++) {
        var title = String(list[i] && list[i].title || "").trim();
        if (!title || seen[title]) continue;
        seen[title] = true;
        out.push({
          title,
          country: String(list[i] && list[i].iso_3166_1 || "").toUpperCase()
        });
      }
      return out;
    }
    function englishTitleFrom(data) {
      var list = alternativeTitles(data);
      for (var i = 0; i < list.length; i++) {
        if (list[i].country === "US" || list[i].country === "GB") return list[i].title;
      }
      return "";
    }
    function resolveTmdbInfo2(id, mediaType) {
      return __async(this, null, function* () {
        var raw = String(id == null ? "" : id).trim();
        if (raw.indexOf(":") !== -1) raw = raw.split(":")[0];
        var tv = isTv(mediaType);
        var type = tv ? "tv" : "movie";
        var data = null;
        var numericId = null;
        if (raw.indexOf("tt") === 0) {
          var found = yield http.fetchJson(
            api("/find/" + raw, { external_source: "imdb_id", language: "tr-TR" })
          );
          var list = found ? tv ? found.tv_results : found.movie_results : null;
          var item = list && list[0];
          if (item) {
            numericId = item.id;
            data = yield details(numericId, type);
          }
        } else if (/^\d+$/.test(raw)) {
          numericId = raw;
          data = yield details(raw, type);
        }
        if (!data) {
          return {
            id: numericId,
            type,
            isTv: tv,
            title: "",
            originalTitle: "",
            englishTitle: "",
            alternativeTitles: [],
            year: "",
            imdbId: raw.indexOf("tt") === 0 ? raw : "",
            seasons: []
          };
        }
        var date = data.release_date || data.first_air_date || "";
        return {
          id: data.id,
          type,
          isTv: tv,
          title: data.title || data.name || "",
          originalTitle: data.original_title || data.original_name || "",
          englishTitle: englishTitleFrom(data),
          alternativeTitles: alternativeTitles(data),
          year: date ? String(date).split("-")[0] : "",
          imdbId: data.imdb_id || (raw.indexOf("tt") === 0 ? raw : ""),
          seasons: data.seasons || []
        };
      });
    }
    function absoluteEpisode(tmdbId, season, episode, seasons) {
      return __async(this, null, function* () {
        if (season == null || episode == null) return episode;
        var target = Number(episode);
        var seasonNumber = Number(season);
        var list = seasons;
        if (!list || !list.length) {
          var data = yield http.fetchJson(api("/tv/" + tmdbId, { language: "en-US" }));
          list = data && data.seasons || [];
        }
        var seasonInfo = null;
        for (var s = 0; s < list.length; s++) {
          if (Number(list[s].season_number) === seasonNumber) {
            seasonInfo = list[s];
            break;
          }
        }
        if (seasonInfo && target > (seasonInfo.episode_count || 0)) return target;
        var total = 0;
        for (var i = 0; i < list.length; i++) {
          var number = list[i].season_number;
          if (number > 0 && number < seasonNumber) {
            total += list[i].episode_count || 0;
          }
        }
        return total + target;
      });
    }
    module2.exports = {
      isTv,
      resolveTmdbInfo: resolveTmdbInfo2,
      absoluteEpisode
    };
  }
});

// src/anizium/index.js
var quality = require_quality();
var text = require_text();
var tmdb = require_tmdb();
var sortStreamsByQuality = quality.sortStreamsByQuality;
var BASE_URL = "https://api.anizium.co";
var SITE_ORIGIN = "https://anizium.co";
var TOKEN_KEY = "hlxjl1c2w281ax473rt1ofgrvhyjvi";
var TMDB_API_KEY2 = "500330721680edb6d5f7f12ba7cd9023";
var DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Origin": "https://anizium.co",
  "Referer": SITE_ORIGIN + "/",
  "Accept": "application/json, text/plain, */*"
};
function cleanStr(str) {
  if (!str) return "";
  var s = str.toString().toLowerCase();
  try {
    if (typeof s.normalize === "function") {
      s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
  } catch (e) {
  }
  return s.replace(/[ıİ]/g, "i").replace(/[üÜ]/g, "u").replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[ğĞ]/g, "g").replace(/[çÇ]/g, "c").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}
function getIstanbulDay() {
  var days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  var now = /* @__PURE__ */ new Date();
  var utc = now.getTime() + now.getTimezoneOffset() * 6e4;
  var istDate = new Date(utc + 36e5 * 3);
  return days[istDate.getDay()];
}
function xorEncryptHex(text2, key) {
  var out = "";
  for (var i = 0; i < text2.length; i++) {
    var code = text2.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    var hex = code.toString(16);
    out += hex.length < 2 ? "0" + hex : hex;
  }
  return out;
}
function generateCfControl() {
  var weekday = getIstanbulDay();
  var key = TOKEN_KEY + "_" + weekday;
  var randomKey = Math.random().toString(36).substring(2, 8);
  var payload = {};
  payload[randomKey] = Date.now();
  return xorEncryptHex(JSON.stringify(payload), key);
}
function aniziumFetch(endpoint, params) {
  return __async(this, null, function* () {
    var url = BASE_URL + endpoint;
    if (params && Object.keys(params).length > 0) {
      var parts = [];
      for (var k in params) {
        if (params[k] !== void 0 && params[k] !== null) {
          parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
        }
      }
      if (parts.length > 0) {
        url += (url.indexOf("?") === -1 ? "?" : "&") + parts.join("&");
      }
    }
    var headers = Object.assign({}, DEFAULT_HEADERS, {
      "Cf-Control": generateCfControl(),
      "device": "browser",
      "language": "tr",
      "site": "main"
    });
    var res = yield fetch(url, { headers });
    if (!res.ok) return null;
    return yield res.json();
  });
}
function mapLangCode(group) {
  var g = (group || "").toLowerCase();
  switch (g) {
    case "tr":
      return { id: "tr", lang: "tur", language: "tr", label: "T\xFCrk\xE7e" };
    case "en":
      return { id: "en", lang: "eng", language: "en", label: "\u0130ngilizce" };
    case "de":
      return { id: "de", lang: "ger", language: "de", label: "Almanca" };
    case "fr":
      return { id: "fr", lang: "fre", language: "fr", label: "Frans\u0131zca" };
    case "es":
      return { id: "es", lang: "spa", language: "es", label: "\u0130spanyolca" };
    case "it":
      return { id: "it", lang: "ita", language: "it", label: "\u0130talyanca" };
    case "ar":
      return { id: "ar", lang: "ara", language: "ar", label: "Arap\xE7a" };
    default:
      return { id: g || "unknown", lang: g || "und", language: g || "und", label: g ? g.toUpperCase() : "Altyaz\u0131" };
  }
}
function formatSubtitles(rawSubs) {
  if (!rawSubs || rawSubs.length === 0) return [];
  var subs = [];
  for (var i = 0; i < rawSubs.length; i++) {
    var s = rawSubs[i];
    if (!s || !s.link) continue;
    var info = mapLangCode(s.group);
    var label = s.name || info.label;
    subs.push({
      id: info.id + "_" + (i + 1),
      url: s.link,
      file: s.link,
      link: s.link,
      lang: info.lang,
      language: info.language,
      label,
      name: label,
      title: label,
      format: "vtt",
      type: "text/vtt",
      mimeType: "text/vtt",
      headers: {
        "Referer": SITE_ORIGIN + "/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    });
  }
  return subs;
}
function resolveTmdbInfo(id, mediaType) {
  return __async(this, null, function* () {
    try {
      var cleanId = String(id || "").trim();
      if (cleanId.indexOf(":") !== -1) cleanId = cleanId.split(":")[0];
      var numericId = null;
      var titles = [];
      if (cleanId.indexOf("tt") === 0) {
        var findRes = yield fetch("https://api.themoviedb.org/3/find/" + cleanId + "?api_key=" + TMDB_API_KEY2 + "&external_source=imdb_id");
        if (findRes.ok) {
          var fData = yield findRes.json();
          var item = mediaType === "tv" || mediaType === "series" ? fData.tv_results && fData.tv_results[0] : fData.movie_results && fData.movie_results[0];
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
        var type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
        var enRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY2);
        if (enRes.ok) {
          var enData = yield enRes.json();
          if (enData.name) titles.push(enData.name);
          if (enData.title) titles.push(enData.title);
          if (enData.original_name) titles.push(enData.original_name);
          if (enData.original_title) titles.push(enData.original_title);
        }
        var trRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "?api_key=" + TMDB_API_KEY2 + "&language=tr-TR");
        if (trRes.ok) {
          var trData = yield trRes.json();
          if (trData.name) titles.push(trData.name);
          if (trData.title) titles.push(trData.title);
        }
        var altRes = yield fetch("https://api.themoviedb.org/3/" + type + "/" + numericId + "/alternative_titles?api_key=" + TMDB_API_KEY2);
        if (altRes.ok) {
          var altData = yield altRes.json();
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
      return { numericId, uniqueQueries };
    } catch (e) {
      return { numericId: null, uniqueQueries: [] };
    }
  });
}
function typeAllowed(item, isTv) {
  if (!item) return false;
  if (isTv) return item.type !== "movie";
  return item.type === "movie";
}
function searchAnizium(queries, isTv) {
  return __async(this, null, function* () {
    if (!queries || queries.length === 0) return null;
    var fallback = null;
    for (var i = 0; i < queries.length; i++) {
      var q = queries[i];
      var query = cleanStr(q);
      if (!query) continue;
      var sData = yield aniziumFetch("/page/search", { value: q, page: 1 });
      var items = sData && sData.page && sData.page.data ? sData.page.data : [];
      var prefix = null;
      var contains = null;
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        if (!typeAllowed(item, isTv)) continue;
        var name = cleanStr(item.name || "");
        if (name === query) return item;
        if (!prefix && name.indexOf(query) === 0) prefix = item;
        if (!contains && name.indexOf(query) !== -1) contains = item;
        if (!fallback && name.indexOf(query.split(" ")[0]) !== -1) fallback = item;
      }
      if (prefix) return prefix;
      if (contains) return contains;
    }
    return fallback;
  });
}
function getStreams(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var rawId = String(id || "").trim();
      var isTv = mediaType === "tv" || mediaType === "series";
      var sNum = parseInt(season) || 1;
      var eNum = parseInt(episode) || 1;
      var aniziumId = null;
      var isSeries = isTv;
      var tmdbNumericId = null;
      if (rawId.indexOf("anizium:ep:") === 0) {
        var parts = rawId.split(":");
        aniziumId = parts[2];
        sNum = parseInt(parts[3]) || 1;
        eNum = parseInt(parts[4]) || 1;
        isSeries = true;
      } else if (rawId.indexOf("anizium:movie:") === 0) {
        aniziumId = rawId.replace("anizium:movie:", "");
        isSeries = false;
      } else if (rawId.indexOf("anizium:anime:") === 0) {
        aniziumId = rawId.replace("anizium:anime:", "");
      } else {
        var t0 = Date.now();
        var tmdbInfo = yield resolveTmdbInfo(rawId, mediaType);
        tmdbNumericId = tmdbInfo.numericId;
        console.log("[Anizium] tmdb " + (Date.now() - t0) + "ms");
        var t1 = Date.now();
        var matched = yield searchAnizium(tmdbInfo.uniqueQueries, isSeries);
        console.log(
          "[Anizium] search " + (Date.now() - t1) + "ms " + (matched ? matched.name : "no match")
        );
        if (!matched) return [];
        aniziumId = matched.ID;
        if (matched.type === "movie") isSeries = false;
      }
      if (!aniziumId) return [];
      var sourceParams = {
        id: aniziumId,
        site: "main",
        server: "1"
      };
      if (isSeries) {
        sourceParams.season = sNum;
        sourceParams.episode = eNum;
      }
      var t2 = Date.now();
      var srcData = yield aniziumFetch("/anime/source", sourceParams);
      if (isSeries && (!srcData || !srcData.success || !srcData.groups || srcData.groups.length === 0)) {
        var absolute = tmdbNumericId ? yield tmdb.absoluteEpisode(tmdbNumericId, sNum, eNum, null) : eNum;
        if (absolute && (absolute !== eNum || sNum !== 1)) {
          var flatData = yield aniziumFetch("/anime/source", {
            id: aniziumId,
            site: "main",
            server: "1",
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
      console.log("[Anizium] source " + (Date.now() - t2) + "ms");
      if (!srcData || !srcData.success || !srcData.groups || srcData.groups.length === 0) {
        return [];
      }
      var subtitles = formatSubtitles(srcData.subtitles);
      var streams = [];
      var groups = srcData.groups;
      for (var g = 0; g < groups.length; g++) {
        var group = groups[g];
        var isDub = group.group === "trdub";
        var isOriginal = group.group === "original";
        var isEnDub = group.group === "endub";
        var groupTag = isDub ? "T\xFCrk\xE7e Dublaj" : isOriginal ? "Japonca [TR Altyaz\u0131l\u0131]" : isEnDub ? "\u0130ngilizce Dublaj" : group.name || "Japonca";
        var items = group.items || [];
        items.sort(function(a, b) {
          return (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0);
        });
        for (var it = 0; it < items.length; it++) {
          var item = items[it];
          if (!item.link) continue;
          var qLabel = item.quality === 2160 ? "4K UHD" : item.quality === 1440 ? "2K QHD" : item.quality + "p";
          var contentLang = isDub ? "tr" : isEnDub ? "en" : "ja";
          var streamHeaders = {
            "User-Agent": DEFAULT_HEADERS["User-Agent"],
            "Referer": SITE_ORIGIN + "/"
          };
          streams.push({
            name: "Anizium",
            title: "\u231C Anizium \u231F | " + groupTag + " [" + qLabel + "]",
            url: item.link,
            quality: qLabel,
            format: item.type || "mp4",
            isHls: item.type === "hls",
            contentLanguage: contentLang,
            provider: "anizium",
            headers: streamHeaders,
            behaviorHints: {
              notWebReady: false,
              proxyHeaders: { request: streamHeaders }
            },
            subtitles: subtitles.length > 0 ? subtitles : void 0
          });
        }
      }
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function getSubtitles(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var rawId = String(id || "").trim();
      var isTv = mediaType === "tv" || mediaType === "series";
      var sNum = parseInt(season) || 1;
      var eNum = parseInt(episode) || 1;
      var aniziumId = null;
      var isSeries = isTv;
      var tmdbNumericId = null;
      if (rawId.indexOf("anizium:ep:") === 0) {
        var parts = rawId.split(":");
        aniziumId = parts[2];
        sNum = parseInt(parts[3]) || 1;
        eNum = parseInt(parts[4]) || 1;
        isSeries = true;
      } else if (rawId.indexOf("anizium:movie:") === 0) {
        aniziumId = rawId.replace("anizium:movie:", "");
        isSeries = false;
      } else if (rawId.indexOf("anizium:anime:") === 0) {
        aniziumId = rawId.replace("anizium:anime:", "");
      } else {
        var tmdbInfo = yield resolveTmdbInfo(rawId, mediaType);
        tmdbNumericId = tmdbInfo.numericId;
        var matched = yield searchAnizium(tmdbInfo.uniqueQueries, isSeries);
        if (!matched) return { subtitles: [] };
        aniziumId = matched.ID;
        if (matched.type === "movie") isSeries = false;
      }
      if (!aniziumId) return { subtitles: [] };
      var sourceParams = { id: aniziumId, site: "main", server: "1" };
      if (isSeries) {
        sourceParams.season = sNum;
        sourceParams.episode = eNum;
      }
      var srcData = yield aniziumFetch("/anime/source", sourceParams);
      if (isSeries && (!srcData || !srcData.subtitles || !srcData.subtitles.length)) {
        var absolute = tmdbNumericId ? yield tmdb.absoluteEpisode(tmdbNumericId, sNum, eNum, null) : eNum;
        if (absolute && (absolute !== eNum || sNum !== 1)) {
          var flatData = yield aniziumFetch("/anime/source", {
            id: aniziumId,
            site: "main",
            server: "1",
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
  });
}
function getCatalog(args) {
  return __async(this, null, function* () {
    try {
      var homeData = yield aniziumFetch("/page/home");
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
        var isMovie = item.type === "movie";
        metas.push({
          id: isMovie ? "anizium:movie:" + item.ID : "anizium:anime:" + item.ID,
          type: isMovie ? "movie" : "series",
          name: item.name || "Anime",
          poster: item.poster || item.details_banner || item.banner,
          background: item.banner || item.details_banner || item.poster,
          description: item.overview || item.name + " - Anizium 4K Anime",
          genres: ["Anime", "Anizium"]
        });
      }
      return { metas };
    } catch (e) {
      return { metas: [] };
    }
  });
}
function getMeta(args) {
  return __async(this, null, function* () {
    try {
      var rawId = typeof args === "string" ? args : args && args.id ? args.id : "";
      if (!rawId || rawId.indexOf("anizium:") !== 0) return { meta: null };
      var cleanId = rawId.replace("anizium:anime:", "").replace("anizium:movie:", "");
      var dRes = yield aniziumFetch("/anime/get", { id: cleanId });
      if (!dRes || !dRes.success || !dRes.data) return { meta: null };
      var d = dRes.data;
      var name = d.name || "Anime";
      var poster = d.poster || d.details_banner || d.banner;
      var bg = d.banner || d.details_banner || poster;
      var desc = d.overview || name + " - Anizium";
      var isMovie = d.type === "movie";
      var videos = [];
      if (!isMovie && d.seasons && d.seasons.length > 0) {
        for (var s = 0; s < d.seasons.length; s++) {
          var season = d.seasons[s];
          var sNum = season.number || 1;
          var eps = season.episodes || [];
          for (var e = 0; e < eps.length; e++) {
            var ep = eps[e];
            var eNum = ep.number || e + 1;
            videos.push({
              id: "anizium:ep:" + cleanId + ":" + sNum + ":" + eNum,
              title: ep.name ? sNum + ". Sezon " + eNum + ". B\xF6l\xFCm - " + ep.name : sNum + ". Sezon " + eNum + ". B\xF6l\xFCm",
              season: sNum,
              episode: eNum
            });
          }
        }
      }
      return {
        meta: {
          id: rawId,
          type: isMovie ? "movie" : "series",
          name,
          poster,
          background: bg,
          description: desc,
          genres: ["Anime", "Anizium"],
          videos: videos.length > 0 ? videos : void 0
        }
      };
    } catch (e2) {
      return { meta: null };
    }
  });
}
if (typeof getStreams === "function") {
  _origGetStreams = getStreams;
  getStreams = function() {
    return __async(this, arguments, function* () {
      var res = yield _origGetStreams.apply(this, arguments);
      return sortStreamsByQuality(res);
    });
  };
}
var _origGetStreams;
if (typeof module !== "undefined") {
  module.exports = {
    getStreams,
    getSubtitles,
    getCatalog,
    getMeta
  };
}
if (typeof globalThis !== "undefined") {
  globalThis.getStreams = getStreams;
  globalThis.getSubtitles = getSubtitles;
  globalThis.getCatalog = getCatalog;
  globalThis.getMeta = getMeta;
}

if (typeof globalThis !== "undefined" && typeof module !== "undefined" && module.exports) {
  if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
  if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
  if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
  if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

