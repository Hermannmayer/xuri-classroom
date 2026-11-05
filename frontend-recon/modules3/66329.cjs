// webpack module 66329 — body from webcrack
module.exports = function (module, exports, require) {
var t = Infinity;
var r = Math.abs;
var n = Math.pow;
var i = Math.floor;
var o = Math.log;
var a = Math.LN2;
function s(e, s, u) {
  var l;
  var c;
  var p;
  var d = new Array(u);
  var f = u * 8 - s - 1;
  var g = (1 << f) - 1;
  var m = g >> 1;
  var v = s === 23 ? n(2, -24) - n(2, -77) : 0;
  var y = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
  var h = 0;
  e = r(e);
  if (e != e || e === t) {
    c = e != e ? 1 : 0;
    l = g;
  } else {
    l = i(o(e) / a);
    if (e * (p = n(2, -l)) < 1) {
      l--;
      p *= 2;
    }
    e += l + m >= 1 ? v / p : v * n(2, 1 - m);
    if (e * p >= 2) {
      l++;
      p /= 2;
    }
    if (l + m >= g) {
      c = 0;
      l = g;
    } else if (l + m >= 1) {
      c = (e * p - 1) * n(2, s);
      l += m;
    } else {
      c = e * n(2, m - 1) * n(2, s);
      l = 0;
    }
  }
  for (; s >= 8; s -= 8) {
    d[h++] = c & 255;
    c /= 256;
  }
  l = l << s | c;
  f += s;
  for (; f > 0; f -= 8) {
    d[h++] = l & 255;
    l /= 256;
  }
  d[--h] |= y * 128;
  return d;
}
function u(e, r) {
  var i;
  var o = e.length;
  var a = o * 8 - r - 1;
  var s = (1 << a) - 1;
  var u = s >> 1;
  var l = a - 7;
  var c = o - 1;
  var p = e[c--];
  var d = p & 127;
  for (p >>= 7; l > 0; l -= 8) {
    d = d * 256 + e[c];
    c--;
  }
  i = d & (1 << -l) - 1;
  d >>= -l;
  l += r;
  for (; l > 0; l -= 8) {
    i = i * 256 + e[c];
    c--;
  }
  if (d === 0) {
    d = 1 - u;
  } else {
    if (d === s) {
      if (i) {
        return NaN;
      } else if (p) {
        return -t;
      } else {
        return t;
      }
    }
    i += n(2, r);
    d -= u;
  }
  return (p ? -1 : 1) * i * n(2, d - r);
}
module.exports = {
  pack: s,
  unpack: u
};
};
