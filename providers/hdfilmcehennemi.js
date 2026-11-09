/** Mecra provider: hdfilmcehennemi | v0.1.0 */
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
    function globalValue(name) {
      try {
        return typeof globalThis !== "undefined" && globalThis[name] ? String(globalThis[name]) : "";
      } catch (e) {
        return "";
      }
    }
    var MUX_BASE = "";
    var MUX_TOKEN = "";
    module2.exports = {
      ua: UA,
      tmdbKey,
      muxBase: MUX_BASE || globalValue("MECRA_MUX_BASE"),
      muxToken: MUX_TOKEN || globalValue("MECRA_MUX_TOKEN"),
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
        var data = yield http2.fetchJson(api("/tv/" + tmdbId, { language: "en-US" }));
        var seasons = data && data.seasons || [];
        var total = 0;
        for (var i = 0; i < seasons.length; i++) {
          var number = seasons[i].season_number;
          if (number > 0 && number < Number(season)) {
            total += seasons[i].episode_count || 0;
          }
        }
        return total + Number(episode);
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

// src/hdfilmcehennemi/index.js
var config = require_config();
var http = require_http();
var tmdb = require_tmdb();
var text = require_text();
var quality = require_quality();
var hls = require_hls();
var BASE = config.sites.hdfilmcehennemi;
var EMBED = config.sites.hdfilmcehennemiEmbed;
function pageHeaders(extra) {
  return http.headers(extra || {});
}
function absolute(value, base) {
  if (!value) return "";
  if (value.indexOf("//") === 0) return "https:" + value;
  if (value.indexOf("http") === 0) return value;
  return new URL(value, base).href;
}
function parseLinks(html) {
  var items = [];
  var tagRe = /<a\b[^>]*>/gi;
  var match;
  while ((match = tagRe.exec(html)) !== null) {
    var tag = match[0];
    var href = tag.match(/href="([^"]+)"/i);
    var title = tag.match(/title="([^"]+)"/i);
    if (!href || !title) continue;
    var url = href[1];
    if (url.indexOf(BASE) !== 0) continue;
    var path = url.slice(BASE.length).replace(/^\/|\/$/g, "");
    if (!path || path.indexOf("/") !== -1) continue;
    items.push({ slug: path, title: title[1] });
  }
  return items;
}
function parseSearchResults(results) {
  var out = [];
  if (!Array.isArray(results)) return out;
  for (var i = 0; i < results.length; i++) {
    var html = results[i];
    if (!html) continue;
    var href = html.match(/href="([^"]+)"/i);
    var title = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
    if (!href) continue;
    out.push({
      url: href[1],
      title: title ? title[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : ""
    });
  }
  return out;
}
function searchSite(info, isTv) {
  return __async(this, null, function* () {
    var titles = [info.title, info.originalTitle, info.englishTitle];
    for (var i = 0; i < titles.length; i++) {
      if (!titles[i]) continue;
      var data = yield http.fetchJson(
        BASE + "/search/?q=" + encodeURIComponent(titles[i]),
        {
          headers: pageHeaders({
            Referer: BASE + "/",
            "X-Requested-With": "fetch",
            Accept: "application/json, text/javascript, */*; q=0.01"
          })
        }
      );
      var items = parseSearchResults(data && data.results);
      if (!items.length) continue;
      var typed = items.filter(function(item) {
        return isTv ? item.url.indexOf("/dizi/") !== -1 : item.url.indexOf("/dizi/") === -1;
      });
      var best = text.bestMatch(typed.length ? typed : items, titles, function(item) {
        return item.title;
      });
      if (best) return best;
    }
    return null;
  });
}
function candidateSlugs(info) {
  var out = [];
  var titles = [info.englishTitle, info.originalTitle, info.title];
  var year = info.year;
  for (var i = 0; i < titles.length; i++) {
    var slug = text.slugify(titles[i]);
    if (!slug) continue;
    out.push(slug);
    if (year) out.push(slug + "-" + year);
    out.push("hd-" + slug + "-izle");
    out.push("1-" + slug + "-izle-6");
    out.push("1-" + slug + "-izle-7");
    out.push("1-" + slug + "-izle-8");
    out.push("1-" + slug + "-izle-10");
    out.push(slug + "-izle");
    out.push(slug + "-hdf");
    out.push(slug + "-film-izle");
    out.push(slug + "-film-izle-hdf-hdf-6");
    out.push(slug + "-film-izle-hdf-hdf-7");
  }
  return out;
}
function pageIsMatch(slug, info) {
  return __async(this, null, function* () {
    var url = BASE + "/" + slug + "/";
    var html = yield http.fetchText(url, { headers: pageHeaders({ Referer: BASE + "/" }) });
    if (!html) return null;
    if (html.indexOf("video/embed") === -1) return null;
    var imdb = html.match(/imdb\.com\/title\/(tt\d+)/i);
    if (imdb && info.imdbId && imdb[1] === info.imdbId) return html;
    var title = html.match(/<title>([^<]+)<\/title>/i);
    var pageTitle = title ? title[1] : "";
    var score = Math.max(
      text.score(info.title, pageTitle),
      text.score(info.originalTitle, pageTitle)
    );
    if (score > 0) return html;
    return null;
  });
}
function slugFromUrl(url) {
  var parts = String(url).replace(/\/+$/, "").split("/");
  return parts[parts.length - 1];
}
function findPage(info) {
  return __async(this, null, function* () {
    var hit = yield searchSite(info, false);
    if (hit) {
      var hitSlug = slugFromUrl(hit.url);
      var hitHtml = yield pageIsMatch(hitSlug, info);
      if (hitHtml) return { slug: hitSlug, html: hitHtml };
    }
    var home = yield http.fetchText(BASE + "/", { headers: pageHeaders({ Referer: BASE + "/" }) });
    if (home) {
      var items = parseLinks(home);
      var best = text.bestMatch(items, [info.title, info.originalTitle, info.englishTitle], function(item) {
        return item.title;
      });
      if (best) {
        var bestHtml = yield pageIsMatch(best.slug, info);
        if (bestHtml) return { slug: best.slug, html: bestHtml };
      }
    }
    var candidates = candidateSlugs(info);
    var seen = {};
    for (var i = 0; i < candidates.length; i++) {
      var slug = candidates[i];
      if (!slug || seen[slug]) continue;
      seen[slug] = true;
      var html = yield pageIsMatch(slug, info);
      if (html) return { slug, html };
    }
    return null;
  });
}
function evaluateScript(script, host, varName) {
  var code = 'var window={location:{hostname:"' + host + '",origin:"https://' + host + '",href:"https://' + host + '/",pathname:"/",search:"",hash:""}};var self=window;var document={location:window.location};var location=window.location;var __atob=(typeof globalThis!=="undefined"&&globalThis.atob)?globalThis.atob:null;var atob=__atob||function(s){var c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";s=String(s).replace(/[^A-Za-z0-9+/=]/g,"");var o="",b=0,n=0;for(var i=0;i<s.length;i++){var v=c.indexOf(s.charAt(i));if(v<0)break;b=(b<<6)|v;n+=6;if(n>=8){n-=8;o+=String.fromCharCode((b>>n)&255)}}return o};' + script + "\nreturn (typeof " + varName + ' !== "undefined") ? ' + varName + " : null;";
  try {
    return new Function(code)();
  } catch (e) {
    return null;
  }
}
function decryptStream(embedHtml, host) {
  var src = embedHtml.match(/sources:\s*\[\{\s*file:\s*([a-zA-Z0-9_$]+)/i);
  if (!src) return null;
  var varName = src[1];
  var blocks = embedHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i].replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    if (block.indexOf("var " + varName) === -1) continue;
    var value = evaluateScript(block, host, varName);
    if (typeof value === "string" && value.indexOf("http") === 0) return value;
  }
  return null;
}
function parseSubtitles(embedHtml) {
  var tracks = embedHtml.match(/tracks:\s*(\[[^\]]*\])/i);
  if (!tracks) return [];
  var list;
  try {
    list = JSON.parse(tracks[1]);
  } catch (e) {
    return [];
  }
  if (!Array.isArray(list)) return [];
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item || !item.file || item.kind !== "captions") continue;
    var label = item.label || "Subtitle";
    var lower = label.toLowerCase();
    var lang = "tr";
    if (lower.indexOf("eng") !== -1 || lower.indexOf("ing") !== -1) lang = "en";
    else if (lower.indexOf("fre") !== -1 || lower.indexOf("fra") !== -1) lang = "fr";
    else if (lower.indexOf("ger") !== -1 || lower.indexOf("alm") !== -1) lang = "de";
    else if (lower.indexOf("spa") !== -1 || lower.indexOf("isp") !== -1) lang = "es";
    out.push({
      id: "hdfc-sub-" + i,
      url: item.file,
      lang,
      label
    });
  }
  return out;
}
function resolvePage(page) {
  return __async(this, null, function* () {
    var html = yield http.fetchText(page, { headers: pageHeaders({ Referer: BASE + "/" }) });
    if (!html) return null;
    var iframe = html.match(/data-src="([^"]*video\/embed[^"]*)"/i);
    if (!iframe) iframe = html.match(/<iframe[^>]+src="([^"]*video\/embed[^"]*)"/i);
    if (!iframe) return null;
    var embedUrl = absolute(iframe[1], page);
    var host = "hdfilmcehennemi.mobi";
    try {
      host = new URL(embedUrl).hostname;
    } catch (e) {
    }
    var embedHtml = yield http.fetchText(embedUrl, {
      headers: pageHeaders({ Referer: BASE + "/" })
    });
    if (!embedHtml) {
      console.log("[HDFilmCehennemi] embed fetch failed: " + embedUrl);
      return null;
    }
    var streamUrl = decryptStream(embedHtml, host);
    if (!streamUrl) {
      console.log("[HDFilmCehennemi] decrypt failed: " + embedUrl);
      return null;
    }
    var headers = pageHeaders({ Referer: "https://" + host + "/" });
    var audio = yield hls.inspect(streamUrl, headers);
    var dual = audio.dual ? hls.label(audio.tracks) : "";
    var title = dual ? "HDFilmCehennemi - Dual [" + dual + "] (1080p)" : "HDFilmCehennemi - T\xFCrk\xE7e (1080p)";
    return {
      name: "HDFilmCehennemi",
      title,
      url: streamUrl.indexOf("#") === -1 ? streamUrl + "#.m3u8" : streamUrl,
      quality: "1080p",
      format: "hls",
      isHls: true,
      language: "tr",
      provider: "hdfilmcehennemi",
      headers,
      behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
      subtitles: parseSubtitles(embedHtml)
    };
  });
}
function parseSeriesLinks(html) {
  var items = [];
  var tagRe = /<a\b[^>]*>/gi;
  var match;
  while ((match = tagRe.exec(html)) !== null) {
    var tag = match[0];
    var href = tag.match(/href="([^"]+\/dizi\/[^"]+)"/i);
    var title = tag.match(/title="([^"]+)"/i);
    if (!href || !title) continue;
    items.push({ url: href[1], title: title[1] });
  }
  return items;
}
function findSeries(info) {
  return __async(this, null, function* () {
    var hit = yield searchSite(info, true);
    if (hit) return { url: hit.url, title: hit.title };
    var html = yield http.fetchText(BASE + "/yabancidiziizle-14/", {
      headers: pageHeaders({ Referer: BASE + "/" })
    });
    if (!html) return null;
    return text.bestMatch(
      parseSeriesLinks(html),
      [info.title, info.originalTitle, info.englishTitle],
      function(item) {
        return item.title;
      }
    );
  });
}
function findEpisodePage(info, show, season, episode) {
  return __async(this, null, function* () {
    var html = yield http.fetchText(show.url, { headers: pageHeaders({ Referer: BASE + "/" }) });
    if (!html) return null;
    var links = [];
    var re = /href="([^"]+\/sezon-(\d+)\/bolum-(\d+)[^"]*)"/gi;
    var match;
    while ((match = re.exec(html)) !== null) {
      links.push({
        url: match[1],
        season: Number(match[2]),
        episode: Number(match[3])
      });
    }
    var s = season == null ? 1 : Number(season);
    var e = Number(episode) || 1;
    var absolute2 = season == null ? e : yield tmdb.absoluteEpisode(info.id, season, episode);
    for (var i = 0; i < links.length; i++) {
      if (links[i].season === s && links[i].episode === e) return links[i].url;
    }
    for (var j = 0; j < links.length; j++) {
      if (links[j].episode === absolute2) return links[j].url;
    }
    return null;
  });
}
function getStreams(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var raw = String(id == null ? "" : id);
      if (raw.indexOf("hdfilmcehennemi:movie:") === 0) {
        var direct = yield resolvePage(BASE + "/" + raw.replace("hdfilmcehennemi:movie:", "") + "/");
        return direct ? [direct] : [];
      }
      var info = yield tmdb.resolveTmdbInfo(id, mediaType || "movie");
      if (info.isTv) {
        var show = yield findSeries(info);
        if (!show) {
          console.log("[HDFilmCehennemi] no series page for " + info.title);
          return [];
        }
        var episodePage = yield findEpisodePage(info, show, season, episode);
        if (!episodePage) {
          console.log("[HDFilmCehennemi] no episode for " + show.title + " S" + season + "E" + episode);
          return [];
        }
        var episodeStream = yield resolvePage(episodePage);
        if (!episodeStream) {
          console.log("[HDFilmCehennemi] no stream on " + episodePage);
          return [];
        }
        console.log("[HDFilmCehennemi] " + show.title + " S" + season + "E" + episode + " -> " + episodeStream.title);
        return quality.sortStreamsByQuality([episodeStream]);
      }
      var found = yield findPage(info);
      if (!found) {
        console.log("[HDFilmCehennemi] no page for " + info.title + " (" + info.originalTitle + ")");
        return [];
      }
      var stream = yield resolvePage(BASE + "/" + found.slug + "/");
      if (!stream) {
        console.log("[HDFilmCehennemi] no stream on " + found.slug);
        return [];
      }
      console.log("[HDFilmCehennemi] " + found.slug + " -> " + stream.title);
      return quality.sortStreamsByQuality([stream]);
    } catch (e) {
      console.log("[HDFilmCehennemi] error: " + (e && e.message ? e.message : e));
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

