/** Mecra provider: diziyou | v0.1.1 */
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

// src/diziyou/index.js
var config = require_config();
var http = require_http();
var tmdb = require_tmdb();
var text = require_text();
var quality = require_quality();
var BASE = config.sites.diziyou;
var STORAGE = config.sites.diziyouStorage;
function pageHeaders() {
  return http.headers({ Referer: BASE + "/" });
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
    if (url.indexOf(BASE) !== 0 && url.charAt(0) === "/") url = BASE + url;
    if (url.indexOf(BASE) !== 0) continue;
    if (url.indexOf("/kategori/") !== -1 || url.indexOf("/player/") !== -1) continue;
    items.push({ url, title: title[1] });
  }
  return items;
}
function findShow(info) {
  return __async(this, null, function* () {
    var titles = [info.title, info.originalTitle, info.englishTitle];
    for (var i = 0; i < titles.length; i++) {
      if (!titles[i]) continue;
      var html = yield http.fetchText(
        BASE + "/?s=" + encodeURIComponent(titles[i]),
        { headers: pageHeaders() }
      );
      if (!html) continue;
      var items = parseShowLinks(html);
      var best = text.bestMatch(items, titles, function(item) {
        return item.title;
      });
      if (best) return best;
    }
    return null;
  });
}
function slugFromUrl(url) {
  var parts = String(url).replace(/\/+$/, "").split("/");
  return parts[parts.length - 1];
}
function hasEpisode(url) {
  return __async(this, null, function* () {
    var html = yield http.fetchText(url, { headers: pageHeaders() });
    if (!html) return null;
    if (html.indexOf("diziyouPlayer") === -1) return null;
    return { url, html };
  });
}
function findEpisode(show, info, season, episode) {
  return __async(this, null, function* () {
    var slug = slugFromUrl(show.url);
    var baseSlug = slug.replace(/\d+$/, "");
    var candidates = [];
    var s = season == null ? 1 : Number(season);
    var e = Number(episode) || 1;
    candidates.push(BASE + "/" + baseSlug + "-" + s + "-sezon-" + e + "-bolum/");
    candidates.push(BASE + "/" + slug + "-" + s + "-sezon-" + e + "-bolum/");
    if (s !== 1 || season == null) {
      candidates.push(BASE + "/" + baseSlug + "-1-sezon-" + e + "-bolum/");
    }
    for (var i = 0; i < candidates.length; i++) {
      var found = yield hasEpisode(candidates[i]);
      if (found) return found;
    }
    var showHtml = yield http.fetchText(show.url, { headers: pageHeaders() });
    if (!showHtml) return null;
    var absolute = season == null ? e : yield tmdb.absoluteEpisode(info.id, season, episode);
    var links = [];
    var re = /href="([^"]*?(\d+)-sezon-(\d+)-bolum\/?)"/gi;
    var match;
    while ((match = re.exec(showHtml)) !== null) {
      links.push({
        url: match[1].indexOf("http") === 0 ? match[1] : BASE + match[1],
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
  });
}
function buildStreams(info, html, episodeUrl) {
  var src = html.match(/id="diziyouPlayer"[^>]*src="([^"]+)"/i);
  if (!src) src = html.match(/src="([^"]*\/player\/[^"]+)"/i);
  if (!src) return [];
  var itemId = src[1].split("/").pop().split("?")[0].replace(".html", "");
  if (!itemId) return [];
  var subs = [
    {
      id: "diziyou-tr",
      url: STORAGE + "/subtitles/" + itemId + "/tr.vtt",
      lang: "tr",
      label: "T\xFCrk\xE7e"
    }
  ];
  var headers = pageHeaders();
  var streams = [];
  var hasSub = html.indexOf("turkceAltyazili") !== -1;
  var hasDub = html.indexOf("turkceDublaj") !== -1;
  if (hasSub) {
    streams.push({
      name: "DiziYou",
      title: "DiziYou - T\xFCrk\xE7e Altyaz\u0131l\u0131 (1080p)",
      url: STORAGE + "/episodes/" + itemId + "/play.m3u8",
      quality: "1080p",
      format: "hls",
      isHls: true,
      language: "tr",
      provider: "diziyou",
      headers,
      behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
      subtitles: subs
    });
  }
  if (hasDub) {
    streams.push({
      name: "DiziYou",
      title: "DiziYou - T\xFCrk\xE7e Dublaj (1080p)",
      url: STORAGE + "/episodes/" + itemId + "_tr/play.m3u8",
      quality: "1080p",
      format: "hls",
      isHls: true,
      language: "tr",
      provider: "diziyou",
      headers,
      behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
      subtitles: subs
    });
  }
  if (streams.length === 0) {
    streams.push({
      name: "DiziYou",
      title: "DiziYou - T\xFCrk\xE7e (1080p)",
      url: STORAGE + "/episodes/" + itemId + "/play.m3u8",
      quality: "1080p",
      format: "hls",
      isHls: true,
      language: "tr",
      provider: "diziyou",
      headers,
      behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
      subtitles: subs
    });
  }
  return streams;
}
function getStreams(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var info = yield tmdb.resolveTmdbInfo(id, mediaType || "tv");
      if (!info.isTv) return [];
      var titles = [info.title, info.originalTitle, info.englishTitle];
      if (!titles[0] && !titles[1]) return [];
      var show = yield findShow(info);
      if (!show) return [];
      var found = yield findEpisode(show, info, season, episode);
      if (!found) return [];
      console.log(
        "[DiziYou] " + show.title + " S" + (season == null ? "-" : season) + "E" + episode
      );
      return quality.sortStreamsByQuality(buildStreams(info, found.html, found.url));
    } catch (e) {
      console.log("[DiziYou] error: " + (e && e.message ? e.message : e));
      return [];
    }
  });
}
module.exports = { getStreams };

if (typeof globalThis !== "undefined" && typeof module !== "undefined" && module.exports) {
  if (module.exports.getStreams) globalThis.getStreams = module.exports.getStreams;
  if (module.exports.getCatalog) globalThis.getCatalog = module.exports.getCatalog;
  if (module.exports.getMeta) globalThis.getMeta = module.exports.getMeta;
  if (module.exports.getSubtitles) globalThis.getSubtitles = module.exports.getSubtitles;
}

