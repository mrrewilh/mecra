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

// A master playlist lists one #EXT-X-STREAM-INF per rendition. Media playlists
// (single quality) carry none, so the height stays 0 and callers must not guess.
function parseVariants(playlist) {
  if (!playlist) return [];
  var out = [];
  var lines = String(playlist).split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.indexOf('#EXT-X-STREAM-INF') !== 0) continue;
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
    if (variant.width > best.width || (variant.width === best.width && variant.height > best.height)) {
      best = variant;
    }
  }
  return best;
}

// Widescreen encodes are 1920x800 and still sold as 1080p, so the label follows
// the frame width rather than the raw height.
function qualityLabel(variants) {
  var best = bestVariant(variants);
  if (!best) return '';
  var width = best.width;
  if (width >= 3800 || best.height >= 2000) return '2160p';
  if (width >= 2500) return '1440p';
  if (width >= 1900) return '1080p';
  if (width >= 1200) return '720p';
  if (width >= 900) return '540p';
  if (width >= 780) return '480p';
  if (width >= 600) return '360p';
  return best.height ? best.height + 'p' : '';
}

async function inspect(url, headers) {
  var playlist = await http.fetchText(url, { headers: headers });
  var tracks = parseAudioTracks(playlist);
  var variants = parseVariants(playlist);
  var best = bestVariant(variants);
  return {
    ok: Boolean(playlist),
    tracks: tracks,
    dual: tracks.length >= 2,
    variants: variants,
    height: best ? best.height : 0,
    quality: qualityLabel(variants)
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
  parseVariants: parseVariants,
  inspect: inspect,
  label: label
};
