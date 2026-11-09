/** Mecra provider: liderfilmizle | v0.1.0 */
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

// src/shared/hls.js
var require_hls = __commonJS({
  "src/shared/hls.js"(exports2, module2) {
    var http2 = require_http();
    function parseAudioTracks(playlist) {
      if (!playlist) return [];
      var tracks = [];
      var re = /#EXT-X-MEDIA:TYPE=AUDIO[^\r\n]*/gi;
      var match;
      while ((match = re.exec(playlist)) !== null) {
        var line = match[0];
        var name = line.match(/NAME="([^"]*)"/i);
        var lang = line.match(/LANGUAGE="([^"]*)"/i);
        tracks.push({
          name: name ? name[1] : "",
          language: lang ? lang[1] : ""
        });
      }
      return tracks;
    }
    function inspect(url, headers) {
      return __async(this, null, function* () {
        var playlist = yield http2.fetchText(url, { headers });
        var tracks = parseAudioTracks(playlist);
        return {
          ok: Boolean(playlist),
          tracks,
          dual: tracks.length >= 2
        };
      });
    }
    function label(tracks) {
      if (!tracks || tracks.length < 2) return "";
      var names = [];
      for (var i = 0; i < tracks.length; i++) {
        var name = tracks[i].name || tracks[i].language;
        if (name) names.push(name);
      }
      return names.join(" / ");
    }
    module2.exports = {
      parseAudioTracks,
      inspect,
      label
    };
  }
});

// src/liderfilmizle/index.js
var config = require_config();
var http = require_http();
var tmdb = require_tmdb();
var text = require_text();
var quality = require_quality();
var hls = require_hls();
var BASE = config.sites.liderfilmizle;
var PLAY = config.sites.liderfilmPlay;
function pageHeaders(extra) {
  return http.headers(extra || {});
}
function decodeBase64(value) {
  try {
    var binary = atob(value);
    var encoded = "";
    for (var i = 0; i < binary.length; i++) {
      var hex = binary.charCodeAt(i).toString(16);
      encoded += "%" + (hex.length < 2 ? "0" + hex : hex);
    }
    return decodeURIComponent(encoded);
  } catch (e) {
    return "";
  }
}
function search(query) {
  return __async(this, null, function* () {
    var data = yield http.fetchJson(BASE + "/api/search.php?q=" + encodeURIComponent(query), {
      headers: pageHeaders({ Referer: BASE + "/" })
    });
    return data && Array.isArray(data.results) ? data.results : [];
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
    return text.bestMatch(
      all,
      titles,
      function(item) {
        return item.title || item.original_title;
      },
      function(item) {
        return info.isTv ? item.type === "series" : item.type === "movie";
      }
    );
  });
}
function absoluteUrl(path, base) {
  if (!path) return "";
  if (path.indexOf("http") === 0) return path;
  return new URL(path, base).href;
}
function resolveVod(sourceUrl, pageUrl) {
  return __async(this, null, function* () {
    var html = yield http.fetchText(sourceUrl, { headers: pageHeaders({ Referer: pageUrl }) });
    if (!html) return null;
    var file = html.match(/file:\s*["'](\/player\/stream\.php\?url=[^"']+)["']/i);
    if (!file) file = html.match(/sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/i);
    if (!file) return null;
    var streamUrl = absoluteUrl(file[1].replace(/\\/g, ""), sourceUrl);
    var subtitles = [];
    var re = /file:\s*["']([^"']+\.vtt[^"']*)["']\s*,\s*label:\s*["']([^"']+)["']/gi;
    var match;
    while ((match = re.exec(html)) !== null) {
      var label = match[2];
      var lower = label.toLowerCase();
      var lang = lower.indexOf("ing") !== -1 || lower.indexOf("eng") !== -1 ? "en" : "tr";
      subtitles.push({
        id: "lider-sub-" + subtitles.length,
        url: absoluteUrl(match[1].replace(/\\/g, ""), sourceUrl),
        lang,
        label
      });
    }
    return {
      url: streamUrl,
      quality: "1080p",
      subtitles,
      headers: http.headers({ Referer: sourceUrl })
    };
  });
}
function resolveEmbed(sourceUrl, pageUrl) {
  return __async(this, null, function* () {
    var html = yield http.fetchText(sourceUrl, { headers: pageHeaders({ Referer: pageUrl }) });
    if (!html) return null;
    var iframe = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    var innerUrl = iframe ? iframe[1] : "";
    if (!innerUrl) {
      var guessed = html.match(/https:\/\/[^"']*\/embed-[^"']+\.html/i);
      innerUrl = guessed ? guessed[0] : "";
    }
    if (!innerUrl) return null;
    innerUrl = absoluteUrl(innerUrl, sourceUrl);
    var innerHtml = yield http.fetchText(innerUrl, { headers: pageHeaders({ Referer: sourceUrl }) });
    if (!innerHtml) return null;
    var dl = innerHtml.match(/fetch\(['"](\/dl\?[^'"]+)['"]\)/i);
    if (!dl) dl = innerHtml.match(/get\(['"](https?:\/\/[^'"]+\/dl\?[^'"]+)['"]\)/i);
    if (!dl) return null;
    var dlUrl = absoluteUrl(dl[1], innerUrl);
    var origin = new URL(innerUrl).origin;
    var data = yield http.fetchJson(dlUrl, {
      headers: pageHeaders({
        Referer: innerUrl,
        Origin: origin
      })
    });
    if (!data || !data.url) return null;
    return {
      url: data.url,
      quality: "1080p",
      subtitles: [],
      headers: http.headers({ Referer: origin + "/", Origin: origin })
    };
  });
}
function resolveSource(sourceUrl, pageUrl) {
  return __async(this, null, function* () {
    if (!sourceUrl || sourceUrl.indexOf("youtube.com") !== -1) return null;
    if (sourceUrl.indexOf("/vod/") !== -1) return resolveVod(sourceUrl, pageUrl);
    return resolveEmbed(sourceUrl, pageUrl);
  });
}
function extractStreams(pageUrl) {
  return __async(this, null, function* () {
    var html = yield http.fetchText(pageUrl, { headers: pageHeaders({ Referer: BASE + "/" }) });
    if (!html) return [];
    var vs = html.match(/window\._vs\s*=\s*['"]([^'"]+)['"]/);
    if (!vs) return [];
    var decoded = decodeBase64(vs[1]);
    if (!decoded) return [];
    var sources;
    try {
      sources = JSON.parse(decoded);
    } catch (e) {
      return [];
    }
    if (!Array.isArray(sources)) return [];
    var streams = [];
    for (var i = 0; i < sources.length; i++) {
      var src = sources[i];
      if (!src || !src.url || src.id === "trailer") continue;
      var resolved = yield resolveSource(src.url, pageUrl);
      if (!resolved || !resolved.url) continue;
      var playUrl = resolved.url.indexOf("#") === -1 ? resolved.url + "#.m3u8" : resolved.url;
      var audio = yield hls.inspect(resolved.url, resolved.headers);
      var dual = audio.dual ? hls.label(audio.tracks) : "";
      var title = dual ? "LiderFilm - Dual [" + dual + "] (" + resolved.quality + ")" : "LiderFilm - T\xFCrk\xE7e (" + resolved.quality + ")";
      streams.push({
        name: "LiderFilm",
        title,
        url: playUrl,
        quality: resolved.quality,
        format: "hls",
        isHls: true,
        language: "tr",
        provider: "liderfilmizle",
        headers: resolved.headers,
        behaviorHints: { notWebReady: true, proxyHeaders: { request: resolved.headers } },
        subtitles: resolved.subtitles
      });
    }
    return streams;
  });
}
function findPage(info, show, season, episode) {
  return __async(this, null, function* () {
    if (!info.isTv) return BASE + "/" + show.slug;
    var s = season == null ? 1 : Number(season);
    var e = Number(episode) || 1;
    var page = BASE + "/dizi/" + show.slug + "/sezon-" + s + "/bolum-" + e;
    var html = yield http.fetchText(page, { headers: pageHeaders({ Referer: BASE + "/" }) });
    if (html && html.indexOf("window._vs") !== -1) return page;
    var absolute = season == null ? e : yield tmdb.absoluteEpisode(info.id, season, episode);
    if (absolute && absolute !== e) {
      var fallback = BASE + "/dizi/" + show.slug + "/sezon-1/bolum-" + absolute;
      var fallbackHtml = yield http.fetchText(fallback, {
        headers: pageHeaders({ Referer: BASE + "/" })
      });
      if (fallbackHtml && fallbackHtml.indexOf("window._vs") !== -1) return fallback;
    }
    return null;
  });
}
function getStreams(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var info = yield tmdb.resolveTmdbInfo(id, mediaType || "movie");
      var show = yield findShow(info);
      if (!show) return [];
      var page = yield findPage(info, show, season, episode);
      if (!page) return [];
      var streams = yield extractStreams(page);
      console.log(
        "[LiderFilm] " + (show.title || show.slug) + (info.isTv ? " S" + season + "E" + episode : " movie") + " -> " + streams.length
      );
      return quality.sortStreamsByQuality(streams);
    } catch (e) {
      console.log("[LiderFilm] error: " + (e && e.message ? e.message : e));
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

