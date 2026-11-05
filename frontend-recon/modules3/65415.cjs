// webpack module 65415 — body from webcrack
module.exports = function (module, exports, require) {
exports.byteLength = l;
exports.toByteArray = p;
exports.fromByteArray = g;
var r = [];
var n = [];
var i = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
var o = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (var a = 0, s = o.length; a < s; ++a) {
  r[a] = o[a];
  n[o.charCodeAt(a)] = a;
}
function u(e) {
  var t = e.length;
  if (t % 4 > 0) {
    throw new Error("Invalid string. Length must be a multiple of 4");
  }
  var r = e.indexOf("=");
  if (r === -1) {
    r = t;
  }
  var n = r === t ? 0 : 4 - r % 4;
  return [r, n];
}
function l(e) {
  var t = u(e);
  var r = t[0];
  var n = t[1];
  return (r + n) * 3 / 4 - n;
}
function c(e, t, r) {
  return (t + r) * 3 / 4 - r;
}
function p(e) {
  var t;
  var r;
  var o = u(e);
  var a = o[0];
  var s = o[1];
  var l = new i(c(e, a, s));
  var p = 0;
  var d = s > 0 ? a - 4 : a;
  for (r = 0; r < d; r += 4) {
    t = n[e.charCodeAt(r)] << 18 | n[e.charCodeAt(r + 1)] << 12 | n[e.charCodeAt(r + 2)] << 6 | n[e.charCodeAt(r + 3)];
    l[p++] = t >> 16 & 255;
    l[p++] = t >> 8 & 255;
    l[p++] = t & 255;
  }
  if (s === 2) {
    t = n[e.charCodeAt(r)] << 2 | n[e.charCodeAt(r + 1)] >> 4;
    l[p++] = t & 255;
  }
  if (s === 1) {
    t = n[e.charCodeAt(r)] << 10 | n[e.charCodeAt(r + 1)] << 4 | n[e.charCodeAt(r + 2)] >> 2;
    l[p++] = t >> 8 & 255;
    l[p++] = t & 255;
  }
  return l;
}
function d(e) {
  return r[e >> 18 & 63] + r[e >> 12 & 63] + r[e >> 6 & 63] + r[e & 63];
}
function f(e, t, r) {
  var n;
  var i = [];
  for (var o = t; o < r; o += 3) {
    n = (e[o] << 16 & 16711680) + (e[o + 1] << 8 & 65280) + (e[o + 2] & 255);
    i.push(d(n));
  }
  return i.join("");
}
function g(e) {
  var t;
  var n = e.length;
  var i = n % 3;
  var o = [];
  for (var a = 16383, s = 0, u = n - i; s < u; s += a) {
    o.push(f(e, s, s + a > u ? u : s + a));
  }
  if (i === 1) {
    t = e[n - 1];
    o.push(r[t >> 2] + r[t << 4 & 63] + "==");
  } else if (i === 2) {
    t = (e[n - 2] << 8) + e[n - 1];
    o.push(r[t >> 10] + r[t >> 4 & 63] + r[t << 2 & 63] + "=");
  }
  return o.join("");
}
n["-".charCodeAt(0)] = 62;
n["_".charCodeAt(0)] = 63;
};
