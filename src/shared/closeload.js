// Shared resolver for players that ship a packed `sources: [{file: <var>}]`
// script and a browser-shape decoder. Used by HDFilmCehennemi and FilmMakinesi.
var config = require('./config');

// The player page obfuscates the stream URL and decodes it with a script that
// reads browser shape (hostname, a random data-* attribute, a few DOM probes).
// Run that script in a minimal DOM instead of re-implementing every packer.
function evaluateScript(script, host, varName, hint) {
  var code =
    'var window={location:{hostname:"' + host + '",origin:"https://' + host + '",' +
    'href:"https://' + host + '/",pathname:"/",search:"",hash:""}};' +
    'var self=window;' +
    'var navigator={userAgent:' + JSON.stringify(config.ua) + ',platform:"Win32",language:"tr-TR"};' +
    'var screen={width:1920,height:1080,colorDepth:24};' +
    'var __hint=' + JSON.stringify((hint && hint.value) || '') + ';' +
    'var __attr=' + JSON.stringify((hint && hint.name) || '') + ';' +
    'var __attrs={};if(__attr){__attrs[__attr]={name:__attr,value:__hint};}' +
    'var __data={};if(__attr.indexOf("data-")===0){' +
    '__data[__attr.slice(5).replace(/-([a-z])/g,function(m,c){return c.toUpperCase();})]=__hint;}' +
    'var __el=function(tag){return {tagName:String(tag||"div").toUpperCase(),' +
    'attributes:__attrs,dataset:__data,' +
    'getAttribute:function(n){return n===__attr?__hint:(__attrs[n]?__attrs[n].value:"");},' +
    'setAttribute:function(){},' +
    'appendChild:function(){},removeChild:function(){},addEventListener:function(){},' +
    'getContext:function(){return {};},canPlayType:function(){return "";},' +
    'querySelector:function(){return __el("div");},querySelectorAll:function(){return [];},' +
    'style:{},children:[],childNodes:[]};};' +
    'var document={location:window.location,' +
    'body:__el("body"),head:__el("head"),documentElement:__el("html"),' +
    'cookie:"",referrer:"",title:"",URL:"",readyState:"complete",' +
    'hidden:false,visibilityState:"visible",addEventListener:function(){},' +
    'getElementById:function(){return __el("div");},' +
    'getElementsByClassName:function(){return [__el("div")];},' +
    'querySelector:function(){return __el("div");},' +
    'querySelectorAll:function(){return [__el("div")];},' +
    'createElement:function(tag){return __el(tag);},' +
    'getElementsByTagName:function(){return [__el("div")];}};' +
    'window.navigator=navigator;window.screen=screen;window.document=document;' +
    'window.innerWidth=1920;window.innerHeight=1080;window.outerWidth=1920;window.outerHeight=1080;' +
    'window.devicePixelRatio=1;window.addEventListener=function(){};' +
    'window.__CF$cv$params={r:"",t:0};var __CF$cv$params=window.__CF$cv$params;' +
    'var parent=window;var top=window;' +
    'var location=window.location;' +
    'var __atob=(typeof globalThis!=="undefined"&&globalThis.atob)?globalThis.atob:null;' +
    'var atob=__atob||function(s){var c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";' +
    's=String(s).replace(/[^A-Za-z0-9+/=]/g,"");var o="",b=0,n=0;' +
    'for(var i=0;i<s.length;i++){var v=c.indexOf(s.charAt(i));if(v<0)break;b=(b<<6)|v;n+=6;' +
    'if(n>=8){n-=8;o+=String.fromCharCode((b>>n)&255)}}return o};' +
    script +
    '\nreturn (typeof ' + varName + ' !== "undefined") ? ' + varName + ' : null;';
  try {
    return new Function(code)();
  } catch (e) {
    return null;
  }
}

// The decoder reads one randomized data-* attribute from the page; pull it out
// by the name the script itself asks for.
function domHint(embedHtml, script) {
  var attr =
    script.match(/getAttribute\(\s*['"]([^'"]+)['"]\s*\)/) ||
    script.match(/attributes\[\s*['"]([^'"]+)['"]\s*\]/) ||
    script.match(/dataset\.([A-Za-z0-9_$]+)/);
  if (!attr) return { name: '', value: '' };
  var name = attr[1];
  var probe = name.indexOf('data-') === 0 ? name : 'data-' + name;
  var match = embedHtml.match(new RegExp(probe + '\\s*=\\s*["\\\']([^"\\\']*)', 'i'));
  return { name: name, value: match ? match[1] : '' };
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
    scripts.push(blocks[i].replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, ''));
  }

  for (var n = 0; n < names.length; n++) {
    for (var j = 0; j < scripts.length; j++) {
      if (scripts[j].indexOf('var ' + names[n]) === -1) continue;
      var value = evaluateScript(scripts[j], host, names[n], domHint(embedHtml, scripts[j]));
      if (typeof value === 'string' && value.indexOf('http') === 0) return value;
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
    if (!item || !item.file || item.kind !== 'captions') continue;
    var label = item.label || 'Subtitle';
    var lower = label.toLowerCase();
    var lang = 'tr';
    if (lower.indexOf('eng') !== -1 || lower.indexOf('ing') !== -1) lang = 'en';
    else if (lower.indexOf('fre') !== -1 || lower.indexOf('fra') !== -1) lang = 'fr';
    else if (lower.indexOf('ger') !== -1 || lower.indexOf('alm') !== -1) lang = 'de';
    else if (lower.indexOf('spa') !== -1 || lower.indexOf('isp') !== -1) lang = 'es';
    out.push({
      id: 'closeload-sub-' + i,
      url: item.file,
      lang: lang,
      label: label
    });
  }
  return out;
}

module.exports = {
  decryptStream: decryptStream,
  parseSubtitles: parseSubtitles
};
