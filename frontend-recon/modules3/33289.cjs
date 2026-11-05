// webpack module 33289 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  PickerPanel: function () {
    return Ot;
  },
  RangePicker: function () {
    return Gt;
  },
  default: function () {
    return Kt;
  }
});
var n = require("8951");
var i = require("45810");
var o = require("78212");
var a = require("19746");
var s = require("34256");
var u = require("21487");
var l = require("91613");
var c = require("23874");
var p = require("59496");
var d = require("38399");
var f = d;
var g = require("68044");
var m = require("47530");
var v = require("75728");
var y = require("27193");
var h = p.createContext({});
var b = h;
var w = {
  visibility: "hidden"
};
function x(e) {
  var t = e.prefixCls;
  var r = e.prevIcon;
  var n = r === undefined ? "‹" : r;
  var i = e.nextIcon;
  var o = i === undefined ? "›" : i;
  var a = e.superPrevIcon;
  var s = a === undefined ? "«" : a;
  var u = e.superNextIcon;
  var l = u === undefined ? "»" : u;
  var c = e.onSuperPrev;
  var d = e.onSuperNext;
  var f = e.onPrev;
  var g = e.onNext;
  var m = e.children;
  var v = p.useContext(b);
  var y = v.hideNextBtn;
  var h = v.hidePrevBtn;
  return p.createElement("div", {
    className: t
  }, c && p.createElement("button", {
    type: "button",
    onClick: c,
    tabIndex: -1,
    className: `${t}-super-prev-btn`,
    style: h ? w : {}
  }, s), f && p.createElement("button", {
    type: "button",
    onClick: f,
    tabIndex: -1,
    className: `${t}-prev-btn`,
    style: h ? w : {}
  }, n), p.createElement("div", {
    className: `${t}-view`
  }, m), g && p.createElement("button", {
    type: "button",
    onClick: g,
    tabIndex: -1,
    className: `${t}-next-btn`,
    style: y ? w : {}
  }, o), d && p.createElement("button", {
    type: "button",
    onClick: d,
    tabIndex: -1,
    className: `${t}-super-next-btn`,
    style: y ? w : {}
  }, l));
}
var E = x;
function k(e) {
  var t = e.prefixCls;
  var r = e.generateConfig;
  var n = e.viewDate;
  var i = e.onPrevDecades;
  var o = e.onNextDecades;
  var a = p.useContext(b);
  var u = a.hideHeader;
  if (u) {
    return null;
  }
  var l = `${t}-header`;
  var c = r.getYear(n);
  var d = Math.floor(c / ee) * ee;
  var f = d + ee - 1;
  return p.createElement(E, (0, s.Z)({}, e, {
    prefixCls: l,
    onSuperPrev: i,
    onSuperNext: o
  }), d, "-", f);
}
var S = k;
function T(e, t, r, n, i) {
  var o = e.setHour(t, r);
  o = e.setMinute(o, n);
  o = e.setSecond(o, i);
  return o;
}
function C(e, t, r) {
  if (!r) {
    return t;
  }
  var n = t;
  n = e.setHour(n, e.getHour(r));
  n = e.setMinute(n, e.getMinute(r));
  n = e.setSecond(n, e.getSecond(r));
  return n;
}
function A(e, t, r, n, i, o) {
  var a = Math.floor(e / n) * n;
  if (a < e) {
    return [a, 60 - i, 60 - o];
  }
  var s = Math.floor(t / i) * i;
  if (s < t) {
    return [a, s, 60 - o];
  }
  var u = Math.floor(r / o) * o;
  return [a, s, u];
}
function _(e, t) {
  var r = e.getYear(t);
  var n = e.getMonth(t) + 1;
  var i = e.getEndDate(e.getFixedDate(`${r}-${n}-01`));
  var o = e.getDate(i);
  var a = n < 10 ? `0${n}` : `${n}`;
  return `${r}-${a}-${o}`;
}
function O(e) {
  var t = e.prefixCls;
  var r = e.disabledDate;
  var n = e.onSelect;
  var i = e.picker;
  for (var o = e.rowNum, a = e.colNum, s = e.prefixColumn, c = e.rowClassName, d = e.baseDate, g = e.getCellClassName, m = e.getCellText, v = e.getCellNode, y = e.getCellDate, h = e.generateConfig, w = e.titleCell, x = e.headerCells, E = p.useContext(b), k = E.onDateMouseEnter, S = E.onDateMouseLeave, T = E.mode, C = `${t}-cell`, A = [], O = 0; O < o; O += 1) {
    var M = [];
    var P = undefined;
    var q = function () {
      var e;
      var t = O * a + N;
      var o = y(d, t);
      var c = be({
        cellDate: o,
        mode: T,
        disabledDate: r,
        generateConfig: h
      });
      if (N === 0) {
        P = o;
        if (s) {
          M.push(s(P));
        }
      }
      var b = w && w(o);
      M.push(p.createElement("td", {
        key: N,
        title: b,
        className: f(C, (0, l.Z)((e = {}, (0, u.Z)(e, `${C}-disabled`, c), (0, u.Z)(e, `${C}-start`, m(o) === 1 || i === "year" && Number(b) % 10 === 0), (0, u.Z)(e, `${C}-end`, b === _(h, o) || i === "year" && Number(b) % 10 === 9), e), g(o))),
        onClick: function () {
          if (!c) {
            n(o);
          }
        },
        onMouseEnter: function () {
          if (!c && k) {
            k(o);
          }
        },
        onMouseLeave: function () {
          if (!c && S) {
            S(o);
          }
        }
      }, v ? v(o) : p.createElement("div", {
        className: `${C}-inner`
      }, m(o))));
    };
    for (var N = 0; N < a; N += 1) {
      q();
    }
    A.push(p.createElement("tr", {
      key: O,
      className: c && c(P)
    }, M));
  }
  return p.createElement("div", {
    className: `${t}-body`
  }, p.createElement("table", {
    className: `${t}-content`
  }, x && p.createElement("thead", null, p.createElement("tr", null, x)), p.createElement("tbody", null, A)));
}
var M = 3;
var P = 4;
function q(e) {
  var t = X - 1;
  var r = e.prefixCls;
  var n = e.viewDate;
  var i = e.generateConfig;
  var o = `${r}-cell`;
  var a = i.getYear(n);
  var l = Math.floor(a / X) * X;
  var c = Math.floor(a / ee) * ee;
  var d = c + ee - 1;
  var f = i.setYear(n, c - Math.ceil((M * P * X - ee) / 2));
  function g(e) {
    var r;
    var n = i.getYear(e);
    var a = n + t;
    r = {};
    (0, u.Z)(r, `${o}-in-view`, c <= n && a <= d);
    (0, u.Z)(r, `${o}-selected`, n === l);
    return r;
  }
  return p.createElement(O, (0, s.Z)({}, e, {
    rowNum: P,
    colNum: M,
    baseDate: f,
    getCellText: function (e) {
      var r = i.getYear(e);
      return `${r}-${r + t}`;
    },
    getCellClassName: g,
    getCellDate: function (e, t) {
      return i.addYear(e, t * X);
    }
  }));
}
var N = q;
var R = require("66439");
var I = require("45406");
var j = require("19078");
var D = new Map();
function L(e, t) {
  var r;
  function n() {
    if ((0, j.Z)(e)) {
      t();
    } else {
      r = (0, I.Z)(function () {
        n();
      });
    }
  }
  n();
  return function () {
    I.Z.cancel(r);
  };
}
function F(e, t, r) {
  if (D.get(e)) {
    cancelAnimationFrame(D.get(e));
  }
  if (r <= 0) {
    D.set(e, requestAnimationFrame(function () {
      e.scrollTop = t;
    }));
  } else {
    var n = t - e.scrollTop;
    var i = n / r * 10;
    D.set(e, requestAnimationFrame(function () {
      e.scrollTop += i;
      if (e.scrollTop !== t) {
        F(e, t, r - 10);
      }
    }));
  }
}
function Z(e, t) {
  var r = t.onLeftRight;
  var n = t.onCtrlLeftRight;
  var i = t.onUpDown;
  var o = t.onPageUpDown;
  var a = t.onEnter;
  var s = e.which;
  var u = e.ctrlKey;
  var l = e.metaKey;
  switch (s) {
    case y.Z.LEFT:
      if (u || l) {
        if (n) {
          n(-1);
          return true;
        }
      } else if (r) {
        r(-1);
        return true;
      }
      break;
    case y.Z.RIGHT:
      if (u || l) {
        if (n) {
          n(1);
          return true;
        }
      } else if (r) {
        r(1);
        return true;
      }
      break;
    case y.Z.UP:
      if (i) {
        i(-1);
        return true;
      }
      break;
    case y.Z.DOWN:
      if (i) {
        i(1);
        return true;
      }
      break;
    case y.Z.PAGE_UP:
      if (o) {
        o(-1);
        return true;
      }
      break;
    case y.Z.PAGE_DOWN:
      if (o) {
        o(1);
        return true;
      }
      break;
    case y.Z.ENTER:
      if (a) {
        a();
        return true;
      }
      break;
  }
  return false;
}
function z(e, t, r, n) {
  var i = e;
  if (!i) {
    switch (t) {
      case "time":
        i = n ? "hh:mm:ss a" : "HH:mm:ss";
        break;
      case "week":
        i = "gggg-wo";
        break;
      case "month":
        i = "YYYY-MM";
        break;
      case "quarter":
        i = "YYYY-[Q]Q";
        break;
      case "year":
        i = "YYYY";
        break;
      default:
        i = r ? "YYYY-MM-DD HH:mm:ss" : "YYYY-MM-DD";
    }
  }
  return i;
}
function U(e, t, r) {
  var n = e === "time" ? 8 : 10;
  var i = typeof t === "function" ? t(r.getNow()).length : t.length;
  return Math.max(n, i) + 2;
}
var B = null;
var V = new Set();
function H(e) {
  if (!B && typeof window !== "undefined" && window.addEventListener) {
    B = function (e) {
      (0, R.Z)(V).forEach(function (t) {
        t(e);
      });
    };
    window.addEventListener("mousedown", B);
  }
  V.add(e);
  return function () {
    V.delete(e);
    if (V.size === 0) {
      window.removeEventListener("mousedown", B);
      B = null;
    }
  };
}
function W(e) {
  var t;
  var r = e.target;
  return e.composed && r.shadowRoot && ((t = e.composedPath) === null || t === undefined ? undefined : t.call(e)[0]) || r;
}
function Y(e) {
  if (e === "month" || e === "date") {
    return "year";
  } else {
    return e;
  }
}
function Q(e) {
  if (e === "date") {
    return "month";
  } else {
    return e;
  }
}
function $(e) {
  if (e === "month" || e === "date") {
    return "quarter";
  } else {
    return e;
  }
}
function G(e) {
  if (e === "date") {
    return "week";
  } else {
    return e;
  }
}
var K = {
  year: Y,
  month: Q,
  quarter: $,
  week: G,
  time: null,
  date: null
};
function J(e, t) {
  return e.some(function (e) {
    return e && e.contains(t);
  });
}
var X = 10;
var ee = X * 10;
function te(e) {
  var t = e.prefixCls;
  var r = e.onViewDateChange;
  var n = e.generateConfig;
  var i = e.viewDate;
  var o = e.operationRef;
  var a = e.onSelect;
  var u = e.onPanelChange;
  var l = `${t}-decade-panel`;
  o.current = {
    onKeyDown: function (e) {
      return Z(e, {
        onLeftRight: function (e) {
          a(n.addYear(i, e * X), "key");
        },
        onCtrlLeftRight: function (e) {
          a(n.addYear(i, e * ee), "key");
        },
        onUpDown: function (e) {
          a(n.addYear(i, e * X * M), "key");
        },
        onEnter: function () {
          u("year", i);
        }
      });
    }
  };
  function c(e) {
    var t = n.addYear(i, e * ee);
    r(t);
    u(null, t);
  }
  function d(e) {
    a(e, "mouse");
    u("year", e);
  }
  return p.createElement("div", {
    className: l
  }, p.createElement(S, (0, s.Z)({}, e, {
    prefixCls: t,
    onPrevDecades: function () {
      c(-1);
    },
    onNextDecades: function () {
      c(1);
    }
  })), p.createElement(N, (0, s.Z)({}, e, {
    prefixCls: t,
    onSelect: d
  })));
}
var re = te;
var ne = 7;
function ie(e, t) {
  return !e && !t || !!e && !!t && undefined;
}
function oe(e, t, r) {
  var n = ie(t, r);
  if (typeof n === "boolean") {
    return n;
  }
  var i = Math.floor(e.getYear(t) / 10);
  var o = Math.floor(e.getYear(r) / 10);
  return i === o;
}
function ae(e, t, r) {
  var n = ie(t, r);
  if (typeof n === "boolean") {
    return n;
  } else {
    return e.getYear(t) === e.getYear(r);
  }
}
function se(e, t) {
  var r = Math.floor(e.getMonth(t) / 3);
  return r + 1;
}
function ue(e, t, r) {
  var n = ie(t, r);
  if (typeof n === "boolean") {
    return n;
  } else {
    return ae(e, t, r) && se(e, t) === se(e, r);
  }
}
function le(e, t, r) {
  var n = ie(t, r);
  if (typeof n === "boolean") {
    return n;
  } else {
    return ae(e, t, r) && e.getMonth(t) === e.getMonth(r);
  }
}
function ce(e, t, r) {
  var n = ie(t, r);
  if (typeof n === "boolean") {
    return n;
  } else {
    return e.getYear(t) === e.getYear(r) && e.getMonth(t) === e.getMonth(r) && e.getDate(t) === e.getDate(r);
  }
}
function pe(e, t, r) {
  var n = ie(t, r);
  if (typeof n === "boolean") {
    return n;
  } else {
    return e.getHour(t) === e.getHour(r) && e.getMinute(t) === e.getMinute(r) && e.getSecond(t) === e.getSecond(r);
  }
}
function de(e, t, r, n) {
  var i = ie(r, n);
  if (typeof i === "boolean") {
    return i;
  } else {
    return ae(e, r, n) && e.locale.getWeek(t, r) === e.locale.getWeek(t, n);
  }
}
function fe(e, t, r) {
  return ce(e, t, r) && pe(e, t, r);
}
function ge(e, t, r, n) {
  return !!t && !!r && !!n && !ce(e, t, n) && !ce(e, r, n) && e.isAfter(n, t) && e.isAfter(r, n);
}
function me(e, t, r) {
  var n = t.locale.getWeekFirstDay(e);
  var i = t.setDate(r, 1);
  var o = t.getWeekDay(i);
  var a = t.addDate(i, n - o);
  if (t.getMonth(a) === t.getMonth(r) && t.getDate(a) > 1) {
    a = t.addDate(a, -7);
  }
  return a;
}
function ve(e, t, r, n = 1) {
  switch (t) {
    case "year":
      return r.addYear(e, n * 10);
    case "quarter":
    case "month":
      return r.addYear(e, n);
    default:
      return r.addMonth(e, n);
  }
}
function ye(e, t) {
  var r = t.generateConfig;
  var n = t.locale;
  var i = t.format;
  if (typeof i === "function") {
    return i(e);
  } else {
    return r.locale.format(n.locale, e, i);
  }
}
function he(e, t) {
  var r = t.generateConfig;
  var n = t.locale;
  var i = t.formatList;
  if (e && typeof i[0] !== "function") {
    return r.locale.parse(n.locale, e, i);
  } else {
    return null;
  }
}
function be(e) {
  var t = e.cellDate;
  var r = e.mode;
  var n = e.disabledDate;
  var i = e.generateConfig;
  if (!n) {
    return false;
  }
  function o(e, r, o) {
    var a = r;
    while (a <= o) {
      var s = undefined;
      switch (e) {
        case "date":
          s = i.setDate(t, a);
          if (!n(s)) {
            return false;
          }
          break;
        case "month":
          s = i.setMonth(t, a);
          if (!be({
            cellDate: s,
            mode: "month",
            generateConfig: i,
            disabledDate: n
          })) {
            return false;
          }
          break;
        case "year":
          s = i.setYear(t, a);
          if (!be({
            cellDate: s,
            mode: "year",
            generateConfig: i,
            disabledDate: n
          })) {
            return false;
          }
          break;
      }
      a += 1;
    }
    return true;
  }
  switch (r) {
    case "date":
    case "week":
      return n(t);
    case "month":
      var a = 1;
      var s = i.getDate(i.getEndDate(t));
      return o("date", a, s);
    case "quarter":
      var u = Math.floor(i.getMonth(t) / 3) * 3;
      var l = u + 2;
      return o("month", u, l);
    case "year":
      return o("month", 0, 11);
    case "decade":
      var c = i.getYear(t);
      var p = Math.floor(c / X) * X;
      var d = p + X - 1;
      return o("year", p, d);
  }
}
function we(e) {
  var t = p.useContext(b);
  var r = t.hideHeader;
  if (r) {
    return null;
  }
  var n = e.prefixCls;
  var i = e.generateConfig;
  var o = e.locale;
  var a = e.value;
  var s = e.format;
  var u = `${n}-header`;
  return p.createElement(E, {
    prefixCls: u
  }, a ? ye(a, {
    locale: o,
    format: s,
    generateConfig: i
  }) : "\xA0");
}
var xe = we;
var Ee = require("64057");
function ke(e) {
  var t = e.value;
  var r = e.generateConfig;
  var n = e.disabledMinutes;
  var i = e.disabledSeconds;
  var o = e.minutes;
  var a = e.seconds;
  var s = e.use12Hours;
  function u(e, u, l, c) {
    var p = t || r.getNow();
    var d = Math.max(0, u);
    var f = Math.max(0, l);
    var g = Math.max(0, c);
    var m = n && n(d);
    if (m === null || m === undefined ? undefined : m.includes(f)) {
      var v = o.find(function (e) {
        return !m.includes(e.value);
      });
      if (!v) {
        return null;
      }
      f = v.value;
    }
    var y = i && i(d, f);
    if (y === null || y === undefined ? undefined : y.includes(g)) {
      var h = a.find(function (e) {
        return !y.includes(e.value);
      });
      if (!h) {
        return null;
      }
      g = h.value;
    }
    p = T(r, p, s && e ? d + 12 : d, f, g);
    return p;
  }
  return u;
}
function Se(e, t, r = "0") {
  var n = String(e);
  while (n.length < t) {
    n = `${r}${e}`;
  }
  return n;
}
function Te() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
    t[r] = arguments[r];
  }
  return t;
}
function Ce(e) {
  if (e === null || e === undefined) {
    return [];
  } else if (Array.isArray(e)) {
    return e;
  } else {
    return [e];
  }
}
function Ae(e) {
  var t = {};
  Object.keys(e).forEach(function (r) {
    if ((r.substr(0, 5) === "data-" || r.substr(0, 5) === "aria-" || r === "role" || r === "name") && r.substr(0, 7) !== "data-__") {
      t[r] = e[r];
    }
  });
  return t;
}
function _e(e, t) {
  if (e) {
    return e[t];
  } else {
    return null;
  }
}
function Oe(e, t, r) {
  var n = [_e(e, 0), _e(e, 1)];
  n[r] = typeof t === "function" ? t(n[r]) : t;
  if (n[0] || n[1]) {
    return n;
  } else {
    return null;
  }
}
function Me(e) {
  var t = e.prefixCls;
  var r = e.units;
  var n = e.onSelect;
  var i = e.value;
  var o = e.active;
  var a = e.hideDisabledOptions;
  var s = `${t}-cell`;
  var l = p.useContext(b);
  var c = l.open;
  var d = (0, p.useRef)(null);
  var g = (0, p.useRef)(new Map());
  var m = (0, p.useRef)();
  (0, p.useLayoutEffect)(function () {
    var e = g.current.get(i);
    if (e && c !== false) {
      F(d.current, e.offsetTop, 120);
    }
  }, [i]);
  (0, p.useLayoutEffect)(function () {
    if (c) {
      var e = g.current.get(i);
      if (e) {
        m.current = L(e, function () {
          F(d.current, e.offsetTop, 0);
        });
      }
    }
    return function () {
      var e;
      if ((e = m.current) !== null && e !== undefined) {
        e.call(m);
      }
    };
  }, [c]);
  return p.createElement("ul", {
    className: f(`${t}-column`, (0, u.Z)({}, `${t}-column-active`, o)),
    ref: d,
    style: {
      position: "relative"
    }
  }, r.map(function (e) {
    var t;
    if (a && e.disabled) {
      return null;
    } else {
      return p.createElement("li", {
        key: e.value,
        ref: function (t) {
          g.current.set(e.value, t);
        },
        className: f(s, (t = {}, (0, u.Z)(t, `${s}-disabled`, e.disabled), (0, u.Z)(t, `${s}-selected`, i === e.value), t)),
        onClick: function () {
          if (!e.disabled) {
            n(e.value);
          }
        }
      }, p.createElement("div", {
        className: `${s}-inner`
      }, e.label));
    }
  }));
}
var Pe = Me;
function qe(e, t) {
  if (e.length !== t.length) {
    return true;
  }
  for (var r = 0; r < e.length; r += 1) {
    if (e[r].disabled !== t[r].disabled) {
      return true;
    }
  }
  return false;
}
function Ne(e, t, r, n) {
  var i = [];
  for (var o = r >= 1 ? r | 0 : 1, a = e; a <= t; a += o) {
    i.push({
      label: Se(a, 2),
      value: a,
      disabled: (n || []).includes(a)
    });
  }
  return i;
}
function Re(e) {
  var t;
  var r = e.generateConfig;
  var n = e.prefixCls;
  var i = e.operationRef;
  var o = e.activeColumnIndex;
  var a = e.value;
  var s = e.showHour;
  var u = e.showMinute;
  var d = e.showSecond;
  var f = e.use12Hours;
  var g = e.hourStep;
  var m = g === undefined ? 1 : g;
  var v = e.minuteStep;
  var y = v === undefined ? 1 : v;
  var h = e.secondStep;
  var b = h === undefined ? 1 : h;
  var w = e.disabledHours;
  var x = e.disabledMinutes;
  var E = e.disabledSeconds;
  var k = e.disabledTime;
  var S = e.hideDisabledOptions;
  var T = e.onSelect;
  var C = [];
  var A = `${n}-content`;
  var _ = `${n}-time-panel`;
  var O = a ? r.getHour(a) : -1;
  var M = O;
  var P = a ? r.getMinute(a) : -1;
  var q = a ? r.getSecond(a) : -1;
  var N = r.getNow();
  var R = p.useMemo(function () {
    if (k) {
      var e = k(N);
      return [e.disabledHours, e.disabledMinutes, e.disabledSeconds];
    }
    return [w, x, E];
  }, [w, x, E, k, N]);
  var I = (0, c.Z)(R, 3);
  var j = I[0];
  var D = I[1];
  var L = I[2];
  var F = Ne(0, 23, m, j && j());
  var Z = (0, Ee.Z)(function () {
    return F;
  }, F, qe);
  if (f) {
    t = M >= 12;
    M %= 12;
  }
  var z = p.useMemo(function () {
    if (!f) {
      return [false, false];
    }
    var e = [true, true];
    Z.forEach(function (t) {
      var r = t.disabled;
      var n = t.value;
      if (!r) {
        if (n >= 12) {
          e[1] = false;
        } else {
          e[0] = false;
        }
      }
    });
    return e;
  }, [f, Z]);
  var U = (0, c.Z)(z, 2);
  var B = U[0];
  var V = U[1];
  var H = p.useMemo(function () {
    if (f) {
      return Z.filter(t ? function (e) {
        return e.value >= 12;
      } : function (e) {
        return e.value < 12;
      }).map(function (e) {
        var t = e.value % 12;
        var r = t === 0 ? "12" : Se(t, 2);
        return (0, l.Z)((0, l.Z)({}, e), {}, {
          label: r,
          value: t
        });
      });
    } else {
      return Z;
    }
  }, [f, t, Z]);
  var W = Ne(0, 59, y, D && D(O));
  var Y = Ne(0, 59, b, L && L(O, P));
  var Q = ke({
    value: a,
    generateConfig: r,
    disabledMinutes: D,
    disabledSeconds: L,
    minutes: W,
    seconds: Y,
    use12Hours: f
  });
  function $(e, t, r, n, i) {
    if (e !== false) {
      C.push({
        node: p.cloneElement(t, {
          prefixCls: _,
          value: r,
          active: o === C.length,
          onSelect: i,
          units: n,
          hideDisabledOptions: S
        }),
        onSelect: i,
        value: r,
        units: n
      });
    }
  }
  i.current = {
    onUpDown: function (e) {
      var t = C[o];
      if (t) {
        var r = t.units.findIndex(function (e) {
          return e.value === t.value;
        });
        for (var n = t.units.length, i = 1; i < n; i += 1) {
          var a = t.units[(r + e * i + n) % n];
          if (a.disabled !== true) {
            t.onSelect(a.value);
            break;
          }
        }
      }
    }
  };
  $(s, p.createElement(Pe, {
    key: "hour"
  }), M, H, function (e) {
    T(Q(t, e, P, q), "mouse");
  });
  $(u, p.createElement(Pe, {
    key: "minute"
  }), P, W, function (e) {
    T(Q(t, M, e, q), "mouse");
  });
  $(d, p.createElement(Pe, {
    key: "second"
  }), q, Y, function (e) {
    T(Q(t, M, P, e), "mouse");
  });
  var G = -1;
  if (typeof t === "boolean") {
    G = t ? 1 : 0;
  }
  $(f === true, p.createElement(Pe, {
    key: "12hours"
  }), G, [{
    label: "AM",
    value: 0,
    disabled: B
  }, {
    label: "PM",
    value: 1,
    disabled: V
  }], function (e) {
    T(Q(!!e, M, P, q), "mouse");
  });
  return p.createElement("div", {
    className: A
  }, C.map(function (e) {
    var t = e.node;
    return t;
  }));
}
var Ie = Re;
function je(e) {
  return e.filter(function (e) {
    return e !== false;
  }).length;
}
function De(e) {
  var t = e.generateConfig;
  var r = e.format;
  var n = r === undefined ? "HH:mm:ss" : r;
  var i = e.prefixCls;
  var o = e.active;
  var a = e.operationRef;
  var l = e.showHour;
  var d = e.showMinute;
  var g = e.showSecond;
  var m = e.use12Hours;
  var v = m !== undefined && m;
  var y = e.onSelect;
  var h = e.value;
  var b = `${i}-time-panel`;
  var w = p.useRef();
  var x = p.useState(-1);
  var E = (0, c.Z)(x, 2);
  var k = E[0];
  var S = E[1];
  var T = je([l, d, g, v]);
  a.current = {
    onKeyDown: function (e) {
      return Z(e, {
        onLeftRight: function (e) {
          S((k + e + T) % T);
        },
        onUpDown: function (e) {
          if (k === -1) {
            S(0);
          } else if (w.current) {
            w.current.onUpDown(e);
          }
        },
        onEnter: function () {
          y(h || t.getNow(), "key");
          S(-1);
        }
      });
    },
    onBlur: function () {
      S(-1);
    }
  };
  return p.createElement("div", {
    className: f(b, (0, u.Z)({}, `${b}-active`, o))
  }, p.createElement(xe, (0, s.Z)({}, e, {
    format: n,
    prefixCls: i
  })), p.createElement(Ie, (0, s.Z)({}, e, {
    prefixCls: i,
    activeColumnIndex: k,
    operationRef: w
  })));
}
var Le = De;
var Fe = p.createContext({});
var Ze = Fe;
function ze(e) {
  var t = e.cellPrefixCls;
  var r = e.generateConfig;
  var n = e.rangedValue;
  var i = e.hoverRangedValue;
  var o = e.isInView;
  var a = e.isSameCell;
  var s = e.offsetCell;
  var l = e.today;
  var c = e.value;
  function p(e) {
    var p;
    var d = s(e, -1);
    var f = s(e, 1);
    var g = _e(n, 0);
    var m = _e(n, 1);
    var v = _e(i, 0);
    var y = _e(i, 1);
    var h = ge(r, v, y, e);
    function b(e) {
      return a(g, e);
    }
    function w(e) {
      return a(m, e);
    }
    var x = a(v, e);
    var E = a(y, e);
    var k = (h || E) && (!o(d) || w(d));
    var S = (h || x) && (!o(f) || b(f));
    p = {};
    (0, u.Z)(p, `${t}-in-view`, o(e));
    (0, u.Z)(p, `${t}-in-range`, ge(r, g, m, e));
    (0, u.Z)(p, `${t}-range-start`, b(e));
    (0, u.Z)(p, `${t}-range-end`, w(e));
    (0, u.Z)(p, `${t}-range-start-single`, b(e) && !m);
    (0, u.Z)(p, `${t}-range-end-single`, w(e) && !g);
    (0, u.Z)(p, `${t}-range-start-near-hover`, b(e) && (a(d, v) || ge(r, v, y, d)));
    (0, u.Z)(p, `${t}-range-end-near-hover`, w(e) && (a(f, y) || ge(r, v, y, f)));
    (0, u.Z)(p, `${t}-range-hover`, h);
    (0, u.Z)(p, `${t}-range-hover-start`, x);
    (0, u.Z)(p, `${t}-range-hover-end`, E);
    (0, u.Z)(p, `${t}-range-hover-edge-start`, k);
    (0, u.Z)(p, `${t}-range-hover-edge-end`, S);
    (0, u.Z)(p, `${t}-range-hover-edge-start-near-range`, k && a(d, m));
    (0, u.Z)(p, `${t}-range-hover-edge-end-near-range`, S && a(f, g));
    (0, u.Z)(p, `${t}-today`, a(l, e));
    (0, u.Z)(p, `${t}-selected`, a(c, e));
    return p;
  }
  return p;
}
function Ue(e) {
  var t = e.prefixCls;
  var r = e.generateConfig;
  var n = e.prefixColumn;
  var i = e.locale;
  var o = e.rowCount;
  var a = e.viewDate;
  var u = e.value;
  var l = e.dateRender;
  var c = p.useContext(Ze);
  var d = c.rangedValue;
  var f = c.hoverRangedValue;
  var g = me(i.locale, r, a);
  var m = `${t}-cell`;
  var v = r.locale.getWeekFirstDay(i.locale);
  var y = r.getNow();
  var h = [];
  var b = i.shortWeekDays || (r.locale.getShortWeekDays ? r.locale.getShortWeekDays(i.locale) : []);
  if (n) {
    h.push(p.createElement("th", {
      key: "empty",
      "aria-label": "empty cell"
    }));
  }
  for (var w = 0; w < ne; w += 1) {
    h.push(p.createElement("th", {
      key: w
    }, b[(w + v) % ne]));
  }
  var x = ze({
    cellPrefixCls: m,
    today: y,
    value: u,
    generateConfig: r,
    rangedValue: n ? null : d,
    hoverRangedValue: n ? null : f,
    isSameCell: function (e, t) {
      return ce(r, e, t);
    },
    isInView: function (e) {
      return le(r, e, a);
    },
    offsetCell: function (e, t) {
      return r.addDate(e, t);
    }
  });
  var E = l ? function (e) {
    return l(e, y);
  } : undefined;
  return p.createElement(O, (0, s.Z)({}, e, {
    rowNum: o,
    colNum: ne,
    baseDate: g,
    getCellNode: E,
    getCellText: r.getDate,
    getCellClassName: x,
    getCellDate: r.addDate,
    titleCell: function (e) {
      return ye(e, {
        locale: i,
        format: "YYYY-MM-DD",
        generateConfig: r
      });
    },
    headerCells: h
  }));
}
var Be = Ue;
function Ve(e) {
  var t = e.prefixCls;
  var r = e.generateConfig;
  var n = e.locale;
  var i = e.viewDate;
  var o = e.onNextMonth;
  var a = e.onPrevMonth;
  var u = e.onNextYear;
  var l = e.onPrevYear;
  var c = e.onYearClick;
  var d = e.onMonthClick;
  var f = p.useContext(b);
  var g = f.hideHeader;
  if (g) {
    return null;
  }
  var m = `${t}-header`;
  var v = n.shortMonths || (r.locale.getShortMonths ? r.locale.getShortMonths(n.locale) : []);
  var y = r.getMonth(i);
  var h = p.createElement("button", {
    type: "button",
    key: "year",
    onClick: c,
    tabIndex: -1,
    className: `${t}-year-btn`
  }, ye(i, {
    locale: n,
    format: n.yearFormat,
    generateConfig: r
  }));
  var w = p.createElement("button", {
    type: "button",
    key: "month",
    onClick: d,
    tabIndex: -1,
    className: `${t}-month-btn`
  }, n.monthFormat ? ye(i, {
    locale: n,
    format: n.monthFormat,
    generateConfig: r
  }) : v[y]);
  var x = n.monthBeforeYear ? [w, h] : [h, w];
  return p.createElement(E, (0, s.Z)({}, e, {
    prefixCls: m,
    onSuperPrev: l,
    onPrev: a,
    onNext: o,
    onSuperNext: u
  }), x);
}
var He = Ve;
var We = 6;
function Ye(e) {
  var t = e.prefixCls;
  var r = e.panelName;
  var n = r === undefined ? "date" : r;
  var i = e.keyboardConfig;
  var o = e.active;
  var a = e.operationRef;
  var c = e.generateConfig;
  var d = e.value;
  var g = e.viewDate;
  var m = e.onViewDateChange;
  var v = e.onPanelChange;
  var y = e.onSelect;
  var h = `${t}-${n}-panel`;
  a.current = {
    onKeyDown: function (e) {
      return Z(e, (0, l.Z)({
        onLeftRight: function (e) {
          y(c.addDate(d || g, e), "key");
        },
        onCtrlLeftRight: function (e) {
          y(c.addYear(d || g, e), "key");
        },
        onUpDown: function (e) {
          y(c.addDate(d || g, e * ne), "key");
        },
        onPageUpDown: function (e) {
          y(c.addMonth(d || g, e), "key");
        }
      }, i));
    }
  };
  function b(e) {
    var t = c.addYear(g, e);
    m(t);
    v(null, t);
  }
  function w(e) {
    var t = c.addMonth(g, e);
    m(t);
    v(null, t);
  }
  return p.createElement("div", {
    className: f(h, (0, u.Z)({}, `${h}-active`, o))
  }, p.createElement(He, (0, s.Z)({}, e, {
    prefixCls: t,
    value: d,
    viewDate: g,
    onPrevYear: function () {
      b(-1);
    },
    onNextYear: function () {
      b(1);
    },
    onPrevMonth: function () {
      w(-1);
    },
    onNextMonth: function () {
      w(1);
    },
    onMonthClick: function () {
      v("month", g);
    },
    onYearClick: function () {
      v("year", g);
    }
  })), p.createElement(Be, (0, s.Z)({}, e, {
    onSelect: function (e) {
      return y(e, "mouse");
    },
    prefixCls: t,
    value: d,
    viewDate: g,
    rowCount: We
  })));
}
var Qe = Ye;
var $e = Te("date", "time");
function Ge(e) {
  var t = e.prefixCls;
  var r = e.operationRef;
  var n = e.generateConfig;
  var i = e.value;
  var o = e.defaultValue;
  var a = e.disabledTime;
  var d = e.showTime;
  var g = e.onSelect;
  var m = `${t}-datetime-panel`;
  var h = p.useState(null);
  var b = (0, c.Z)(h, 2);
  var w = b[0];
  var x = b[1];
  var E = p.useRef({});
  var k = p.useRef({});
  var S = (0, v.Z)(d) === "object" ? (0, l.Z)({}, d) : {};
  function T(e) {
    var t = $e.indexOf(w) + e;
    var r = $e[t] || null;
    return r;
  }
  function A(e) {
    if (k.current.onBlur) {
      k.current.onBlur(e);
    }
    x(null);
  }
  r.current = {
    onKeyDown: function (e) {
      if (e.which === y.Z.TAB) {
        var t = T(e.shiftKey ? -1 : 1);
        x(t);
        if (t) {
          e.preventDefault();
        }
        return true;
      }
      if (w) {
        var r = w === "date" ? E : k;
        if (r.current && r.current.onKeyDown) {
          r.current.onKeyDown(e);
        }
        return true;
      }
      return !![y.Z.LEFT, y.Z.RIGHT, y.Z.UP, y.Z.DOWN].includes(e.which) && (x("date"), true);
    },
    onBlur: A,
    onClose: A
  };
  function _(e, t) {
    var r = e;
    if (t === "date" && !i && S.defaultValue) {
      r = n.setHour(r, n.getHour(S.defaultValue));
      r = n.setMinute(r, n.getMinute(S.defaultValue));
      r = n.setSecond(r, n.getSecond(S.defaultValue));
    } else if (t === "time" && !i && o) {
      r = n.setYear(r, n.getYear(o));
      r = n.setMonth(r, n.getMonth(o));
      r = n.setDate(r, n.getDate(o));
    }
    if (g) {
      g(r, "mouse");
    }
  }
  var O = a ? a(i || null) : {};
  return p.createElement("div", {
    className: f(m, (0, u.Z)({}, `${m}-active`, w))
  }, p.createElement(Qe, (0, s.Z)({}, e, {
    operationRef: E,
    active: w === "date",
    onSelect: function (e) {
      _(C(n, e, i || (0, v.Z)(d) !== "object" ? null : d.defaultValue), "date");
    }
  })), p.createElement(Le, (0, s.Z)({}, e, {
    format: undefined
  }, S, O, {
    disabledTime: null,
    defaultValue: undefined,
    operationRef: k,
    active: w === "time",
    onSelect: function (e) {
      _(e, "time");
    }
  })));
}
var Ke = Ge;
function Je(e) {
  var t = e.prefixCls;
  var r = e.generateConfig;
  var n = e.locale;
  var i = e.value;
  var o = `${t}-cell`;
  function a(e) {
    return p.createElement("td", {
      key: "week",
      className: f(o, `${o}-week`)
    }, r.locale.getWeek(n.locale, e));
  }
  var l = `${t}-week-panel-row`;
  function c(e) {
    return f(l, (0, u.Z)({}, `${l}-selected`, de(r, n.locale, i, e)));
  }
  return p.createElement(Qe, (0, s.Z)({}, e, {
    panelName: "week",
    prefixColumn: a,
    rowClassName: c,
    keyboardConfig: {
      onLeftRight: null
    }
  }));
}
var Xe = Je;
function et(e) {
  var t = e.prefixCls;
  var r = e.generateConfig;
  var n = e.locale;
  var i = e.viewDate;
  var o = e.onNextYear;
  var a = e.onPrevYear;
  var u = e.onYearClick;
  var l = p.useContext(b);
  var c = l.hideHeader;
  if (c) {
    return null;
  }
  var d = `${t}-header`;
  return p.createElement(E, (0, s.Z)({}, e, {
    prefixCls: d,
    onSuperPrev: a,
    onSuperNext: o
  }), p.createElement("button", {
    type: "button",
    onClick: u,
    className: `${t}-year-btn`
  }, ye(i, {
    locale: n,
    format: n.yearFormat,
    generateConfig: r
  })));
}
var tt = et;
var rt = 3;
var nt = 4;
function it(e) {
  var t = e.prefixCls;
  var r = e.locale;
  var n = e.value;
  var i = e.viewDate;
  var o = e.generateConfig;
  var a = e.monthCellRender;
  var u = p.useContext(Ze);
  var l = u.rangedValue;
  var c = u.hoverRangedValue;
  var d = `${t}-cell`;
  var f = ze({
    cellPrefixCls: d,
    value: n,
    generateConfig: o,
    rangedValue: l,
    hoverRangedValue: c,
    isSameCell: function (e, t) {
      return le(o, e, t);
    },
    isInView: function () {
      return true;
    },
    offsetCell: function (e, t) {
      return o.addMonth(e, t);
    }
  });
  var g = r.shortMonths || (o.locale.getShortMonths ? o.locale.getShortMonths(r.locale) : []);
  var m = o.setMonth(i, 0);
  var v = a ? function (e) {
    return a(e, r);
  } : undefined;
  return p.createElement(O, (0, s.Z)({}, e, {
    rowNum: nt,
    colNum: rt,
    baseDate: m,
    getCellNode: v,
    getCellText: function (e) {
      if (r.monthFormat) {
        return ye(e, {
          locale: r,
          format: r.monthFormat,
          generateConfig: o
        });
      } else {
        return g[o.getMonth(e)];
      }
    },
    getCellClassName: f,
    getCellDate: o.addMonth,
    titleCell: function (e) {
      return ye(e, {
        locale: r,
        format: "YYYY-MM",
        generateConfig: o
      });
    }
  }));
}
var ot = it;
function at(e) {
  var t = e.prefixCls;
  var r = e.operationRef;
  var n = e.onViewDateChange;
  var i = e.generateConfig;
  var o = e.value;
  var a = e.viewDate;
  var u = e.onPanelChange;
  var l = e.onSelect;
  var c = `${t}-month-panel`;
  r.current = {
    onKeyDown: function (e) {
      return Z(e, {
        onLeftRight: function (e) {
          l(i.addMonth(o || a, e), "key");
        },
        onCtrlLeftRight: function (e) {
          l(i.addYear(o || a, e), "key");
        },
        onUpDown: function (e) {
          l(i.addMonth(o || a, e * rt), "key");
        },
        onEnter: function () {
          u("date", o || a);
        }
      });
    }
  };
  function d(e) {
    var t = i.addYear(a, e);
    n(t);
    u(null, t);
  }
  return p.createElement("div", {
    className: c
  }, p.createElement(tt, (0, s.Z)({}, e, {
    prefixCls: t,
    onPrevYear: function () {
      d(-1);
    },
    onNextYear: function () {
      d(1);
    },
    onYearClick: function () {
      u("year", a);
    }
  })), p.createElement(ot, (0, s.Z)({}, e, {
    prefixCls: t,
    onSelect: function (e) {
      l(e, "mouse");
      u("date", e);
    }
  })));
}
var st = at;
function ut(e) {
  var t = e.prefixCls;
  var r = e.generateConfig;
  var n = e.locale;
  var i = e.viewDate;
  var o = e.onNextYear;
  var a = e.onPrevYear;
  var u = e.onYearClick;
  var l = p.useContext(b);
  var c = l.hideHeader;
  if (c) {
    return null;
  }
  var d = `${t}-header`;
  return p.createElement(E, (0, s.Z)({}, e, {
    prefixCls: d,
    onSuperPrev: a,
    onSuperNext: o
  }), p.createElement("button", {
    type: "button",
    onClick: u,
    className: `${t}-year-btn`
  }, ye(i, {
    locale: n,
    format: n.yearFormat,
    generateConfig: r
  })));
}
var lt = ut;
var ct = 4;
var pt = 1;
function dt(e) {
  var t = e.prefixCls;
  var r = e.locale;
  var n = e.value;
  var i = e.viewDate;
  var o = e.generateConfig;
  var a = p.useContext(Ze);
  var u = a.rangedValue;
  var l = a.hoverRangedValue;
  var c = `${t}-cell`;
  var d = ze({
    cellPrefixCls: c,
    value: n,
    generateConfig: o,
    rangedValue: u,
    hoverRangedValue: l,
    isSameCell: function (e, t) {
      return ue(o, e, t);
    },
    isInView: function () {
      return true;
    },
    offsetCell: function (e, t) {
      return o.addMonth(e, t * 3);
    }
  });
  var f = o.setDate(o.setMonth(i, 0), 1);
  return p.createElement(O, (0, s.Z)({}, e, {
    rowNum: pt,
    colNum: ct,
    baseDate: f,
    getCellText: function (e) {
      return ye(e, {
        locale: r,
        format: r.quarterFormat || "[Q]Q",
        generateConfig: o
      });
    },
    getCellClassName: d,
    getCellDate: function (e, t) {
      return o.addMonth(e, t * 3);
    },
    titleCell: function (e) {
      return ye(e, {
        locale: r,
        format: "YYYY-[Q]Q",
        generateConfig: o
      });
    }
  }));
}
var ft = dt;
function gt(e) {
  var t = e.prefixCls;
  var r = e.operationRef;
  var n = e.onViewDateChange;
  var i = e.generateConfig;
  var o = e.value;
  var a = e.viewDate;
  var u = e.onPanelChange;
  var l = e.onSelect;
  var c = `${t}-quarter-panel`;
  r.current = {
    onKeyDown: function (e) {
      return Z(e, {
        onLeftRight: function (e) {
          l(i.addMonth(o || a, e * 3), "key");
        },
        onCtrlLeftRight: function (e) {
          l(i.addYear(o || a, e), "key");
        },
        onUpDown: function (e) {
          l(i.addYear(o || a, e), "key");
        }
      });
    }
  };
  function d(e) {
    var t = i.addYear(a, e);
    n(t);
    u(null, t);
  }
  return p.createElement("div", {
    className: c
  }, p.createElement(lt, (0, s.Z)({}, e, {
    prefixCls: t,
    onPrevYear: function () {
      d(-1);
    },
    onNextYear: function () {
      d(1);
    },
    onYearClick: function () {
      u("year", a);
    }
  })), p.createElement(ft, (0, s.Z)({}, e, {
    prefixCls: t,
    onSelect: function (e) {
      l(e, "mouse");
    }
  })));
}
var mt = gt;
function vt(e) {
  var t = e.prefixCls;
  var r = e.generateConfig;
  var n = e.viewDate;
  var i = e.onPrevDecade;
  var o = e.onNextDecade;
  var a = e.onDecadeClick;
  var u = p.useContext(b);
  var l = u.hideHeader;
  if (l) {
    return null;
  }
  var c = `${t}-header`;
  var d = r.getYear(n);
  var f = Math.floor(d / Et) * Et;
  var g = f + Et - 1;
  return p.createElement(E, (0, s.Z)({}, e, {
    prefixCls: c,
    onSuperPrev: i,
    onSuperNext: o
  }), p.createElement("button", {
    type: "button",
    onClick: a,
    className: `${t}-decade-btn`
  }, f, "-", g));
}
var yt = vt;
var ht = 3;
var bt = 4;
function wt(e) {
  var t = e.prefixCls;
  var r = e.value;
  var n = e.viewDate;
  var i = e.locale;
  var o = e.generateConfig;
  var a = p.useContext(Ze);
  var u = a.rangedValue;
  var l = a.hoverRangedValue;
  var c = `${t}-cell`;
  var d = o.getYear(n);
  var f = Math.floor(d / Et) * Et;
  var g = f + Et - 1;
  var m = o.setYear(n, f - Math.ceil((ht * bt - Et) / 2));
  function v(e) {
    var t = o.getYear(e);
    return f <= t && t <= g;
  }
  var y = ze({
    cellPrefixCls: c,
    value: r,
    generateConfig: o,
    rangedValue: u,
    hoverRangedValue: l,
    isSameCell: function (e, t) {
      return ae(o, e, t);
    },
    isInView: v,
    offsetCell: function (e, t) {
      return o.addYear(e, t);
    }
  });
  return p.createElement(O, (0, s.Z)({}, e, {
    rowNum: bt,
    colNum: ht,
    baseDate: m,
    getCellText: o.getYear,
    getCellClassName: y,
    getCellDate: o.addYear,
    titleCell: function (e) {
      return ye(e, {
        locale: i,
        format: "YYYY",
        generateConfig: o
      });
    }
  }));
}
var xt = wt;
var Et = 10;
function kt(e) {
  var t = e.prefixCls;
  var r = e.operationRef;
  var n = e.onViewDateChange;
  var i = e.generateConfig;
  var o = e.value;
  var a = e.viewDate;
  var u = e.sourceMode;
  var l = e.onSelect;
  var c = e.onPanelChange;
  var d = `${t}-year-panel`;
  r.current = {
    onKeyDown: function (e) {
      return Z(e, {
        onLeftRight: function (e) {
          l(i.addYear(o || a, e), "key");
        },
        onCtrlLeftRight: function (e) {
          l(i.addYear(o || a, e * Et), "key");
        },
        onUpDown: function (e) {
          l(i.addYear(o || a, e * ht), "key");
        },
        onEnter: function () {
          c(u === "date" ? "date" : "month", o || a);
        }
      });
    }
  };
  function f(e) {
    var t = i.addYear(a, e * 10);
    n(t);
    c(null, t);
  }
  return p.createElement("div", {
    className: d
  }, p.createElement(yt, (0, s.Z)({}, e, {
    prefixCls: t,
    onPrevDecade: function () {
      f(-1);
    },
    onNextDecade: function () {
      f(1);
    },
    onDecadeClick: function () {
      c("decade", a);
    }
  })), p.createElement(xt, (0, s.Z)({}, e, {
    prefixCls: t,
    onSelect: function (e) {
      c(u === "date" ? "date" : "month", e);
      l(e, "mouse");
    }
  })));
}
var St = kt;
function Tt(e, t, r) {
  if (r) {
    return p.createElement("div", {
      className: `${e}-footer-extra`
    }, r(t));
  } else {
    return null;
  }
}
function Ct(e) {
  var t;
  var r;
  var n = e.prefixCls;
  var i = e.rangeList;
  var o = i === undefined ? [] : i;
  var a = e.components;
  var s = a === undefined ? {} : a;
  var u = e.needConfirmButton;
  var l = e.onNow;
  var c = e.onOk;
  var d = e.okDisabled;
  var f = e.showNow;
  var g = e.locale;
  if (o.length) {
    var m = s.rangeItem || "span";
    t = p.createElement(p.Fragment, null, o.map(function (e) {
      var t = e.label;
      var r = e.onClick;
      var i = e.onMouseEnter;
      var o = e.onMouseLeave;
      return p.createElement("li", {
        key: t,
        className: `${n}-preset`
      }, p.createElement(m, {
        onClick: r,
        onMouseEnter: i,
        onMouseLeave: o
      }, t));
    }));
  }
  if (u) {
    var v = s.button || "button";
    if (l && !t && f !== false) {
      t = p.createElement("li", {
        className: `${n}-now`
      }, p.createElement("a", {
        className: `${n}-now-btn`,
        onClick: l
      }, g.now));
    }
    r = u && p.createElement("li", {
      className: `${n}-ok`
    }, p.createElement(v, {
      disabled: d,
      onClick: c
    }, g.ok));
  }
  if (t || r) {
    return p.createElement("ul", {
      className: `${n}-ranges`
    }, t, r);
  } else {
    return null;
  }
}
var At = ["date", "month"];
function _t(e) {
  var t;
  var r = e.prefixCls;
  var n = r === undefined ? "rc-picker" : r;
  var i = e.className;
  var o = e.style;
  var a = e.locale;
  var d = e.generateConfig;
  var h = e.value;
  var w = e.defaultValue;
  var x = e.pickerValue;
  var E = e.defaultPickerValue;
  var k = e.disabledDate;
  var S = e.mode;
  var _ = e.picker;
  var O = _ === undefined ? "date" : _;
  var M = e.tabIndex;
  var P = M === undefined ? 0 : M;
  var q = e.showNow;
  var N = e.showTime;
  var R = e.showToday;
  var I = e.renderExtraFooter;
  var j = e.hideHeader;
  var D = e.onSelect;
  var L = e.onChange;
  var F = e.onPanelChange;
  var Z = e.onMouseDown;
  var z = e.onPickerValueChange;
  var U = e.onOk;
  var B = e.components;
  var V = e.direction;
  var H = e.hourStep;
  var W = H === undefined ? 1 : H;
  var Y = e.minuteStep;
  var Q = Y === undefined ? 1 : Y;
  var $ = e.secondStep;
  var G = $ === undefined ? 1 : $;
  var J = O === "date" && !!N || O === "time";
  var X = 24 % W === 0;
  var ee = 60 % Q === 0;
  var te = 60 % G === 0;
  var ie = p.useContext(b);
  var oe = ie.operationRef;
  var ae = ie.panelRef;
  var se = ie.onSelect;
  var ue = ie.hideRanges;
  var le = ie.defaultOpenValue;
  var ce = p.useContext(Ze);
  var pe = ce.inRange;
  var de = ce.panelPosition;
  var ge = ce.rangedValue;
  var me = ce.hoverRangedValue;
  var ve = p.useRef({});
  var ye = p.useRef(true);
  var he = (0, m.Z)(null, {
    value: h,
    defaultValue: w,
    postState: function (e) {
      if (!e && le && O === "time") {
        return le;
      } else {
        return e;
      }
    }
  });
  var be = (0, c.Z)(he, 2);
  var we = be[0];
  var xe = be[1];
  var Ee = (0, m.Z)(null, {
    value: x,
    defaultValue: E || we,
    postState: function (e) {
      var t = d.getNow();
      if (!e) {
        return t;
      }
      if (!we && N) {
        var r = (0, v.Z)(N) === "object" ? N.defaultValue : w;
        return C(d, Array.isArray(e) ? e[0] : e, r || t);
      }
      if (Array.isArray(e)) {
        return e[0];
      } else {
        return e;
      }
    }
  });
  var ke = (0, c.Z)(Ee, 2);
  var Se = ke[0];
  var Te = ke[1];
  function Ce(e) {
    Te(e);
    if (z) {
      z(e);
    }
  }
  function Ae(e) {
    var t = K[O];
    if (t) {
      return t(e);
    } else {
      return e;
    }
  }
  var _e = (0, m.Z)(function () {
    if (O === "time") {
      return "time";
    } else {
      return Ae("date");
    }
  }, {
    value: S
  });
  var Oe = (0, c.Z)(_e, 2);
  var Me = Oe[0];
  var Pe = Oe[1];
  p.useEffect(function () {
    Pe(O);
  }, [O]);
  var qe;
  var Ne = p.useState(function () {
    return Me;
  });
  var Re = (0, c.Z)(Ne, 2);
  var Ie = Re[0];
  var je = Re[1];
  function De(e, t) {
    var r = Ae(e || Me);
    je(Me);
    Pe(r);
    if (F && (Me !== r || fe(d, Se, Se))) {
      F(t, r);
    }
  }
  function Fe(e, t, r = false) {
    if (Me === O || r) {
      xe(e);
      if (D) {
        D(e);
      }
      if (se) {
        se(e, t);
      }
      if (!!L && !fe(d, e, we) && !(k === null || k === undefined ? undefined : k(e))) {
        L(e);
      }
    }
  }
  function ze(e) {
    if (At.includes(Me)) {
      var t;
      var r;
      var n = Me === "date";
      r = e === y.Z.PAGE_UP || e === y.Z.PAGE_DOWN ? n ? d.addMonth : d.addYear : n ? d.addDate : d.addMonth;
      switch (e) {
        case y.Z.LEFT:
        case y.Z.PAGE_UP:
          t = r(Se, -1);
          break;
        case y.Z.RIGHT:
        case y.Z.PAGE_DOWN:
          t = r(Se, 1);
          break;
        case y.Z.UP:
        case y.Z.DOWN:
          t = r(Se, Number(`${e === y.Z.UP ? "-" : ""}${n ? ne : rt}`));
          break;
      }
      if (t) {
        return !(k === null || k === undefined ? undefined : k(t));
      }
    }
    return true;
  }
  function Ue(e) {
    if (ve.current && ve.current.onKeyDown) {
      var t = true;
      var r = e.which;
      if ([y.Z.LEFT, y.Z.RIGHT, y.Z.UP, y.Z.DOWN, y.Z.PAGE_UP, y.Z.PAGE_DOWN, y.Z.ENTER].includes(r)) {
        e.preventDefault();
        if (r !== y.Z.ENTER && P === 0) {
          t = ze(r);
        }
      }
      if (t) {
        return ve.current.onKeyDown(e);
      }
    }
    (0, g.ZP)(false, "Panel not correct handle keyDown event. Please help to fire issue about this.");
    return false;
  }
  function Be(e) {
    if (ve.current && ve.current.onBlur) {
      ve.current.onBlur(e);
    }
  }
  if (oe && de !== "right") {
    oe.current = {
      onKeyDown: Ue,
      onClose: function () {
        if (ve.current && ve.current.onClose) {
          ve.current.onClose();
        }
      }
    };
  }
  p.useEffect(function () {
    if (h && !ye.current) {
      Te(h);
    }
  }, [h]);
  p.useEffect(function () {
    ye.current = false;
  }, []);
  var Ve;
  var He;
  var We = (0, l.Z)((0, l.Z)({}, e), {}, {
    operationRef: ve,
    prefixCls: n,
    viewDate: Se,
    value: we,
    onViewDateChange: Ce,
    sourceMode: Ie,
    onPanelChange: De,
    disabledDate: k
  });
  delete We.onChange;
  delete We.onSelect;
  switch (Me) {
    case "decade":
      qe = p.createElement(re, (0, s.Z)({}, We, {
        onSelect: function (e, t) {
          Ce(e);
          Fe(e, t);
        }
      }));
      break;
    case "year":
      qe = p.createElement(St, (0, s.Z)({}, We, {
        onSelect: function (e, t) {
          Ce(e);
          Fe(e, t);
        }
      }));
      break;
    case "month":
      qe = p.createElement(st, (0, s.Z)({}, We, {
        onSelect: function (e, t) {
          Ce(e);
          Fe(e, t);
        }
      }));
      break;
    case "quarter":
      qe = p.createElement(mt, (0, s.Z)({}, We, {
        onSelect: function (e, t) {
          Ce(e);
          Fe(e, t);
        }
      }));
      break;
    case "week":
      qe = p.createElement(Xe, (0, s.Z)({}, We, {
        onSelect: function (e, t) {
          Ce(e);
          Fe(e, t);
        }
      }));
      break;
    case "time":
      delete We.showTime;
      qe = p.createElement(Le, (0, s.Z)({}, We, (0, v.Z)(N) === "object" ? N : null, {
        onSelect: function (e, t) {
          Ce(e);
          Fe(e, t);
        }
      }));
      break;
    default:
      qe = N ? p.createElement(Ke, (0, s.Z)({}, We, {
        onSelect: function (e, t) {
          Ce(e);
          Fe(e, t);
        }
      })) : p.createElement(Qe, (0, s.Z)({}, We, {
        onSelect: function (e, t) {
          Ce(e);
          Fe(e, t);
        }
      }));
  }
  var Ye;
  function $e() {
    var e = d.getNow();
    var t = A(d.getHour(e), d.getMinute(e), d.getSecond(e), X ? W : 1, ee ? Q : 1, te ? G : 1);
    var r = T(d, e, t[0], t[1], t[2]);
    Fe(r, "submit");
  }
  if (!ue) {
    Ve = Tt(n, Me, I);
    He = Ct({
      prefixCls: n,
      components: B,
      needConfirmButton: J,
      okDisabled: !we || k && k(we),
      locale: a,
      showNow: q,
      onNow: J && $e,
      onOk: function () {
        if (we) {
          Fe(we, "submit", true);
          if (U) {
            U(we);
          }
        }
      }
    });
  }
  if (R && Me === "date" && O === "date" && !N) {
    var Ge = d.getNow();
    var Je = `${n}-today-btn`;
    var et = k && k(Ge);
    Ye = p.createElement("a", {
      className: f(Je, et && `${Je}-disabled`),
      "aria-disabled": et,
      onClick: function () {
        if (!et) {
          Fe(Ge, "mouse", true);
        }
      }
    }, a.today);
  }
  return p.createElement(b.Provider, {
    value: (0, l.Z)((0, l.Z)({}, ie), {}, {
      mode: Me,
      hideHeader: "hideHeader" in e ? j : ie.hideHeader,
      hidePrevBtn: pe && de === "right",
      hideNextBtn: pe && de === "left"
    })
  }, p.createElement("div", {
    tabIndex: P,
    className: f(`${n}-panel`, i, (t = {}, (0, u.Z)(t, `${n}-panel-has-range`, ge && ge[0] && ge[1]), (0, u.Z)(t, `${n}-panel-has-range-hover`, me && me[0] && me[1]), (0, u.Z)(t, `${n}-panel-rtl`, V === "rtl"), t)),
    style: o,
    onKeyDown: Ue,
    onBlur: Be,
    onMouseDown: Z,
    ref: ae
  }, qe, Ve || He || Ye ? p.createElement("div", {
    className: `${n}-footer`
  }, Ve, He, Ye) : null));
}
var Ot = _t;
var Mt = require("8019");
var Pt = {
  bottomLeft: {
    points: ["tl", "bl"],
    offset: [0, 4],
    overflow: {
      adjustX: 1,
      adjustY: 1
    }
  },
  bottomRight: {
    points: ["tr", "br"],
    offset: [0, 4],
    overflow: {
      adjustX: 1,
      adjustY: 1
    }
  },
  topLeft: {
    points: ["bl", "tl"],
    offset: [0, -4],
    overflow: {
      adjustX: 0,
      adjustY: 1
    }
  },
  topRight: {
    points: ["br", "tr"],
    offset: [0, -4],
    overflow: {
      adjustX: 0,
      adjustY: 1
    }
  }
};
function qt(e) {
  var t;
  var r = e.prefixCls;
  var n = e.popupElement;
  var i = e.popupStyle;
  var o = e.visible;
  var a = e.dropdownClassName;
  var s = e.dropdownAlign;
  var l = e.transitionName;
  var c = e.getPopupContainer;
  var d = e.children;
  var g = e.range;
  var m = e.popupPlacement;
  var v = e.direction;
  var y = `${r}-dropdown`;
  function h() {
    if (m !== undefined) {
      return m;
    } else if (v === "rtl") {
      return "bottomRight";
    } else {
      return "bottomLeft";
    }
  }
  return p.createElement(Mt.Z, {
    showAction: [],
    hideAction: [],
    popupPlacement: h(),
    builtinPlacements: Pt,
    prefixCls: y,
    popupTransitionName: l,
    popup: n,
    popupAlign: s,
    popupVisible: o,
    popupClassName: f(a, (t = {}, (0, u.Z)(t, `${y}-range`, g), (0, u.Z)(t, `${y}-rtl`, v === "rtl"), t)),
    popupStyle: i,
    getPopupContainer: c
  }, d);
}
var Nt = qt;
function Rt(e) {
  var t = e.open;
  var r = e.value;
  var n = e.isClickOutside;
  var i = e.triggerOpen;
  var o = e.forwardKeyDown;
  var a = e.onKeyDown;
  var s = e.blurToCancel;
  var u = e.onSubmit;
  var l = e.onCancel;
  var d = e.onFocus;
  var f = e.onBlur;
  var g = e.currentFocusedKey;
  var m = e.key;
  var v = m === undefined ? "start" : m;
  var h = (0, p.useState)(false);
  var b = (0, c.Z)(h, 2);
  var w = b[0];
  var x = b[1];
  var E = (0, p.useState)(false);
  var k = (0, c.Z)(E, 2);
  var S = k[0];
  var T = k[1];
  var C = (0, p.useRef)();
  var A = (0, p.useRef)(false);
  var _ = (0, p.useRef)(false);
  var O = (0, p.useRef)(false);
  var M = {
    onMouseDown: function () {
      x(true);
      i(true);
    },
    onKeyDown: function (e) {
      function r() {
        O.current = true;
      }
      a(e, r);
      if (!O.current) {
        switch (e.which) {
          case y.Z.ENTER:
            if (t) {
              if (u() !== false) {
                x(true);
              }
            } else {
              i(true);
            }
            e.preventDefault();
            return;
          case y.Z.TAB:
            if (w && t && !e.shiftKey) {
              x(false);
              e.preventDefault();
            } else if (!w && t && !o(e) && e.shiftKey) {
              x(true);
              e.preventDefault();
            }
            return;
          case y.Z.ESC:
            x(true);
            l();
            return;
        }
        if (t || [y.Z.SHIFT].includes(e.which)) {
          if (!w) {
            o(e);
          }
        } else {
          i(true);
        }
      }
    },
    onFocus: function (e) {
      x(true);
      T(true);
      if (g) {
        g.current = v;
      }
      clearTimeout(C.current);
      if (d) {
        d(e);
      }
    },
    onBlur: function (e) {
      if (!A.current && n(document.activeElement)) {
        if (s) {
          setTimeout(function () {
            var e = document;
            var t = e.activeElement;
            while (t && t.shadowRoot) {
              t = t.shadowRoot.activeElement;
            }
            if (n(t)) {
              l();
            }
          }, 0);
        } else if (t) {
          i(false);
          if (_.current) {
            u();
          }
        }
        T(false);
        if (g) {
          g.current = "";
          C.current = setTimeout(function () {
            if (!g.current && f !== null && f !== undefined) {
              f(e);
            }
          }, 100);
        } else if (f !== null && f !== undefined) {
          f(e);
        }
      } else {
        A.current = false;
      }
    }
  };
  (0, p.useEffect)(function () {
    _.current = false;
  }, [t]);
  (0, p.useEffect)(function () {
    _.current = true;
  }, [r]);
  (0, p.useEffect)(function () {
    return H(function (e) {
      var r = W(e);
      var o = n(r);
      if (t) {
        if (o) {
          if (!S || !!o) {
            i(false);
          }
        } else {
          A.current = true;
          requestAnimationFrame(function () {
            A.current = false;
          });
        }
      } else if (S && !o) {
        A.current = true;
      }
    });
  });
  (0, p.useEffect)(function () {
    return function () {
      return clearTimeout(C.current);
    };
  }, []);
  return [M, {
    focused: S,
    typing: w
  }];
}
function It(e) {
  var t = e.valueTexts;
  var r = e.onTextChange;
  var n = p.useState("");
  var i = (0, c.Z)(n, 2);
  var o = i[0];
  var a = i[1];
  var s = p.useRef([]);
  function u(e) {
    a(e);
    r(e);
  }
  function l() {
    a(s.current[0]);
  }
  s.current = t;
  p.useEffect(function () {
    if (t.every(function (e) {
      return e !== o;
    })) {
      l();
    }
  }, [t.join("||")]);
  return [o, u, l];
}
var jt = require("44207");
function Dt(e, t) {
  var r = t.formatList;
  var n = t.generateConfig;
  var i = t.locale;
  return (0, Ee.Z)(function () {
    if (!e) {
      return [[""], ""];
    }
    var t = "";
    var o = [];
    for (var a = 0; a < r.length; a += 1) {
      var s = r[a];
      var u = ye(e, {
        generateConfig: n,
        locale: i,
        format: s
      });
      o.push(u);
      if (a === 0) {
        t = u;
      }
    }
    return [o, t];
  }, [e, r, i], function (e, t) {
    return !fe(n, e[0], t[0]) || !(0, jt.Z)(e[1], t[1], true) || !(0, jt.Z)(e[2], t[2], true);
  });
}
function Lt(e, t) {
  var r = t.formatList;
  var n = t.generateConfig;
  var i = t.locale;
  var o = (0, p.useState)(null);
  var a = (0, c.Z)(o, 2);
  var s = a[0];
  var u = a[1];
  var l = (0, p.useRef)(null);
  function d(e, t = false) {
    cancelAnimationFrame(l.current);
    if (t) {
      u(e);
    } else {
      l.current = requestAnimationFrame(function () {
        u(e);
      });
    }
  }
  var f = Dt(s, {
    formatList: r,
    generateConfig: n,
    locale: i
  });
  var g = (0, c.Z)(f, 2);
  var m = g[1];
  function v(e) {
    d(e);
  }
  function y(e = false) {
    d(null, e);
  }
  (0, p.useEffect)(function () {
    y(true);
  }, [e]);
  (0, p.useEffect)(function () {
    return function () {
      return cancelAnimationFrame(l.current);
    };
  }, []);
  return [m, v, y];
}
function Ft(e) {
  var t;
  var r = e.prefixCls;
  var n = r === undefined ? "rc-picker" : r;
  var i = e.id;
  var o = e.tabIndex;
  var a = e.style;
  var d = e.className;
  var v = e.dropdownClassName;
  var y = e.dropdownAlign;
  var h = e.popupStyle;
  var w = e.transitionName;
  var x = e.generateConfig;
  var E = e.locale;
  var k = e.inputReadOnly;
  var S = e.allowClear;
  var T = e.autoFocus;
  var C = e.showTime;
  var A = e.picker;
  var _ = A === undefined ? "date" : A;
  var O = e.format;
  var M = e.use12Hours;
  var P = e.value;
  var q = e.defaultValue;
  var N = e.open;
  var R = e.defaultOpen;
  var I = e.defaultOpenValue;
  var j = e.suffixIcon;
  var D = e.clearIcon;
  var L = e.disabled;
  var F = e.disabledDate;
  var Z = e.placeholder;
  var B = e.getPopupContainer;
  var V = e.pickerRef;
  var H = e.panelRender;
  var W = e.onChange;
  var Y = e.onOpenChange;
  var Q = e.onFocus;
  var $ = e.onBlur;
  var G = e.onMouseDown;
  var K = e.onMouseUp;
  var X = e.onMouseEnter;
  var ee = e.onMouseLeave;
  var te = e.onContextMenu;
  var re = e.onClick;
  var ne = e.onKeyDown;
  var ie = e.onSelect;
  var oe = e.direction;
  var ae = e.autoComplete;
  var se = ae === undefined ? "off" : ae;
  var ue = e.inputRender;
  var le = p.useRef(null);
  var ce = _ === "date" && !!C || _ === "time";
  var pe = Ce(z(O, _, C, M));
  var de = p.useRef(null);
  var ge = p.useRef(null);
  var me = p.useRef(null);
  var ve = (0, m.Z)(null, {
    value: P,
    defaultValue: q
  });
  var be = (0, c.Z)(ve, 2);
  var we = be[0];
  var xe = be[1];
  var Ee = p.useState(we);
  var ke = (0, c.Z)(Ee, 2);
  var Se = ke[0];
  var Te = ke[1];
  var _e = p.useRef(null);
  var Oe = (0, m.Z)(false, {
    value: N,
    defaultValue: R,
    postState: function (e) {
      return !L && e;
    },
    onChange: function (e) {
      if (Y) {
        Y(e);
      }
      if (!e && _e.current && _e.current.onClose) {
        _e.current.onClose();
      }
    }
  });
  var Me = (0, c.Z)(Oe, 2);
  var Pe = Me[0];
  var qe = Me[1];
  var Ne = Dt(Se, {
    formatList: pe,
    generateConfig: x,
    locale: E
  });
  var Re = (0, c.Z)(Ne, 2);
  var Ie = Re[0];
  var je = Re[1];
  var De = It({
    valueTexts: Ie,
    onTextChange: function (e) {
      var t = he(e, {
        locale: E,
        formatList: pe,
        generateConfig: x
      });
      if (!!t && (!F || !F(t))) {
        Te(t);
      }
    }
  });
  var Le = (0, c.Z)(De, 3);
  var Fe = Le[0];
  var Ze = Le[1];
  var ze = Le[2];
  function Ue(e) {
    Te(e);
    xe(e);
    if (W && !fe(x, we, e)) {
      W(e, e ? ye(e, {
        generateConfig: x,
        locale: E,
        format: pe[0]
      }) : "");
    }
  }
  function Be(e) {
    if (!L || !e) {
      qe(e);
    }
  }
  function Ve(e) {
    if (Pe && _e.current && _e.current.onKeyDown) {
      return _e.current.onKeyDown(e);
    } else {
      (0, g.ZP)(false, "Picker not correct forward KeyDown operation. Please help to fire issue about this.");
      return false;
    }
  }
  function He() {
    for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
      t[r] = arguments[r];
    }
    if (re !== null && re !== undefined) {
      re.apply(undefined, t);
    }
    if (le.current) {
      le.current.focus();
      Be(true);
    }
  }
  var We = Rt({
    blurToCancel: ce,
    open: Pe,
    value: Fe,
    triggerOpen: Be,
    forwardKeyDown: Ve,
    isClickOutside: function (e) {
      return !J([de.current, ge.current, me.current], e);
    },
    onSubmit: function () {
      return !!Se && (!F || !F(Se)) && (Ue(Se), Be(false), ze(), true);
    },
    onCancel: function () {
      Be(false);
      Te(we);
      ze();
    },
    onKeyDown: function (e, t) {
      if (ne !== null && ne !== undefined) {
        ne(e, t);
      }
    },
    onFocus: Q,
    onBlur: $
  });
  var Ye = (0, c.Z)(We, 2);
  var Qe = Ye[0];
  var $e = Ye[1];
  var Ge = $e.focused;
  var Ke = $e.typing;
  p.useEffect(function () {
    if (!Pe) {
      Te(we);
      if (Ie.length && Ie[0] !== "") {
        if (je !== Fe) {
          ze();
        }
      } else {
        Ze("");
      }
    }
  }, [Pe, Ie]);
  p.useEffect(function () {
    if (!Pe) {
      ze();
    }
  }, [_]);
  p.useEffect(function () {
    Te(we);
  }, [we]);
  if (V) {
    V.current = {
      focus: function () {
        if (le.current) {
          le.current.focus();
        }
      },
      blur: function () {
        if (le.current) {
          le.current.blur();
        }
      }
    };
  }
  var Je = Lt(Fe, {
    formatList: pe,
    generateConfig: x,
    locale: E
  });
  var Xe = (0, c.Z)(Je, 3);
  var et = Xe[0];
  var tt = Xe[1];
  var rt = Xe[2];
  var nt = (0, l.Z)((0, l.Z)({}, e), {}, {
    className: undefined,
    style: undefined,
    pickerValue: undefined,
    onPickerValueChange: undefined,
    onChange: null
  });
  var it = p.createElement(Ot, (0, s.Z)({}, nt, {
    generateConfig: x,
    className: f((0, u.Z)({}, `${n}-panel-focused`, !Ke)),
    value: Se,
    locale: E,
    tabIndex: -1,
    onSelect: function (e) {
      if (ie !== null && ie !== undefined) {
        ie(e);
      }
      Te(e);
    },
    direction: oe,
    onPanelChange: function (t, r) {
      var n = e.onPanelChange;
      rt(true);
      if (n !== null && n !== undefined) {
        n(t, r);
      }
    }
  }));
  if (H) {
    it = H(it);
  }
  var ot;
  var at;
  var st = p.createElement("div", {
    className: `${n}-panel-container`,
    onMouseDown: function (e) {
      e.preventDefault();
    }
  }, it);
  if (j) {
    ot = p.createElement("span", {
      className: `${n}-suffix`
    }, j);
  }
  if (S && we && !L) {
    at = p.createElement("span", {
      onMouseDown: function (e) {
        e.preventDefault();
        e.stopPropagation();
      },
      onMouseUp: function (e) {
        e.preventDefault();
        e.stopPropagation();
        Ue(null);
        Be(false);
      },
      className: `${n}-clear`,
      role: "button"
    }, D || p.createElement("span", {
      className: `${n}-clear-btn`
    }));
  }
  var ut = (0, l.Z)((0, l.Z)((0, l.Z)({
    id: i,
    tabIndex: o,
    disabled: L,
    readOnly: k || typeof pe[0] === "function" || !Ke,
    value: et || Fe,
    onChange: function (e) {
      Ze(e.target.value);
    },
    autoFocus: T,
    placeholder: Z,
    ref: le,
    title: Fe
  }, Qe), {}, {
    size: U(_, pe[0], x)
  }, Ae(e)), {}, {
    autoComplete: se
  });
  var lt = ue ? ue(ut) : p.createElement("input", ut);
  function ct(e, t) {
    if (t === "submit" || t !== "key" && !ce) {
      Ue(e);
      Be(false);
    }
  }
  var pt = oe === "rtl" ? "bottomRight" : "bottomLeft";
  return p.createElement(b.Provider, {
    value: {
      operationRef: _e,
      hideHeader: _ === "time",
      panelRef: de,
      onSelect: ct,
      open: Pe,
      defaultOpenValue: I,
      onDateMouseEnter: tt,
      onDateMouseLeave: rt
    }
  }, p.createElement(Nt, {
    visible: Pe,
    popupElement: st,
    popupStyle: h,
    prefixCls: n,
    dropdownClassName: v,
    dropdownAlign: y,
    getPopupContainer: B,
    transitionName: w,
    popupPlacement: pt,
    direction: oe
  }, p.createElement("div", {
    ref: me,
    className: f(n, d, (t = {}, (0, u.Z)(t, `${n}-disabled`, L), (0, u.Z)(t, `${n}-focused`, Ge), (0, u.Z)(t, `${n}-rtl`, oe === "rtl"), t)),
    style: a,
    onMouseDown: G,
    onMouseUp: K,
    onMouseEnter: X,
    onMouseLeave: ee,
    onContextMenu: te,
    onClick: He
  }, p.createElement("div", {
    className: f(`${n}-input`, (0, u.Z)({}, `${n}-input-placeholder`, !!et)),
    ref: ge
  }, lt, ot, at))));
}
var Zt = function (e) {
  (0, o.Z)(r, e);
  var t = (0, a.Z)(r);
  function r() {
    var e;
    (0, n.Z)(this, r);
    for (var i = arguments.length, o = new Array(i), a = 0; a < i; a++) {
      o[a] = arguments[a];
    }
    e = t.call.apply(t, [this].concat(o));
    e.pickerRef = p.createRef();
    e.focus = function () {
      if (e.pickerRef.current) {
        e.pickerRef.current.focus();
      }
    };
    e.blur = function () {
      if (e.pickerRef.current) {
        e.pickerRef.current.blur();
      }
    };
    return e;
  }
  (0, i.Z)(r, [{
    key: "render",
    value: function () {
      return p.createElement(Ft, (0, s.Z)({}, this.props, {
        pickerRef: this.pickerRef
      }));
    }
  }]);
  return r;
}(p.Component);
var zt = Zt;
function Ut(e, t, r) {
  var n = e.picker;
  var i = e.locale;
  var o = e.selectedValue;
  var a = e.disabledDate;
  var s = e.disabled;
  var u = e.generateConfig;
  var l = _e(o, 0);
  var c = _e(o, 1);
  function d(e) {
    return u.locale.getWeekFirstDate(i.locale, e);
  }
  function f(e) {
    var t = u.getYear(e);
    var r = u.getMonth(e);
    return t * 100 + r;
  }
  function g(e) {
    var t = u.getYear(e);
    var r = se(u, e);
    return t * 10 + r;
  }
  var m = p.useCallback(function (e) {
    if (a && a(e)) {
      return true;
    }
    if (s[1] && c) {
      return !ce(u, e, c) && u.isAfter(e, c);
    }
    if (t && c) {
      switch (n) {
        case "quarter":
          return g(e) > g(c);
        case "month":
          return f(e) > f(c);
        case "week":
          return d(e) > d(c);
        default:
          return !ce(u, e, c) && u.isAfter(e, c);
      }
    }
    return false;
  }, [a, s[1], c, t]);
  var v = p.useCallback(function (e) {
    if (a && a(e)) {
      return true;
    }
    if (s[0] && l) {
      return !ce(u, e, c) && u.isAfter(l, e);
    }
    if (r && l) {
      switch (n) {
        case "quarter":
          return g(e) < g(l);
        case "month":
          return f(e) < f(l);
        case "week":
          return d(e) < d(l);
        default:
          return !ce(u, e, l) && u.isAfter(l, e);
      }
    }
    return false;
  }, [a, s[0], l, r]);
  return [m, v];
}
function Bt(e, t, r, n) {
  var i = ve(e, r, n, 1);
  function o(r) {
    if (r(e, t)) {
      return "same";
    } else if (r(i, t)) {
      return "closing";
    } else {
      return "far";
    }
  }
  switch (r) {
    case "year":
      return o(function (e, t) {
        return oe(n, e, t);
      });
    case "quarter":
    case "month":
      return o(function (e, t) {
        return ae(n, e, t);
      });
    default:
      return o(function (e, t) {
        return le(n, e, t);
      });
  }
}
function Vt(e, t, r, n) {
  var i = _e(e, 0);
  var o = _e(e, 1);
  if (t === 0) {
    return i;
  }
  if (i && o) {
    var a = Bt(i, o, r, n);
    switch (a) {
      case "same":
        return i;
      case "closing":
        return i;
      default:
        return ve(o, r, n, -1);
    }
  }
  return i;
}
function Ht(e) {
  var t = e.values;
  var r = e.picker;
  var n = e.defaultDates;
  var i = e.generateConfig;
  var o = p.useState(function () {
    return [_e(n, 0), _e(n, 1)];
  });
  var a = (0, c.Z)(o, 2);
  var s = a[0];
  var u = a[1];
  var l = p.useState(null);
  var d = (0, c.Z)(l, 2);
  var f = d[0];
  var g = d[1];
  var m = _e(t, 0);
  var v = _e(t, 1);
  function y(e) {
    if (s[e]) {
      return s[e];
    } else {
      return _e(f, e) || Vt(t, e, r, i) || m || v || i.getNow();
    }
  }
  function h(e, r) {
    if (e) {
      var n = Oe(f, e, r);
      u(Oe(s, null, r) || [null, null]);
      var i = (r + 1) % 2;
      if (!_e(t, i)) {
        n = Oe(n, e, i);
      }
      g(n);
    } else if (m || v) {
      g(null);
    }
  }
  return [y, h];
}
function Wt(e, t) {
  if (e && e[0] && e[1] && t.isAfter(e[0], e[1])) {
    return [e[1], e[0]];
  } else {
    return e;
  }
}
function Yt(e, t, r, n) {
  return !!e || !!n && !!n[t] || !!r[(t + 1) % 2];
}
function Qt(e) {
  var t;
  var r;
  var n;
  var i = e.prefixCls;
  var o = i === undefined ? "rc-picker" : i;
  var a = e.id;
  var d = e.style;
  var y = e.className;
  var h = e.popupStyle;
  var w = e.dropdownClassName;
  var x = e.transitionName;
  var E = e.dropdownAlign;
  var k = e.getPopupContainer;
  var S = e.generateConfig;
  var T = e.locale;
  var C = e.placeholder;
  var A = e.autoFocus;
  var _ = e.disabled;
  var O = e.format;
  var M = e.picker;
  var P = M === undefined ? "date" : M;
  var q = e.showTime;
  var N = e.use12Hours;
  var R = e.separator;
  var I = R === undefined ? "~" : R;
  var j = e.value;
  var D = e.defaultValue;
  var L = e.defaultPickerValue;
  var F = e.open;
  var Z = e.defaultOpen;
  var B = e.disabledDate;
  var V = e.disabledTime;
  var H = e.dateRender;
  var W = e.panelRender;
  var Y = e.ranges;
  var Q = e.allowEmpty;
  var $ = e.allowClear;
  var G = e.suffixIcon;
  var K = e.clearIcon;
  var X = e.pickerRef;
  var ee = e.inputReadOnly;
  var te = e.mode;
  var re = e.renderExtraFooter;
  var ne = e.onChange;
  var ie = e.onOpenChange;
  var oe = e.onPanelChange;
  var ae = e.onCalendarChange;
  var se = e.onFocus;
  var le = e.onBlur;
  var pe = e.onMouseDown;
  var ge = e.onMouseUp;
  var me = e.onMouseEnter;
  var be = e.onMouseLeave;
  var we = e.onClick;
  var xe = e.onOk;
  var Ee = e.onKeyDown;
  var ke = e.components;
  var Se = e.order;
  var Te = e.direction;
  var Me = e.activePickerIndex;
  var Pe = e.autoComplete;
  var qe = Pe === undefined ? "off" : Pe;
  var Ne = P === "date" && !!q || P === "time";
  var Re = (0, p.useRef)({});
  var Ie = (0, p.useRef)(null);
  var je = (0, p.useRef)(null);
  var De = (0, p.useRef)(null);
  var Le = (0, p.useRef)(null);
  var Fe = (0, p.useRef)(null);
  var ze = (0, p.useRef)(null);
  var Ue = (0, p.useRef)(null);
  var Be = (0, p.useRef)(null);
  var Ve = Ce(z(O, P, q, N));
  var He = (0, m.Z)(0, {
    value: Me
  });
  var We = (0, c.Z)(He, 2);
  var Ye = We[0];
  var Qe = We[1];
  var $e = (0, p.useRef)(null);
  var Ge = p.useMemo(function () {
    if (Array.isArray(_)) {
      return _;
    } else {
      return [_ || false, _ || false];
    }
  }, [_]);
  var Ke = (0, m.Z)(null, {
    value: j,
    defaultValue: D,
    postState: function (e) {
      if (P !== "time" || Se) {
        return Wt(e, S);
      } else {
        return e;
      }
    }
  });
  var Je = (0, c.Z)(Ke, 2);
  var Xe = Je[0];
  var et = Je[1];
  var tt = Ht({
    values: Xe,
    picker: P,
    defaultDates: L,
    generateConfig: S
  });
  var rt = (0, c.Z)(tt, 2);
  var nt = rt[0];
  var it = rt[1];
  var ot = (0, m.Z)(Xe, {
    postState: function (e) {
      var t = e;
      if (Ge[0] && Ge[1]) {
        return t;
      }
      for (var r = 0; r < 2; r += 1) {
        if (!!Ge[r] && !t && !_e(t, r) && !_e(Q, r)) {
          t = Oe(t, S.getNow(), r);
        }
      }
      return t;
    }
  });
  var at = (0, c.Z)(ot, 2);
  var st = at[0];
  var ut = at[1];
  var lt = (0, m.Z)([P, P], {
    value: te
  });
  var ct = (0, c.Z)(lt, 2);
  var pt = ct[0];
  var dt = ct[1];
  (0, p.useEffect)(function () {
    dt([P, P]);
  }, [P]);
  function ft(e, t) {
    dt(e);
    if (oe) {
      oe(t, e);
    }
  }
  var gt = Ut({
    picker: P,
    selectedValue: st,
    locale: T,
    disabled: Ge,
    disabledDate: B,
    generateConfig: S
  }, Re.current[1], Re.current[0]);
  var mt = (0, c.Z)(gt, 2);
  var vt = mt[0];
  var yt = mt[1];
  var ht = (0, m.Z)(false, {
    value: F,
    defaultValue: Z,
    postState: function (e) {
      return !Ge[Ye] && e;
    },
    onChange: function (e) {
      if (ie) {
        ie(e);
      }
      if (!e && $e.current && $e.current.onClose) {
        $e.current.onClose();
      }
    }
  });
  var bt = (0, c.Z)(ht, 2);
  var wt = bt[0];
  var xt = bt[1];
  var Et = wt && Ye === 0;
  var kt = wt && Ye === 1;
  var St = (0, p.useState)(0);
  var At = (0, c.Z)(St, 2);
  var _t = At[0];
  var Mt = At[1];
  (0, p.useEffect)(function () {
    if (!wt && Ie.current) {
      Mt(Ie.current.offsetWidth);
    }
  }, [wt]);
  var Pt = p.useRef();
  function qt(e, t) {
    if (e) {
      clearTimeout(Pt.current);
      Re.current[t] = true;
      Qe(t);
      xt(e);
      if (!wt) {
        it(null, t);
      }
    } else if (Ye === t) {
      xt(e);
      var r = Re.current;
      Pt.current = setTimeout(function () {
        if (r === Re.current) {
          Re.current = {};
        }
      });
    }
  }
  function jt(e) {
    qt(true, e);
    setTimeout(function () {
      var t = [ze, Ue][e];
      if (t.current) {
        t.current.focus();
      }
    }, 0);
  }
  function Ft(e, t) {
    var r = e;
    var n = _e(r, 0);
    var i = _e(r, 1);
    if (n && i && S.isAfter(n, i)) {
      if (P === "week" && !de(S, T.locale, n, i) || P === "quarter" && !ue(S, n, i) || P !== "week" && P !== "quarter" && P !== "time" && !ce(S, n, i)) {
        if (t === 0) {
          r = [n, null];
          i = null;
        } else {
          n = null;
          r = [null, i];
        }
        Re.current = (0, u.Z)({}, t, true);
      } else if (P !== "time" || Se !== false) {
        r = Wt(r, S);
      }
    }
    ut(r);
    var o = r && r[0] ? ye(r[0], {
      generateConfig: S,
      locale: T,
      format: Ve[0]
    }) : "";
    var a = r && r[1] ? ye(r[1], {
      generateConfig: S,
      locale: T,
      format: Ve[0]
    }) : "";
    if (ae) {
      var s = {
        range: t === 0 ? "start" : "end"
      };
      ae(r, [o, a], s);
    }
    var l = Yt(n, 0, Ge, Q);
    var c = Yt(i, 1, Ge, Q);
    var p = r === null || l && c;
    if (p) {
      et(r);
      if (!!ne && (!fe(S, _e(Xe, 0), n) || !fe(S, _e(Xe, 1), i))) {
        ne(r, [o, a]);
      }
    }
    var d = null;
    if (t !== 0 || Ge[1]) {
      if (t === 1 && !Ge[0]) {
        d = 0;
      }
    } else {
      d = 1;
    }
    if (d === null || d === Ye || Re.current[d] && _e(r, d) || !_e(r, t)) {
      qt(false, t);
    } else {
      jt(d);
    }
  }
  function Zt(e) {
    if (wt && $e.current && $e.current.onKeyDown) {
      return $e.current.onKeyDown(e);
    } else {
      (0, g.ZP)(false, "Picker not correct forward KeyDown operation. Please help to fire issue about this.");
      return false;
    }
  }
  var zt = {
    formatList: Ve,
    generateConfig: S,
    locale: T
  };
  var Bt = Dt(_e(st, 0), zt);
  var Vt = (0, c.Z)(Bt, 2);
  var Qt = Vt[0];
  var $t = Vt[1];
  var Gt = Dt(_e(st, 1), zt);
  var Kt = (0, c.Z)(Gt, 2);
  var Jt = Kt[0];
  var Xt = Kt[1];
  function er(e, t) {
    var r = he(e, {
      locale: T,
      formatList: Ve,
      generateConfig: S
    });
    var n = t === 0 ? vt : yt;
    if (r && !n(r)) {
      ut(Oe(st, r, t));
      it(r, t);
    }
  }
  var tr = It({
    valueTexts: Qt,
    onTextChange: function (e) {
      return er(e, 0);
    }
  });
  var rr = (0, c.Z)(tr, 3);
  var nr = rr[0];
  var ir = rr[1];
  var or = rr[2];
  var ar = It({
    valueTexts: Jt,
    onTextChange: function (e) {
      return er(e, 1);
    }
  });
  var sr = (0, c.Z)(ar, 3);
  var ur = sr[0];
  var lr = sr[1];
  var cr = sr[2];
  var pr = (0, p.useState)(null);
  var dr = (0, c.Z)(pr, 2);
  var fr = dr[0];
  var gr = dr[1];
  var mr = (0, p.useState)(null);
  var vr = (0, c.Z)(mr, 2);
  var yr = vr[0];
  var hr = vr[1];
  var br = Lt(nr, {
    formatList: Ve,
    generateConfig: S,
    locale: T
  });
  var wr = (0, c.Z)(br, 3);
  var xr = wr[0];
  var Er = wr[1];
  var kr = wr[2];
  var Sr = Lt(ur, {
    formatList: Ve,
    generateConfig: S,
    locale: T
  });
  var Tr = (0, c.Z)(Sr, 3);
  var Cr = Tr[0];
  var Ar = Tr[1];
  var _r = Tr[2];
  function Or(e) {
    hr(Oe(st, e, Ye));
    if (Ye === 0) {
      Er(e);
    } else {
      Ar(e);
    }
  }
  function Mr() {
    hr(Oe(st, null, Ye));
    if (Ye === 0) {
      kr();
    } else {
      _r();
    }
  }
  function Pr(e, t) {
    return {
      blurToCancel: Ne,
      forwardKeyDown: Zt,
      onBlur: le,
      isClickOutside: function (e) {
        return !J([je.current, De.current, Le.current, Ie.current], e);
      },
      onFocus: function (t) {
        Qe(e);
        if (se) {
          se(t);
        }
      },
      triggerOpen: function (t) {
        qt(t, e);
      },
      onSubmit: function () {
        if (!st || B && B(st[e])) {
          return false;
        }
        Ft(st, e);
        t();
      },
      onCancel: function () {
        qt(false, e);
        ut(Xe);
        t();
      }
    };
  }
  var qr = (0, p.useRef)("");
  var Nr = Rt((0, l.Z)((0, l.Z)({}, Pr(0, or)), {}, {
    open: Et,
    value: nr,
    currentFocusedKey: qr,
    key: "start",
    onKeyDown: function (e, t) {
      if (Ee !== null && Ee !== undefined) {
        Ee(e, t);
      }
    }
  }));
  var Rr = (0, c.Z)(Nr, 2);
  var Ir = Rr[0];
  var jr = Rr[1];
  var Dr = jr.focused;
  var Lr = jr.typing;
  var Fr = Rt((0, l.Z)((0, l.Z)({}, Pr(1, cr)), {}, {
    open: kt,
    value: ur,
    currentFocusedKey: qr,
    key: "end",
    onKeyDown: function (e, t) {
      if (Ee !== null && Ee !== undefined) {
        Ee(e, t);
      }
    }
  }));
  var Zr = (0, c.Z)(Fr, 2);
  var zr = Zr[0];
  var Ur = Zr[1];
  var Br = Ur.focused;
  var Vr = Ur.typing;
  function Hr(e) {
    if (we) {
      we(e);
    }
    if (!wt && !ze.current.contains(e.target) && !Ue.current.contains(e.target)) {
      if (Ge[0]) {
        if (!Ge[1]) {
          jt(1);
        }
      } else {
        jt(0);
      }
    }
  }
  function Wr(e) {
    if (pe) {
      pe(e);
    }
    if (!!wt && (!!Dr || !!Br) && !ze.current.contains(e.target) && !Ue.current.contains(e.target)) {
      e.preventDefault();
    }
  }
  var Yr = Xe && Xe[0] ? ye(Xe[0], {
    locale: T,
    format: "YYYYMMDDHHmmss",
    generateConfig: S
  }) : "";
  var Qr = Xe && Xe[1] ? ye(Xe[1], {
    locale: T,
    format: "YYYYMMDDHHmmss",
    generateConfig: S
  }) : "";
  (0, p.useEffect)(function () {
    if (!wt) {
      ut(Xe);
      if (Qt.length && Qt[0] !== "") {
        if ($t !== nr) {
          or();
        }
      } else {
        ir("");
      }
      if (Jt.length && Jt[0] !== "") {
        if (Xt !== ur) {
          cr();
        }
      } else {
        lr("");
      }
    }
  }, [wt, Qt, Jt]);
  (0, p.useEffect)(function () {
    ut(Xe);
  }, [Yr, Qr]);
  if (X) {
    X.current = {
      focus: function () {
        if (ze.current) {
          ze.current.focus();
        }
      },
      blur: function () {
        if (ze.current) {
          ze.current.blur();
        }
        if (Ue.current) {
          Ue.current.blur();
        }
      }
    };
  }
  var $r = Object.keys(Y || {});
  var Gr = $r.map(function (e) {
    var t = Y[e];
    var r = typeof t === "function" ? t() : t;
    return {
      label: e,
      onClick: function () {
        Ft(r, null);
        qt(false, Ye);
      },
      onMouseEnter: function () {
        gr(r);
      },
      onMouseLeave: function () {
        gr(null);
      }
    };
  });
  function Kr(t = false, r = {}) {
    var n = null;
    if (wt && yr && yr[0] && yr[1] && S.isAfter(yr[1], yr[0])) {
      n = yr;
    }
    var i = q;
    if (q && (0, v.Z)(q) === "object" && q.defaultValue) {
      var a = q.defaultValue;
      i = (0, l.Z)((0, l.Z)({}, q), {}, {
        defaultValue: _e(a, Ye) || undefined
      });
    }
    var c = null;
    if (H) {
      c = function (e, t) {
        return H(e, t, {
          range: Ye ? "end" : "start"
        });
      };
    }
    return p.createElement(Ze.Provider, {
      value: {
        inRange: true,
        panelPosition: t,
        rangedValue: fr || st,
        hoverRangedValue: n
      }
    }, p.createElement(Ot, (0, s.Z)({}, e, r, {
      dateRender: c,
      showTime: i,
      mode: pt[Ye],
      generateConfig: S,
      style: undefined,
      direction: Te,
      disabledDate: Ye === 0 ? vt : yt,
      disabledTime: function (e) {
        return !!V && V(e, Ye === 0 ? "start" : "end");
      },
      className: f((0, u.Z)({}, `${o}-panel-focused`, Ye === 0 ? !Lr : !Vr)),
      value: _e(st, Ye),
      locale: T,
      tabIndex: -1,
      onPanelChange: function (e, r) {
        if (Ye === 0) {
          kr(true);
        }
        if (Ye === 1) {
          _r(true);
        }
        ft(Oe(pt, r, Ye), Oe(st, e, Ye));
        var n = e;
        if (t === "right" && pt[Ye] === r) {
          n = ve(n, r, S, -1);
        }
        it(n, Ye);
      },
      onOk: null,
      onSelect: undefined,
      onChange: undefined,
      defaultValue: _e(st, Ye === 0 ? 1 : 0)
    })));
  }
  var Jr = 0;
  var Xr = 0;
  if (Ye && De.current && Fe.current && je.current) {
    Jr = De.current.offsetWidth + Fe.current.offsetWidth;
    var en = Be.current.offsetLeft > Jr ? Be.current.offsetLeft - Jr : Be.current.offsetLeft;
    if (je.current.offsetWidth && Be.current.offsetWidth && Jr > je.current.offsetWidth - Be.current.offsetWidth - (Te === "rtl" ? 0 : en)) {
      Xr = Jr;
    }
  }
  var tn = Te === "rtl" ? {
    right: Jr
  } : {
    left: Jr
  };
  function rn() {
    var e;
    var t = Tt(o, pt[Ye], re);
    var r = Ct({
      prefixCls: o,
      components: ke,
      needConfirmButton: Ne,
      okDisabled: !_e(st, Ye) || B && B(st[Ye]),
      locale: T,
      rangeList: Gr,
      onOk: function () {
        if (_e(st, Ye)) {
          Ft(st, Ye);
          if (xe) {
            xe(st);
          }
        }
      }
    });
    if (P === "time" || q) {
      e = Kr();
    } else {
      var n = nt(Ye);
      var i = ve(n, P, S);
      var a = pt[Ye];
      var s = a === P;
      var u = Kr(!!s && "left", {
        pickerValue: n,
        onPickerValueChange: function (e) {
          it(e, Ye);
        }
      });
      var l = Kr("right", {
        pickerValue: i,
        onPickerValueChange: function (e) {
          it(ve(e, P, S, -1), Ye);
        }
      });
      e = Te === "rtl" ? p.createElement(p.Fragment, null, l, s && u) : p.createElement(p.Fragment, null, u, s && l);
    }
    var c = p.createElement(p.Fragment, null, p.createElement("div", {
      className: `${o}-panels`
    }, e), (t || r) && p.createElement("div", {
      className: `${o}-footer`
    }, t, r));
    if (W) {
      c = W(c);
    }
    return p.createElement("div", {
      className: `${o}-panel-container`,
      style: {
        marginLeft: Xr
      },
      ref: je,
      onMouseDown: function (e) {
        e.preventDefault();
      }
    }, c);
  }
  var nn;
  var on;
  var an = p.createElement("div", {
    className: f(`${o}-range-wrapper`, `${o}-${P}-range-wrapper`),
    style: {
      minWidth: _t
    }
  }, p.createElement("div", {
    ref: Be,
    className: `${o}-range-arrow`,
    style: tn
  }), rn());
  if (G) {
    nn = p.createElement("span", {
      className: `${o}-suffix`
    }, G);
  }
  if ($ && (_e(Xe, 0) && !Ge[0] || _e(Xe, 1) && !Ge[1])) {
    on = p.createElement("span", {
      onMouseDown: function (e) {
        e.preventDefault();
        e.stopPropagation();
      },
      onMouseUp: function (e) {
        e.preventDefault();
        e.stopPropagation();
        var t = Xe;
        if (!Ge[0]) {
          t = Oe(t, null, 0);
        }
        if (!Ge[1]) {
          t = Oe(t, null, 1);
        }
        Ft(t, null);
        qt(false, Ye);
      },
      className: `${o}-clear`
    }, K || p.createElement("span", {
      className: `${o}-clear-btn`
    }));
  }
  var sn = {
    size: U(P, Ve[0], S)
  };
  var un = 0;
  var ln = 0;
  if (De.current && Le.current && Fe.current) {
    if (Ye === 0) {
      ln = De.current.offsetWidth;
    } else {
      un = Jr;
      ln = Le.current.offsetWidth;
    }
  }
  var cn = Te === "rtl" ? {
    right: un
  } : {
    left: un
  };
  function pn(e, t) {
    var r = Oe(st, e, Ye);
    if (t === "submit" || t !== "key" && !Ne) {
      Ft(r, Ye);
      if (Ye === 0) {
        kr();
      } else {
        _r();
      }
    } else {
      ut(r);
    }
  }
  return p.createElement(b.Provider, {
    value: {
      operationRef: $e,
      hideHeader: P === "time",
      onDateMouseEnter: Or,
      onDateMouseLeave: Mr,
      hideRanges: true,
      onSelect: pn,
      open: wt
    }
  }, p.createElement(Nt, {
    visible: wt,
    popupElement: an,
    popupStyle: h,
    prefixCls: o,
    dropdownClassName: w,
    dropdownAlign: E,
    getPopupContainer: k,
    transitionName: x,
    range: true,
    direction: Te
  }, p.createElement("div", (0, s.Z)({
    ref: Ie,
    className: f(o, `${o}-range`, y, (t = {}, (0, u.Z)(t, `${o}-disabled`, Ge[0] && Ge[1]), (0, u.Z)(t, `${o}-focused`, Ye === 0 ? Dr : Br), (0, u.Z)(t, `${o}-rtl`, Te === "rtl"), t)),
    style: d,
    onClick: Hr,
    onMouseEnter: me,
    onMouseLeave: be,
    onMouseDown: Wr,
    onMouseUp: ge
  }, Ae(e)), p.createElement("div", {
    className: f(`${o}-input`, (r = {}, (0, u.Z)(r, `${o}-input-active`, Ye === 0), (0, u.Z)(r, `${o}-input-placeholder`, !!xr), r)),
    ref: De
  }, p.createElement("input", (0, s.Z)({
    id: a,
    disabled: Ge[0],
    readOnly: ee || typeof Ve[0] === "function" || !Lr,
    value: xr || nr,
    onChange: function (e) {
      ir(e.target.value);
    },
    autoFocus: A,
    placeholder: _e(C, 0) || "",
    ref: ze
  }, Ir, sn, {
    autoComplete: qe
  }))), p.createElement("div", {
    className: `${o}-range-separator`,
    ref: Fe
  }, I), p.createElement("div", {
    className: f(`${o}-input`, (n = {}, (0, u.Z)(n, `${o}-input-active`, Ye === 1), (0, u.Z)(n, `${o}-input-placeholder`, !!Cr), n)),
    ref: Le
  }, p.createElement("input", (0, s.Z)({
    disabled: Ge[1],
    readOnly: ee || typeof Ve[0] === "function" || !Vr,
    value: Cr || ur,
    onChange: function (e) {
      lr(e.target.value);
    },
    placeholder: _e(C, 1) || "",
    ref: Ue
  }, zr, sn, {
    autoComplete: qe
  }))), p.createElement("div", {
    className: `${o}-active-bar`,
    style: (0, l.Z)((0, l.Z)({}, cn), {}, {
      width: ln,
      position: "absolute"
    })
  }), nn, on)));
}
var $t = function (e) {
  (0, o.Z)(r, e);
  var t = (0, a.Z)(r);
  function r() {
    var e;
    (0, n.Z)(this, r);
    for (var i = arguments.length, o = new Array(i), a = 0; a < i; a++) {
      o[a] = arguments[a];
    }
    e = t.call.apply(t, [this].concat(o));
    e.pickerRef = p.createRef();
    e.focus = function () {
      if (e.pickerRef.current) {
        e.pickerRef.current.focus();
      }
    };
    e.blur = function () {
      if (e.pickerRef.current) {
        e.pickerRef.current.blur();
      }
    };
    return e;
  }
  (0, i.Z)(r, [{
    key: "render",
    value: function () {
      return p.createElement(Qt, (0, s.Z)({}, this.props, {
        pickerRef: this.pickerRef
      }));
    }
  }]);
  return r;
}(p.Component);
var Gt = $t;
var Kt = zt;
};
