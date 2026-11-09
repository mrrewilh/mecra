/** Mecra provider: yabancidizi | v0.1.2 */
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
        var seasonNumber = Number(season);
        var data = yield http2.fetchJson(api("/tv/" + tmdbId, { language: "en-US" }));
        var seasons = data && data.seasons || [];
        var seasonInfo = null;
        for (var s = 0; s < seasons.length; s++) {
          if (Number(seasons[s].season_number) === seasonNumber) {
            seasonInfo = seasons[s];
            break;
          }
        }
        if (seasonInfo && target > (seasonInfo.episode_count || 0)) return target;
        var total = 0;
        for (var i = 0; i < seasons.length; i++) {
          var number = seasons[i].season_number;
          if (number > 0 && number < seasonNumber) {
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

// src/yabancidizi/index.js
var config = require_config();
var http = require_http();
var tmdb = require_tmdb();
var text = require_text();
var quality = require_quality();
var BASE = config.sites.yabancidizi;
function pageHeaders() {
  return http.headers({ Referer: BASE + "/" });
}
function search(query) {
  return __async(this, null, function* () {
    var data = yield http.fetchJson(BASE + "/search?qr=" + encodeURIComponent(query), {
      method: "POST",
      headers: http.headers({
        Referer: BASE + "/",
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/javascript, */*; q=0.01"
      })
    });
    var results = data && data.data && data.data.result;
    return Array.isArray(results) ? results : [];
  });
}
function findShow(info) {
  return __async(this, null, function* () {
    var titles = [info.title, info.originalTitle, info.englishTitle];
    var all = [];
    for (var i = 0; i < titles.length; i++) {
      if (!titles[i]) continue;
      var results = yield search(titles[i]);
      for (var j = 0; j < results.length; j++) all.push(results[j]);
      if (all.length) break;
    }
    if (!all.length) return null;
    var best = text.bestMatch(
      all,
      titles,
      function(item) {
        return item.s_name;
      },
      function(item) {
        return info.isTv ? item.s_type !== "1" : item.s_type === "1";
      }
    );
    return best || null;
  });
}
function extractVidmoly(html) {
  var out = [];
  var seen = {};
  var re = /<a\b[^>]*href="(https?:\/\/vidmoly\.[^"]+\/(?:dl\/|embed-)([a-zA-Z0-9_-]+))"[^>]*>([\s\S]*?)<\/a>/gi;
  var match;
  while ((match = re.exec(html)) !== null) {
    var id = match[2];
    if (seen[id]) continue;
    seen[id] = true;
    var label = match[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    out.push({ id, label });
  }
  if (out.length === 0) {
    var idRe = /vidmoly\.[a-z0-9]+\/(?:dl\/|embed-)([a-zA-Z0-9_-]+)/gi;
    while ((match = idRe.exec(html)) !== null) {
      if (seen[match[1]]) continue;
      seen[match[1]] = true;
      out.push({ id: match[1], label: "" });
    }
  }
  return out;
}
function resolveVidmoly(id) {
  return __async(this, null, function* () {
    var embed = "https://vidmoly.biz/embed-" + id + ".html";
    var html = yield http.fetchText(embed, {
      headers: http.headers({ Referer: BASE + "/" })
    });
    if (!html) return null;
    var match = html.match(/file\s*:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i);
    return match ? match[1] : null;
  });
}
function episodePage(slug, season, episode) {
  return __async(this, null, function* () {
    var s = season == null ? 1 : Number(season);
    var e = Number(episode) || 1;
    var urls = [
      BASE + "/dizi/" + slug + "/sezon-" + s + "/bolum-" + e,
      BASE + "/dizi/" + slug + "/sezon-" + s + "/bolum-" + e + "/"
    ];
    for (var i = 0; i < urls.length; i++) {
      var html = yield http.fetchText(urls[i], { headers: pageHeaders() });
      if (html && html.indexOf("vidmoly") !== -1) return html;
    }
    return null;
  });
}
function findEpisode(info, show, season, episode) {
  return __async(this, null, function* () {
    var exact = yield episodePage(show.s_link, season, episode);
    if (exact) return exact;
    var absolute = season == null ? episode : yield tmdb.absoluteEpisode(info.id, season, episode);
    if (absolute && absolute !== Number(episode)) {
      return episodePage(show.s_link, 1, absolute);
    }
    return null;
  });
}
function labelFor(raw) {
  var lower = String(raw || "").toLowerCase();
  if (lower.indexOf("dublaj") !== -1) return "T\xFCrk\xE7e Dublaj";
  if (lower.indexOf("altyaz") !== -1) return "T\xFCrk\xE7e Altyaz\u0131l\u0131";
  if (lower.indexOf("ingilizce") !== -1) return "\u0130ngilizce Altyaz\u0131l\u0131";
  return "T\xFCrk\xE7e Altyaz\u0131l\u0131";
}
function getStreams(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var info = yield tmdb.resolveTmdbInfo(id, mediaType || "tv");
      if (!info.isTv) return [];
      var show = yield findShow(info);
      if (!show) return [];
      var html = yield findEpisode(info, show, season, episode);
      if (!html) return [];
      var items = extractVidmoly(html);
      var streams = [];
      for (var i = 0; i < items.length; i++) {
        var url = yield resolveVidmoly(items[i].id);
        if (!url) continue;
        var headers = http.headers({ Referer: "https://vidmoly.biz/" });
        streams.push({
          name: "Yabanc\u0131Dizi",
          title: "Yabanc\u0131Dizi - " + labelFor(items[i].label) + " (1080p)",
          url,
          quality: "1080p",
          format: "hls",
          isHls: true,
          language: "tr",
          provider: "yabancidizi",
          headers,
          behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } }
        });
      }
      console.log("[YabanciDizi] " + show.s_name + " S" + season + "E" + episode + " -> " + streams.length);
      return quality.sortStreamsByQuality(streams);
    } catch (e) {
      console.log("[YabanciDizi] error: " + (e && e.message ? e.message : e));
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

