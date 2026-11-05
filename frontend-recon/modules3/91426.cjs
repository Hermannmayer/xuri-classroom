// webpack module 91426 — body from webcrack
module.exports = function (module, exports, require) {
require("./94867.js");
var n;
var i = require("./19341.js");
var o = require("./92695.js");
var a = require("./54175.js");
var s = require("./55477.js");
var u = require("./95330.js");
var l = require("./41216.js");
var c = require("./33758.js");
var p = require("./15595.js");
var d = require("./24498.js");
var f = require("./15151.js");
var g = require("./61859.js").codeAt;
var m = require("./10737.js");
var v = require("./65147.js");
var y = require("./17295.js");
var h = require("./71478.js");
var b = s.URL;
var w = y.URLSearchParams;
var x = y.getState;
var E = h.set;
var k = h.getterFor("URL");
var S = Math.floor;
var T = Math.pow;
var C = "Invalid authority";
var A = "Invalid scheme";
var _ = "Invalid host";
var O = "Invalid port";
var M = /[A-Za-z]/;
var P = /[\d+-.A-Za-z]/;
var q = /\d/;
var N = /^(0x|0X)/;
var R = /^[0-7]+$/;
var I = /^\d+$/;
var j = /^[\dA-Fa-f]+$/;
var D = /[\u0000\u0009\u000A\u000D #%/:?@[\\]]/;
var L = /[\u0000\u0009\u000A\u000D #/:?@[\\]]/;
var F = /^[\u0000-\u001F ]+|[\u0000-\u001F ]+$/g;
var Z = /[\u0009\u000A\u000D]/g;
function z(e, t) {
  var r;
  var n;
  var i;
  if (t.charAt(0) == "[") {
    if (t.charAt(t.length - 1) != "]") {
      return _;
    }
    r = B(t.slice(1, -1));
    if (!r) {
      return _;
    }
    e.host = r;
  } else if (J(e)) {
    t = m(t);
    if (D.test(t)) {
      return _;
    }
    r = U(t);
    if (r === null) {
      return _;
    }
    e.host = r;
  } else {
    if (L.test(t)) {
      return _;
    }
    r = "";
    n = f(t);
    i = 0;
    for (; i < n.length; i++) {
      r += G(n[i], W);
    }
    e.host = r;
  }
}
function U(e) {
  var t;
  var r;
  var n;
  var i;
  var o;
  var a;
  var s;
  var u = e.split(".");
  if (u.length && u[u.length - 1] == "") {
    u.pop();
  }
  t = u.length;
  if (t > 4) {
    return e;
  }
  r = [];
  n = 0;
  for (; n < t; n++) {
    i = u[n];
    if (i == "") {
      return e;
    }
    o = 10;
    if (i.length > 1 && i.charAt(0) == "0") {
      o = N.test(i) ? 16 : 8;
      i = i.slice(o == 8 ? 1 : 2);
    }
    if (i === "") {
      a = 0;
    } else {
      if (!(o == 10 ? I : o == 8 ? R : j).test(i)) {
        return e;
      }
      a = parseInt(i, o);
    }
    r.push(a);
  }
  for (n = 0; n < t; n++) {
    a = r[n];
    if (n == t - 1) {
      if (a >= T(256, 5 - t)) {
        return null;
      }
    } else if (a > 255) {
      return null;
    }
  }
  s = r.pop();
  n = 0;
  for (; n < r.length; n++) {
    s += r[n] * T(256, 3 - n);
  }
  return s;
}
function B(e) {
  var t;
  var r;
  var n;
  var i;
  var o;
  var a;
  var s;
  var u = [0, 0, 0, 0, 0, 0, 0, 0];
  var l = 0;
  var c = null;
  var p = 0;
  function d() {
    return e.charAt(p);
  }
  if (d() == ":") {
    if (e.charAt(1) != ":") {
      return;
    }
    p += 2;
    l++;
    c = l;
  }
  while (d()) {
    if (l == 8) {
      return;
    }
    if (d() != ":") {
      t = r = 0;
      while (r < 4 && j.test(d())) {
        t = t * 16 + parseInt(d(), 16);
        p++;
        r++;
      }
      if (d() == ".") {
        if (r == 0) {
          return;
        }
        p -= r;
        if (l > 6) {
          return;
        }
        n = 0;
        while (d()) {
          i = null;
          if (n > 0) {
            if (d() != "." || !(n < 4)) {
              return;
            }
            p++;
          }
          if (!q.test(d())) {
            return;
          }
          while (q.test(d())) {
            o = parseInt(d(), 10);
            if (i === null) {
              i = o;
            } else {
              if (i == 0) {
                return;
              }
              i = i * 10 + o;
            }
            if (i > 255) {
              return;
            }
            p++;
          }
          u[l] = u[l] * 256 + i;
          n++;
          if (n == 2 || n == 4) {
            l++;
          }
        }
        if (n != 4) {
          return;
        }
        break;
      }
      if (d() == ":") {
        p++;
        if (!d()) {
          return;
        }
      } else if (d()) {
        return;
      }
      u[l++] = t;
    } else {
      if (c !== null) {
        return;
      }
      p++;
      l++;
      c = l;
    }
  }
  if (c !== null) {
    a = l - c;
    l = 7;
    while (l != 0 && a > 0) {
      s = u[l];
      u[l--] = u[c + a - 1];
      u[c + --a] = s;
    }
  } else if (l != 8) {
    return;
  }
  return u;
}
function V(e) {
  var t = null;
  var r = 1;
  var n = null;
  var i = 0;
  for (var o = 0; o < 8; o++) {
    if (e[o] !== 0) {
      if (i > r) {
        t = n;
        r = i;
      }
      n = null;
      i = 0;
    } else {
      if (n === null) {
        n = o;
      }
      ++i;
    }
  }
  if (i > r) {
    t = n;
    r = i;
  }
  return t;
}
function H(e) {
  var t;
  var r;
  var n;
  var i;
  if (typeof e == "number") {
    t = [];
    r = 0;
    for (; r < 4; r++) {
      t.unshift(e % 256);
      e = S(e / 256);
    }
    return t.join(".");
  }
  if (typeof e == "object") {
    t = "";
    n = V(e);
    r = 0;
    for (; r < 8; r++) {
      if (!i || e[r] !== 0) {
        i &&= false;
        if (n === r) {
          t += r ? ":" : "::";
          i = true;
        } else {
          t += e[r].toString(16);
          if (r < 7) {
            t += ":";
          }
        }
      }
    }
    return "[" + t + "]";
  }
  return e;
}
var W = {};
var Y = d({}, W, {
  " ": 1,
  "\"": 1,
  "<": 1,
  ">": 1,
  "`": 1
});
var Q = d({}, Y, {
  "#": 1,
  "?": 1,
  "{": 1,
  "}": 1
});
var $ = d({}, Q, {
  "/": 1,
  ":": 1,
  ";": 1,
  "=": 1,
  "@": 1,
  "[": 1,
  "\\": 1,
  "]": 1,
  "^": 1,
  "|": 1
});
function G(e, t) {
  var r = g(e, 0);
  if (r > 32 && r < 127 && !p(t, e)) {
    return e;
  } else {
    return encodeURIComponent(e);
  }
}
var K = {
  ftp: 21,
  file: null,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};
function J(e) {
  return p(K, e.scheme);
}
function X(e) {
  return e.username != "" || e.password != "";
}
function ee(e) {
  return !e.host || e.cannotBeABaseURL || e.scheme == "file";
}
function te(e, t) {
  var r;
  return e.length == 2 && M.test(e.charAt(0)) && ((r = e.charAt(1)) == ":" || !t && r == "|");
}
function re(e) {
  var t;
  return e.length > 1 && te(e.slice(0, 2)) && (e.length == 2 || (t = e.charAt(2)) === "/" || t === "\\" || t === "?" || t === "#");
}
function ne(e) {
  var t = e.path;
  var r = t.length;
  if (!!r && (e.scheme != "file" || r != 1 || !te(t[0], true))) {
    t.pop();
  }
}
function ie(e) {
  return e === "." || e.toLowerCase() === "%2e";
}
function oe(e) {
  e = e.toLowerCase();
  return e === ".." || e === "%2e." || e === ".%2e" || e === "%2e%2e";
}
var ae = {};
var se = {};
var ue = {};
var le = {};
var ce = {};
var pe = {};
var de = {};
var fe = {};
var ge = {};
var me = {};
var ve = {};
var ye = {};
var he = {};
var be = {};
var we = {};
var xe = {};
var Ee = {};
var ke = {};
var Se = {};
var Te = {};
var Ce = {};
function Ae(e, t, r, i) {
  var o;
  var a;
  var s;
  var u;
  var l = r || ae;
  var c = 0;
  var d = "";
  var g = false;
  var m = false;
  var v = false;
  if (!r) {
    e.scheme = "";
    e.username = "";
    e.password = "";
    e.host = null;
    e.port = null;
    e.path = [];
    e.query = null;
    e.fragment = null;
    e.cannotBeABaseURL = false;
    t = t.replace(F, "");
  }
  t = t.replace(Z, "");
  o = f(t);
  while (c <= o.length) {
    a = o[c];
    switch (l) {
      case ae:
        if (!a || !M.test(a)) {
          if (r) {
            return A;
          }
          l = ue;
          continue;
        }
        d += a.toLowerCase();
        l = se;
        break;
      case se:
        if (a && (P.test(a) || a == "+" || a == "-" || a == ".")) {
          d += a.toLowerCase();
        } else {
          if (a != ":") {
            if (r) {
              return A;
            }
            d = "";
            l = ue;
            c = 0;
            continue;
          }
          if (r && (J(e) != p(K, d) || d == "file" && (X(e) || e.port !== null) || e.scheme == "file" && !e.host)) {
            return;
          }
          e.scheme = d;
          if (r) {
            if (J(e) && K[e.scheme] == e.port) {
              e.port = null;
            }
            return;
          }
          d = "";
          if (e.scheme == "file") {
            l = be;
          } else if (J(e) && i && i.scheme == e.scheme) {
            l = le;
          } else if (J(e)) {
            l = fe;
          } else if (o[c + 1] == "/") {
            l = ce;
            c++;
          } else {
            e.cannotBeABaseURL = true;
            e.path.push("");
            l = Se;
          }
        }
        break;
      case ue:
        if (!i || i.cannotBeABaseURL && a != "#") {
          return A;
        }
        if (i.cannotBeABaseURL && a == "#") {
          e.scheme = i.scheme;
          e.path = i.path.slice();
          e.query = i.query;
          e.fragment = "";
          e.cannotBeABaseURL = true;
          l = Ce;
          break;
        }
        l = i.scheme == "file" ? be : pe;
        continue;
      case le:
        if (a != "/" || o[c + 1] != "/") {
          l = pe;
          continue;
        }
        l = ge;
        c++;
        break;
      case ce:
        if (a == "/") {
          l = me;
          break;
        }
        l = ke;
        continue;
      case pe:
        e.scheme = i.scheme;
        if (a == n) {
          e.username = i.username;
          e.password = i.password;
          e.host = i.host;
          e.port = i.port;
          e.path = i.path.slice();
          e.query = i.query;
        } else if (a == "/" || a == "\\" && J(e)) {
          l = de;
        } else if (a == "?") {
          e.username = i.username;
          e.password = i.password;
          e.host = i.host;
          e.port = i.port;
          e.path = i.path.slice();
          e.query = "";
          l = Te;
        } else {
          if (a != "#") {
            e.username = i.username;
            e.password = i.password;
            e.host = i.host;
            e.port = i.port;
            e.path = i.path.slice();
            e.path.pop();
            l = ke;
            continue;
          }
          e.username = i.username;
          e.password = i.password;
          e.host = i.host;
          e.port = i.port;
          e.path = i.path.slice();
          e.query = i.query;
          e.fragment = "";
          l = Ce;
        }
        break;
      case de:
        if (!J(e) || a != "/" && a != "\\") {
          if (a != "/") {
            e.username = i.username;
            e.password = i.password;
            e.host = i.host;
            e.port = i.port;
            l = ke;
            continue;
          }
          l = me;
        } else {
          l = ge;
        }
        break;
      case fe:
        l = ge;
        if (a != "/" || d.charAt(c + 1) != "/") {
          continue;
        }
        c++;
        break;
      case ge:
        if (a != "/" && a != "\\") {
          l = me;
          continue;
        }
        break;
      case me:
        if (a == "@") {
          if (g) {
            d = "%40" + d;
          }
          g = true;
          s = f(d);
          for (var y = 0; y < s.length; y++) {
            var h = s[y];
            if (h != ":" || v) {
              var b = G(h, $);
              if (v) {
                e.password += b;
              } else {
                e.username += b;
              }
            } else {
              v = true;
            }
          }
          d = "";
        } else if (a == n || a == "/" || a == "?" || a == "#" || a == "\\" && J(e)) {
          if (g && d == "") {
            return C;
          }
          c -= f(d).length + 1;
          d = "";
          l = ve;
        } else {
          d += a;
        }
        break;
      case ve:
      case ye:
        if (r && e.scheme == "file") {
          l = xe;
          continue;
        }
        if (a != ":" || m) {
          if (a == n || a == "/" || a == "?" || a == "#" || a == "\\" && J(e)) {
            if (J(e) && d == "") {
              return _;
            }
            if (r && d == "" && (X(e) || e.port !== null)) {
              return;
            }
            u = z(e, d);
            if (u) {
              return u;
            }
            d = "";
            l = Ee;
            if (r) {
              return;
            }
            continue;
          }
          if (a == "[") {
            m = true;
          } else if (a == "]") {
            m = false;
          }
          d += a;
        } else {
          if (d == "") {
            return _;
          }
          u = z(e, d);
          if (u) {
            return u;
          }
          d = "";
          l = he;
          if (r == ye) {
            return;
          }
        }
        break;
      case he:
        if (!q.test(a)) {
          if (a == n || a == "/" || a == "?" || a == "#" || a == "\\" && J(e) || r) {
            if (d != "") {
              var w = parseInt(d, 10);
              if (w > 65535) {
                return O;
              }
              e.port = J(e) && w === K[e.scheme] ? null : w;
              d = "";
            }
            if (r) {
              return;
            }
            l = Ee;
            continue;
          }
          return O;
        }
        d += a;
        break;
      case be:
        e.scheme = "file";
        if (a == "/" || a == "\\") {
          l = we;
        } else {
          if (!i || i.scheme != "file") {
            l = ke;
            continue;
          }
          if (a == n) {
            e.host = i.host;
            e.path = i.path.slice();
            e.query = i.query;
          } else if (a == "?") {
            e.host = i.host;
            e.path = i.path.slice();
            e.query = "";
            l = Te;
          } else {
            if (a != "#") {
              if (!re(o.slice(c).join(""))) {
                e.host = i.host;
                e.path = i.path.slice();
                ne(e);
              }
              l = ke;
              continue;
            }
            e.host = i.host;
            e.path = i.path.slice();
            e.query = i.query;
            e.fragment = "";
            l = Ce;
          }
        }
        break;
      case we:
        if (a == "/" || a == "\\") {
          l = xe;
          break;
        }
        if (i && i.scheme == "file" && !re(o.slice(c).join(""))) {
          if (te(i.path[0], true)) {
            e.path.push(i.path[0]);
          } else {
            e.host = i.host;
          }
        }
        l = ke;
        continue;
      case xe:
        if (a == n || a == "/" || a == "\\" || a == "?" || a == "#") {
          if (!r && te(d)) {
            l = ke;
          } else if (d == "") {
            e.host = "";
            if (r) {
              return;
            }
            l = Ee;
          } else {
            u = z(e, d);
            if (u) {
              return u;
            }
            if (e.host == "localhost") {
              e.host = "";
            }
            if (r) {
              return;
            }
            d = "";
            l = Ee;
          }
          continue;
        }
        d += a;
        break;
      case Ee:
        if (J(e)) {
          l = ke;
          if (a != "/" && a != "\\") {
            continue;
          }
        } else if (r || a != "?") {
          if (r || a != "#") {
            if (a != n && (l = ke, a != "/")) {
              continue;
            }
          } else {
            e.fragment = "";
            l = Ce;
          }
        } else {
          e.query = "";
          l = Te;
        }
        break;
      case ke:
        if (a == n || a == "/" || a == "\\" && J(e) || !r && (a == "?" || a == "#")) {
          if (oe(d)) {
            ne(e);
            if (a != "/" && (a != "\\" || !J(e))) {
              e.path.push("");
            }
          } else if (ie(d)) {
            if (a != "/" && (a != "\\" || !J(e))) {
              e.path.push("");
            }
          } else {
            if (e.scheme == "file" && !e.path.length && te(d)) {
              e.host &&= "";
              d = d.charAt(0) + ":";
            }
            e.path.push(d);
          }
          d = "";
          if (e.scheme == "file" && (a == n || a == "?" || a == "#")) {
            while (e.path.length > 1 && e.path[0] === "") {
              e.path.shift();
            }
          }
          if (a == "?") {
            e.query = "";
            l = Te;
          } else if (a == "#") {
            e.fragment = "";
            l = Ce;
          }
        } else {
          d += G(a, Q);
        }
        break;
      case Se:
        if (a == "?") {
          e.query = "";
          l = Te;
        } else if (a == "#") {
          e.fragment = "";
          l = Ce;
        } else if (a != n) {
          e.path[0] += G(a, W);
        }
        break;
      case Te:
        if (r || a != "#") {
          if (a != n) {
            if (a == "'" && J(e)) {
              e.query += "%27";
            } else {
              e.query += a == "#" ? "%23" : G(a, W);
            }
          }
        } else {
          e.fragment = "";
          l = Ce;
        }
        break;
      case Ce:
        if (a != n) {
          e.fragment += G(a, Y);
        }
        break;
    }
    c++;
  }
}
function _e(e) {
  var t;
  var r;
  var n = c(this, _e, "URL");
  var i = arguments.length > 1 ? arguments[1] : undefined;
  var a = String(e);
  var s = E(n, {
    type: "URL"
  });
  if (i !== undefined) {
    if (i instanceof _e) {
      t = k(i);
    } else {
      r = Ae(t = {}, String(i));
      if (r) {
        throw TypeError(r);
      }
    }
  }
  r = Ae(s, a, null, t);
  if (r) {
    throw TypeError(r);
  }
  var u = s.searchParams = new w();
  var l = x(u);
  l.updateSearchParams(s.query);
  l.updateURL = function () {
    s.query = String(u) || null;
  };
  if (!o) {
    n.href = Me.call(n);
    n.origin = Pe.call(n);
    n.protocol = qe.call(n);
    n.username = Ne.call(n);
    n.password = Re.call(n);
    n.host = Ie.call(n);
    n.hostname = je.call(n);
    n.port = De.call(n);
    n.pathname = Le.call(n);
    n.search = Fe.call(n);
    n.searchParams = Ze.call(n);
    n.hash = ze.call(n);
  }
}
var Oe = _e.prototype;
function Me() {
  var e = k(this);
  var t = e.scheme;
  var r = e.username;
  var n = e.password;
  var i = e.host;
  var o = e.port;
  var a = e.path;
  var s = e.query;
  var u = e.fragment;
  var l = t + ":";
  if (i !== null) {
    l += "//";
    if (X(e)) {
      l += r + (n ? ":" + n : "") + "@";
    }
    l += H(i);
    if (o !== null) {
      l += ":" + o;
    }
  } else if (t == "file") {
    l += "//";
  }
  l += e.cannotBeABaseURL ? a[0] : a.length ? "/" + a.join("/") : "";
  if (s !== null) {
    l += "?" + s;
  }
  if (u !== null) {
    l += "#" + u;
  }
  return l;
}
function Pe() {
  var e = k(this);
  var t = e.scheme;
  var r = e.port;
  if (t == "blob") {
    try {
      return new URL(t.path[0]).origin;
    } catch (n) {
      return "null";
    }
  }
  if (t != "file" && J(e)) {
    return t + "://" + H(e.host) + (r !== null ? ":" + r : "");
  } else {
    return "null";
  }
}
function qe() {
  return k(this).scheme + ":";
}
function Ne() {
  return k(this).username;
}
function Re() {
  return k(this).password;
}
function Ie() {
  var e = k(this);
  var t = e.host;
  var r = e.port;
  if (t === null) {
    return "";
  } else if (r === null) {
    return H(t);
  } else {
    return H(t) + ":" + r;
  }
}
function je() {
  var e = k(this).host;
  if (e === null) {
    return "";
  } else {
    return H(e);
  }
}
function De() {
  var e = k(this).port;
  if (e === null) {
    return "";
  } else {
    return String(e);
  }
}
function Le() {
  var e = k(this);
  var t = e.path;
  if (e.cannotBeABaseURL) {
    return t[0];
  } else if (t.length) {
    return "/" + t.join("/");
  } else {
    return "";
  }
}
function Fe() {
  var e = k(this).query;
  if (e) {
    return "?" + e;
  } else {
    return "";
  }
}
function Ze() {
  return k(this).searchParams;
}
function ze() {
  var e = k(this).fragment;
  if (e) {
    return "#" + e;
  } else {
    return "";
  }
}
function Ue(e, t) {
  return {
    get: e,
    set: t,
    configurable: true,
    enumerable: true
  };
}
if (o) {
  u(Oe, {
    href: Ue(Me, function (e) {
      var t = k(this);
      var r = String(e);
      var n = Ae(t, r);
      if (n) {
        throw TypeError(n);
      }
      x(t.searchParams).updateSearchParams(t.query);
    }),
    origin: Ue(Pe),
    protocol: Ue(qe, function (e) {
      var t = k(this);
      Ae(t, String(e) + ":", ae);
    }),
    username: Ue(Ne, function (e) {
      var t = k(this);
      var r = f(String(e));
      if (!ee(t)) {
        t.username = "";
        for (var n = 0; n < r.length; n++) {
          t.username += G(r[n], $);
        }
      }
    }),
    password: Ue(Re, function (e) {
      var t = k(this);
      var r = f(String(e));
      if (!ee(t)) {
        t.password = "";
        for (var n = 0; n < r.length; n++) {
          t.password += G(r[n], $);
        }
      }
    }),
    host: Ue(Ie, function (e) {
      var t = k(this);
      if (!t.cannotBeABaseURL) {
        Ae(t, String(e), ve);
      }
    }),
    hostname: Ue(je, function (e) {
      var t = k(this);
      if (!t.cannotBeABaseURL) {
        Ae(t, String(e), ye);
      }
    }),
    port: Ue(De, function (e) {
      var t = k(this);
      if (!ee(t)) {
        e = String(e);
        if (e == "") {
          t.port = null;
        } else {
          Ae(t, e, he);
        }
      }
    }),
    pathname: Ue(Le, function (e) {
      var t = k(this);
      if (!t.cannotBeABaseURL) {
        t.path = [];
        Ae(t, e + "", Ee);
      }
    }),
    search: Ue(Fe, function (e) {
      var t = k(this);
      e = String(e);
      if (e == "") {
        t.query = null;
      } else {
        if (e.charAt(0) == "?") {
          e = e.slice(1);
        }
        t.query = "";
        Ae(t, e, Te);
      }
      x(t.searchParams).updateSearchParams(t.query);
    }),
    searchParams: Ue(Ze),
    hash: Ue(ze, function (e) {
      var t = k(this);
      e = String(e);
      if (e != "") {
        if (e.charAt(0) == "#") {
          e = e.slice(1);
        }
        t.fragment = "";
        Ae(t, e, Ce);
      } else {
        t.fragment = null;
      }
    })
  });
}
l(Oe, "toJSON", function () {
  return Me.call(this);
}, {
  enumerable: true
});
l(Oe, "toString", function () {
  return Me.call(this);
}, {
  enumerable: true
});
if (b) {
  var Be = b.createObjectURL;
  var Ve = b.revokeObjectURL;
  if (Be) {
    l(_e, "createObjectURL", function (e) {
      return Be.apply(b, arguments);
    });
  }
  if (Ve) {
    l(_e, "revokeObjectURL", function (e) {
      return Ve.apply(b, arguments);
    });
  }
}
v(_e, "URL");
i({
  global: true,
  forced: !a,
  sham: !o
}, {
  URL: _e
});
};
