var UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function tmdbKey() {
  try {
    if (typeof TMDB_API_KEY !== 'undefined' && TMDB_API_KEY) return TMDB_API_KEY;
  } catch (e) {}
  try {
    if (typeof globalThis !== 'undefined' && globalThis.TMDB_API_KEY) {
      return globalThis.TMDB_API_KEY;
    }
  } catch (e) {}
  return '';
}

function globalValue(name) {
  try {
    return typeof globalThis !== 'undefined' && globalThis[name] ? String(globalThis[name]) : '';
  } catch (e) {
    return '';
  }
}

// Set these to your mux server. Leave MUX_BASE empty to keep separate dub/sub rows.
// Example: MUX_BASE = 'https://mux.example.com';
var MUX_BASE = '';
var MUX_TOKEN = '';

module.exports = {
  ua: UA,
  tmdbKey: tmdbKey,
  muxBase: MUX_BASE || globalValue('MECRA_MUX_BASE'),
  muxToken: MUX_TOKEN || globalValue('MECRA_MUX_TOKEN'),
  sites: {
    hdfilmcehennemi: 'https://www.hdfilmcehennemi.nl',
    hdfilmcehennemiEmbed: 'https://hdfilmcehennemi.mobi',
    diziyou: 'https://www.diziyou.one',
    diziyouStorage: 'https://storage.diziyou.one',
    yabancidizi: 'https://yabancidizi.news',
    liderfilmizle: 'https://liderfilmizle.vip',
    liderfilmPlay: 'https://play.liderfilm.cc',
    cizgimax: 'https://cizgimax.online',
    tauVideo: 'https://tau-video.xyz',
    aniziumApi: 'https://api.anizium.co',
    aniziumSite: 'https://anizium.co'
  }
};
