/** Mecra provider: anizium | v0.1.0 */
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
    var config2 = require_config();
    function headers(extra) {
      var out = {
        "User-Agent": config2.ua,
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
    var config2 = require_config();
    var http2 = require_http();
    function isTv(mediaType) {
      return mediaType === "tv" || mediaType === "series";
    }
    function api(path, params) {
      var query = "api_key=" + encodeURIComponent(config2.tmdbKey());
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
        return http2.fetchJson(api("/" + type + "/" + id, { language: "tr-TR" }));
      });
    }
    function resolveTmdbInfo(id, mediaType) {
      return __async(this, null, function* () {
        var raw = String(id == null ? "" : id).trim();
        if (raw.indexOf(":") !== -1) raw = raw.split(":")[0];
        var tv = isTv(mediaType);
        var type = tv ? "tv" : "movie";
        var data = null;
        var numericId = null;
        if (raw.indexOf("tt") === 0) {
          var found = yield http2.fetchJson(
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
            year: "",
            imdbId: raw.indexOf("tt") === 0 ? raw : "",
            seasons: []
          };
        }
        var english = yield http2.fetchJson(api("/" + type + "/" + data.id, { language: "en-US" }));
        var date = data.release_date || data.first_air_date || "";
        return {
          id: data.id,
          type,
          isTv: tv,
          title: data.title || data.name || "",
          originalTitle: data.original_title || data.original_name || "",
          englishTitle: english ? english.title || english.name || "" : "",
          year: date ? String(date).split("-")[0] : "",
          imdbId: data.imdb_id || (raw.indexOf("tt") === 0 ? raw : ""),
          seasons: data.seasons || []
        };
      });
    }
    function absoluteEpisode(tmdbId, season, episode) {
      return __async(this, null, function* () {
        if (season == null || episode == null) return episode;
        var target = Number(episode);
        var seasonData = yield http2.fetchJson(
          api("/tv/" + tmdbId + "/season/" + season, { language: "en-US" })
        );
        var seasonEpisodes = seasonData && seasonData.episodes || [];
        if (seasonEpisodes.length) {
          var first = Number(seasonEpisodes[0].episode_number);
          var hasTarget = false;
          for (var s = 0; s < seasonEpisodes.length; s++) {
            if (Number(seasonEpisodes[s].episode_number) === target) {
              hasTarget = true;
              break;
            }
          }
          if (hasTarget && first > 1) return target;
        }
        var data = yield http2.fetchJson(api("/tv/" + tmdbId, { language: "en-US" }));
        var seasons = data && data.seasons || [];
        var total = 0;
        for (var i = 0; i < seasons.length; i++) {
          var number = seasons[i].season_number;
          if (number > 0 && number < Number(season)) {
            total += seasons[i].episode_count || 0;
          }
        }
        return total + target;
      });
    }
    module2.exports = {
      isTv,
      resolveTmdbInfo,
      absoluteEpisode
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
    function sortStreamsByQuality(streams) {
      if (!Array.isArray(streams) || streams.length < 2) return streams || [];
      return streams.slice().sort(function(a, b) {
        return qualityScore(b) - qualityScore(a);
      });
    }
    module2.exports = {
      qualityScore,
      sortStreamsByQuality
    };
  }
});

// src/anizium/index.js
var config = require_config();
var http = require_http();
var tmdb = require_tmdb();
var text = require_text();
var quality = require_quality();
var BASE = config.sites.aniziumApi;
var SITE = config.sites.aniziumSite;
var TOKEN_KEY = "hlxjl1c2w281ax473rt1ofgrvhyjvi";
function cleanStr(value) {
  return text.clean(value);
}
function istanbulDay() {
  var days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  var now = /* @__PURE__ */ new Date();
  var utc = now.getTime() + now.getTimezoneOffset() * 6e4;
  return days[new Date(utc + 36e5 * 3).getDay()];
}
function xorHex(input, key) {
  var out = "";
  for (var i = 0; i < input.length; i++) {
    var hex = (input.charCodeAt(i) ^ key.charCodeAt(i % key.length)).toString(16);
    out += hex.length < 2 ? "0" + hex : hex;
  }
  return out;
}
function cfControl() {
  var key = TOKEN_KEY + "_" + istanbulDay();
  var random = Math.random().toString(36).substring(2, 8);
  var payload = {};
  payload[random] = Date.now();
  return xorHex(JSON.stringify(payload), key);
}
function aniziumFetch(endpoint, params) {
  return __async(this, null, function* () {
    var url = BASE + endpoint;
    if (params) {
      var parts = [];
      for (var key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
          if (params[key] !== void 0 && params[key] !== null) {
            parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
          }
        }
      }
      if (parts.length) url += (url.indexOf("?") === -1 ? "?" : "&") + parts.join("&");
    }
    return http.fetchJson(url, {
      headers: http.headers({
        Origin: SITE,
        Referer: SITE + "/",
        Accept: "application/json, text/plain, */*",
        "Cf-Control": cfControl(),
        device: "browser",
        language: "tr",
        site: "main"
      })
    });
  });
}
function langInfo(group) {
  switch (String(group || "").toLowerCase()) {
    case "tr":
      return { id: "tr", lang: "tur", label: "T\xFCrk\xE7e" };
    case "en":
      return { id: "en", lang: "eng", label: "\u0130ngilizce" };
    case "de":
      return { id: "de", lang: "ger", label: "Almanca" };
    case "fr":
      return { id: "fr", lang: "fre", label: "Frans\u0131zca" };
    case "es":
      return { id: "es", lang: "spa", label: "\u0130spanyolca" };
    default:
      return {
        id: group || "und",
        lang: group || "und",
        label: group ? String(group).toUpperCase() : "Altyaz\u0131"
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
      id: info.id + "_" + (i + 1),
      url: item.link,
      lang: info.lang,
      label
    });
  }
  return out;
}
function tmdbQueries(info) {
  return __async(this, null, function* () {
    var queries = [];
    var seen = {};
    function add(value) {
      var raw = String(value || "").trim();
      var key = cleanStr(raw);
      if (!key || key.length < 2 || seen[key]) return;
      seen[key] = true;
      queries.push(raw);
    }
    add(info.title);
    add(info.originalTitle);
    add(info.englishTitle);
    if (info.id) {
      var type = info.isTv ? "tv" : "movie";
      var url = "https://api.themoviedb.org/3/" + type + "/" + info.id + "/alternative_titles?api_key=" + encodeURIComponent(config.tmdbKey()) + "&language=tr-TR";
      var alt = yield http.fetchJson(url);
      var list = alt && (alt.titles || alt.results) || [];
      for (var i = 0; i < Math.min(list.length, 8); i++) {
        add(list[i].title);
      }
    }
    return queries;
  });
}
function typeAllowed(item, isTv) {
  if (!item) return false;
  if (isTv) return item.type !== "movie";
  return item.type === "movie";
}
function searchAnizium(queries, isTv) {
  return __async(this, null, function* () {
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < queries.length; i++) {
      var data = yield aniziumFetch("/page/search", { value: queries[i], page: 1 });
      var items = data && data.page && data.page.data || [];
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
      var word = String(queries[0]).split(" ")[0];
      if (word && word.length >= 4) {
        var fallback = yield aniziumFetch("/page/search", { value: word, page: 1 });
        var list = fallback && fallback.page && fallback.page.data || [];
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
  });
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
function resolveEpisode(aniziumId, season, episode, tmdbId) {
  return __async(this, null, function* () {
    var detail = yield aniziumFetch("/anime/get", { id: aniziumId });
    var data = detail && detail.success ? detail.data : null;
    var seasons = data && data.seasons || [];
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
    var absolute = season == null ? e : yield tmdb.absoluteEpisode(tmdbId, season, episode);
    var mapped = mapAbsolute(seasons, absolute);
    if (mapped) return mapped;
    return { season: seasons[0].number || 1, episode: absolute };
  });
}
function groupInfo(group) {
  var id = String(group.group || "");
  if (id === "trdub") return { tag: "T\xFCrk\xE7e Dublaj", language: "tr" };
  if (id === "original") return { tag: "Japonca [TR Altyaz\u0131l\u0131]", language: "ja" };
  if (id === "endub") return { tag: "\u0130ngilizce Dublaj", language: "en" };
  return { tag: group.name || "Japonca", language: "ja" };
}
function sourceData(aniziumId, isSeries, season, episode, tmdbId) {
  return __async(this, null, function* () {
    var target = { season: 1, episode: Number(episode) || 1 };
    if (isSeries) {
      target = yield resolveEpisode(aniziumId, season, episode, tmdbId);
    }
    var params = { id: aniziumId, site: "main", server: "1" };
    if (isSeries) {
      params.season = target.season;
      params.episode = target.episode;
    }
    var data = yield aniziumFetch("/anime/source", params);
    return { data, target };
  });
}
function getStreams(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var raw = String(id == null ? "" : id).trim();
      var isSeries = mediaType === "tv" || mediaType === "series";
      var aniziumId = null;
      var tmdbId = null;
      var directSeason = season;
      var directEpisode = episode;
      if (raw.indexOf("anizium:ep:") === 0) {
        var parts = raw.split(":");
        aniziumId = parts[2];
        directSeason = parts[3];
        directEpisode = parts[4];
        isSeries = true;
      } else if (raw.indexOf("anizium:movie:") === 0) {
        aniziumId = raw.replace("anizium:movie:", "");
        isSeries = false;
      } else if (raw.indexOf("anizium:anime:") === 0) {
        aniziumId = raw.replace("anizium:anime:", "");
        isSeries = true;
      } else {
        var info = yield tmdb.resolveTmdbInfo(raw, mediaType || "series");
        isSeries = info.isTv;
        tmdbId = info.id;
        var queries = yield tmdbQueries(info);
        var matched = yield searchAnizium(queries, isSeries);
        if (!matched) return [];
        aniziumId = matched.ID;
        isSeries = matched.type !== "movie";
      }
      if (!aniziumId) return [];
      var result = yield sourceData(aniziumId, isSeries, directSeason, directEpisode, tmdbId);
      var data = result.data;
      if (!data || !data.success || !Array.isArray(data.groups) || !data.groups.length) return [];
      var subtitles = formatSubtitles(data.subtitles);
      var streams = [];
      for (var g = 0; g < data.groups.length; g++) {
        var group = data.groups[g];
        var info2 = groupInfo(group);
        var items = group.items || [];
        items.sort(function(a, b) {
          return (Number(b.quality) || 0) - (Number(a.quality) || 0);
        });
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          if (!item || !item.link) continue;
          var label = Number(item.quality) === 2160 ? "4K UHD" : Number(item.quality) === 1440 ? "2K QHD" : Number(item.quality) + "p";
          var headers = http.headers({ Referer: SITE + "/" });
          streams.push({
            name: "Anizium",
            title: "Anizium - B\xF6l\xFCm " + result.target.episode + " - " + info2.tag + " (" + label + ")",
            url: item.link,
            quality: label,
            format: item.type || "mp4",
            isHls: item.type === "hls",
            language: info2.language,
            provider: "anizium",
            headers,
            behaviorHints: { notWebReady: false, proxyHeaders: { request: headers } },
            subtitles: subtitles.length ? subtitles : void 0
          });
        }
      }
      console.log(
        "[Anizium] id=" + aniziumId + " S" + result.target.season + "E" + result.target.episode + " -> " + streams.length + " stream(s)"
      );
      return quality.sortStreamsByQuality(streams);
    } catch (e) {
      console.log("[Anizium] error: " + (e && e.message ? e.message : e));
      return [];
    }
  });
}
function getSubtitles(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var raw = String(id == null ? "" : id).trim();
      var isSeries = mediaType === "tv" || mediaType === "series";
      var aniziumId = null;
      var tmdbId = null;
      var directSeason = season;
      var directEpisode = episode;
      if (raw.indexOf("anizium:ep:") === 0) {
        var parts = raw.split(":");
        aniziumId = parts[2];
        directSeason = parts[3];
        directEpisode = parts[4];
        isSeries = true;
      } else if (raw.indexOf("anizium:movie:") === 0) {
        aniziumId = raw.replace("anizium:movie:", "");
        isSeries = false;
      } else if (raw.indexOf("anizium:anime:") === 0) {
        aniziumId = raw.replace("anizium:anime:", "");
        isSeries = true;
      } else {
        var info = yield tmdb.resolveTmdbInfo(raw, mediaType || "series");
        isSeries = info.isTv;
        tmdbId = info.id;
        var matched = yield searchAnizium(yield tmdbQueries(info), isSeries);
        if (!matched) return { subtitles: [] };
        aniziumId = matched.ID;
        isSeries = matched.type !== "movie";
      }
      if (!aniziumId) return { subtitles: [] };
      var result = yield sourceData(aniziumId, isSeries, directSeason, directEpisode, tmdbId);
      var data = result.data;
      if (!data || !data.subtitles) return { subtitles: [] };
      return { subtitles: formatSubtitles(data.subtitles) };
    } catch (e) {
      return { subtitles: [] };
    }
  });
}
function getMeta(args) {
  return __async(this, null, function* () {
    try {
      var raw = typeof args === "string" ? args : args && args.id;
      if (!raw || raw.indexOf("anizium:") !== 0) return { meta: null };
      var cleanId = raw.replace("anizium:anime:", "").replace("anizium:movie:", "");
      var detail = yield aniziumFetch("/anime/get", { id: cleanId });
      if (!detail || !detail.success || !detail.data) return { meta: null };
      var data = detail.data;
      var isMovie = data.type === "movie";
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
            id: "anizium:ep:" + cleanId + ":" + seasonNumber + ":" + epNumber,
            title: ep.name ? seasonNumber + ". Sezon " + epNumber + ". B\xF6l\xFCm - " + ep.name : seasonNumber + ". Sezon " + epNumber + ". B\xF6l\xFCm",
            season: seasonNumber,
            episode: epNumber
          });
        }
      }
      return {
        meta: {
          id: raw,
          type: isMovie ? "movie" : "series",
          name: data.name || "Anime",
          poster: data.poster || data.details_banner || data.banner,
          background: data.banner || data.details_banner || data.poster,
          description: data.overview || data.name || "Anizium",
          genres: ["Anime", "Anizium"],
          videos: videos.length ? videos : void 0
        }
      };
    } catch (e2) {
      return { meta: null };
    }
  });
}
function getCatalog() {
  return __async(this, null, function* () {
    try {
      var home = yield aniziumFetch("/page/home");
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
        var isMovie = item.type === "movie";
        metas.push({
          id: (isMovie ? "anizium:movie:" : "anizium:anime:") + item.ID,
          type: isMovie ? "movie" : "series",
          name: item.name || "Anime",
          poster: item.poster || item.details_banner || item.banner,
          background: item.banner || item.details_banner || item.poster,
          description: item.overview || item.name || "Anizium",
          genres: ["Anime", "Anizium"]
        });
      }
      return { metas };
    } catch (e) {
      return { metas: [] };
    }
  });
}
module.exports = {
  getStreams,
  getSubtitles,
  getMeta,
  getCatalog
};

if (typeof globalThis !== "undefined" && typeof module !== "undefined" && module.exports) {
  if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
  if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
  if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
  if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

