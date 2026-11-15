var ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', iexcl: '¡', cent: '¢', pound: '£', curren: '¤', yen: '¥',
  brvbar: '¦', sect: '§', uml: '¨', copy: '©', ordf: 'ª', laquo: '«',
  not: '¬', shy: '­', reg: '®', macr: '¯', deg: '°', plusmn: '±',
  sup2: '²', sup3: '³', acute: '´', micro: 'µ', para: '¶', middot: '·',
  cedil: '¸', sup1: '¹', ordm: 'º', raquo: '»', frac14: '¼', frac12: '½',
  frac34: '¾', iquest: '¿', times: '×', divide: '÷',
  Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Atilde: 'Ã', Auml: 'Ä', Aring: 'Å',
  AElig: 'Æ', Ccedil: 'Ç', Egrave: 'È', Eacute: 'É', Ecirc: 'Ê', Euml: 'Ë',
  Igrave: 'Ì', Iacute: 'Í', Icirc: 'Î', Iuml: 'Ï', ETH: 'Ð', Ntilde: 'Ñ',
  Ograve: 'Ò', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Ouml: 'Ö', Oslash: 'Ø',
  Ugrave: 'Ù', Uacute: 'Ú', Ucirc: 'Û', Uuml: 'Ü', Yacute: 'Ý', THORN: 'Þ',
  szlig: 'ß', agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä',
  aring: 'å', aelig: 'æ', ccedil: 'ç', egrave: 'è', eacute: 'é', ecirc: 'ê',
  euml: 'ë', igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï', eth: 'ð',
  ntilde: 'ñ', ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö',
  oslash: 'ø', ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü', yacute: 'ý',
  thorn: 'þ', yuml: 'ÿ',
  Scedil: 'Ş', scedil: 'ş', Gbreve: 'Ğ', gbreve: 'ğ', Idot: 'İ', inodot: 'ı',
  hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', bull: '•', trade: '™', euro: '€', dagger: '†'
};

// Sites emit PHP-style htmlentities ("M&uuml;sl&uuml;m"), so titles have to be
// decoded before they can be compared with TMDB's UTF-8 titles.
function decodeEntities(value) {
  if (!value) return '';
  return String(value).replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, function (match, body) {
    if (body.charAt(0) === '#') {
      var code =
        body.charAt(1) === 'x' || body.charAt(1) === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (!code || !isFinite(code)) return match;
      try {
        return typeof String.fromCodePoint === 'function'
          ? String.fromCodePoint(code)
          : String.fromCharCode(code);
      } catch (e) {
        return match;
      }
    }
    var named = ENTITIES[body];
    if (named === undefined) named = ENTITIES[body.toLowerCase()];
    return named === undefined ? match : named;
  });
}

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
  decodeEntities: decodeEntities,
  slugify: slugify,
  score: score,
  bestMatch: bestMatch
};
