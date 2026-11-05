// webpack module 74617 — body from webcrack
module.exports = function (module, exports, require) {
(function (t, r) {
  module.exports = r();
})(0, function () {
  var e = function (e, t) {
    var r = Array.prototype.concat;
    var n = Array.prototype.slice;
    var i = Object.prototype.toString;
    function o(t, r) {
      var n = t > r ? t : r;
      return e.pow(10, 17 - ~~(e.log(n > 0 ? n : -n) * e.LOG10E));
    }
    var a = Array.isArray || function (e) {
      return i.call(e) === "[object Array]";
    };
    function s(e) {
      return i.call(e) === "[object Function]";
    }
    function u(e) {
      return typeof e === "number" && e - e === 0;
    }
    function l(e) {
      return r.apply([], e);
    }
    function c() {
      return new c._init(arguments);
    }
    function p() {
      return 0;
    }
    function d() {
      return 1;
    }
    function f(e, t) {
      if (e === t) {
        return 1;
      } else {
        return 0;
      }
    }
    c.fn = c.prototype;
    c._init = function (e) {
      if (a(e[0])) {
        if (a(e[0][0])) {
          if (s(e[1])) {
            e[0] = c.map(e[0], e[1]);
          }
          for (var t = 0; t < e[0].length; t++) {
            this[t] = e[0][t];
          }
          this.length = e[0].length;
        } else {
          this[0] = s(e[1]) ? c.map(e[0], e[1]) : e[0];
          this.length = 1;
        }
      } else if (u(e[0])) {
        this[0] = c.seq.apply(null, e);
        this.length = 1;
      } else {
        if (e[0] instanceof c) {
          return c(e[0].toArray());
        }
        this[0] = [];
        this.length = 1;
      }
      return this;
    };
    c._init.prototype = c.prototype;
    c._init.constructor = c;
    c.utils = {
      calcRdx: o,
      isArray: a,
      isFunction: s,
      isNumber: u,
      toVector: l
    };
    c._random_fn = e.random;
    c.setRandom = function (e) {
      if (typeof e !== "function") {
        throw new TypeError("fn is not a function");
      }
      c._random_fn = e;
    };
    c.extend = function (e) {
      var t;
      var r;
      if (arguments.length === 1) {
        for (r in e) {
          c[r] = e[r];
        }
        return this;
      }
      for (t = 1; t < arguments.length; t++) {
        for (r in arguments[t]) {
          e[r] = arguments[t][r];
        }
      }
      return e;
    };
    c.rows = function (e) {
      return e.length || 1;
    };
    c.cols = function (e) {
      return e[0].length || 1;
    };
    c.dimensions = function (e) {
      return {
        rows: c.rows(e),
        cols: c.cols(e)
      };
    };
    c.row = function (e, t) {
      if (a(t)) {
        return t.map(function (t) {
          return c.row(e, t);
        });
      } else {
        return e[t];
      }
    };
    c.rowa = function (e, t) {
      return c.row(e, t);
    };
    c.col = function (e, t) {
      if (a(t)) {
        var r = c.arange(e.length).map(function () {
          return new Array(t.length);
        });
        t.forEach(function (t, n) {
          c.arange(e.length).forEach(function (i) {
            r[i][n] = e[i][t];
          });
        });
        return r;
      }
      var n = new Array(e.length);
      for (var i = 0; i < e.length; i++) {
        n[i] = [e[i][t]];
      }
      return n;
    };
    c.cola = function (e, t) {
      return c.col(e, t).map(function (e) {
        return e[0];
      });
    };
    c.diag = function (e) {
      for (var t = c.rows(e), r = new Array(t), n = 0; n < t; n++) {
        r[n] = [e[n][n]];
      }
      return r;
    };
    c.antidiag = function (e) {
      for (var t = c.rows(e) - 1, r = new Array(t), n = 0; t >= 0; t--, n++) {
        r[n] = [e[n][t]];
      }
      return r;
    };
    c.transpose = function (e) {
      var t;
      var r;
      var n;
      var i;
      var o;
      var s = [];
      if (!a(e[0])) {
        e = [e];
      }
      r = e.length;
      n = e[0].length;
      o = 0;
      for (; o < n; o++) {
        t = new Array(r);
        i = 0;
        for (; i < r; i++) {
          t[i] = e[i][o];
        }
        s.push(t);
      }
      if (s.length === 1) {
        return s[0];
      } else {
        return s;
      }
    };
    c.map = function (e, t, r) {
      var n;
      var i;
      var o;
      var s;
      var u;
      if (!a(e[0])) {
        e = [e];
      }
      i = e.length;
      o = e[0].length;
      s = r ? e : new Array(i);
      n = 0;
      for (; n < i; n++) {
        s[n] ||= new Array(o);
        u = 0;
        for (; u < o; u++) {
          s[n][u] = t(e[n][u], n, u);
        }
      }
      if (s.length === 1) {
        return s[0];
      } else {
        return s;
      }
    };
    c.cumreduce = function (e, t, r) {
      var n;
      var i;
      var o;
      var s;
      var u;
      if (!a(e[0])) {
        e = [e];
      }
      i = e.length;
      o = e[0].length;
      s = r ? e : new Array(i);
      n = 0;
      for (; n < i; n++) {
        s[n] ||= new Array(o);
        if (o > 0) {
          s[n][0] = e[n][0];
        }
        u = 1;
        for (; u < o; u++) {
          s[n][u] = t(s[n][u - 1], e[n][u]);
        }
      }
      if (s.length === 1) {
        return s[0];
      } else {
        return s;
      }
    };
    c.alter = function (e, t) {
      return c.map(e, t, true);
    };
    c.create = function (e, t, r) {
      var n;
      var i;
      var o = new Array(e);
      if (s(t)) {
        r = t;
        t = e;
      }
      n = 0;
      for (; n < e; n++) {
        o[n] = new Array(t);
        i = 0;
        for (; i < t; i++) {
          o[n][i] = r(n, i);
        }
      }
      return o;
    };
    c.zeros = function (e, t) {
      if (!u(t)) {
        t = e;
      }
      return c.create(e, t, p);
    };
    c.ones = function (e, t) {
      if (!u(t)) {
        t = e;
      }
      return c.create(e, t, d);
    };
    c.rand = function (e, t) {
      if (!u(t)) {
        t = e;
      }
      return c.create(e, t, c._random_fn);
    };
    c.identity = function (e, t) {
      if (!u(t)) {
        t = e;
      }
      return c.create(e, t, f);
    };
    c.symmetric = function (e) {
      var t;
      var r;
      var n = e.length;
      if (e.length !== e[0].length) {
        return false;
      }
      for (t = 0; t < n; t++) {
        for (r = 0; r < n; r++) {
          if (e[r][t] !== e[t][r]) {
            return false;
          }
        }
      }
      return true;
    };
    c.clear = function (e) {
      return c.alter(e, p);
    };
    c.seq = function (e, t, r, n) {
      if (!s(n)) {
        n = false;
      }
      var i;
      var a = [];
      var u = o(e, t);
      var l = (t * u - e * u) / ((r - 1) * u);
      var c = e;
      for (i = 0; c <= t && i < r; i++, c = (e * u + l * u * i) / u) {
        a.push(n ? n(c, i) : c);
      }
      return a;
    };
    c.arange = function (e, r, n) {
      var i;
      var o = [];
      n = n || 1;
      if (r === t) {
        r = e;
        e = 0;
      }
      if (e === r || n === 0) {
        return [];
      }
      if (e < r && n < 0) {
        return [];
      }
      if (e > r && n > 0) {
        return [];
      }
      if (n > 0) {
        for (i = e; i < r; i += n) {
          o.push(i);
        }
      } else {
        for (i = e; i > r; i += n) {
          o.push(i);
        }
      }
      return o;
    };
    c.slice = function () {
      function e(e, r, n, i) {
        var o;
        var a = [];
        var s = e.length;
        if (r === t && n === t && i === t) {
          return c.copy(e);
        }
        r = r || 0;
        n = n || e.length;
        r = r >= 0 ? r : s + r;
        n = n >= 0 ? n : s + n;
        i = i || 1;
        if (r === n || i === 0) {
          return [];
        }
        if (r < n && i < 0) {
          return [];
        }
        if (r > n && i > 0) {
          return [];
        }
        if (i > 0) {
          for (o = r; o < n; o += i) {
            a.push(e[o]);
          }
        } else {
          for (o = r; o > n; o += i) {
            a.push(e[o]);
          }
        }
        return a;
      }
      function r(t, r) {
        var n;
        var i;
        r = r || {};
        if (u(r.row)) {
          if (u(r.col)) {
            return t[r.row][r.col];
          }
          var o = c.rowa(t, r.row);
          n = r.col || {};
          return e(o, n.start, n.end, n.step);
        }
        if (u(r.col)) {
          var a = c.cola(t, r.col);
          i = r.row || {};
          return e(a, i.start, i.end, i.step);
        }
        i = r.row || {};
        n = r.col || {};
        var s = e(t, i.start, i.end, i.step);
        return s.map(function (t) {
          return e(t, n.start, n.end, n.step);
        });
      }
      return r;
    }();
    c.sliceAssign = function (r, n, i) {
      var o;
      var a;
      if (u(n.row)) {
        if (u(n.col)) {
          return r[n.row][n.col] = i;
        }
        n.col = n.col || {};
        n.col.start = n.col.start || 0;
        n.col.end = n.col.end || r[0].length;
        n.col.step = n.col.step || 1;
        o = c.arange(n.col.start, e.min(r.length, n.col.end), n.col.step);
        var s = n.row;
        o.forEach(function (e, t) {
          r[s][e] = i[t];
        });
        return r;
      }
      if (u(n.col)) {
        n.row = n.row || {};
        n.row.start = n.row.start || 0;
        n.row.end = n.row.end || r.length;
        n.row.step = n.row.step || 1;
        a = c.arange(n.row.start, e.min(r[0].length, n.row.end), n.row.step);
        var l = n.col;
        a.forEach(function (e, t) {
          r[e][l] = i[t];
        });
        return r;
      }
      if (i[0].length === t) {
        i = [i];
      }
      n.row.start = n.row.start || 0;
      n.row.end = n.row.end || r.length;
      n.row.step = n.row.step || 1;
      n.col.start = n.col.start || 0;
      n.col.end = n.col.end || r[0].length;
      n.col.step = n.col.step || 1;
      a = c.arange(n.row.start, e.min(r.length, n.row.end), n.row.step);
      o = c.arange(n.col.start, e.min(r[0].length, n.col.end), n.col.step);
      a.forEach(function (e, t) {
        o.forEach(function (n, o) {
          r[e][n] = i[t][o];
        });
      });
      return r;
    };
    c.diagonal = function (e) {
      var t = c.zeros(e.length, e.length);
      e.forEach(function (e, r) {
        t[r][r] = e;
      });
      return t;
    };
    c.copy = function (e) {
      return e.map(function (e) {
        if (u(e)) {
          return e;
        } else {
          return e.map(function (e) {
            return e;
          });
        }
      });
    };
    var g = c.prototype;
    g.length = 0;
    g.push = Array.prototype.push;
    g.sort = Array.prototype.sort;
    g.splice = Array.prototype.splice;
    g.slice = Array.prototype.slice;
    g.toArray = function () {
      if (this.length > 1) {
        return n.call(this);
      } else {
        return n.call(this)[0];
      }
    };
    g.map = function (e, t) {
      return c(c.map(this, e, t));
    };
    g.cumreduce = function (e, t) {
      return c(c.cumreduce(this, e, t));
    };
    g.alter = function (e) {
      c.alter(this, e);
      return this;
    };
    (function (e) {
      for (var t = 0; t < e.length; t++) {
        (function (e) {
          g[e] = function (t) {
            var r;
            var n = this;
            if (t) {
              setTimeout(function () {
                t.call(n, g[e].call(n));
              });
              return this;
            } else {
              r = c[e](this);
              if (a(r)) {
                return c(r);
              } else {
                return r;
              }
            }
          };
        })(e[t]);
      }
    })("transpose clear symmetric rows cols dimensions diag antidiag".split(" "));
    (function (e) {
      for (var t = 0; t < e.length; t++) {
        (function (e) {
          g[e] = function (t, r) {
            var n = this;
            if (r) {
              setTimeout(function () {
                r.call(n, g[e].call(n, t));
              });
              return this;
            } else {
              return c(c[e](this, t));
            }
          };
        })(e[t]);
      }
    })("row col".split(" "));
    (function (e) {
      for (var t = 0; t < e.length; t++) {
        (function (e) {
          g[e] = function () {
            return c(c[e].apply(null, arguments));
          };
        })(e[t]);
      }
    })("create zeros ones rand identity".split(" "));
    return c;
  }(Math);
  (function (e, t) {
    var r = e.utils.isFunction;
    function n(e, t) {
      return e - t;
    }
    function i(e, r, n) {
      return t.max(r, t.min(e, n));
    }
    e.sum = function (e) {
      var t = 0;
      var r = e.length;
      while (--r >= 0) {
        t += e[r];
      }
      return t;
    };
    e.sumsqrd = function (e) {
      var t = 0;
      var r = e.length;
      while (--r >= 0) {
        t += e[r] * e[r];
      }
      return t;
    };
    e.sumsqerr = function (t) {
      var r;
      var n = e.mean(t);
      var i = 0;
      var o = t.length;
      while (--o >= 0) {
        r = t[o] - n;
        i += r * r;
      }
      return i;
    };
    e.sumrow = function (e) {
      var t = 0;
      var r = e.length;
      while (--r >= 0) {
        t += e[r];
      }
      return t;
    };
    e.product = function (e) {
      var t = 1;
      var r = e.length;
      while (--r >= 0) {
        t *= e[r];
      }
      return t;
    };
    e.min = function (e) {
      var t = e[0];
      var r = 0;
      while (++r < e.length) {
        if (e[r] < t) {
          t = e[r];
        }
      }
      return t;
    };
    e.max = function (e) {
      var t = e[0];
      var r = 0;
      while (++r < e.length) {
        if (e[r] > t) {
          t = e[r];
        }
      }
      return t;
    };
    e.unique = function (e) {
      var t = {};
      var r = [];
      for (var n = 0; n < e.length; n++) {
        if (!t[e[n]]) {
          t[e[n]] = true;
          r.push(e[n]);
        }
      }
      return r;
    };
    e.mean = function (t) {
      return e.sum(t) / t.length;
    };
    e.meansqerr = function (t) {
      return e.sumsqerr(t) / t.length;
    };
    e.geomean = function (r) {
      var n = r.map(t.log);
      var i = e.mean(n);
      return t.exp(i);
    };
    e.median = function (e) {
      var t = e.length;
      var r = e.slice().sort(n);
      if (t & 1) {
        return r[t / 2 | 0];
      } else {
        return (r[t / 2 - 1] + r[t / 2]) / 2;
      }
    };
    e.cumsum = function (t) {
      return e.cumreduce(t, function (e, t) {
        return e + t;
      });
    };
    e.cumprod = function (t) {
      return e.cumreduce(t, function (e, t) {
        return e * t;
      });
    };
    e.diff = function (e) {
      var t;
      var r = [];
      var n = e.length;
      for (t = 1; t < n; t++) {
        r.push(e[t] - e[t - 1]);
      }
      return r;
    };
    e.rank = function (e) {
      var t;
      var r = [];
      var i = {};
      for (t = 0; t < e.length; t++) {
        var o = e[t];
        if (i[o]) {
          i[o]++;
        } else {
          i[o] = 1;
          r.push(o);
        }
      }
      var a = r.sort(n);
      var s = {};
      var u = 1;
      for (t = 0; t < a.length; t++) {
        o = a[t];
        var l = i[o];
        var c = u;
        var p = u + l - 1;
        var d = (c + p) / 2;
        s[o] = d;
        u += l;
      }
      return e.map(function (e) {
        return s[e];
      });
    };
    e.mode = function (e) {
      var t;
      var r = e.length;
      var i = e.slice().sort(n);
      var o = 1;
      var a = 0;
      var s = 0;
      var u = [];
      for (t = 0; t < r; t++) {
        if (i[t] === i[t + 1]) {
          o++;
        } else {
          if (o > a) {
            u = [i[t]];
            a = o;
            s = 0;
          } else if (o === a) {
            u.push(i[t]);
            s++;
          }
          o = 1;
        }
      }
      if (s === 0) {
        return u[0];
      } else {
        return u;
      }
    };
    e.range = function (t) {
      return e.max(t) - e.min(t);
    };
    e.variance = function (t, r) {
      return e.sumsqerr(t) / (t.length - (r ? 1 : 0));
    };
    e.pooledvariance = function (t) {
      var r = t.reduce(function (t, r) {
        return t + e.sumsqerr(r);
      }, 0);
      var n = t.reduce(function (e, t) {
        return e + t.length;
      }, 0);
      return r / (n - t.length);
    };
    e.deviation = function (t) {
      var r = e.mean(t);
      for (var n = t.length, i = new Array(n), o = 0; o < n; o++) {
        i[o] = t[o] - r;
      }
      return i;
    };
    e.stdev = function (r, n) {
      return t.sqrt(e.variance(r, n));
    };
    e.pooledstdev = function (r) {
      return t.sqrt(e.pooledvariance(r));
    };
    e.meandev = function (r) {
      var n = e.mean(r);
      var i = [];
      for (var o = r.length - 1; o >= 0; o--) {
        i.push(t.abs(r[o] - n));
      }
      return e.mean(i);
    };
    e.meddev = function (r) {
      var n = e.median(r);
      var i = [];
      for (var o = r.length - 1; o >= 0; o--) {
        i.push(t.abs(r[o] - n));
      }
      return e.median(i);
    };
    e.coeffvar = function (t) {
      return e.stdev(t) / e.mean(t);
    };
    e.quartiles = function (e) {
      var r = e.length;
      var i = e.slice().sort(n);
      return [i[t.round(r / 4) - 1], i[t.round(r / 2) - 1], i[t.round(r * 3 / 4) - 1]];
    };
    e.quantiles = function (e, r, o, a) {
      var s;
      var u;
      var l;
      var c;
      var p;
      var d;
      var f = e.slice().sort(n);
      var g = [r.length];
      var m = e.length;
      if (typeof o === "undefined") {
        o = 3 / 8;
      }
      if (typeof a === "undefined") {
        a = 3 / 8;
      }
      s = 0;
      for (; s < r.length; s++) {
        u = r[s];
        l = o + u * (1 - o - a);
        c = m * u + l;
        p = t.floor(i(c, 1, m - 1));
        d = i(c - p, 0, 1);
        g[s] = (1 - d) * f[p - 1] + d * f[p];
      }
      return g;
    };
    e.percentile = function (e, t, r) {
      var i = e.slice().sort(n);
      var o = t * (i.length + (r ? 1 : -1)) + (r ? 0 : 1);
      var a = parseInt(o);
      var s = o - a;
      if (a + 1 < i.length) {
        return i[a - 1] + s * (i[a] - i[a - 1]);
      } else {
        return i[a - 1];
      }
    };
    e.percentileOfScore = function (e, t, r) {
      var n;
      var i;
      var o = 0;
      var a = e.length;
      var s = false;
      if (r === "strict") {
        s = true;
      }
      i = 0;
      for (; i < a; i++) {
        n = e[i];
        if (s && n < t || !s && n <= t) {
          o++;
        }
      }
      return o / a;
    };
    e.histogram = function (r, n) {
      n = n || 4;
      var i;
      var o = e.min(r);
      var a = (e.max(r) - o) / n;
      var s = r.length;
      var u = [];
      for (i = 0; i < n; i++) {
        u[i] = 0;
      }
      for (i = 0; i < s; i++) {
        u[t.min(t.floor((r[i] - o) / a), n - 1)] += 1;
      }
      return u;
    };
    e.covariance = function (t, r) {
      var n;
      var i = e.mean(t);
      var o = e.mean(r);
      var a = t.length;
      var s = new Array(a);
      for (n = 0; n < a; n++) {
        s[n] = (t[n] - i) * (r[n] - o);
      }
      return e.sum(s) / (a - 1);
    };
    e.corrcoeff = function (t, r) {
      return e.covariance(t, r) / e.stdev(t, 1) / e.stdev(r, 1);
    };
    e.spearmancoeff = function (t, r) {
      t = e.rank(t);
      r = e.rank(r);
      return e.corrcoeff(t, r);
    };
    e.stanMoment = function (r, n) {
      var i = e.mean(r);
      var o = e.stdev(r);
      for (var a = r.length, s = 0, u = 0; u < a; u++) {
        s += t.pow((r[u] - i) / o, n);
      }
      return s / r.length;
    };
    e.skewness = function (t) {
      return e.stanMoment(t, 3);
    };
    e.kurtosis = function (t) {
      return e.stanMoment(t, 4) - 3;
    };
    var o = e.prototype;
    (function (t) {
      for (var n = 0; n < t.length; n++) {
        (function (t) {
          o[t] = function (n, i) {
            var a = [];
            var s = 0;
            var u = this;
            if (r(n)) {
              i = n;
              n = false;
            }
            if (i) {
              setTimeout(function () {
                i.call(u, o[t].call(u, n));
              });
              return this;
            }
            if (this.length > 1) {
              for (u = n === true ? this : this.transpose(); s < u.length; s++) {
                a[s] = e[t](u[s]);
              }
              return a;
            }
            return e[t](this[0], n);
          };
        })(t[n]);
      }
    })("cumsum cumprod".split(" "));
    (function (t) {
      for (var n = 0; n < t.length; n++) {
        (function (t) {
          o[t] = function (n, i) {
            var a = [];
            var s = 0;
            var u = this;
            if (r(n)) {
              i = n;
              n = false;
            }
            if (i) {
              setTimeout(function () {
                i.call(u, o[t].call(u, n));
              });
              return this;
            }
            if (this.length > 1) {
              for (t !== "sumrow" && (u = n === true ? this : this.transpose()); s < u.length; s++) {
                a[s] = e[t](u[s]);
              }
              if (n === true) {
                return e[t](e.utils.toVector(a));
              } else {
                return a;
              }
            }
            return e[t](this[0], n);
          };
        })(t[n]);
      }
    })("sum sumsqrd sumsqerr sumrow product min max unique mean meansqerr geomean median diff rank mode range variance deviation stdev meandev meddev coeffvar quartiles histogram skewness kurtosis".split(" "));
    (function (t) {
      for (var n = 0; n < t.length; n++) {
        (function (t) {
          o[t] = function () {
            var n;
            var i = [];
            var a = 0;
            var s = this;
            var u = Array.prototype.slice.call(arguments);
            if (r(u[u.length - 1])) {
              n = u[u.length - 1];
              var l = u.slice(0, u.length - 1);
              setTimeout(function () {
                n.call(s, o[t].apply(s, l));
              });
              return this;
            }
            n = undefined;
            function c(r) {
              return e[t].apply(s, [r].concat(u));
            }
            if (this.length > 1) {
              for (s = s.transpose(); a < s.length; a++) {
                i[a] = c(s[a]);
              }
              return i;
            }
            return c(this[0]);
          };
        })(t[n]);
      }
    })("quantiles percentileOfScore".split(" "));
  })(e, Math);
  (function (e, t) {
    e.gammaln = function (e) {
      var r;
      var n;
      var i;
      var o = 0;
      var a = [76.18009172947146, -86.50532032941678, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
      var s = 1.000000000190015;
      i = (n = r = e) + 5.5;
      i -= (r + 0.5) * t.log(i);
      for (; o < 6; o++) {
        s += a[o] / ++n;
      }
      return t.log(s * 2.5066282746310007 / r) - i;
    };
    e.loggam = function (e) {
      var r;
      var n;
      var i;
      var o;
      var a;
      var s;
      var u;
      var l = [0.08333333333333333, -0.002777777777777778, 0.0007936507936507937, -0.0005952380952380952, 0.0008417508417508418, -0.001917526917526918, 0.00641025641025641, -0.02955065359477124, 0.1796443723688307, -1.3924322169059];
      r = e;
      u = 0;
      if (e == 1 || e == 2) {
        return 0;
      }
      if (e <= 7) {
        u = t.floor(7 - e);
        r = e + u;
      }
      n = 1 / (r * r);
      i = t.PI * 2;
      a = l[9];
      s = 8;
      for (; s >= 0; s--) {
        a *= n;
        a += l[s];
      }
      o = a / r + t.log(i) * 0.5 + (r - 0.5) * t.log(r) - r;
      if (e <= 7) {
        for (s = 1; s <= u; s++) {
          o -= t.log(r - 1);
          r -= 1;
        }
      }
      return o;
    };
    e.gammafn = function (e) {
      var r;
      var n;
      var i;
      var o;
      var a = [-1.716185138865495, 24.76565080557592, -379.80425647094563, 629.3311553128184, 866.9662027904133, -31451.272968848367, -36144.413418691176, 66456.14382024054];
      var s = [-30.8402300119739, 315.35062697960416, -1015.1563674902192, -3107.771671572311, 22538.11842098015, 4755.846277527881, -134659.9598649693, -115132.2596755535];
      var u = false;
      var l = 0;
      var c = 0;
      var p = 0;
      var d = e;
      if (e > 171.6243769536076) {
        return Infinity;
      }
      if (d <= 0) {
        o = d % 1 + 3.6e-16;
        if (!o) {
          return Infinity;
        }
        u = (d & 1 ? -1 : 1) * t.PI / t.sin(t.PI * o);
        d = 1 - d;
      }
      i = d;
      n = d < 1 ? d++ : (d -= l = (d | 0) - 1) - 1;
      r = 0;
      for (; r < 8; ++r) {
        p = (p + a[r]) * n;
        c = c * n + s[r];
      }
      o = p / c + 1;
      if (i < d) {
        o /= i;
      } else if (i > d) {
        for (r = 0; r < l; ++r) {
          o *= d;
          d++;
        }
      }
      if (u) {
        o = u / o;
      }
      return o;
    };
    e.gammap = function (t, r) {
      return e.lowRegGamma(t, r) * e.gammafn(t);
    };
    e.lowRegGamma = function (r, n) {
      var i;
      var o = e.gammaln(r);
      var a = r;
      var s = 1 / r;
      var u = s;
      var l = n + 1 - r;
      var c = 9.999999999999999e+29;
      var p = 1 / l;
      var d = p;
      var f = 1;
      var g = -~(t.log(r >= 1 ? r : 1 / r) * 8.5 + r * 0.4 + 17);
      if (n < 0 || r <= 0) {
        return NaN;
      }
      if (n < r + 1) {
        for (; f <= g; f++) {
          s += u *= n / ++a;
        }
        return s * t.exp(-n + r * t.log(n) - o);
      }
      for (; f <= g; f++) {
        i = -f * (f - r);
        l += 2;
        p = i * p + l;
        c = l + i / c;
        p = 1 / p;
        d *= p * c;
      }
      return 1 - d * t.exp(-n + r * t.log(n) - o);
    };
    e.factorialln = function (t) {
      if (t < 0) {
        return NaN;
      } else {
        return e.gammaln(t + 1);
      }
    };
    e.factorial = function (t) {
      if (t < 0) {
        return NaN;
      } else {
        return e.gammafn(t + 1);
      }
    };
    e.combination = function (r, n) {
      if (r > 170 || n > 170) {
        return t.exp(e.combinationln(r, n));
      } else {
        return e.factorial(r) / e.factorial(n) / e.factorial(r - n);
      }
    };
    e.combinationln = function (t, r) {
      return e.factorialln(t) - e.factorialln(r) - e.factorialln(t - r);
    };
    e.permutation = function (t, r) {
      return e.factorial(t) / e.factorial(t - r);
    };
    e.betafn = function (r, n) {
      if (!(r <= 0) && !(n <= 0)) {
        if (r + n > 170) {
          return t.exp(e.betaln(r, n));
        } else {
          return e.gammafn(r) * e.gammafn(n) / e.gammafn(r + n);
        }
      }
    };
    e.betaln = function (t, r) {
      return e.gammaln(t) + e.gammaln(r) - e.gammaln(t + r);
    };
    e.betacf = function (e, r, n) {
      var i;
      var o;
      var a;
      var s;
      var u = 1e-30;
      var l = 1;
      var c = r + n;
      var p = r + 1;
      var d = r - 1;
      var f = 1;
      var g = 1 - c * e / p;
      if (t.abs(g) < u) {
        g = u;
      }
      g = 1 / g;
      s = g;
      for (; l <= 100; l++) {
        i = l * 2;
        o = l * (n - l) * e / ((d + i) * (r + i));
        g = 1 + o * g;
        if (t.abs(g) < u) {
          g = u;
        }
        f = 1 + o / f;
        if (t.abs(f) < u) {
          f = u;
        }
        g = 1 / g;
        s *= g * f;
        o = -(r + l) * (c + l) * e / ((r + i) * (p + i));
        g = 1 + o * g;
        if (t.abs(g) < u) {
          g = u;
        }
        f = 1 + o / f;
        if (t.abs(f) < u) {
          f = u;
        }
        g = 1 / g;
        a = g * f;
        s *= a;
        if (t.abs(a - 1) < 3e-7) {
          break;
        }
      }
      return s;
    };
    e.gammapinv = function (r, n) {
      var i;
      var o;
      var a;
      var s;
      var u;
      var l;
      var c;
      var p = 0;
      var d = n - 1;
      var f = 1e-8;
      var g = e.gammaln(n);
      if (r >= 1) {
        return t.max(100, n + t.sqrt(n) * 100);
      }
      if (r <= 0) {
        return 0;
      }
      for (n > 1 ? (l = t.log(d), c = t.exp(d * (l - 1) - g), u = r < 0.5 ? r : 1 - r, a = t.sqrt(t.log(u) * -2), i = (2.30753 + a * 0.27061) / (1 + a * (0.99229 + a * 0.04481)) - a, r < 0.5 && (i = -i), i = t.max(0.001, n * t.pow(1 - 1 / (n * 9) - i / (t.sqrt(n) * 3), 3))) : (a = 1 - n * (0.253 + n * 0.12), i = r < a ? t.pow(r / a, 1 / n) : 1 - t.log(1 - (r - a) / (1 - a))); p < 12; p++) {
        if (i <= 0) {
          return 0;
        }
        o = e.lowRegGamma(n, i) - r;
        a = n > 1 ? c * t.exp(-(i - d) + d * (t.log(i) - l)) : t.exp(-i + d * t.log(i) - g);
        s = o / a;
        i -= a = s / (1 - t.min(1, s * ((n - 1) / i - 1)) * 0.5);
        if (i <= 0) {
          i = (i + a) * 0.5;
        }
        if (t.abs(a) < f * i) {
          break;
        }
      }
      return i;
    };
    e.erf = function (e) {
      var r;
      var n;
      var i;
      var o;
      var a = [-1.3026537197817094, 0.6419697923564902, 0.019476473204185836, -0.00956151478680863, -0.000946595344482036, 0.000366839497852761, 0.000042523324806907, -0.000020278578112534, -0.000001624290004647, 0.00000130365583558, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9, 5.059343495e-9, -9.91364156e-10, -2.27365122e-10, 9.6467911e-11, 2.394038e-12, -6.886027e-12, 8.94487e-13, 3.13092e-13, -1.12708e-13, 3.81e-16, 7.106e-15, -1.523e-15, -9.4e-17, 1.21e-16, -2.8e-17];
      var s = a.length - 1;
      var u = false;
      var l = 0;
      var c = 0;
      if (e < 0) {
        e = -e;
        u = true;
      }
      r = 2 / (2 + e);
      n = r * 4 - 2;
      for (; s > 0; s--) {
        i = l;
        l = n * l - c + a[s];
        c = i;
      }
      o = r * t.exp(-e * e + (a[0] + n * l) * 0.5 - c);
      if (u) {
        return o - 1;
      } else {
        return 1 - o;
      }
    };
    e.erfc = function (t) {
      return 1 - e.erf(t);
    };
    e.erfcinv = function (r) {
      var n;
      var i;
      var o;
      var a;
      var s = 0;
      if (r >= 2) {
        return -100;
      }
      if (r <= 0) {
        return 100;
      }
      a = r < 1 ? r : 2 - r;
      o = t.sqrt(t.log(a / 2) * -2);
      n = ((2.30753 + o * 0.27061) / (1 + o * (0.99229 + o * 0.04481)) - o) * -0.70711;
      for (; s < 2; s++) {
        i = e.erfc(n) - a;
        n += i / (t.exp(-n * n) * 1.1283791670955126 - n * i);
      }
      if (r < 1) {
        return n;
      } else {
        return -n;
      }
    };
    e.ibetainv = function (r, n, i) {
      var o;
      var a;
      var s;
      var u;
      var l;
      var c;
      var p;
      var d;
      var f;
      var g;
      var m;
      var v = 1e-8;
      var y = n - 1;
      var h = i - 1;
      var b = 0;
      if (r <= 0) {
        return 0;
      }
      if (r >= 1) {
        return 1;
      }
      if (n >= 1 && i >= 1) {
        s = r < 0.5 ? r : 1 - r;
        u = t.sqrt(t.log(s) * -2);
        p = (2.30753 + u * 0.27061) / (1 + u * (0.99229 + u * 0.04481)) - u;
        if (r < 0.5) {
          p = -p;
        }
        d = (p * p - 3) / 6;
        f = 2 / (1 / (n * 2 - 1) + 1 / (i * 2 - 1));
        g = p * t.sqrt(d + f) / f - (1 / (i * 2 - 1) - 1 / (n * 2 - 1)) * (d + 5 / 6 - 2 / (f * 3));
        p = n / (n + i * t.exp(g * 2));
      } else {
        o = t.log(n / (n + i));
        a = t.log(i / (n + i));
        u = t.exp(n * o) / n;
        l = t.exp(i * a) / i;
        g = u + l;
        p = r < u / g ? t.pow(n * g * r, 1 / n) : 1 - t.pow(i * g * (1 - r), 1 / i);
      }
      m = -e.gammaln(n) - e.gammaln(i) + e.gammaln(n + i);
      for (; b < 10; b++) {
        if (p === 0 || p === 1) {
          return p;
        }
        c = e.ibeta(p, n, i) - r;
        u = t.exp(y * t.log(p) + h * t.log(1 - p) + m);
        l = c / u;
        p -= u = l / (1 - t.min(1, l * (y / p - h / (1 - p))) * 0.5);
        if (p <= 0) {
          p = (p + u) * 0.5;
        }
        if (p >= 1) {
          p = (p + u + 1) * 0.5;
        }
        if (t.abs(u) < v * p && b > 0) {
          break;
        }
      }
      return p;
    };
    e.ibeta = function (r, n, i) {
      var o = r === 0 || r === 1 ? 0 : t.exp(e.gammaln(n + i) - e.gammaln(n) - e.gammaln(i) + n * t.log(r) + i * t.log(1 - r));
      return !(r < 0) && !(r > 1) && (r < (n + 1) / (n + i + 2) ? o * e.betacf(r, n, i) / n : 1 - o * e.betacf(1 - r, i, n) / i);
    };
    e.randn = function (r, n) {
      var i;
      var o;
      var a;
      var s;
      var u;
      n ||= r;
      if (r) {
        return e.create(r, n, function () {
          return e.randn();
        });
      }
      do {
        i = e._random_fn();
        o = (e._random_fn() - 0.5) * 1.7156;
        a = i - 0.449871;
        s = t.abs(o) + 0.386595;
        u = a * a + s * (s * 0.196 - a * 0.25472);
      } while (u > 0.27597 && (u > 0.27846 || o * o > t.log(i) * -4 * i * i));
      return o / i;
    };
    e.randg = function (r, n, i) {
      var o;
      var a;
      var s;
      var u;
      var l;
      var c;
      var p = r;
      i ||= n;
      r ||= 1;
      if (n) {
        c = e.zeros(n, i);
        c.alter(function () {
          return e.randg(r);
        });
        return c;
      }
      if (r < 1) {
        r += 1;
      }
      o = r - 1 / 3;
      a = 1 / t.sqrt(o * 9);
      do {
        do {
          l = e.randn();
          u = 1 + a * l;
        } while (u <= 0);
        u *= u * u;
        s = e._random_fn();
      } while (s > 1 - t.pow(l, 4) * 0.331 && t.log(s) > l * 0.5 * l + o * (1 - u + t.log(u)));
      if (r == p) {
        return o * u;
      }
      do {
        s = e._random_fn();
      } while (s === 0);
      return t.pow(s, 1 / p) * o * u;
    };
    (function (t) {
      for (var r = 0; r < t.length; r++) {
        (function (t) {
          e.fn[t] = function () {
            return e(e.map(this, function (r) {
              return e[t](r);
            }));
          };
        })(t[r]);
      }
    })("gammaln gammafn factorial factorialln".split(" "));
    (function (t) {
      for (var r = 0; r < t.length; r++) {
        (function (t) {
          e.fn[t] = function () {
            return e(e[t].apply(null, arguments));
          };
        })(t[r]);
      }
    })("randn".split(" "));
  })(e, Math);
  (function (e, t) {
    function r(e, r, n, i) {
      var o;
      var a = 0;
      var s = 1;
      var u = 1;
      var l = 1;
      var c = 0;
      var p = 0;
      while (t.abs((u - p) / u) > i) {
        p = u;
        o = -(r + c) * (r + n + c) * e / (r + c * 2) / (r + c * 2 + 1);
        a = u + o * a;
        s = l + o * s;
        c += 1;
        o = c * (n - c) * e / (r + c * 2 - 1) / (r + c * 2);
        u = a + o * u;
        l = s + o * l;
        a /= l;
        s /= l;
        u /= l;
        l = 1;
      }
      return u / r;
    }
    function n(e) {
      return e / t.abs(e);
    }
    function i(r, n, i) {
      var o = 12;
      var a = 6;
      var s = -30;
      var u = -50;
      var l = 60;
      var c = 8;
      var p = 3;
      var d = 2;
      var f = 3;
      var g = [0.9815606342467192, 0.9041172563704749, 0.7699026741943047, 0.5873179542866175, 0.3678314989981802, 0.1252334085114689];
      var m = [0.04717533638651183, 0.10693932599531843, 0.16007832854334622, 0.20316742672306592, 0.2334925365383548, 0.24914704581340277];
      var v = r * 0.5;
      if (v >= c) {
        return 1;
      }
      var y;
      var h = e.normal.cdf(v, 0, 1, 1, 0) * 2 - 1;
      h = h >= t.exp(u / i) ? t.pow(h, i) : 0;
      y = r > p ? d : f;
      var b = v;
      var w = (c - v) / y;
      var x = b + w;
      var E = 0;
      var k = i - 1;
      for (var S = 1; S <= y; S++) {
        var T = 0;
        var C = (x + b) * 0.5;
        var A = (x - b) * 0.5;
        for (var _ = 1; _ <= o; _++) {
          var O;
          var M;
          if (a < _) {
            O = o - _ + 1;
            M = g[O - 1];
          } else {
            O = _;
            M = -g[O - 1];
          }
          var P = A * M;
          var q = C + P;
          var N = q * q;
          if (N > l) {
            break;
          }
          var R = e.normal.cdf(q, 0, 1, 1, 0) * 2;
          var I = e.normal.cdf(q, r, 1, 1, 0) * 2;
          var j = R * 0.5 - I * 0.5;
          if (j >= t.exp(s / k)) {
            j = m[O - 1] * t.exp(N * -0.5) * t.pow(j, k);
            T += j;
          }
        }
        T *= A * 2 * i / t.sqrt(t.PI * 2);
        E += T;
        b = x;
        x += w;
      }
      h += E;
      if (h <= t.exp(s / n)) {
        return 0;
      } else {
        h = t.pow(h, n);
        if (h >= 1) {
          return 1;
        } else {
          return h;
        }
      }
    }
    function o(e, r, n) {
      var i = 0.322232421088;
      var o = 0.099348462606;
      var a = -1;
      var s = 0.588581570495;
      var u = -0.342242088547;
      var l = 0.531103462366;
      var c = -0.204231210125;
      var p = 0.10353775285;
      var d = -0.0000453642210148;
      var f = 0.0038560700634;
      var g = 0.8832;
      var m = 0.2368;
      var v = 1.214;
      var y = 1.208;
      var h = 1.4142;
      var b = 120;
      var w = 0.5 - e * 0.5;
      var x = t.sqrt(t.log(1 / (w * w)));
      var E = x + ((((x * d + c) * x + u) * x + a) * x + i) / ((((x * f + p) * x + l) * x + s) * x + o);
      if (n < b) {
        E += (E * E * E + E) / n / 4;
      }
      var k = g - m * E;
      if (n < b) {
        k += -v / n + y * E / n;
      }
      return E * (k * t.log(r - 1) + h);
    }
    (function (t) {
      for (var r = 0; r < t.length; r++) {
        (function (t) {
          e[t] = function e(t, r, n) {
            if (this instanceof e) {
              this._a = t;
              this._b = r;
              this._c = n;
              return this;
            } else {
              return new e(t, r, n);
            }
          };
          e.fn[t] = function (r, n, i) {
            var o = e[t](r, n, i);
            o.data = this;
            return o;
          };
          e[t].prototype.sample = function (r) {
            var n = this._a;
            var i = this._b;
            var o = this._c;
            if (r) {
              return e.alter(r, function () {
                return e[t].sample(n, i, o);
              });
            } else {
              return e[t].sample(n, i, o);
            }
          };
          (function (r) {
            for (var n = 0; n < r.length; n++) {
              (function (r) {
                e[t].prototype[r] = function (n) {
                  var i = this._a;
                  var o = this._b;
                  var a = this._c;
                  if (!n && n !== 0) {
                    n = this.data;
                  }
                  if (typeof n !== "number") {
                    return e.fn.map.call(n, function (n) {
                      return e[t][r](n, i, o, a);
                    });
                  } else {
                    return e[t][r](n, i, o, a);
                  }
                };
              })(r[n]);
            }
          })("pdf cdf inv".split(" "));
          (function (r) {
            for (var n = 0; n < r.length; n++) {
              (function (r) {
                e[t].prototype[r] = function () {
                  return e[t][r](this._a, this._b, this._c);
                };
              })(r[n]);
            }
          })("mean median mode variance".split(" "));
        })(t[r]);
      }
    })("beta centralF cauchy chisquare exponential gamma invgamma kumaraswamy laplace lognormal noncentralt normal pareto studentt weibull uniform binomial negbin hypgeom poisson triangular tukey arcsine".split(" "));
    e.extend(e.beta, {
      pdf: function (r, n, i) {
        if (r > 1 || r < 0) {
          return 0;
        } else if (n == 1 && i == 1) {
          return 1;
        } else if (n < 512 && i < 512) {
          return t.pow(r, n - 1) * t.pow(1 - r, i - 1) / e.betafn(n, i);
        } else {
          return t.exp((n - 1) * t.log(r) + (i - 1) * t.log(1 - r) - e.betaln(n, i));
        }
      },
      cdf: function (t, r, n) {
        if (t > 1 || t < 0) {
          return (t > 1) * 1;
        } else {
          return e.ibeta(t, r, n);
        }
      },
      inv: function (t, r, n) {
        return e.ibetainv(t, r, n);
      },
      mean: function (e, t) {
        return e / (e + t);
      },
      median: function (t, r) {
        return e.ibetainv(0.5, t, r);
      },
      mode: function (e, t) {
        return (e - 1) / (e + t - 2);
      },
      sample: function (t, r) {
        var n = e.randg(t);
        return n / (n + e.randg(r));
      },
      variance: function (e, r) {
        return e * r / (t.pow(e + r, 2) * (e + r + 1));
      }
    });
    e.extend(e.centralF, {
      pdf: function (r, n, i) {
        var o;
        var a;
        var s;
        if (r < 0) {
          return 0;
        } else if (n <= 2) {
          if (r === 0 && n < 2) {
            return Infinity;
          } else if (r === 0 && n === 2) {
            return 1;
          } else {
            return 1 / e.betafn(n / 2, i / 2) * t.pow(n / i, n / 2) * t.pow(r, n / 2 - 1) * t.pow(1 + n / i * r, -(n + i) / 2);
          }
        } else {
          o = n * r / (i + r * n);
          a = i / (i + r * n);
          s = n * a / 2;
          return s * e.binomial.pdf((n - 2) / 2, (n + i - 2) / 2, o);
        }
      },
      cdf: function (t, r, n) {
        if (t < 0) {
          return 0;
        } else {
          return e.ibeta(r * t / (r * t + n), r / 2, n / 2);
        }
      },
      inv: function (t, r, n) {
        return n / (r * (1 / e.ibetainv(t, r / 2, n / 2) - 1));
      },
      mean: function (e, t) {
        if (t > 2) {
          return t / (t - 2);
        } else {
          return undefined;
        }
      },
      mode: function (e, t) {
        if (e > 2) {
          return t * (e - 2) / (e * (t + 2));
        } else {
          return undefined;
        }
      },
      sample: function (t, r) {
        var n = e.randg(t / 2) * 2;
        var i = e.randg(r / 2) * 2;
        return n / t / (i / r);
      },
      variance: function (e, t) {
        if (!(t <= 4)) {
          return t * 2 * t * (e + t - 2) / (e * (t - 2) * (t - 2) * (t - 4));
        }
      }
    });
    e.extend(e.cauchy, {
      pdf: function (e, r, n) {
        if (n < 0) {
          return 0;
        } else {
          return n / (t.pow(e - r, 2) + t.pow(n, 2)) / t.PI;
        }
      },
      cdf: function (e, r, n) {
        return t.atan((e - r) / n) / t.PI + 0.5;
      },
      inv: function (e, r, n) {
        return r + n * t.tan(t.PI * (e - 0.5));
      },
      median: function (e) {
        return e;
      },
      mode: function (e) {
        return e;
      },
      sample: function (r, n) {
        return e.randn() * t.sqrt(1 / (e.randg(0.5) * 2)) * n + r;
      }
    });
    e.extend(e.chisquare, {
      pdf: function (r, n) {
        if (r < 0) {
          return 0;
        } else if (r === 0 && n === 2) {
          return 0.5;
        } else {
          return t.exp((n / 2 - 1) * t.log(r) - r / 2 - n / 2 * t.log(2) - e.gammaln(n / 2));
        }
      },
      cdf: function (t, r) {
        if (t < 0) {
          return 0;
        } else {
          return e.lowRegGamma(r / 2, t / 2);
        }
      },
      inv: function (t, r) {
        return e.gammapinv(t, r * 0.5) * 2;
      },
      mean: function (e) {
        return e;
      },
      median: function (e) {
        return e * t.pow(1 - 2 / (e * 9), 3);
      },
      mode: function (e) {
        if (e - 2 > 0) {
          return e - 2;
        } else {
          return 0;
        }
      },
      sample: function (t) {
        return e.randg(t / 2) * 2;
      },
      variance: function (e) {
        return e * 2;
      }
    });
    e.extend(e.exponential, {
      pdf: function (e, r) {
        if (e < 0) {
          return 0;
        } else {
          return r * t.exp(-r * e);
        }
      },
      cdf: function (e, r) {
        if (e < 0) {
          return 0;
        } else {
          return 1 - t.exp(-r * e);
        }
      },
      inv: function (e, r) {
        return -t.log(1 - e) / r;
      },
      mean: function (e) {
        return 1 / e;
      },
      median: function (e) {
        return 1 / e * t.log(2);
      },
      mode: function () {
        return 0;
      },
      sample: function (r) {
        return -1 / r * t.log(e._random_fn());
      },
      variance: function (e) {
        return t.pow(e, -2);
      }
    });
    e.extend(e.gamma, {
      pdf: function (r, n, i) {
        if (r < 0) {
          return 0;
        } else if (r === 0 && n === 1) {
          return 1 / i;
        } else {
          return t.exp((n - 1) * t.log(r) - r / i - e.gammaln(n) - n * t.log(i));
        }
      },
      cdf: function (t, r, n) {
        if (t < 0) {
          return 0;
        } else {
          return e.lowRegGamma(r, t / n);
        }
      },
      inv: function (t, r, n) {
        return e.gammapinv(t, r) * n;
      },
      mean: function (e, t) {
        return e * t;
      },
      mode: function (e, t) {
        if (e > 1) {
          return (e - 1) * t;
        }
      },
      sample: function (t, r) {
        return e.randg(t) * r;
      },
      variance: function (e, t) {
        return e * t * t;
      }
    });
    e.extend(e.invgamma, {
      pdf: function (r, n, i) {
        if (r <= 0) {
          return 0;
        } else {
          return t.exp(-(n + 1) * t.log(r) - i / r - e.gammaln(n) + n * t.log(i));
        }
      },
      cdf: function (t, r, n) {
        if (t <= 0) {
          return 0;
        } else {
          return 1 - e.lowRegGamma(r, n / t);
        }
      },
      inv: function (t, r, n) {
        return n / e.gammapinv(1 - t, r);
      },
      mean: function (e, t) {
        if (e > 1) {
          return t / (e - 1);
        } else {
          return undefined;
        }
      },
      mode: function (e, t) {
        return t / (e + 1);
      },
      sample: function (t, r) {
        return r / e.randg(t);
      },
      variance: function (e, t) {
        if (!(e <= 2)) {
          return t * t / ((e - 1) * (e - 1) * (e - 2));
        }
      }
    });
    e.extend(e.kumaraswamy, {
      pdf: function (e, r, n) {
        if (e === 0 && r === 1) {
          return n;
        } else if (e === 1 && n === 1) {
          return r;
        } else {
          return t.exp(t.log(r) + t.log(n) + (r - 1) * t.log(e) + (n - 1) * t.log(1 - t.pow(e, r)));
        }
      },
      cdf: function (e, r, n) {
        if (e < 0) {
          return 0;
        } else if (e > 1) {
          return 1;
        } else {
          return 1 - t.pow(1 - t.pow(e, r), n);
        }
      },
      inv: function (e, r, n) {
        return t.pow(1 - t.pow(1 - e, 1 / n), 1 / r);
      },
      mean: function (t, r) {
        return r * e.gammafn(1 + 1 / t) * e.gammafn(r) / e.gammafn(1 + 1 / t + r);
      },
      median: function (e, r) {
        return t.pow(1 - t.pow(2, -1 / r), 1 / e);
      },
      mode: function (e, r) {
        if (e >= 1 && r >= 1 && e !== 1 && r !== 1) {
          return t.pow((e - 1) / (e * r - 1), 1 / e);
        }
      },
      variance: function () {
        throw new Error("variance not yet implemented");
      }
    });
    e.extend(e.lognormal, {
      pdf: function (e, r, n) {
        if (e <= 0) {
          return 0;
        } else {
          return t.exp(-t.log(e) - t.log(t.PI * 2) * 0.5 - t.log(n) - t.pow(t.log(e) - r, 2) / (n * 2 * n));
        }
      },
      cdf: function (r, n, i) {
        if (r < 0) {
          return 0;
        } else {
          return 0.5 + e.erf((t.log(r) - n) / t.sqrt(i * 2 * i)) * 0.5;
        }
      },
      inv: function (r, n, i) {
        return t.exp(i * -1.4142135623730951 * e.erfcinv(r * 2) + n);
      },
      mean: function (e, r) {
        return t.exp(e + r * r / 2);
      },
      median: function (e) {
        return t.exp(e);
      },
      mode: function (e, r) {
        return t.exp(e - r * r);
      },
      sample: function (r, n) {
        return t.exp(e.randn() * n + r);
      },
      variance: function (e, r) {
        return (t.exp(r * r) - 1) * t.exp(e * 2 + r * r);
      }
    });
    e.extend(e.noncentralt, {
      pdf: function (r, n, i) {
        var o = 1e-14;
        if (t.abs(i) < o) {
          return e.studentt.pdf(r, n);
        } else if (t.abs(r) < o) {
          return t.exp(e.gammaln((n + 1) / 2) - i * i / 2 - t.log(t.PI * n) * 0.5 - e.gammaln(n / 2));
        } else {
          return n / r * (e.noncentralt.cdf(r * t.sqrt(1 + 2 / n), n + 2, i) - e.noncentralt.cdf(r, n, i));
        }
      },
      cdf: function (r, n, i) {
        var o = 1e-14;
        var a = 200;
        if (t.abs(i) < o) {
          return e.studentt.cdf(r, n);
        }
        var s = false;
        if (r < 0) {
          s = true;
          i = -i;
        }
        var u = e.normal.cdf(-i, 0, 1);
        var l = o + 1;
        var c = l;
        var p = r * r / (r * r + n);
        var d = 0;
        var f = t.exp(-i * i / 2);
        var g = t.exp(-i * i / 2 - t.log(2) * 0.5 - e.gammaln(1.5)) * i;
        while (d < a || c > o || l > o) {
          c = l;
          if (d > 0) {
            f *= i * i / (d * 2);
            g *= i * i / ((d + 0.5) * 2);
          }
          l = f * e.beta.cdf(p, d + 0.5, n / 2) + g * e.beta.cdf(p, d + 1, n / 2);
          u += l * 0.5;
          d++;
        }
        if (s) {
          return 1 - u;
        } else {
          return u;
        }
      }
    });
    e.extend(e.normal, {
      pdf: function (e, r, n) {
        return t.exp(t.log(t.PI * 2) * -0.5 - t.log(n) - t.pow(e - r, 2) / (n * 2 * n));
      },
      cdf: function (r, n, i) {
        return (1 + e.erf((r - n) / t.sqrt(i * 2 * i))) * 0.5;
      },
      inv: function (t, r, n) {
        return n * -1.4142135623730951 * e.erfcinv(t * 2) + r;
      },
      mean: function (e) {
        return e;
      },
      median: function (e) {
        return e;
      },
      mode: function (e) {
        return e;
      },
      sample: function (t, r) {
        return e.randn() * r + t;
      },
      variance: function (e, t) {
        return t * t;
      }
    });
    e.extend(e.pareto, {
      pdf: function (e, r, n) {
        if (e < r) {
          return 0;
        } else {
          return n * t.pow(r, n) / t.pow(e, n + 1);
        }
      },
      cdf: function (e, r, n) {
        if (e < r) {
          return 0;
        } else {
          return 1 - t.pow(r / e, n);
        }
      },
      inv: function (e, r, n) {
        return r / t.pow(1 - e, 1 / n);
      },
      mean: function (e, r) {
        if (!(r <= 1)) {
          return r * t.pow(e, r) / (r - 1);
        }
      },
      median: function (e, r) {
        return e * (r * t.SQRT2);
      },
      mode: function (e) {
        return e;
      },
      variance: function (e, r) {
        if (!(r <= 2)) {
          return e * e * r / (t.pow(r - 1, 2) * (r - 2));
        }
      }
    });
    e.extend(e.studentt, {
      pdf: function (r, n) {
        n = n > 1e+100 ? 1e+100 : n;
        return 1 / (t.sqrt(n) * e.betafn(0.5, n / 2)) * t.pow(1 + r * r / n, -(n + 1) / 2);
      },
      cdf: function (r, n) {
        var i = n / 2;
        return e.ibeta((r + t.sqrt(r * r + n)) / (t.sqrt(r * r + n) * 2), i, i);
      },
      inv: function (r, n) {
        var i = e.ibetainv(t.min(r, 1 - r) * 2, n * 0.5, 0.5);
        i = t.sqrt(n * (1 - i) / i);
        if (r > 0.5) {
          return i;
        } else {
          return -i;
        }
      },
      mean: function (e) {
        if (e > 1) {
          return 0;
        } else {
          return undefined;
        }
      },
      median: function () {
        return 0;
      },
      mode: function () {
        return 0;
      },
      sample: function (r) {
        return e.randn() * t.sqrt(r / (e.randg(r / 2) * 2));
      },
      variance: function (e) {
        if (e > 2) {
          return e / (e - 2);
        } else if (e > 1) {
          return Infinity;
        } else {
          return undefined;
        }
      }
    });
    e.extend(e.weibull, {
      pdf: function (e, r, n) {
        if (e < 0 || r < 0 || n < 0) {
          return 0;
        } else {
          return n / r * t.pow(e / r, n - 1) * t.exp(-t.pow(e / r, n));
        }
      },
      cdf: function (e, r, n) {
        if (e < 0) {
          return 0;
        } else {
          return 1 - t.exp(-t.pow(e / r, n));
        }
      },
      inv: function (e, r, n) {
        return r * t.pow(-t.log(1 - e), 1 / n);
      },
      mean: function (t, r) {
        return t * e.gammafn(1 + 1 / r);
      },
      median: function (e, r) {
        return e * t.pow(t.log(2), 1 / r);
      },
      mode: function (e, r) {
        if (r <= 1) {
          return 0;
        } else {
          return e * t.pow((r - 1) / r, 1 / r);
        }
      },
      sample: function (r, n) {
        return r * t.pow(-t.log(e._random_fn()), 1 / n);
      },
      variance: function (r, n) {
        return r * r * e.gammafn(1 + 2 / n) - t.pow(e.weibull.mean(r, n), 2);
      }
    });
    e.extend(e.uniform, {
      pdf: function (e, t, r) {
        if (e < t || e > r) {
          return 0;
        } else {
          return 1 / (r - t);
        }
      },
      cdf: function (e, t, r) {
        if (e < t) {
          return 0;
        } else if (e < r) {
          return (e - t) / (r - t);
        } else {
          return 1;
        }
      },
      inv: function (e, t, r) {
        return t + e * (r - t);
      },
      mean: function (e, t) {
        return (e + t) * 0.5;
      },
      median: function (t, r) {
        return e.mean(t, r);
      },
      mode: function () {
        throw new Error("mode is not yet implemented");
      },
      sample: function (t, r) {
        return t / 2 + r / 2 + (r / 2 - t / 2) * (e._random_fn() * 2 - 1);
      },
      variance: function (e, r) {
        return t.pow(r - e, 2) / 12;
      }
    });
    e.extend(e.binomial, {
      pdf: function (r, n, i) {
        if (i === 0 || i === 1) {
          if (n * i === r) {
            return 1;
          } else {
            return 0;
          }
        } else {
          return e.combination(n, r) * t.pow(i, r) * t.pow(1 - i, n - r);
        }
      },
      cdf: function (n, i, o) {
        var a;
        var s = 1e-10;
        if (n < 0) {
          return 0;
        }
        if (n >= i) {
          return 1;
        }
        if (o < 0 || o > 1 || i <= 0) {
          return NaN;
        }
        n = t.floor(n);
        var u = o;
        var l = n + 1;
        var c = i - n;
        var p = l + c;
        var d = t.exp(e.gammaln(p) - e.gammaln(c) - e.gammaln(l) + l * t.log(u) + c * t.log(1 - u));
        a = u < (l + 1) / (p + 2) ? d * r(u, l, c, s) : 1 - d * r(1 - u, c, l, s);
        return t.round(1 / s * (1 - a)) / (1 / s);
      }
    });
    e.extend(e.negbin, {
      pdf: function (r, n, i) {
        return r === r >>> 0 && (r < 0 ? 0 : e.combination(r + n - 1, n - 1) * t.pow(1 - i, r) * t.pow(i, n));
      },
      cdf: function (t, r, n) {
        var i = 0;
        var o = 0;
        if (t < 0) {
          return 0;
        }
        for (; o <= t; o++) {
          i += e.negbin.pdf(o, r, n);
        }
        return i;
      }
    });
    e.extend(e.hypgeom, {
      pdf: function (r, n, i, o) {
        if (r !== r | 0) {
          return false;
        }
        if (r < 0 || r < i - (n - o)) {
          return 0;
        }
        if (r > o || r > i) {
          return 0;
        }
        if (i * 2 > n) {
          if (o * 2 > n) {
            return e.hypgeom.pdf(n - i - o + r, n, n - i, n - o);
          } else {
            return e.hypgeom.pdf(o - r, n, n - i, o);
          }
        }
        if (o * 2 > n) {
          return e.hypgeom.pdf(i - r, n, i, n - o);
        }
        if (i < o) {
          return e.hypgeom.pdf(r, n, o, i);
        }
        var a = 1;
        var s = 0;
        for (var u = 0; u < r; u++) {
          while (a > 1 && s < o) {
            a *= 1 - i / (n - s);
            s++;
          }
          a *= (o - u) * (i - u) / ((u + 1) * (n - i - o + u + 1));
        }
        for (; s < o; s++) {
          a *= 1 - i / (n - s);
        }
        return t.min(1, t.max(0, a));
      },
      cdf: function (r, n, i, o) {
        if (r < 0 || r < i - (n - o)) {
          return 0;
        }
        if (r >= o || r >= i) {
          return 1;
        }
        if (i * 2 > n) {
          if (o * 2 > n) {
            return e.hypgeom.cdf(n - i - o + r, n, n - i, n - o);
          } else {
            return 1 - e.hypgeom.cdf(o - r - 1, n, n - i, o);
          }
        }
        if (o * 2 > n) {
          return 1 - e.hypgeom.cdf(i - r - 1, n, i, n - o);
        }
        if (i < o) {
          return e.hypgeom.cdf(r, n, o, i);
        }
        var a = 1;
        var s = 1;
        var u = 0;
        for (var l = 0; l < r; l++) {
          while (a > 1 && u < o) {
            var c = 1 - i / (n - u);
            s *= c;
            a *= c;
            u++;
          }
          s *= (o - l) * (i - l) / ((l + 1) * (n - i - o + l + 1));
          a += s;
        }
        for (; u < o; u++) {
          a *= 1 - i / (n - u);
        }
        return t.min(1, t.max(0, a));
      }
    });
    e.extend(e.poisson, {
      pdf: function (r, n) {
        if (n < 0 || r % 1 !== 0 || r < 0) {
          return 0;
        } else {
          return t.pow(n, r) * t.exp(-n) / e.factorial(r);
        }
      },
      cdf: function (t, r) {
        var n = [];
        var i = 0;
        if (t < 0) {
          return 0;
        }
        for (; i <= t; i++) {
          n.push(e.poisson.pdf(i, r));
        }
        return e.sum(n);
      },
      mean: function (e) {
        return e;
      },
      variance: function (e) {
        return e;
      },
      sampleSmall: function (r) {
        var n = 1;
        var i = 0;
        var o = t.exp(-r);
        do {
          i++;
          n *= e._random_fn();
        } while (n > o);
        return i - 1;
      },
      sampleLarge: function (r) {
        var n;
        var i;
        var o;
        var a;
        var s;
        var u;
        var l;
        var c;
        var p;
        var d;
        var f = r;
        a = t.sqrt(f);
        s = t.log(f);
        l = 0.931 + a * 2.53;
        u = l * 0.02483 - 0.059;
        c = 1.1239 + 1.1328 / (l - 3.4);
        p = 0.9277 - 3.6224 / (l - 2);
        while (1) {
          i = t.random() - 0.5;
          o = t.random();
          d = 0.5 - t.abs(i);
          n = t.floor((u * 2 / d + l) * i + f + 0.43);
          if (d >= 0.07 && o <= p) {
            return n;
          }
          if (!(n < 0) && (!(d < 0.013) || !(o > d)) && t.log(o) + t.log(c) - t.log(u / (d * d) + l) <= n * s - f - e.loggam(n + 1)) {
            return n;
          }
        }
      },
      sample: function (e) {
        if (e < 10) {
          return this.sampleSmall(e);
        } else {
          return this.sampleLarge(e);
        }
      }
    });
    e.extend(e.triangular, {
      pdf: function (e, t, r, n) {
        if (r <= t || n < t || n > r) {
          return NaN;
        } else if (e < t || e > r) {
          return 0;
        } else if (e < n) {
          return (e - t) * 2 / ((r - t) * (n - t));
        } else if (e === n) {
          return 2 / (r - t);
        } else {
          return (r - e) * 2 / ((r - t) * (r - n));
        }
      },
      cdf: function (e, r, n, i) {
        if (n <= r || i < r || i > n) {
          return NaN;
        } else if (e <= r) {
          return 0;
        } else if (e >= n) {
          return 1;
        } else if (e <= i) {
          return t.pow(e - r, 2) / ((n - r) * (i - r));
        } else {
          return 1 - t.pow(n - e, 2) / ((n - r) * (n - i));
        }
      },
      inv: function (e, r, n, i) {
        if (n <= r || i < r || i > n) {
          return NaN;
        } else if (e <= (i - r) / (n - r)) {
          return r + (n - r) * t.sqrt(e * ((i - r) / (n - r)));
        } else {
          return r + (n - r) * (1 - t.sqrt((1 - e) * (1 - (i - r) / (n - r))));
        }
      },
      mean: function (e, t, r) {
        return (e + t + r) / 3;
      },
      median: function (e, r, n) {
        if (n <= (e + r) / 2) {
          return r - t.sqrt((r - e) * (r - n)) / t.sqrt(2);
        } else if (n > (e + r) / 2) {
          return e + t.sqrt((r - e) * (n - e)) / t.sqrt(2);
        } else {
          return undefined;
        }
      },
      mode: function (e, t, r) {
        return r;
      },
      sample: function (r, n, i) {
        var o = e._random_fn();
        if (o < (i - r) / (n - r)) {
          return r + t.sqrt(o * (n - r) * (i - r));
        } else {
          return n - t.sqrt((1 - o) * (n - r) * (n - i));
        }
      },
      variance: function (e, t, r) {
        return (e * e + t * t + r * r - e * t - e * r - t * r) / 18;
      }
    });
    e.extend(e.arcsine, {
      pdf: function (e, r, n) {
        if (n <= r) {
          return NaN;
        } else if (e <= r || e >= n) {
          return 0;
        } else {
          return 2 / t.PI * t.pow(t.pow(n - r, 2) - t.pow(e * 2 - r - n, 2), -0.5);
        }
      },
      cdf: function (e, r, n) {
        if (e < r) {
          return 0;
        } else if (e < n) {
          return 2 / t.PI * t.asin(t.sqrt((e - r) / (n - r)));
        } else {
          return 1;
        }
      },
      inv: function (e, r, n) {
        return r + (0.5 - t.cos(t.PI * e) * 0.5) * (n - r);
      },
      mean: function (e, t) {
        if (t <= e) {
          return NaN;
        } else {
          return (e + t) / 2;
        }
      },
      median: function (e, t) {
        if (t <= e) {
          return NaN;
        } else {
          return (e + t) / 2;
        }
      },
      mode: function () {
        throw new Error("mode is not yet implemented");
      },
      sample: function (r, n) {
        return (r + n) / 2 + (n - r) / 2 * t.sin(t.PI * 2 * e.uniform.sample(0, 1));
      },
      variance: function (e, r) {
        if (r <= e) {
          return NaN;
        } else {
          return t.pow(r - e, 2) / 8;
        }
      }
    });
    e.extend(e.laplace, {
      pdf: function (e, r, n) {
        if (n <= 0) {
          return 0;
        } else {
          return t.exp(-t.abs(e - r) / n) / (n * 2);
        }
      },
      cdf: function (e, r, n) {
        if (n <= 0) {
          return 0;
        } else if (e < r) {
          return t.exp((e - r) / n) * 0.5;
        } else {
          return 1 - t.exp(-(e - r) / n) * 0.5;
        }
      },
      mean: function (e) {
        return e;
      },
      median: function (e) {
        return e;
      },
      mode: function (e) {
        return e;
      },
      variance: function (e, t) {
        return t * 2 * t;
      },
      sample: function (r, i) {
        var o = e._random_fn() - 0.5;
        return r - i * n(o) * t.log(1 - t.abs(o) * 2);
      }
    });
    e.extend(e.tukey, {
      cdf: function (r, n, o) {
        var a = 1;
        var s = n;
        var u = 16;
        var l = 8;
        var c = -30;
        var p = 1e-14;
        var d = 100;
        var f = 800;
        var g = 5000;
        var m = 25000;
        var v = 1;
        var y = 0.5;
        var h = 0.25;
        var b = 0.125;
        var w = [0.9894009349916499, 0.9445750230732326, 0.8656312023878318, 0.755404408355003, 0.6178762444026438, 0.45801677765722737, 0.2816035507792589, 0.09501250983763744];
        var x = [0.027152459411754096, 0.062253523938647894, 0.09515851168249279, 0.12462897125553388, 0.14959598881657674, 0.16915651939500254, 0.18260341504492358, 0.1894506104550685];
        if (r <= 0) {
          return 0;
        }
        if (o < 2 || a < 1 || s < 2) {
          return NaN;
        }
        if (!Number.isFinite(r)) {
          return 1;
        }
        if (o > m) {
          return i(r, a, s);
        }
        var E;
        var k = o * 0.5;
        var S = k * t.log(o) - o * t.log(2) - e.gammaln(k);
        var T = k - 1;
        var C = o * 0.25;
        E = o <= d ? v : o <= f ? y : o <= g ? h : b;
        S += t.log(E);
        var A = 0;
        for (var _ = 1; _ <= 50; _++) {
          var O = 0;
          var M = (_ * 2 - 1) * E;
          for (var P = 1; P <= u; P++) {
            var q;
            var N;
            var R;
            if (l < P) {
              q = P - l - 1;
              N = S + T * t.log(M + w[q] * E) - (w[q] * E + M) * C;
            } else {
              q = P - 1;
              N = S + T * t.log(M - w[q] * E) + (w[q] * E - M) * C;
            }
            if (N >= c) {
              R = l < P ? r * t.sqrt((w[q] * E + M) * 0.5) : r * t.sqrt((-w[q] * E + M) * 0.5);
              var I = i(R, a, s);
              var j = I * x[q] * t.exp(N);
              O += j;
            }
          }
          if (_ * E >= 1 && O <= p) {
            break;
          }
          A += O;
        }
        if (O > p) {
          throw new Error("tukey.cdf failed to converge");
        }
        if (A > 1) {
          A = 1;
        }
        return A;
      },
      inv: function (r, n, i) {
        var a = 1;
        var s = n;
        var u = 0.0001;
        var l = 50;
        if (i < 2 || a < 1 || s < 2) {
          return NaN;
        }
        if (r < 0 || r > 1) {
          return NaN;
        }
        if (r === 0) {
          return 0;
        }
        if (r === 1) {
          return Infinity;
        }
        var c;
        var p = o(r, s, i);
        var d = e.tukey.cdf(p, n, i) - r;
        c = d > 0 ? t.max(0, p - 1) : p + 1;
        var f;
        var g = e.tukey.cdf(c, n, i) - r;
        for (var m = 1; m < l; m++) {
          f = c - g * (c - p) / (g - d);
          d = g;
          p = c;
          if (f < 0) {
            f = 0;
            g = -r;
          }
          g = e.tukey.cdf(f, n, i) - r;
          c = f;
          var v = t.abs(c - p);
          if (v < u) {
            return f;
          }
        }
        throw new Error("tukey.inv failed to converge");
      }
    });
  })(e, Math);
  (function (e, t) {
    var r = Array.prototype.push;
    var n = e.utils.isArray;
    function i(t) {
      return n(t) || t instanceof e;
    }
    e.extend({
      add: function (t, r) {
        if (i(r)) {
          if (!i(r[0])) {
            r = [r];
          }
          return e.map(t, function (e, t, n) {
            return e + r[t][n];
          });
        } else {
          return e.map(t, function (e) {
            return e + r;
          });
        }
      },
      subtract: function (t, r) {
        if (i(r)) {
          if (!i(r[0])) {
            r = [r];
          }
          return e.map(t, function (e, t, n) {
            return e - r[t][n] || 0;
          });
        } else {
          return e.map(t, function (e) {
            return e - r;
          });
        }
      },
      divide: function (t, r) {
        if (i(r)) {
          if (!i(r[0])) {
            r = [r];
          }
          return e.multiply(t, e.inv(r));
        } else {
          return e.map(t, function (e) {
            return e / r;
          });
        }
      },
      multiply: function (t, r) {
        var n;
        var o;
        var a;
        var s;
        var u;
        var l;
        var c;
        var p;
        if (t.length === undefined && r.length === undefined) {
          return t * r;
        }
        u = t.length;
        l = t[0].length;
        c = e.zeros(u, a = i(r) ? r[0].length : l);
        p = 0;
        if (i(r)) {
          for (; p < a; p++) {
            for (n = 0; n < u; n++) {
              s = 0;
              o = 0;
              for (; o < l; o++) {
                s += t[n][o] * r[o][p];
              }
              c[n][p] = s;
            }
          }
          if (u === 1 && p === 1) {
            return c[0][0];
          } else {
            return c;
          }
        }
        return e.map(t, function (e) {
          return e * r;
        });
      },
      outer: function (t, r) {
        return e.multiply(t.map(function (e) {
          return [e];
        }), [r]);
      },
      dot: function (t, r) {
        if (!i(t[0])) {
          t = [t];
        }
        if (!i(r[0])) {
          r = [r];
        }
        var n;
        var o;
        var a = t[0].length === 1 && t.length !== 1 ? e.transpose(t) : t;
        var s = r[0].length === 1 && r.length !== 1 ? e.transpose(r) : r;
        var u = [];
        for (var l = 0, c = a.length, p = a[0].length; l < c; l++) {
          u[l] = [];
          n = 0;
          o = 0;
          for (; o < p; o++) {
            n += a[l][o] * s[l][o];
          }
          u[l] = n;
        }
        if (u.length === 1) {
          return u[0];
        } else {
          return u;
        }
      },
      pow: function (r, n) {
        return e.map(r, function (e) {
          return t.pow(e, n);
        });
      },
      exp: function (r) {
        return e.map(r, function (e) {
          return t.exp(e);
        });
      },
      log: function (r) {
        return e.map(r, function (e) {
          return t.log(e);
        });
      },
      abs: function (r) {
        return e.map(r, function (e) {
          return t.abs(e);
        });
      },
      norm: function (e, r) {
        var n = 0;
        var o = 0;
        if (isNaN(r)) {
          r = 2;
        }
        if (i(e[0])) {
          e = e[0];
        }
        for (; o < e.length; o++) {
          n += t.pow(t.abs(e[o]), r);
        }
        return t.pow(n, 1 / r);
      },
      angle: function (r, n) {
        return t.acos(e.dot(r, n) / (e.norm(r) * e.norm(n)));
      },
      aug: function (e, t) {
        var n;
        var i = [];
        for (n = 0; n < e.length; n++) {
          i.push(e[n].slice());
        }
        for (n = 0; n < i.length; n++) {
          r.apply(i[n], t[n]);
        }
        return i;
      },
      inv: function (t) {
        var r;
        for (var n = t.length, i = t[0].length, o = e.identity(n, i), a = e.gauss_jordan(t, o), s = [], u = 0; u < n; u++) {
          s[u] = [];
          r = i;
          for (; r < a[0].length; r++) {
            s[u][r - i] = a[u][r];
          }
        }
        return s;
      },
      det: function e(t) {
        if (t.length === 2) {
          return t[0][0] * t[1][1] - t[0][1] * t[1][0];
        }
        var r = 0;
        for (var n = 0; n < t.length; n++) {
          var i = [];
          for (var o = 1; o < t.length; o++) {
            i[o - 1] = [];
            for (var a = 0; a < t.length; a++) {
              if (a < n) {
                i[o - 1][a] = t[o][a];
              } else if (a > n) {
                i[o - 1][a - 1] = t[o][a];
              }
            }
          }
          var s = n % 2 ? -1 : 1;
          r += e(i) * t[0][n] * s;
        }
        return r;
      },
      gauss_elimination: function (r, n) {
        var i;
        var o;
        var a;
        var s;
        var u = 0;
        var l = 0;
        var c = r.length;
        var p = r[0].length;
        var d = 1;
        var f = 0;
        var g = [];
        r = e.aug(r, n);
        i = r[0].length;
        u = 0;
        for (; u < c; u++) {
          o = r[u][u];
          l = u;
          s = u + 1;
          for (; s < p; s++) {
            if (o < t.abs(r[s][u])) {
              o = r[s][u];
              l = s;
            }
          }
          if (l != u) {
            for (s = 0; s < i; s++) {
              a = r[u][s];
              r[u][s] = r[l][s];
              r[l][s] = a;
            }
          }
          for (l = u + 1; l < c; l++) {
            d = r[l][u] / r[u][u];
            s = u;
            for (; s < i; s++) {
              r[l][s] = r[l][s] - d * r[u][s];
            }
          }
        }
        for (u = c - 1; u >= 0; u--) {
          f = 0;
          l = u + 1;
          for (; l <= c - 1; l++) {
            f += g[l] * r[u][l];
          }
          g[u] = (r[u][i - 1] - f) / r[u][u];
        }
        return g;
      },
      gauss_jordan: function (r, n) {
        var i;
        var o;
        var a;
        var s = e.aug(r, n);
        var u = s.length;
        var l = s[0].length;
        var c = 0;
        for (o = 0; o < u; o++) {
          var p = o;
          for (a = o + 1; a < u; a++) {
            if (t.abs(s[a][o]) > t.abs(s[p][o])) {
              p = a;
            }
          }
          var d = s[o];
          s[o] = s[p];
          s[p] = d;
          a = o + 1;
          for (; a < u; a++) {
            c = s[a][o] / s[o][o];
            i = o;
            for (; i < l; i++) {
              s[a][i] -= s[o][i] * c;
            }
          }
        }
        for (o = u - 1; o >= 0; o--) {
          c = s[o][o];
          a = 0;
          for (; a < o; a++) {
            for (i = l - 1; i > o - 1; i--) {
              s[a][i] -= s[o][i] * s[a][o] / c;
            }
          }
          s[o][o] /= c;
          i = u;
          for (; i < l; i++) {
            s[o][i] /= c;
          }
        }
        return s;
      },
      triaUpSolve: function (t, r) {
        var n;
        var i = t[0].length;
        var o = e.zeros(1, i)[0];
        var a = false;
        if (r[0].length != undefined) {
          r = r.map(function (e) {
            return e[0];
          });
          a = true;
        }
        e.arange(i - 1, -1, -1).forEach(function (a) {
          n = e.arange(a + 1, i).map(function (e) {
            return o[e] * t[a][e];
          });
          o[a] = (r[a] - e.sum(n)) / t[a][a];
        });
        if (a) {
          return o.map(function (e) {
            return [e];
          });
        } else {
          return o;
        }
      },
      triaLowSolve: function (t, r) {
        var n;
        var i = t[0].length;
        var o = e.zeros(1, i)[0];
        var a = false;
        if (r[0].length != undefined) {
          r = r.map(function (e) {
            return e[0];
          });
          a = true;
        }
        e.arange(i).forEach(function (i) {
          n = e.arange(i).map(function (e) {
            return t[i][e] * o[e];
          });
          o[i] = (r[i] - e.sum(n)) / t[i][i];
        });
        if (a) {
          return o.map(function (e) {
            return [e];
          });
        } else {
          return o;
        }
      },
      lu: function (t) {
        var r;
        var n = t.length;
        var i = e.identity(n);
        var o = e.zeros(t.length, t[0].length);
        e.arange(n).forEach(function (e) {
          o[0][e] = t[0][e];
        });
        e.arange(1, n).forEach(function (a) {
          e.arange(a).forEach(function (n) {
            r = e.arange(n).map(function (e) {
              return i[a][e] * o[e][n];
            });
            i[a][n] = (t[a][n] - e.sum(r)) / o[n][n];
          });
          e.arange(a, n).forEach(function (n) {
            r = e.arange(a).map(function (e) {
              return i[a][e] * o[e][n];
            });
            o[a][n] = t[r.length][n] - e.sum(r);
          });
        });
        return [i, o];
      },
      cholesky: function (r) {
        var n;
        var i = r.length;
        var o = e.zeros(r.length, r[0].length);
        e.arange(i).forEach(function (a) {
          n = e.arange(a).map(function (e) {
            return t.pow(o[a][e], 2);
          });
          o[a][a] = t.sqrt(r[a][a] - e.sum(n));
          e.arange(a + 1, i).forEach(function (t) {
            n = e.arange(a).map(function (e) {
              return o[a][e] * o[t][e];
            });
            o[t][a] = (r[a][t] - e.sum(n)) / o[a][a];
          });
        });
        return o;
      },
      gauss_jacobi: function (r, n, i, o) {
        var a;
        var s;
        var u;
        var l;
        for (var c = 0, p = 0, d = r.length, f = [], g = [], m = []; c < d; c++) {
          f[c] = [];
          g[c] = [];
          m[c] = [];
          p = 0;
          for (; p < d; p++) {
            if (c > p) {
              f[c][p] = r[c][p];
              g[c][p] = m[c][p] = 0;
            } else if (c < p) {
              g[c][p] = r[c][p];
              f[c][p] = m[c][p] = 0;
            } else {
              m[c][p] = r[c][p];
              f[c][p] = g[c][p] = 0;
            }
          }
        }
        u = e.multiply(e.multiply(e.inv(m), e.add(f, g)), -1);
        s = e.multiply(e.inv(m), n);
        a = i;
        l = e.add(e.multiply(u, i), s);
        c = 2;
        while (t.abs(e.norm(e.subtract(l, a))) > o) {
          a = l;
          l = e.add(e.multiply(u, a), s);
          c++;
        }
        return l;
      },
      gauss_seidel: function (r, n, i, o) {
        var a;
        var s;
        var u;
        var l;
        var c;
        for (var p = 0, d = r.length, f = [], g = [], m = []; p < d; p++) {
          f[p] = [];
          g[p] = [];
          m[p] = [];
          a = 0;
          for (; a < d; a++) {
            if (p > a) {
              f[p][a] = r[p][a];
              g[p][a] = m[p][a] = 0;
            } else if (p < a) {
              g[p][a] = r[p][a];
              f[p][a] = m[p][a] = 0;
            } else {
              m[p][a] = r[p][a];
              f[p][a] = g[p][a] = 0;
            }
          }
        }
        l = e.multiply(e.multiply(e.inv(e.add(m, f)), g), -1);
        u = e.multiply(e.inv(e.add(m, f)), n);
        s = i;
        c = e.add(e.multiply(l, i), u);
        p = 2;
        while (t.abs(e.norm(e.subtract(c, s))) > o) {
          s = c;
          c = e.add(e.multiply(l, s), u);
          p += 1;
        }
        return c;
      },
      SOR: function (r, n, i, o, a) {
        var s;
        var u;
        var l;
        var c;
        var p;
        for (var d = 0, f = r.length, g = [], m = [], v = []; d < f; d++) {
          g[d] = [];
          m[d] = [];
          v[d] = [];
          s = 0;
          for (; s < f; s++) {
            if (d > s) {
              g[d][s] = r[d][s];
              m[d][s] = v[d][s] = 0;
            } else if (d < s) {
              m[d][s] = r[d][s];
              g[d][s] = v[d][s] = 0;
            } else {
              v[d][s] = r[d][s];
              g[d][s] = m[d][s] = 0;
            }
          }
        }
        c = e.multiply(e.inv(e.add(v, e.multiply(g, a))), e.subtract(e.multiply(v, 1 - a), e.multiply(m, a)));
        l = e.multiply(e.multiply(e.inv(e.add(v, e.multiply(g, a))), n), a);
        u = i;
        p = e.add(e.multiply(c, i), l);
        d = 2;
        while (t.abs(e.norm(e.subtract(p, u))) > o) {
          u = p;
          p = e.add(e.multiply(c, u), l);
          d++;
        }
        return p;
      },
      householder: function (r) {
        var n;
        var i;
        var o;
        var a;
        var s;
        for (var u = r.length, l = r[0].length, c = 0, p = [], d = []; c < u - 1; c++) {
          n = 0;
          a = c + 1;
          for (; a < l; a++) {
            n += r[a][c] * r[a][c];
          }
          s = r[c + 1][c] > 0 ? -1 : 1;
          n = s * t.sqrt(n);
          i = t.sqrt((n * n - r[c + 1][c] * n) / 2);
          p = e.zeros(u, 1);
          p[c + 1][0] = (r[c + 1][c] - n) / (i * 2);
          o = c + 2;
          for (; o < u; o++) {
            p[o][0] = r[o][c] / (i * 2);
          }
          d = e.subtract(e.identity(u, l), e.multiply(e.multiply(p, e.transpose(p)), 2));
          r = e.multiply(d, e.multiply(r, d));
        }
        return r;
      },
      QR: function () {
        var r = e.sum;
        var n = e.arange;
        function i(i) {
          var o;
          var a;
          var s;
          var u = i.length;
          var l = i[0].length;
          var c = e.zeros(l, l);
          i = e.copy(i);
          a = 0;
          for (; a < l; a++) {
            c[a][a] = t.sqrt(r(n(u).map(function (e) {
              return i[e][a] * i[e][a];
            })));
            o = 0;
            for (; o < u; o++) {
              i[o][a] = i[o][a] / c[a][a];
            }
            for (s = a + 1; s < l; s++) {
              c[a][s] = r(n(u).map(function (e) {
                return i[e][a] * i[e][s];
              }));
              o = 0;
              for (; o < u; o++) {
                i[o][s] = i[o][s] - i[o][a] * c[a][s];
              }
            }
          }
          return [i, c];
        }
        return i;
      }(),
      lstsq: function () {
        function t(t) {
          t = e.copy(t);
          var r = t.length;
          var n = e.identity(r);
          e.arange(r - 1, -1, -1).forEach(function (r) {
            e.sliceAssign(n, {
              row: r
            }, e.divide(e.slice(n, {
              row: r
            }), t[r][r]));
            e.sliceAssign(t, {
              row: r
            }, e.divide(e.slice(t, {
              row: r
            }), t[r][r]));
            e.arange(r).forEach(function (i) {
              var o = e.multiply(t[i][r], -1);
              var a = e.slice(t, {
                row: i
              });
              var s = e.multiply(e.slice(t, {
                row: r
              }), o);
              e.sliceAssign(t, {
                row: i
              }, e.add(a, s));
              var u = e.slice(n, {
                row: i
              });
              var l = e.multiply(e.slice(n, {
                row: r
              }), o);
              e.sliceAssign(n, {
                row: i
              }, e.add(u, l));
            });
          });
          return n;
        }
        function r(r, n) {
          var i = false;
          if (n[0].length === undefined) {
            n = n.map(function (e) {
              return [e];
            });
            i = true;
          }
          var o = e.QR(r);
          var a = o[0];
          var s = o[1];
          var u = r[0].length;
          var l = e.slice(a, {
            col: {
              end: u
            }
          });
          var c = e.slice(s, {
            row: {
              end: u
            }
          });
          var p = t(c);
          var d = e.transpose(l);
          if (d[0].length === undefined) {
            d = [d];
          }
          var f = e.multiply(e.multiply(p, d), n);
          if (f.length === undefined) {
            f = [[f]];
          }
          if (i) {
            return f.map(function (e) {
              return e[0];
            });
          } else {
            return f;
          }
        }
        return r;
      }(),
      jacobi: function (r) {
        var n;
        var i;
        var o;
        var a;
        var s;
        var u;
        var l;
        var c;
        var p = 1;
        var d = r.length;
        var f = e.identity(d, d);
        var g = [];
        while (p === 1) {
          u = r[0][1];
          a = 0;
          s = 1;
          i = 0;
          for (; i < d; i++) {
            for (o = 0; o < d; o++) {
              if (i != o && u < t.abs(r[i][o])) {
                u = t.abs(r[i][o]);
                a = i;
                s = o;
              }
            }
          }
          l = r[a][a] === r[s][s] ? r[a][s] > 0 ? t.PI / 4 : -t.PI / 4 : t.atan(r[a][s] * 2 / (r[a][a] - r[s][s])) / 2;
          c = e.identity(d, d);
          c[a][a] = t.cos(l);
          c[a][s] = -t.sin(l);
          c[s][a] = t.sin(l);
          c[s][s] = t.cos(l);
          f = e.multiply(f, c);
          n = e.multiply(e.multiply(e.inv(c), r), c);
          r = n;
          p = 0;
          i = 1;
          for (; i < d; i++) {
            for (o = 1; o < d; o++) {
              if (i != o && t.abs(r[i][o]) > 0.001) {
                p = 1;
              }
            }
          }
        }
        for (i = 0; i < d; i++) {
          g.push(r[i][i]);
        }
        return [f, g];
      },
      rungekutta: function (e, t, r, n, i, o) {
        var a;
        var s;
        var u;
        var l;
        var c;
        if (o === 2) {
          while (n <= r) {
            a = t * e(n, i);
            s = t * e(n + t, i + a);
            u = i + (a + s) / 2;
            i = u;
            n += t;
          }
        }
        if (o === 4) {
          while (n <= r) {
            a = t * e(n, i);
            s = t * e(n + t / 2, i + a / 2);
            l = t * e(n + t / 2, i + s / 2);
            c = t * e(n + t, i + l);
            u = i + (a + s * 2 + l * 2 + c) / 6;
            i = u;
            n += t;
          }
        }
        return i;
      },
      romberg: function (e, r, n, i) {
        var o;
        var a;
        var s;
        var u;
        var l;
        var c = 0;
        var p = (n - r) / 2;
        var d = [];
        var f = [];
        var g = [];
        while (c < i / 2) {
          l = e(r);
          s = r;
          u = 0;
          for (; s <= n; s += p, u++) {
            d[u] = s;
          }
          o = d.length;
          s = 1;
          for (; s < o - 1; s++) {
            l += (s % 2 !== 0 ? 4 : 2) * e(d[s]);
          }
          l = p / 3 * (l + e(n));
          g[c] = l;
          p /= 2;
          c++;
        }
        a = g.length;
        o = 1;
        while (a !== 1) {
          for (s = 0; s < a - 1; s++) {
            f[s] = (t.pow(4, o) * g[s + 1] - g[s]) / (t.pow(4, o) - 1);
          }
          a = f.length;
          g = f;
          f = [];
          o++;
        }
        return g;
      },
      richardson: function (e, r, n, i) {
        function o(e, t) {
          var r;
          for (var n = 0, i = e.length; n < i; n++) {
            if (e[n] === t) {
              r = n;
            }
          }
          return r;
        }
        var a;
        var s;
        var u;
        var l;
        var c;
        var p = t.abs(n - e[o(e, n) + 1]);
        var d = 0;
        var f = [];
        var g = [];
        while (i >= p) {
          a = o(e, n + i);
          s = o(e, n);
          f[d] = (r[a] - r[s] * 2 + r[s * 2 - a]) / (i * i);
          i /= 2;
          d++;
        }
        l = f.length;
        u = 1;
        while (l != 1) {
          for (c = 0; c < l - 1; c++) {
            g[c] = (t.pow(4, u) * f[c + 1] - f[c]) / (t.pow(4, u) - 1);
          }
          l = g.length;
          f = g;
          g = [];
          u++;
        }
        return f;
      },
      simpson: function (e, t, r, n) {
        var i;
        for (var o = (r - t) / n, a = e(t), s = [], u = t, l = 0, c = 1; u <= r; u += o, l++) {
          s[l] = u;
        }
        for (i = s.length; c < i - 1; c++) {
          a += (c % 2 !== 0 ? 4 : 2) * e(s[c]);
        }
        return o / 3 * (a + e(r));
      },
      hermite: function (e, t, r, n) {
        var i;
        for (var o = e.length, a = 0, s = 0, u = [], l = [], c = [], p = []; s < o; s++) {
          u[s] = 1;
          i = 0;
          for (; i < o; i++) {
            if (s != i) {
              u[s] *= (n - e[i]) / (e[s] - e[i]);
            }
          }
          l[s] = 0;
          i = 0;
          for (; i < o; i++) {
            if (s != i) {
              l[s] += 1 / (e[s] - e[i]);
            }
          }
          c[s] = (1 - (n - e[s]) * 2 * l[s]) * (u[s] * u[s]);
          p[s] = (n - e[s]) * (u[s] * u[s]);
          a += c[s] * t[s] + p[s] * r[s];
        }
        return a;
      },
      lagrange: function (e, t, r) {
        var n;
        var i;
        var o = 0;
        for (var a = 0, s = e.length; a < s; a++) {
          i = t[a];
          n = 0;
          for (; n < s; n++) {
            if (a != n) {
              i *= (r - e[n]) / (e[a] - e[n]);
            }
          }
          o += i;
        }
        return o;
      },
      cubic_spline: function (t, r, n) {
        var i;
        for (var o = t.length, a = 0, s = [], u = [], l = [], c = [], p = [], d = [], f = []; a < o - 1; a++) {
          p[a] = t[a + 1] - t[a];
        }
        l[0] = 0;
        a = 1;
        for (; a < o - 1; a++) {
          l[a] = 3 / p[a] * (r[a + 1] - r[a]) - 3 / p[a - 1] * (r[a] - r[a - 1]);
        }
        for (a = 1; a < o - 1; a++) {
          s[a] = [];
          u[a] = [];
          s[a][a - 1] = p[a - 1];
          s[a][a] = (p[a - 1] + p[a]) * 2;
          s[a][a + 1] = p[a];
          u[a][0] = l[a];
        }
        c = e.multiply(e.inv(s), u);
        i = 0;
        for (; i < o - 1; i++) {
          d[i] = (r[i + 1] - r[i]) / p[i] - p[i] * (c[i + 1][0] + c[i][0] * 2) / 3;
          f[i] = (c[i + 1][0] - c[i][0]) / (p[i] * 3);
        }
        for (i = 0; i < o; i++) {
          if (t[i] > n) {
            break;
          }
        }
        i -= 1;
        return r[i] + (n - t[i]) * d[i] + e.sq(n - t[i]) * c[i] + (n - t[i]) * e.sq(n - t[i]) * f[i];
      },
      gauss_quadrature: function () {
        throw new Error("gauss_quadrature not yet implemented");
      },
      PCA: function (t) {
        var r;
        var n;
        var i = t.length;
        var o = t[0].length;
        var a = 0;
        var s = [];
        var u = [];
        var l = [];
        var c = [];
        var p = [];
        var d = [];
        var f = [];
        var g = [];
        var m = [];
        var v = [];
        for (a = 0; a < i; a++) {
          s[a] = e.sum(t[a]) / o;
        }
        for (a = 0; a < o; a++) {
          f[a] = [];
          r = 0;
          for (; r < i; r++) {
            f[a][r] = t[r][a] - s[r];
          }
        }
        f = e.transpose(f);
        a = 0;
        for (; a < i; a++) {
          g[a] = [];
          r = 0;
          for (; r < i; r++) {
            g[a][r] = e.dot([f[a]], [f[r]]) / (o - 1);
          }
        }
        l = e.jacobi(g);
        m = l[0];
        u = l[1];
        v = e.transpose(m);
        a = 0;
        for (; a < u.length; a++) {
          for (r = a; r < u.length; r++) {
            if (u[a] < u[r]) {
              n = u[a];
              u[a] = u[r];
              u[r] = n;
              c = v[a];
              v[a] = v[r];
              v[r] = c;
            }
          }
        }
        d = e.transpose(f);
        a = 0;
        for (; a < i; a++) {
          p[a] = [];
          r = 0;
          for (; r < d.length; r++) {
            p[a][r] = e.dot([v[a]], [d[r]]);
          }
        }
        return [t, u, v, p];
      }
    });
    (function (t) {
      for (var r = 0; r < t.length; r++) {
        (function (t) {
          e.fn[t] = function (r, n) {
            var i = this;
            if (n) {
              setTimeout(function () {
                n.call(i, e.fn[t].call(i, r));
              }, 15);
              return this;
            } else if (typeof e[t](this, r) === "number") {
              return e[t](this, r);
            } else {
              return e(e[t](this, r));
            }
          };
        })(t[r]);
      }
    })("add divide multiply subtract dot pow exp log abs norm angle".split(" "));
  })(e, Math);
  (function (e, t) {
    var r = [].slice;
    var n = e.utils.isNumber;
    var i = e.utils.isArray;
    function o(e, r, n, i) {
      if (e > 1 || n > 1 || e <= 0 || n <= 0) {
        throw new Error("Proportions should be greater than 0 and less than 1");
      }
      var o = (e * r + n * i) / (r + i);
      var a = t.sqrt(o * (1 - o) * (1 / r + 1 / i));
      return (e - n) / a;
    }
    e.extend({
      zscore: function () {
        var t = r.call(arguments);
        if (n(t[1])) {
          return (t[0] - t[1]) / t[2];
        } else {
          return (t[0] - e.mean(t[1])) / e.stdev(t[1], t[2]);
        }
      },
      ztest: function () {
        var n;
        var o = r.call(arguments);
        if (i(o[1])) {
          n = e.zscore(o[0], o[1], o[3]);
          if (o[2] === 1) {
            return e.normal.cdf(-t.abs(n), 0, 1);
          } else {
            return e.normal.cdf(-t.abs(n), 0, 1) * 2;
          }
        } else if (o.length > 2) {
          n = e.zscore(o[0], o[1], o[2]);
          if (o[3] === 1) {
            return e.normal.cdf(-t.abs(n), 0, 1);
          } else {
            return e.normal.cdf(-t.abs(n), 0, 1) * 2;
          }
        } else {
          n = o[0];
          if (o[1] === 1) {
            return e.normal.cdf(-t.abs(n), 0, 1);
          } else {
            return e.normal.cdf(-t.abs(n), 0, 1) * 2;
          }
        }
      }
    });
    e.extend(e.fn, {
      zscore: function (e, t) {
        return (e - this.mean()) / this.stdev(t);
      },
      ztest: function (r, n, i) {
        var o = t.abs(this.zscore(r, i));
        if (n === 1) {
          return e.normal.cdf(-o, 0, 1);
        } else {
          return e.normal.cdf(-o, 0, 1) * 2;
        }
      }
    });
    e.extend({
      tscore: function () {
        var n = r.call(arguments);
        if (n.length === 4) {
          return (n[0] - n[1]) / (n[2] / t.sqrt(n[3]));
        } else {
          return (n[0] - e.mean(n[1])) / (e.stdev(n[1], true) / t.sqrt(n[1].length));
        }
      },
      ttest: function () {
        var i;
        var o = r.call(arguments);
        if (o.length === 5) {
          i = t.abs(e.tscore(o[0], o[1], o[2], o[3]));
          if (o[4] === 1) {
            return e.studentt.cdf(-i, o[3] - 1);
          } else {
            return e.studentt.cdf(-i, o[3] - 1) * 2;
          }
        } else if (n(o[1])) {
          i = t.abs(o[0]);
          if (o[2] == 1) {
            return e.studentt.cdf(-i, o[1] - 1);
          } else {
            return e.studentt.cdf(-i, o[1] - 1) * 2;
          }
        } else {
          i = t.abs(e.tscore(o[0], o[1]));
          if (o[2] == 1) {
            return e.studentt.cdf(-i, o[1].length - 1);
          } else {
            return e.studentt.cdf(-i, o[1].length - 1) * 2;
          }
        }
      }
    });
    e.extend(e.fn, {
      tscore: function (e) {
        return (e - this.mean()) / (this.stdev(true) / t.sqrt(this.cols()));
      },
      ttest: function (r, n) {
        if (n === 1) {
          return 1 - e.studentt.cdf(t.abs(this.tscore(r)), this.cols() - 1);
        } else {
          return e.studentt.cdf(-t.abs(this.tscore(r)), this.cols() - 1) * 2;
        }
      }
    });
    e.extend({
      anovafscore: function () {
        var n;
        var i;
        var o;
        var a;
        var s;
        var u;
        var l;
        var c;
        var p = r.call(arguments);
        if (p.length === 1) {
          s = new Array(p[0].length);
          l = 0;
          for (; l < p[0].length; l++) {
            s[l] = p[0][l];
          }
          p = s;
        }
        i = new Array();
        l = 0;
        for (; l < p.length; l++) {
          i = i.concat(p[l]);
        }
        o = e.mean(i);
        n = 0;
        l = 0;
        for (; l < p.length; l++) {
          n += p[l].length * t.pow(e.mean(p[l]) - o, 2);
        }
        n /= p.length - 1;
        u = 0;
        l = 0;
        for (; l < p.length; l++) {
          a = e.mean(p[l]);
          c = 0;
          for (; c < p[l].length; c++) {
            u += t.pow(p[l][c] - a, 2);
          }
        }
        u /= i.length - p.length;
        return n / u;
      },
      anovaftest: function () {
        var t;
        var i;
        var o;
        var a;
        var s = r.call(arguments);
        if (n(s[0])) {
          return 1 - e.centralF.cdf(s[0], s[1], s[2]);
        }
        var u = e.anovafscore(s);
        t = s.length - 1;
        o = 0;
        a = 0;
        for (; a < s.length; a++) {
          o += s[a].length;
        }
        i = o - t - 1;
        return 1 - e.centralF.cdf(u, t, i);
      },
      ftest: function (t, r, n) {
        return 1 - e.centralF.cdf(t, r, n);
      }
    });
    e.extend(e.fn, {
      anovafscore: function () {
        return e.anovafscore(this.toArray());
      },
      anovaftes: function () {
        var t;
        var r = 0;
        for (t = 0; t < this.length; t++) {
          r += this[t].length;
        }
        return e.ftest(this.anovafscore(), this.length - 1, r - this.length);
      }
    });
    e.extend({
      qscore: function () {
        var i;
        var o;
        var a;
        var s;
        var u;
        var l = r.call(arguments);
        if (n(l[0])) {
          i = l[0];
          o = l[1];
          a = l[2];
          s = l[3];
          u = l[4];
        } else {
          i = e.mean(l[0]);
          o = e.mean(l[1]);
          a = l[0].length;
          s = l[1].length;
          u = l[2];
        }
        return t.abs(i - o) / (u * t.sqrt((1 / a + 1 / s) / 2));
      },
      qtest: function () {
        var t;
        var n = r.call(arguments);
        if (n.length === 3) {
          t = n[0];
          n = n.slice(1);
        } else if (n.length === 7) {
          t = e.qscore(n[0], n[1], n[2], n[3], n[4]);
          n = n.slice(5);
        } else {
          t = e.qscore(n[0], n[1], n[2]);
          n = n.slice(3);
        }
        var i = n[0];
        var o = n[1];
        return 1 - e.tukey.cdf(t, o, i - o);
      },
      tukeyhsd: function (t) {
        var r = e.pooledstdev(t);
        var n = t.map(function (t) {
          return e.mean(t);
        });
        var i = t.reduce(function (e, t) {
          return e + t.length;
        }, 0);
        var o = [];
        for (var a = 0; a < t.length; ++a) {
          for (var s = a + 1; s < t.length; ++s) {
            var u = e.qtest(n[a], n[s], t[a].length, t[s].length, r, i, t.length);
            o.push([[a, s], u]);
          }
        }
        return o;
      }
    });
    e.extend({
      normalci: function () {
        var n;
        var i = r.call(arguments);
        var o = new Array(2);
        n = i.length === 4 ? t.abs(e.normal.inv(i[1] / 2, 0, 1) * i[2] / t.sqrt(i[3])) : t.abs(e.normal.inv(i[1] / 2, 0, 1) * e.stdev(i[2]) / t.sqrt(i[2].length));
        o[0] = i[0] - n;
        o[1] = i[0] + n;
        return o;
      },
      tci: function () {
        var n;
        var i = r.call(arguments);
        var o = new Array(2);
        n = i.length === 4 ? t.abs(e.studentt.inv(i[1] / 2, i[3] - 1) * i[2] / t.sqrt(i[3])) : t.abs(e.studentt.inv(i[1] / 2, i[2].length - 1) * e.stdev(i[2], true) / t.sqrt(i[2].length));
        o[0] = i[0] - n;
        o[1] = i[0] + n;
        return o;
      },
      significant: function (e, t) {
        return e < t;
      }
    });
    e.extend(e.fn, {
      normalci: function (t, r) {
        return e.normalci(t, r, this.toArray());
      },
      tci: function (t, r) {
        return e.tci(t, r, this.toArray());
      }
    });
    e.extend(e.fn, {
      oneSidedDifferenceOfProportions: function (t, r, n, i) {
        var a = o(t, r, n, i);
        return e.ztest(a, 1);
      },
      twoSidedDifferenceOfProportions: function (t, r, n, i) {
        var a = o(t, r, n, i);
        return e.ztest(a, 2);
      }
    });
  })(e, Math);
  e.models = function () {
    function t(t) {
      var n = t[0].length;
      var i = e.arange(n).map(function (i) {
        var o = e.arange(n).filter(function (e) {
          return e !== i;
        });
        return r(e.col(t, i).map(function (e) {
          return e[0];
        }), e.col(t, o));
      });
      return i;
    }
    function r(t, r) {
      var n = t.length;
      var i = r[0].length - 1;
      var o = n - i - 1;
      var a = e.lstsq(r, t);
      var s = e.multiply(r, a.map(function (e) {
        return [e];
      })).map(function (e) {
        return e[0];
      });
      var u = e.subtract(t, s);
      var l = e.mean(t);
      var c = e.sum(s.map(function (e) {
        return Math.pow(e - l, 2);
      }));
      var p = e.sum(t.map(function (e, t) {
        return Math.pow(e - s[t], 2);
      }));
      var d = c + p;
      var f = c / d;
      return {
        exog: r,
        endog: t,
        nobs: n,
        df_model: i,
        df_resid: o,
        coef: a,
        predict: s,
        resid: u,
        ybar: l,
        SST: d,
        SSE: c,
        SSR: p,
        R2: f
      };
    }
    function n(r) {
      var n = t(r.exog);
      var i = Math.sqrt(r.SSR / r.df_resid);
      var o = n.map(function (e) {
        var t = e.SST;
        var r = e.R2;
        return i / Math.sqrt(t * (1 - r));
      });
      var a = r.coef.map(function (e, t) {
        return (e - 0) / o[t];
      });
      var s = a.map(function (t) {
        var n = e.studentt.cdf(t, r.df_resid);
        return (n > 0.5 ? 1 - n : n) * 2;
      });
      var u = e.studentt.inv(0.975, r.df_resid);
      var l = r.coef.map(function (e, t) {
        var r = u * o[t];
        return [e - r, e + r];
      });
      return {
        se: o,
        t: a,
        p: s,
        sigmaHat: i,
        interval95: l
      };
    }
    function i(t) {
      var r = t.R2 / t.df_model / ((1 - t.R2) / t.df_resid);
      function n(t, r, n) {
        return e.beta.cdf(t / (n / r + t), r / 2, n / 2);
      }
      var i = 1 - n(r, t.df_model, t.df_resid);
      return {
        F_statistic: r,
        pvalue: i
      };
    }
    function o(e, t) {
      var o = r(e, t);
      var a = n(o);
      var s = i(o);
      var u = 1 - (1 - o.R2) * ((o.nobs - 1) / o.df_resid);
      o.t = a;
      o.f = s;
      o.adjust_R2 = u;
      return o;
    }
    return {
      ols: o
    };
  }();
  e.extend({
    buildxmatrix: function () {
      var t = new Array(arguments.length);
      for (var r = 0; r < arguments.length; r++) {
        var n = [1];
        t[r] = n.concat(arguments[r]);
      }
      return e(t);
    },
    builddxmatrix: function () {
      var t = new Array(arguments[0].length);
      for (var r = 0; r < arguments[0].length; r++) {
        var n = [1];
        t[r] = n.concat(arguments[0][r]);
      }
      return e(t);
    },
    buildjxmatrix: function (t) {
      var r = new Array(t.length);
      for (var n = 0; n < t.length; n++) {
        r[n] = t[n];
      }
      return e.builddxmatrix(r);
    },
    buildymatrix: function (t) {
      return e(t).transpose();
    },
    buildjymatrix: function (e) {
      return e.transpose();
    },
    matrixmult: function (t, r) {
      var n;
      var i;
      var o;
      var a;
      var s;
      if (t.cols() == r.rows()) {
        if (r.rows() > 1) {
          a = [];
          n = 0;
          for (; n < t.rows(); n++) {
            a[n] = [];
            i = 0;
            for (; i < r.cols(); i++) {
              s = 0;
              o = 0;
              for (; o < t.cols(); o++) {
                s += t.toArray()[n][o] * r.toArray()[o][i];
              }
              a[n][i] = s;
            }
          }
          return e(a);
        }
        a = [];
        n = 0;
        for (; n < t.rows(); n++) {
          a[n] = [];
          i = 0;
          for (; i < r.cols(); i++) {
            s = 0;
            o = 0;
            for (; o < t.cols(); o++) {
              s += t.toArray()[n][o] * r.toArray()[i];
            }
            a[n][i] = s;
          }
        }
        return e(a);
      }
    },
    regress: function (t, r) {
      var n = e.xtranspxinv(t);
      var i = t.transpose();
      var o = e.matrixmult(e(n), i);
      return e.matrixmult(o, r);
    },
    regresst: function (t, r, n) {
      var i = e.regress(t, r);
      var o = {
        anova: {}
      };
      var a = e.jMatYBar(t, i);
      o.yBar = a;
      var s = r.mean();
      o.anova.residuals = e.residuals(r, a);
      o.anova.ssr = e.ssr(a, s);
      o.anova.msr = o.anova.ssr / (t[0].length - 1);
      o.anova.sse = e.sse(r, a);
      o.anova.mse = o.anova.sse / (r.length - (t[0].length - 1) - 1);
      o.anova.sst = e.sst(r, s);
      o.anova.mst = o.anova.sst / (r.length - 1);
      o.anova.r2 = 1 - o.anova.sse / o.anova.sst;
      if (o.anova.r2 < 0) {
        o.anova.r2 = 0;
      }
      o.anova.fratio = o.anova.msr / o.anova.mse;
      o.anova.pvalue = e.anovaftest(o.anova.fratio, t[0].length - 1, r.length - (t[0].length - 1) - 1);
      o.anova.rmse = Math.sqrt(o.anova.mse);
      o.anova.r2adj = 1 - o.anova.mse / o.anova.mst;
      if (o.anova.r2adj < 0) {
        o.anova.r2adj = 0;
      }
      o.stats = new Array(t[0].length);
      var u;
      var l;
      var c;
      var p = e.xtranspxinv(t);
      for (var d = 0; d < i.length; d++) {
        u = Math.sqrt(o.anova.mse * Math.abs(p[d][d]));
        l = Math.abs(i[d] / u);
        c = e.ttest(l, r.length - t[0].length - 1, n);
        o.stats[d] = [i[d], u, l, c];
      }
      o.regress = i;
      return o;
    },
    xtranspx: function (t) {
      return e.matrixmult(t.transpose(), t);
    },
    xtranspxinv: function (t) {
      var r = e.matrixmult(t.transpose(), t);
      var n = e.inv(r);
      return n;
    },
    jMatYBar: function (t, r) {
      var n = e.matrixmult(t, r);
      return new e(n);
    },
    residuals: function (t, r) {
      return e.matrixsubtract(t, r);
    },
    ssr: function (e, t) {
      var r = 0;
      for (var n = 0; n < e.length; n++) {
        r += Math.pow(e[n] - t, 2);
      }
      return r;
    },
    sse: function (e, t) {
      var r = 0;
      for (var n = 0; n < e.length; n++) {
        r += Math.pow(e[n] - t[n], 2);
      }
      return r;
    },
    sst: function (e, t) {
      var r = 0;
      for (var n = 0; n < e.length; n++) {
        r += Math.pow(e[n] - t, 2);
      }
      return r;
    },
    matrixsubtract: function (t, r) {
      var n = new Array(t.length);
      for (var i = 0; i < t.length; i++) {
        n[i] = new Array(t[i].length);
        for (var o = 0; o < t[i].length; o++) {
          n[i][o] = t[i][o] - r[i][o];
        }
      }
      return e(n);
    }
  });
  e.jStat = e;
  return e;
});
};
