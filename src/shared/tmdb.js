var config = require('./config');
var http = require('./http');

function isTv(mediaType) {
  return mediaType === 'tv' || mediaType === 'series';
}

function api(path, params) {
  var query = 'api_key=' + encodeURIComponent(config.tmdbKey());
  if (params) {
    for (var key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        query += '&' + key + '=' + encodeURIComponent(params[key]);
      }
    }
  }
  return 'https://api.themoviedb.org/3' + path + '?' + query;
}

async function details(id, type) {
  return http.fetchJson(
    api('/' + type + '/' + id, {
      language: 'tr-TR',
      append_to_response: 'alternative_titles'
    })
  );
}

function alternativeTitles(data) {
  var alt = (data && data.alternative_titles) || {};
  var list = alt.results || alt.titles || [];
  var out = [];
  var seen = {};
  for (var i = 0; i < list.length; i++) {
    var title = String((list[i] && list[i].title) || '').trim();
    if (!title || seen[title]) continue;
    seen[title] = true;
    out.push({
      title: title,
      country: String((list[i] && list[i].iso_3166_1) || '').toUpperCase()
    });
  }
  return out;
}

function englishTitleFrom(data) {
  var list = alternativeTitles(data);
  for (var i = 0; i < list.length; i++) {
    if (list[i].country === 'US' || list[i].country === 'GB') return list[i].title;
  }
  return '';
}

async function resolveTmdbInfo(id, mediaType) {
  var raw = String(id == null ? '' : id).trim();
  if (raw.indexOf(':') !== -1) raw = raw.split(':')[0];

  var tv = isTv(mediaType);
  var type = tv ? 'tv' : 'movie';
  var data = null;
  var numericId = null;

  if (raw.indexOf('tt') === 0) {
    var found = await http.fetchJson(
      api('/find/' + raw, { external_source: 'imdb_id', language: 'tr-TR' })
    );
    var list = found ? (tv ? found.tv_results : found.movie_results) : null;
    var item = list && list[0];
    if (item) {
      numericId = item.id;
      data = await details(numericId, type);
    }
  } else if (/^\d+$/.test(raw)) {
    numericId = raw;
    data = await details(raw, type);
  }

  if (!data) {
    return {
      id: numericId,
      type: type,
      isTv: tv,
      title: '',
      originalTitle: '',
      englishTitle: '',
      alternativeTitles: [],
      year: '',
      imdbId: raw.indexOf('tt') === 0 ? raw : '',
      seasons: []
    };
  }

  var date = data.release_date || data.first_air_date || '';
  return {
    id: data.id,
    type: type,
    isTv: tv,
    title: data.title || data.name || '',
    originalTitle: data.original_title || data.original_name || '',
    englishTitle: englishTitleFrom(data),
    alternativeTitles: alternativeTitles(data),
    year: date ? String(date).split('-')[0] : '',
    imdbId: data.imdb_id || (raw.indexOf('tt') === 0 ? raw : ''),
    seasons: data.seasons || []
  };
}

async function absoluteEpisode(tmdbId, season, episode, seasons) {
  if (season == null || episode == null) return episode;
  var target = Number(episode);
  var seasonNumber = Number(season);
  var list = seasons;

  if (!list || !list.length) {
    var data = await http.fetchJson(api('/tv/' + tmdbId, { language: 'en-US' }));
    list = (data && data.seasons) || [];
  }
  var seasonInfo = null;
  for (var s = 0; s < list.length; s++) {
    if (Number(list[s].season_number) === seasonNumber) {
      seasonInfo = list[s];
      break;
    }
  }

  // One Piece S20+ already stores absolute episode numbers (S23E1173 = 1173).
  // An absolute number is larger than the number of episodes in that season.
  if (seasonInfo && target > (seasonInfo.episode_count || 0)) return target;

  var total = 0;
  for (var i = 0; i < list.length; i++) {
    var number = list[i].season_number;
    if (number > 0 && number < seasonNumber) {
      total += list[i].episode_count || 0;
    }
  }
  return total + target;
}

module.exports = {
  isTv: isTv,
  resolveTmdbInfo: resolveTmdbInfo,
  absoluteEpisode: absoluteEpisode
};
