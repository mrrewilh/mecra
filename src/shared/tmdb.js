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
  return http.fetchJson(api('/' + type + '/' + id, { language: 'tr-TR' }));
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
      year: '',
      imdbId: raw.indexOf('tt') === 0 ? raw : '',
      seasons: []
    };
  }

  var english = await http.fetchJson(api('/' + type + '/' + data.id, { language: 'en-US' }));
  var date = data.release_date || data.first_air_date || '';
  return {
    id: data.id,
    type: type,
    isTv: tv,
    title: data.title || data.name || '',
    originalTitle: data.original_title || data.original_name || '',
    englishTitle: english ? english.title || english.name || '' : '',
    year: date ? String(date).split('-')[0] : '',
    imdbId: data.imdb_id || (raw.indexOf('tt') === 0 ? raw : ''),
    seasons: data.seasons || []
  };
}

async function absoluteEpisode(tmdbId, season, episode) {
  if (season == null || episode == null) return episode;
  var target = Number(episode);

  // Some TMDB seasons (One Piece S20+) store absolute episode numbers instead
  // of 1-based numbers. If the requested episode is in the season and the
  // season does not start at 1, the number is already absolute.
  var seasonData = await http.fetchJson(
    api('/tv/' + tmdbId + '/season/' + season, { language: 'en-US' })
  );
  var seasonEpisodes = (seasonData && seasonData.episodes) || [];
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

  var data = await http.fetchJson(api('/tv/' + tmdbId, { language: 'en-US' }));
  var seasons = (data && data.seasons) || [];
  var total = 0;
  for (var i = 0; i < seasons.length; i++) {
    var number = seasons[i].season_number;
    if (number > 0 && number < Number(season)) {
      total += seasons[i].episode_count || 0;
    }
  }
  return total + target;
}

module.exports = {
  isTv: isTv,
  resolveTmdbInfo: resolveTmdbInfo,
  absoluteEpisode: absoluteEpisode
};
