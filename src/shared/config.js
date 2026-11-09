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

module.exports = {
  ua: UA,
  tmdbKey: tmdbKey,
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
