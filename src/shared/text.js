function clean(value) {
  if (!value) return '';
  var s = String(value).toLowerCase();
  try {
    if (typeof s.normalize === 'function') {
      s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
  } catch (e) {}
  return s
    .replace(/[ıİ]/g, 'i')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[çÇ]/g, 'c')
    .replace(/[âÂ]/g, 'a')
    .replace(/[îÎ]/g, 'i')
    .replace(/[ûÛ]/g, 'u')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function slugify(value) {
  if (!value) return '';
  var s = String(value).toLowerCase();
  try {
    if (typeof s.normalize === 'function') {
      s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
  } catch (e) {}
  return s
    .replace(/[ıİ]/g, 'i')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[çÇ]/g, 'c')
    .replace(/[âÂ]/g, 'a')
    .replace(/[îÎ]/g, 'i')
    .replace(/[ûÛ]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
    var itemTitle = getTitle(item) || '';
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

module.exports = {
  clean: clean,
  slugify: slugify,
  score: score,
  bestMatch: bestMatch
};
