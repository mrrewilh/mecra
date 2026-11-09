/** Mecra provider: cizgimax | v0.1.5 */
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

// src/shared/b64.js
var require_b64 = __commonJS({
  "src/shared/b64.js"(exports2, module2) {
    var ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    function binary(value) {
      var input = String(value || "").replace(/[^A-Za-z0-9+/=]/g, "");
      var out = "";
      var buffer = 0;
      var bits = 0;
      for (var i = 0; i < input.length; i++) {
        var index = ABC.indexOf(input.charAt(i));
        if (index < 0) break;
        buffer = buffer << 6 | index;
        bits += 6;
        if (bits >= 8) {
          bits -= 8;
          out += String.fromCharCode(buffer >> bits & 255);
        }
      }
      return out;
    }
    function utf8(input) {
      var out = "";
      var i = 0;
      while (i < input.length) {
        var c = input.charCodeAt(i++);
        if (c < 128) {
          out += String.fromCharCode(c);
        } else if (c < 224) {
          out += String.fromCharCode((c & 31) << 6 | input.charCodeAt(i++) & 63);
        } else if (c < 240) {
          var b2 = input.charCodeAt(i++) & 63;
          var b3 = input.charCodeAt(i++) & 63;
          out += String.fromCharCode((c & 15) << 12 | b2 << 6 | b3);
        } else {
          var b4 = input.charCodeAt(i++) & 63;
          var b5 = input.charCodeAt(i++) & 63;
          var b6 = input.charCodeAt(i++) & 63;
          var cp = ((c & 7) << 18 | b4 << 12 | b5 << 6 | b6) - 65536;
          out += String.fromCharCode(55296 + (cp >> 10), 56320 + (cp & 1023));
        }
      }
      return out;
    }
    function decode(value) {
      return utf8(binary(value));
    }
    module2.exports = {
      binary,
      utf8,
      decode
    };
  }
});

// src/cizgimax/index.js
var config = require_config();
var http = require_http();
var tmdb = require_tmdb();
var text = require_text();
var quality = require_quality();
var b64 = require_b64();
var BASE = config.sites.cizgimax;
var TAU = config.sites.tauVideo;
function pageHeaders(extra) {
  return http.headers(extra || { Referer: BASE + "/" });
}
function parseSearch(html) {
  var items = [];
  var tagRe = /<a\b[^>]*>/gi;
  var match;
  while ((match = tagRe.exec(html)) !== null) {
    var tag = match[0];
    if (tag.indexOf("film-name") === -1 && tag.indexOf("phc-title") === -1) continue;
    var href = tag.match(/href="([^"]+)"/i);
    if (!href) continue;
    var url = href[1];
    if (url.indexOf("/diziler/") === -1 && url.indexOf("/film/") === -1) continue;
    var inner = html.slice(match.index + tag.length, match.index + tag.length + 220);
    var title = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!title) continue;
    items.push({ url: url.indexOf("http") === 0 ? url : BASE + url, title });
  }
  return items;
}
function searchSuggest(query) {
  return __async(this, null, function* () {
    var data = yield http.fetchJson(
      BASE + "/api/search/suggest/?q=" + encodeURIComponent(query),
      { headers: pageHeaders() }
    );
    var animes = data && data.animes || [];
    var out = [];
    for (var i = 0; i < animes.length; i++) {
      var item = animes[i];
      if (!item || !item.url) continue;
      out.push({
        url: item.url.indexOf("http") === 0 ? item.url : BASE + item.url,
        title: item.name || ""
      });
    }
    return out;
  });
}
function findShowPage(info, titles) {
  return __async(this, null, function* () {
    var all = [];
    for (var i = 0; i < titles.length; i++) {
      if (!titles[i]) continue;
      var html = yield http.fetchText(BASE + "/ara/?q=" + encodeURIComponent(titles[i]), {
        headers: pageHeaders()
      });
      if (!html) continue;
      var items = parseSearch(html);
      for (var j = 0; j < items.length; j++) all.push(items[j]);
      if (all.length) break;
    }
    return text.bestMatch(all, titles, function(item) {
      return item.title;
    });
  });
}
function titleVariants(title) {
  var raw = String(title || "").trim();
  var out = [];
  if (!raw) return out;
  out.push(raw);
  var head = raw.split(/\s*[:\-\u2013\u2014]\s*/)[0].trim();
  if (head && head !== raw) out.push(head);
  var words = raw.split(/\s+/);
  if (words.length > 2) out.push(words.slice(0, 2).join(" "));
  return out;
}
function findShow(info) {
  return __async(this, null, function* () {
    var titles = [info.title, info.originalTitle, info.englishTitle];
    var queries = [];
    var seen = {};
    for (var t = 0; t < titles.length; t++) {
      var variants = titleVariants(titles[t]);
      for (var v = 0; v < variants.length; v++) {
        var key = text.clean(variants[v]);
        if (key && !seen[key]) {
          seen[key] = true;
          queries.push(variants[v]);
        }
      }
    }
    for (var i = 0; i < queries.length; i++) {
      var items = yield searchSuggest(queries[i]);
      if (!items.length) continue;
      var best = text.bestMatch(items, titles, function(item) {
        return item.title + " " + item.url;
      });
      if (best) return best;
      return items[0];
    }
    return findShowPage(info, titles);
  });
}
function slugFromShowUrl(url) {
  var match = String(url).match(/\/(?:diziler|film)\/([^\/]+)\/?$/);
  return match ? match[1] : "";
}
function stripSuffix(slug) {
  return String(slug || "").replace(/-izle$/, "").replace(/-izle-\d+$/, "");
}
function tryEpisodePage(url) {
  return __async(this, null, function* () {
    var html = yield http.fetchText(url, { headers: pageHeaders() });
    if (!html) return null;
    if (html.indexOf("serversByLang") === -1 && html.indexOf("var servers") === -1) return null;
    return { html, url };
  });
}
function parseEpisodeLinks(html) {
  var links = [];
  var seen = {};
  var re = /href="\/([^"\/]+)-(\d+)-sezon-(\d+)-bolum-izle\/?"/gi;
  var match;
  while ((match = re.exec(html)) !== null) {
    var key = match[1] + ":" + match[2] + ":" + match[3];
    if (seen[key]) continue;
    seen[key] = true;
    links.push({
      url: BASE + "/" + match[1] + "-" + match[2] + "-sezon-" + match[3] + "-bolum-izle/",
      season: Number(match[2]),
      episode: Number(match[3])
    });
  }
  return links;
}
function findEpisode(info, show, season, episode) {
  return __async(this, null, function* () {
    var slug = stripSuffix(slugFromShowUrl(show.url));
    if (!slug) return null;
    var s = season == null ? 1 : Number(season);
    var e = Number(episode) || 1;
    var first = yield tryEpisodePage(BASE + "/" + slug + "-" + s + "-sezon-" + e + "-bolum-izle/");
    if (first) return first;
    var absolute2 = season == null ? e : yield tmdb.absoluteEpisode(info.id, season, episode, info.seasons);
    if (absolute2 && absolute2 !== e) {
      var fallback = yield tryEpisodePage(
        BASE + "/" + slug + "-1-sezon-" + absolute2 + "-bolum-izle/"
      );
      if (fallback) return { html: fallback.html, url: fallback.url, absolute: absolute2 };
    }
    var showHtml = yield http.fetchText(show.url, { headers: pageHeaders() });
    if (!showHtml) return null;
    var links = parseEpisodeLinks(showHtml);
    for (var i = 0; i < links.length; i++) {
      if (links[i].season === s && links[i].episode === e) {
        var exact = yield tryEpisodePage(links[i].url);
        if (exact) return exact;
      }
    }
    for (var j = 0; j < links.length; j++) {
      if (links[j].episode === absolute2) {
        var abs = yield tryEpisodePage(links[j].url);
        if (abs) return abs;
      }
    }
    return null;
  });
}
function decodeServerList(html) {
  var match = html.match(/var\s+servers\s*=\s*JSON\.parse\(atob\(("(?:\\.|[^"\\])*")\)\)/);
  if (match) {
    try {
      return JSON.parse(b64.decode(JSON.parse(match[1])));
    } catch (e) {
    }
  }
  match = html.match(/var\s+serversByLang\s*=\s*JSON\.parse\(atob\(("(?:\\.|[^"\\])*")\)\)/);
  if (match) {
    try {
      var groups = JSON.parse(b64.decode(JSON.parse(match[1])));
      return groups && groups.dub && groups.dub.length && groups.dub || groups && groups.any && groups.any.length && groups.any || groups && groups.sub && groups.sub.length && groups.sub || [];
    } catch (e) {
    }
  }
  return [];
}
function absolute(base, href) {
  if (!href) return "";
  if (href.indexOf("//") === 0) return "https:" + href;
  if (href.indexOf("http") === 0) return href;
  return new URL(href, base).href;
}
function resolveServer(server) {
  return __async(this, null, function* () {
    if (!server || !server.resolveUrl) return null;
    var resolved = yield http.fetchJson(BASE + server.resolveUrl, { headers: pageHeaders() });
    if (!resolved || !resolved.id) return null;
    return resolved.id;
  });
}
function streamRow(label, url, referer, forceHls) {
  if (!url) return null;
  var isHls = forceHls === void 0 ? /\.m3u8/i.test(url) : forceHls;
  var headers = http.headers({ Referer: referer || BASE + "/" });
  return {
    name: "\xC7izgiMax",
    title: "\xC7izgiMax - " + label + " (" + (isHls ? "HLS" : "MP4") + ")",
    url,
    quality: "auto",
    format: isHls ? "hls" : "mp4",
    isHls,
    language: "tr",
    provider: "cizgimax",
    headers,
    behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
    subtitles: []
  };
}
function extractMedia(html, embedUrl, label, episodeUrl) {
  var out = [];
  var seen = {};
  function add(url2, referer, name) {
    if (!url2 || seen[url2]) return;
    if (!/^https?:/i.test(url2)) return;
    seen[url2] = true;
    var row = streamRow(String(name || label || "").trim(), url2, referer || embedUrl);
    if (row) out.push(row);
  }
  var sib = html.match(/player\.src\(\[\{src:\s*"([^"]+)"/);
  if (sib) add(sib[1], embedUrl);
  var files = /(?:file|src)\s*:\s*['"]([^'"]*\.(?:m3u8|mp4)[^'"]*)['"]/gi;
  var match;
  while ((match = files.exec(html)) !== null) add(match[1], embedUrl);
  var direct = /https?:\/\/[^"'\s<>]+\.(?:m3u8|mp4)[^"'\s<>]*/gi;
  while ((match = direct.exec(html)) !== null) add(match[0], embedUrl);
  var videos = html.match(/"videos"\s*:\s*(\[[^\]]*\])/);
  if (videos) {
    try {
      var list = JSON.parse(videos[1]);
      for (var i = 0; i < list.length; i++) {
        var url = list[i] && list[i].url;
        add(url && url.indexOf("//") === 0 ? "https:" + url : url, "https://ok.ru/");
      }
    } catch (e) {
    }
  }
  return out;
}
function serverStreams(server, episodeUrl) {
  return __async(this, null, function* () {
    if (!server) return [];
    if (server.resolveUrl) {
      var embedId = yield resolveServer(server);
      if (!embedId) return [];
      var data = yield fetchTau(embedId);
      return buildStreams(data, captionsFrom(data));
    }
    if (server.streamUrl) {
      var streamUrl = absolute(episodeUrl, server.streamUrl);
      var isMp4 = server.type === "mailru" || /mp4=1/.test(server.streamUrl);
      var stream = streamRow(server.label || server.type || "Kaynak", streamUrl, episodeUrl, !isMp4);
      return stream ? [stream] : [];
    }
    if (server.src) {
      var embed = absolute(BASE, server.src);
      var html = yield http.fetchText(embed, { headers: pageHeaders({ Referer: episodeUrl }) });
      if (!html) return [];
      return extractMedia(html, embed, server.label || "Kaynak", episodeUrl);
    }
    return [];
  });
}
function fetchTau(embedId) {
  return __async(this, null, function* () {
    return http.fetchJson(TAU + "/api/video/" + encodeURIComponent(embedId), {
      headers: pageHeaders()
    });
  });
}
function captionsFrom(data) {
  var out = [];
  var list = data && data.captions;
  if (!Array.isArray(list)) return out;
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item || !item.url) continue;
    out.push({
      id: "cizgimax-sub-" + i,
      url: item.url,
      lang: String(item.language || "tr").toLowerCase(),
      label: item.name || "T\xFCrk\xE7e"
    });
  }
  return out;
}
function buildStreams(data, subtitles) {
  if (!data || !Array.isArray(data.urls)) return [];
  var headers = pageHeaders();
  var streams = [];
  for (var i = 0; i < data.urls.length; i++) {
    var item = data.urls[i];
    if (!item || !item.url) continue;
    var label = String(item.label || "").toLowerCase();
    if (!/^\d+p$/.test(label)) continue;
    streams.push({
      name: "\xC7izgiMax",
      title: "\xC7izgiMax - T\xFCrk\xE7e (" + label + ")",
      url: item.url,
      quality: label,
      format: "mp4",
      isHls: false,
      language: "tr",
      provider: "cizgimax",
      headers,
      behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
      subtitles
    });
  }
  return streams;
}
function getStreams(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var info = yield tmdb.resolveTmdbInfo(id, mediaType || "tv");
      if (!info.isTv) return [];
      var show = yield findShow(info);
      if (!show) {
        console.log("[CizgiMax] no show for " + info.title);
        return [];
      }
      var found = yield findEpisode(info, show, season, episode);
      if (!found) {
        console.log("[CizgiMax] no episode for " + show.title + " S" + season + "E" + episode);
        return [];
      }
      var servers = decodeServerList(found.html);
      if (!servers.length) return [];
      var streams = [];
      var seen = {};
      for (var i = 0; i < servers.length; i++) {
        var rows = yield serverStreams(servers[i], found.url);
        for (var j = 0; j < rows.length; j++) {
          if (!rows[j] || !rows[j].url || seen[rows[j].url]) continue;
          seen[rows[j].url] = true;
          streams.push(rows[j]);
        }
      }
      if (!streams.length) return [];
      var epNumber = found.absolute || episode;
      for (var s = 0; s < streams.length; s++) {
        streams[s].title = "\xC7izgiMax - B\xF6l\xFCm " + epNumber + " - " + streams[s].title.replace(/^ÇizgiMax - /, "");
      }
      console.log(
        "[CizgiMax] " + show.title + " S" + season + "E" + episode + " -> " + streams.length + " stream(s)"
      );
      return quality.sortStreamsByQuality(streams);
    } catch (e) {
      console.log("[CizgiMax] error: " + (e && e.message ? e.message : e));
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

