function qualityScore(stream) {
  if (!stream) return 0;
  var text = ((stream.quality || '') + ' ' + (stream.title || '') + ' ' + (stream.name || '')).toLowerCase();
  if (/\b(4k|2160p?|uhd)\b/.test(text)) return 2160;
  if (/\b(2k|1440p?|qhd)\b/.test(text)) return 1440;
  if (/\b(1080p?|fhd)\b/.test(text)) return 1080;
  if (/\b(720p?)\b/.test(text)) return 720;
  if (/\b(540p?)\b/.test(text)) return 540;
  if (/\b(480p?)\b/.test(text)) return 480;
  if (/\b(360p?)\b/.test(text)) return 360;
  if (stream.isHls) return 500;
  return 1;
}

function sortStreamsByQuality(streams) {
  if (!Array.isArray(streams) || streams.length < 2) return streams || [];
  return streams.slice().sort(function (a, b) {
    return qualityScore(b) - qualityScore(a);
  });
}

module.exports = {
  qualityScore: qualityScore,
  sortStreamsByQuality: sortStreamsByQuality
};
