/** Mecra provider: hdfilmcehennemi | 2026.11.20.2253 */
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
    function parseVariants(playlist) {
      if (!playlist) return [];
      var out = [];
      var lines = String(playlist).split(/\r?\n/);
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.indexOf("#EXT-X-STREAM-INF") !== 0) continue;
        var resolution = line.match(/RESOLUTION=(\d+)x(\d+)/i);
        var bandwidth = line.match(/BANDWIDTH=(\d+)/i);
        out.push({
          width: resolution ? Number(resolution[1]) : 0,
          height: resolution ? Number(resolution[2]) : 0,
          bandwidth: bandwidth ? Number(bandwidth[1]) : 0
        });
      }
      return out;
    }
    function bestVariant(variants) {
      var best = null;
      for (var i = 0; i < variants.length; i++) {
        var variant = variants[i];
        if (!best) {
          best = variant;
          continue;
        }
        if (variant.width > best.width || variant.width === best.width && variant.height > best.height) {
          best = variant;
        }
      }
      return best;
    }
    function qualityLabel(variants) {
      var best = bestVariant(variants);
      if (!best) return "";
      var width = best.width;
      if (width >= 3800 || best.height >= 2e3) return "2160p";
      if (width >= 2500) return "1440p";
      if (width >= 1900) return "1080p";
      if (width >= 1200) return "720p";
      if (width >= 900) return "540p";
      if (width >= 780) return "480p";
      if (width >= 600) return "360p";
      return best.height ? best.height + "p" : "";
    }
    function inspect(url, headers) {
      return __async(this, null, function* () {
        var playlist = yield http2.fetchText(url, { headers });
        var tracks = parseAudioTracks(playlist);
        var variants = parseVariants(playlist);
        var best = bestVariant(variants);
        return {
          ok: Boolean(playlist),
          tracks,
          dual: tracks.length >= 2,
          variants,
          height: best ? best.height : 0,
          quality: qualityLabel(variants)
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
      parseVariants,
      inspect,
      label
    };
  }
});

// src/shared/closeload.js
var require_closeload = __commonJS({
  "src/shared/closeload.js"(exports2, module2) {
    var config2 = require_config();
    function evaluateScript(script, host, varName, hint) {
      var code = 'var window={location:{hostname:"' + host + '",origin:"https://' + host + '",href:"https://' + host + '/",pathname:"/",search:"",hash:""}};var self=window;var navigator={userAgent:' + JSON.stringify(config2.ua) + ',platform:"Win32",language:"tr-TR"};var screen={width:1920,height:1080,colorDepth:24};var __hint=' + JSON.stringify(hint && hint.value || "") + ";var __attr=" + JSON.stringify(hint && hint.name || "") + ';var __attrs={};if(__attr){__attrs[__attr]={name:__attr,value:__hint};}var __data={};if(__attr.indexOf("data-")===0){__data[__attr.slice(5).replace(/-([a-z])/g,function(m,c){return c.toUpperCase();})]=__hint;}var __el=function(tag){return {tagName:String(tag||"div").toUpperCase(),attributes:__attrs,dataset:__data,getAttribute:function(n){return n===__attr?__hint:(__attrs[n]?__attrs[n].value:"");},setAttribute:function(){},appendChild:function(){},removeChild:function(){},addEventListener:function(){},getContext:function(){return {};},canPlayType:function(){return "";},querySelector:function(){return __el("div");},querySelectorAll:function(){return [];},style:{},children:[],childNodes:[]};};var document={location:window.location,body:__el("body"),head:__el("head"),documentElement:__el("html"),cookie:"",referrer:"",title:"",URL:"",readyState:"complete",hidden:false,visibilityState:"visible",addEventListener:function(){},getElementById:function(){return __el("div");},getElementsByClassName:function(){return [__el("div")];},querySelector:function(){return __el("div");},querySelectorAll:function(){return [__el("div")];},createElement:function(tag){return __el(tag);},getElementsByTagName:function(){return [__el("div")];}};window.navigator=navigator;window.screen=screen;window.document=document;window.innerWidth=1920;window.innerHeight=1080;window.outerWidth=1920;window.outerHeight=1080;window.devicePixelRatio=1;window.addEventListener=function(){};window.__CF$cv$params={r:"",t:0};var __CF$cv$params=window.__CF$cv$params;var parent=window;var top=window;var location=window.location;var __atob=(typeof globalThis!=="undefined"&&globalThis.atob)?globalThis.atob:null;var atob=__atob||function(s){var c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";s=String(s).replace(/[^A-Za-z0-9+/=]/g,"");var o="",b=0,n=0;for(var i=0;i<s.length;i++){var v=c.indexOf(s.charAt(i));if(v<0)break;b=(b<<6)|v;n+=6;if(n>=8){n-=8;o+=String.fromCharCode((b>>n)&255)}}return o};' + script + "\nreturn (typeof " + varName + ' !== "undefined") ? ' + varName + " : null;";
      try {
        return new Function(code)();
      } catch (e) {
        return null;
      }
    }
    function domHint(embedHtml, script) {
      var attr = script.match(/getAttribute\(\s*['"]([^'"]+)['"]\s*\)/) || script.match(/attributes\[\s*['"]([^'"]+)['"]\s*\]/) || script.match(/dataset\.([A-Za-z0-9_$]+)/);
      if (!attr) return { name: "", value: "" };
      var name = attr[1];
      var probe = name.indexOf("data-") === 0 ? name : "data-" + name;
      var match = embedHtml.match(new RegExp(probe + `\\s*=\\s*["\\']([^"\\']*)`, "i"));
      return { name, value: match ? match[1] : "" };
    }
    function decryptStream(embedHtml, host) {
      var plain = embedHtml.match(/sources:\s*\[\{\s*file:\s*["'](https?:\/\/[^"']+)["']/i);
      if (plain) return plain[1];
      var names = [];
      var re = /sources:\s*\[\{\s*file:\s*([a-zA-Z0-9_$]+)/gi;
      var match;
      while ((match = re.exec(embedHtml)) !== null) {
        if (names.indexOf(match[1]) === -1) names.push(match[1]);
      }
      if (!names.length) return null;
      var blocks = embedHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
      var scripts = [];
      for (var i = 0; i < blocks.length; i++) {
        scripts.push(blocks[i].replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, ""));
      }
      for (var n = 0; n < names.length; n++) {
        for (var j = 0; j < scripts.length; j++) {
          if (scripts[j].indexOf("var " + names[n]) === -1) continue;
          var value = evaluateScript(scripts[j], host, names[n], domHint(embedHtml, scripts[j]));
          if (typeof value === "string" && value.indexOf("http") === 0) return value;
        }
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
          id: "closeload-sub-" + i,
          url: item.file,
          lang,
          label
        });
      }
      return out;
    }
    module2.exports = {
      decryptStream,
      parseSubtitles
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
var closeload = require_closeload();
var BASE = config.sites.hdfilmcehennemi;
var MAX_PAGE_TRIES = 5;
var MAX_EMBEDS = 2;
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
    if (!href) continue;
    var title = html.match(/<h[1-6][^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h[1-6]>/i);
    if (!title) title = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
    out.push({
      url: href[1],
      title: title ? text.decodeEntities(title[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() : ""
    });
  }
  return out;
}
function titleQueries(info) {
  var list = [info.title, info.originalTitle, info.englishTitle];
  var alternatives = info.alternativeTitles || [];
  for (var i = 0; i < alternatives.length && list.length < 6; i++) {
    list.push(alternatives[i] && alternatives[i].title);
  }
  var out = [];
  var seen = {};
  for (var j = 0; j < list.length; j++) {
    var title = String(list[j] || "").trim();
    if (!title) continue;
    var key = text.clean(title);
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(title);
  }
  return out;
}
function searchSite(info, isTv) {
  return __async(this, null, function* () {
    var queries = titleQueries(info).slice(0, 4);
    var items = [];
    var seenUrl = {};
    for (var i = 0; i < queries.length; i++) {
      var data = yield http.fetchJson(
        BASE + "/search/?q=" + encodeURIComponent(queries[i]),
        {
          headers: pageHeaders({
            Referer: BASE + "/",
            "X-Requested-With": "fetch",
            Accept: "application/json, text/javascript, */*; q=0.01"
          })
        }
      );
      var found = parseSearchResults(data && data.results);
      for (var j = 0; j < found.length; j++) {
        var item = found[j];
        var isSeries = item.url.indexOf("/dizi/") !== -1;
        if (isSeries !== Boolean(isTv)) continue;
        if (seenUrl[item.url]) continue;
        seenUrl[item.url] = true;
        items.push(item);
      }
    }
    return items;
  });
}
function rankCandidates(items, info) {
  var titles = titleQueries(info);
  var ranked = [];
  for (var i = 0; i < items.length; i++) {
    var best = 0;
    for (var j = 0; j < titles.length; j++) {
      var value = text.score(titles[j], items[i].title);
      if (value > best) best = value;
    }
    if (best > 0) {
      ranked.push({ url: items[i].url, title: items[i].title, score: best });
    }
  }
  ranked.sort(function(a, b) {
    return b.score - a.score;
  });
  return ranked;
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
function pageCandidates(info) {
  return __async(this, null, function* () {
    var out = [];
    var seen = {};
    function push(url, score) {
      if (!url || seen[url]) return;
      seen[url] = true;
      out.push({ url, score });
    }
    var ranked = rankCandidates(yield searchSite(info, false), info);
    for (var i = 0; i < ranked.length; i++) push(ranked[i].url, ranked[i].score);
    return out;
  });
}
function playerEmbeds(html) {
  var out = [];
  var seen = {};
  var tagRe = /<iframe\b[^>]*>/gi;
  var match;
  while ((match = tagRe.exec(html)) !== null) {
    var tag = match[0];
    var src = tag.match(/data-src="([^"]+)"/i) || tag.match(/\ssrc="([^"]+)"/i);
    if (!src) continue;
    var url = absolute(src[1], BASE + "/");
    if (url.indexOf("/video/embed/") === -1) continue;
    if (seen[url]) continue;
    seen[url] = true;
    out.push(url);
  }
  return out;
}
function pageTitle(html) {
  var title = html.match(/<title>([^<]+)<\/title>/i);
  if (title) return text.decodeEntities(title[1]).trim();
  var heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!heading) return "";
  return text.decodeEntities(heading[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function pageMatches(info, html) {
  var imdb = html.match(/imdb\.com\/title\/(tt\d+)/i);
  if (imdb && info.imdbId) return imdb[1] === info.imdbId;
  var title = pageTitle(html);
  var titles = titleQueries(info);
  for (var i = 0; i < titles.length; i++) {
    if (text.score(titles[i], title) > 0) return true;
  }
  return false;
}
function tryPages(candidates, info, limit) {
  return __async(this, null, function* () {
    var seen = {};
    var tries = 0;
    for (var i = 0; i < candidates.length && tries < limit; i++) {
      var url = candidates[i].url;
      if (!url || seen[url]) continue;
      seen[url] = true;
      tries++;
      var html = yield http.fetchText(url, { headers: pageHeaders({ Referer: BASE + "/" }) });
      if (!html) continue;
      var embeds = playerEmbeds(html);
      if (!embeds.length) continue;
      if (!pageMatches(info, html)) continue;
      return { url, html, embeds };
    }
    return null;
  });
}
function homeCandidates(info) {
  return __async(this, null, function* () {
    var home = yield http.fetchText(BASE + "/", { headers: pageHeaders({ Referer: BASE + "/" }) });
    if (!home) return [];
    var links = parseLinks(home).map(function(item) {
      return { url: BASE + "/" + item.slug + "/", title: item.title };
    });
    return rankCandidates(links, info);
  });
}
function findMoviePage(info) {
  return __async(this, null, function* () {
    var page = yield tryPages(yield pageCandidates(info), info, MAX_PAGE_TRIES);
    if (page) return page;
    page = yield tryPages(yield homeCandidates(info), info, 3);
    if (page) return page;
    return tryPages(
      candidateSlugs(info).map(function(slug) {
        return { url: BASE + "/" + slug + "/" };
      }),
      info,
      4
    );
  });
}
function resolvePage(page) {
  return __async(this, null, function* () {
    var streams = [];
    var subtitles = [];
    var seenSubtitle = {};
    var seenUrl = {};
    var limit = Math.min(page.embeds.length, MAX_EMBEDS);
    for (var i = 0; i < limit; i++) {
      var embedUrl = page.embeds[i];
      var host = http.hostOf(embedUrl);
      var embedHtml = yield http.fetchText(embedUrl, { headers: http.frameHeaders(page.url, embedUrl) });
      if (!embedHtml) {
        console.log("[HDFilmCehennemi] player request failed: " + embedUrl);
        continue;
      }
      var streamUrl = closeload.decryptStream(embedHtml, host);
      if (!streamUrl) {
        console.log("[HDFilmCehennemi] no stream in player: " + embedUrl);
        continue;
      }
      var key = streamUrl.split("?")[0];
      if (seenUrl[key]) continue;
      seenUrl[key] = true;
      var headers = pageHeaders({ Referer: "https://" + host + "/" });
      var audio = yield hls.inspect(streamUrl, headers);
      var dual = audio.dual ? hls.label(audio.tracks) : "";
      var label = "HDFilmCehennemi - " + (dual ? "Dual [" + dual + "]" : "T\xFCrk\xE7e");
      var qualityLabel = audio.quality;
      var subs = closeload.parseSubtitles(embedHtml);
      for (var j = 0; j < subs.length; j++) {
        if (seenSubtitle[subs[j].url]) continue;
        seenSubtitle[subs[j].url] = true;
        subtitles.push(subs[j]);
      }
      streams.push({
        name: "HDFilmCehennemi",
        title: label + (qualityLabel ? " (" + qualityLabel + ")" : ""),
        url: streamUrl.indexOf("#") === -1 ? streamUrl + "#.m3u8" : streamUrl,
        quality: qualityLabel,
        format: "hls",
        isHls: true,
        language: "tr",
        provider: "hdfilmcehennemi",
        headers,
        behaviorHints: { notWebReady: true, proxyHeaders: { request: headers } },
        subtitles
      });
    }
    return quality.sortStreamsByQuality(streams);
  });
}
function getMovieStreams(info) {
  return __async(this, null, function* () {
    var page = yield findMoviePage(info);
    if (!page) {
      console.log("[HDFilmCehennemi] no playable page for " + info.title + " (" + info.originalTitle + ")");
      return [];
    }
    var streams = yield resolvePage(page);
    console.log("[HDFilmCehennemi] " + page.url.replace(BASE, "") + " -> " + streams.length + " stream(s)");
    return streams;
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
    items.push({ url: href[1], title: text.decodeEntities(title[1]) });
  }
  return items;
}
function findShowCandidates(info) {
  return __async(this, null, function* () {
    var ranked = rankCandidates(yield searchSite(info, true), info);
    if (ranked.length) {
      return ranked.map(function(item) {
        return { url: item.url, title: item.title };
      });
    }
    var html = yield http.fetchText(BASE + "/yabancidiziizle-14/", {
      headers: pageHeaders({ Referer: BASE + "/" })
    });
    if (!html) return [];
    return rankCandidates(parseSeriesLinks(html), info).map(function(item) {
      return { url: item.url, title: item.title };
    });
  });
}
function episodeLinks(html) {
  var links = [];
  var seen = {};
  var re = /href="([^"]+\/sezon-(\d+)\/bolum-(\d+)[^"]*)"/gi;
  var match;
  while ((match = re.exec(html)) !== null) {
    if (seen[match[1]]) continue;
    seen[match[1]] = true;
    links.push({
      url: match[1],
      season: Number(match[2]),
      episode: Number(match[3])
    });
  }
  return links;
}
function pickEpisode(links, season, episode, absolute2) {
  for (var i = 0; i < links.length; i++) {
    if (links[i].season === season && links[i].episode === episode) return links[i];
  }
  for (var j = 0; j < links.length; j++) {
    if (links[j].episode === absolute2) return links[j];
  }
  return null;
}
function findEpisode(info, season, episode) {
  return __async(this, null, function* () {
    var candidates = yield findShowCandidates(info);
    var s = season == null ? 1 : Number(season);
    var e = Number(episode) || 1;
    var absolute2 = season == null ? e : yield tmdb.absoluteEpisode(info.id, season, episode, info.seasons);
    var tries = 0;
    for (var i = 0; i < candidates.length && tries < MAX_PAGE_TRIES; i++) {
      tries++;
      var showHtml = yield http.fetchText(candidates[i].url, {
        headers: pageHeaders({ Referer: BASE + "/" })
      });
      if (!showHtml) continue;
      var chosen = pickEpisode(episodeLinks(showHtml), s, e, absolute2);
      if (!chosen) continue;
      var html = yield http.fetchText(chosen.url, { headers: pageHeaders({ Referer: BASE + "/" }) });
      if (!html) continue;
      return { url: chosen.url, html, show: candidates[i].title };
    }
    return null;
  });
}
function getEpisodeStreams(info, season, episode) {
  return __async(this, null, function* () {
    var page = yield findEpisode(info, season, episode);
    if (!page) {
      console.log("[HDFilmCehennemi] no episode for " + info.title + " S" + season + "E" + episode);
      return [];
    }
    var embeds = playerEmbeds(page.html);
    if (!embeds.length) {
      console.log("[HDFilmCehennemi] episode page has no player: " + page.url);
      return [];
    }
    var streams = yield resolvePage({ url: page.url, html: page.html, embeds });
    console.log("[HDFilmCehennemi] " + page.show + " S" + season + "E" + episode + " -> " + streams.length + " stream(s)");
    return streams;
  });
}
function getStreams(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      var info = yield tmdb.resolveTmdbInfo(id, mediaType || "movie");
      if (info.isTv) return yield getEpisodeStreams(info, season, episode);
      return yield getMovieStreams(info);
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

