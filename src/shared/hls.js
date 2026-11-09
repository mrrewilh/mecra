var http = require('./http');

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
      name: name ? name[1] : '',
      language: lang ? lang[1] : ''
    });
  }
  return tracks;
}

async function inspect(url, headers) {
  var playlist = await http.fetchText(url, { headers: headers });
  var tracks = parseAudioTracks(playlist);
  return {
    ok: Boolean(playlist),
    tracks: tracks,
    dual: tracks.length >= 2
  };
}

function label(tracks) {
  if (!tracks || tracks.length < 2) return '';
  var names = [];
  for (var i = 0; i < tracks.length; i++) {
    var name = tracks[i].name || tracks[i].language;
    if (name) names.push(name);
  }
  return names.join(' / ');
}

module.exports = {
  parseAudioTracks: parseAudioTracks,
  inspect: inspect,
  label: label
};
