/** Mecra provider: yabancidizi | 2026.11.25.0049 */
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
        diziyou: "https://www.diziyou.love",
        diziyouStorage: "https://storage.diziyou.love",
        yabancidizi: "https://yabancidizi.news",
        liderfilmizle: "https://liderfilmizle.nl",
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
    function hostOf(url) {
      try {
        return new URL(String(url)).hostname;
      } catch (e) {
        return "";
      }
    }
    function registrableDomain(host) {
      var parts = String(host || "").split(".");
      return parts.length > 2 ? parts.slice(-2).join(".") : parts.join(".");
    }
    function siteRelation(parentUrl, targetUrl) {
      var from = hostOf(parentUrl);
      var to = hostOf(targetUrl);
      if (!from || !to) return "cross-site";
      if (from === to) return "same-origin";
      return registrableDomain(from) === registrableDomain(to) ? "same-site" : "cross-site";
    }
    function frameHeaders(parentUrl, targetUrl) {
      return headers({
        Referer: parentUrl || "",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Sec-Fetch-Dest": "iframe",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": siteRelation(parentUrl, targetUrl),
        "Upgrade-Insecure-Requests": "1"
      });
    }
    var DEFAULT_TIMEOUT = 12e3;
    function withTimeout(promise, ms) {
      if (typeof setTimeout !== "function") return promise;
      return new Promise(function(resolve, reject) {
        var timer = setTimeout(function() {
          reject(new Error("timeout"));
        }, ms || DEFAULT_TIMEOUT);
        promise.then(
          function(value) {
            clearTimeout(timer);
            resolve(value);
          },
          function(error) {
            clearTimeout(timer);
            reject(error);
          }
        );
      });
    }
    function request(url, options) {
      var ms = options && options.timeout || DEFAULT_TIMEOUT;
      return withTimeout(fetch(url, options), ms);
    }
    function fetchText(url, options) {
      return __async(this, null, function* () {
        try {
          var ms = options && options.timeout || DEFAULT_TIMEOUT;
          var res = yield request(url, options);
          if (!res || !res.ok) return null;
          return yield withTimeout(res.text(), ms);
        } catch (e) {
          return null;
        }
      });
    }
    function fetchPage(url, options) {
      return __async(this, null, function* () {
        try {
          var ms = options && options.timeout || DEFAULT_TIMEOUT;
          var res = yield request(url, options);
          if (!res || !res.ok) return null;
          return {
            url: res.url || url,
            html: yield withTimeout(res.text(), ms)
          };
        } catch (e) {
          return null;
        }
      });
    }
    function fetchJson(url, options) {
      return __async(this, null, function* () {
        try {
          var ms = options && options.timeout || DEFAULT_TIMEOUT;
          var res = yield request(url, options);
          if (!res || !res.ok) return null;
          return yield withTimeout(res.json(), ms);
        } catch (e) {
          return null;
        }
      });
    }
    function fetchStatus(url, options) {
      return __async(this, null, function* () {
        try {
          var res = yield request(url, options);
          return res ? res.status : 0;
        } catch (e) {
          return 0;
        }
      });
    }
    module2.exports = {
      headers,
      frameHeaders,
      hostOf,
      fetchText,
      fetchPage,
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
        return http2.fetchJson(
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
          var data = yield http2.fetchJson(api("/tv/" + tmdbId, { language: "en-US" }));
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
      resolveTmdbInfo,
      absoluteEpisode
    };
  }
});

// src/shared/text.js
var require_text = __commonJS({
  "src/shared/text.js"(exports2, module2) {
    var ENTITIES = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
      nbsp: " ",
      iexcl: "\xA1",
      cent: "\xA2",
      pound: "\xA3",
      curren: "\xA4",
      yen: "\xA5",
      brvbar: "\xA6",
      sect: "\xA7",
      uml: "\xA8",
      copy: "\xA9",
      ordf: "\xAA",
      laquo: "\xAB",
      not: "\xAC",
      shy: "\xAD",
      reg: "\xAE",
      macr: "\xAF",
      deg: "\xB0",
      plusmn: "\xB1",
      sup2: "\xB2",
      sup3: "\xB3",
      acute: "\xB4",
      micro: "\xB5",
      para: "\xB6",
      middot: "\xB7",
      cedil: "\xB8",
      sup1: "\xB9",
      ordm: "\xBA",
      raquo: "\xBB",
      frac14: "\xBC",
      frac12: "\xBD",
      frac34: "\xBE",
      iquest: "\xBF",
      times: "\xD7",
      divide: "\xF7",
      Agrave: "\xC0",
      Aacute: "\xC1",
      Acirc: "\xC2",
      Atilde: "\xC3",
      Auml: "\xC4",
      Aring: "\xC5",
      AElig: "\xC6",
      Ccedil: "\xC7",
      Egrave: "\xC8",
      Eacute: "\xC9",
      Ecirc: "\xCA",
      Euml: "\xCB",
      Igrave: "\xCC",
      Iacute: "\xCD",
      Icirc: "\xCE",
      Iuml: "\xCF",
      ETH: "\xD0",
      Ntilde: "\xD1",
      Ograve: "\xD2",
      Oacute: "\xD3",
      Ocirc: "\xD4",
      Otilde: "\xD5",
      Ouml: "\xD6",
      Oslash: "\xD8",
      Ugrave: "\xD9",
      Uacute: "\xDA",
      Ucirc: "\xDB",
      Uuml: "\xDC",
      Yacute: "\xDD",
      THORN: "\xDE",
      szlig: "\xDF",
      agrave: "\xE0",
      aacute: "\xE1",
      acirc: "\xE2",
      atilde: "\xE3",
      auml: "\xE4",
      aring: "\xE5",
      aelig: "\xE6",
      ccedil: "\xE7",
      egrave: "\xE8",
      eacute: "\xE9",
      ecirc: "\xEA",
      euml: "\xEB",
      igrave: "\xEC",
      iacute: "\xED",
      icirc: "\xEE",
      iuml: "\xEF",
      eth: "\xF0",
      ntilde: "\xF1",
      ograve: "\xF2",
      oacute: "\xF3",
      ocirc: "\xF4",
      otilde: "\xF5",
      ouml: "\xF6",
      oslash: "\xF8",
      ugrave: "\xF9",
      uacute: "\xFA",
      ucirc: "\xFB",
      uuml: "\xFC",
      yacute: "\xFD",
      thorn: "\xFE",
      yuml: "\xFF",
      Scedil: "\u015E",
      scedil: "\u015F",
      Gbreve: "\u011E",
      gbreve: "\u011F",
      Idot: "\u0130",
      inodot: "\u0131",
      hellip: "\u2026",
      mdash: "\u2014",
      ndash: "\u2013",
      lsquo: "\u2018",
      rsquo: "\u2019",
      ldquo: "\u201C",
      rdquo: "\u201D",
      bull: "\u2022",
      trade: "\u2122",
      euro: "\u20AC",
      dagger: "\u2020"
    };
    function decodeEntities(value) {
      if (!value) return "";
      return String(value).replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, function(match, body) {
        if (body.charAt(0) === "#") {
          var code = body.charAt(1) === "x" || body.charAt(1) === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
          if (!code || !isFinite(code)) return match;
          try {
            return typeof String.fromCodePoint === "function" ? String.fromCodePoint(code) : String.fromCharCode(code);
          } catch (e) {
            return match;
          }
        }
        var named = ENTITIES[body];
        if (named === void 0) named = ENTITIES[body.toLowerCase()];
        return named === void 0 ? match : named;
      });
    }
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
      decodeEntities,
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
    var absolute = season == null ? episode : yield tmdb.absoluteEpisode(info.id, season, episode, info.seasons);
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
function kindFor(raw) {
  return String(raw || "").toLowerCase().indexOf("dublaj") !== -1 ? "Dublaj" : "Altyaz\u0131";
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
          language: kindFor(items[i].label),
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

