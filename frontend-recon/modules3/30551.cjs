// webpack module 30551 — body from webcrack
module.exports = function (module, exports, require) {
exports.read = function (e, t, r, n, i) {
  var o;
  var a;
  var s = i * 8 - n - 1;
  var u = (1 << s) - 1;
  var l = u >> 1;
  var c = -7;
  var p = r ? i - 1 : 0;
  var d = r ? -1 : 1;
  var f = e[t + p];
  p += d;
  o = f & (1 << -c) - 1;
  f >>= -c;
  c += s;
  for (; c > 0; c -= 8) {
    o = o * 256 + e[t + p];
    p += d;
  }
  a = o & (1 << -c) - 1;
  o >>= -c;
  c += n;
  for (; c > 0; c -= 8) {
    a = a * 256 + e[t + p];
    p += d;
  }
  if (o === 0) {
    o = 1 - l;
  } else {
    if (o === u) {
      if (a) {
        return NaN;
      } else {
        return (f ? -1 : 1) * Infinity;
      }
    }
    a += Math.pow(2, n);
    o -= l;
  }
  return (f ? -1 : 1) * a * Math.pow(2, o - n);
};
exports.write = function (e, t, r, n, i, o) {
  var a;
  var s;
  var u;
  var l = o * 8 - i - 1;
  var c = (1 << l) - 1;
  var p = c >> 1;
  var d = i === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
  var f = n ? 0 : o - 1;
  var g = n ? 1 : -1;
  var m = t < 0 || t === 0 && 1 / t < 0 ? 1 : 0;
  t = Math.abs(t);
  if (isNaN(t) || t === Infinity) {
    s = isNaN(t) ? 1 : 0;
    a = c;
  } else {
    a = Math.floor(Math.log(t) / Math.LN2);
    if (t * (u = Math.pow(2, -a)) < 1) {
      a--;
      u *= 2;
    }
    t += a + p >= 1 ? d / u : d * Math.pow(2, 1 - p);
    if (t * u >= 2) {
      a++;
      u /= 2;
    }
    if (a + p >= c) {
      s = 0;
      a = c;
    } else if (a + p >= 1) {
      s = (t * u - 1) * Math.pow(2, i);
      a += p;
    } else {
      s = t * Math.pow(2, p - 1) * Math.pow(2, i);
      a = 0;
    }
  }
  for (; i >= 8; i -= 8) {
    e[r + f] = s & 255;
    f += g;
    s /= 256;
  }
  a = a << i | s;
  l += i;
  for (; l > 0; l -= 8) {
    e[r + f] = a & 255;
    f += g;
    a /= 256;
  }
  e[r + f - g] |= m * 128;
};
};
