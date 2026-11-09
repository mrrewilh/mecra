var ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function binary(value) {
  var input = String(value || '').replace(/[^A-Za-z0-9+/=]/g, '');
  var out = '';
  var buffer = 0;
  var bits = 0;
  for (var i = 0; i < input.length; i++) {
    var index = ABC.indexOf(input.charAt(i));
    if (index < 0) break;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buffer >> bits) & 255);
    }
  }
  return out;
}

function utf8(input) {
  var out = '';
  var i = 0;
  while (i < input.length) {
    var c = input.charCodeAt(i++);
    if (c < 128) {
      out += String.fromCharCode(c);
    } else if (c < 224) {
      out += String.fromCharCode(((c & 31) << 6) | (input.charCodeAt(i++) & 63));
    } else if (c < 240) {
      var b2 = input.charCodeAt(i++) & 63;
      var b3 = input.charCodeAt(i++) & 63;
      out += String.fromCharCode(((c & 15) << 12) | (b2 << 6) | b3);
    } else {
      var b4 = input.charCodeAt(i++) & 63;
      var b5 = input.charCodeAt(i++) & 63;
      var b6 = input.charCodeAt(i++) & 63;
      var cp = (((c & 7) << 18) | (b4 << 12) | (b5 << 6) | b6) - 65536;
      out += String.fromCharCode(55296 + (cp >> 10), 56320 + (cp & 1023));
    }
  }
  return out;
}

function decode(value) {
  return utf8(binary(value));
}

module.exports = {
  binary: binary,
  utf8: utf8,
  decode: decode
};
