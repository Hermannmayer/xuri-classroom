// webpack module 46026 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Vb: function () {
    return Ha;
  },
  zx: function () {
    return rs;
  },
  Zb: function () {
    return os;
  },
  Vq: function () {
    return $s;
  },
  HY: function () {
    return Xs;
  },
  l0: function () {
    return ud;
  },
  Ee: function () {
    return qs;
  },
  v_: function () {
    return wd;
  },
  II: function () {
    return Cd;
  },
  aV: function () {
    return su;
  },
  u_: function () {
    return zd;
  },
  l2: function () {
    return Wd;
  },
  cW: function () {
    return qf;
  },
  GI: function () {
    return xa;
  },
  ko: function () {
    return jf;
  },
  t8: function () {
    return zf;
  },
  Qf: function () {
    return Kf;
  },
  tq: function () {
    return fg;
  },
  rs: function () {
    return hg;
  },
  nj: function () {
    return Ag;
  },
  mQ: function () {
    return Ig;
  },
  Kx: function () {
    return em;
  },
  FN: function () {
    return fm;
  }
});
require("./74506.js");
var n = typeof window !== "undefined" && typeof document !== "undefined" && !!window.document && !!window.document.createElement;
if (n) {
  document.addEventListener("touchstart", function () {}, true);
}
require("./7660.js");
function i(e, t) {
  var r = e;
  for (var n in t) {
    if (t.hasOwnProperty(n)) {
      r[n] = t[n];
    }
  }
  return r;
}
var o = require("./21487.js");
var a = require("./59496.js");
var s = require("./38399.js");
var u = s;
function l(e, t) {
  var r = Object.assign({}, t.props);
  if (e.className) {
    r.className = u(t.props.className, e.className);
  }
  if (e.style) {
    r.style = Object.assign(Object.assign({}, r.style), e.style);
  }
  if (e.tabIndex !== undefined) {
    r.tabIndex = e.tabIndex;
  }
  for (var n in e) {
    if (e.hasOwnProperty(n) && (n.startsWith("data-") || n.startsWith("aria-"))) {
      r[n] = e[n];
    }
  }
  return a.cloneElement(t, r);
}
function c() {
  var e = {};
  for (var t = arguments.length, r = new Array(t), n = 0; n < t; n++) {
    r[n] = arguments[n];
  }
  r.forEach(function (t) {
    Object.keys(t).forEach(function (r) {
      if (t[r] !== undefined) {
        e[r] = t[r];
      }
    });
  });
  return e;
}
require("./65596.js");
var p = require("./23874.js");
var d = typeof window !== "undefined" && !!window.document && !!window.document.createElement;
var f = d;
var g = f ? a.useLayoutEffect : a.useEffect;
var m = g;
function v() {
  var e = (0, a.useRef)(false);
  (0, a.useEffect)(function () {
    e.current = false;
    return function () {
      e.current = true;
    };
  }, []);
  return e;
}
var y = v;
require("./65027.js");
var h = 10;
function b(e, t) {
  if (e > t && e > h) {
    return "horizontal";
  } else if (t > e && t > h) {
    return "vertical";
  } else {
    return "";
  }
}
function w() {
  var e = (0, a.useRef)(0);
  var t = (0, a.useRef)(0);
  var r = (0, a.useRef)(0);
  var n = (0, a.useRef)(0);
  var i = (0, a.useRef)(0);
  var o = (0, a.useRef)(0);
  var s = (0, a.useRef)("");
  function u() {
    return s.current === "vertical";
  }
  function l() {
    return s.current === "horizontal";
  }
  function c() {
    r.current = 0;
    n.current = 0;
    i.current = 0;
    o.current = 0;
    s.current = "";
  }
  function p(r) {
    c();
    e.current = r.touches[0].clientX;
    t.current = r.touches[0].clientY;
  }
  function d(a) {
    var u = a.touches[0];
    r.current = u.clientX < 0 ? 0 : u.clientX - e.current;
    n.current = u.clientY - t.current;
    i.current = Math.abs(r.current);
    o.current = Math.abs(n.current);
    s.current ||= b(i.current, o.current);
  }
  return {
    move: d,
    start: p,
    reset: c,
    startX: e,
    startY: t,
    deltaX: r,
    deltaY: n,
    offsetX: i,
    offsetY: o,
    direction: s,
    isVertical: u,
    isHorizontal: l
  };
}
var x = n ? window : undefined;
var E = ["scroll", "auto", "overlay"];
function k(e) {
  var t = 1;
  return e.nodeType === t;
}
function S(e, t = x) {
  var r = e;
  while (r && r !== t && k(r)) {
    if (r === document.body) {
      return t;
    }
    var n = window.getComputedStyle(r);
    var i = n.overflowY;
    if (E.includes(i) && r.scrollHeight > r.clientHeight) {
      return r;
    }
    r = r.parentNode;
  }
  return t;
}
var T = false;
if (n) {
  try {
    var C = {};
    Object.defineProperty(C, "passive", {
      get: function () {
        T = true;
      }
    });
    window.addEventListener("test-passive", null, C);
  } catch (jg) {}
}
var A = 0;
var _ = "adm-overflow-hidden";
function O(e) {
  var t = e?.parentElement;
  while (t) {
    if (t.clientHeight < t.scrollHeight) {
      return t;
    }
    t = t.parentElement;
  }
  return null;
}
function M(e, t) {
  var r = w();
  function n(n) {
    r.move(n);
    var i = r.deltaY.current > 0 ? "10" : "01";
    var o = S(n.target, e.current);
    if (o) {
      if (t === "strict") {
        var a = O(n.target);
        if (a === document.body || a === document.documentElement) {
          n.preventDefault();
          return;
        }
      }
      var s = o.scrollHeight;
      var u = o.offsetHeight;
      var l = o.scrollTop;
      var c = o.getBoundingClientRect();
      var p = c.height;
      var d = "11";
      if (l === 0) {
        d = u >= s ? "00" : "01";
      } else if (s <= Math.round(p + l)) {
        d = "10";
      }
      if (d !== "11" && !!r.isVertical() && !(parseInt(d, 2) & parseInt(i, 2))) {
        if (n.cancelable && T) {
          n.preventDefault();
        }
      }
    }
  }
  function i() {
    document.addEventListener("touchstart", r.start);
    document.addEventListener("touchmove", n, !!T && {
      passive: false
    });
    if (!A) {
      document.body.classList.add(_);
    }
    A++;
  }
  function o() {
    if (A) {
      document.removeEventListener("touchstart", r.start);
      document.removeEventListener("touchmove", n);
      A--;
      if (!A) {
        document.body.classList.remove(_);
      }
    }
  }
  (0, a.useEffect)(function () {
    if (t) {
      i();
      return function () {
        o();
      };
    }
  }, [t]);
}
var P = require("./45810.js");
var q = require("./8951.js");
var N = require("./78212.js");
var R = require("./19746.js");
var I = require("./39695.js");
var j = require("./66439.js");
var D = require("./79276.js");
var L = require("./53691.js");
var F = require("./231.js");
function Z(e) {
  try {
    return Function.toString.call(e).indexOf("[native code]") !== -1;
  } catch (Dg) {
    return typeof e == "function";
  }
}
var z = require("./71258.js");
function U(e) {
  var t = typeof Map == "function" ? new Map() : undefined;
  U = function (e) {
    if (e === null || !Z(e)) {
      return e;
    }
    if (typeof e != "function") {
      throw new TypeError("Super expression must either be null or a function");
    }
    if (t !== undefined) {
      if (t.has(e)) {
        return t.get(e);
      }
      t.set(e, r);
    }
    function r() {
      return (0, z.Z)(e, arguments, (0, L.Z)(this).constructor);
    }
    r.prototype = Object.create(e.prototype, {
      constructor: {
        value: r,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    return (0, F.Z)(r, e);
  };
  return U(e);
}
var B = require("./92145.js");
var V = require("./23639.js");
var H = require("./43386.js");
var W = le();
function Y(e) {
  return ie(e, W);
}
var Q = le();
Y.write = function (e) {
  return ie(e, Q);
};
var $ = le();
Y.onStart = function (e) {
  return ie(e, $);
};
var G = le();
Y.onFrame = function (e) {
  return ie(e, G);
};
var K = le();
Y.onFinish = function (e) {
  return ie(e, K);
};
var J = [];
Y.setTimeout = function (e, t) {
  var r = Y.now() + t;
  var n = function e() {
    var t = J.findIndex(function (t) {
      return t.cancel == e;
    });
    if (~t) {
      J.splice(t, 1);
    }
    re -= ~t ? 1 : 0;
  };
  var i = {
    time: r,
    handler: e,
    cancel: n
  };
  J.splice(X(r), 0, i);
  re += 1;
  oe();
  return i;
};
function X(e) {
  return ~(~J.findIndex(function (t) {
    return t.time > e;
  }) || ~J.length);
}
Y.cancel = function (e) {
  $.delete(e);
  G.delete(e);
  K.delete(e);
  W.delete(e);
  Q.delete(e);
};
Y.sync = function (e) {
  ne = true;
  Y.batchedUpdates(e);
  ne = false;
};
Y.throttle = function (e) {
  var t;
  function r() {
    try {
      e.apply(undefined, (0, j.Z)(t));
    } finally {
      t = null;
    }
  }
  function n() {
    for (var e = arguments.length, n = new Array(e), i = 0; i < e; i++) {
      n[i] = arguments[i];
    }
    t = n;
    Y.onStart(r);
  }
  n.handler = e;
  n.cancel = function () {
    $.delete(r);
    t = null;
  };
  return n;
};
var ee = typeof window != "undefined" ? window.requestAnimationFrame : function () {};
Y.use = function (e) {
  return ee = e;
};
Y.now = typeof performance != "undefined" ? function () {
  return performance.now();
} : Date.now;
Y.batchedUpdates = function (e) {
  return e();
};
Y.catch = console.error;
Y.frameLoop = "always";
Y.advance = function () {
  if (Y.frameLoop !== "demand") {
    console.warn("Cannot call the manual advancement of rafz whilst frameLoop is not set as demand");
  } else {
    ue();
  }
};
var te = -1;
var re = 0;
var ne = false;
function ie(e, t) {
  if (ne) {
    t.delete(e);
    e(0);
  } else {
    t.add(e);
    oe();
  }
}
function oe() {
  if (te < 0) {
    te = 0;
    if (Y.frameLoop !== "demand") {
      ee(se);
    }
  }
}
function ae() {
  te = -1;
}
function se() {
  if (~te) {
    ee(se);
    Y.batchedUpdates(ue);
  }
}
function ue() {
  var e = te;
  te = Y.now();
  var t = X(te);
  if (t) {
    ce(J.splice(0, t), function (e) {
      return e.handler();
    });
    re -= t;
  }
  if (re) {
    $.flush();
    W.flush(e ? Math.min(64, te - e) : 16.667);
    G.flush();
    Q.flush();
    K.flush();
  } else {
    ae();
  }
}
function le() {
  var e = new Set();
  var t = e;
  return {
    add: function (r) {
      re += t != e || e.has(r) ? 0 : 1;
      e.add(r);
    },
    delete: function (r) {
      re -= t == e && e.has(r) ? 1 : 0;
      return e.delete(r);
    },
    flush: function (r) {
      if (t.size) {
        e = new Set();
        re -= t.size;
        ce(t, function (t) {
          return t(r) && e.add(t);
        });
        re += e.size;
        t = e;
      }
    }
  };
}
function ce(e, t) {
  e.forEach(function (e) {
    try {
      t(e);
    } catch (jg) {
      Y.catch(jg);
    }
  });
}
function pe() {}
function de(e, t, r) {
  return Object.defineProperty(e, t, {
    value: r,
    writable: true,
    configurable: true
  });
}
var fe = {
  arr: Array.isArray,
  obj: function (e) {
    return !!e && e.constructor.name === "Object";
  },
  fun: function (e) {
    return typeof e === "function";
  },
  str: function (e) {
    return typeof e === "string";
  },
  num: function (e) {
    return typeof e === "number";
  },
  und: function (e) {
    return e === undefined;
  }
};
function ge(e, t) {
  if (fe.arr(e)) {
    if (!fe.arr(t) || e.length !== t.length) {
      return false;
    }
    for (var r = 0; r < e.length; r++) {
      if (e[r] !== t[r]) {
        return false;
      }
    }
    return true;
  }
  return e === t;
}
function me(e, t) {
  return e.forEach(t);
}
function ve(e, t, r) {
  if (fe.arr(e)) {
    for (var n = 0; n < e.length; n++) {
      t.call(r, e[n], `${n}`);
    }
  } else {
    for (var i in e) {
      if (e.hasOwnProperty(i)) {
        t.call(r, e[i], i);
      }
    }
  }
}
function ye(e) {
  if (fe.und(e)) {
    return [];
  } else if (fe.arr(e)) {
    return e;
  } else {
    return [e];
  }
}
function he(e, t) {
  if (e.size) {
    var r = Array.from(e);
    e.clear();
    me(r, t);
  }
}
var be;
var we;
function xe(e) {
  for (var t = arguments.length, r = new Array(t > 1 ? t - 1 : 0), n = 1; n < t; n++) {
    r[n - 1] = arguments[n];
  }
  return he(e, function (e) {
    return e.apply(undefined, r);
  });
}
function Ee() {
  return typeof window === "undefined" || !window.navigator || /ServerSideRendering|^Deno\//.test(window.navigator.userAgent);
}
var ke = null;
var Se = false;
var Te = pe;
function Ce(e) {
  if (e.to) {
    we = e.to;
  }
  if (e.now) {
    Y.now = e.now;
  }
  if (e.colors !== undefined) {
    ke = e.colors;
  }
  if (e.skipAnimation != null) {
    Se = e.skipAnimation;
  }
  if (e.createStringInterpolator) {
    be = e.createStringInterpolator;
  }
  if (e.requestAnimationFrame) {
    Y.use(e.requestAnimationFrame);
  }
  if (e.batchedUpdates) {
    Y.batchedUpdates = e.batchedUpdates;
  }
  if (e.willAdvance) {
    Te = e.willAdvance;
  }
  if (e.frameLoop) {
    Y.frameLoop = e.frameLoop;
  }
}
var Ae = Object.freeze({
  __proto__: null,
  get createStringInterpolator() {
    return be;
  },
  get to() {
    return we;
  },
  get colors() {
    return ke;
  },
  get skipAnimation() {
    return Se;
  },
  get willAdvance() {
    return Te;
  },
  assign: Ce
});
var _e = new Set();
var Oe = [];
var Me = [];
var Pe = 0;
var qe = {
  get idle() {
    return !_e.size && !Oe.length;
  },
  start: function (e) {
    if (Pe > e.priority) {
      _e.add(e);
      Y.onStart(Ne);
    } else {
      Re(e);
      Y(je);
    }
  },
  advance: je,
  sort: function (e) {
    if (Pe) {
      Y.onFrame(function () {
        return qe.sort(e);
      });
    } else {
      var t = Oe.indexOf(e);
      if (~t) {
        Oe.splice(t, 1);
        Ie(e);
      }
    }
  },
  clear: function () {
    Oe = [];
    _e.clear();
  }
};
function Ne() {
  _e.forEach(Re);
  _e.clear();
  Y(je);
}
function Re(e) {
  if (!Oe.includes(e)) {
    Ie(e);
  }
}
function Ie(e) {
  Oe.splice(De(Oe, function (t) {
    return t.priority > e.priority;
  }), 0, e);
}
function je(e) {
  var t = Me;
  for (var r = 0; r < Oe.length; r++) {
    var n = Oe[r];
    Pe = n.priority;
    if (!n.idle) {
      Te(n);
      n.advance(e);
      if (!n.idle) {
        t.push(n);
      }
    }
  }
  Pe = 0;
  Me = Oe;
  Me.length = 0;
  Oe = t;
  return Oe.length > 0;
}
function De(e, t) {
  var r = e.findIndex(t);
  if (r < 0) {
    return e.length;
  } else {
    return r;
  }
}
function Le(e, t, r) {
  return Math.min(Math.max(r, e), t);
}
var Fe = {
  transparent: 0,
  aliceblue: 4042850303,
  antiquewhite: 4209760255,
  aqua: 16777215,
  aquamarine: 2147472639,
  azure: 4043309055,
  beige: 4126530815,
  bisque: 4293182719,
  black: 255,
  blanchedalmond: 4293643775,
  blue: 65535,
  blueviolet: 2318131967,
  brown: 2771004159,
  burlywood: 3736635391,
  burntsienna: 3934150143,
  cadetblue: 1604231423,
  chartreuse: 2147418367,
  chocolate: 3530104575,
  coral: 4286533887,
  cornflowerblue: 1687547391,
  cornsilk: 4294499583,
  crimson: 3692313855,
  cyan: 16777215,
  darkblue: 35839,
  darkcyan: 9145343,
  darkgoldenrod: 3095792639,
  darkgray: 2846468607,
  darkgreen: 6553855,
  darkgrey: 2846468607,
  darkkhaki: 3182914559,
  darkmagenta: 2332068863,
  darkolivegreen: 1433087999,
  darkorange: 4287365375,
  darkorchid: 2570243327,
  darkred: 2332033279,
  darksalmon: 3918953215,
  darkseagreen: 2411499519,
  darkslateblue: 1211993087,
  darkslategray: 793726975,
  darkslategrey: 793726975,
  darkturquoise: 13554175,
  darkviolet: 2483082239,
  deeppink: 4279538687,
  deepskyblue: 12582911,
  dimgray: 1768516095,
  dimgrey: 1768516095,
  dodgerblue: 512819199,
  firebrick: 2988581631,
  floralwhite: 4294635775,
  forestgreen: 579543807,
  fuchsia: 4278255615,
  gainsboro: 3705462015,
  ghostwhite: 4177068031,
  gold: 4292280575,
  goldenrod: 3668254975,
  gray: 2155905279,
  green: 8388863,
  greenyellow: 2919182335,
  grey: 2155905279,
  honeydew: 4043305215,
  hotpink: 4285117695,
  indianred: 3445382399,
  indigo: 1258324735,
  ivory: 4294963455,
  khaki: 4041641215,
  lavender: 3873897215,
  lavenderblush: 4293981695,
  lawngreen: 2096890111,
  lemonchiffon: 4294626815,
  lightblue: 2916673279,
  lightcoral: 4034953471,
  lightcyan: 3774873599,
  lightgoldenrodyellow: 4210742015,
  lightgray: 3553874943,
  lightgreen: 2431553791,
  lightgrey: 3553874943,
  lightpink: 4290167295,
  lightsalmon: 4288707327,
  lightseagreen: 548580095,
  lightskyblue: 2278488831,
  lightslategray: 2005441023,
  lightslategrey: 2005441023,
  lightsteelblue: 2965692159,
  lightyellow: 4294959359,
  lime: 16711935,
  limegreen: 852308735,
  linen: 4210091775,
  magenta: 4278255615,
  maroon: 2147483903,
  mediumaquamarine: 1724754687,
  mediumblue: 52735,
  mediumorchid: 3126187007,
  mediumpurple: 2473647103,
  mediumseagreen: 1018393087,
  mediumslateblue: 2070474495,
  mediumspringgreen: 16423679,
  mediumturquoise: 1221709055,
  mediumvioletred: 3340076543,
  midnightblue: 421097727,
  mintcream: 4127193855,
  mistyrose: 4293190143,
  moccasin: 4293178879,
  navajowhite: 4292783615,
  navy: 33023,
  oldlace: 4260751103,
  olive: 2155872511,
  olivedrab: 1804477439,
  orange: 4289003775,
  orangered: 4282712319,
  orchid: 3664828159,
  palegoldenrod: 4008225535,
  palegreen: 2566625535,
  paleturquoise: 2951671551,
  palevioletred: 3681588223,
  papayawhip: 4293907967,
  peachpuff: 4292524543,
  peru: 3448061951,
  pink: 4290825215,
  plum: 3718307327,
  powderblue: 2967529215,
  purple: 2147516671,
  rebeccapurple: 1714657791,
  red: 4278190335,
  rosybrown: 3163525119,
  royalblue: 1097458175,
  saddlebrown: 2336560127,
  salmon: 4202722047,
  sandybrown: 4104413439,
  seagreen: 780883967,
  seashell: 4294307583,
  sienna: 2689740287,
  silver: 3233857791,
  skyblue: 2278484991,
  slateblue: 1784335871,
  slategray: 1887473919,
  slategrey: 1887473919,
  snow: 4294638335,
  springgreen: 16744447,
  steelblue: 1182971135,
  tan: 3535047935,
  teal: 8421631,
  thistle: 3636451583,
  tomato: 4284696575,
  turquoise: 1088475391,
  violet: 4001558271,
  wheat: 4125012991,
  white: 4294967295,
  whitesmoke: 4126537215,
  yellow: 4294902015,
  yellowgreen: 2597139199
};
var Ze = "[-+]?\\d*\\.?\\d+";
var ze = Ze + "%";
function Ue() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
    t[r] = arguments[r];
  }
  return "\\(\\s*(" + t.join(")\\s*,\\s*(") + ")\\s*\\)";
}
var Be = new RegExp("rgb" + Ue(Ze, Ze, Ze));
var Ve = new RegExp("rgba" + Ue(Ze, Ze, Ze, Ze));
var He = new RegExp("hsl" + Ue(Ze, ze, ze));
var We = new RegExp("hsla" + Ue(Ze, ze, ze, Ze));
var Ye = /^#([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/;
var Qe = /^#([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/;
var $e = /^#([0-9a-fA-F]{6})$/;
var Ge = /^#([0-9a-fA-F]{8})$/;
function Ke(e) {
  var t;
  if (typeof e === "number") {
    if (e >>> 0 === e && e >= 0 && e <= 4294967295) {
      return e;
    } else {
      return null;
    }
  } else if (t = $e.exec(e)) {
    return parseInt(t[1] + "ff", 16) >>> 0;
  } else if (ke && ke[e] !== undefined) {
    return ke[e];
  } else if (t = Be.exec(e)) {
    return (et(t[1]) << 24 | et(t[2]) << 16 | et(t[3]) << 8 | 255) >>> 0;
  } else if (t = Ve.exec(e)) {
    return (et(t[1]) << 24 | et(t[2]) << 16 | et(t[3]) << 8 | rt(t[4])) >>> 0;
  } else if (t = Ye.exec(e)) {
    return parseInt(t[1] + t[1] + t[2] + t[2] + t[3] + t[3] + "ff", 16) >>> 0;
  } else if (t = Ge.exec(e)) {
    return parseInt(t[1], 16) >>> 0;
  } else if (t = Qe.exec(e)) {
    return parseInt(t[1] + t[1] + t[2] + t[2] + t[3] + t[3] + t[4] + t[4], 16) >>> 0;
  } else if (t = He.exec(e)) {
    return (Xe(tt(t[1]), nt(t[2]), nt(t[3])) | 255) >>> 0;
  } else if (t = We.exec(e)) {
    return (Xe(tt(t[1]), nt(t[2]), nt(t[3])) | rt(t[4])) >>> 0;
  } else {
    return null;
  }
}
function Je(e, t, r) {
  if (r < 0) {
    r += 1;
  }
  if (r > 1) {
    r -= 1;
  }
  if (r < 1 / 6) {
    return e + (t - e) * 6 * r;
  } else if (r < 0.5) {
    return t;
  } else if (r < 2 / 3) {
    return e + (t - e) * (2 / 3 - r) * 6;
  } else {
    return e;
  }
}
function Xe(e, t, r) {
  var n = r < 0.5 ? r * (1 + t) : r + t - r * t;
  var i = r * 2 - n;
  var o = Je(i, n, e + 1 / 3);
  var a = Je(i, n, e);
  var s = Je(i, n, e - 1 / 3);
  return Math.round(o * 255) << 24 | Math.round(a * 255) << 16 | Math.round(s * 255) << 8;
}
function et(e) {
  var t = parseInt(e, 10);
  if (t < 0) {
    return 0;
  } else if (t > 255) {
    return 255;
  } else {
    return t;
  }
}
function tt(e) {
  var t = parseFloat(e);
  return (t % 360 + 360) % 360 / 360;
}
function rt(e) {
  var t = parseFloat(e);
  if (t < 0) {
    return 0;
  } else if (t > 1) {
    return 255;
  } else {
    return Math.round(t * 255);
  }
}
function nt(e) {
  var t = parseFloat(e);
  if (t < 0) {
    return 0;
  } else if (t > 100) {
    return 1;
  } else {
    return t / 100;
  }
}
function it(e) {
  var t = Ke(e);
  if (t === null) {
    return e;
  }
  t = t || 0;
  var r = (t & -16777216) >>> 24;
  var n = (t & 16711680) >>> 16;
  var i = (t & 65280) >>> 8;
  var o = (t & 255) / 255;
  return `rgba(${r}, ${n}, ${i}, ${o})`;
}
var ot = function e(t, r, n) {
  if (fe.fun(t)) {
    return t;
  }
  if (fe.arr(t)) {
    return e({
      range: t,
      output: r,
      extrapolate: n
    });
  }
  if (fe.str(t.output[0])) {
    return be(t);
  }
  var i = t;
  var o = i.output;
  var a = i.range || [0, 1];
  var s = i.extrapolateLeft || i.extrapolate || "extend";
  var u = i.extrapolateRight || i.extrapolate || "extend";
  var l = i.easing || function (e) {
    return e;
  };
  return function (e) {
    var t = st(e, a);
    return at(e, a[t], a[t + 1], o[t], o[t + 1], l, s, u, i.map);
  };
};
function at(e, t, r, n, i, o, a, s, u) {
  var l = u ? u(e) : e;
  if (l < t) {
    if (a === "identity") {
      return l;
    }
    if (a === "clamp") {
      l = t;
    }
  }
  if (l > r) {
    if (s === "identity") {
      return l;
    }
    if (s === "clamp") {
      l = r;
    }
  }
  if (n === i) {
    return n;
  } else if (t === r) {
    if (e <= t) {
      return n;
    } else {
      return i;
    }
  } else {
    if (t === -Infinity) {
      l = -l;
    } else if (r === Infinity) {
      l -= t;
    } else {
      l = (l - t) / (r - t);
    }
    l = o(l);
    if (n === -Infinity) {
      l = -l;
    } else if (i === Infinity) {
      l += n;
    } else {
      l = l * (i - n) + n;
    }
    return l;
  }
}
function st(e, t) {
  for (var r = 1; r < t.length - 1; ++r) {
    if (t[r] >= e) {
      break;
    }
  }
  return r - 1;
}
function ut(e, t = "end") {
  return function (r) {
    r = t === "end" ? Math.min(r, 0.999) : Math.max(r, 0.001);
    var n = r * e;
    var i = t === "end" ? Math.floor(n) : Math.ceil(n);
    return Le(0, 1, i / e);
  };
}
var lt = 1.70158;
var ct = lt * 1.525;
var pt = lt + 1;
var dt = Math.PI * 2 / 3;
var ft = Math.PI * 2 / 4.5;
function gt(e) {
  var t = 7.5625;
  var r = 2.75;
  if (e < 1 / r) {
    return t * e * e;
  } else if (e < 2 / r) {
    return t * (e -= 1.5 / r) * e + 0.75;
  } else if (e < 2.5 / r) {
    return t * (e -= 2.25 / r) * e + 0.9375;
  } else {
    return t * (e -= 2.625 / r) * e + 0.984375;
  }
}
var mt = {
  linear: function (e) {
    return e;
  },
  easeInQuad: function (e) {
    return e * e;
  },
  easeOutQuad: function (e) {
    return 1 - (1 - e) * (1 - e);
  },
  easeInOutQuad: function (e) {
    if (e < 0.5) {
      return e * 2 * e;
    } else {
      return 1 - Math.pow(e * -2 + 2, 2) / 2;
    }
  },
  easeInCubic: function (e) {
    return e * e * e;
  },
  easeOutCubic: function (e) {
    return 1 - Math.pow(1 - e, 3);
  },
  easeInOutCubic: function (e) {
    if (e < 0.5) {
      return e * 4 * e * e;
    } else {
      return 1 - Math.pow(e * -2 + 2, 3) / 2;
    }
  },
  easeInQuart: function (e) {
    return e * e * e * e;
  },
  easeOutQuart: function (e) {
    return 1 - Math.pow(1 - e, 4);
  },
  easeInOutQuart: function (e) {
    if (e < 0.5) {
      return e * 8 * e * e * e;
    } else {
      return 1 - Math.pow(e * -2 + 2, 4) / 2;
    }
  },
  easeInQuint: function (e) {
    return e * e * e * e * e;
  },
  easeOutQuint: function (e) {
    return 1 - Math.pow(1 - e, 5);
  },
  easeInOutQuint: function (e) {
    if (e < 0.5) {
      return e * 16 * e * e * e * e;
    } else {
      return 1 - Math.pow(e * -2 + 2, 5) / 2;
    }
  },
  easeInSine: function (e) {
    return 1 - Math.cos(e * Math.PI / 2);
  },
  easeOutSine: function (e) {
    return Math.sin(e * Math.PI / 2);
  },
  easeInOutSine: function (e) {
    return -(Math.cos(Math.PI * e) - 1) / 2;
  },
  easeInExpo: function (e) {
    if (e === 0) {
      return 0;
    } else {
      return Math.pow(2, e * 10 - 10);
    }
  },
  easeOutExpo: function (e) {
    if (e === 1) {
      return 1;
    } else {
      return 1 - Math.pow(2, e * -10);
    }
  },
  easeInOutExpo: function (e) {
    if (e === 0) {
      return 0;
    } else if (e === 1) {
      return 1;
    } else if (e < 0.5) {
      return Math.pow(2, e * 20 - 10) / 2;
    } else {
      return (2 - Math.pow(2, e * -20 + 10)) / 2;
    }
  },
  easeInCirc: function (e) {
    return 1 - Math.sqrt(1 - Math.pow(e, 2));
  },
  easeOutCirc: function (e) {
    return Math.sqrt(1 - Math.pow(e - 1, 2));
  },
  easeInOutCirc: function (e) {
    if (e < 0.5) {
      return (1 - Math.sqrt(1 - Math.pow(e * 2, 2))) / 2;
    } else {
      return (Math.sqrt(1 - Math.pow(e * -2 + 2, 2)) + 1) / 2;
    }
  },
  easeInBack: function (e) {
    return pt * e * e * e - lt * e * e;
  },
  easeOutBack: function (e) {
    return 1 + pt * Math.pow(e - 1, 3) + lt * Math.pow(e - 1, 2);
  },
  easeInOutBack: function (e) {
    if (e < 0.5) {
      return Math.pow(e * 2, 2) * ((ct + 1) * 2 * e - ct) / 2;
    } else {
      return (Math.pow(e * 2 - 2, 2) * ((ct + 1) * (e * 2 - 2) + ct) + 2) / 2;
    }
  },
  easeInElastic: function (e) {
    if (e === 0) {
      return 0;
    } else if (e === 1) {
      return 1;
    } else {
      return -Math.pow(2, e * 10 - 10) * Math.sin((e * 10 - 10.75) * dt);
    }
  },
  easeOutElastic: function (e) {
    if (e === 0) {
      return 0;
    } else if (e === 1) {
      return 1;
    } else {
      return Math.pow(2, e * -10) * Math.sin((e * 10 - 0.75) * dt) + 1;
    }
  },
  easeInOutElastic: function (e) {
    if (e === 0) {
      return 0;
    } else if (e === 1) {
      return 1;
    } else if (e < 0.5) {
      return -Math.pow(2, e * 20 - 10) * Math.sin((e * 20 - 11.125) * ft) / 2;
    } else {
      return Math.pow(2, e * -20 + 10) * Math.sin((e * 20 - 11.125) * ft) / 2 + 1;
    }
  },
  easeInBounce: function (e) {
    return 1 - gt(1 - e);
  },
  easeOutBounce: gt,
  easeInOutBounce: function (e) {
    if (e < 0.5) {
      return (1 - gt(1 - e * 2)) / 2;
    } else {
      return (1 + gt(e * 2 - 1)) / 2;
    }
  },
  steps: ut
};
function vt() {
  vt = Object.assign ? Object.assign.bind() : function (e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r) {
        if (Object.prototype.hasOwnProperty.call(r, n)) {
          e[n] = r[n];
        }
      }
    }
    return e;
  };
  return vt.apply(this, arguments);
}
var yt = Symbol.for("FluidValue.get");
var ht = Symbol.for("FluidValue.observers");
function bt(e) {
  return Boolean(e && e[yt]);
}
function wt(e) {
  if (e && e[yt]) {
    return e[yt]();
  } else {
    return e;
  }
}
function xt(e) {
  return e[ht] || null;
}
function Et(e, t) {
  if (e.eventObserved) {
    e.eventObserved(t);
  } else {
    e(t);
  }
}
function kt(e, t) {
  var r = e[ht];
  if (r) {
    r.forEach(function (e) {
      Et(e, t);
    });
  }
}
var St = (0, P.Z)(function e(t) {
  (0, q.Z)(this, e);
  this[yt] = undefined;
  this[ht] = undefined;
  if (!t && !(t = this.get)) {
    throw Error("Unknown getter");
  }
  Tt(this, t);
});
function Tt(e, t) {
  return Ot(e, yt, t);
}
function Ct(e, t) {
  if (e[yt]) {
    var r = e[ht];
    if (!r) {
      Ot(e, ht, r = new Set());
    }
    if (!r.has(t)) {
      r.add(t);
      if (e.observerAdded) {
        e.observerAdded(r.size, t);
      }
    }
  }
  return t;
}
function At(e, t) {
  var r = e[ht];
  if (r && r.has(t)) {
    var n = r.size - 1;
    if (n) {
      r.delete(t);
    } else {
      e[ht] = null;
    }
    if (e.observerRemoved) {
      e.observerRemoved(n, t);
    }
  }
}
var _t;
function Ot(e, t, r) {
  return Object.defineProperty(e, t, {
    value: r,
    writable: true,
    configurable: true
  });
}
var Mt = /[+\-]?(?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
var Pt = /(#(?:[0-9a-f]{2}){2,4}|(#[0-9a-f]{3})|(rgb|hsl)a?\((-?\d+%?[,\s]+){2,3}\s*[\d\.]+%?\))/gi;
var qt = new RegExp(`(${Mt.source})(%|[a-z]+)`, "i");
var Nt = /rgba\(([0-9\.-]+), ([0-9\.-]+), ([0-9\.-]+), ([0-9\.-]+)\)/gi;
var Rt = /var\((--[a-zA-Z0-9-_]+),? ?([a-zA-Z0-9 ()%#.,-]+)?\)/;
var It = function e(t) {
  var r = jt(t);
  var n = (0, p.Z)(r, 2);
  var i = n[0];
  var o = n[1];
  if (!i || Ee()) {
    return t;
  }
  var a = window.getComputedStyle(document.documentElement).getPropertyValue(i);
  if (a) {
    return a.trim();
  }
  if (o && o.startsWith("--")) {
    var s = window.getComputedStyle(document.documentElement).getPropertyValue(o);
    return s || t;
  }
  if (o && Rt.test(o)) {
    return e(o);
  } else {
    return o || t;
  }
};
function jt(e) {
  var t = Rt.exec(e);
  if (!t) {
    return [,];
  }
  var r = (0, p.Z)(t, 3);
  var n = r[1];
  var i = r[2];
  return [n, i];
}
function Dt(e, t, r, n, i) {
  return `rgba(${Math.round(t)}, ${Math.round(r)}, ${Math.round(n)}, ${i})`;
}
function Lt(e) {
  _t ||= ke ? new RegExp(`(${Object.keys(ke).join("|")})(?!\\w)`, "g") : /^\b$/;
  var t = e.output.map(function (e) {
    return wt(e).replace(Rt, It).replace(Pt, it).replace(_t, it);
  });
  var r = t.map(function (e) {
    return e.match(Mt).map(Number);
  });
  var n = r[0].map(function (e, t) {
    return r.map(function (e) {
      if (!(t in e)) {
        throw Error("The arity of each \"output\" value must be equal");
      }
      return e[t];
    });
  });
  var i = n.map(function (t) {
    return ot(vt({}, e, {
      output: t
    }));
  });
  return function (e) {
    var r;
    var n = !qt.test(t[0]) && ((r = t.find(function (e) {
      return qt.test(e);
    })) == null ? undefined : r.replace(Mt, ""));
    var o = 0;
    return t[0].replace(Mt, function () {
      return `${i[o++](e)}${n || ""}`;
    }).replace(Nt, Dt);
  };
}
var Ft = "react-spring: ";
function Zt(e) {
  var t = e;
  var r = false;
  if (typeof t != "function") {
    throw new TypeError(`${Ft}once requires a function parameter`);
  }
  return function () {
    if (!r) {
      t.apply(undefined, arguments);
      r = true;
    }
  };
}
var zt = Zt(console.warn);
function Ut() {
  zt(`${Ft}The "interpolate" function is deprecated in v9 (use "to" instead)`);
}
var Bt = Zt(console.warn);
function Vt() {
  Bt(`${Ft}Directly calling start instead of using the api object is deprecated in v9 (use ".start" instead), this will be removed in later 0.X.0 versions`);
}
function Ht(e) {
  return fe.str(e) && (e[0] == "#" || /\d/.test(e) || !Ee() && Rt.test(e) || e in (ke || {}));
}
new WeakMap();
new Set();
new WeakMap();
new WeakMap();
new WeakMap();
var Wt = Ee() ? a.useEffect : a.useLayoutEffect;
function Yt() {
  var e = (0, a.useRef)(false);
  Wt(function () {
    e.current = true;
    return function () {
      e.current = false;
    };
  }, []);
  return e;
}
function Qt() {
  var e = (0, a.useState)()[1];
  var t = Yt();
  return function () {
    if (t.current) {
      e(Math.random());
    }
  };
}
function $t(e, t) {
  var r = (0, a.useState)(function () {
    return {
      inputs: t,
      result: e()
    };
  });
  var n = (0, p.Z)(r, 1);
  var i = n[0];
  var o = (0, a.useRef)();
  var s = o.current;
  var u = s;
  if (u) {
    var l = Boolean(t && u.inputs && Gt(t, u.inputs));
    if (!l) {
      u = {
        inputs: t,
        result: e()
      };
    }
  } else {
    u = i;
  }
  (0, a.useEffect)(function () {
    o.current = u;
    if (s == i) {
      i.inputs = i.result = undefined;
    }
  }, [u]);
  return u.result;
}
function Gt(e, t) {
  if (e.length !== t.length) {
    return false;
  }
  for (var r = 0; r < e.length; r++) {
    if (e[r] !== t[r]) {
      return false;
    }
  }
  return true;
}
function Kt(e) {
  return (0, a.useEffect)(e, Jt);
}
var Jt = [];
function Xt(e) {
  var t = (0, a.useRef)();
  (0, a.useEffect)(function () {
    t.current = e;
  });
  return t.current;
}
var er = Symbol.for("Animated:node");
function tr(e) {
  return !!e && e[er] === e;
}
function rr(e) {
  return e && e[er];
}
function nr(e, t) {
  return de(e, er, t);
}
function ir(e) {
  return e && e[er] && e[er].getPayload();
}
var or = function () {
  function e() {
    (0, q.Z)(this, e);
    this.payload = undefined;
    nr(this, this);
  }
  (0, P.Z)(e, [{
    key: "getPayload",
    value: function () {
      return this.payload || [];
    }
  }]);
  return e;
}();
var ar = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r(e) {
    var n;
    (0, q.Z)(this, r);
    n = t.call(this);
    n.done = true;
    n.elapsedTime = undefined;
    n.lastPosition = undefined;
    n.lastVelocity = undefined;
    n.v0 = undefined;
    n.durationProgress = 0;
    n._value = e;
    if (fe.num(n._value)) {
      n.lastPosition = n._value;
    }
    return n;
  }
  (0, P.Z)(r, [{
    key: "getPayload",
    value: function () {
      return [this];
    }
  }, {
    key: "getValue",
    value: function () {
      return this._value;
    }
  }, {
    key: "setValue",
    value: function (e, t) {
      if (fe.num(e)) {
        this.lastPosition = e;
        if (t) {
          e = Math.round(e / t) * t;
          if (this.done) {
            this.lastPosition = e;
          }
        }
      }
      return this._value !== e && (this._value = e, true);
    }
  }, {
    key: "reset",
    value: function () {
      var e = this.done;
      this.done = false;
      if (fe.num(this._value)) {
        this.elapsedTime = 0;
        this.durationProgress = 0;
        this.lastPosition = this._value;
        if (e) {
          this.lastVelocity = null;
        }
        this.v0 = null;
      }
    }
  }], [{
    key: "create",
    value: function (e) {
      return new r(e);
    }
  }]);
  return r;
}(or);
var sr = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r(e) {
    var n;
    (0, q.Z)(this, r);
    n = t.call(this, 0);
    n._string = null;
    n._toString = undefined;
    n._toString = ot({
      output: [e, e]
    });
    return n;
  }
  (0, P.Z)(r, [{
    key: "getValue",
    value: function () {
      var e = this._string;
      if (e == null) {
        return this._string = this._toString(this._value);
      } else {
        return e;
      }
    }
  }, {
    key: "setValue",
    value: function (e) {
      if (fe.str(e)) {
        if (e == this._string) {
          return false;
        }
        this._string = e;
        this._value = 1;
      } else {
        if (!(0, D.Z)((0, L.Z)(r.prototype), "setValue", this).call(this, e)) {
          return false;
        }
        this._string = null;
      }
      return true;
    }
  }, {
    key: "reset",
    value: function (e) {
      if (e) {
        this._toString = ot({
          output: [this.getValue(), e]
        });
      }
      this._value = 0;
      (0, D.Z)((0, L.Z)(r.prototype), "reset", this).call(this);
    }
  }], [{
    key: "create",
    value: function (e) {
      return new r(e);
    }
  }]);
  return r;
}(ar);
var ur = {
  dependencies: null
};
var lr = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r(e) {
    var n;
    (0, q.Z)(this, r);
    n = t.call(this);
    n.source = e;
    n.setValue(e);
    return n;
  }
  (0, P.Z)(r, [{
    key: "getValue",
    value: function (e) {
      var t = {};
      ve(this.source, function (r, n) {
        if (tr(r)) {
          t[n] = r.getValue(e);
        } else if (bt(r)) {
          t[n] = wt(r);
        } else if (!e) {
          t[n] = r;
        }
      });
      return t;
    }
  }, {
    key: "setValue",
    value: function (e) {
      this.source = e;
      this.payload = this._makePayload(e);
    }
  }, {
    key: "reset",
    value: function () {
      if (this.payload) {
        me(this.payload, function (e) {
          return e.reset();
        });
      }
    }
  }, {
    key: "_makePayload",
    value: function (e) {
      if (e) {
        var t = new Set();
        ve(e, this._addToPayload, t);
        return Array.from(t);
      }
    }
  }, {
    key: "_addToPayload",
    value: function (e) {
      var t = this;
      if (ur.dependencies && bt(e)) {
        ur.dependencies.add(e);
      }
      var r = ir(e);
      if (r) {
        me(r, function (e) {
          return t.add(e);
        });
      }
    }
  }]);
  return r;
}(or);
var cr = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r(e) {
    (0, q.Z)(this, r);
    return t.call(this, e);
  }
  (0, P.Z)(r, [{
    key: "getValue",
    value: function () {
      return this.source.map(function (e) {
        return e.getValue();
      });
    }
  }, {
    key: "setValue",
    value: function (e) {
      var t = this.getPayload();
      if (e.length == t.length) {
        return t.map(function (t, r) {
          return t.setValue(e[r]);
        }).some(Boolean);
      } else {
        (0, D.Z)((0, L.Z)(r.prototype), "setValue", this).call(this, e.map(pr));
        return true;
      }
    }
  }], [{
    key: "create",
    value: function (e) {
      return new r(e);
    }
  }]);
  return r;
}(lr);
function pr(e) {
  var t = Ht(e) ? sr : ar;
  return t.create(e);
}
function dr(e) {
  var t = rr(e);
  if (t) {
    return t.constructor;
  } else if (fe.arr(e)) {
    return cr;
  } else if (Ht(e)) {
    return sr;
  } else {
    return ar;
  }
}
function fr() {
  fr = Object.assign ? Object.assign.bind() : function (e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r) {
        if (Object.prototype.hasOwnProperty.call(r, n)) {
          e[n] = r[n];
        }
      }
    }
    return e;
  };
  return fr.apply(this, arguments);
}
function gr(e, t) {
  var r = !fe.fun(e) || e.prototype && e.prototype.isReactComponent;
  return (0, a.forwardRef)(function (n, i) {
    var o = (0, a.useRef)(null);
    var s = r && (0, a.useCallback)(function (e) {
      o.current = yr(i, e);
    }, [i]);
    var u = vr(n, t);
    var l = (0, p.Z)(u, 2);
    var c = l[0];
    var d = l[1];
    var f = Qt();
    function g() {
      var e = o.current;
      if (!r || e) {
        var n = !!e && t.applyAnimatedValues(e, c.getValue(true));
        if (n === false) {
          f();
        }
      }
    }
    var m = new mr(g, d);
    var v = (0, a.useRef)();
    Wt(function () {
      v.current = m;
      me(d, function (e) {
        return Ct(e, m);
      });
      return function () {
        if (v.current) {
          me(v.current.deps, function (e) {
            return At(e, v.current);
          });
          Y.cancel(v.current.update);
        }
      };
    });
    (0, a.useEffect)(g, []);
    Kt(function () {
      return function () {
        var e = v.current;
        me(e.deps, function (t) {
          return At(t, e);
        });
      };
    });
    var y = t.getComponentProps(c.getValue());
    return a.createElement(e, fr({}, y, {
      ref: s
    }));
  });
}
var mr = function () {
  function e(t, r) {
    (0, q.Z)(this, e);
    this.update = t;
    this.deps = r;
  }
  (0, P.Z)(e, [{
    key: "eventObserved",
    value: function (e) {
      if (e.type == "change") {
        Y.write(this.update);
      }
    }
  }]);
  return e;
}();
function vr(e, t) {
  var r = new Set();
  ur.dependencies = r;
  if (e.style) {
    e = fr({}, e, {
      style: t.createAnimatedStyle(e.style)
    });
  }
  e = new lr(e);
  ur.dependencies = null;
  return [e, r];
}
function yr(e, t) {
  if (e) {
    if (fe.fun(e)) {
      e(t);
    } else {
      e.current = t;
    }
  }
  return t;
}
var hr = Symbol.for("AnimatedComponent");
function br(e, t = {}) {
  var r = t.applyAnimatedValues;
  var n = r === undefined ? function () {
    return false;
  } : r;
  var i = t.createAnimatedStyle;
  var o = i === undefined ? function (e) {
    return new lr(e);
  } : i;
  var a = t.getComponentProps;
  var s = a === undefined ? function (e) {
    return e;
  } : a;
  var u = {
    applyAnimatedValues: n,
    createAnimatedStyle: o,
    getComponentProps: s
  };
  var l = function e(t) {
    var r = wr(t) || "Anonymous";
    t = fe.str(t) ? e[t] ||= gr(t, u) : t[hr] ||= gr(t, u);
    t.displayName = `Animated(${r})`;
    return t;
  };
  ve(e, function (t, r) {
    if (fe.arr(e)) {
      r = wr(t);
    }
    l[r] = l(t);
  });
  return {
    animated: l
  };
}
function wr(e) {
  if (fe.str(e)) {
    return e;
  } else if (e && fe.str(e.displayName)) {
    return e.displayName;
  } else {
    return fe.fun(e) && e.name || null;
  }
}
function xr() {
  xr = Object.assign ? Object.assign.bind() : function (e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = arguments[t];
      for (var n in r) {
        if (Object.prototype.hasOwnProperty.call(r, n)) {
          e[n] = r[n];
        }
      }
    }
    return e;
  };
  return xr.apply(this, arguments);
}
function Er(e) {
  for (var t = arguments.length, r = new Array(t > 1 ? t - 1 : 0), n = 1; n < t; n++) {
    r[n - 1] = arguments[n];
  }
  if (fe.fun(e)) {
    return e.apply(undefined, r);
  } else {
    return e;
  }
}
function kr(e, t) {
  return e === true || !!t && !!e && !!(fe.fun(e) ? e(t) : ye(e).includes(t));
}
function Sr(e, t) {
  if (fe.obj(e)) {
    return t && e[t];
  } else {
    return e;
  }
}
function Tr(e, t) {
  if (e.default === true) {
    return e[t];
  } else if (e.default) {
    return e.default[t];
  } else {
    return undefined;
  }
}
function Cr(e) {
  return e;
}
function Ar(e, t = Cr) {
  var r = _r;
  if (e.default && e.default !== true) {
    e = e.default;
    r = Object.keys(e);
  }
  var n;
  var i = {};
  var o = (0, H.Z)(r);
  try {
    for (o.s(); !(n = o.n()).done;) {
      var a = n.value;
      var s = t(e[a], a);
      if (!fe.und(s)) {
        i[a] = s;
      }
    }
  } catch (u) {
    o.e(u);
  } finally {
    o.f();
  }
  return i;
}
var _r = ["config", "onProps", "onStart", "onChange", "onPause", "onResume", "onRest"];
var Or = {
  config: 1,
  from: 1,
  to: 1,
  ref: 1,
  loop: 1,
  reset: 1,
  pause: 1,
  cancel: 1,
  reverse: 1,
  immediate: 1,
  default: 1,
  delay: 1,
  onProps: 1,
  onStart: 1,
  onChange: 1,
  onPause: 1,
  onResume: 1,
  onRest: 1,
  onResolve: 1,
  items: 1,
  trail: 1,
  sort: 1,
  expires: 1,
  initial: 1,
  enter: 1,
  update: 1,
  leave: 1,
  children: 1,
  onDestroyed: 1,
  keys: 1,
  callId: 1,
  parentId: 1
};
function Mr(e) {
  var t = {};
  var r = 0;
  ve(e, function (e, n) {
    if (!Or[n]) {
      t[n] = e;
      r++;
    }
  });
  if (r) {
    return t;
  }
}
function Pr(e) {
  var t = Mr(e);
  if (t) {
    var r = {
      to: t
    };
    ve(e, function (e, n) {
      return n in t || (r[n] = e);
    });
    return r;
  }
  return xr({}, e);
}
function qr(e) {
  e = wt(e);
  if (fe.arr(e)) {
    return e.map(qr);
  } else if (Ht(e)) {
    return Ae.createStringInterpolator({
      range: [0, 1],
      output: [e, e]
    })(1);
  } else {
    return e;
  }
}
function Nr(e) {
  for (var t in e) {
    return true;
  }
  return false;
}
function Rr(e) {
  return fe.fun(e) || fe.arr(e) && fe.obj(e[0]);
}
function Ir(e, t) {
  var r;
  if ((r = e.ref) != null) {
    r.delete(e);
  }
  if (t != null) {
    t.delete(e);
  }
}
function jr(e, t) {
  var r;
  if (t && e.ref !== t) {
    if ((r = e.ref) != null) {
      r.delete(e);
    }
    t.add(e);
    e.ref = t;
  }
}
var Dr = {
  default: {
    tension: 170,
    friction: 26
  },
  gentle: {
    tension: 120,
    friction: 14
  },
  wobbly: {
    tension: 180,
    friction: 12
  },
  stiff: {
    tension: 210,
    friction: 20
  },
  slow: {
    tension: 280,
    friction: 60
  },
  molasses: {
    tension: 280,
    friction: 120
  }
};
var Lr = xr({}, Dr.default, {
  mass: 1,
  damping: 1,
  easing: mt.linear,
  clamp: false
});
var Fr = (0, P.Z)(function e() {
  (0, q.Z)(this, e);
  this.tension = undefined;
  this.friction = undefined;
  this.frequency = undefined;
  this.damping = undefined;
  this.mass = undefined;
  this.velocity = 0;
  this.restVelocity = undefined;
  this.precision = undefined;
  this.progress = undefined;
  this.duration = undefined;
  this.easing = undefined;
  this.clamp = undefined;
  this.bounce = undefined;
  this.decay = undefined;
  this.round = undefined;
  Object.assign(this, Lr);
});
function Zr(e, t, r) {
  if (r) {
    r = xr({}, r);
    zr(r, t);
    t = xr({}, r, t);
  }
  zr(e, t);
  Object.assign(e, t);
  for (var n in Lr) {
    if (e[n] == null) {
      e[n] = Lr[n];
    }
  }
  var i = e.mass;
  var o = e.frequency;
  var a = e.damping;
  if (!fe.und(o)) {
    if (o < 0.01) {
      o = 0.01;
    }
    if (a < 0) {
      a = 0;
    }
    e.tension = Math.pow(Math.PI * 2 / o, 2) * i;
    e.friction = Math.PI * 4 * a * i / o;
  }
  return e;
}
function zr(e, t) {
  if (fe.und(t.decay)) {
    var r = !fe.und(t.tension) || !fe.und(t.friction);
    if (!!r || !fe.und(t.frequency) || !fe.und(t.damping) || !fe.und(t.mass)) {
      e.duration = undefined;
      e.decay = undefined;
    }
    if (r) {
      e.frequency = undefined;
    }
  } else {
    e.duration = undefined;
  }
}
var Ur = [];
var Br = (0, P.Z)(function e() {
  (0, q.Z)(this, e);
  this.changed = false;
  this.values = Ur;
  this.toValues = null;
  this.fromValues = Ur;
  this.to = undefined;
  this.from = undefined;
  this.config = new Fr();
  this.immediate = false;
});
function Vr(e, t) {
  var r = t.key;
  var n = t.props;
  var i = t.defaultProps;
  var o = t.state;
  var a = t.actions;
  return new Promise(function (t, s) {
    var l;
    var c;
    var p = kr(n.cancel ?? (i == null ? undefined : i.cancel), r);
    if (p) {
      m();
    } else {
      if (!fe.und(n.pause)) {
        o.paused = kr(n.pause, r);
      }
      var d = i == null ? undefined : i.pause;
      if (d !== true) {
        d = o.paused || kr(d, r);
      }
      l = Er(n.delay || 0, r);
      if (d) {
        o.resumeQueue.add(g);
        a.pause();
      } else {
        a.resume();
        g();
      }
    }
    function f() {
      o.resumeQueue.add(g);
      o.timeouts.delete(c);
      c.cancel();
      l = c.time - Y.now();
    }
    function g() {
      if (l > 0 && !Ae.skipAnimation) {
        o.delayed = true;
        c = Y.setTimeout(m, l);
        o.pauseQueue.add(f);
        o.timeouts.add(c);
      } else {
        m();
      }
    }
    function m() {
      o.delayed &&= false;
      o.pauseQueue.delete(f);
      o.timeouts.delete(c);
      if (e <= (o.cancelId || 0)) {
        p = true;
      }
      try {
        a.start(xr({}, n, {
          callId: e,
          cancel: p
        }), t);
      } catch (r) {
        s(r);
      }
    }
  });
}
function Hr(e, t) {
  if (t.length == 1) {
    return t[0];
  } else if (t.some(function (e) {
    return e.cancelled;
  })) {
    return Qr(e.get());
  } else if (t.every(function (e) {
    return e.noop;
  })) {
    return Wr(e.get());
  } else {
    return Yr(e.get(), t.every(function (e) {
      return e.finished;
    }));
  }
}
function Wr(e) {
  return {
    value: e,
    noop: true,
    finished: true,
    cancelled: false
  };
}
function Yr(e, t, r = false) {
  return {
    value: e,
    finished: t,
    cancelled: r
  };
}
function Qr(e) {
  return {
    value: e,
    cancelled: true,
    finished: false
  };
}
function $r(e, t, r, n) {
  var i = t.callId;
  var o = t.parentId;
  var a = t.onRest;
  var s = r.asyncTo;
  var u = r.promise;
  if (o || e !== s || t.reset) {
    return r.promise = (0, V.Z)((0, B.Z)().mark(function l() {
      var c;
      var p;
      var d;
      var f;
      var g;
      var m;
      var v;
      var y;
      return (0, B.Z)().wrap(function (l) {
        while (1) {
          switch (l.prev = l.next) {
            case 0:
              r.asyncId = i;
              r.asyncTo = e;
              c = Ar(t, function (e, t) {
                if (t === "onRest") {
                  return undefined;
                } else {
                  return e;
                }
              });
              f = new Promise(function (e, t) {
                p = e;
                return d = t;
              });
              g = function (e) {
                var t = i <= (r.cancelId || 0) && Qr(n) || i !== r.asyncId && Yr(n, false);
                if (t) {
                  e.result = t;
                  d(e);
                  throw e;
                }
              };
              m = function (e, t) {
                var o = new Kr();
                var a = new Jr();
                return (0, V.Z)((0, B.Z)().mark(function s() {
                  var u;
                  var l;
                  return (0, B.Z)().wrap(function (s) {
                    while (1) {
                      switch (s.prev = s.next) {
                        case 0:
                          if (!Ae.skipAnimation) {
                            s.next = 5;
                            break;
                          }
                          Gr(r);
                          a.result = Yr(n, false);
                          d(a);
                          throw a;
                        case 5:
                          g(o);
                          u = fe.obj(e) ? xr({}, e) : xr({}, t, {
                            to: e
                          });
                          u.parentId = i;
                          ve(c, function (e, t) {
                            if (fe.und(u[t])) {
                              u[t] = e;
                            }
                          });
                          s.next = 11;
                          return n.start(u);
                        case 11:
                          l = s.sent;
                          g(o);
                          if (!r.paused) {
                            s.next = 16;
                            break;
                          }
                          s.next = 16;
                          return new Promise(function (e) {
                            r.resumeQueue.add(e);
                          });
                        case 16:
                          return s.abrupt("return", l);
                        case 17:
                        case "end":
                          return s.stop();
                      }
                    }
                  }, s);
                }))();
              };
              if (!Ae.skipAnimation) {
                l.next = 9;
                break;
              }
              Gr(r);
              return l.abrupt("return", Yr(n, false));
            case 9:
              l.prev = 9;
              y = fe.arr(e) ? function () {
                var e = (0, V.Z)((0, B.Z)().mark(function e(t) {
                  var r;
                  var n;
                  var i;
                  return (0, B.Z)().wrap(function (e) {
                    while (1) {
                      switch (e.prev = e.next) {
                        case 0:
                          r = (0, H.Z)(t);
                          e.prev = 1;
                          r.s();
                        case 3:
                          if ((n = r.n()).done) {
                            e.next = 9;
                            break;
                          }
                          i = n.value;
                          e.next = 7;
                          return m(i);
                        case 7:
                          e.next = 3;
                          break;
                        case 9:
                          e.next = 14;
                          break;
                        case 11:
                          e.prev = 11;
                          e.t0 = e.catch(1);
                          r.e(e.t0);
                        case 14:
                          e.prev = 14;
                          r.f();
                          return e.finish(14);
                        case 17:
                        case "end":
                          return e.stop();
                      }
                    }
                  }, e, null, [[1, 11, 14, 17]]);
                }));
                return function (t) {
                  return e.apply(this, arguments);
                };
              }()(e) : Promise.resolve(e(m, n.stop.bind(n)));
              l.next = 13;
              return Promise.all([y.then(p), f]);
            case 13:
              v = Yr(n.get(), true, false);
              l.next = 27;
              break;
            case 16:
              l.prev = 16;
              l.t0 = l.catch(9);
              if (!(l.t0 instanceof Kr)) {
                l.next = 22;
                break;
              }
              v = l.t0.result;
              l.next = 27;
              break;
            case 22:
              if (!(l.t0 instanceof Jr)) {
                l.next = 26;
                break;
              }
              v = l.t0.result;
              l.next = 27;
              break;
            case 26:
              throw l.t0;
            case 27:
              l.prev = 27;
              if (i == r.asyncId) {
                r.asyncId = o;
                r.asyncTo = o ? s : undefined;
                r.promise = o ? u : undefined;
              }
              return l.finish(27);
            case 30:
              if (fe.fun(a)) {
                Y.batchedUpdates(function () {
                  a(v, n, n.item);
                });
              }
              return l.abrupt("return", v);
            case 32:
            case "end":
              return l.stop();
          }
        }
      }, l, null, [[9, 16, 27, 30]]);
    }))();
  } else {
    return u;
  }
}
function Gr(e, t) {
  he(e.timeouts, function (e) {
    return e.cancel();
  });
  e.pauseQueue.clear();
  e.resumeQueue.clear();
  e.asyncId = e.asyncTo = e.promise = undefined;
  if (t) {
    e.cancelId = t;
  }
}
var Kr = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r() {
    var e;
    (0, q.Z)(this, r);
    e = t.call(this, "An async animation has been interrupted. You see this error because you forgot to use `await` or `.catch(...)` on its returned promise.");
    e.result = undefined;
    return e;
  }
  return (0, P.Z)(r);
}(U(Error));
var Jr = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r() {
    var e;
    (0, q.Z)(this, r);
    e = t.call(this, "SkipAnimationSignal");
    e.result = undefined;
    return e;
  }
  return (0, P.Z)(r);
}(U(Error));
function Xr(e) {
  return e instanceof tn;
}
var en = 1;
var tn = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r() {
    var e;
    (0, q.Z)(this, r);
    for (var n = arguments.length, i = new Array(n), o = 0; o < n; o++) {
      i[o] = arguments[o];
    }
    e = t.call.apply(t, [this].concat(i));
    e.id = en++;
    e.key = undefined;
    e._priority = 0;
    return e;
  }
  (0, P.Z)(r, [{
    key: "priority",
    get: function () {
      return this._priority;
    },
    set: function (e) {
      if (this._priority != e) {
        this._priority = e;
        this._onPriorityChange(e);
      }
    }
  }, {
    key: "get",
    value: function () {
      var e = rr(this);
      return e && e.getValue();
    }
  }, {
    key: "to",
    value: function () {
      for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
        t[r] = arguments[r];
      }
      return Ae.to(this, t);
    }
  }, {
    key: "interpolate",
    value: function () {
      Ut();
      for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
        t[r] = arguments[r];
      }
      return Ae.to(this, t);
    }
  }, {
    key: "toJSON",
    value: function () {
      return this.get();
    }
  }, {
    key: "observerAdded",
    value: function (e) {
      if (e == 1) {
        this._attach();
      }
    }
  }, {
    key: "observerRemoved",
    value: function (e) {
      if (e == 0) {
        this._detach();
      }
    }
  }, {
    key: "_attach",
    value: function () {}
  }, {
    key: "_detach",
    value: function () {}
  }, {
    key: "_onChange",
    value: function (e, t = false) {
      kt(this, {
        type: "change",
        parent: this,
        value: e,
        idle: t
      });
    }
  }, {
    key: "_onPriorityChange",
    value: function (e) {
      if (!this.idle) {
        qe.sort(this);
      }
      kt(this, {
        type: "priority",
        parent: this,
        priority: e
      });
    }
  }]);
  return r;
}(St);
var rn = Symbol.for("SpringPhase");
var nn = 1;
var on = 2;
var an = 4;
function sn(e) {
  return (e[rn] & nn) > 0;
}
function un(e) {
  return (e[rn] & on) > 0;
}
function ln(e) {
  return (e[rn] & an) > 0;
}
function cn(e, t) {
  if (t) {
    return e[rn] |= on | nn;
  } else {
    return e[rn] &= ~on;
  }
}
function pn(e, t) {
  if (t) {
    return e[rn] |= an;
  } else {
    return e[rn] &= ~an;
  }
}
var dn = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r(e, n) {
    var i;
    (0, q.Z)(this, r);
    i = t.call(this);
    i.key = undefined;
    i.animation = new Br();
    i.queue = undefined;
    i.defaultProps = {};
    i._state = {
      paused: false,
      delayed: false,
      pauseQueue: new Set(),
      resumeQueue: new Set(),
      timeouts: new Set()
    };
    i._pendingCalls = new Set();
    i._lastCallId = 0;
    i._lastToId = 0;
    i._memoizedDuration = 0;
    if (!fe.und(e) || !fe.und(n)) {
      var o = fe.obj(e) ? xr({}, e) : xr({}, n, {
        from: e
      });
      if (fe.und(o.default)) {
        o.default = true;
      }
      i.start(o);
    }
    return i;
  }
  (0, P.Z)(r, [{
    key: "idle",
    get: function () {
      return !un(this) && !this._state.asyncTo || ln(this);
    }
  }, {
    key: "goal",
    get: function () {
      return wt(this.animation.to);
    }
  }, {
    key: "velocity",
    get: function () {
      var e = rr(this);
      if (e instanceof ar) {
        return e.lastVelocity || 0;
      } else {
        return e.getPayload().map(function (e) {
          return e.lastVelocity || 0;
        });
      }
    }
  }, {
    key: "hasAnimated",
    get: function () {
      return sn(this);
    }
  }, {
    key: "isAnimating",
    get: function () {
      return un(this);
    }
  }, {
    key: "isPaused",
    get: function () {
      return ln(this);
    }
  }, {
    key: "isDelayed",
    get: function () {
      return this._state.delayed;
    }
  }, {
    key: "advance",
    value: function (e) {
      var t = this;
      var r = true;
      var n = false;
      var i = this.animation;
      var o = i.config;
      var a = i.toValues;
      var s = ir(i.to);
      if (!s && bt(i.to)) {
        a = ye(wt(i.to));
      }
      i.values.forEach(function (u, l) {
        if (!u.done) {
          var c = u.constructor == sr ? 1 : s ? s[l].lastPosition : a[l];
          var p = i.immediate;
          var d = c;
          if (!p) {
            d = u.lastPosition;
            if (o.tension <= 0) {
              u.done = true;
              return;
            }
            var f;
            var g = u.elapsedTime += e;
            var m = i.fromValues[l];
            var v = u.v0 ??= fe.arr(o.velocity) ? o.velocity[l] : o.velocity;
            var y = o.precision || (m == c ? 0.005 : Math.min(1, Math.abs(c - m) * 0.001));
            if (fe.und(o.duration)) {
              if (o.decay) {
                var h = o.decay === true ? 0.998 : o.decay;
                var b = Math.exp(-(1 - h) * g);
                d = m + v / (1 - h) * (1 - b);
                p = Math.abs(u.lastPosition - d) <= y;
                f = v * b;
              } else {
                f = u.lastVelocity == null ? v : u.lastVelocity;
                var w;
                var x = o.restVelocity || y / 10;
                var E = o.clamp ? 0 : o.bounce;
                var k = !fe.und(E);
                var S = m == c ? u.v0 > 0 : m < c;
                var T = false;
                var C = 1;
                for (var A = Math.ceil(e / C), _ = 0; _ < A; ++_) {
                  w = Math.abs(f) > x;
                  if (!w && (p = Math.abs(c - d) <= y, p)) {
                    break;
                  }
                  if (k) {
                    T = d == c || d > c == S;
                    if (T) {
                      f = -f * E;
                      d = c;
                    }
                  }
                  var O = -o.tension * 0.000001 * (d - c);
                  var M = -o.friction * 0.001 * f;
                  var P = (O + M) / o.mass;
                  f += P * C;
                  d += f * C;
                }
              }
            } else {
              var q = 1;
              if (o.duration > 0) {
                if (t._memoizedDuration !== o.duration) {
                  t._memoizedDuration = o.duration;
                  if (u.durationProgress > 0) {
                    u.elapsedTime = o.duration * u.durationProgress;
                    g = u.elapsedTime += e;
                  }
                }
                q = (o.progress || 0) + g / t._memoizedDuration;
                q = q > 1 ? 1 : q < 0 ? 0 : q;
                u.durationProgress = q;
              }
              d = m + o.easing(q) * (c - m);
              f = (d - u.lastPosition) / e;
              p = q == 1;
            }
            u.lastVelocity = f;
            if (Number.isNaN(d)) {
              console.warn("Got NaN while animating:", t);
              p = true;
            }
          }
          if (s && !s[l].done) {
            p = false;
          }
          if (p) {
            u.done = true;
          } else {
            r = false;
          }
          if (u.setValue(d, o.round)) {
            n = true;
          }
        }
      });
      var u = rr(this);
      var l = u.getValue();
      if (r) {
        var c = wt(i.to);
        if (l === c && !n || o.decay) {
          if (n && o.decay) {
            this._onChange(l);
          }
        } else {
          u.setValue(c);
          this._onChange(c);
        }
        this._stop();
      } else if (n) {
        this._onChange(l);
      }
    }
  }, {
    key: "set",
    value: function (e) {
      var t = this;
      Y.batchedUpdates(function () {
        t._stop();
        t._focus(e);
        t._set(e);
      });
      return this;
    }
  }, {
    key: "pause",
    value: function () {
      this._update({
        pause: true
      });
    }
  }, {
    key: "resume",
    value: function () {
      this._update({
        pause: false
      });
    }
  }, {
    key: "finish",
    value: function () {
      var e = this;
      if (un(this)) {
        var t = this.animation;
        var r = t.to;
        var n = t.config;
        Y.batchedUpdates(function () {
          e._onStart();
          if (!n.decay) {
            e._set(r, false);
          }
          e._stop();
        });
      }
      return this;
    }
  }, {
    key: "update",
    value: function (e) {
      var t = this.queue ||= [];
      t.push(e);
      return this;
    }
  }, {
    key: "start",
    value: function (e, t) {
      var r;
      var n = this;
      if (fe.und(e)) {
        r = this.queue || [];
        this.queue = [];
      } else {
        r = [fe.obj(e) ? e : xr({}, t, {
          to: e
        })];
      }
      return Promise.all(r.map(function (e) {
        var t = n._update(e);
        return t;
      })).then(function (e) {
        return Hr(n, e);
      });
    }
  }, {
    key: "stop",
    value: function (e) {
      var t = this;
      var r = this.animation.to;
      this._focus(this.get());
      Gr(this._state, e && this._lastCallId);
      Y.batchedUpdates(function () {
        return t._stop(r, e);
      });
      return this;
    }
  }, {
    key: "reset",
    value: function () {
      this._update({
        reset: true
      });
    }
  }, {
    key: "eventObserved",
    value: function (e) {
      if (e.type == "change") {
        this._start();
      } else if (e.type == "priority") {
        this.priority = e.priority + 1;
      }
    }
  }, {
    key: "_prepareNode",
    value: function (e) {
      var t = this.key || "";
      var r = e.to;
      var n = e.from;
      r = fe.obj(r) ? r[t] : r;
      if (r == null || Rr(r)) {
        r = undefined;
      }
      n = fe.obj(n) ? n[t] : n;
      if (n == null) {
        n = undefined;
      }
      var i = {
        to: r,
        from: n
      };
      if (!sn(this)) {
        if (e.reverse) {
          var o = [n, r];
          r = o[0];
          n = o[1];
        }
        n = wt(n);
        if (fe.und(n)) {
          if (!rr(this)) {
            this._set(r);
          }
        } else {
          this._set(n);
        }
      }
      return i;
    }
  }, {
    key: "_update",
    value: function (e, t) {
      var r = this;
      var n = xr({}, e);
      var i = this.key;
      var o = this.defaultProps;
      if (n.default) {
        Object.assign(o, Ar(n, function (e, t) {
          if (/^on/.test(t)) {
            return Sr(e, i);
          } else {
            return e;
          }
        }));
      }
      bn(this, n, "onProps");
      wn(this, "onProps", n, this);
      var a = this._prepareNode(n);
      if (Object.isFrozen(this)) {
        throw Error("Cannot animate a `SpringValue` object that is frozen. Did you forget to pass your component to `animated(...)` before animating its props?");
      }
      var s = this._state;
      return Vr(++this._lastCallId, {
        key: i,
        props: n,
        defaultProps: o,
        state: s,
        actions: {
          pause: function () {
            if (!ln(r)) {
              pn(r, true);
              xe(s.pauseQueue);
              wn(r, "onPause", Yr(r, fn(r, r.animation.to)), r);
            }
          },
          resume: function () {
            if (ln(r)) {
              pn(r, false);
              if (un(r)) {
                r._resume();
              }
              xe(s.resumeQueue);
              wn(r, "onResume", Yr(r, fn(r, r.animation.to)), r);
            }
          },
          start: this._merge.bind(this, a)
        }
      }).then(function (e) {
        if (n.loop && e.finished && (!t || !e.noop)) {
          var i = gn(n);
          if (i) {
            return r._update(i, true);
          }
        }
        return e;
      });
    }
  }, {
    key: "_merge",
    value: function (e, t, r) {
      var n = this;
      if (t.cancel) {
        this.stop(true);
        return r(Qr(this));
      }
      var i = !fe.und(e.to);
      var o = !fe.und(e.from);
      if (i || o) {
        if (!(t.callId > this._lastToId)) {
          return r(Qr(this));
        }
        this._lastToId = t.callId;
      }
      var a = this.key;
      var s = this.defaultProps;
      var u = this.animation;
      var l = u.to;
      var c = u.from;
      var p = e.to;
      var d = p === undefined ? l : p;
      var f = e.from;
      var g = f === undefined ? c : f;
      if (!!o && !i && (!t.default || !!fe.und(d))) {
        d = g;
      }
      if (t.reverse) {
        var m = [g, d];
        d = m[0];
        g = m[1];
      }
      var v = !ge(g, c);
      if (v) {
        u.from = g;
      }
      g = wt(g);
      var y = !ge(d, l);
      if (y) {
        this._focus(d);
      }
      var h = Rr(t.to);
      var b = u.config;
      var w = b.decay;
      var x = b.velocity;
      if (i || o) {
        b.velocity = 0;
      }
      if (t.config && !h) {
        Zr(b, Er(t.config, a), t.config !== s.config ? Er(s.config, a) : undefined);
      }
      var E = rr(this);
      if (!E || fe.und(d)) {
        return r(Yr(this, true));
      }
      var k = fe.und(t.reset) ? o && !t.default : !fe.und(g) && kr(t.reset, a);
      var S = k ? g : this.get();
      var T = qr(d);
      var C = fe.num(T) || fe.arr(T) || Ht(T);
      var A = !h && (!C || kr(s.immediate || t.immediate, a));
      if (y) {
        var _ = dr(d);
        if (_ !== E.constructor) {
          if (!A) {
            throw Error(`Cannot animate between ${E.constructor.name} and ${_.name}, as the "to" prop suggests`);
          }
          E = this._set(T);
        }
      }
      var O = E.constructor;
      var M = bt(d);
      var P = false;
      if (!M) {
        var q = k || !sn(this) && v;
        if (y || q) {
          P = ge(qr(S), T);
          M = !P;
        }
        if (!ge(u.immediate, A) && !A || !ge(b.decay, w) || !ge(b.velocity, x)) {
          M = true;
        }
      }
      if (P && un(this)) {
        if (u.changed && !k) {
          M = true;
        } else if (!M) {
          this._stop(l);
        }
      }
      if (!h && ((M || bt(l)) && (u.values = E.getPayload(), u.toValues = bt(d) ? null : O == sr ? [1] : ye(T)), u.immediate != A && (u.immediate = A, A || k || this._set(l)), M)) {
        var N = u.onRest;
        me(hn, function (e) {
          return bn(n, t, e);
        });
        var R = Yr(this, fn(this, l));
        xe(this._pendingCalls, R);
        this._pendingCalls.add(r);
        if (u.changed) {
          Y.batchedUpdates(function () {
            u.changed = !k;
            if (N != null) {
              N(R, n);
            }
            if (k) {
              Er(s.onRest, R);
            } else if (u.onStart != null) {
              u.onStart(R, n);
            }
          });
        }
      }
      if (k) {
        this._set(S);
      }
      if (h) {
        r($r(t.to, t, this._state, this));
      } else if (M) {
        this._start();
      } else if (un(this) && !y) {
        this._pendingCalls.add(r);
      } else {
        r(Wr(S));
      }
    }
  }, {
    key: "_focus",
    value: function (e) {
      var t = this.animation;
      if (e !== t.to) {
        if (xt(this)) {
          this._detach();
        }
        t.to = e;
        if (xt(this)) {
          this._attach();
        }
      }
    }
  }, {
    key: "_attach",
    value: function () {
      var e = 0;
      var t = this.animation.to;
      if (bt(t)) {
        Ct(t, this);
        if (Xr(t)) {
          e = t.priority + 1;
        }
      }
      this.priority = e;
    }
  }, {
    key: "_detach",
    value: function () {
      var e = this.animation.to;
      if (bt(e)) {
        At(e, this);
      }
    }
  }, {
    key: "_set",
    value: function (e) {
      var t = this;
      var r = !(arguments.length > 1) || arguments[1] === undefined || arguments[1];
      var n = wt(e);
      if (!fe.und(n)) {
        var i = rr(this);
        if (!i || !ge(n, i.getValue())) {
          var o = dr(n);
          if (i && i.constructor == o) {
            i.setValue(n);
          } else {
            nr(this, o.create(n));
          }
          if (i) {
            Y.batchedUpdates(function () {
              t._onChange(n, r);
            });
          }
        }
      }
      return rr(this);
    }
  }, {
    key: "_onStart",
    value: function () {
      var e = this.animation;
      if (!e.changed) {
        e.changed = true;
        wn(this, "onStart", Yr(this, fn(this, e.to)), this);
      }
    }
  }, {
    key: "_onChange",
    value: function (e, t) {
      if (!t) {
        this._onStart();
        Er(this.animation.onChange, e, this);
      }
      Er(this.defaultProps.onChange, e, this);
      (0, D.Z)((0, L.Z)(r.prototype), "_onChange", this).call(this, e, t);
    }
  }, {
    key: "_start",
    value: function () {
      var e = this.animation;
      rr(this).reset(wt(e.to));
      if (!e.immediate) {
        e.fromValues = e.values.map(function (e) {
          return e.lastPosition;
        });
      }
      if (!un(this)) {
        cn(this, true);
        if (!ln(this)) {
          this._resume();
        }
      }
    }
  }, {
    key: "_resume",
    value: function () {
      if (Ae.skipAnimation) {
        this.finish();
      } else {
        qe.start(this);
      }
    }
  }, {
    key: "_stop",
    value: function (e, t) {
      if (un(this)) {
        cn(this, false);
        var r = this.animation;
        me(r.values, function (e) {
          e.done = true;
        });
        if (r.toValues) {
          r.onChange = r.onPause = r.onResume = undefined;
        }
        kt(this, {
          type: "idle",
          parent: this
        });
        var n = t ? Qr(this.get()) : Yr(this.get(), fn(this, e ?? r.to));
        xe(this._pendingCalls, n);
        if (r.changed) {
          r.changed = false;
          wn(this, "onRest", n, this);
        }
      }
    }
  }]);
  return r;
}(tn);
function fn(e, t) {
  var r = qr(t);
  var n = qr(e.get());
  return ge(n, r);
}
function gn(e, t = e.loop, r = e.to) {
  var n = Er(t);
  if (n) {
    var i = n !== true && Pr(n);
    var o = (i || e).reverse;
    var a = !i || i.reset;
    return mn(xr({}, e, {
      loop: t,
      default: false,
      pause: undefined,
      to: !o || Rr(r) ? r : undefined,
      from: a ? e.from : undefined,
      reset: a
    }, i));
  }
}
function mn(e) {
  var t = e = Pr(e);
  var r = t.to;
  var n = t.from;
  var i = new Set();
  if (fe.obj(r)) {
    yn(r, i);
  }
  if (fe.obj(n)) {
    yn(n, i);
  }
  e.keys = i.size ? Array.from(i) : null;
  return e;
}
function vn(e) {
  var t = mn(e);
  if (fe.und(t.default)) {
    t.default = Ar(t);
  }
  return t;
}
function yn(e, t) {
  ve(e, function (e, r) {
    return e != null && t.add(r);
  });
}
var hn = ["onStart", "onRest", "onChange", "onPause", "onResume"];
function bn(e, t, r) {
  e.animation[r] = t[r] !== Tr(t, r) ? Sr(t[r], e.key) : undefined;
}
function wn(e, t) {
  var r;
  var n;
  var i;
  var o;
  var a;
  var s;
  for (var u = arguments.length, l = new Array(u > 2 ? u - 2 : 0), c = 2; c < u; c++) {
    l[c - 2] = arguments[c];
  }
  if ((i = (o = e.animation)[t]) != null) {
    (r = i).call.apply(r, [o].concat(l));
  }
  if ((a = (s = e.defaultProps)[t]) != null) {
    (n = a).call.apply(n, [s].concat(l));
  }
}
var xn = ["onStart", "onChange", "onRest"];
var En = 1;
var kn = function () {
  function e(t, r) {
    (0, q.Z)(this, e);
    this.id = En++;
    this.springs = {};
    this.queue = [];
    this.ref = undefined;
    this._flush = undefined;
    this._initialProps = undefined;
    this._lastAsyncId = 0;
    this._active = new Set();
    this._changed = new Set();
    this._started = false;
    this._item = undefined;
    this._state = {
      paused: false,
      pauseQueue: new Set(),
      resumeQueue: new Set(),
      timeouts: new Set()
    };
    this._events = {
      onStart: new Map(),
      onChange: new Map(),
      onRest: new Map()
    };
    this._onFrame = this._onFrame.bind(this);
    if (r) {
      this._flush = r;
    }
    if (t) {
      this.start(xr({
        default: true
      }, t));
    }
  }
  (0, P.Z)(e, [{
    key: "idle",
    get: function () {
      return !this._state.asyncTo && Object.values(this.springs).every(function (e) {
        return e.idle && !e.isDelayed && !e.isPaused;
      });
    }
  }, {
    key: "item",
    get: function () {
      return this._item;
    },
    set: function (e) {
      this._item = e;
    }
  }, {
    key: "get",
    value: function () {
      var e = {};
      this.each(function (t, r) {
        return e[r] = t.get();
      });
      return e;
    }
  }, {
    key: "set",
    value: function (e) {
      for (var t in e) {
        var r = e[t];
        if (!fe.und(r)) {
          this.springs[t].set(r);
        }
      }
    }
  }, {
    key: "update",
    value: function (e) {
      if (e) {
        this.queue.push(mn(e));
      }
      return this;
    }
  }, {
    key: "start",
    value: function (e) {
      var t = this.queue;
      if (e) {
        t = ye(e).map(mn);
      } else {
        this.queue = [];
      }
      if (this._flush) {
        return this._flush(this, t);
      } else {
        Pn(this, t);
        return Sn(this, t);
      }
    }
  }, {
    key: "stop",
    value: function (e, t) {
      if (e !== !!e) {
        t = e;
      }
      if (t) {
        var r = this.springs;
        me(ye(t), function (t) {
          return r[t].stop(!!e);
        });
      } else {
        Gr(this._state, this._lastAsyncId);
        this.each(function (t) {
          return t.stop(!!e);
        });
      }
      return this;
    }
  }, {
    key: "pause",
    value: function (e) {
      if (fe.und(e)) {
        this.start({
          pause: true
        });
      } else {
        var t = this.springs;
        me(ye(e), function (e) {
          return t[e].pause();
        });
      }
      return this;
    }
  }, {
    key: "resume",
    value: function (e) {
      if (fe.und(e)) {
        this.start({
          pause: false
        });
      } else {
        var t = this.springs;
        me(ye(e), function (e) {
          return t[e].resume();
        });
      }
      return this;
    }
  }, {
    key: "each",
    value: function (e) {
      ve(this.springs, e);
    }
  }, {
    key: "_onFrame",
    value: function () {
      var e = this;
      var t = this._events;
      var r = t.onStart;
      var n = t.onChange;
      var i = t.onRest;
      var o = this._active.size > 0;
      var a = this._changed.size > 0;
      if (o && !this._started || a && !this._started) {
        this._started = true;
        he(r, function (t) {
          var r = (0, p.Z)(t, 2);
          var n = r[0];
          var i = r[1];
          i.value = e.get();
          n(i, e, e._item);
        });
      }
      var s = !o && this._started;
      var u = a || s && i.size ? this.get() : null;
      if (a && n.size) {
        he(n, function (t) {
          var r = (0, p.Z)(t, 2);
          var n = r[0];
          var i = r[1];
          i.value = u;
          n(i, e, e._item);
        });
      }
      if (s) {
        this._started = false;
        he(i, function (t) {
          var r = (0, p.Z)(t, 2);
          var n = r[0];
          var i = r[1];
          i.value = u;
          n(i, e, e._item);
        });
      }
    }
  }, {
    key: "eventObserved",
    value: function (e) {
      if (e.type == "change") {
        this._changed.add(e.parent);
        if (!e.idle) {
          this._active.add(e.parent);
        }
      } else {
        if (e.type != "idle") {
          return;
        }
        this._active.delete(e.parent);
      }
      Y.onFrame(this._onFrame);
    }
  }]);
  return e;
}();
function Sn(e, t) {
  return Promise.all(t.map(function (t) {
    return Tn(e, t);
  })).then(function (t) {
    return Hr(e, t);
  });
}
function Tn(e, t, r) {
  return Cn.apply(this, arguments);
}
function Cn() {
  Cn = (0, V.Z)((0, B.Z)().mark(function e(t, r, n) {
    var i;
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
    var v;
    return (0, B.Z)().wrap(function (e) {
      while (1) {
        switch (e.prev = e.next) {
          case 0:
            i = r.keys;
            o = r.to;
            a = r.from;
            s = r.loop;
            u = r.onRest;
            l = r.onResolve;
            c = fe.obj(r.default) && r.default;
            if (s) {
              r.loop = false;
            }
            if (o === false) {
              r.to = null;
            }
            if (a === false) {
              r.from = null;
            }
            p = fe.arr(o) || fe.fun(o) ? o : undefined;
            if (p) {
              r.to = undefined;
              r.onRest = undefined;
              if (c) {
                c.onRest = undefined;
              }
            } else {
              me(xn, function (e) {
                var n = r[e];
                if (fe.fun(n)) {
                  var i = t._events[e];
                  r[e] = function (e) {
                    var t = e.finished;
                    var r = e.cancelled;
                    var o = i.get(n);
                    if (o) {
                      if (!t) {
                        o.finished = false;
                      }
                      if (r) {
                        o.cancelled = true;
                      }
                    } else {
                      i.set(n, {
                        value: null,
                        finished: t || false,
                        cancelled: r || false
                      });
                    }
                  };
                  if (c) {
                    c[e] = r[e];
                  }
                }
              });
            }
            d = t._state;
            if (r.pause === !d.paused) {
              d.paused = r.pause;
              xe(r.pause ? d.pauseQueue : d.resumeQueue);
            } else if (d.paused) {
              r.pause = true;
            }
            f = (i || Object.keys(t.springs)).map(function (e) {
              return t.springs[e].start(r);
            });
            g = r.cancel === true || Tr(r, "cancel") === true;
            if (p || g && d.asyncId) {
              f.push(Vr(++t._lastAsyncId, {
                props: r,
                state: d,
                actions: {
                  pause: pe,
                  resume: pe,
                  start: function (e, r) {
                    if (g) {
                      Gr(d, t._lastAsyncId);
                      r(Qr(t));
                    } else {
                      e.onRest = u;
                      r($r(p, e, d, t));
                    }
                  }
                }
              }));
            }
            if (!d.paused) {
              e.next = 15;
              break;
            }
            e.next = 15;
            return new Promise(function (e) {
              d.resumeQueue.add(e);
            });
          case 15:
            e.t0 = Hr;
            e.t1 = t;
            e.next = 19;
            return Promise.all(f);
          case 19:
            e.t2 = e.sent;
            m = (0, e.t0)(e.t1, e.t2);
            if (!s || !m.finished || n && m.noop) {
              e.next = 26;
              break;
            }
            v = gn(r, s, o);
            if (!v) {
              e.next = 26;
              break;
            }
            Pn(t, [v]);
            return e.abrupt("return", Tn(t, v, true));
          case 26:
            if (l) {
              Y.batchedUpdates(function () {
                return l(m, t, t.item);
              });
            }
            return e.abrupt("return", m);
          case 28:
          case "end":
            return e.stop();
        }
      }
    }, e);
  }));
  return Cn.apply(this, arguments);
}
function An(e, t) {
  var r = xr({}, e.springs);
  if (t) {
    me(ye(t), function (e) {
      if (fe.und(e.keys)) {
        e = mn(e);
      }
      if (!fe.obj(e.to)) {
        e = xr({}, e, {
          to: undefined
        });
      }
      Mn(r, e, function (e) {
        return On(e);
      });
    });
  }
  _n(e, r);
  return r;
}
function _n(e, t) {
  ve(t, function (t, r) {
    if (!e.springs[r]) {
      e.springs[r] = t;
      Ct(t, e);
    }
  });
}
function On(e, t) {
  var r = new dn();
  r.key = e;
  if (t) {
    Ct(r, t);
  }
  return r;
}
function Mn(e, t, r) {
  if (t.keys) {
    me(t.keys, function (n) {
      var i = e[n] ||= r(n);
      i._prepareNode(t);
    });
  }
}
function Pn(e, t) {
  me(t, function (t) {
    Mn(e.springs, t, function (t) {
      return On(t, e);
    });
  });
}
function qn(e, t) {
  if (e == null) {
    return {};
  }
  var r;
  var n;
  var i = {};
  var o = Object.keys(e);
  for (n = 0; n < o.length; n++) {
    r = o[n];
    if (!(t.indexOf(r) >= 0)) {
      i[r] = e[r];
    }
  }
  return i;
}
var Nn = ["children"];
function Rn(e) {
  var t = e.children;
  var r = qn(e, Nn);
  var n = (0, a.useContext)(In);
  var i = r.pause || !!n.pause;
  var o = r.immediate || !!n.immediate;
  r = $t(function () {
    return {
      pause: i,
      immediate: o
    };
  }, [i, o]);
  var s = In.Provider;
  return a.createElement(s, {
    value: r
  }, t);
}
var In = jn(Rn, {});
function jn(e, t) {
  Object.assign(e, a.createContext(t));
  e.Provider._context = e;
  e.Consumer._context = e;
  return e;
}
Rn.Provider = In.Provider;
Rn.Consumer = In.Consumer;
function Dn() {
  var e = [];
  function t(t) {
    Vt();
    var n = [];
    me(e, function (e, i) {
      if (fe.und(t)) {
        n.push(e.start());
      } else {
        var o = r(t, e, i);
        if (o) {
          n.push(e.start(o));
        }
      }
    });
    return n;
  }
  t.current = e;
  t.add = function (t) {
    if (!e.includes(t)) {
      e.push(t);
    }
  };
  t.delete = function (t) {
    var r = e.indexOf(t);
    if (~r) {
      e.splice(r, 1);
    }
  };
  t.pause = function () {
    var t = arguments;
    me(e, function (e) {
      return e.pause.apply(e, (0, j.Z)(t));
    });
    return this;
  };
  t.resume = function () {
    var t = arguments;
    me(e, function (e) {
      return e.resume.apply(e, (0, j.Z)(t));
    });
    return this;
  };
  t.set = function (t) {
    me(e, function (e) {
      return e.set(t);
    });
  };
  t.start = function (t) {
    var r = this;
    var n = [];
    me(e, function (e, i) {
      if (fe.und(t)) {
        n.push(e.start());
      } else {
        var o = r._getProps(t, e, i);
        if (o) {
          n.push(e.start(o));
        }
      }
    });
    return n;
  };
  t.stop = function () {
    var t = arguments;
    me(e, function (e) {
      return e.stop.apply(e, (0, j.Z)(t));
    });
    return this;
  };
  t.update = function (t) {
    var r = this;
    me(e, function (e, n) {
      return e.update(r._getProps(t, e, n));
    });
    return this;
  };
  function r(e, t, r) {
    if (fe.fun(e)) {
      return e(r, t);
    } else {
      return e;
    }
  }
  t._getProps = r;
  return t;
}
function Ln(e, t, r) {
  var n = arguments;
  var i = fe.fun(t) && t;
  if (i && !r) {
    r = [];
  }
  var o = (0, a.useMemo)(function () {
    if (i || n.length == 3) {
      return Dn();
    } else {
      return undefined;
    }
  }, []);
  var s = (0, a.useRef)(0);
  var u = Qt();
  var l = (0, a.useMemo)(function () {
    return {
      ctrls: [],
      queue: [],
      flush: function (e, t) {
        var r = An(e, t);
        var n = s.current > 0 && !l.queue.length && !Object.keys(r).some(function (t) {
          return !e.springs[t];
        });
        if (n) {
          return Sn(e, t);
        } else {
          return new Promise(function (n) {
            _n(e, r);
            l.queue.push(function () {
              n(Sn(e, t));
            });
            u();
          });
        }
      }
    };
  }, []);
  var c = (0, a.useRef)((0, j.Z)(l.ctrls));
  var p = [];
  var d = Xt(e) || 0;
  function f(e, r) {
    for (var n = e; n < r; n++) {
      var o = c.current[n] ||= new kn(null, l.flush);
      var a = i ? i(n, o) : t[n];
      if (a) {
        p[n] = vn(a);
      }
    }
  }
  (0, a.useMemo)(function () {
    me(c.current.slice(e, d), function (e) {
      Ir(e, o);
      e.stop(true);
    });
    c.current.length = e;
    f(d, e);
  }, [e]);
  (0, a.useMemo)(function () {
    f(0, Math.min(d, e));
  }, r);
  var g = c.current.map(function (e, t) {
    return An(e, p[t]);
  });
  var m = (0, a.useContext)(Rn);
  var v = Xt(m);
  var y = m !== v && Nr(m);
  Wt(function () {
    s.current++;
    l.ctrls = c.current;
    var e = l.queue;
    if (e.length) {
      l.queue = [];
      me(e, function (e) {
        return e();
      });
    }
    me(c.current, function (e, t) {
      if (o != null) {
        o.add(e);
      }
      if (y) {
        e.start({
          default: m
        });
      }
      var r = p[t];
      if (r) {
        jr(e, r.ref);
        if (e.ref) {
          e.queue.push(r);
        } else {
          e.start(r);
        }
      }
    });
  });
  Kt(function () {
    return function () {
      me(l.ctrls, function (e) {
        return e.stop(true);
      });
    };
  });
  var h = g.map(function (e) {
    return xr({}, e);
  });
  if (o) {
    return [h, o];
  } else {
    return h;
  }
}
function Fn(e, t) {
  var r = fe.fun(e);
  var n = Ln(1, r ? e : [e], r ? t || [] : t);
  var i = (0, p.Z)(n, 2);
  var o = (0, p.Z)(i[0], 1);
  var a = o[0];
  var s = i[1];
  if (r || arguments.length == 2) {
    return [a, s];
  } else {
    return a;
  }
}
var Zn;
(function (e) {
  e.MOUNT = "mount";
  e.ENTER = "enter";
  e.UPDATE = "update";
  e.LEAVE = "leave";
})(Zn ||= {});
var zn = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r(e, n) {
    var i;
    (0, q.Z)(this, r);
    i = t.call(this);
    i.key = undefined;
    i.idle = true;
    i.calc = undefined;
    i._active = new Set();
    i.source = e;
    i.calc = ot.apply(undefined, (0, j.Z)(n));
    var o = i._get();
    var a = dr(o);
    nr((0, I.Z)(i), a.create(o));
    return i;
  }
  (0, P.Z)(r, [{
    key: "advance",
    value: function (e) {
      var t = this._get();
      var r = this.get();
      if (!ge(t, r)) {
        rr(this).setValue(t);
        this._onChange(t, this.idle);
      }
      if (!this.idle && Bn(this._active)) {
        Vn(this);
      }
    }
  }, {
    key: "_get",
    value: function () {
      var e = fe.arr(this.source) ? this.source.map(wt) : ye(wt(this.source));
      return this.calc.apply(this, (0, j.Z)(e));
    }
  }, {
    key: "_start",
    value: function () {
      var e = this;
      if (this.idle && !Bn(this._active)) {
        this.idle = false;
        me(ir(this), function (e) {
          e.done = false;
        });
        if (Ae.skipAnimation) {
          Y.batchedUpdates(function () {
            return e.advance();
          });
          Vn(this);
        } else {
          qe.start(this);
        }
      }
    }
  }, {
    key: "_attach",
    value: function () {
      var e = this;
      var t = 1;
      me(ye(this.source), function (r) {
        if (bt(r)) {
          Ct(r, e);
        }
        if (Xr(r)) {
          if (!r.idle) {
            e._active.add(r);
          }
          t = Math.max(t, r.priority + 1);
        }
      });
      this.priority = t;
      this._start();
    }
  }, {
    key: "_detach",
    value: function () {
      var e = this;
      me(ye(this.source), function (t) {
        if (bt(t)) {
          At(t, e);
        }
      });
      this._active.clear();
      Vn(this);
    }
  }, {
    key: "eventObserved",
    value: function (e) {
      if (e.type == "change") {
        if (e.idle) {
          this.advance();
        } else {
          this._active.add(e.parent);
          this._start();
        }
      } else if (e.type == "idle") {
        this._active.delete(e.parent);
      } else if (e.type == "priority") {
        this.priority = ye(this.source).reduce(function (e, t) {
          return Math.max(e, (Xr(t) ? t.priority : 0) + 1);
        }, 0);
      }
    }
  }]);
  return r;
}(tn);
function Un(e) {
  return e.idle !== false;
}
function Bn(e) {
  return !e.size || Array.from(e).every(Un);
}
function Vn(e) {
  if (!e.idle) {
    e.idle = true;
    me(ir(e), function (e) {
      e.done = true;
    });
    kt(e, {
      type: "idle",
      parent: e
    });
  }
}
Ae.assign({
  createStringInterpolator: Lt,
  to: function (e, t) {
    return new zn(e, t);
  }
});
qe.advance;
var Hn = require("./87995.js");
var Wn = require.t(Hn, 2);
function Yn(e, t) {
  if (e == null) {
    return {};
  }
  var r;
  var n;
  var i = {};
  var o = Object.keys(e);
  for (n = 0; n < o.length; n++) {
    r = o[n];
    if (!(t.indexOf(r) >= 0)) {
      i[r] = e[r];
    }
  }
  return i;
}
var Qn = ["style", "children", "scrollTop", "scrollLeft", "viewBox"];
var $n = /^--/;
function Gn(e, t) {
  if (t == null || typeof t === "boolean" || t === "") {
    return "";
  } else if (typeof t !== "number" || t === 0 || $n.test(e) || Xn.hasOwnProperty(e) && Xn[e]) {
    return ("" + t).trim();
  } else {
    return t + "px";
  }
}
var Kn = {};
function Jn(e, t) {
  if (!e.nodeType || !e.setAttribute) {
    return false;
  }
  var r = e.nodeName === "filter" || e.parentNode && e.parentNode.nodeName === "filter";
  var n = t;
  var i = n.style;
  var o = n.children;
  var a = n.scrollTop;
  var s = n.scrollLeft;
  var u = n.viewBox;
  var l = Yn(n, Qn);
  var c = Object.values(l);
  var p = Object.keys(l).map(function (t) {
    if (r || e.hasAttribute(t)) {
      return t;
    } else {
      return Kn[t] ||= t.replace(/([A-Z])/g, function (e) {
        return "-" + e.toLowerCase();
      });
    }
  });
  if (o !== undefined) {
    e.textContent = o;
  }
  for (var d in i) {
    if (i.hasOwnProperty(d)) {
      var f = Gn(d, i[d]);
      if ($n.test(d)) {
        e.style.setProperty(d, f);
      } else {
        e.style[d] = f;
      }
    }
  }
  p.forEach(function (t, r) {
    e.setAttribute(t, c[r]);
  });
  if (a !== undefined) {
    e.scrollTop = a;
  }
  if (s !== undefined) {
    e.scrollLeft = s;
  }
  if (u !== undefined) {
    e.setAttribute("viewBox", u);
  }
}
var Xn = {
  animationIterationCount: true,
  borderImageOutset: true,
  borderImageSlice: true,
  borderImageWidth: true,
  boxFlex: true,
  boxFlexGroup: true,
  boxOrdinalGroup: true,
  columnCount: true,
  columns: true,
  flex: true,
  flexGrow: true,
  flexPositive: true,
  flexShrink: true,
  flexNegative: true,
  flexOrder: true,
  gridRow: true,
  gridRowEnd: true,
  gridRowSpan: true,
  gridRowStart: true,
  gridColumn: true,
  gridColumnEnd: true,
  gridColumnSpan: true,
  gridColumnStart: true,
  fontWeight: true,
  lineClamp: true,
  lineHeight: true,
  opacity: true,
  order: true,
  orphans: true,
  tabSize: true,
  widows: true,
  zIndex: true,
  zoom: true,
  fillOpacity: true,
  floodOpacity: true,
  stopOpacity: true,
  strokeDasharray: true,
  strokeDashoffset: true,
  strokeMiterlimit: true,
  strokeOpacity: true,
  strokeWidth: true
};
function ei(e, t) {
  return e + t.charAt(0).toUpperCase() + t.substring(1);
}
var ti = ["Webkit", "Ms", "Moz", "O"];
Xn = Object.keys(Xn).reduce(function (e, t) {
  ti.forEach(function (r) {
    return e[ei(r, t)] = e[t];
  });
  return e;
}, Xn);
var ri = ["x", "y", "z"];
var ni = /^(matrix|translate|scale|rotate|skew)/;
var ii = /^(translate)/;
var oi = /^(rotate|skew)/;
function ai(e, t) {
  if (fe.num(e) && e !== 0) {
    return e + t;
  } else {
    return e;
  }
}
var si = function e(t, r) {
  if (fe.arr(t)) {
    return t.every(function (t) {
      return e(t, r);
    });
  } else if (fe.num(t)) {
    return t === r;
  } else {
    return parseFloat(t) === r;
  }
};
var ui = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r(e) {
    (0, q.Z)(this, r);
    var n = e.x;
    var i = e.y;
    var o = e.z;
    var a = Yn(e, ri);
    var s = [];
    var u = [];
    if (n || i || o) {
      s.push([n || 0, i || 0, o || 0]);
      u.push(function (e) {
        return [`translate3d(${e.map(function (e) {
          return ai(e, "px");
        }).join(",")})`, si(e, 0)];
      });
    }
    ve(a, function (e, t) {
      if (t === "transform") {
        s.push([e || ""]);
        u.push(function (e) {
          return [e, e === ""];
        });
      } else if (ni.test(t)) {
        delete a[t];
        if (fe.und(e)) {
          return;
        }
        var r = ii.test(t) ? "px" : oi.test(t) ? "deg" : "";
        s.push(ye(e));
        u.push(t === "rotate3d" ? function (e) {
          var t = (0, p.Z)(e, 4);
          var n = t[0];
          var i = t[1];
          var o = t[2];
          var a = t[3];
          return [`rotate3d(${n},${i},${o},${ai(a, r)})`, si(a, 0)];
        } : function (e) {
          return [`${t}(${e.map(function (e) {
            return ai(e, r);
          }).join(",")})`, si(e, t.startsWith("scale") ? 1 : 0)];
        });
      }
    });
    if (s.length) {
      a.transform = new li(s, u);
    }
    return t.call(this, a);
  }
  return (0, P.Z)(r);
}(lr);
var li = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r(e, n) {
    var i;
    (0, q.Z)(this, r);
    i = t.call(this);
    i._value = null;
    i.inputs = e;
    i.transforms = n;
    return i;
  }
  (0, P.Z)(r, [{
    key: "get",
    value: function () {
      return this._value ||= this._get();
    }
  }, {
    key: "_get",
    value: function () {
      var e = this;
      var t = "";
      var r = true;
      me(this.inputs, function (n, i) {
        var o = wt(n[0]);
        var a = e.transforms[i](fe.arr(o) ? o : n.map(wt));
        var s = (0, p.Z)(a, 2);
        var u = s[0];
        var l = s[1];
        t += " " + u;
        r = r && l;
      });
      if (r) {
        return "none";
      } else {
        return t;
      }
    }
  }, {
    key: "observerAdded",
    value: function (e) {
      var t = this;
      if (e == 1) {
        me(this.inputs, function (e) {
          return me(e, function (e) {
            return bt(e) && Ct(e, t);
          });
        });
      }
    }
  }, {
    key: "observerRemoved",
    value: function (e) {
      var t = this;
      if (e == 0) {
        me(this.inputs, function (e) {
          return me(e, function (e) {
            return bt(e) && At(e, t);
          });
        });
      }
    }
  }, {
    key: "eventObserved",
    value: function (e) {
      if (e.type == "change") {
        this._value = null;
      }
      kt(this, e);
    }
  }]);
  return r;
}(St);
var ci = ["a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "big", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "keygen", "label", "legend", "li", "link", "main", "map", "mark", "menu", "menuitem", "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "param", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select", "small", "source", "span", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr", "circle", "clipPath", "defs", "ellipse", "foreignObject", "g", "image", "line", "linearGradient", "mask", "path", "pattern", "polygon", "polyline", "radialGradient", "rect", "stop", "svg", "text", "tspan"];
var pi = ["scrollTop", "scrollLeft"];
Ae.assign({
  batchedUpdates: Hn.unstable_batchedUpdates,
  createStringInterpolator: Lt,
  colors: Fe
});
var di = br(ci, {
  applyAnimatedValues: Jn,
  createAnimatedStyle: function (e) {
    return new ui(e);
  },
  getComponentProps: function (e) {
    var t = Yn(e, pi);
    return t;
  }
});
var fi = di.animated;
function gi(e) {
  var t = typeof e === "function" ? e() : e;
  return t || document.body;
}
function mi(e, t) {
  if (n && e) {
    var r = gi(e);
    return (0, Hn.createPortal)(t, r);
  }
  return t;
}
function vi(e, t) {
  function r(e, t) {
    if (typeof e !== "object" || typeof t !== "object" || Array.isArray(e) || Array.isArray(t)) {
      if (t !== undefined) {
        return t;
      } else {
        return e;
      }
    }
    var n = {};
    for (var i in e) {
      if (e.hasOwnProperty(i)) {
        n[i] = r(e[i], t[i]);
      }
    }
    return n;
  }
  return r(e, t);
}
var yi = "${label} is not a valid ${type}";
var hi = {
  locale: "en",
  common: {
    confirm: "Confirm",
    cancel: "Cancel",
    loading: "Loading",
    close: "Close"
  },
  Calendar: {
    title: "Date selection",
    confirm: "Confirm",
    start: "start",
    end: "end",
    today: "today",
    markItems: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    yearAndMonth: "${year}/${month}"
  },
  Cascader: {
    placeholder: "Selecting"
  },
  Dialog: {
    ok: "OK"
  },
  DatePicker: {
    tillNow: "Till Now"
  },
  ErrorBlock: {
    default: {
      title: "Oops, something went wrong",
      description: "Please wait a minute and try again"
    },
    busy: {
      title: "Oops, not loading",
      description: "Try to refresh the page"
    },
    disconnected: {
      title: "Network is busy",
      description: "Try to refresh the page"
    },
    empty: {
      title: "Hmm, couldn't find that...",
      description: "Want to try a new search?"
    }
  },
  Form: {
    required: "Required",
    optional: "Optional",
    defaultValidateMessages: {
      default: "Field validation error for ${label}",
      required: "Please enter ${label}",
      enum: "${label} must be one of [${enum}]",
      whitespace: "${label} cannot be a blank character",
      date: {
        format: "${label} date format is invalid",
        parse: "${label} cannot be converted to a date",
        invalid: "${label} is an invalid date"
      },
      types: {
        string: yi,
        method: yi,
        array: yi,
        object: yi,
        number: yi,
        date: yi,
        boolean: yi,
        integer: yi,
        float: yi,
        regexp: yi,
        email: yi,
        url: yi,
        hex: yi
      },
      string: {
        len: "${label} must be ${len} characters",
        min: "${label} must be at least ${min} characters",
        max: "${label} must be up to ${max} characters",
        range: "${label} must be between ${min}-${max} characters"
      },
      number: {
        len: "${label} must be equal to ${len}",
        min: "${label} must be minimum ${min}",
        max: "${label} must be maximum ${max}",
        range: "${label} must be between ${min}-${max}"
      },
      array: {
        len: "Must be ${len} ${label}",
        min: "At least ${min} ${label}",
        max: "At most ${max} ${label}",
        range: "The amount of ${label} must be between ${min}-${max}"
      },
      pattern: {
        mismatch: "${label} does not match the pattern ${pattern}"
      }
    }
  },
  ImageUploader: {
    uploading: "Uploading...",
    upload: "Upload"
  },
  InfiniteScroll: {
    noMore: "No more",
    failedToLoad: "Failed to load",
    retry: "Retry"
  },
  Input: {
    clear: "clear"
  },
  Mask: {
    name: "Mask"
  },
  Modal: {
    ok: "OK"
  },
  PasscodeInput: {
    name: "Passcode Input"
  },
  PullToRefresh: {
    pulling: "Scroll down to refresh",
    canRelease: "Release to refresh immediately",
    complete: "Refresh successful"
  },
  SearchBar: {
    name: "Search Bar"
  },
  Slider: {
    name: "Slider"
  },
  Stepper: {
    decrease: "decrease",
    increase: "increase"
  },
  Switch: {
    name: "Switch"
  },
  Selector: {
    name: "Selector"
  }
};
var bi = "${label}不是一个有效的${type}";
var wi = vi(hi, {
  locale: "zh-CH",
  common: {
    confirm: "确定",
    cancel: "取消",
    loading: "加载中",
    close: "关闭"
  },
  Calendar: {
    title: "日期选择",
    confirm: "确认",
    start: "开始",
    end: "结束",
    today: "今日",
    markItems: ["一", "二", "三", "四", "五", "六", "日"],
    yearAndMonth: "${year}年${month}月"
  },
  Cascader: {
    placeholder: "请选择"
  },
  Dialog: {
    ok: "我知道了"
  },
  DatePicker: {
    tillNow: "至今"
  },
  ErrorBlock: {
    default: {
      title: "页面遇到一些小问题",
      description: "待会来试试"
    },
    busy: {
      title: "前方拥堵",
      description: "刷新试试"
    },
    disconnected: {
      title: "网络有点忙",
      description: "动动手指帮忙修复"
    },
    empty: {
      title: "没有找到你需要的东西",
      description: "找找其他的吧"
    }
  },
  Form: {
    required: "必填",
    optional: "选填",
    defaultValidateMessages: {
      default: "字段验证错误${label}",
      required: "请输入${label}",
      enum: "${label}必须是其中一个[${enum}]",
      whitespace: "${label}不能为空字符",
      date: {
        format: "${label}日期格式无效",
        parse: "${label}不能转换为日期",
        invalid: "${label}是一个无效日期"
      },
      types: {
        string: bi,
        method: bi,
        array: bi,
        object: bi,
        number: bi,
        date: bi,
        boolean: bi,
        integer: bi,
        float: bi,
        regexp: bi,
        email: bi,
        url: bi,
        hex: bi
      },
      string: {
        len: "${label}须为${len}个字符",
        min: "${label}最少${min}个字符",
        max: "${label}最多${max}个字符",
        range: "${label}须在${min}-${max}字符之间"
      },
      number: {
        len: "${label}必须等于${len}",
        min: "${label}最小值为${min}",
        max: "${label}最大值为${max}",
        range: "${label}须在${min}-${max}之间"
      },
      array: {
        len: "须为${len}个${label}",
        min: "最少${min}个${label}",
        max: "最多${max}个${label}",
        range: "${label}数量须在${min}-${max}之间"
      },
      pattern: {
        mismatch: "${label}与模式不匹配${pattern}"
      }
    }
  },
  ImageUploader: {
    uploading: "上传中...",
    upload: "上传"
  },
  InfiniteScroll: {
    noMore: "没有更多了",
    failedToLoad: "加载失败",
    retry: "重新加载"
  },
  Input: {
    clear: "清除"
  },
  Mask: {
    name: "背景蒙层"
  },
  Modal: {
    ok: "我知道了"
  },
  PasscodeInput: {
    name: "密码输入框"
  },
  PullToRefresh: {
    pulling: "下拉刷新",
    canRelease: "释放立即刷新",
    complete: "刷新成功"
  },
  SearchBar: {
    name: "搜索框"
  },
  Slider: {
    name: "滑动输入条"
  },
  Stepper: {
    decrease: "减少",
    increase: "增加"
  },
  Switch: {
    name: "开关"
  },
  Selector: {
    name: "选择组"
  }
});
var xi = wi;
var Ei = {
  current: {
    locale: xi
  }
};
function ki() {
  return Ei.current;
}
var Si = a.createContext(null);
function Ti() {
  return (0, a.useContext)(Si) ?? ki();
}
function Ci(e) {
  var t = (0, a.useRef)(e);
  if (e) {
    t.current = true;
  }
  return !!t.current;
}
function Ai(e) {
  var t = _i(e.active, e.forceRender, e.destroyOnClose);
  if (t) {
    return e.children;
  } else {
    return null;
  }
}
function _i(e, t, r) {
  var n = Ci(e);
  return !!t || !!e || !!n && !r;
}
var Oi = {
  click: "onClick",
  touchstart: "onTouchStart"
};
function Mi(e, t) {
  var r;
  var n = Object.assign({}, t.props);
  var i = (0, H.Z)(e);
  try {
    function o() {
      var e = r.value;
      var i = Oi[e];
      n[i] = function (e) {
        var r;
        var n;
        e.stopPropagation();
        if ((n = (r = t.props)[i]) !== null && n !== undefined) {
          n.call(r, e);
        }
      };
    }
    for (i.s(); !(r = i.n()).done;) {
      o();
    }
  } catch (s) {
    i.e(s);
  } finally {
    i.f();
  }
  return a.cloneElement(t, n);
}
var Pi = "adm-mask";
var qi = {
  default: 0.55,
  thin: 0.35,
  thick: 0.75
};
var Ni = {
  black: "0, 0, 0",
  white: "255, 255, 255"
};
var Ri = {
  visible: true,
  destroyOnClose: false,
  forceRender: false,
  color: "black",
  opacity: "default",
  disableBodyScroll: true,
  getContainer: null,
  stopPropagation: ["click"]
};
function Ii(e) {
  var t = c(Ri, e);
  var r = Ti();
  var n = r.locale;
  var i = (0, a.useRef)(null);
  M(i, t.visible && t.disableBodyScroll);
  var o = (0, a.useMemo)(function () {
    var r = qi[t.opacity] ?? t.opacity;
    var n = Ni[t.color];
    if (n) {
      return `rgba(${n}, ${r})`;
    } else {
      return t.color;
    }
  }, [t.color, t.opacity]);
  var s = (0, a.useState)(t.visible);
  var u = (0, p.Z)(s, 2);
  var d = u[0];
  var f = u[1];
  var g = y();
  var m = Fn({
    opacity: t.visible ? 1 : 0,
    config: {
      precision: 0.01,
      mass: 1,
      tension: 250,
      friction: 30,
      clamp: true
    },
    onStart: function () {
      f(true);
    },
    onRest: function () {
      var e;
      var r;
      if (!g.current) {
        f(t.visible);
        if (t.visible) {
          if ((e = t.afterShow) !== null && e !== undefined) {
            e.call(t);
          }
        } else if ((r = t.afterClose) !== null && r !== undefined) {
          r.call(t);
        }
      }
    }
  });
  var v = m.opacity;
  var h = Mi(t.stopPropagation, l(t, a.createElement(fi.div, {
    className: Pi,
    ref: i,
    "aria-hidden": true,
    style: Object.assign(Object.assign({}, t.style), {
      background: o,
      opacity: v,
      display: d ? undefined : "none"
    }),
    onClick: function (e) {
      var r;
      if (e.target === e.currentTarget) {
        if ((r = t.onMaskClick) !== null && r !== undefined) {
          r.call(t, e);
        }
      }
    }
  }, t.onMaskClick && a.createElement("div", {
    className: `${Pi}-aria-button`,
    role: "button",
    "aria-label": n.Mask.name,
    onClick: t.onMaskClick
  }), a.createElement("div", {
    className: `${Pi}-content`
  }, t.children))));
  return a.createElement(Ai, {
    active: d,
    forceRender: t.forceRender,
    destroyOnClose: t.destroyOnClose
  }, mi(t.getContainer, h));
}
var ji = Ii;
var Di = require("./61049.js");
var Li = {
  closeOnMaskClick: false,
  destroyOnClose: false,
  disableBodyScroll: true,
  forceRender: false,
  getContainer: function () {
    return document.body;
  },
  mask: true,
  showCloseButton: false,
  stopPropagation: ["click"],
  visible: false
};
function Fi(e) {
  var t = (0, a.useState)(e);
  var r = (0, p.Z)(t, 2);
  var n = r[0];
  var i = r[1];
  m(function () {
    i(e);
  }, [e]);
  return n;
}
function Zi(e, t, r) {
  return Math.max(t, Math.min(e, r));
}
const zi = {
  toVector(e = t, t) {
    if (Array.isArray(e)) {
      return e;
    } else {
      return [e, e];
    }
  },
  add(e, t) {
    return [e[0] + t[0], e[1] + t[1]];
  },
  sub(e, t) {
    return [e[0] - t[0], e[1] - t[1]];
  },
  addTo(e, t) {
    e[0] += t[0];
    e[1] += t[1];
  },
  subTo(e, t) {
    e[0] -= t[0];
    e[1] -= t[1];
  }
};
function Ui(e, t, r) {
  if (t === 0 || Math.abs(t) === Infinity) {
    return Math.pow(e, r * 5);
  } else {
    return e * t * r / (t + r * e);
  }
}
function Bi(e, t, r, n = 0.15) {
  if (n === 0) {
    return Zi(e, t, r);
  } else if (e < t) {
    return -Ui(t - e, r - t, n) + t;
  } else if (e > r) {
    return +Ui(e - r, r - t, n) + r;
  } else {
    return e;
  }
}
function Vi(e, [t, r], [n, i]) {
  const [[o, a], [s, u]] = e;
  return [Bi(t, o, a, n), Bi(r, s, u, i)];
}
function Hi(e, t) {
  if (typeof e !== "object" || e === null) {
    return e;
  }
  var r = e[Symbol.toPrimitive];
  if (r !== undefined) {
    var n = r.call(e, t || "default");
    if (typeof n !== "object") {
      return n;
    }
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function Wi(e) {
  var t = Hi(e, "string");
  if (typeof t === "symbol") {
    return t;
  } else {
    return String(t);
  }
}
function Yi(e, t, r) {
  t = Wi(t);
  if (t in e) {
    Object.defineProperty(e, t, {
      value: r,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    e[t] = r;
  }
  return e;
}
function Qi(e, t) {
  var r = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    if (t) {
      n = n.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      });
    }
    r.push.apply(r, n);
  }
  return r;
}
function $i(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t] ?? {};
    if (t % 2) {
      Qi(Object(r), true).forEach(function (t) {
        Yi(e, t, r[t]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(e, Object.getOwnPropertyDescriptors(r));
    } else {
      Qi(Object(r)).forEach(function (t) {
        Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(r, t));
      });
    }
  }
  return e;
}
const Gi = {
  pointer: {
    start: "down",
    change: "move",
    end: "up"
  },
  mouse: {
    start: "down",
    change: "move",
    end: "up"
  },
  touch: {
    start: "start",
    change: "move",
    end: "end"
  },
  gesture: {
    start: "start",
    change: "change",
    end: "end"
  }
};
function Ki(e) {
  if (e) {
    return e[0].toUpperCase() + e.slice(1);
  } else {
    return "";
  }
}
const Ji = ["enter", "leave"];
function Xi(e = false, t) {
  return e && !Ji.includes(t);
}
function eo(e, t = "", r = false) {
  const n = Gi[e];
  const i = n && n[t] || t;
  return "on" + Ki(e) + Ki(i) + (Xi(r, i) ? "Capture" : "");
}
const to = ["gotpointercapture", "lostpointercapture"];
function ro(e) {
  let t = e.substring(2).toLowerCase();
  const r = !!~t.indexOf("passive");
  if (r) {
    t = t.replace("passive", "");
  }
  const n = to.includes(t) ? "capturecapture" : "capture";
  const i = !!~t.indexOf(n);
  if (i) {
    t = t.replace("capture", "");
  }
  return {
    device: t,
    capture: i,
    passive: r
  };
}
function no(e, t = "") {
  const r = Gi[e];
  const n = r && r[t] || t;
  return e + n;
}
function io(e) {
  return "touches" in e;
}
function oo(e) {
  if (io(e)) {
    return "touch";
  } else if ("pointerType" in e) {
    return e.pointerType;
  } else {
    return "mouse";
  }
}
function ao(e) {
  return Array.from(e.touches).filter(t => {
    var r;
    var n;
    return t.target === e.currentTarget || ((r = e.currentTarget) === null || r === undefined || (n = r.contains) === null || n === undefined ? undefined : n.call(r, t.target));
  });
}
function so(e) {
  if (e.type === "touchend" || e.type === "touchcancel") {
    return e.changedTouches;
  } else {
    return e.targetTouches;
  }
}
function uo(e) {
  if (io(e)) {
    return so(e)[0];
  } else {
    return e;
  }
}
function lo(e) {
  return ao(e).map(e => e.identifier);
}
function co(e) {
  const t = uo(e);
  if (io(e)) {
    return t.identifier;
  } else {
    return t.pointerId;
  }
}
function po(e) {
  const t = uo(e);
  return [t.clientX, t.clientY];
}
const fo = 40;
const go = 800;
function mo(e) {
  let {
    deltaX: t,
    deltaY: r,
    deltaMode: n
  } = e;
  if (n === 1) {
    t *= fo;
    r *= fo;
  } else if (n === 2) {
    t *= go;
    r *= go;
  }
  return [t, r];
}
function vo(e) {
  const t = {};
  if ("buttons" in e) {
    t.buttons = e.buttons;
  }
  if ("shiftKey" in e) {
    const {
      shiftKey: r,
      altKey: n,
      metaKey: i,
      ctrlKey: o
    } = e;
    Object.assign(t, {
      shiftKey: r,
      altKey: n,
      metaKey: i,
      ctrlKey: o
    });
  }
  return t;
}
function yo(e, ...t) {
  if (typeof e === "function") {
    return e(...t);
  } else {
    return e;
  }
}
function ho() {}
function bo(...e) {
  if (e.length === 0) {
    return ho;
  } else if (e.length === 1) {
    return e[0];
  } else {
    return function () {
      let t;
      for (const r of e) {
        t = r.apply(this, arguments) || t;
      }
      return t;
    };
  }
}
function wo(e, t) {
  return Object.assign({}, t, e || {});
}
const xo = 32;
class Eo {
  constructor(e, t, r) {
    this.ctrl = e;
    this.args = t;
    this.key = r;
    if (!this.state) {
      this.state = {};
      this.computeValues([0, 0]);
      this.computeInitial();
      if (this.init) {
        this.init();
      }
      this.reset();
    }
  }
  get state() {
    return this.ctrl.state[this.key];
  }
  set state(e) {
    this.ctrl.state[this.key] = e;
  }
  get shared() {
    return this.ctrl.state.shared;
  }
  get eventStore() {
    return this.ctrl.gestureEventStores[this.key];
  }
  get timeoutStore() {
    return this.ctrl.gestureTimeoutStores[this.key];
  }
  get config() {
    return this.ctrl.config[this.key];
  }
  get sharedConfig() {
    return this.ctrl.config.shared;
  }
  get handler() {
    return this.ctrl.handlers[this.key];
  }
  reset() {
    const {
      state: e,
      shared: t,
      ingKey: r,
      args: n
    } = this;
    t[r] = e._active = e.active = e._blocked = e._force = false;
    e._step = [false, false];
    e.intentional = false;
    e._movement = [0, 0];
    e._distance = [0, 0];
    e._direction = [0, 0];
    e._delta = [0, 0];
    e._bounds = [[-Infinity, Infinity], [-Infinity, Infinity]];
    e.args = n;
    e.axis = undefined;
    e.memo = undefined;
    e.elapsedTime = e.timeDelta = 0;
    e.direction = [0, 0];
    e.distance = [0, 0];
    e.overflow = [0, 0];
    e._movementBound = [false, false];
    e.velocity = [0, 0];
    e.movement = [0, 0];
    e.delta = [0, 0];
    e.timeStamp = 0;
  }
  start(e) {
    const t = this.state;
    const r = this.config;
    if (!t._active) {
      this.reset();
      this.computeInitial();
      t._active = true;
      t.target = e.target;
      t.currentTarget = e.currentTarget;
      t.lastOffset = r.from ? yo(r.from, t) : t.offset;
      t.offset = t.lastOffset;
      t.startTime = t.timeStamp = e.timeStamp;
    }
  }
  computeValues(e) {
    const t = this.state;
    t._values = e;
    t.values = this.config.transform(e);
  }
  computeInitial() {
    const e = this.state;
    e._initial = e._values;
    e.initial = e.values;
  }
  compute(e) {
    const {
      state: t,
      config: r,
      shared: n
    } = this;
    t.args = this.args;
    let i = 0;
    if (e) {
      t.event = e;
      if (r.preventDefault && e.cancelable) {
        t.event.preventDefault();
      }
      t.type = e.type;
      n.touches = this.ctrl.pointerIds.size || this.ctrl.touchIds.size;
      n.locked = !!document.pointerLockElement;
      Object.assign(n, vo(e));
      n.down = n.pressed = n.buttons % 2 === 1 || n.touches > 0;
      i = e.timeStamp - t.timeStamp;
      t.timeStamp = e.timeStamp;
      t.elapsedTime = t.timeStamp - t.startTime;
    }
    if (t._active) {
      const e = t._delta.map(Math.abs);
      zi.addTo(t._distance, e);
    }
    if (this.axisIntent) {
      this.axisIntent(e);
    }
    const [o, a] = t._movement;
    const [s, u] = r.threshold;
    const {
      _step: l,
      values: c
    } = t;
    if (r.hasCustomTransform) {
      if (l[0] === false) {
        l[0] = Math.abs(o) >= s && c[0];
      }
      if (l[1] === false) {
        l[1] = Math.abs(a) >= u && c[1];
      }
    } else {
      if (l[0] === false) {
        l[0] = Math.abs(o) >= s && Math.sign(o) * s;
      }
      if (l[1] === false) {
        l[1] = Math.abs(a) >= u && Math.sign(a) * u;
      }
    }
    t.intentional = l[0] !== false || l[1] !== false;
    if (!t.intentional) {
      return;
    }
    const p = [0, 0];
    if (r.hasCustomTransform) {
      const [e, t] = c;
      p[0] = l[0] !== false ? e - l[0] : 0;
      p[1] = l[1] !== false ? t - l[1] : 0;
    } else {
      p[0] = l[0] !== false ? o - l[0] : 0;
      p[1] = l[1] !== false ? a - l[1] : 0;
    }
    if (this.restrictToAxis && !t._blocked) {
      this.restrictToAxis(p);
    }
    const d = t.offset;
    const f = t._active && !t._blocked || t.active;
    if (f) {
      t.first = t._active && !t.active;
      t.last = !t._active && t.active;
      t.active = n[this.ingKey] = t._active;
      if (e) {
        if (t.first) {
          if ("bounds" in r) {
            t._bounds = yo(r.bounds, t);
          }
          if (this.setup) {
            this.setup();
          }
        }
        t.movement = p;
        this.computeOffset();
      }
    }
    const [g, m] = t.offset;
    const [[v, y], [h, b]] = t._bounds;
    t.overflow = [g < v ? -1 : g > y ? 1 : 0, m < h ? -1 : m > b ? 1 : 0];
    t._movementBound[0] = !!t.overflow[0] && (t._movementBound[0] === false ? t._movement[0] : t._movementBound[0]);
    t._movementBound[1] = !!t.overflow[1] && (t._movementBound[1] === false ? t._movement[1] : t._movementBound[1]);
    const w = t._active && r.rubberband || [0, 0];
    t.offset = Vi(t._bounds, t.offset, w);
    t.delta = zi.sub(t.offset, d);
    this.computeMovement();
    if (f && (!t.last || i > xo)) {
      t.delta = zi.sub(t.offset, d);
      const e = t.delta.map(Math.abs);
      zi.addTo(t.distance, e);
      t.direction = t.delta.map(Math.sign);
      t._direction = t._delta.map(Math.sign);
      if (!t.first && i > 0) {
        t.velocity = [e[0] / i, e[1] / i];
        t.timeDelta = i;
      }
    }
  }
  emit() {
    const e = this.state;
    const t = this.shared;
    const r = this.config;
    if (!e._active) {
      this.clean();
    }
    if ((e._blocked || !e.intentional) && !e._force && !r.triggerAllEvents) {
      return;
    }
    const n = this.handler($i($i($i({}, t), e), {}, {
      [this.aliasKey]: e.values
    }));
    if (n !== undefined) {
      e.memo = n;
    }
  }
  clean() {
    this.eventStore.clean();
    this.timeoutStore.clean();
  }
}
function ko([e, t], r) {
  const n = Math.abs(e);
  const i = Math.abs(t);
  if (n > i && n > r) {
    return "x";
  } else if (i > n && i > r) {
    return "y";
  } else {
    return undefined;
  }
}
class So extends Eo {
  constructor(...e) {
    super(...e);
    Yi(this, "aliasKey", "xy");
  }
  reset() {
    super.reset();
    this.state.axis = undefined;
  }
  init() {
    this.state.offset = [0, 0];
    this.state.lastOffset = [0, 0];
  }
  computeOffset() {
    this.state.offset = zi.add(this.state.lastOffset, this.state.movement);
  }
  computeMovement() {
    this.state.movement = zi.sub(this.state.offset, this.state.lastOffset);
  }
  axisIntent(e) {
    const t = this.state;
    const r = this.config;
    if (!t.axis && e) {
      const n = typeof r.axisThreshold === "object" ? r.axisThreshold[oo(e)] : r.axisThreshold;
      t.axis = ko(t._movement, n);
    }
    t._blocked = (r.lockDirection || !!r.axis) && !t.axis || !!r.axis && r.axis !== t.axis;
  }
  restrictToAxis(e) {
    if (this.config.axis || this.config.lockDirection) {
      switch (this.state.axis) {
        case "x":
          e[1] = 0;
          break;
        case "y":
          e[0] = 0;
          break;
      }
    }
  }
}
const To = e => e;
const Co = 0.15;
const Ao = {
  enabled(e = true) {
    return e;
  },
  eventOptions(e, t, r) {
    return $i($i({}, r.shared.eventOptions), e);
  },
  preventDefault(e = false) {
    return e;
  },
  triggerAllEvents(e = false) {
    return e;
  },
  rubberband(e = 0) {
    switch (e) {
      case true:
        return [Co, Co];
      case false:
        return [0, 0];
      default:
        return zi.toVector(e);
    }
  },
  from(e) {
    if (typeof e === "function") {
      return e;
    } else if (e != null) {
      return zi.toVector(e);
    } else {
      return undefined;
    }
  },
  transform(e, t, r) {
    const n = e || r.shared.transform;
    this.hasCustomTransform = !!n;
    return n || To;
  },
  threshold(e) {
    return zi.toVector(e, 0);
  }
};
const _o = 0;
const Oo = $i($i({}, Ao), {}, {
  axis(e, t, {
    axis: r
  }) {
    this.lockDirection = r === "lock";
    if (!this.lockDirection) {
      return r;
    }
  },
  axisThreshold(e = _o) {
    return e;
  },
  bounds(e = {}) {
    if (typeof e === "function") {
      return t => Oo.bounds(e(t));
    }
    if ("current" in e) {
      return () => e.current;
    }
    if (typeof HTMLElement === "function" && e instanceof HTMLElement) {
      return e;
    }
    const {
      left: t = -Infinity,
      right: r = Infinity,
      top: n = -Infinity,
      bottom: i = Infinity
    } = e;
    return [[t, r], [n, i]];
  }
});
const Mo = {
  ArrowRight: (e, t = 1) => [e * t, 0],
  ArrowLeft: (e, t = 1) => [e * -1 * t, 0],
  ArrowUp: (e, t = 1) => [0, e * -1 * t],
  ArrowDown: (e, t = 1) => [0, e * t]
};
class Po extends So {
  constructor(...e) {
    super(...e);
    Yi(this, "ingKey", "dragging");
  }
  reset() {
    super.reset();
    const e = this.state;
    e._pointerId = undefined;
    e._pointerActive = false;
    e._keyboardActive = false;
    e._preventScroll = false;
    e._delayed = false;
    e.swipe = [0, 0];
    e.tap = false;
    e.canceled = false;
    e.cancel = this.cancel.bind(this);
  }
  setup() {
    const e = this.state;
    if (e._bounds instanceof HTMLElement) {
      const t = e._bounds.getBoundingClientRect();
      const r = e.currentTarget.getBoundingClientRect();
      const n = {
        left: t.left - r.left + e.offset[0],
        right: t.right - r.right + e.offset[0],
        top: t.top - r.top + e.offset[1],
        bottom: t.bottom - r.bottom + e.offset[1]
      };
      e._bounds = Oo.bounds(n);
    }
  }
  cancel() {
    const e = this.state;
    if (!e.canceled) {
      e.canceled = true;
      e._active = false;
      setTimeout(() => {
        this.compute();
        this.emit();
      }, 0);
    }
  }
  setActive() {
    this.state._active = this.state._pointerActive || this.state._keyboardActive;
  }
  clean() {
    this.pointerClean();
    this.state._pointerActive = false;
    this.state._keyboardActive = false;
    super.clean();
  }
  pointerDown(e) {
    const t = this.config;
    const r = this.state;
    if (e.buttons != null && (Array.isArray(t.pointerButtons) ? !t.pointerButtons.includes(e.buttons) : t.pointerButtons !== -1 && t.pointerButtons !== e.buttons)) {
      return;
    }
    const n = this.ctrl.setEventIds(e);
    if (t.pointerCapture) {
      e.target.setPointerCapture(e.pointerId);
    }
    if (!n || !(n.size > 1) || !r._pointerActive) {
      this.start(e);
      this.setupPointer(e);
      r._pointerId = co(e);
      r._pointerActive = true;
      this.computeValues(po(e));
      this.computeInitial();
      if (t.preventScrollAxis && oo(e) !== "mouse") {
        r._active = false;
        this.setupScrollPrevention(e);
      } else if (t.delay > 0) {
        this.setupDelayTrigger(e);
        if (t.triggerAllEvents) {
          this.compute(e);
          this.emit();
        }
      } else {
        this.startPointerDrag(e);
      }
    }
  }
  startPointerDrag(e) {
    const t = this.state;
    t._active = true;
    t._preventScroll = true;
    t._delayed = false;
    this.compute(e);
    this.emit();
  }
  pointerMove(e) {
    const t = this.state;
    const r = this.config;
    if (!t._pointerActive) {
      return;
    }
    const n = co(e);
    if (t._pointerId !== undefined && n !== t._pointerId) {
      return;
    }
    const i = po(e);
    if (document.pointerLockElement === e.target) {
      t._delta = [e.movementX, e.movementY];
    } else {
      t._delta = zi.sub(i, t._values);
      this.computeValues(i);
    }
    zi.addTo(t._movement, t._delta);
    this.compute(e);
    if (t._delayed && t.intentional) {
      this.timeoutStore.remove("dragDelay");
      t.active = false;
      this.startPointerDrag(e);
      return;
    } else if (r.preventScrollAxis && !t._preventScroll) {
      if (t.axis) {
        if (t.axis === r.preventScrollAxis || r.preventScrollAxis === "xy") {
          t._active = false;
          this.clean();
          return;
        } else {
          this.timeoutStore.remove("startPointerDrag");
          this.startPointerDrag(e);
          return;
        }
      } else {
        return undefined;
      }
    } else {
      this.emit();
      return;
    }
  }
  pointerUp(e) {
    this.ctrl.setEventIds(e);
    try {
      if (this.config.pointerCapture && e.target.hasPointerCapture(e.pointerId)) {
        e.target.releasePointerCapture(e.pointerId);
      }
    } catch (a) {
      0;
    }
    const t = this.state;
    const r = this.config;
    if (!t._active || !t._pointerActive) {
      return;
    }
    const n = co(e);
    if (t._pointerId !== undefined && n !== t._pointerId) {
      return;
    }
    this.state._pointerActive = false;
    this.setActive();
    this.compute(e);
    const [i, o] = t._distance;
    t.tap = i <= r.tapsThreshold && o <= r.tapsThreshold;
    if (t.tap && r.filterTaps) {
      t._force = true;
    } else {
      const [e, n] = t._delta;
      const [i, o] = t._movement;
      const [a, s] = r.swipe.velocity;
      const [u, l] = r.swipe.distance;
      const c = r.swipe.duration;
      if (t.elapsedTime < c) {
        const r = Math.abs(e / t.timeDelta);
        const c = Math.abs(n / t.timeDelta);
        if (r > a && Math.abs(i) > u) {
          t.swipe[0] = Math.sign(e);
        }
        if (c > s && Math.abs(o) > l) {
          t.swipe[1] = Math.sign(n);
        }
      }
    }
    this.emit();
  }
  pointerClick(e) {
    if (!this.state.tap && e.detail > 0) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  setupPointer(e) {
    const t = this.config;
    const r = t.device;
    if (t.pointerLock) {
      e.currentTarget.requestPointerLock();
    }
    if (!t.pointerCapture) {
      this.eventStore.add(this.sharedConfig.window, r, "change", this.pointerMove.bind(this));
      this.eventStore.add(this.sharedConfig.window, r, "end", this.pointerUp.bind(this));
      this.eventStore.add(this.sharedConfig.window, r, "cancel", this.pointerUp.bind(this));
    }
  }
  pointerClean() {
    if (this.config.pointerLock && document.pointerLockElement === this.state.currentTarget) {
      document.exitPointerLock();
    }
  }
  preventScroll(e) {
    if (this.state._preventScroll && e.cancelable) {
      e.preventDefault();
    }
  }
  setupScrollPrevention(e) {
    this.state._preventScroll = false;
    qo(e);
    const t = this.eventStore.add(this.sharedConfig.window, "touch", "change", this.preventScroll.bind(this), {
      passive: false
    });
    this.eventStore.add(this.sharedConfig.window, "touch", "end", t);
    this.eventStore.add(this.sharedConfig.window, "touch", "cancel", t);
    this.timeoutStore.add("startPointerDrag", this.startPointerDrag.bind(this), this.config.preventScrollDelay, e);
  }
  setupDelayTrigger(e) {
    this.state._delayed = true;
    this.timeoutStore.add("dragDelay", () => {
      this.state._step = [0, 0];
      this.startPointerDrag(e);
    }, this.config.delay);
  }
  keyDown(e) {
    const t = Mo[e.key];
    if (t) {
      const r = this.state;
      const n = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
      this.start(e);
      r._delta = t(this.config.keyboardDisplacement, n);
      r._keyboardActive = true;
      zi.addTo(r._movement, r._delta);
      this.compute(e);
      this.emit();
    }
  }
  keyUp(e) {
    if (e.key in Mo) {
      this.state._keyboardActive = false;
      this.setActive();
      this.compute(e);
      this.emit();
    }
  }
  bind(e) {
    const t = this.config.device;
    e(t, "start", this.pointerDown.bind(this));
    if (this.config.pointerCapture) {
      e(t, "change", this.pointerMove.bind(this));
      e(t, "end", this.pointerUp.bind(this));
      e(t, "cancel", this.pointerUp.bind(this));
      e("lostPointerCapture", "", this.pointerUp.bind(this));
    }
    if (this.config.keys) {
      e("key", "down", this.keyDown.bind(this));
      e("key", "up", this.keyUp.bind(this));
    }
    if (this.config.filterTaps) {
      e("click", "", this.pointerClick.bind(this), {
        capture: true,
        passive: false
      });
    }
  }
}
function qo(e) {
  if ("persist" in e && typeof e.persist === "function") {
    e.persist();
  }
}
const No = typeof window !== "undefined" && window.document && window.document.createElement;
function Ro() {
  return No && "ontouchstart" in window;
}
function Io() {
  return Ro() || No && window.navigator.maxTouchPoints > 1;
}
function jo() {
  return No && "onpointerdown" in window;
}
function Do() {
  return No && "exitPointerLock" in window.document;
}
function Lo() {
  try {
    return "constructor" in GestureEvent;
  } catch (jg) {
    return false;
  }
}
const Fo = {
  isBrowser: No,
  gesture: Lo(),
  touch: Ro(),
  touchscreen: Io(),
  pointer: jo(),
  pointerLock: Do()
};
const Zo = 250;
const zo = 180;
const Uo = 0.5;
const Bo = 50;
const Vo = 250;
const Ho = 10;
const Wo = {
  mouse: 0,
  touch: 0,
  pen: 8
};
const Yo = $i($i({}, Oo), {}, {
  device(e, t, {
    pointer: {
      touch: r = false,
      lock: n = false,
      mouse: i = false
    } = {}
  }) {
    this.pointerLock = n && Fo.pointerLock;
    if (Fo.touch && r) {
      return "touch";
    } else if (this.pointerLock) {
      return "mouse";
    } else if (Fo.pointer && !i) {
      return "pointer";
    } else if (Fo.touch) {
      return "touch";
    } else {
      return "mouse";
    }
  },
  preventScrollAxis(e, t, {
    preventScroll: r
  }) {
    this.preventScrollDelay = typeof r === "number" ? r : r || r === undefined && e ? Zo : undefined;
    if (Fo.touchscreen && r !== false) {
      return e || (r !== undefined ? "y" : undefined);
    }
  },
  pointerCapture(e, t, {
    pointer: {
      capture: r = true,
      buttons: n = 1,
      keys: i = true
    } = {}
  }) {
    this.pointerButtons = n;
    this.keys = i;
    return !this.pointerLock && this.device === "pointer" && r;
  },
  threshold(e, t, {
    filterTaps: r = false,
    tapsThreshold: n = 3,
    axis: i
  }) {
    const o = zi.toVector(e, r ? n : i ? 1 : 0);
    this.filterTaps = r;
    this.tapsThreshold = n;
    return o;
  },
  swipe({
    velocity: e = Uo,
    distance: t = Bo,
    duration: r = Vo
  } = {}) {
    return {
      velocity: this.transform(zi.toVector(e)),
      distance: this.transform(zi.toVector(t)),
      duration: r
    };
  },
  delay(e = 0) {
    switch (e) {
      case true:
        return zo;
      case false:
        return 0;
      default:
        return e;
    }
  },
  axisThreshold(e) {
    if (e) {
      return $i($i({}, Wo), e);
    } else {
      return Wo;
    }
  },
  keyboardDisplacement(e = Ho) {
    return e;
  }
});
function Qo(e) {
  const [t, r] = e.overflow;
  const [n, i] = e._delta;
  const [o, a] = e._direction;
  if (t < 0 && n > 0 && o < 0 || t > 0 && n < 0 && o > 0) {
    e._movement[0] = e._movementBound[0];
  }
  if (r < 0 && i > 0 && a < 0 || r > 0 && i < 0 && a > 0) {
    e._movement[1] = e._movementBound[1];
  }
}
$i($i({}, Ao), {}, {
  device(e, t, {
    shared: r,
    pointer: {
      touch: n = false
    } = {}
  }) {
    const i = r;
    if (i.target && !Fo.touch && Fo.gesture) {
      return "gesture";
    }
    if (Fo.touch && n) {
      return "touch";
    }
    if (Fo.touchscreen) {
      if (Fo.pointer) {
        return "pointer";
      }
      if (Fo.touch) {
        return "touch";
      }
    }
  },
  bounds(e, t, {
    scaleBounds: r = {},
    angleBounds: n = {}
  }) {
    const i = e => {
      const t = wo(yo(r, e), {
        min: -Infinity,
        max: Infinity
      });
      return [t.min, t.max];
    };
    const o = e => {
      const t = wo(yo(n, e), {
        min: -Infinity,
        max: Infinity
      });
      return [t.min, t.max];
    };
    if (typeof r !== "function" && typeof n !== "function") {
      return [i(), o()];
    } else {
      return e => [i(e), o(e)];
    }
  },
  threshold(e, t, r) {
    this.lockDirection = r.axis === "lock";
    const n = zi.toVector(e, this.lockDirection ? [0.1, 3] : 0);
    return n;
  },
  modifierKey(e) {
    if (e === undefined) {
      return "ctrlKey";
    } else {
      return e;
    }
  },
  pinchOnWheel(e = true) {
    return e;
  }
});
$i($i({}, Oo), {}, {
  mouseOnly: (e = true) => e
});
class $o extends So {
  constructor(...e) {
    super(...e);
    Yi(this, "ingKey", "wheeling");
  }
  wheel(e) {
    if (!this.state._active) {
      this.start(e);
    }
    this.wheelChange(e);
    this.timeoutStore.add("wheelEnd", this.wheelEnd.bind(this));
  }
  wheelChange(e) {
    const t = this.state;
    t._delta = mo(e);
    zi.addTo(t._movement, t._delta);
    Qo(t);
    this.compute(e);
    this.emit();
  }
  wheelEnd() {
    if (this.state._active) {
      this.state._active = false;
      this.compute();
      this.emit();
    }
  }
  bind(e) {
    e("wheel", "", this.wheel.bind(this));
  }
}
const Go = Oo;
$i($i({}, Oo), {}, {
  mouseOnly: (e = true) => e
});
const Ko = new Map();
const Jo = new Map();
function Xo(e) {
  Ko.set(e.key, e.engine);
  Jo.set(e.key, e.resolver);
}
const ea = {
  key: "drag",
  engine: Po,
  resolver: Yo
};
const ta = {
  key: "wheel",
  engine: $o,
  resolver: Go
};
function ra(e, t) {
  if (e == null) {
    return {};
  }
  var r;
  var n;
  var i = {};
  var o = Object.keys(e);
  for (n = 0; n < o.length; n++) {
    r = o[n];
    if (!(t.indexOf(r) >= 0)) {
      i[r] = e[r];
    }
  }
  return i;
}
function na(e, t) {
  if (e == null) {
    return {};
  }
  var r;
  var n;
  var i = ra(e, t);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    for (n = 0; n < o.length; n++) {
      r = o[n];
      if (!(t.indexOf(r) >= 0)) {
        if (Object.prototype.propertyIsEnumerable.call(e, r)) {
          i[r] = e[r];
        }
      }
    }
  }
  return i;
}
const ia = {
  target(e) {
    if (e) {
      return () => "current" in e ? e.current : e;
    }
  },
  enabled(e = true) {
    return e;
  },
  window(e = Fo.isBrowser ? window : undefined) {
    return e;
  },
  eventOptions({
    passive: e = true,
    capture: t = false
  } = {}) {
    return {
      passive: e,
      capture: t
    };
  },
  transform(e) {
    return e;
  }
};
const oa = ["target", "eventOptions", "window", "enabled", "transform"];
function aa(e = {}, t) {
  const r = {};
  for (const [n, i] of Object.entries(t)) {
    switch (typeof i) {
      case "function":
        r[n] = i.call(r, e[n], n, e);
        break;
      case "object":
        r[n] = aa(e[n], i);
        break;
      case "boolean":
        if (i) {
          r[n] = e[n];
        }
        break;
    }
  }
  return r;
}
function sa(e, t, r = {}) {
  const n = e;
  const {
    target: i,
    eventOptions: o,
    window: a,
    enabled: s,
    transform: u
  } = n;
  const l = na(n, oa);
  r.shared = aa({
    target: i,
    eventOptions: o,
    window: a,
    enabled: s,
    transform: u
  }, ia);
  if (t) {
    const e = Jo.get(t);
    r[t] = aa($i({
      shared: r.shared
    }, l), e);
  } else {
    for (const c in l) {
      const e = Jo.get(c);
      if (e) {
        r[c] = aa($i({
          shared: r.shared
        }, l[c]), e);
      }
    }
  }
  return r;
}
class ua {
  constructor(e, t) {
    Yi(this, "_listeners", new Set());
    this._ctrl = e;
    this._gestureKey = t;
  }
  add(e, t, r, n, i) {
    const o = this._listeners;
    const a = no(t, r);
    const s = this._gestureKey ? this._ctrl.config[this._gestureKey].eventOptions : {};
    const u = $i($i({}, s), i);
    e.addEventListener(a, n, u);
    const l = () => {
      e.removeEventListener(a, n, u);
      o.delete(l);
    };
    o.add(l);
    return l;
  }
  clean() {
    this._listeners.forEach(e => e());
    this._listeners.clear();
  }
}
class la {
  constructor() {
    Yi(this, "_timeouts", new Map());
  }
  add(e, t, r = 140, ...n) {
    this.remove(e);
    this._timeouts.set(e, window.setTimeout(t, r, ...n));
  }
  remove(e) {
    const t = this._timeouts.get(e);
    if (t) {
      window.clearTimeout(t);
    }
  }
  clean() {
    this._timeouts.forEach(e => {
      window.clearTimeout(e);
    });
    this._timeouts.clear();
  }
}
class ca {
  constructor(e) {
    Yi(this, "gestures", new Set());
    Yi(this, "_targetEventStore", new ua(this));
    Yi(this, "gestureEventStores", {});
    Yi(this, "gestureTimeoutStores", {});
    Yi(this, "handlers", {});
    Yi(this, "config", {});
    Yi(this, "pointerIds", new Set());
    Yi(this, "touchIds", new Set());
    Yi(this, "state", {
      shared: {
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false
      }
    });
    da(this, e);
  }
  setEventIds(e) {
    if (io(e)) {
      this.touchIds = new Set(lo(e));
      return this.touchIds;
    } else if ("pointerId" in e) {
      if (e.type === "pointerup" || e.type === "pointercancel") {
        this.pointerIds.delete(e.pointerId);
      } else if (e.type === "pointerdown") {
        this.pointerIds.add(e.pointerId);
      }
      return this.pointerIds;
    } else {
      return undefined;
    }
  }
  applyHandlers(e, t) {
    this.handlers = e;
    this.nativeHandlers = t;
  }
  applyConfig(e, t) {
    this.config = sa(e, t, this.config);
  }
  clean() {
    this._targetEventStore.clean();
    for (const e of this.gestures) {
      this.gestureEventStores[e].clean();
      this.gestureTimeoutStores[e].clean();
    }
  }
  effect() {
    if (this.config.shared.target) {
      this.bind();
    }
    return () => this._targetEventStore.clean();
  }
  bind(...e) {
    const t = this.config.shared;
    const r = {};
    let n;
    if (!t.target || (n = t.target(), n)) {
      if (t.enabled) {
        for (const t of this.gestures) {
          const i = this.config[t];
          const o = fa(r, i.eventOptions, !!n);
          if (i.enabled) {
            const r = Ko.get(t);
            new r(this, e, t).bind(o);
          }
        }
        const i = fa(r, t.eventOptions, !!n);
        for (const t in this.nativeHandlers) {
          i(t, "", r => this.nativeHandlers[t]($i($i({}, this.state.shared), {}, {
            event: r,
            args: e
          })), undefined, true);
        }
      }
      for (const e in r) {
        r[e] = bo(...r[e]);
      }
      if (!n) {
        return r;
      }
      for (const e in r) {
        const {
          device: t,
          capture: i,
          passive: o
        } = ro(e);
        this._targetEventStore.add(n, t, "", r[e], {
          capture: i,
          passive: o
        });
      }
    }
  }
}
function pa(e, t) {
  e.gestures.add(t);
  e.gestureEventStores[t] = new ua(e, t);
  e.gestureTimeoutStores[t] = new la();
}
function da(e, t) {
  if (t.drag) {
    pa(e, "drag");
  }
  if (t.wheel) {
    pa(e, "wheel");
  }
  if (t.scroll) {
    pa(e, "scroll");
  }
  if (t.move) {
    pa(e, "move");
  }
  if (t.pinch) {
    pa(e, "pinch");
  }
  if (t.hover) {
    pa(e, "hover");
  }
}
const fa = (e, t, r) => (n, i, o, a = {}, s = false) => {
  const c = a.capture ?? t.capture;
  const p = a.passive ?? t.passive;
  let d = s ? n : eo(n, i, c);
  if (r && p) {
    d += "Passive";
  }
  e[d] = e[d] || [];
  e[d].push(o);
};
function ga(e, t = {}, r, n) {
  const i = a.useMemo(() => new ca(e), []);
  i.applyHandlers(e, n);
  i.applyConfig(t, r);
  a.useEffect(i.effect.bind(i));
  a.useEffect(() => i.clean.bind(i), []);
  if (t.target === undefined) {
    return i.bind.bind(i);
  }
}
function ma(e, t) {
  Xo(ea);
  return ga({
    drag: e
  }, t || {}, "drag");
}
function va(e, t) {
  Xo(ta);
  return ga({
    wheel: e
  }, t || {}, "wheel");
}
var ya;
var ha = "adm-popup";
var ba = Object.assign(Object.assign({}, Li), {
  closeOnSwipe: false,
  position: "bottom"
});
function wa(e) {
  var t = c(ba, e);
  var r = u(`${ha}-body`, t.bodyClassName, `${ha}-body-position-${t.position}`);
  var n = Ti();
  var i = n.locale;
  var o = (0, a.useState)(t.visible);
  var s = (0, p.Z)(o, 2);
  var d = s[0];
  var f = s[1];
  var g = (0, a.useRef)(null);
  M(g, !!t.disableBodyScroll && !!d && "strict");
  m(function () {
    if (t.visible) {
      f(true);
    }
  }, [t.visible]);
  var v = y();
  var h = Fn({
    percent: t.visible ? 0 : 100,
    config: {
      precision: 0.1,
      mass: 0.4,
      tension: 300,
      friction: 30
    },
    onRest: function () {
      var e;
      var r;
      if (!v.current) {
        f(t.visible);
        if (t.visible) {
          if ((e = t.afterShow) !== null && e !== undefined) {
            e.call(t);
          }
        } else if ((r = t.afterClose) !== null && r !== undefined) {
          r.call(t);
        }
      }
    }
  });
  var b = h.percent;
  var w = ma(function (e) {
    var r;
    var n = (0, p.Z)(e.swipe, 2);
    var i = n[1];
    if (t.closeOnSwipe && (i === 1 && t.position === "bottom" || i === -1 && t.position === "top")) {
      if ((r = t.onClose) !== null && r !== undefined) {
        r.call(t);
      }
    }
  }, {
    axis: "y",
    enabled: ["top", "bottom"].includes(t.position)
  });
  var x = Fi(d && t.visible);
  var E = Mi(t.stopPropagation, l(t, a.createElement("div", Object.assign({
    className: ha,
    onClick: t.onClick,
    style: {
      display: d ? undefined : "none",
      touchAction: ["top", "bottom"].includes(t.position) ? "none" : "auto"
    }
  }, w()), t.mask && a.createElement(ji, {
    visible: x,
    forceRender: t.forceRender,
    destroyOnClose: t.destroyOnClose,
    onMaskClick: function (e) {
      var r;
      var n;
      if ((r = t.onMaskClick) !== null && r !== undefined) {
        r.call(t, e);
      }
      if (t.closeOnMaskClick) {
        if ((n = t.onClose) !== null && n !== undefined) {
          n.call(t);
        }
      }
    },
    className: t.maskClassName,
    style: t.maskStyle,
    disableBodyScroll: false,
    stopPropagation: t.stopPropagation
  }), a.createElement(fi.div, {
    className: r,
    style: Object.assign(Object.assign({}, t.bodyStyle), {
      pointerEvents: b.to(function (e) {
        if (e === 0) {
          return "unset";
        } else {
          return "none";
        }
      }),
      transform: b.to(function (e) {
        if (t.position === "bottom") {
          return `translate(0, ${e}%)`;
        } else if (t.position === "top") {
          return `translate(0, -${e}%)`;
        } else if (t.position === "left") {
          return `translate(-${e}%, 0)`;
        } else if (t.position === "right") {
          return `translate(${e}%, 0)`;
        } else {
          return "none";
        }
      })
    }),
    ref: g
  }, t.showCloseButton && a.createElement("a", {
    className: u(`${ha}-close-icon`, "adm-plain-anchor"),
    onClick: function () {
      var e;
      if ((e = t.onClose) !== null && e !== undefined) {
        e.call(t);
      }
    },
    role: "button",
    "aria-label": i.common.close
  }, a.createElement(Di.Z, null)), t.children))));
  return a.createElement(Ai, {
    active: d,
    forceRender: t.forceRender,
    destroyOnClose: t.destroyOnClose
  }, mi(t.getContainer, E));
}
var xa = wa;
require("./48973.js");
var Ea = "adm-safe-area";
function ka(e) {
  return l(e, a.createElement("div", {
    className: u(Ea, `${Ea}-position-${e.position}`)
  }));
}
var Sa = ka;
var Ta = require("./69494.js");
var Ca = Object.assign({}, Wn);
var Aa = Ca.version;
var _a = Ca.render;
var Oa = Ca.unmountComponentAtNode;
try {
  var Ma = Number((Aa || "").split(".")[0]);
  if (Ma >= 18 && Ca.createRoot) {
    ya = Ca.createRoot;
  }
} catch (jg) {}
function Pa(e) {
  var t = Ca.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  if (t && typeof t === "object") {
    t.usingClientEntryPoint = e;
  }
}
var qa = "__antd_mobile_root__";
function Na(e, t) {
  _a(e, t);
}
function Ra(e, t) {
  Pa(true);
  var r = t[qa] || ya(t);
  Pa(false);
  r.render(e);
  t[qa] = r;
}
function Ia(e, t) {
  if (ya) {
    Ra(e, t);
  } else {
    Na(e, t);
  }
}
function ja(e) {
  return Oa(e);
}
function Da(e) {
  return (0, Ta.mG)(this, undefined, undefined, (0, B.Z)().mark(function t() {
    return (0, B.Z)().wrap(function (t) {
      while (1) {
        switch (t.prev = t.next) {
          case 0:
            return t.abrupt("return", Promise.resolve().then(function () {
              var t;
              if ((t = e[qa]) !== null && t !== undefined) {
                t.unmount();
              }
              delete e[qa];
            }));
          case 1:
          case "end":
            return t.stop();
        }
      }
    }, t);
  }));
}
function La(e) {
  if (ya) {
    return Da(e);
  } else {
    return ja(e);
  }
}
function Fa(e) {
  var t = document.createElement("div");
  function r() {
    var e = La(t);
    if (e && t.parentNode) {
      t.parentNode.removeChild(t);
    }
  }
  document.body.appendChild(t);
  Ia(e, t);
  return r;
}
function Za(e) {
  var t = this;
  var r = a.forwardRef(function (t, r) {
    var n = (0, a.useState)(false);
    var o = (0, p.Z)(n, 2);
    var s = o[0];
    var u = o[1];
    var l = (0, a.useRef)(false);
    var c = (0, a.useState)(e);
    var d = (0, p.Z)(c, 2);
    var f = d[0];
    var g = d[1];
    var m = (0, a.useRef)(0);
    function v() {
      var e;
      var t;
      l.current = true;
      u(false);
      if ((t = (e = f.props).onClose) !== null && t !== undefined) {
        t.call(e);
      }
    }
    function y() {
      var e;
      var t;
      i();
      if ((t = (e = f.props).afterClose) !== null && t !== undefined) {
        t.call(e);
      }
    }
    (0, a.useEffect)(function () {
      if (l.current) {
        y();
      } else {
        u(true);
      }
    }, []);
    (0, a.useImperativeHandle)(r, function () {
      return {
        close: v,
        replace: function (e) {
          var t;
          var r;
          m.current++;
          if ((r = (t = f.props).afterClose) !== null && r !== undefined) {
            r.call(t);
          }
          g(e);
        }
      };
    });
    return a.cloneElement(f, Object.assign(Object.assign({}, f.props), {
      key: m.current,
      visible: s,
      onClose: v,
      afterClose: y
    }));
  });
  var n = a.createRef();
  var i = Fa(a.createElement(r, {
    ref: n
  }));
  return {
    close: function () {
      return (0, Ta.mG)(t, undefined, undefined, (0, B.Z)().mark(function e() {
        var t;
        return (0, B.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (n.current) {
                  if ((t = n.current) !== null && t !== undefined) {
                    t.close();
                  }
                } else {
                  i();
                }
              case 1:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }));
    },
    replace: function (e) {
      var t;
      if ((t = n.current) !== null && t !== undefined) {
        t.replace(e);
      }
    }
  };
}
var za = "adm-action-sheet";
var Ua = {
  visible: false,
  actions: [],
  cancelText: "",
  closeOnAction: false,
  closeOnMaskClick: true,
  safeArea: true,
  destroyOnClose: false,
  forceRender: false
};
function Ba(e) {
  var t = c(Ua, e);
  var r = t.styles;
  return a.createElement(xa, {
    visible: t.visible,
    onMaskClick: function () {
      var e;
      var r;
      if ((e = t.onMaskClick) !== null && e !== undefined) {
        e.call(t);
      }
      if (t.closeOnMaskClick) {
        if ((r = t.onClose) !== null && r !== undefined) {
          r.call(t);
        }
      }
    },
    afterClose: t.afterClose,
    className: u(`${za}-popup`, t.popupClassName),
    style: t.popupStyle,
    getContainer: t.getContainer,
    destroyOnClose: t.destroyOnClose,
    forceRender: t.forceRender,
    bodyStyle: r?.body,
    maskStyle: r?.mask
  }, l(t, a.createElement("div", {
    className: za
  }, t.extra && a.createElement("div", {
    className: `${za}-extra`
  }, t.extra), a.createElement("div", {
    className: `${za}-button-list`
  }, t.actions.map(function (e, r) {
    var n;
    return a.createElement("div", {
      key: e.key,
      className: `${za}-button-item-wrapper`
    }, a.createElement("a", {
      className: u("adm-plain-anchor", `${za}-button-item`, (n = {}, (0, o.Z)(n, `${za}-button-item-danger`, e.danger), (0, o.Z)(n, `${za}-button-item-disabled`, e.disabled), (0, o.Z)(n, `${za}-button-item-bold`, e.bold), n)),
      onClick: function () {
        var n;
        var i;
        var o;
        if ((n = e.onClick) !== null && n !== undefined) {
          n.call(e);
        }
        if ((i = t.onAction) !== null && i !== undefined) {
          i.call(t, e, r);
        }
        if (t.closeOnAction) {
          if ((o = t.onClose) !== null && o !== undefined) {
            o.call(t);
          }
        }
      },
      role: "option",
      "aria-disabled": e.disabled
    }, a.createElement("div", {
      className: `${za}-button-item-name`
    }, e.text), e.description && a.createElement("div", {
      className: `${za}-button-item-description`
    }, e.description)));
  })), t.cancelText && a.createElement("div", {
    className: `${za}-cancel`,
    role: "option",
    "aria-label": t.cancelText
  }, a.createElement("div", {
    className: `${za}-button-item-wrapper`
  }, a.createElement("a", {
    className: u("adm-plain-anchor", `${za}-button-item`),
    onClick: t.onClose
  }, a.createElement("div", {
    className: `${za}-button-item-name`
  }, t.cancelText)))), t.safeArea && a.createElement(Sa, {
    position: "bottom"
  }))));
}
function Va(e) {
  return Za(a.createElement(Ba, Object.assign({}, e)));
}
var Ha = i(Ba, {
  show: Va
});
require("./72119.js");
require("./70859.js");
var Wa = "adm-dot-loading";
var Ya = {
  default: "var(--adm-color-weak)",
  primary: "var(--adm-color-primary)",
  white: "var(--adm-color-white)"
};
var Qa = {
  color: "default"
};
var $a = (0, a.memo)(function (e) {
  var r = c(Qa, e);
  return l(r, a.createElement("div", {
    style: {
      color: Ya[r.color] ?? r.color
    },
    className: u("adm-loading", Wa)
  }, a.createElement("svg", {
    height: "1em",
    viewBox: "0 0 100 40",
    style: {
      verticalAlign: "-0.125em"
    }
  }, a.createElement("g", {
    stroke: "none",
    strokeWidth: "1",
    fill: "none",
    fillRule: "evenodd"
  }, a.createElement("g", {
    transform: "translate(-100.000000, -71.000000)"
  }, a.createElement("g", {
    transform: "translate(95.000000, 71.000000)"
  }, a.createElement("g", {
    transform: "translate(5.000000, 0.000000)"
  }, [0, 1, 2].map(function (e) {
    return a.createElement("rect", {
      key: e,
      fill: "currentColor",
      x: 20 + e * 26,
      y: "16",
      width: "8",
      height: "8",
      rx: "2"
    }, a.createElement("animate", {
      attributeName: "y",
      from: "16",
      to: "16",
      dur: "2s",
      begin: `${e * 0.2}s`,
      repeatCount: "indefinite",
      values: "16; 6; 26; 16; 16",
      keyTimes: "0; 0.1; 0.3; 0.4; 1"
    }));
  }))))))));
});
var Ga = $a;
function Ka(e) {
  return !!e && typeof e === "object" && typeof e.then === "function";
}
function Ja() {
  return !!n && /ios|iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
}
var Xa = "adm-button";
var es = {
  color: "default",
  fill: "solid",
  block: false,
  loading: false,
  loadingIcon: a.createElement(Ga, {
    color: "currentColor"
  }),
  type: "button",
  shape: "default",
  size: "middle"
};
var ts = (0, a.forwardRef)(function (e, t) {
  var r;
  var n = c(es, e);
  var i = (0, a.useState)(false);
  var s = (0, p.Z)(i, 2);
  var d = s[0];
  var f = s[1];
  var g = (0, a.useRef)(null);
  var m = n.loading === "auto" ? d : n.loading;
  var v = n.disabled || m;
  (0, a.useImperativeHandle)(t, function () {
    return {
      get nativeElement() {
        return g.current;
      }
    };
  });
  function y(e) {
    return (0, Ta.mG)(undefined, undefined, undefined, (0, B.Z)().mark(function t() {
      var r;
      return (0, B.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              if (n.onClick) {
                t.next = 2;
                break;
              }
              return t.abrupt("return");
            case 2:
              r = n.onClick(e);
              if (!Ka(r)) {
                t.next = 15;
                break;
              }
              t.prev = 4;
              f(true);
              t.next = 8;
              return r;
            case 8:
              f(false);
              t.next = 15;
              break;
            case 11:
              t.prev = 11;
              t.t0 = t.catch(4);
              f(false);
              throw t.t0;
            case 15:
            case "end":
              return t.stop();
          }
        }
      }, t, null, [[4, 11]]);
    }));
  }
  return l(n, a.createElement("button", {
    ref: g,
    type: n.type,
    onClick: y,
    className: u(Xa, (r = {}, (0, o.Z)(r, `${Xa}-${n.color}`, n.color), (0, o.Z)(r, `${Xa}-block`, n.block), (0, o.Z)(r, `${Xa}-disabled`, v), (0, o.Z)(r, `${Xa}-fill-outline`, n.fill === "outline"), (0, o.Z)(r, `${Xa}-fill-none`, n.fill === "none"), (0, o.Z)(r, `${Xa}-mini`, n.size === "mini"), (0, o.Z)(r, `${Xa}-small`, n.size === "small"), (0, o.Z)(r, `${Xa}-large`, n.size === "large"), (0, o.Z)(r, `${Xa}-loading`, m), r), `${Xa}-shape-${n.shape}`),
    disabled: v,
    onMouseDown: n.onMouseDown,
    onMouseUp: n.onMouseUp,
    onTouchStart: n.onTouchStart,
    onTouchEnd: n.onTouchEnd
  }, m ? a.createElement("div", {
    className: `${Xa}-loading-wrapper`
  }, n.loadingIcon, n.loadingText) : a.createElement("span", null, n.children)));
});
var rs = ts;
require("./35381.js");
var ns = "adm-card";
function is(e) {
  function t() {
    if (e.title || e.extra) {
      return a.createElement("div", {
        className: u(`${ns}-header`, e.headerClassName),
        style: e.headerStyle,
        onClick: e.onHeaderClick
      }, a.createElement("div", {
        className: `${ns}-header-title`
      }, e.title), e.extra);
    } else {
      return null;
    }
  }
  function r() {
    if (e.children) {
      return a.createElement("div", {
        className: u(`${ns}-body`, e.bodyClassName),
        style: e.bodyStyle,
        onClick: e.onBodyClick
      }, e.children);
    } else {
      return null;
    }
  }
  return l(e, a.createElement("div", {
    className: ns,
    onClick: e.onClick
  }, t(), r()));
}
var os = is;
require("./21830.js");
function as(e) {
  var t = e.action;
  return l(e.action, a.createElement(rs, {
    key: t.key,
    onClick: e.onAction,
    className: u("adm-dialog-button", {
      "adm-dialog-button-bold": t.bold
    }),
    fill: "none",
    shape: "rectangular",
    block: true,
    color: t.danger ? "danger" : "primary",
    loading: "auto",
    disabled: t.disabled
  }, t.text));
}
require("./60265.js");
var ss = require("./96832.js");
function us(e) {
  if (typeof e === "number") {
    return `${e}px`;
  } else {
    return e;
  }
}
require("./15983.js");
function ls(e) {
  return typeof e === "function";
}
function cs(e, t) {
  var r;
  if (f) {
    if (e) {
      r = ls(e) ? e() : "current" in e ? e.current : e;
      return r;
    } else {
      return t;
    }
  }
}
function ps(e) {
  var t = (0, a.useRef)(e);
  t.current = e;
  return t;
}
var ds = ps;
var fs = false;
var gs = fs;
function ms(e) {
  if (gs) {
    if (!ls(e)) {
      console.error(`useUnmount expected parameter is a function, got ${typeof e}`);
    }
  }
  var t = ds(e);
  (0, a.useEffect)(function () {
    return function () {
      t.current();
    };
  }, []);
}
var vs = ms;
function ys(e, t) {
  if (e === t) {
    return true;
  }
  for (var r = 0; r < e.length; r++) {
    if (!Object.is(e[r], t[r])) {
      return false;
    }
  }
  return true;
}
function hs(e) {
  function t(t, r, n) {
    var i = (0, a.useRef)(false);
    var o = (0, a.useRef)([]);
    var s = (0, a.useRef)([]);
    var u = (0, a.useRef)();
    e(function () {
      var e;
      var a = Array.isArray(n) ? n : [n];
      var l = a.map(function (e) {
        return cs(e);
      });
      if (!i.current) {
        i.current = true;
        o.current = l;
        s.current = r;
        u.current = t();
        return;
      }
      if (l.length !== o.current.length || !ys(o.current, l) || !ys(s.current, r)) {
        if ((e = u.current) !== null && e !== undefined) {
          e.call(u);
        }
        o.current = l;
        s.current = r;
        u.current = t();
      }
    });
    vs(function () {
      var e;
      if ((e = u.current) !== null && e !== undefined) {
        e.call(u);
      }
      i.current = false;
    });
  }
  return t;
}
var bs = hs;
var ws = bs(a.useEffect);
var xs = ws;
function Es(e, t) {
  var r = t || {};
  var n = r.callback;
  var i = (0, Ta._T)(r, ["callback"]);
  var o = (0, Ta.CR)((0, a.useState)(), 2);
  var s = o[0];
  var u = o[1];
  var l = (0, Ta.CR)((0, a.useState)(), 2);
  var c = l[0];
  var p = l[1];
  xs(function () {
    var r = Array.isArray(e) ? e : [e];
    var o = r.map(function (e) {
      return cs(e);
    }).filter(Boolean);
    if (o.length) {
      var a = new IntersectionObserver(function (e) {
        var t;
        var r;
        try {
          for (var i = (0, Ta.XA)(e), o = i.next(); !o.done; o = i.next()) {
            var a = o.value;
            p(a.intersectionRatio);
            u(a.isIntersecting);
            if (n !== null && n !== undefined) {
              n(a);
            }
          }
        } catch (s) {
          t = {
            error: s
          };
        } finally {
          try {
            if (o && !o.done && (r = i.return)) {
              r.call(i);
            }
          } finally {
            if (t) {
              throw t.error;
            }
          }
        }
      }, (0, Ta.pi)((0, Ta.pi)({}, i), {
        root: cs(t?.root)
      }));
      o.forEach(function (e) {
        return a.observe(e);
      });
      return function () {
        a.disconnect();
      };
    }
  }, [t?.rootMargin, t?.threshold, n], e);
  return [s, c];
}
var ks = Es;
function Ss(e) {
  var t = (0, a.useRef)(null);
  var r = ks(t);
  var n = (0, p.Z)(r, 1);
  var i = n[0];
  (0, a.useEffect)(function () {
    if (i) {
      e.onActive();
    }
  }, [i]);
  return a.createElement("div", {
    ref: t
  });
}
function Ts(e) {
  return function (t, r) {
    var n = (0, a.useRef)(false);
    e(function () {
      return function () {
        n.current = false;
      };
    }, []);
    e(function () {
      if (n.current) {
        return t();
      }
      n.current = true;
    }, r);
  };
}
var Cs = Ts(m);
function As() {
  return a.createElement("svg", {
    viewBox: "0 0 48 48",
    xmlns: "http://www.w3.org/2000/svg"
  }, a.createElement("path", {
    d: "M41.396 6.234c1.923 0 3.487 1.574 3.487 3.505v29.14c0 1.937-1.568 3.51-3.491 3.51H6.604c-1.923 0-3.487-1.573-3.487-3.51V9.745c0-1.936 1.564-3.51 3.487-3.51Zm0 2.847H6.604c-.355 0-.654.3-.654.658V34.9l5.989-8.707a2.373 2.373 0 0 1 1.801-1.005 2.405 2.405 0 0 1 1.933.752l4.182 4.525 7.58-11.005a2.374 2.374 0 0 1 1.96-1.01c.79 0 1.532.38 1.966 1.01L42.05 34.89V9.74a.664.664 0 0 0-.654-.658Zm-28.305 2.763a3.119 3.119 0 0 1 3.117 3.117 3.119 3.119 0 0 1-3.117 3.117 3.122 3.122 0 0 1-3.117-3.117 3.119 3.119 0 0 1 3.117-3.117Z",
    fill: "#DBDBDB",
    fillRule: "nonzero"
  }));
}
function _s() {
  return a.createElement("svg", {
    viewBox: "0 0 48 48",
    xmlns: "http://www.w3.org/2000/svg"
  }, a.createElement("path", {
    d: "M19.233 6.233 17.42 9.08l-10.817.001a.665.665 0 0 0-.647.562l-.007.096V34.9l5.989-8.707a2.373 2.373 0 0 1 1.801-1.005 2.415 2.415 0 0 1 1.807.625l.126.127 4.182 4.525 2.267-3.292 5.461 7.841-4.065 7.375H6.604c-1.86 0-3.382-1.47-3.482-3.317l-.005-.192V9.744c0-1.872 1.461-3.405 3.296-3.505l.19-.005h12.63Zm22.163 0c1.86 0 3.382 1.472 3.482 3.314l.005.192v29.14a3.507 3.507 0 0 1-3.3 3.505l-.191.006H27.789l3.63-6.587.06-.119a1.87 1.87 0 0 0-.163-1.853l-6.928-9.949 3.047-4.422a2.374 2.374 0 0 1 1.96-1.01 2.4 2.4 0 0 1 1.86.87l.106.14L42.05 34.89V9.74a.664.664 0 0 0-.654-.658H21.855l1.812-2.848h17.73Zm-28.305 5.611c.794 0 1.52.298 2.07.788l-.843 1.325-.067.114a1.87 1.87 0 0 0 .11 1.959l.848 1.217c-.556.515-1.3.83-2.118.83a3.122 3.122 0 0 1-3.117-3.116 3.119 3.119 0 0 1 3.117-3.117Z",
    fill: "#DBDBDB",
    fillRule: "nonzero"
  }));
}
var Os = "adm-image";
var Ms = {
  fit: "fill",
  placeholder: a.createElement("div", {
    className: `${Os}-tip`
  }, a.createElement(As, null)),
  fallback: a.createElement("div", {
    className: `${Os}-tip`
  }, a.createElement(_s, null)),
  lazy: false,
  draggable: false
};
var Ps = (0, ss.staged)(function (e) {
  var t = c(Ms, e);
  var r = (0, a.useState)(false);
  var n = (0, p.Z)(r, 2);
  var i = n[0];
  var o = n[1];
  var s = (0, a.useState)(false);
  var u = (0, p.Z)(s, 2);
  var d = u[0];
  var f = u[1];
  var g = (0, a.useRef)(null);
  var m = (0, a.useRef)(null);
  var v = t.src;
  var y = t.srcSet;
  var h = (0, a.useState)(!t.lazy);
  var b = (0, p.Z)(h, 2);
  var w = b[0];
  var x = b[1];
  function E() {
    if (d) {
      return a.createElement(a.Fragment, null, t.fallback);
    }
    var e = a.createElement("img", {
      ref: m,
      id: t.id,
      className: `${Os}-img`,
      src: v,
      alt: t.alt,
      onClick: t.onClick,
      onLoad: function (e) {
        var r;
        o(true);
        if ((r = t.onLoad) !== null && r !== undefined) {
          r.call(t, e);
        }
      },
      onError: function (e) {
        var r;
        f(true);
        if ((r = t.onError) !== null && r !== undefined) {
          r.call(t, e);
        }
      },
      style: {
        objectFit: t.fit,
        display: i ? "block" : "none"
      },
      crossOrigin: t.crossOrigin,
      decoding: t.decoding,
      loading: t.loading,
      referrerPolicy: t.referrerPolicy,
      sizes: t.sizes,
      srcSet: y,
      useMap: t.useMap,
      draggable: t.draggable
    });
    return a.createElement(a.Fragment, null, !i && t.placeholder, e);
  }
  v = w ? t.src : undefined;
  y = w ? t.srcSet : undefined;
  Cs(function () {
    o(false);
    f(false);
  }, [v]);
  (0, a.useEffect)(function () {
    if (m.current?.complete) {
      o(true);
    }
  }, []);
  var k = {};
  if (t.width) {
    k["--width"] = us(t.width);
    k.width = us(t.width);
  }
  if (t.height) {
    k["--height"] = us(t.height);
    k.height = us(t.height);
  }
  return l(t, a.createElement("div", {
    ref: g,
    className: Os,
    style: k,
    onClick: t.onContainerClick
  }, t.lazy && !w && a.createElement(Ss, {
    onActive: function () {
      x(true);
    }
  }), E()));
});
var qs = Ps;
require("./40833.js");
var Ns = "adm-auto-center";
function Rs(e) {
  return l(e, a.createElement("div", {
    className: Ns
  }, a.createElement("div", {
    className: `${Ns}-content`
  }, e.children)));
}
var Is = Rs;
require("./12783.js");
var js = "adm-center-popup";
var Ds = Object.assign(Object.assign({}, Li), {
  getContainer: null
});
function Ls(e) {
  var t = c(Ds, e);
  var r = y();
  var n = Fn({
    scale: t.visible ? 1 : 0.8,
    opacity: t.visible ? 1 : 0,
    config: {
      mass: 1.2,
      tension: 200,
      friction: 25,
      clamp: true
    },
    onRest: function () {
      var e;
      var n;
      if (!r.current) {
        d(t.visible);
        if (t.visible) {
          if ((e = t.afterShow) !== null && e !== undefined) {
            e.call(t);
          }
        } else if ((n = t.afterClose) !== null && n !== undefined) {
          n.call(t);
        }
      }
    }
  });
  var i = (0, a.useState)(t.visible);
  var o = (0, p.Z)(i, 2);
  var s = o[0];
  var d = o[1];
  m(function () {
    if (t.visible) {
      d(true);
    }
  }, [t.visible]);
  var f = (0, a.useRef)(null);
  M(f, t.disableBodyScroll && s);
  var g = Fi(s && t.visible);
  var v = a.createElement("div", {
    className: u(`${js}-body`, t.bodyClassName),
    style: t.bodyStyle
  }, t.children);
  var h = Mi(t.stopPropagation, l(t, a.createElement("div", {
    className: js,
    style: {
      display: s ? undefined : "none",
      pointerEvents: s ? undefined : "none"
    }
  }, t.mask && a.createElement(ji, {
    visible: g,
    forceRender: t.forceRender,
    destroyOnClose: t.destroyOnClose,
    onMaskClick: function (e) {
      var r;
      var n;
      if ((r = t.onMaskClick) !== null && r !== undefined) {
        r.call(t, e);
      }
      if (t.closeOnMaskClick) {
        if ((n = t.onClose) !== null && n !== undefined) {
          n.call(t);
        }
      }
    },
    style: t.maskStyle,
    className: u(`${js}-mask`, t.maskClassName),
    disableBodyScroll: false,
    stopPropagation: t.stopPropagation
  }), a.createElement("div", {
    className: `${js}-wrap`,
    role: t.role,
    "aria-label": t["aria-label"]
  }, a.createElement(fi.div, {
    style: Object.assign(Object.assign({}, n), {
      pointerEvents: n.opacity.to(function (e) {
        if (e === 1) {
          return "unset";
        } else {
          return "none";
        }
      })
    }),
    ref: f
  }, t.showCloseButton && a.createElement("a", {
    className: u(`${js}-close`, "adm-plain-anchor"),
    onClick: function () {
      var e;
      if ((e = t.onClose) !== null && e !== undefined) {
        e.call(t);
      }
    }
  }, a.createElement(Di.Z, null)), v)))));
  return a.createElement(Ai, {
    active: s,
    forceRender: t.forceRender,
    destroyOnClose: t.destroyOnClose
  }, mi(t.getContainer, h));
}
var Fs = Ls;
var Zs = {
  actions: [],
  closeOnAction: false,
  closeOnMaskClick: false,
  getContainer: null
};
function zs(e) {
  var t = c(Zs, e);
  var r = a.createElement(a.Fragment, null, !!t.image && a.createElement("div", {
    className: Us("image-container")
  }, a.createElement(qs, {
    src: t.image,
    alt: "dialog header image",
    width: "100%"
  })), !!t.header && a.createElement("div", {
    className: Us("header")
  }, a.createElement(Is, null, t.header)), !!t.title && a.createElement("div", {
    className: Us("title")
  }, t.title), a.createElement("div", {
    className: u(Us("content"), !t.content && Us("content-empty"))
  }, typeof t.content === "string" ? a.createElement(Is, null, t.content) : t.content), a.createElement("div", {
    className: Us("footer")
  }, t.actions.map(function (e, r) {
    var n = Array.isArray(e) ? e : [e];
    return a.createElement("div", {
      className: Us("action-row"),
      key: r
    }, n.map(function (e, r) {
      return a.createElement(as, {
        key: e.key,
        action: e,
        onAction: function () {
          return (0, Ta.mG)(undefined, undefined, undefined, (0, B.Z)().mark(function n() {
            var i;
            var o;
            var a;
            return (0, B.Z)().wrap(function (n) {
              while (1) {
                switch (n.prev = n.next) {
                  case 0:
                    n.next = 2;
                    return Promise.all([(i = e.onClick) === null || i === undefined ? undefined : i.call(e), (o = t.onAction) === null || o === undefined ? undefined : o.call(t, e, r)]);
                  case 2:
                    if (t.closeOnAction) {
                      if ((a = t.onClose) !== null && a !== undefined) {
                        a.call(t);
                      }
                    }
                  case 3:
                  case "end":
                    return n.stop();
                }
              }
            }, n);
          }));
        }
      });
    }));
  })));
  return a.createElement(Fs, {
    className: u(Us(), t.className),
    style: t.style,
    afterClose: t.afterClose,
    afterShow: t.afterShow,
    onMaskClick: t.closeOnMaskClick ? function () {
      var e;
      if ((e = t.onClose) !== null && e !== undefined) {
        e.call(t);
      }
    } : undefined,
    visible: t.visible,
    getContainer: t.getContainer,
    bodyStyle: t.bodyStyle,
    bodyClassName: u(Us("body"), t.image && Us("with-image"), t.bodyClassName),
    maskStyle: t.maskStyle,
    maskClassName: t.maskClassName,
    stopPropagation: t.stopPropagation,
    disableBodyScroll: t.disableBodyScroll,
    destroyOnClose: t.destroyOnClose,
    forceRender: t.forceRender,
    role: "dialog",
    "aria-label": t["aria-label"]
  }, r);
}
function Us(e = "") {
  return "adm-dialog" + (e && "-") + e;
}
var Bs = new Set();
function Vs(e) {
  var t = Za(a.createElement(zs, Object.assign({}, e, {
    afterClose: function () {
      var r;
      Bs.delete(t.close);
      if ((r = e.afterClose) !== null && r !== undefined) {
        r.call(e);
      }
    }
  })));
  Bs.add(t.close);
  return t;
}
function Hs(e) {
  var t = {
    confirmText: ki().locale.Dialog.ok
  };
  var r = c(t, e);
  return new Promise(function (e) {
    Vs(Object.assign(Object.assign({}, r), {
      closeOnAction: true,
      actions: [{
        key: "confirm",
        text: r.confirmText
      }],
      onAction: r.onConfirm,
      onClose: function () {
        var t;
        if ((t = r.onClose) !== null && t !== undefined) {
          t.call(r);
        }
        e();
      }
    }));
  });
}
var Ws = {
  confirmText: "确认",
  cancelText: "取消"
};
function Ys(e) {
  var t = this;
  var r = ki();
  var n = r.locale;
  var i = c(Ws, {
    confirmText: n.common.confirm,
    cancelText: n.common.cancel
  }, e);
  return new Promise(function (e) {
    Vs(Object.assign(Object.assign({}, i), {
      closeOnAction: true,
      onClose: function () {
        var t;
        if ((t = i.onClose) !== null && t !== undefined) {
          t.call(i);
        }
        e(false);
      },
      actions: [[{
        key: "cancel",
        text: i.cancelText,
        onClick: function () {
          return (0, Ta.mG)(t, undefined, undefined, (0, B.Z)().mark(function t() {
            var r;
            return (0, B.Z)().wrap(function (t) {
              while (1) {
                switch (t.prev = t.next) {
                  case 0:
                    t.next = 2;
                    if ((r = i.onCancel) === null || r === undefined) {
                      return undefined;
                    } else {
                      return r.call(i);
                    }
                  case 2:
                    e(false);
                  case 3:
                  case "end":
                    return t.stop();
                }
              }
            }, t);
          }));
        }
      }, {
        key: "confirm",
        text: i.confirmText,
        bold: true,
        onClick: function () {
          return (0, Ta.mG)(t, undefined, undefined, (0, B.Z)().mark(function t() {
            var r;
            return (0, B.Z)().wrap(function (t) {
              while (1) {
                switch (t.prev = t.next) {
                  case 0:
                    t.next = 2;
                    if ((r = i.onConfirm) === null || r === undefined) {
                      return undefined;
                    } else {
                      return r.call(i);
                    }
                  case 2:
                    e(true);
                  case 3:
                  case "end":
                    return t.stop();
                }
              }
            }, t);
          }));
        }
      }]]
    }));
  });
}
function Qs() {
  Bs.forEach(function (e) {
    e();
  });
}
var $s = i(zs, {
  show: Vs,
  alert: Hs,
  confirm: Ys,
  clear: Qs
});
require("./42144.js");
function Gs(e) {
  return l(e, a.createElement("svg", {
    viewBox: "0 0 64 41"
  }, a.createElement("g", {
    transform: "translate(0 1)",
    fill: "none",
    fillRule: "evenodd"
  }, a.createElement("ellipse", {
    fill: "#f5f5f5",
    cx: "32",
    cy: "33",
    rx: "32",
    ry: "7"
  }), a.createElement("g", {
    stroke: "#d9d9d9"
  }, a.createElement("path", {
    d: "M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z"
  }), a.createElement("path", {
    d: "M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z",
    fill: "#fafafa"
  })))));
}
var Ks = "adm-empty";
function Js(e) {
  function t() {
    var t = e.image;
    if (t === undefined) {
      return a.createElement(Gs, {
        className: `${Ks}-image`,
        style: e.imageStyle
      });
    } else if (typeof t === "string") {
      return a.createElement("img", {
        className: `${Ks}-image`,
        style: e.imageStyle,
        src: t,
        alt: "empty"
      });
    } else {
      return t;
    }
  }
  return l(e, a.createElement("div", {
    className: Ks
  }, a.createElement("div", {
    className: `${Ks}-image-container`
  }, t()), e.description && a.createElement("div", {
    className: u(`${Ks}-description`)
  }, e.description)));
}
var Xs = Js;
require("./34160.js");
require("./30802.js");
var eu = "adm-list";
var tu = {
  mode: "default"
};
var ru = (0, a.forwardRef)(function (e, t) {
  var r = c(tu, e);
  var n = (0, a.useRef)(null);
  (0, a.useImperativeHandle)(t, function () {
    return {
      get nativeElement() {
        return n.current;
      }
    };
  });
  return l(r, a.createElement("div", {
    className: u(eu, `${eu}-${r.mode}`),
    ref: n
  }, r.header && a.createElement("div", {
    className: `${eu}-header`
  }, r.header), a.createElement("div", {
    className: `${eu}-body`
  }, a.createElement("div", {
    className: `${eu}-body-inner`
  }, r.children))));
});
var nu = require("./98816.js");
function iu(e) {
  return e !== undefined && e !== null && e !== false;
}
var ou = "adm-list-item";
function au(e) {
  var r = e.clickable ?? !!e.onClick;
  var n = e.arrow === undefined ? r : e.arrow;
  var i = a.createElement("div", {
    className: `${ou}-content`
  }, iu(e.prefix) && a.createElement("div", {
    className: `${ou}-content-prefix`
  }, e.prefix), a.createElement("div", {
    className: `${ou}-content-main`
  }, iu(e.title) && a.createElement("div", {
    className: `${ou}-title`
  }, e.title), e.children, iu(e.description) && a.createElement("div", {
    className: `${ou}-description`
  }, e.description)), iu(e.extra) && a.createElement("div", {
    className: `${ou}-content-extra`
  }, e.extra), iu(n) && a.createElement("div", {
    className: `${ou}-content-arrow`
  }, n === true ? a.createElement(nu.Z, null) : n));
  return l(e, a.createElement(r ? "a" : "div", {
    className: u(`${ou}`, r ? ["adm-plain-anchor"] : [], e.disabled && `${ou}-disabled`),
    onClick: e.disabled ? undefined : e.onClick
  }, i));
}
var su = i(ru, {
  Item: au
});
var uu = require("./34256.js");
var lu = require("./37913.js");
var cu = require("./91613.js");
var pu = require("./3787.js");
var du = require("./68044.js");
var fu = "RC_FORM_INTERNAL_HOOKS";
function gu() {
  (0, du.ZP)(false, "Can not find FormContext. Please make sure you wrap Field under Form.");
}
var mu = a.createContext({
  getFieldValue: gu,
  getFieldsValue: gu,
  getFieldError: gu,
  getFieldWarning: gu,
  getFieldsError: gu,
  isFieldsTouched: gu,
  isFieldTouched: gu,
  isFieldValidating: gu,
  isFieldsValidating: gu,
  resetFields: gu,
  setFields: gu,
  setFieldValue: gu,
  setFieldsValue: gu,
  validateFields: gu,
  submit: gu,
  getInternalHooks: function () {
    gu();
    return {
      dispatch: gu,
      initEntityValue: gu,
      registerField: gu,
      useSubscribe: gu,
      setInitialValues: gu,
      destroyForm: gu,
      setCallbacks: gu,
      registerWatch: gu,
      getFields: gu,
      setValidateMessages: gu,
      setPreserve: gu,
      getInitialValue: gu
    };
  }
});
var vu = mu;
function yu(e) {
  if (e === undefined || e === null) {
    return [];
  } else if (Array.isArray(e)) {
    return e;
  } else {
    return [e];
  }
}
var hu = require("./63325.js");
var bu = "'${name}' is not a valid ${type}";
var wu = {
  default: "Validation error on field '${name}'",
  required: "'${name}' is required",
  enum: "'${name}' must be one of [${enum}]",
  whitespace: "'${name}' cannot be empty",
  date: {
    format: "'${name}' is invalid for format date",
    parse: "'${name}' could not be parsed as date",
    invalid: "'${name}' is invalid date"
  },
  types: {
    string: bu,
    method: bu,
    array: bu,
    object: bu,
    number: bu,
    date: bu,
    boolean: bu,
    integer: bu,
    float: bu,
    regexp: bu,
    email: bu,
    url: bu,
    hex: bu
  },
  string: {
    len: "'${name}' must be exactly ${len} characters",
    min: "'${name}' must be at least ${min} characters",
    max: "'${name}' cannot be longer than ${max} characters",
    range: "'${name}' must be between ${min} and ${max} characters"
  },
  number: {
    len: "'${name}' must equal ${len}",
    min: "'${name}' cannot be less than ${min}",
    max: "'${name}' cannot be greater than ${max}",
    range: "'${name}' must be between ${min} and ${max}"
  },
  array: {
    len: "'${name}' must be exactly ${len} in length",
    min: "'${name}' cannot be less than ${min} in length",
    max: "'${name}' cannot be greater than ${max} in length",
    range: "'${name}' must be between ${min} and ${max} in length"
  },
  pattern: {
    mismatch: "'${name}' does not match pattern ${pattern}"
  }
};
var xu = require("./75728.js");
var Eu = require("./64209.js");
var ku = require("./19889.js");
function Su(e) {
  if (Array.isArray(e)) {
    return Cu(e);
  } else if ((0, xu.Z)(e) === "object" && e !== null) {
    return Tu(e);
  } else {
    return e;
  }
}
function Tu(e) {
  if (Object.getPrototypeOf(e) === Object.prototype) {
    var t = {};
    for (var r in e) {
      t[r] = Su(e[r]);
    }
    return t;
  }
  return e;
}
function Cu(e) {
  return e.map(function (e) {
    return Su(e);
  });
}
var Au = Su;
function _u(e) {
  return yu(e);
}
function Ou(e, t) {
  var r = (0, Eu.Z)(e, t);
  return r;
}
function Mu(e, t, r, n = false) {
  var i = (0, ku.Z)(e, t, r, n);
  return i;
}
function Pu(e, t) {
  var r = {};
  t.forEach(function (t) {
    var n = Ou(e, t);
    r = Mu(r, t, n);
  });
  return r;
}
function qu(e, t) {
  return e && e.some(function (e) {
    return ju(e, t);
  });
}
function Nu(e) {
  return (0, xu.Z)(e) === "object" && e !== null && Object.getPrototypeOf(e) === Object.prototype;
}
function Ru(e, t) {
  var r = Array.isArray(e) ? (0, j.Z)(e) : (0, cu.Z)({}, e);
  if (t) {
    Object.keys(t).forEach(function (e) {
      var n = r[e];
      var i = t[e];
      var o = Nu(n) && Nu(i);
      r[e] = o ? Ru(n, i || {}) : Au(i);
    });
    return r;
  } else {
    return r;
  }
}
function Iu(e) {
  for (var t = arguments.length, r = new Array(t > 1 ? t - 1 : 0), n = 1; n < t; n++) {
    r[n - 1] = arguments[n];
  }
  return r.reduce(function (e, t) {
    return Ru(e, t);
  }, e);
}
function ju(e, t) {
  return !!e && !!t && e.length === t.length && e.every(function (e, r) {
    return t[r] === e;
  });
}
function Du(e, t) {
  if (e === t) {
    return true;
  }
  if (!e && t || e && !t) {
    return false;
  }
  if (!e || !t || (0, xu.Z)(e) !== "object" || (0, xu.Z)(t) !== "object") {
    return false;
  }
  var r = Object.keys(e);
  var n = Object.keys(t);
  var i = new Set([].concat(r, n));
  return (0, j.Z)(i).every(function (r) {
    var n = e[r];
    var i = t[r];
    return typeof n === "function" && typeof i === "function" || n === i;
  });
}
function Lu(e) {
  var t = arguments.length <= 1 ? undefined : arguments[1];
  if (t && t.target && (0, xu.Z)(t.target) === "object" && e in t.target) {
    return t.target[e];
  } else {
    return t;
  }
}
function Fu(e, t, r) {
  var n = e.length;
  if (t < 0 || t >= n || r < 0 || r >= n) {
    return e;
  }
  var i = e[t];
  var o = t - r;
  if (o > 0) {
    return [].concat((0, j.Z)(e.slice(0, r)), [i], (0, j.Z)(e.slice(r, t)), (0, j.Z)(e.slice(t + 1, n)));
  } else if (o < 0) {
    return [].concat((0, j.Z)(e.slice(0, t)), (0, j.Z)(e.slice(t + 1, r + 1)), [i], (0, j.Z)(e.slice(r + 1, n)));
  } else {
    return e;
  }
}
var Zu = hu.Z;
function zu(e, t) {
  return e.replace(/\$\{\w+\}/g, function (e) {
    var r = e.slice(2, -1);
    return t[r];
  });
}
var Uu = "CODE_LOGIC_ERROR";
function Bu(e, t, r, n, i) {
  return Vu.apply(this, arguments);
}
function Vu() {
  Vu = (0, V.Z)((0, B.Z)().mark(function e(t, r, n, i, s) {
    var u;
    var l;
    var c;
    var p;
    var d;
    var f;
    var g;
    var m;
    var v;
    return (0, B.Z)().wrap(function (e) {
      while (1) {
        switch (e.prev = e.next) {
          case 0:
            u = (0, cu.Z)({}, n);
            delete u.ruleIndex;
            if (u.validator) {
              l = u.validator;
              u.validator = function () {
                try {
                  return l.apply(undefined, arguments);
                } catch (e) {
                  console.error(e);
                  return Promise.reject(Uu);
                }
              };
            }
            c = null;
            if (u && u.type === "array" && u.defaultField) {
              c = u.defaultField;
              delete u.defaultField;
            }
            p = new Zu((0, o.Z)({}, t, [u]));
            d = Iu({}, wu, i.validateMessages);
            p.messages(d);
            f = [];
            e.prev = 9;
            e.next = 12;
            return Promise.resolve(p.validate((0, o.Z)({}, t, r), (0, cu.Z)({}, i)));
          case 12:
            e.next = 17;
            break;
          case 14:
            e.prev = 14;
            e.t0 = e.catch(9);
            if (e.t0.errors) {
              f = e.t0.errors.map(function (e, t) {
                var r = e.message;
                var n = r === Uu ? d.default : r;
                if (a.isValidElement(n)) {
                  return a.cloneElement(n, {
                    key: `error_${t}`
                  });
                } else {
                  return n;
                }
              });
            }
          case 17:
            if (f.length || !c) {
              e.next = 22;
              break;
            }
            e.next = 20;
            return Promise.all(r.map(function (e, r) {
              return Bu(`${t}.${r}`, e, c, i, s);
            }));
          case 20:
            g = e.sent;
            return e.abrupt("return", g.reduce(function (e, t) {
              return [].concat((0, j.Z)(e), (0, j.Z)(t));
            }, []));
          case 22:
            m = (0, cu.Z)((0, cu.Z)({}, n), {}, {
              name: t,
              enum: (n.enum || []).join(", ")
            }, s);
            v = f.map(function (e) {
              if (typeof e === "string") {
                return zu(e, m);
              } else {
                return e;
              }
            });
            return e.abrupt("return", v);
          case 25:
          case "end":
            return e.stop();
        }
      }
    }, e, null, [[9, 14]]);
  }));
  return Vu.apply(this, arguments);
}
function Hu(e, t, r, n, i, o) {
  var a;
  var s = e.join(".");
  var u = r.map(function (e, t) {
    var r = e.validator;
    var n = (0, cu.Z)((0, cu.Z)({}, e), {}, {
      ruleIndex: t
    });
    if (r) {
      n.validator = function (e, t, n) {
        var i = false;
        function o() {
          for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
            t[r] = arguments[r];
          }
          Promise.resolve().then(function () {
            (0, du.ZP)(!i, "Your validator function has already return a promise. `callback` will be ignored.");
            if (!i) {
              n.apply(undefined, t);
            }
          });
        }
        var a = r(e, t, o);
        i = a && typeof a.then === "function" && typeof a.catch === "function";
        (0, du.ZP)(i, "`callback` is deprecated. Please return a promise instead.");
        if (i) {
          a.then(function () {
            n();
          }).catch(function (e) {
            n(e || " ");
          });
        }
      };
    }
    return n;
  }).sort(function (e, t) {
    var r = e.warningOnly;
    var n = e.ruleIndex;
    var i = t.warningOnly;
    var o = t.ruleIndex;
    if (!!r === !!i) {
      return n - o;
    } else if (r) {
      return 1;
    } else {
      return -1;
    }
  });
  if (i === true) {
    a = new Promise(function () {
      var e = (0, V.Z)((0, B.Z)().mark(function e(r, i) {
        var a;
        var l;
        var c;
        return (0, B.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                a = 0;
              case 1:
                if (!(a < u.length)) {
                  e.next = 12;
                  break;
                }
                l = u[a];
                e.next = 5;
                return Bu(s, t, l, n, o);
              case 5:
                c = e.sent;
                if (!c.length) {
                  e.next = 9;
                  break;
                }
                i([{
                  errors: c,
                  rule: l
                }]);
                return e.abrupt("return");
              case 9:
                a += 1;
                e.next = 1;
                break;
              case 12:
                r([]);
              case 13:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }));
      return function (t, r) {
        return e.apply(this, arguments);
      };
    }());
  } else {
    var l = u.map(function (e) {
      return Bu(s, t, e, n, o).then(function (t) {
        return {
          errors: t,
          rule: e
        };
      });
    });
    a = (i ? Qu(l) : Wu(l)).then(function (e) {
      return Promise.reject(e);
    });
  }
  a.catch(function (e) {
    return e;
  });
  return a;
}
function Wu(e) {
  return Yu.apply(this, arguments);
}
function Yu() {
  Yu = (0, V.Z)((0, B.Z)().mark(function e(t) {
    return (0, B.Z)().wrap(function (e) {
      while (1) {
        switch (e.prev = e.next) {
          case 0:
            return e.abrupt("return", Promise.all(t).then(function (e) {
              var t;
              var r = (t = []).concat.apply(t, (0, j.Z)(e));
              return r;
            }));
          case 1:
          case "end":
            return e.stop();
        }
      }
    }, e);
  }));
  return Yu.apply(this, arguments);
}
function Qu(e) {
  return $u.apply(this, arguments);
}
function $u() {
  $u = (0, V.Z)((0, B.Z)().mark(function e(t) {
    var r;
    return (0, B.Z)().wrap(function (e) {
      while (1) {
        switch (e.prev = e.next) {
          case 0:
            r = 0;
            return e.abrupt("return", new Promise(function (e) {
              t.forEach(function (n) {
                n.then(function (n) {
                  if (n.errors.length) {
                    e([n]);
                  }
                  r += 1;
                  if (r === t.length) {
                    e([]);
                  }
                });
              });
            }));
          case 2:
          case "end":
            return e.stop();
        }
      }
    }, e);
  }));
  return $u.apply(this, arguments);
}
var Gu = ["name"];
var Ku = [];
function Ju(e, t, r, n, i, o) {
  if (typeof e === "function") {
    return e(t, r, "source" in o ? {
      source: o.source
    } : {});
  } else {
    return n !== i;
  }
}
var Xu = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r(e) {
    var n;
    (0, q.Z)(this, r);
    n = t.call(this, e);
    n.state = {
      resetCount: 0
    };
    n.cancelRegisterFunc = null;
    n.mounted = false;
    n.touched = false;
    n.dirty = false;
    n.validatePromise = null;
    n.prevValidating = undefined;
    n.errors = Ku;
    n.warnings = Ku;
    n.cancelRegister = function () {
      var e = n.props;
      var t = e.preserve;
      var r = e.isListField;
      var i = e.name;
      if (n.cancelRegisterFunc) {
        n.cancelRegisterFunc(r, t, _u(i));
      }
      n.cancelRegisterFunc = null;
    };
    n.getNamePath = function () {
      var e = n.props;
      var t = e.name;
      var r = e.fieldContext;
      var i = r.prefixName;
      var o = i === undefined ? [] : i;
      if (t !== undefined) {
        return [].concat((0, j.Z)(o), (0, j.Z)(t));
      } else {
        return [];
      }
    };
    n.getRules = function () {
      var e = n.props;
      var t = e.rules;
      var r = t === undefined ? [] : t;
      var i = e.fieldContext;
      return r.map(function (e) {
        if (typeof e === "function") {
          return e(i);
        } else {
          return e;
        }
      });
    };
    n.refresh = function () {
      if (n.mounted) {
        n.setState(function (e) {
          var t = e.resetCount;
          return {
            resetCount: t + 1
          };
        });
      }
    };
    n.triggerMetaEvent = function (e) {
      var t = n.props.onMetaChange;
      if (t !== null && t !== undefined) {
        t((0, cu.Z)((0, cu.Z)({}, n.getMeta()), {}, {
          destroy: e
        }));
      }
    };
    n.onStoreChange = function (e, t, r) {
      var i = n.props;
      var o = i.shouldUpdate;
      var a = i.dependencies;
      var s = a === undefined ? [] : a;
      var u = i.onReset;
      var l = r.store;
      var c = n.getNamePath();
      var p = n.getValue(e);
      var d = n.getValue(l);
      var f = t && qu(t, c);
      if (r.type === "valueUpdate" && r.source === "external" && p !== d) {
        n.touched = true;
        n.dirty = true;
        n.validatePromise = null;
        n.errors = Ku;
        n.warnings = Ku;
        n.triggerMetaEvent();
      }
      switch (r.type) {
        case "reset":
          if (!t || f) {
            n.touched = false;
            n.dirty = false;
            n.validatePromise = null;
            n.errors = Ku;
            n.warnings = Ku;
            n.triggerMetaEvent();
            if (u !== null && u !== undefined) {
              u();
            }
            n.refresh();
            return;
          }
          break;
        case "remove":
          if (o) {
            n.reRender();
            return;
          }
          break;
        case "setField":
          if (f) {
            var g = r.data;
            if ("touched" in g) {
              n.touched = g.touched;
            }
            if ("validating" in g && !("originRCField" in g)) {
              n.validatePromise = g.validating ? Promise.resolve([]) : null;
            }
            if ("errors" in g) {
              n.errors = g.errors || Ku;
            }
            if ("warnings" in g) {
              n.warnings = g.warnings || Ku;
            }
            n.dirty = true;
            n.triggerMetaEvent();
            n.reRender();
            return;
          }
          if (o && !c.length && Ju(o, e, l, p, d, r)) {
            n.reRender();
            return;
          }
          break;
        case "dependenciesUpdate":
          var m = s.map(_u);
          if (m.some(function (e) {
            return qu(r.relatedFields, e);
          })) {
            n.reRender();
            return;
          }
          break;
        default:
          if (f || (!s.length || c.length || o) && Ju(o, e, l, p, d, r)) {
            n.reRender();
            return;
          }
          break;
      }
      if (o === true) {
        n.reRender();
      }
    };
    n.validateRules = function (e) {
      var t = n.getNamePath();
      var r = n.getValue();
      var i = Promise.resolve().then(function () {
        if (!n.mounted) {
          return [];
        }
        var o = n.props;
        var a = o.validateFirst;
        var s = a !== undefined && a;
        var u = o.messageVariables;
        var l = e || {};
        var c = l.triggerName;
        var p = n.getRules();
        if (c) {
          p = p.filter(function (e) {
            return e;
          }).filter(function (e) {
            var t = e.validateTrigger;
            if (!t) {
              return true;
            }
            var r = yu(t);
            return r.includes(c);
          });
        }
        var d = Hu(t, r, p, e, s, u);
        d.catch(function (e) {
          return e;
        }).then(function (e = Ku) {
          if (n.validatePromise === i) {
            var t;
            n.validatePromise = null;
            var r = [];
            var o = [];
            if ((t = e.forEach) !== null && t !== undefined) {
              t.call(e, function (e) {
                var t = e.rule.warningOnly;
                var n = e.errors;
                var i = n === undefined ? Ku : n;
                if (t) {
                  o.push.apply(o, (0, j.Z)(i));
                } else {
                  r.push.apply(r, (0, j.Z)(i));
                }
              });
            }
            n.errors = r;
            n.warnings = o;
            n.triggerMetaEvent();
            n.reRender();
          }
        });
        return d;
      });
      n.validatePromise = i;
      n.dirty = true;
      n.errors = Ku;
      n.warnings = Ku;
      n.triggerMetaEvent();
      n.reRender();
      return i;
    };
    n.isFieldValidating = function () {
      return !!n.validatePromise;
    };
    n.isFieldTouched = function () {
      return n.touched;
    };
    n.isFieldDirty = function () {
      if (n.dirty || n.props.initialValue !== undefined) {
        return true;
      }
      var e = n.props.fieldContext;
      var t = e.getInternalHooks(fu);
      var r = t.getInitialValue;
      return r(n.getNamePath()) !== undefined;
    };
    n.getErrors = function () {
      return n.errors;
    };
    n.getWarnings = function () {
      return n.warnings;
    };
    n.isListField = function () {
      return n.props.isListField;
    };
    n.isList = function () {
      return n.props.isList;
    };
    n.isPreserve = function () {
      return n.props.preserve;
    };
    n.getMeta = function () {
      n.prevValidating = n.isFieldValidating();
      var e = {
        touched: n.isFieldTouched(),
        validating: n.prevValidating,
        errors: n.errors,
        warnings: n.warnings,
        name: n.getNamePath()
      };
      return e;
    };
    n.getOnlyChild = function (e) {
      if (typeof e === "function") {
        var t = n.getMeta();
        return (0, cu.Z)((0, cu.Z)({}, n.getOnlyChild(e(n.getControlled(), t, n.props.fieldContext))), {}, {
          isFunction: true
        });
      }
      var r = (0, pu.Z)(e);
      if (r.length === 1 && a.isValidElement(r[0])) {
        return {
          child: r[0],
          isFunction: false
        };
      } else {
        return {
          child: r,
          isFunction: false
        };
      }
    };
    n.getValue = function (e) {
      var t = n.props.fieldContext.getFieldsValue;
      var r = n.getNamePath();
      return Ou(e || t(true), r);
    };
    n.getControlled = function (e = {}) {
      var t = n.props;
      var r = t.trigger;
      var i = t.validateTrigger;
      var a = t.getValueFromEvent;
      var s = t.normalize;
      var u = t.valuePropName;
      var l = t.getValueProps;
      var c = t.fieldContext;
      var p = i !== undefined ? i : c.validateTrigger;
      var d = n.getNamePath();
      var f = c.getInternalHooks;
      var g = c.getFieldsValue;
      var m = f(fu);
      var v = m.dispatch;
      var y = n.getValue();
      var h = l || function (e) {
        return (0, o.Z)({}, u, e);
      };
      var b = e[r];
      var w = (0, cu.Z)((0, cu.Z)({}, e), h(y));
      w[r] = function () {
        var e;
        n.touched = true;
        n.dirty = true;
        n.triggerMetaEvent();
        for (var t = arguments.length, r = new Array(t), i = 0; i < t; i++) {
          r[i] = arguments[i];
        }
        e = a ? a.apply(undefined, r) : Lu.apply(undefined, [u].concat(r));
        if (s) {
          e = s(e, y, g(true));
        }
        v({
          type: "updateValue",
          namePath: d,
          value: e
        });
        if (b) {
          b.apply(undefined, r);
        }
      };
      var x = yu(p || []);
      x.forEach(function (e) {
        var t = w[e];
        w[e] = function () {
          if (t) {
            t.apply(undefined, arguments);
          }
          var r = n.props.rules;
          if (r && r.length) {
            v({
              type: "validateField",
              namePath: d,
              triggerName: e
            });
          }
        };
      });
      return w;
    };
    if (e.fieldContext) {
      var i = e.fieldContext.getInternalHooks;
      var s = i(fu);
      var u = s.initEntityValue;
      u((0, I.Z)(n));
    }
    return n;
  }
  (0, P.Z)(r, [{
    key: "componentDidMount",
    value: function () {
      var e = this.props;
      var t = e.shouldUpdate;
      var r = e.fieldContext;
      this.mounted = true;
      if (r) {
        var n = r.getInternalHooks;
        var i = n(fu);
        var o = i.registerField;
        this.cancelRegisterFunc = o(this);
      }
      if (t === true) {
        this.reRender();
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function () {
      this.cancelRegister();
      this.triggerMetaEvent(true);
      this.mounted = false;
    }
  }, {
    key: "reRender",
    value: function () {
      if (this.mounted) {
        this.forceUpdate();
      }
    }
  }, {
    key: "render",
    value: function () {
      var e;
      var t = this.state.resetCount;
      var r = this.props.children;
      var n = this.getOnlyChild(r);
      var i = n.child;
      var o = n.isFunction;
      if (o) {
        e = i;
      } else if (a.isValidElement(i)) {
        e = a.cloneElement(i, this.getControlled(i.props));
      } else {
        (0, du.ZP)(!i, "`children` of Field is not validate ReactElement.");
        e = i;
      }
      return a.createElement(a.Fragment, {
        key: t
      }, e);
    }
  }]);
  return r;
}(a.Component);
function el(e) {
  var t = e.name;
  var r = (0, lu.Z)(e, Gu);
  var n = a.useContext(vu);
  var i = t !== undefined ? _u(t) : undefined;
  var o = "keep";
  if (!r.isListField) {
    o = `_${(i || []).join("_")}`;
  }
  return a.createElement(Xu, (0, uu.Z)({
    key: o,
    name: i
  }, r, {
    fieldContext: n
  }));
}
Xu.contextType = vu;
Xu.defaultProps = {
  trigger: "onChange",
  valuePropName: "value"
};
var tl = el;
var rl = a.createContext(null);
var nl = rl;
function il(e) {
  var t = e.name;
  var r = e.initialValue;
  var n = e.children;
  var i = e.rules;
  var o = e.validateTrigger;
  var s = a.useContext(vu);
  var u = a.useRef({
    keys: [],
    id: 0
  });
  var l = u.current;
  var c = a.useMemo(function () {
    var e = _u(s.prefixName) || [];
    return [].concat((0, j.Z)(e), (0, j.Z)(_u(t)));
  }, [s.prefixName, t]);
  var p = a.useMemo(function () {
    return (0, cu.Z)((0, cu.Z)({}, s), {}, {
      prefixName: c
    });
  }, [s, c]);
  var d = a.useMemo(function () {
    return {
      getKey: function (e) {
        var t = c.length;
        var r = e[t];
        return [l.keys[r], e.slice(t + 1)];
      }
    };
  }, [c]);
  if (typeof n !== "function") {
    (0, du.ZP)(false, "Form.List only accepts function as children.");
    return null;
  }
  function f(e, t, r) {
    var n = r.source;
    return n !== "internal" && e !== t;
  }
  return a.createElement(nl.Provider, {
    value: d
  }, a.createElement(vu.Provider, {
    value: p
  }, a.createElement(tl, {
    name: [],
    shouldUpdate: f,
    rules: i,
    validateTrigger: o,
    initialValue: r,
    isList: true
  }, function (e, t) {
    var r = e.value;
    var i = r === undefined ? [] : r;
    var o = e.onChange;
    var a = s.getFieldValue;
    function u() {
      var e = a(c || []);
      return e || [];
    }
    var p = {
      add: function (e, t) {
        var r = u();
        if (t >= 0 && t <= r.length) {
          l.keys = [].concat((0, j.Z)(l.keys.slice(0, t)), [l.id], (0, j.Z)(l.keys.slice(t)));
          o([].concat((0, j.Z)(r.slice(0, t)), [e], (0, j.Z)(r.slice(t))));
        } else {
          l.keys = [].concat((0, j.Z)(l.keys), [l.id]);
          o([].concat((0, j.Z)(r), [e]));
        }
        l.id += 1;
      },
      remove: function (e) {
        var t = u();
        var r = new Set(Array.isArray(e) ? e : [e]);
        if (!(r.size <= 0)) {
          l.keys = l.keys.filter(function (e, t) {
            return !r.has(t);
          });
          o(t.filter(function (e, t) {
            return !r.has(t);
          }));
        }
      },
      move: function (e, t) {
        if (e !== t) {
          var r = u();
          if (!(e < 0) && !(e >= r.length) && !(t < 0) && !(t >= r.length)) {
            l.keys = Fu(l.keys, e, t);
            o(Fu(r, e, t));
          }
        }
      }
    };
    var d = i || [];
    if (!Array.isArray(d)) {
      d = [];
    }
    return n(d.map(function (e, t) {
      var r = l.keys[t];
      if (r === undefined) {
        l.keys[t] = l.id;
        r = l.keys[t];
        l.id += 1;
      }
      return {
        name: t,
        key: r,
        isListField: true
      };
    }), p, t);
  })));
}
var ol = il;
function al(e) {
  var t = false;
  var r = e.length;
  var n = [];
  if (e.length) {
    return new Promise(function (i, o) {
      e.forEach(function (e, a) {
        e.catch(function (e) {
          t = true;
          return e;
        }).then(function (e) {
          r -= 1;
          n[a] = e;
          if (!(r > 0)) {
            if (t) {
              o(n);
            }
            i(n);
          }
        });
      });
    });
  } else {
    return Promise.resolve([]);
  }
}
var sl = "__@field_split__";
function ul(e) {
  return e.map(function (e) {
    return `${(0, xu.Z)(e)}:${e}`;
  }).join(sl);
}
var ll = function () {
  function e() {
    (0, q.Z)(this, e);
    this.kvs = new Map();
  }
  (0, P.Z)(e, [{
    key: "set",
    value: function (e, t) {
      this.kvs.set(ul(e), t);
    }
  }, {
    key: "get",
    value: function (e) {
      return this.kvs.get(ul(e));
    }
  }, {
    key: "update",
    value: function (e, t) {
      var r = this.get(e);
      var n = t(r);
      if (n) {
        this.set(e, n);
      } else {
        this.delete(e);
      }
    }
  }, {
    key: "delete",
    value: function (e) {
      this.kvs.delete(ul(e));
    }
  }, {
    key: "map",
    value: function (e) {
      return (0, j.Z)(this.kvs.entries()).map(function (t) {
        var r = (0, p.Z)(t, 2);
        var n = r[0];
        var i = r[1];
        var o = n.split(sl);
        return e({
          key: o.map(function (e) {
            var t = e.match(/^([^:]*):(.*)$/);
            var r = (0, p.Z)(t, 3);
            var n = r[1];
            var i = r[2];
            if (n === "number") {
              return Number(i);
            } else {
              return i;
            }
          }),
          value: i
        });
      });
    }
  }, {
    key: "toJSON",
    value: function () {
      var e = {};
      this.map(function (t) {
        var r = t.key;
        var n = t.value;
        e[r.join(".")] = n;
        return null;
      });
      return e;
    }
  }]);
  return e;
}();
var cl = ll;
var pl = ["name", "errors"];
var dl = (0, P.Z)(function e(t) {
  var r = this;
  (0, q.Z)(this, e);
  this.formHooked = false;
  this.forceRootUpdate = undefined;
  this.subscribable = true;
  this.store = {};
  this.fieldEntities = [];
  this.initialValues = {};
  this.callbacks = {};
  this.validateMessages = null;
  this.preserve = null;
  this.lastValidatePromise = null;
  this.getForm = function () {
    return {
      getFieldValue: r.getFieldValue,
      getFieldsValue: r.getFieldsValue,
      getFieldError: r.getFieldError,
      getFieldWarning: r.getFieldWarning,
      getFieldsError: r.getFieldsError,
      isFieldsTouched: r.isFieldsTouched,
      isFieldTouched: r.isFieldTouched,
      isFieldValidating: r.isFieldValidating,
      isFieldsValidating: r.isFieldsValidating,
      resetFields: r.resetFields,
      setFields: r.setFields,
      setFieldValue: r.setFieldValue,
      setFieldsValue: r.setFieldsValue,
      validateFields: r.validateFields,
      submit: r.submit,
      _init: true,
      getInternalHooks: r.getInternalHooks
    };
  };
  this.getInternalHooks = function (e) {
    if (e === fu) {
      r.formHooked = true;
      return {
        dispatch: r.dispatch,
        initEntityValue: r.initEntityValue,
        registerField: r.registerField,
        useSubscribe: r.useSubscribe,
        setInitialValues: r.setInitialValues,
        destroyForm: r.destroyForm,
        setCallbacks: r.setCallbacks,
        setValidateMessages: r.setValidateMessages,
        getFields: r.getFields,
        setPreserve: r.setPreserve,
        getInitialValue: r.getInitialValue,
        registerWatch: r.registerWatch
      };
    } else {
      (0, du.ZP)(false, "`getInternalHooks` is internal usage. Should not call directly.");
      return null;
    }
  };
  this.useSubscribe = function (e) {
    r.subscribable = e;
  };
  this.prevWithoutPreserves = null;
  this.setInitialValues = function (e, t) {
    r.initialValues = e || {};
    if (t) {
      var n;
      var i = Iu({}, e, r.store);
      if ((n = r.prevWithoutPreserves) !== null && n !== undefined) {
        n.map(function (t) {
          var r = t.key;
          i = Mu(i, r, Ou(e, r));
        });
      }
      r.prevWithoutPreserves = null;
      r.updateStore(i);
    }
  };
  this.destroyForm = function () {
    var e = new cl();
    r.getFieldEntities(true).forEach(function (t) {
      if (!r.isMergedPreserve(t.isPreserve())) {
        e.set(t.getNamePath(), true);
      }
    });
    r.prevWithoutPreserves = e;
  };
  this.getInitialValue = function (e) {
    var t = Ou(r.initialValues, e);
    if (e.length) {
      return Au(t);
    } else {
      return t;
    }
  };
  this.setCallbacks = function (e) {
    r.callbacks = e;
  };
  this.setValidateMessages = function (e) {
    r.validateMessages = e;
  };
  this.setPreserve = function (e) {
    r.preserve = e;
  };
  this.watchList = [];
  this.registerWatch = function (e) {
    r.watchList.push(e);
    return function () {
      r.watchList = r.watchList.filter(function (t) {
        return t !== e;
      });
    };
  };
  this.notifyWatch = function (e = []) {
    if (r.watchList.length) {
      var t = r.getFieldsValue();
      r.watchList.forEach(function (r) {
        r(t, e);
      });
    }
  };
  this.timeoutId = null;
  this.warningUnhooked = function () {
    0;
  };
  this.updateStore = function (e) {
    r.store = e;
  };
  this.getFieldEntities = function (e = false) {
    if (e) {
      return r.fieldEntities.filter(function (e) {
        return e.getNamePath().length;
      });
    } else {
      return r.fieldEntities;
    }
  };
  this.getFieldsMap = function (e = false) {
    var t = new cl();
    r.getFieldEntities(e).forEach(function (e) {
      var r = e.getNamePath();
      t.set(r, e);
    });
    return t;
  };
  this.getFieldEntitiesForNamePathList = function (e) {
    if (!e) {
      return r.getFieldEntities(true);
    }
    var t = r.getFieldsMap(true);
    return e.map(function (e) {
      var r = _u(e);
      return t.get(r) || {
        INVALIDATE_NAME_PATH: _u(e)
      };
    });
  };
  this.getFieldsValue = function (e, t) {
    r.warningUnhooked();
    if (e === true && !t) {
      return r.store;
    }
    var n = r.getFieldEntitiesForNamePathList(Array.isArray(e) ? e : null);
    var i = [];
    n.forEach(function (r) {
      var n;
      var o = "INVALIDATE_NAME_PATH" in r ? r.INVALIDATE_NAME_PATH : r.getNamePath();
      if (e || !((n = r.isListField) === null || n === undefined ? undefined : n.call(r))) {
        if (t) {
          var a = "getMeta" in r ? r.getMeta() : null;
          if (t(a)) {
            i.push(o);
          }
        } else {
          i.push(o);
        }
      }
    });
    return Pu(r.store, i.map(_u));
  };
  this.getFieldValue = function (e) {
    r.warningUnhooked();
    var t = _u(e);
    return Ou(r.store, t);
  };
  this.getFieldsError = function (e) {
    r.warningUnhooked();
    var t = r.getFieldEntitiesForNamePathList(e);
    return t.map(function (t, r) {
      if (t && !("INVALIDATE_NAME_PATH" in t)) {
        return {
          name: t.getNamePath(),
          errors: t.getErrors(),
          warnings: t.getWarnings()
        };
      } else {
        return {
          name: _u(e[r]),
          errors: [],
          warnings: []
        };
      }
    });
  };
  this.getFieldError = function (e) {
    r.warningUnhooked();
    var t = _u(e);
    var n = r.getFieldsError([t])[0];
    return n.errors;
  };
  this.getFieldWarning = function (e) {
    r.warningUnhooked();
    var t = _u(e);
    var n = r.getFieldsError([t])[0];
    return n.warnings;
  };
  this.isFieldsTouched = function () {
    r.warningUnhooked();
    for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
      t[n] = arguments[n];
    }
    var i;
    var o = t[0];
    var a = t[1];
    var s = false;
    if (t.length === 0) {
      i = null;
    } else if (t.length === 1) {
      if (Array.isArray(o)) {
        i = o.map(_u);
        s = false;
      } else {
        i = null;
        s = o;
      }
    } else {
      i = o.map(_u);
      s = a;
    }
    var u = r.getFieldEntities(true);
    function l(e) {
      return e.isFieldTouched();
    }
    if (!i) {
      if (s) {
        return u.every(l);
      } else {
        return u.some(l);
      }
    }
    var c = new cl();
    i.forEach(function (e) {
      c.set(e, []);
    });
    u.forEach(function (e) {
      var t = e.getNamePath();
      i.forEach(function (r) {
        if (r.every(function (e, r) {
          return t[r] === e;
        })) {
          c.update(r, function (t) {
            return [].concat((0, j.Z)(t), [e]);
          });
        }
      });
    });
    function p(e) {
      return e.some(l);
    }
    var d = c.map(function (e) {
      var t = e.value;
      return t;
    });
    if (s) {
      return d.every(p);
    } else {
      return d.some(p);
    }
  };
  this.isFieldTouched = function (e) {
    r.warningUnhooked();
    return r.isFieldsTouched([e]);
  };
  this.isFieldsValidating = function (e) {
    r.warningUnhooked();
    var t = r.getFieldEntities();
    if (!e) {
      return t.some(function (e) {
        return e.isFieldValidating();
      });
    }
    var n = e.map(_u);
    return t.some(function (e) {
      var t = e.getNamePath();
      return qu(n, t) && e.isFieldValidating();
    });
  };
  this.isFieldValidating = function (e) {
    r.warningUnhooked();
    return r.isFieldsValidating([e]);
  };
  this.resetWithFieldInitialValue = function (e = {}) {
    var t = new cl();
    var n = r.getFieldEntities(true);
    n.forEach(function (e) {
      var r = e.props.initialValue;
      var n = e.getNamePath();
      if (r !== undefined) {
        var i = t.get(n) || new Set();
        i.add({
          entity: e,
          value: r
        });
        t.set(n, i);
      }
    });
    var i;
    function o(n) {
      n.forEach(function (n) {
        var i = n.props.initialValue;
        if (i !== undefined) {
          var o = n.getNamePath();
          var a = r.getInitialValue(o);
          if (a !== undefined) {
            (0, du.ZP)(false, `Form already set 'initialValues' with path '${o.join(".")}'. Field can not overwrite it.`);
          } else {
            var s = t.get(o);
            if (s && s.size > 1) {
              (0, du.ZP)(false, `Multiple Field with path '${o.join(".")}' set 'initialValue'. Can not decide which one to pick.`);
            } else if (s) {
              var u = r.getFieldValue(o);
              if (!e.skipExist || u === undefined) {
                r.updateStore(Mu(r.store, o, (0, j.Z)(s)[0].value));
              }
            }
          }
        }
      });
    }
    if (e.entities) {
      i = e.entities;
    } else if (e.namePathList) {
      i = [];
      e.namePathList.forEach(function (e) {
        var r;
        var n = t.get(e);
        if (n) {
          (r = i).push.apply(r, (0, j.Z)((0, j.Z)(n).map(function (e) {
            return e.entity;
          })));
        }
      });
    } else {
      i = n;
    }
    o(i);
  };
  this.resetFields = function (e) {
    r.warningUnhooked();
    var t = r.store;
    if (!e) {
      r.updateStore(Iu({}, r.initialValues));
      r.resetWithFieldInitialValue();
      r.notifyObservers(t, null, {
        type: "reset"
      });
      r.notifyWatch();
      return;
    }
    var n = e.map(_u);
    n.forEach(function (e) {
      var t = r.getInitialValue(e);
      r.updateStore(Mu(r.store, e, t));
    });
    r.resetWithFieldInitialValue({
      namePathList: n
    });
    r.notifyObservers(t, n, {
      type: "reset"
    });
    r.notifyWatch(n);
  };
  this.setFields = function (e) {
    r.warningUnhooked();
    var t = r.store;
    var n = [];
    e.forEach(function (e) {
      var i = e.name;
      e.errors;
      var o = (0, lu.Z)(e, pl);
      var a = _u(i);
      n.push(a);
      if ("value" in o) {
        r.updateStore(Mu(r.store, a, o.value));
      }
      r.notifyObservers(t, [a], {
        type: "setField",
        data: e
      });
    });
    r.notifyWatch(n);
  };
  this.getFields = function () {
    var e = r.getFieldEntities(true);
    var t = e.map(function (e) {
      var t = e.getNamePath();
      var n = e.getMeta();
      var i = (0, cu.Z)((0, cu.Z)({}, n), {}, {
        name: t,
        value: r.getFieldValue(t)
      });
      Object.defineProperty(i, "originRCField", {
        value: true
      });
      return i;
    });
    return t;
  };
  this.initEntityValue = function (e) {
    var t = e.props.initialValue;
    if (t !== undefined) {
      var n = e.getNamePath();
      var i = Ou(r.store, n);
      if (i === undefined) {
        r.updateStore(Mu(r.store, n, t));
      }
    }
  };
  this.isMergedPreserve = function (e) {
    var t = e !== undefined ? e : r.preserve;
    return t === null || t === undefined || t;
  };
  this.registerField = function (e) {
    r.fieldEntities.push(e);
    var t = e.getNamePath();
    r.notifyWatch([t]);
    if (e.props.initialValue !== undefined) {
      var n = r.store;
      r.resetWithFieldInitialValue({
        entities: [e],
        skipExist: true
      });
      r.notifyObservers(n, [e.getNamePath()], {
        type: "valueUpdate",
        source: "internal"
      });
    }
    return function (n, i, o = []) {
      r.fieldEntities = r.fieldEntities.filter(function (t) {
        return t !== e;
      });
      if (!r.isMergedPreserve(i) && (!n || o.length > 1)) {
        var a = n ? undefined : r.getInitialValue(t);
        if (t.length && r.getFieldValue(t) !== a && r.fieldEntities.every(function (e) {
          return !ju(e.getNamePath(), t);
        })) {
          var s = r.store;
          r.updateStore(Mu(s, t, a, true));
          r.notifyObservers(s, [t], {
            type: "remove"
          });
          r.triggerDependenciesUpdate(s, t);
        }
      }
      r.notifyWatch([t]);
    };
  };
  this.dispatch = function (e) {
    switch (e.type) {
      case "updateValue":
        var t = e.namePath;
        var n = e.value;
        r.updateValue(t, n);
        break;
      case "validateField":
        var i = e.namePath;
        var o = e.triggerName;
        r.validateFields([i], {
          triggerName: o
        });
        break;
      default:
    }
  };
  this.notifyObservers = function (e, t, n) {
    if (r.subscribable) {
      var i = (0, cu.Z)((0, cu.Z)({}, n), {}, {
        store: r.getFieldsValue(true)
      });
      r.getFieldEntities().forEach(function (r) {
        var n = r.onStoreChange;
        n(e, t, i);
      });
    } else {
      r.forceRootUpdate();
    }
  };
  this.triggerDependenciesUpdate = function (e, t) {
    var n = r.getDependencyChildrenFields(t);
    if (n.length) {
      r.validateFields(n);
    }
    r.notifyObservers(e, n, {
      type: "dependenciesUpdate",
      relatedFields: [t].concat((0, j.Z)(n))
    });
    return n;
  };
  this.updateValue = function (e, t) {
    var n = _u(e);
    var i = r.store;
    r.updateStore(Mu(r.store, n, t));
    r.notifyObservers(i, [n], {
      type: "valueUpdate",
      source: "internal"
    });
    r.notifyWatch([n]);
    var o = r.triggerDependenciesUpdate(i, n);
    var a = r.callbacks.onValuesChange;
    if (a) {
      var s = Pu(r.store, [n]);
      a(s, r.getFieldsValue());
    }
    r.triggerOnFieldsChange([n].concat((0, j.Z)(o)));
  };
  this.setFieldsValue = function (e) {
    r.warningUnhooked();
    var t = r.store;
    if (e) {
      var n = Iu(r.store, e);
      r.updateStore(n);
    }
    r.notifyObservers(t, null, {
      type: "valueUpdate",
      source: "external"
    });
    r.notifyWatch();
  };
  this.setFieldValue = function (e, t) {
    r.setFields([{
      name: e,
      value: t
    }]);
  };
  this.getDependencyChildrenFields = function (e) {
    var t = new Set();
    var n = [];
    var i = new cl();
    r.getFieldEntities().forEach(function (e) {
      var t = e.props.dependencies;
      (t || []).forEach(function (t) {
        var r = _u(t);
        i.update(r, function (t = new Set()) {
          t.add(e);
          return t;
        });
      });
    });
    var o = function e(r) {
      var o = i.get(r) || new Set();
      o.forEach(function (r) {
        if (!t.has(r)) {
          t.add(r);
          var i = r.getNamePath();
          if (r.isFieldDirty() && i.length) {
            n.push(i);
            e(i);
          }
        }
      });
    };
    o(e);
    return n;
  };
  this.triggerOnFieldsChange = function (e, t) {
    var n = r.callbacks.onFieldsChange;
    if (n) {
      var i = r.getFields();
      if (t) {
        var o = new cl();
        t.forEach(function (e) {
          var t = e.name;
          var r = e.errors;
          o.set(t, r);
        });
        i.forEach(function (e) {
          e.errors = o.get(e.name) || e.errors;
        });
      }
      var a = i.filter(function (t) {
        var r = t.name;
        return qu(e, r);
      });
      n(a, i);
    }
  };
  this.validateFields = function (e, t) {
    r.warningUnhooked();
    var n = !!e;
    var i = n ? e.map(_u) : [];
    var o = [];
    r.getFieldEntities(true).forEach(function (a) {
      if (!n) {
        i.push(a.getNamePath());
      }
      if (t?.recursive && n) {
        var s = a.getNamePath();
        if (s.every(function (t, r) {
          return e[r] === t || e[r] === undefined;
        })) {
          i.push(s);
        }
      }
      if (a.props.rules && a.props.rules.length) {
        var u = a.getNamePath();
        if (!n || qu(i, u)) {
          var l = a.validateRules((0, cu.Z)({
            validateMessages: (0, cu.Z)((0, cu.Z)({}, wu), r.validateMessages)
          }, t));
          o.push(l.then(function () {
            return {
              name: u,
              errors: [],
              warnings: []
            };
          }).catch(function (e) {
            var t;
            var r = [];
            var n = [];
            if ((t = e.forEach) !== null && t !== undefined) {
              t.call(e, function (e) {
                var t = e.rule.warningOnly;
                var i = e.errors;
                if (t) {
                  n.push.apply(n, (0, j.Z)(i));
                } else {
                  r.push.apply(r, (0, j.Z)(i));
                }
              });
            }
            if (r.length) {
              return Promise.reject({
                name: u,
                errors: r,
                warnings: n
              });
            } else {
              return {
                name: u,
                errors: r,
                warnings: n
              };
            }
          }));
        }
      }
    });
    var a = al(o);
    r.lastValidatePromise = a;
    a.catch(function (e) {
      return e;
    }).then(function (e) {
      var t = e.map(function (e) {
        var t = e.name;
        return t;
      });
      r.notifyObservers(r.store, t, {
        type: "validateFinish"
      });
      r.triggerOnFieldsChange(t, e);
    });
    var s = a.then(function () {
      if (r.lastValidatePromise === a) {
        return Promise.resolve(r.getFieldsValue(i));
      } else {
        return Promise.reject([]);
      }
    }).catch(function (e) {
      var t = e.filter(function (e) {
        return e && e.errors.length;
      });
      return Promise.reject({
        values: r.getFieldsValue(i),
        errorFields: t,
        outOfDate: r.lastValidatePromise !== a
      });
    });
    s.catch(function (e) {
      return e;
    });
    return s;
  };
  this.submit = function () {
    r.warningUnhooked();
    r.validateFields().then(function (e) {
      var t = r.callbacks.onFinish;
      if (t) {
        try {
          t(e);
        } catch (n) {
          console.error(n);
        }
      }
    }).catch(function (e) {
      var t = r.callbacks.onFinishFailed;
      if (t) {
        t(e);
      }
    });
  };
  this.forceRootUpdate = t;
});
function fl(e) {
  var t = a.useRef();
  var r = a.useState({});
  var n = (0, p.Z)(r, 2);
  var i = n[1];
  if (!t.current) {
    if (e) {
      t.current = e;
    } else {
      function o() {
        i({});
      }
      var s = new dl(o);
      t.current = s.getForm();
    }
  }
  return [t.current];
}
var gl = fl;
var ml = a.createContext({
  triggerFormChange: function () {},
  triggerFormFinish: function () {},
  registerForm: function () {},
  unregisterForm: function () {}
});
function vl(e) {
  var t = e.validateMessages;
  var r = e.onFormChange;
  var n = e.onFormFinish;
  var i = e.children;
  var s = a.useContext(ml);
  var u = a.useRef({});
  return a.createElement(ml.Provider, {
    value: (0, cu.Z)((0, cu.Z)({}, s), {}, {
      validateMessages: (0, cu.Z)((0, cu.Z)({}, s.validateMessages), t),
      triggerFormChange: function (e, t) {
        if (r) {
          r(e, {
            changedFields: t,
            forms: u.current
          });
        }
        s.triggerFormChange(e, t);
      },
      triggerFormFinish: function (e, t) {
        if (n) {
          n(e, {
            values: t,
            forms: u.current
          });
        }
        s.triggerFormFinish(e, t);
      },
      registerForm: function (e, t) {
        if (e) {
          u.current = (0, cu.Z)((0, cu.Z)({}, u.current), {}, (0, o.Z)({}, e, t));
        }
        s.registerForm(e, t);
      },
      unregisterForm: function (e) {
        var t = (0, cu.Z)({}, u.current);
        delete t[e];
        u.current = t;
        s.unregisterForm(e);
      }
    })
  }, i);
}
var yl = ml;
var hl = ["name", "initialValues", "fields", "form", "preserve", "children", "component", "validateMessages", "validateTrigger", "onValuesChange", "onFieldsChange", "onFinish", "onFinishFailed"];
function bl(e, t) {
  var r = e.name;
  var n = e.initialValues;
  var i = e.fields;
  var o = e.form;
  var s = e.preserve;
  var u = e.children;
  var l = e.component;
  var c = l === undefined ? "form" : l;
  var d = e.validateMessages;
  var f = e.validateTrigger;
  var g = f === undefined ? "onChange" : f;
  var m = e.onValuesChange;
  var v = e.onFieldsChange;
  var y = e.onFinish;
  var h = e.onFinishFailed;
  var b = (0, lu.Z)(e, hl);
  var w = a.useContext(yl);
  var x = gl(o);
  var E = (0, p.Z)(x, 1);
  var k = E[0];
  var S = k.getInternalHooks(fu);
  var T = S.useSubscribe;
  var C = S.setInitialValues;
  var A = S.setCallbacks;
  var _ = S.setValidateMessages;
  var O = S.setPreserve;
  var M = S.destroyForm;
  a.useImperativeHandle(t, function () {
    return k;
  });
  a.useEffect(function () {
    w.registerForm(r, k);
    return function () {
      w.unregisterForm(r);
    };
  }, [w, k, r]);
  _((0, cu.Z)((0, cu.Z)({}, w.validateMessages), d));
  A({
    onValuesChange: m,
    onFieldsChange: function (e) {
      w.triggerFormChange(r, e);
      if (v) {
        for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++) {
          n[i - 1] = arguments[i];
        }
        v.apply(undefined, [e].concat(n));
      }
    },
    onFinish: function (e) {
      w.triggerFormFinish(r, e);
      if (y) {
        y(e);
      }
    },
    onFinishFailed: h
  });
  O(s);
  var P;
  var q = a.useRef(null);
  C(n, !q.current);
  q.current ||= true;
  a.useEffect(function () {
    return M;
  }, []);
  var N = typeof u === "function";
  if (N) {
    var R = k.getFieldsValue(true);
    P = u(R, k);
  } else {
    P = u;
  }
  T(!N);
  var I = a.useRef();
  a.useEffect(function () {
    if (!Du(I.current || [], i || [])) {
      k.setFields(i || []);
    }
    I.current = i;
  }, [i, k]);
  var j = a.useMemo(function () {
    return (0, cu.Z)((0, cu.Z)({}, k), {}, {
      validateTrigger: g
    });
  }, [k, g]);
  var D = a.createElement(vu.Provider, {
    value: j
  }, P);
  if (c === false) {
    return D;
  } else {
    return a.createElement(c, (0, uu.Z)({}, b, {
      onSubmit: function (e) {
        e.preventDefault();
        e.stopPropagation();
        k.submit();
      },
      onReset: function (e) {
        var t;
        e.preventDefault();
        k.resetFields();
        if ((t = b.onReset) !== null && t !== undefined) {
          t.call(b, e);
        }
      }
    }), D);
  }
}
var wl = bl;
function xl(e) {
  try {
    return JSON.stringify(e);
  } catch (t) {
    return Math.random();
  }
}
function El() {}
function kl() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
    t[r] = arguments[r];
  }
  var n = t[0];
  var i = n === undefined ? [] : n;
  var o = t[1];
  var s = (0, a.useState)();
  var u = (0, p.Z)(s, 2);
  var l = u[0];
  var c = u[1];
  var d = (0, a.useMemo)(function () {
    return xl(l);
  }, [l]);
  var f = (0, a.useRef)(d);
  f.current = d;
  var g = (0, a.useContext)(vu);
  var m = o || g;
  var v = m && m._init;
  var y = _u(i);
  var h = (0, a.useRef)(y);
  h.current = y;
  El(y);
  (0, a.useEffect)(function () {
    if (v) {
      var e = m.getFieldsValue;
      var t = m.getInternalHooks;
      var r = t(fu);
      var n = r.registerWatch;
      var i = n(function (e) {
        var t = Ou(e, h.current);
        var r = xl(t);
        if (f.current !== r) {
          f.current = r;
          c(t);
        }
      });
      var o = Ou(e(), h.current);
      c(o);
      return i;
    }
  }, [v]);
  return l;
}
var Sl = kl;
var Tl = a.forwardRef(wl);
var Cl = Tl;
Cl.FormProvider = vl;
Cl.Field = tl;
Cl.List = ol;
Cl.useForm = gl;
Cl.useWatch = Sl;
var Al = Cl;
var _l = {
  name: undefined,
  hasFeedback: true,
  layout: "vertical",
  requiredMarkStyle: "asterisk",
  disabled: false
};
var Ol = a.createContext(_l);
var Ml = a.createContext(null);
function Pl() {
  return null;
}
var ql = require("./12454.js");
var Nl = ql;
function Rl(e) {
  return a.createElement(ol, {
    name: e.name,
    initialValue: e.initialValue
  }, function (t, r) {
    var n = t.map(function (e) {
      return {
        index: e.name,
        key: e.key
      };
    });
    var i = e.children(n, r).map(function (t, i) {
      var o;
      return a.createElement(su, {
        key: n[i].key,
        mode: "card",
        header: (o = e.renderHeader) === null || o === undefined ? undefined : o.call(e, n[i], r)
      }, t);
    });
    if (e.renderAdd) {
      i.push(a.createElement(su, {
        key: "add",
        mode: "card"
      }, a.createElement(su.Item, {
        className: "adm-form-list-operation",
        onClick: function () {
          if (e.onAdd) {
            e.onAdd(r);
          } else {
            r.add();
          }
        },
        arrow: false
      }, e.renderAdd())));
    }
    return a.createElement(a.Fragment, null, i);
  });
}
var Il = require("./61357.js");
function jl(e, t) {
  var r = 0;
  function n(e) {
    a.Children.forEach(e, function (e) {
      if ((0, Il.isFragment)(e)) {
        n(e.props.children);
      } else {
        t(e, r);
        r += 1;
      }
    });
  }
  n(e);
}
var Dl = "adm-form";
var Ll = _l;
var Fl = (0, a.forwardRef)(function (e, t) {
  var r = c(Ll, e);
  var n = r.className;
  var i = r.style;
  var o = r.hasFeedback;
  r.children;
  var s = r.layout;
  var l = r.footer;
  var p = r.mode;
  var d = r.disabled;
  var f = r.requiredMarkStyle;
  var g = (0, Ta._T)(r, ["className", "style", "hasFeedback", "children", "layout", "footer", "mode", "disabled", "requiredMarkStyle"]);
  var m = Ti();
  var v = m.locale;
  var y = (0, a.useMemo)(function () {
    return Nl(v.Form.defaultValidateMessages, g.validateMessages || {});
  }, [v.Form.defaultValidateMessages, g.validateMessages]);
  var h = [];
  var b = null;
  var w = [];
  var x = 0;
  function E() {
    if (w.length !== 0) {
      x += 1;
      h.push(a.createElement(su, {
        header: b,
        key: x,
        mode: p
      }, w));
      w = [];
    }
  }
  jl(r.children, function (e) {
    if (a.isValidElement(e)) {
      if (e.type === Pl) {
        E();
        b = e.props.children;
        return;
      }
      if (e.type === Rl) {
        E();
        h.push(e);
        return;
      }
    }
    w.push(e);
  });
  E();
  return a.createElement(Al, Object.assign({
    className: u(Dl, n),
    style: i,
    ref: t
  }, g, {
    validateMessages: y
  }), a.createElement(Ol.Provider, {
    value: {
      name: g.name,
      hasFeedback: o,
      layout: s,
      requiredMarkStyle: f,
      disabled: d
    }
  }, h), l && a.createElement("div", {
    className: `${Dl}-footer`
  }, l));
});
var Zl = require("./48156.js");
var zl = false;
function Ul(e, t) {
  if (zl) {
    console.warn(`[antd-mobile: ${e}] ${t}`);
  }
}
function Bl(e, t) {
  if (zl) {
    console.error(`[antd-mobile: ${e}] ${t}`);
  }
}
function Vl(e) {
  if (e === undefined || e === false) {
    return [];
  } else if (Array.isArray(e)) {
    return e;
  } else {
    return [e];
  }
}
function Hl(e) {
  var t = e.prototype;
  return !!t && !!t.isReactComponent;
}
function Wl(e) {
  return typeof e === "function" && !Hl(e) && e.defaultProps === undefined;
}
function Yl(e) {
  return !(0, Il.isFragment)(e) && ((0, Il.isMemo)(e) ? Yl(e.type) : !Wl(e.type));
}
require("./50010.js");
require("./61530.js");
function Ql() {
  var e = (0, Ta.CR)((0, a.useState)({}), 2);
  var t = e[1];
  return (0, a.useCallback)(function () {
    return t({});
  }, []);
}
var $l = Ql;
function Gl(e) {
  if (gs) {
    if (!ls(e)) {
      console.error(`useMemoizedFn expected parameter is a function, got ${typeof e}`);
    }
  }
  var t = (0, a.useRef)(e);
  t.current = (0, a.useMemo)(function () {
    return e;
  }, [e]);
  var r = (0, a.useRef)();
  r.current ||= function () {
    var e = [];
    for (var r = 0; r < arguments.length; r++) {
      e[r] = arguments[r];
    }
    return t.current.apply(this, e);
  };
  return r.current;
}
var Kl = Gl;
function Jl(e) {
  var t = e.value;
  var r = e.defaultValue;
  var n = e.onChange;
  var i = $l();
  var o = (0, a.useRef)(t !== undefined ? t : r);
  if (t !== undefined) {
    o.current = t;
  }
  var s = Kl(function (e, t = false) {
    var r = typeof e === "function" ? e(o.current) : e;
    if (t || r !== o.current) {
      o.current = r;
      i();
      if (n === null || n === undefined) {
        return undefined;
      } else {
        return n(r);
      }
    }
  });
  return [o.current, s];
}
var Xl = (0, a.memo)(function (e) {
  return l(e, a.createElement("svg", {
    viewBox: "0 0 30 16"
  }, a.createElement("g", {
    fill: "currentColor"
  }, a.createElement("path", {
    d: "M0,0 L30,0 L18.07289,14.312538 C16.65863,16.009645 14.13637,16.238942 12.43926,14.824685 C12.25341,14.669808 12.08199,14.49839 11.92711,14.312538 L0,0 L0,0 Z"
  }))));
});
const ec = ["top", "right", "bottom", "left"];
const tc = Math.min;
const rc = Math.max;
const nc = Math.round;
const ic = Math.floor;
const oc = e => ({
  x: e,
  y: e
});
const ac = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
const sc = {
  start: "end",
  end: "start"
};
function uc(e, t, r) {
  return rc(e, tc(t, r));
}
function lc(e, t) {
  if (typeof e === "function") {
    return e(t);
  } else {
    return e;
  }
}
function cc(e) {
  return e.split("-")[0];
}
function pc(e) {
  return e.split("-")[1];
}
function dc(e) {
  if (e === "x") {
    return "y";
  } else {
    return "x";
  }
}
function fc(e) {
  if (e === "y") {
    return "height";
  } else {
    return "width";
  }
}
function gc(e) {
  if (["top", "bottom"].includes(cc(e))) {
    return "y";
  } else {
    return "x";
  }
}
function mc(e) {
  return dc(gc(e));
}
function vc(e, t, r = false) {
  const n = pc(e);
  const i = mc(e);
  const o = fc(i);
  let a = i === "x" ? n === (r ? "end" : "start") ? "right" : "left" : n === "start" ? "bottom" : "top";
  if (t.reference[o] > t.floating[o]) {
    a = xc(a);
  }
  return [a, xc(a)];
}
function yc(e) {
  const t = xc(e);
  return [hc(e), t, hc(t)];
}
function hc(e) {
  return e.replace(/start|end/g, e => sc[e]);
}
function bc(e, t, r) {
  const n = ["left", "right"];
  const i = ["right", "left"];
  const o = ["top", "bottom"];
  const a = ["bottom", "top"];
  switch (e) {
    case "top":
    case "bottom":
      if (r) {
        if (t) {
          return i;
        } else {
          return n;
        }
      } else if (t) {
        return n;
      } else {
        return i;
      }
    case "left":
    case "right":
      if (t) {
        return o;
      } else {
        return a;
      }
    default:
      return [];
  }
}
function wc(e, t, r, n) {
  const i = pc(e);
  let o = bc(cc(e), r === "start", n);
  if (i) {
    o = o.map(e => e + "-" + i);
    if (t) {
      o = o.concat(o.map(hc));
    }
  }
  return o;
}
function xc(e) {
  return e.replace(/left|right|bottom|top/g, e => ac[e]);
}
function Ec(e) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...e
  };
}
function kc(e) {
  if (typeof e !== "number") {
    return Ec(e);
  } else {
    return {
      top: e,
      right: e,
      bottom: e,
      left: e
    };
  }
}
function Sc(e) {
  return {
    ...e,
    top: e.y,
    left: e.x,
    right: e.x + e.width,
    bottom: e.y + e.height
  };
}
function Tc(e, t, r) {
  let {
    reference: n,
    floating: i
  } = e;
  const o = gc(t);
  const a = mc(t);
  const s = fc(a);
  const u = cc(t);
  const l = o === "y";
  const c = n.x + n.width / 2 - i.width / 2;
  const p = n.y + n.height / 2 - i.height / 2;
  const d = n[s] / 2 - i[s] / 2;
  let f;
  switch (u) {
    case "top":
      f = {
        x: c,
        y: n.y - i.height
      };
      break;
    case "bottom":
      f = {
        x: c,
        y: n.y + n.height
      };
      break;
    case "right":
      f = {
        x: n.x + n.width,
        y: p
      };
      break;
    case "left":
      f = {
        x: n.x - i.width,
        y: p
      };
      break;
    default:
      f = {
        x: n.x,
        y: n.y
      };
  }
  switch (pc(t)) {
    case "start":
      f[a] -= d * (r && l ? -1 : 1);
      break;
    case "end":
      f[a] += d * (r && l ? -1 : 1);
      break;
  }
  return f;
}
const Cc = async (e, t, r) => {
  const {
    placement: n = "bottom",
    strategy: i = "absolute",
    middleware: o = [],
    platform: a
  } = r;
  const s = o.filter(Boolean);
  const u = await (a.isRTL == null ? undefined : a.isRTL(t));
  let l = await a.getElementRects({
    reference: e,
    floating: t,
    strategy: i
  });
  let {
    x: c,
    y: p
  } = Tc(l, n, u);
  let d = n;
  let f = {};
  let g = 0;
  for (let m = 0; m < s.length; m++) {
    const {
      name: r,
      fn: o
    } = s[m];
    const {
      x: v,
      y: y,
      data: h,
      reset: b
    } = await o({
      x: c,
      y: p,
      initialPlacement: n,
      placement: d,
      strategy: i,
      middlewareData: f,
      rects: l,
      platform: a,
      elements: {
        reference: e,
        floating: t
      }
    });
    c = v ?? c;
    p = y ?? p;
    f = {
      ...f,
      [r]: {
        ...f[r],
        ...h
      }
    };
    if (b && g <= 50) {
      g++;
      if (typeof b === "object") {
        if (b.placement) {
          d = b.placement;
        }
        if (b.rects) {
          l = b.rects === true ? await a.getElementRects({
            reference: e,
            floating: t,
            strategy: i
          }) : b.rects;
        }
        ({
          x: c,
          y: p
        } = Tc(l, d, u));
      }
      m = -1;
    }
  }
  return {
    x: c,
    y: p,
    placement: d,
    strategy: i,
    middlewareData: f
  };
};
async function Ac(e, t) {
  var r;
  if (t === undefined) {
    t = {};
  }
  const {
    x: n,
    y: i,
    platform: o,
    rects: a,
    elements: s,
    strategy: u
  } = e;
  const {
    boundary: l = "clippingAncestors",
    rootBoundary: c = "viewport",
    elementContext: p = "floating",
    altBoundary: d = false,
    padding: f = 0
  } = lc(t, e);
  const g = kc(f);
  const m = p === "floating" ? "reference" : "floating";
  const v = s[d ? m : p];
  const y = Sc(await o.getClippingRect({
    element: (r = await (o.isElement == null ? undefined : o.isElement(v))) == null || r ? v : v.contextElement || (await (o.getDocumentElement == null ? undefined : o.getDocumentElement(s.floating))),
    boundary: l,
    rootBoundary: c,
    strategy: u
  }));
  const h = p === "floating" ? {
    ...a.floating,
    x: n,
    y: i
  } : a.reference;
  const b = await (o.getOffsetParent == null ? undefined : o.getOffsetParent(s.floating));
  const w = (await (o.isElement == null ? undefined : o.isElement(b))) && (await (o.getScale == null ? undefined : o.getScale(b))) || {
    x: 1,
    y: 1
  };
  const x = Sc(o.convertOffsetParentRelativeRectToViewportRelativeRect ? await o.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements: s,
    rect: h,
    offsetParent: b,
    strategy: u
  }) : h);
  return {
    top: (y.top - x.top + g.top) / w.y,
    bottom: (x.bottom - y.bottom + g.bottom) / w.y,
    left: (y.left - x.left + g.left) / w.x,
    right: (x.right - y.right + g.right) / w.x
  };
}
const _c = e => ({
  name: "arrow",
  options: e,
  async fn(t) {
    const {
      x: r,
      y: n,
      placement: i,
      rects: o,
      platform: a,
      elements: s,
      middlewareData: u
    } = t;
    const {
      element: l,
      padding: c = 0
    } = lc(e, t) || {};
    if (l == null) {
      return {};
    }
    const p = kc(c);
    const d = {
      x: r,
      y: n
    };
    const f = mc(i);
    const g = fc(f);
    const m = await a.getDimensions(l);
    const v = f === "y";
    const y = v ? "top" : "left";
    const h = v ? "bottom" : "right";
    const b = v ? "clientHeight" : "clientWidth";
    const w = o.reference[g] + o.reference[f] - d[f] - o.floating[g];
    const x = d[f] - o.reference[f];
    const E = await (a.getOffsetParent == null ? undefined : a.getOffsetParent(l));
    let k = E ? E[b] : 0;
    if (!k || !(await (a.isElement == null ? undefined : a.isElement(E)))) {
      k = s.floating[b] || o.floating[g];
    }
    const S = w / 2 - x / 2;
    const T = k / 2 - m[g] / 2 - 1;
    const C = tc(p[y], T);
    const A = tc(p[h], T);
    const _ = C;
    const O = k - m[g] - A;
    const M = k / 2 - m[g] / 2 + S;
    const P = uc(_, M, O);
    const q = !u.arrow && pc(i) != null && M !== P && o.reference[g] / 2 - (M < _ ? C : A) - m[g] / 2 < 0;
    const N = q ? M < _ ? M - _ : M - O : 0;
    return {
      [f]: d[f] + N,
      data: {
        [f]: P,
        centerOffset: M - P - N,
        ...(q && {
          alignmentOffset: N
        })
      },
      reset: q
    };
  }
});
const Oc = function (e = {}) {
  return {
    name: "flip",
    options: e,
    async fn(t) {
      var r;
      var n;
      const {
        placement: i,
        middlewareData: o,
        rects: a,
        initialPlacement: s,
        platform: u,
        elements: l
      } = t;
      const {
        mainAxis: c = true,
        crossAxis: p = true,
        fallbackPlacements: d,
        fallbackStrategy: f = "bestFit",
        fallbackAxisSideDirection: g = "none",
        flipAlignment: m = true,
        ...v
      } = lc(e, t);
      if ((r = o.arrow) != null && r.alignmentOffset) {
        return {};
      }
      const y = cc(i);
      const h = cc(s) === s;
      const b = await (u.isRTL == null ? undefined : u.isRTL(l.floating));
      const w = d || (h || !m ? [xc(s)] : yc(s));
      if (!d && g !== "none") {
        w.push(...wc(s, m, g, b));
      }
      const x = [s, ...w];
      const E = await Ac(t, v);
      const k = [];
      let S = ((n = o.flip) == null ? undefined : n.overflows) || [];
      if (c) {
        k.push(E[y]);
      }
      if (p) {
        const e = vc(i, a, b);
        k.push(E[e[0]], E[e[1]]);
      }
      S = [...S, {
        placement: i,
        overflows: k
      }];
      if (!k.every(e => e <= 0)) {
        var T;
        var C;
        const e = (((T = o.flip) == null ? undefined : T.index) || 0) + 1;
        const t = x[e];
        if (t) {
          return {
            data: {
              index: e,
              overflows: S
            },
            reset: {
              placement: t
            }
          };
        }
        let r = (C = S.filter(e => e.overflows[0] <= 0).sort((e, t) => e.overflows[1] - t.overflows[1])[0]) == null ? undefined : C.placement;
        if (!r) {
          switch (f) {
            case "bestFit":
              {
                var A;
                const e = (A = S.map(e => [e.placement, e.overflows.filter(e => e > 0).reduce((e, t) => e + t, 0)]).sort((e, t) => e[1] - t[1])[0]) == null ? undefined : A[0];
                if (e) {
                  r = e;
                }
                break;
              }
            case "initialPlacement":
              r = s;
              break;
          }
        }
        if (i !== r) {
          return {
            reset: {
              placement: r
            }
          };
        }
      }
      return {};
    }
  };
};
function Mc(e, t) {
  return {
    top: e.top - t.height,
    right: e.right - t.width,
    bottom: e.bottom - t.height,
    left: e.left - t.width
  };
}
function Pc(e) {
  return ec.some(t => e[t] >= 0);
}
const qc = function (e = {}) {
  return {
    name: "hide",
    options: e,
    async fn(t) {
      const {
        rects: r
      } = t;
      const {
        strategy: n = "referenceHidden",
        ...i
      } = lc(e, t);
      switch (n) {
        case "referenceHidden":
          {
            const e = await Ac(t, {
              ...i,
              elementContext: "reference"
            });
            const n = Mc(e, r.reference);
            return {
              data: {
                referenceHiddenOffsets: n,
                referenceHidden: Pc(n)
              }
            };
          }
        case "escaped":
          {
            const e = await Ac(t, {
              ...i,
              altBoundary: true
            });
            const n = Mc(e, r.floating);
            return {
              data: {
                escapedOffsets: n,
                escaped: Pc(n)
              }
            };
          }
        default:
          return {};
      }
    }
  };
};
async function Nc(e, t) {
  const {
    placement: r,
    platform: n,
    elements: i
  } = e;
  const o = await (n.isRTL == null ? undefined : n.isRTL(i.floating));
  const a = cc(r);
  const s = pc(r);
  const u = gc(r) === "y";
  const l = ["left", "top"].includes(a) ? -1 : 1;
  const c = o && u ? -1 : 1;
  const p = lc(t, e);
  let {
    mainAxis: d,
    crossAxis: f,
    alignmentAxis: g
  } = typeof p === "number" ? {
    mainAxis: p,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: 0,
    crossAxis: 0,
    alignmentAxis: null,
    ...p
  };
  if (s && typeof g === "number") {
    f = s === "end" ? g * -1 : g;
  }
  if (u) {
    return {
      x: f * c,
      y: d * l
    };
  } else {
    return {
      x: d * l,
      y: f * c
    };
  }
}
const Rc = function (e = 0) {
  return {
    name: "offset",
    options: e,
    async fn(t) {
      var r;
      var n;
      const {
        x: i,
        y: o,
        placement: a,
        middlewareData: s
      } = t;
      const u = await Nc(t, e);
      if (a === ((r = s.offset) == null ? undefined : r.placement) && (n = s.arrow) != null && n.alignmentOffset) {
        return {};
      } else {
        return {
          x: i + u.x,
          y: o + u.y,
          data: {
            ...u,
            placement: a
          }
        };
      }
    }
  };
};
const Ic = function (e = {}) {
  return {
    name: "shift",
    options: e,
    async fn(t) {
      const {
        x: r,
        y: n,
        placement: i
      } = t;
      const {
        mainAxis: o = true,
        crossAxis: a = false,
        limiter: s = {
          fn: e => {
            let {
              x: t,
              y: r
            } = e;
            return {
              x: t,
              y: r
            };
          }
        },
        ...u
      } = lc(e, t);
      const l = {
        x: r,
        y: n
      };
      const c = await Ac(t, u);
      const p = gc(cc(i));
      const d = dc(p);
      let f = l[d];
      let g = l[p];
      if (o) {
        const e = d === "y" ? "top" : "left";
        const t = d === "y" ? "bottom" : "right";
        const r = f + c[e];
        const n = f - c[t];
        f = uc(r, f, n);
      }
      if (a) {
        const e = p === "y" ? "top" : "left";
        const t = p === "y" ? "bottom" : "right";
        const r = g + c[e];
        const n = g - c[t];
        g = uc(r, g, n);
      }
      const m = s.fn({
        ...t,
        [d]: f,
        [p]: g
      });
      return {
        ...m,
        data: {
          x: m.x - r,
          y: m.y - n
        }
      };
    }
  };
};
const jc = function (e = {}) {
  return {
    options: e,
    fn(t) {
      const {
        x: r,
        y: n,
        placement: i,
        rects: o,
        middlewareData: a
      } = t;
      const {
        offset: s = 0,
        mainAxis: u = true,
        crossAxis: l = true
      } = lc(e, t);
      const c = {
        x: r,
        y: n
      };
      const p = gc(i);
      const d = dc(p);
      let f = c[d];
      let g = c[p];
      const m = lc(s, t);
      const v = typeof m === "number" ? {
        mainAxis: m,
        crossAxis: 0
      } : {
        mainAxis: 0,
        crossAxis: 0,
        ...m
      };
      if (u) {
        const e = d === "y" ? "height" : "width";
        const t = o.reference[d] - o.floating[e] + v.mainAxis;
        const r = o.reference[d] + o.reference[e] - v.mainAxis;
        if (f < t) {
          f = t;
        } else if (f > r) {
          f = r;
        }
      }
      if (l) {
        var y;
        var h;
        const e = d === "y" ? "width" : "height";
        const t = ["top", "left"].includes(cc(i));
        const r = o.reference[p] - o.floating[e] + (t && ((y = a.offset) == null ? undefined : y[p]) || 0) + (t ? 0 : v.crossAxis);
        const n = o.reference[p] + o.reference[e] + (t ? 0 : ((h = a.offset) == null ? undefined : h[p]) || 0) - (t ? v.crossAxis : 0);
        if (g < r) {
          g = r;
        } else if (g > n) {
          g = n;
        }
      }
      return {
        [d]: f,
        [p]: g
      };
    }
  };
};
function Dc(e) {
  if (Zc(e)) {
    return (e.nodeName || "").toLowerCase();
  } else {
    return "#document";
  }
}
function Lc(e) {
  var t;
  return (e == null || (t = e.ownerDocument) == null ? undefined : t.defaultView) || window;
}
function Fc(e) {
  var t;
  if ((t = (Zc(e) ? e.ownerDocument : e.document) || window.document) == null) {
    return undefined;
  } else {
    return t.documentElement;
  }
}
function Zc(e) {
  return e instanceof Node || e instanceof Lc(e).Node;
}
function zc(e) {
  return e instanceof Element || e instanceof Lc(e).Element;
}
function Uc(e) {
  return e instanceof HTMLElement || e instanceof Lc(e).HTMLElement;
}
function Bc(e) {
  return typeof ShadowRoot !== "undefined" && (e instanceof ShadowRoot || e instanceof Lc(e).ShadowRoot);
}
function Vc(e) {
  const {
    overflow: t,
    overflowX: r,
    overflowY: n,
    display: i
  } = Gc(e);
  return /auto|scroll|overlay|hidden|clip/.test(t + n + r) && !["inline", "contents"].includes(i);
}
function Hc(e) {
  return ["table", "td", "th"].includes(Dc(e));
}
function Wc(e) {
  const t = Qc();
  const r = Gc(e);
  return r.transform !== "none" || r.perspective !== "none" || !!r.containerType && r.containerType !== "normal" || !t && !!r.backdropFilter && r.backdropFilter !== "none" || !t && !!r.filter && r.filter !== "none" || ["transform", "perspective", "filter"].some(e => (r.willChange || "").includes(e)) || ["paint", "layout", "strict", "content"].some(e => (r.contain || "").includes(e));
}
function Yc(e) {
  let t = Jc(e);
  while (Uc(t) && !$c(t)) {
    if (Wc(t)) {
      return t;
    }
    t = Jc(t);
  }
  return null;
}
function Qc() {
  return typeof CSS !== "undefined" && !!CSS.supports && CSS.supports("-webkit-backdrop-filter", "none");
}
function $c(e) {
  return ["html", "body", "#document"].includes(Dc(e));
}
function Gc(e) {
  return Lc(e).getComputedStyle(e);
}
function Kc(e) {
  if (zc(e)) {
    return {
      scrollLeft: e.scrollLeft,
      scrollTop: e.scrollTop
    };
  } else {
    return {
      scrollLeft: e.pageXOffset,
      scrollTop: e.pageYOffset
    };
  }
}
function Jc(e) {
  if (Dc(e) === "html") {
    return e;
  }
  const t = e.assignedSlot || e.parentNode || Bc(e) && e.host || Fc(e);
  if (Bc(t)) {
    return t.host;
  } else {
    return t;
  }
}
function Xc(e) {
  const t = Jc(e);
  if ($c(t)) {
    if (e.ownerDocument) {
      return e.ownerDocument.body;
    } else {
      return e.body;
    }
  } else if (Uc(t) && Vc(t)) {
    return t;
  } else {
    return Xc(t);
  }
}
function ep(e, t, r) {
  var n;
  if (t === undefined) {
    t = [];
  }
  if (r === undefined) {
    r = true;
  }
  const i = Xc(e);
  const o = i === ((n = e.ownerDocument) == null ? undefined : n.body);
  const a = Lc(i);
  if (o) {
    return t.concat(a, a.visualViewport || [], Vc(i) ? i : [], a.frameElement && r ? ep(a.frameElement) : []);
  } else {
    return t.concat(i, ep(i, [], r));
  }
}
function tp(e) {
  const t = Gc(e);
  let r = parseFloat(t.width) || 0;
  let n = parseFloat(t.height) || 0;
  const i = Uc(e);
  const o = i ? e.offsetWidth : r;
  const a = i ? e.offsetHeight : n;
  const s = nc(r) !== o || nc(n) !== a;
  if (s) {
    r = o;
    n = a;
  }
  return {
    width: r,
    height: n,
    $: s
  };
}
function rp(e) {
  if (zc(e)) {
    return e;
  } else {
    return e.contextElement;
  }
}
function np(e) {
  const t = rp(e);
  if (!Uc(t)) {
    return oc(1);
  }
  const r = t.getBoundingClientRect();
  const {
    width: n,
    height: i,
    $: o
  } = tp(t);
  let a = (o ? nc(r.width) : r.width) / n;
  let s = (o ? nc(r.height) : r.height) / i;
  if (!a || !Number.isFinite(a)) {
    a = 1;
  }
  if (!s || !Number.isFinite(s)) {
    s = 1;
  }
  return {
    x: a,
    y: s
  };
}
const ip = oc(0);
function op(e) {
  const t = Lc(e);
  if (Qc() && t.visualViewport) {
    return {
      x: t.visualViewport.offsetLeft,
      y: t.visualViewport.offsetTop
    };
  } else {
    return ip;
  }
}
function ap(e, t = false, r) {
  return !!r && (!t || r === Lc(e)) && t;
}
function sp(e, t = false, r = false, n) {
  const i = e.getBoundingClientRect();
  const o = rp(e);
  let a = oc(1);
  if (t) {
    if (n) {
      if (zc(n)) {
        a = np(n);
      }
    } else {
      a = np(e);
    }
  }
  const s = ap(o, r, n) ? op(o) : oc(0);
  let u = (i.left + s.x) / a.x;
  let l = (i.top + s.y) / a.y;
  let c = i.width / a.x;
  let p = i.height / a.y;
  if (o) {
    const e = Lc(o);
    const t = n && zc(n) ? Lc(n) : n;
    let r = e;
    let i = r.frameElement;
    while (i && n && t !== r) {
      const e = np(i);
      const t = i.getBoundingClientRect();
      const n = Gc(i);
      const o = t.left + (i.clientLeft + parseFloat(n.paddingLeft)) * e.x;
      const a = t.top + (i.clientTop + parseFloat(n.paddingTop)) * e.y;
      u *= e.x;
      l *= e.y;
      c *= e.x;
      p *= e.y;
      u += o;
      l += a;
      r = Lc(i);
      i = r.frameElement;
    }
  }
  return Sc({
    width: c,
    height: p,
    x: u,
    y: l
  });
}
const up = [":popover-open", ":modal"];
function lp(e) {
  return up.some(t => {
    try {
      return e.matches(t);
    } catch (jg) {
      return false;
    }
  });
}
function cp(e) {
  let {
    elements: t,
    rect: r,
    offsetParent: n,
    strategy: i
  } = e;
  const o = i === "fixed";
  const a = Fc(n);
  const s = !!t && lp(t.floating);
  if (n === a || s && o) {
    return r;
  }
  let u = {
    scrollLeft: 0,
    scrollTop: 0
  };
  let l = oc(1);
  const c = oc(0);
  const p = Uc(n);
  if ((p || !p && !o) && ((Dc(n) !== "body" || Vc(a)) && (u = Kc(n)), Uc(n))) {
    const e = sp(n);
    l = np(n);
    c.x = e.x + n.clientLeft;
    c.y = e.y + n.clientTop;
  }
  return {
    width: r.width * l.x,
    height: r.height * l.y,
    x: r.x * l.x - u.scrollLeft * l.x + c.x,
    y: r.y * l.y - u.scrollTop * l.y + c.y
  };
}
function pp(e) {
  return Array.from(e.getClientRects());
}
function dp(e) {
  return sp(Fc(e)).left + Kc(e).scrollLeft;
}
function fp(e) {
  const t = Fc(e);
  const r = Kc(e);
  const n = e.ownerDocument.body;
  const i = rc(t.scrollWidth, t.clientWidth, n.scrollWidth, n.clientWidth);
  const o = rc(t.scrollHeight, t.clientHeight, n.scrollHeight, n.clientHeight);
  let a = -r.scrollLeft + dp(e);
  const s = -r.scrollTop;
  if (Gc(n).direction === "rtl") {
    a += rc(t.clientWidth, n.clientWidth) - i;
  }
  return {
    width: i,
    height: o,
    x: a,
    y: s
  };
}
function gp(e, t) {
  const r = Lc(e);
  const n = Fc(e);
  const i = r.visualViewport;
  let o = n.clientWidth;
  let a = n.clientHeight;
  let s = 0;
  let u = 0;
  if (i) {
    o = i.width;
    a = i.height;
    const e = Qc();
    if (!e || e && t === "fixed") {
      s = i.offsetLeft;
      u = i.offsetTop;
    }
  }
  return {
    width: o,
    height: a,
    x: s,
    y: u
  };
}
function mp(e, t) {
  const r = sp(e, true, t === "fixed");
  const n = r.top + e.clientTop;
  const i = r.left + e.clientLeft;
  const o = Uc(e) ? np(e) : oc(1);
  const a = e.clientWidth * o.x;
  const s = e.clientHeight * o.y;
  const u = i * o.x;
  const l = n * o.y;
  return {
    width: a,
    height: s,
    x: u,
    y: l
  };
}
function vp(e, t, r) {
  let n;
  if (t === "viewport") {
    n = gp(e, r);
  } else if (t === "document") {
    n = fp(Fc(e));
  } else if (zc(t)) {
    n = mp(t, r);
  } else {
    const r = op(e);
    n = {
      ...t,
      x: t.x - r.x,
      y: t.y - r.y
    };
  }
  return Sc(n);
}
function yp(e, t) {
  const r = Jc(e);
  return r !== t && !!zc(r) && !$c(r) && (Gc(r).position === "fixed" || yp(r, t));
}
function hp(e, t) {
  const r = t.get(e);
  if (r) {
    return r;
  }
  let n = ep(e, [], false).filter(e => zc(e) && Dc(e) !== "body");
  let i = null;
  const o = Gc(e).position === "fixed";
  let a = o ? Jc(e) : e;
  while (zc(a) && !$c(a)) {
    const t = Gc(a);
    const r = Wc(a);
    if (!r && t.position === "fixed") {
      i = null;
    }
    const s = o ? !r && !i : !r && t.position === "static" && !!i && ["absolute", "fixed"].includes(i.position) || Vc(a) && !r && yp(e, a);
    if (s) {
      n = n.filter(e => e !== a);
    } else {
      i = t;
    }
    a = Jc(a);
  }
  t.set(e, n);
  return n;
}
function bp(e) {
  let {
    element: t,
    boundary: r,
    rootBoundary: n,
    strategy: i
  } = e;
  const o = r === "clippingAncestors" ? hp(t, this._c) : [].concat(r);
  const a = [...o, n];
  const s = a[0];
  const u = a.reduce((e, r) => {
    const n = vp(t, r, i);
    e.top = rc(n.top, e.top);
    e.right = tc(n.right, e.right);
    e.bottom = tc(n.bottom, e.bottom);
    e.left = rc(n.left, e.left);
    return e;
  }, vp(t, s, i));
  return {
    width: u.right - u.left,
    height: u.bottom - u.top,
    x: u.left,
    y: u.top
  };
}
function wp(e) {
  const {
    width: t,
    height: r
  } = tp(e);
  return {
    width: t,
    height: r
  };
}
function xp(e, t, r) {
  const n = Uc(t);
  const i = Fc(t);
  const o = r === "fixed";
  const a = sp(e, true, o, t);
  let s = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const u = oc(0);
  if (n || !n && !o) {
    if (Dc(t) !== "body" || Vc(i)) {
      s = Kc(t);
    }
    if (n) {
      const e = sp(t, true, o, t);
      u.x = e.x + t.clientLeft;
      u.y = e.y + t.clientTop;
    } else if (i) {
      u.x = dp(i);
    }
  }
  const l = a.left + s.scrollLeft - u.x;
  const c = a.top + s.scrollTop - u.y;
  return {
    x: l,
    y: c,
    width: a.width,
    height: a.height
  };
}
function Ep(e, t) {
  if (Uc(e) && Gc(e).position !== "fixed") {
    if (t) {
      return t(e);
    } else {
      return e.offsetParent;
    }
  } else {
    return null;
  }
}
function kp(e, t) {
  const r = Lc(e);
  if (!Uc(e) || lp(e)) {
    return r;
  }
  let n = Ep(e, t);
  while (n && Hc(n) && Gc(n).position === "static") {
    n = Ep(n, t);
  }
  if (n && (Dc(n) === "html" || Dc(n) === "body" && Gc(n).position === "static" && !Wc(n))) {
    return r;
  } else {
    return n || Yc(e) || r;
  }
}
const Sp = async function (e) {
  const t = this.getOffsetParent || kp;
  const r = this.getDimensions;
  return {
    reference: xp(e.reference, await t(e.floating), e.strategy),
    floating: {
      x: 0,
      y: 0,
      ...(await r(e.floating))
    }
  };
};
function Tp(e) {
  return Gc(e).direction === "rtl";
}
const Cp = {
  convertOffsetParentRelativeRectToViewportRelativeRect: cp,
  getDocumentElement: Fc,
  getClippingRect: bp,
  getOffsetParent: kp,
  getElementRects: Sp,
  getClientRects: pp,
  getDimensions: wp,
  getScale: np,
  isElement: zc,
  isRTL: Tp
};
function Ap(e, t) {
  let r;
  let n = null;
  const i = Fc(e);
  function o() {
    var e;
    clearTimeout(r);
    if ((e = n) != null) {
      e.disconnect();
    }
    n = null;
  }
  function a(s = false, u = 1) {
    o();
    const {
      left: l,
      top: c,
      width: p,
      height: d
    } = e.getBoundingClientRect();
    if (!s) {
      t();
    }
    if (!p || !d) {
      return;
    }
    const f = ic(c);
    const g = ic(i.clientWidth - (l + p));
    const m = ic(i.clientHeight - (c + d));
    const v = ic(l);
    const y = -f + "px " + -g + "px " + -m + "px " + -v + "px";
    const h = {
      rootMargin: y,
      threshold: rc(0, tc(1, u)) || 1
    };
    let b = true;
    function w(e) {
      const t = e[0].intersectionRatio;
      if (t !== u) {
        if (!b) {
          return a();
        }
        if (t) {
          a(false, t);
        } else {
          r = setTimeout(() => {
            a(false, 1e-7);
          }, 100);
        }
      }
      b = false;
    }
    try {
      n = new IntersectionObserver(w, {
        ...h,
        root: i.ownerDocument
      });
    } catch (jg) {
      n = new IntersectionObserver(w, h);
    }
    n.observe(e);
  }
  a(true);
  return o;
}
function _p(e, t, r, n = {}) {
  const {
    ancestorScroll: i = true,
    ancestorResize: o = true,
    elementResize: a = typeof ResizeObserver === "function",
    layoutShift: s = typeof IntersectionObserver === "function",
    animationFrame: u = false
  } = n;
  const l = rp(e);
  const c = i || o ? [...(l ? ep(l) : []), ...ep(t)] : [];
  c.forEach(e => {
    if (i) {
      e.addEventListener("scroll", r, {
        passive: true
      });
    }
    if (o) {
      e.addEventListener("resize", r);
    }
  });
  const p = l && s ? Ap(l, r) : null;
  let d;
  let f = -1;
  let g = null;
  if (a) {
    g = new ResizeObserver(e => {
      let [n] = e;
      if (n && n.target === l && g) {
        g.unobserve(t);
        cancelAnimationFrame(f);
        f = requestAnimationFrame(() => {
          var e;
          if ((e = g) != null) {
            e.observe(t);
          }
        });
      }
      r();
    });
    if (l && !u) {
      g.observe(l);
    }
    g.observe(t);
  }
  let m = u ? sp(e) : null;
  function v() {
    const t = sp(e);
    if (!!m && (t.x !== m.x || t.y !== m.y || t.width !== m.width || t.height !== m.height)) {
      r();
    }
    m = t;
    d = requestAnimationFrame(v);
  }
  if (u) {
    v();
  }
  r();
  return () => {
    var e;
    c.forEach(e => {
      if (i) {
        e.removeEventListener("scroll", r);
      }
      if (o) {
        e.removeEventListener("resize", r);
      }
    });
    if (p != null) {
      p();
    }
    if ((e = g) != null) {
      e.disconnect();
    }
    g = null;
    if (u) {
      cancelAnimationFrame(d);
    }
  };
}
const Op = Ic;
const Mp = Oc;
const Pp = qc;
const qp = _c;
const Np = jc;
const Rp = (e, t, r) => {
  const n = new Map();
  const i = {
    platform: Cp,
    ...r
  };
  const o = {
    ...i.platform,
    _c: n
  };
  return Cc(e, t, {
    ...i,
    platform: o
  });
};
var Ip = function (e) {
  (0, N.Z)(r, e);
  var t = (0, R.Z)(r);
  function r() {
    var e;
    (0, q.Z)(this, r);
    e = t.apply(this, arguments);
    e.element = null;
    return e;
  }
  (0, P.Z)(r, [{
    key: "componentDidMount",
    value: function () {
      this.componentDidUpdate();
    }
  }, {
    key: "componentDidUpdate",
    value: function () {
      var e = (0, Hn.findDOMNode)(this);
      if (e instanceof Element) {
        this.element = e;
      } else {
        this.element = null;
      }
    }
  }, {
    key: "render",
    value: function () {
      return a.Children.only(this.props.children);
    }
  }]);
  return r;
}(a.Component);
function jp(e) {
  return e.every(function (e) {
    var t = cs(e);
    return !!t && (t.getRootNode() instanceof ShadowRoot || undefined);
  });
}
function Dp(e) {
  if (e) {
    return e.getRootNode();
  } else {
    return document;
  }
}
function Lp(e) {
  if (!e || !document.getRootNode) {
    return document;
  }
  var t = Array.isArray(e) ? e : [e];
  if (jp(t)) {
    return Dp(cs(t[0]));
  } else {
    return document;
  }
}
var Fp = Lp;
function Zp(e, t, r = "click") {
  var n = ds(e);
  xs(function () {
    function e(e) {
      var r = Array.isArray(t) ? t : [t];
      if (!r.some(function (t) {
        var r = cs(t);
        return !r || r.contains(e.target);
      })) {
        n.current(e);
      }
    }
    var i = Fp(t);
    var o = Array.isArray(r) ? r : [r];
    o.forEach(function (t) {
      return i.addEventListener(t, e);
    });
    return function () {
      o.forEach(function (t) {
        return i.removeEventListener(t, e);
      });
    };
  }, Array.isArray(r) ? r : [r], t);
}
var zp = {
  topLeft: "top-start",
  topRight: "top-end",
  bottomLeft: "bottom-start",
  bottomRight: "bottom-end",
  leftTop: "left-start",
  leftBottom: "left-end",
  rightTop: "right-start",
  rightBottom: "right-end"
};
function Up(e) {
  return zp[e] ?? e;
}
var Bp = null;
var Vp = null;
function Hp(e) {
  if (Bp === null || Vp === null || Bp.getBoundingClientRect().height === 10) {
    return e;
  } else {
    Vp.style.setProperty("--size", e.toString());
    return Vp.getBoundingClientRect().height;
  }
}
if (n) {
  Bp = document.createElement("div");
  Bp.className = "adm-px-tester";
  Bp.style.setProperty("--size", "10");
  document.body.appendChild(Bp);
  Vp = document.createElement("div");
  Vp.className = "adm-px-tester";
  document.body.appendChild(Vp);
  if (zl && window.getComputedStyle(Vp).position !== "fixed") {
    Bl("Global", "The px tester is not rendering properly. Please make sure you have imported `antd-mobile/es/global`.");
  }
}
var Wp = "adm-popover";
var Yp = {
  placement: "top",
  defaultVisible: false,
  stopPropagation: ["click"],
  getContainer: function () {
    return document.body;
  },
  mode: "light"
};
var Qp = (0, a.forwardRef)(function (e, t) {
  var r = c(Yp, e);
  var n = Up(r.placement);
  var i = Jl({
    value: r.visible,
    defaultValue: r.defaultVisible,
    onChange: r.onVisibleChange
  });
  var s = (0, p.Z)(i, 2);
  var d = s[0];
  var f = s[1];
  (0, a.useImperativeHandle)(t, function () {
    return {
      show: function () {
        return f(true);
      },
      hide: function () {
        return f(false);
      },
      visible: d
    };
  }, [d]);
  var g = (0, a.useRef)(null);
  var v = (0, a.useRef)(null);
  var y = (0, a.useRef)(null);
  var h = Mi(r.stopPropagation, l(r, a.createElement("div", {
    className: u(Wp, `${Wp}-${r.mode}`, (0, o.Z)({}, `${Wp}-hidden`, !d)),
    ref: v
  }, a.createElement("div", {
    className: `${Wp}-arrow`,
    ref: y
  }, a.createElement(Xl, {
    className: `${Wp}-arrow-icon`
  })), a.createElement("div", {
    className: `${Wp}-inner`
  }, a.createElement("div", {
    className: `${Wp}-inner-content`
  }, r.content)))));
  var b = (0, a.useState)(null);
  var w = (0, p.Z)(b, 2);
  var x = w[0];
  var E = w[1];
  function k() {
    return (0, Ta.mG)(this, undefined, undefined, (0, B.Z)().mark(function i() {
      var a;
      var s;
      var u;
      var l;
      var c;
      var p;
      var d;
      var f;
      var m;
      var h;
      var b;
      var w;
      var x;
      var k;
      return (0, B.Z)().wrap(function (i) {
        while (1) {
          switch (i.prev = i.next) {
            case 0:
              a = g.current?.element ?? null;
              s = v.current;
              u = y.current;
              E(a);
              if (a && s && u) {
                i.next = 6;
                break;
              }
              return i.abrupt("return");
            case 6:
              i.next = 8;
              return Rp(a, s, {
                placement: n,
                middleware: [Rc(Hp(12)), Op({
                  padding: Hp(4),
                  crossAxis: false,
                  limiter: Np()
                }), Mp(), Pp(), qp({
                  element: u,
                  padding: Hp(12)
                })]
              });
            case 8:
              l = i.sent;
              c = l.x;
              p = l.y;
              d = l.placement;
              f = l.middlewareData;
              Object.assign(s.style, {
                left: `${c}px`,
                top: `${p}px`
              });
              m = d.split("-")[0];
              h = {
                top: "bottom",
                right: "left",
                bottom: "top",
                left: "right"
              }[m];
              b = f.arrow ?? {};
              w = b.x;
              x = b.y;
              Object.assign(u.style, (0, o.Z)({
                left: w != null ? `${w}px` : "",
                top: x != null ? `${x}px` : "",
                right: "",
                bottom: ""
              }, h, "calc(var(--arrow-size) * -1)"));
              k = {
                top: "0deg",
                bottom: "180deg",
                left: "270deg",
                right: "90deg"
              }[m];
              u.style.setProperty("--arrow-icon-rotate", k);
            case 20:
            case "end":
              return i.stop();
          }
        }
      }, i);
    }));
  }
  m(function () {
    k();
  });
  (0, a.useEffect)(function () {
    if (x && r.trigger) {
      x.addEventListener("click", e);
      return function () {
        x.removeEventListener("click", e);
      };
    }
    function e() {
      f(function (e) {
        return !e;
      });
    }
  }, [x, r.trigger]);
  (0, a.useEffect)(function () {
    var e = v.current;
    if (x && e) {
      return _p(x, e, k, {
        elementResize: typeof ResizeObserver !== "undefined"
      });
    }
  }, [x]);
  Zp(function () {
    if (r.trigger) {
      f(false);
    }
  }, [function () {
    return g.current?.element;
  }, v], ["click", "touchmove"]);
  var S = _i(d, false, r.destroyOnHide);
  return a.createElement(a.Fragment, null, a.createElement(Ip, {
    ref: g
  }, r.children), S && mi(r.getContainer, h));
});
var $p = "adm-popover-menu";
var Gp = (0, a.forwardRef)(function (e, t) {
  var r = (0, a.useRef)(null);
  (0, a.useImperativeHandle)(t, function () {
    return r.current;
  }, []);
  var n = (0, a.useCallback)(function (t) {
    var n;
    var i = e.onAction;
    if (i) {
      i(t);
    }
    if ((n = r.current) !== null && n !== undefined) {
      n.hide();
    }
  }, [e.onAction]);
  var i = (0, a.useMemo)(function () {
    var t = e?.maxCount && e.actions.length > e?.maxCount;
    var r = e?.maxCount && e?.maxCount * 48;
    return a.createElement("div", {
      className: `${$p}-list`
    }, a.createElement("div", {
      className: u(`${$p}-list-inner`, (0, o.Z)({}, `${$p}-list-scroll`, t)),
      style: {
        height: r
      }
    }, e.actions.map(function (e, t) {
      return a.createElement("a", {
        key: e.key ?? t,
        className: u(`${$p}-item`, "adm-plain-anchor", (0, o.Z)({}, `${$p}-item-disabled`, e.disabled)),
        onClick: function () {
          var t;
          if (!e.disabled) {
            n(e);
            if ((t = e.onClick) !== null && t !== undefined) {
              t.call(e);
            }
          }
        }
      }, e.icon && a.createElement("div", {
        className: `${$p}-item-icon`
      }, e.icon), a.createElement("div", {
        className: `${$p}-item-text`
      }, e.text));
    })));
  }, [e.actions, n]);
  return a.createElement(Qp, Object.assign({
    ref: r
  }, e, {
    className: u($p, e.className),
    content: i
  }), e.children);
});
var Kp = i(Qp, {
  Menu: Gp
});
function Jp(e) {
  return a.createElement("svg", Object.assign({
    width: "1em",
    height: "1em",
    viewBox: "0 0 48 48",
    xmlns: "http://www.w3.org/2000/svg",
    xmlnsXlink: "http://www.w3.org/1999/xlink"
  }, e, {
    style: Object.assign({
      verticalAlign: "-0.125em"
    }, e.style),
    className: ["antd-mobile-icon", e.className].filter(Boolean).join(" ")
  }), a.createElement("g", {
    id: "QuestionCircleOutline-QuestionCircleOutline",
    stroke: "none",
    strokeWidth: 1,
    fill: "none",
    fillRule: "evenodd"
  }, a.createElement("g", {
    id: "QuestionCircleOutline-编组"
  }, a.createElement("rect", {
    id: "QuestionCircleOutline-矩形",
    fill: "#FFFFFF",
    opacity: 0,
    x: 0,
    y: 0,
    width: 48,
    height: 48
  }), a.createElement("path", {
    d: "M24,2 C36.1502645,2 46,11.8497355 46,24 C46,36.1502645 36.1502645,46 24,46 C11.8497355,46 2,36.1502645 2,24 C2,11.8497355 11.8497355,2 24,2 Z M24,5 C13.5065898,5 5,13.5065898 5,24 C5,34.4934102 13.5065898,43 24,43 C34.4934102,43 43,34.4934102 43,24 C43,13.5065898 34.4934102,5 24,5 Z M26,32.4 L26,34.6 C26,34.8209139 25.8209139,35 25.6,35 L23.4,35 C23.1790861,35 23,34.8209139 23,34.6 L23,32.4 C23,32.1790861 23.1790861,32 23.4,32 L25.6,32 C25.8209139,32 26,32.1790861 26,32.4 Z M24,12 C27.8659932,12 31,15.1340068 31,19 C31,22.1706393 28.8919961,24.8489278 26.0010432,25.7098107 L26.0001268,28.6 C25.9999299,28.8208643 25.8208644,28.9998731 25.6,29 L23.4,29 C23.1790861,29 23,28.8209139 23,28.6 L23,23.4 C23,23.1790861 23.1790861,23 23.4,23 L24,23 L24,23 C26.209139,23 28,21.209139 28,19 C28,16.790861 26.209139,15 24,15 C21.790861,15 20,16.790861 20,19 L17,19 C17,15.1340068 20.1340068,12 24,12 Z",
    id: "QuestionCircleOutline-形状",
    fill: "currentColor",
    fillRule: "nonzero"
  }))));
}
var Xp = Jp;
function ed() {
  var e;
  for (var t = arguments.length, r = new Array(t), n = 0; n < t; n++) {
    r[n] = arguments[n];
  }
  for (e = 0; e < r.length; e++) {
    if (r[e] !== undefined) {
      break;
    }
  }
  return r[e];
}
var td = "__SPLIT__";
var rd = "adm-form-item";
var nd = a.memo(function (e) {
  var t = e.children;
  return t;
}, function (e, t) {
  return e.value === t.value && e.update === t.update;
});
function id(e) {
  var t;
  var n = e.style;
  var i = e.extra;
  var s = e.label;
  var c = e.help;
  var p = e.required;
  var d = e.children;
  var f = e.htmlFor;
  var g = e.hidden;
  var m = e.arrow;
  var v = e.childElementPosition;
  var y = v === undefined ? "normal" : v;
  var h = (0, a.useContext)(Ol);
  var b = Ti();
  var w = b.locale;
  var x = e.hasFeedback !== undefined ? e.hasFeedback : h.hasFeedback;
  var E = e.layout || h.layout;
  var k = e.disabled ?? h.disabled;
  var S = function () {
    var e = h.requiredMarkStyle;
    switch (e) {
      case "asterisk":
        return p && a.createElement("span", {
          className: `${rd}-required-asterisk`
        }, "*");
      case "text-required":
        return p && a.createElement("span", {
          className: `${rd}-required-text`
        }, "(", w.Form.required, ")");
      case "text-optional":
        return !p && a.createElement("span", {
          className: `${rd}-required-text`
        }, "(", w.Form.optional, ")");
      case "none":
        return null;
      default:
        return null;
    }
  }();
  var T = !!s && a.createElement("label", {
    className: `${rd}-label`,
    htmlFor: f
  }, s, S, c && a.createElement(Kp, {
    content: c,
    mode: "dark",
    trigger: "click"
  }, a.createElement("span", {
    className: `${rd}-label-help`,
    onClick: function (e) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, a.createElement(Xp, null))));
  var C = (!!e.description || x) && a.createElement(a.Fragment, null, e.description, x && a.createElement(a.Fragment, null, e.errors.map(function (e, t) {
    return a.createElement("div", {
      key: `error-${t}`,
      className: `${rd}-feedback-error`
    }, e);
  }), e.warnings.map(function (e, t) {
    return a.createElement("div", {
      key: `warning-${t}`,
      className: `${rd}-feedback-warning`
    }, e);
  })));
  return l(e, a.createElement(su.Item, {
    style: n,
    title: E === "vertical" && T,
    prefix: E === "horizontal" && T,
    extra: i,
    description: C,
    className: u(rd, `${rd}-${E}`, (t = {}, (0, o.Z)(t, `${rd}-hidden`, g), (0, o.Z)(t, `${rd}-has-error`, e.errors.length), t)),
    disabled: k,
    onClick: e.onClick,
    clickable: e.clickable,
    arrow: m
  }, a.createElement("div", {
    className: u(`${rd}-child`, `${rd}-child-position-${y}`)
  }, a.createElement("div", {
    className: u(`${rd}-child-inner`)
  }, d))));
}
function od(e) {
  var t = e.style;
  var r = e.label;
  var n = e.help;
  var i = e.extra;
  var o = e.hasFeedback;
  var s = e.name;
  var u = e.required;
  var c = e.noStyle;
  var d = e.hidden;
  var f = e.layout;
  var g = e.childElementPosition;
  var m = e.description;
  var v = e.disabled;
  var y = e.rules;
  var h = e.children;
  var b = e.messageVariables;
  var w = e.trigger;
  var x = w === undefined ? "onChange" : w;
  var E = e.validateTrigger;
  var k = E === undefined ? x : E;
  var S = e.onClick;
  var T = e.shouldUpdate;
  var C = e.dependencies;
  var A = e.clickable;
  var _ = e.arrow;
  var O = (0, Ta._T)(e, ["style", "label", "help", "extra", "hasFeedback", "name", "required", "noStyle", "hidden", "layout", "childElementPosition", "description", "disabled", "rules", "children", "messageVariables", "trigger", "validateTrigger", "onClick", "shouldUpdate", "dependencies", "clickable", "arrow"]);
  var M = (0, a.useContext)(Ol);
  var P = M.name;
  var q = (0, a.useContext)(Zl.ZP);
  var N = q.validateTrigger;
  var R = ed(k, N, x);
  var I = (0, a.useRef)(null);
  var D = (0, a.useRef)(0);
  D.current += 1;
  var L = (0, a.useState)({});
  var F = (0, p.Z)(L, 2);
  var Z = F[0];
  var z = F[1];
  var U = (0, a.useCallback)(function (e, t) {
    z(function (r) {
      var n = Object.assign({}, r);
      var i = t.join(td);
      if (e.destroy) {
        delete n[i];
      } else {
        n[i] = e;
      }
      return n;
    });
  }, [z]);
  function B(s, u, p, y) {
    if (c && !d) {
      return s;
    }
    var w = p?.errors ?? [];
    var x = Object.keys(Z).reduce(function (e, t) {
      var i = Z[t]?.errors ?? [];
      if (i.length) {
        e = [].concat((0, j.Z)(e), (0, j.Z)(i));
      }
      return e;
    }, w);
    var E = p?.warnings ?? [];
    var k = Object.keys(Z).reduce(function (e, t) {
      var i = Z[t]?.warnings ?? [];
      if (i.length) {
        e = [].concat((0, j.Z)(e), (0, j.Z)(i));
      }
      return e;
    }, E);
    return l(e, a.createElement(id, {
      style: t,
      label: r,
      extra: i,
      help: n,
      description: m,
      required: y,
      disabled: v,
      hasFeedback: o,
      htmlFor: u,
      errors: x,
      warnings: k,
      onClick: S && function (e) {
        return S(e, I);
      },
      hidden: d,
      layout: f,
      childElementPosition: g,
      clickable: A,
      arrow: _
    }, a.createElement(Ml.Provider, {
      value: U
    }, s)));
  }
  var V = typeof h === "function";
  if (!s && !V && !e.dependencies) {
    return B(h);
  }
  var H = {
    label: typeof r === "string" ? r : ""
  };
  if (b) {
    H = Object.assign(Object.assign({}, H), b);
  }
  var W = (0, a.useContext)(Ml);
  function Y(e) {
    if (c && W) {
      var t = e.name;
      W(e, t);
    }
  }
  return a.createElement(tl, Object.assign({}, O, {
    name: s,
    shouldUpdate: T,
    dependencies: C,
    rules: y,
    trigger: x,
    validateTrigger: R,
    onMetaChange: Y,
    messageVariables: H
  }), function (t, r, n) {
    var i = null;
    var o = u !== undefined ? u : y && y.some(function (e) {
      return !!e && typeof e === "object" && !!e.required;
    });
    var l = Vl(s).length && r ? r.name : [];
    var c = (l.length > 0 && P ? [P].concat((0, j.Z)(l)) : l).join("_");
    if (T && C) {
      Ul("Form.Item", "`shouldUpdate` and `dependencies` shouldn't be used together.");
    }
    if (V) {
      if (!T && !C || s) {
        if (!T && !C) {
          Ul("Form.Item", "`children` of render props only work with `shouldUpdate` or `dependencies`.");
        }
        if (s) {
          Ul("Form.Item", "Do not use `name` with `children` of render props since it's not a field.");
        }
      } else {
        i = h(n);
      }
    } else if (C && !s) {
      Ul("Form.Item", "Must set `name` or use render props when `dependencies` is set.");
    } else if (a.isValidElement(h)) {
      if (h.props.defaultValue) {
        Ul("Form.Item", "`defaultValue` will not work on controlled Field. You should use `initialValues` of Form instead.");
      }
      var p = Object.assign(Object.assign({}, h.props), t);
      if (Yl(h)) {
        p.ref = function (e) {
          var t = h.ref;
          if (t) {
            if (typeof t === "function") {
              t(e);
            }
            if ("current" in t) {
              t.current = e;
            }
          }
          I.current = e;
        };
      }
      p.id ||= c;
      var d = new Set([].concat((0, j.Z)(Vl(x)), (0, j.Z)(Vl(R))));
      d.forEach(function (e) {
        p[e] = function () {
          var r;
          var n;
          var i;
          var o;
          var a;
          for (var s = arguments.length, u = new Array(s), l = 0; l < s; l++) {
            u[l] = arguments[l];
          }
          if ((i = t[e]) !== null && i !== undefined) {
            (r = i).call.apply(r, [t].concat(u));
          }
          if ((a = (o = h.props)[e]) !== null && a !== undefined) {
            (n = a).call.apply(n, [o].concat(u));
          }
        };
      });
      i = a.createElement(nd, {
        value: t[e.valuePropName || "value"],
        update: D.current
      }, a.cloneElement(h, p));
    } else {
      if (s) {
        Ul("Form.Item", "`name` is only used for validate React element. If you are using Form.Item as layout display, please remove `name` instead.");
      }
      i = h;
    }
    return B(i, c, r, o);
  });
}
function ad(e) {
  var t = $l();
  var r = (0, a.useContext)(vu);
  var n = r.getFieldsValue(e.to);
  var i = a.useMemo(function () {
    return e.children(n, r);
  }, [JSON.stringify(n), e.children]);
  return a.createElement(a.Fragment, null, i, e.to.map(function (e) {
    return a.createElement(sd, {
      key: e.toString(),
      form: r,
      namePath: e,
      onChange: t
    });
  }));
}
var sd = (0, a.memo)(function (e) {
  var t = Sl(e.namePath, e.form);
  Cs(function () {
    e.onChange();
  }, [t]);
  return null;
});
var ud = i(Fl, {
  Item: od,
  Subscribe: ad,
  Header: Pl,
  Array: Rl,
  useForm: gl,
  useWatch: Sl
});
require("./82401.js");
function ld(e) {
  var t = this;
  var r = (0, a.useRef)(false);
  return (0, a.useCallback)(function () {
    var n = [];
    for (var i = 0; i < arguments.length; i++) {
      n[i] = arguments[i];
    }
    return (0, Ta.mG)(t, undefined, undefined, function () {
      var t;
      var i;
      return (0, Ta.Jh)(this, function (o) {
        switch (o.label) {
          case 0:
            if (r.current) {
              return [2];
            }
            r.current = true;
            o.label = 1;
          case 1:
            o.trys.push([1, 3, 4, 5]);
            return [4, e.apply(undefined, (0, Ta.ev)([], (0, Ta.CR)(n), false))];
          case 2:
            t = o.sent();
            return [2, t];
          case 3:
            i = o.sent();
            throw i;
          case 4:
            r.current = false;
            return [7];
          case 5:
            return [2];
        }
      });
    });
  }, [e]);
}
var cd = ld;
var pd = require("./63469.js");
var dd = pd;
function fd(e, t) {
  if (gs) {
    if (!ls(e)) {
      console.error(`useThrottleFn expected parameter is a function, got ${typeof e}`);
    }
  }
  var n = ds(e);
  var i = t?.wait ?? 1000;
  var o = (0, a.useMemo)(function () {
    return dd(function () {
      var e = [];
      for (var t = 0; t < arguments.length; t++) {
        e[t] = arguments[t];
      }
      return n.current.apply(n, (0, Ta.ev)([], (0, Ta.CR)(e), false));
    }, i, t);
  }, []);
  vs(function () {
    o.cancel();
  });
  return {
    run: o,
    cancel: o.cancel,
    flush: o.flush
  };
}
var gd = fd;
function md(e) {
  return e === window;
}
var vd = "adm-infinite-scroll";
var yd = {
  threshold: 250,
  children: function (e, t, r) {
    return a.createElement(bd, {
      hasMore: e,
      failed: t,
      retry: r
    });
  }
};
function hd(e) {
  var t = c(yd, e);
  var r = (0, a.useState)(false);
  var n = (0, p.Z)(r, 2);
  var i = n[0];
  var o = n[1];
  var s = cd(function (e) {
    return (0, Ta.mG)(undefined, undefined, undefined, (0, B.Z)().mark(function r() {
      return (0, B.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              r.prev = 0;
              r.next = 3;
              return t.loadMore(e);
            case 3:
              r.next = 9;
              break;
            case 5:
              r.prev = 5;
              r.t0 = r.catch(0);
              o(true);
              throw r.t0;
            case 9:
            case "end":
              return r.stop();
          }
        }
      }, r, null, [[0, 5]]);
    }));
  });
  var u = (0, a.useRef)(null);
  var d = (0, a.useState)({});
  var f = (0, p.Z)(d, 2);
  var g = f[0];
  var m = f[1];
  var v = (0, a.useRef)(g);
  var y = (0, a.useState)();
  var h = (0, p.Z)(y, 2);
  var b = h[0];
  var w = h[1];
  var x = gd(function () {
    return (0, Ta.mG)(undefined, undefined, undefined, (0, B.Z)().mark(function e() {
      var r;
      var n;
      var i;
      var o;
      var a;
      var l;
      return (0, B.Z)().wrap(function (e) {
        while (1) {
          switch (e.prev = e.next) {
            case 0:
              if (v.current === g) {
                e.next = 2;
                break;
              }
              return e.abrupt("return");
            case 2:
              if (t.hasMore) {
                e.next = 4;
                break;
              }
              return e.abrupt("return");
            case 4:
              r = u.current;
              if (r) {
                e.next = 7;
                break;
              }
              return e.abrupt("return");
            case 7:
              if (r.offsetParent) {
                e.next = 9;
                break;
              }
              return e.abrupt("return");
            case 9:
              n = S(r);
              w(n);
              if (n) {
                e.next = 13;
                break;
              }
              return e.abrupt("return");
            case 13:
              i = r.getBoundingClientRect();
              o = i.top;
              a = md(n) ? window.innerHeight : n.getBoundingClientRect().bottom;
              if (!(a >= o - t.threshold)) {
                e.next = 27;
                break;
              }
              l = {};
              v.current = l;
              e.prev = 19;
              e.next = 22;
              return s(false);
            case 22:
              m(l);
              e.next = 27;
              break;
            case 25:
              e.prev = 25;
              e.t0 = e.catch(19);
            case 27:
            case "end":
              return e.stop();
          }
        }
      }, e, null, [[19, 25]]);
    }));
  }, {
    wait: 100,
    leading: true,
    trailing: true
  });
  var E = x.run;
  function k() {
    return (0, Ta.mG)(this, undefined, undefined, (0, B.Z)().mark(function e() {
      return (0, B.Z)().wrap(function (e) {
        while (1) {
          switch (e.prev = e.next) {
            case 0:
              o(false);
              e.prev = 1;
              e.next = 4;
              return s(true);
            case 4:
              m(v.current);
              e.next = 9;
              break;
            case 7:
              e.prev = 7;
              e.t0 = e.catch(1);
            case 9:
            case "end":
              return e.stop();
          }
        }
      }, e, null, [[1, 7]]);
    }));
  }
  (0, a.useEffect)(function () {
    E();
  });
  (0, a.useEffect)(function () {
    var e = u.current;
    if (e && b) {
      b.addEventListener("scroll", t);
      return function () {
        b.removeEventListener("scroll", t);
      };
    }
    function t() {
      E();
    }
  }, [b]);
  return l(t, a.createElement("div", {
    className: vd,
    ref: u
  }, typeof t.children === "function" ? t.children(t.hasMore, i, k) : t.children));
}
function bd(e) {
  var t = Ti();
  var r = t.locale;
  if (e.hasMore) {
    if (e.failed) {
      return a.createElement("span", null, a.createElement("span", {
        className: `${vd}-failed-text`
      }, r.InfiniteScroll.failedToLoad), a.createElement("a", {
        onClick: function () {
          e.retry();
        }
      }, r.InfiniteScroll.retry));
    } else {
      return a.createElement(a.Fragment, null, a.createElement("span", null, r.common.loading), a.createElement(Ga, null));
    }
  } else {
    return a.createElement("span", null, r.InfiniteScroll.noMore);
  }
}
var wd = hd;
require("./63686.js");
var xd = require("./31064.js");
function Ed(e, t, r) {
  var n = e;
  if (t !== undefined) {
    n = Math.max(e, t);
  }
  if (r !== undefined) {
    n = Math.min(n, r);
  }
  return n;
}
var kd = "adm-input";
var Sd = {
  defaultValue: "",
  onlyShowClearWhenFocus: true
};
var Td = (0, a.forwardRef)(function (e, t) {
  var r = c(Sd, e);
  var n = Jl(r);
  var i = (0, p.Z)(n, 2);
  var o = i[0];
  var s = i[1];
  var d = (0, a.useState)(false);
  var f = (0, p.Z)(d, 2);
  var g = f[0];
  var v = f[1];
  var y = (0, a.useRef)(false);
  var h = (0, a.useRef)(null);
  var b = Ti();
  var w = b.locale;
  (0, a.useImperativeHandle)(t, function () {
    return {
      clear: function () {
        s("");
      },
      focus: function () {
        var e;
        if ((e = h.current) !== null && e !== undefined) {
          e.focus();
        }
      },
      blur: function () {
        var e;
        if ((e = h.current) !== null && e !== undefined) {
          e.blur();
        }
      },
      get nativeElement() {
        return h.current;
      }
    };
  });
  function x(e) {
    var t;
    if (!!r.onEnterPress && (e.code === "Enter" || e.keyCode === 13)) {
      r.onEnterPress(e);
    }
    if ((t = r.onKeyDown) !== null && t !== undefined) {
      t.call(r, e);
    }
  }
  function E() {
    var e = o;
    if (r.type === "number") {
      var t = e && Ed(parseFloat(e), r.min, r.max).toString();
      if (Number(e) !== Number(t)) {
        e = t;
      }
    }
    if (e !== o) {
      s(e);
    }
  }
  m(function () {
    var e;
    if (r.enterKeyHint) {
      if ((e = h.current) !== null && e !== undefined) {
        e.setAttribute("enterkeyhint", r.enterKeyHint);
      }
      return function () {
        var e;
        if ((e = h.current) !== null && e !== undefined) {
          e.removeAttribute("enterkeyhint");
        }
      };
    }
  }, [r.enterKeyHint]);
  var k = function () {
    return !!r.clearable && !!o && !r.readOnly && (!r.onlyShowClearWhenFocus || g);
  }();
  return l(r, a.createElement("div", {
    className: u(`${kd}`, r.disabled && `${kd}-disabled`)
  }, a.createElement("input", {
    ref: h,
    className: `${kd}-element`,
    value: o,
    onChange: function (e) {
      s(e.target.value);
    },
    onFocus: function (e) {
      var t;
      v(true);
      if ((t = r.onFocus) !== null && t !== undefined) {
        t.call(r, e);
      }
    },
    onBlur: function (e) {
      var t;
      v(false);
      E();
      if ((t = r.onBlur) !== null && t !== undefined) {
        t.call(r, e);
      }
    },
    id: r.id,
    placeholder: r.placeholder,
    disabled: r.disabled,
    readOnly: r.readOnly,
    maxLength: r.maxLength,
    minLength: r.minLength,
    max: r.max,
    min: r.min,
    autoComplete: r.autoComplete,
    autoFocus: r.autoFocus,
    pattern: r.pattern,
    inputMode: r.inputMode,
    type: r.type,
    name: r.name,
    autoCapitalize: r.autoCapitalize,
    autoCorrect: r.autoCorrect,
    onKeyDown: x,
    onKeyUp: r.onKeyUp,
    onCompositionStart: function (e) {
      var t;
      y.current = true;
      if ((t = r.onCompositionStart) !== null && t !== undefined) {
        t.call(r, e);
      }
    },
    onCompositionEnd: function (e) {
      var t;
      y.current = false;
      if ((t = r.onCompositionEnd) !== null && t !== undefined) {
        t.call(r, e);
      }
    },
    onClick: r.onClick,
    step: r.step,
    role: r.role,
    "aria-valuenow": r["aria-valuenow"],
    "aria-valuemax": r["aria-valuemax"],
    "aria-valuemin": r["aria-valuemin"],
    "aria-label": r["aria-label"]
  }), k && a.createElement("div", {
    className: `${kd}-clear`,
    onMouseDown: function (e) {
      e.preventDefault();
    },
    onClick: function () {
      var e;
      var t;
      s("");
      if ((e = r.onClear) !== null && e !== undefined) {
        e.call(r);
      }
      if (Ja() && y.current) {
        y.current = false;
        if ((t = h.current) !== null && t !== undefined) {
          t.blur();
        }
      }
    },
    "aria-label": w.Input.clear
  }, a.createElement(xd.Z, null))));
});
var Cd = Td;
require("./22474.js");
function Ad(e) {
  var t = e.action;
  return l(e.action, a.createElement(rs, {
    key: t.key,
    onClick: e.onAction,
    className: u("adm-modal-button", {
      "adm-modal-button-primary": e.action.primary
    }),
    fill: e.action.primary ? "solid" : "none",
    size: e.action.primary ? "large" : "middle",
    block: true,
    color: t.danger ? "danger" : "primary",
    loading: "auto",
    disabled: t.disabled
  }, t.text));
}
require("./1414.js");
var _d = "adm-space";
var Od = {
  direction: "horizontal"
};
function Md(e) {
  var t;
  var r = c(Od, e);
  var n = r.direction;
  var i = r.onClick;
  return l(r, a.createElement("div", {
    className: u(_d, (t = {}, (0, o.Z)(t, `${_d}-wrap`, r.wrap), (0, o.Z)(t, `${_d}-block`, r.block), (0, o.Z)(t, `${_d}-${n}`, true), (0, o.Z)(t, `${_d}-align-${r.align}`, !!r.align), (0, o.Z)(t, `${_d}-justify-${r.justify}`, !!r.justify), t)),
    onClick: i
  }, a.Children.map(r.children, function (e) {
    return e !== null && e !== undefined && a.createElement("div", {
      className: `${_d}-item`
    }, e);
  })));
}
var Pd = Md;
var qd = {
  actions: [],
  closeOnAction: false,
  closeOnMaskClick: false,
  getContainer: null
};
function Nd(e) {
  var t = c(qd, e);
  var r = a.createElement(a.Fragment, null, !!t.image && a.createElement("div", {
    className: Rd("image-container")
  }, a.createElement(qs, {
    src: t.image,
    alt: "modal header image",
    width: "100%"
  })), !!t.header && a.createElement("div", {
    className: Rd("header")
  }, a.createElement(Is, null, t.header)), !!t.title && a.createElement("div", {
    className: Rd("title")
  }, t.title), a.createElement("div", {
    className: Rd("content")
  }, typeof t.content === "string" ? a.createElement(Is, null, t.content) : t.content), a.createElement(Pd, {
    direction: "vertical",
    block: true,
    className: u(Rd("footer"), t.actions.length === 0 && Rd("footer-empty"))
  }, t.actions.map(function (e, r) {
    return a.createElement(Ad, {
      key: e.key,
      action: e,
      onAction: function () {
        return (0, Ta.mG)(undefined, undefined, undefined, (0, B.Z)().mark(function n() {
          var i;
          var o;
          var a;
          return (0, B.Z)().wrap(function (n) {
            while (1) {
              switch (n.prev = n.next) {
                case 0:
                  n.next = 2;
                  return Promise.all([(i = e.onClick) === null || i === undefined ? undefined : i.call(e), (o = t.onAction) === null || o === undefined ? undefined : o.call(t, e, r)]);
                case 2:
                  if (t.closeOnAction) {
                    if ((a = t.onClose) !== null && a !== undefined) {
                      a.call(t);
                    }
                  }
                case 3:
                case "end":
                  return n.stop();
              }
            }
          }, n);
        }));
      }
    });
  })));
  return a.createElement(Fs, {
    className: u(Rd(), t.className),
    style: t.style,
    afterClose: t.afterClose,
    afterShow: t.afterShow,
    showCloseButton: t.showCloseButton,
    closeOnMaskClick: t.closeOnMaskClick,
    onClose: t.onClose,
    visible: t.visible,
    getContainer: t.getContainer,
    bodyStyle: t.bodyStyle,
    bodyClassName: u(Rd("body"), t.image && Rd("with-image"), t.bodyClassName),
    maskStyle: t.maskStyle,
    maskClassName: t.maskClassName,
    stopPropagation: t.stopPropagation,
    disableBodyScroll: t.disableBodyScroll,
    destroyOnClose: t.destroyOnClose,
    forceRender: t.forceRender
  }, r);
}
function Rd(e = "") {
  return "adm-modal" + (e && "-") + e;
}
var Id = new Set();
function jd(e) {
  var t = Za(a.createElement(Nd, Object.assign({}, e, {
    afterClose: function () {
      var r;
      Id.delete(t.close);
      if ((r = e.afterClose) !== null && r !== undefined) {
        r.call(e);
      }
    }
  })));
  Id.add(t.close);
  return t;
}
function Dd(e) {
  var t = {
    confirmText: ki().locale.Modal.ok
  };
  var r = c(t, e);
  return new Promise(function (e) {
    jd(Object.assign(Object.assign({}, r), {
      closeOnAction: true,
      actions: [{
        key: "confirm",
        text: r.confirmText,
        primary: true
      }],
      onAction: r.onConfirm,
      onClose: function () {
        var t;
        if ((t = r.onClose) !== null && t !== undefined) {
          t.call(r);
        }
        e();
      }
    }));
  });
}
var Ld = {
  confirmText: "确认",
  cancelText: "取消"
};
function Fd(e) {
  var t = this;
  var r = ki();
  var n = r.locale;
  var i = c(Ld, {
    confirmText: n.common.confirm,
    cancelText: n.common.cancel
  }, e);
  return new Promise(function (e) {
    jd(Object.assign(Object.assign({}, i), {
      closeOnAction: true,
      onClose: function () {
        var t;
        if ((t = i.onClose) !== null && t !== undefined) {
          t.call(i);
        }
        e(false);
      },
      actions: [{
        key: "confirm",
        text: i.confirmText,
        primary: true,
        onClick: function () {
          return (0, Ta.mG)(t, undefined, undefined, (0, B.Z)().mark(function t() {
            var r;
            return (0, B.Z)().wrap(function (t) {
              while (1) {
                switch (t.prev = t.next) {
                  case 0:
                    t.next = 2;
                    if ((r = i.onConfirm) === null || r === undefined) {
                      return undefined;
                    } else {
                      return r.call(i);
                    }
                  case 2:
                    e(true);
                  case 3:
                  case "end":
                    return t.stop();
                }
              }
            }, t);
          }));
        }
      }, {
        key: "cancel",
        text: i.cancelText,
        onClick: function () {
          return (0, Ta.mG)(t, undefined, undefined, (0, B.Z)().mark(function t() {
            var r;
            return (0, B.Z)().wrap(function (t) {
              while (1) {
                switch (t.prev = t.next) {
                  case 0:
                    t.next = 2;
                    if ((r = i.onCancel) === null || r === undefined) {
                      return undefined;
                    } else {
                      return r.call(i);
                    }
                  case 2:
                    e(false);
                  case 3:
                  case "end":
                    return t.stop();
                }
              }
            }, t);
          }));
        }
      }]
    }));
  });
}
function Zd() {
  Id.forEach(function (e) {
    e();
  });
}
var zd = i(Nd, {
  show: jd,
  alert: Dd,
  confirm: Fd,
  clear: Zd
});
require("./97208.js");
var Ud = require("./60609.js");
var Bd = "adm-nav-bar";
var Vd = {
  backArrow: true
};
function Hd(e) {
  var t = c(Vd, e);
  var r = t.back;
  var n = t.backArrow;
  return l(t, a.createElement("div", {
    className: u(Bd)
  }, a.createElement("div", {
    className: `${Bd}-left`,
    role: "button"
  }, r !== null && a.createElement("div", {
    className: `${Bd}-back`,
    onClick: t.onBack
  }, n && a.createElement("span", {
    className: `${Bd}-back-arrow`
  }, n === true ? a.createElement(Ud.Z, null) : n), a.createElement("span", {
    "aria-hidden": "true"
  }, r)), t.left), a.createElement("div", {
    className: `${Bd}-title`
  }, t.children), a.createElement("div", {
    className: `${Bd}-right`
  }, t.right)));
}
var Wd = Hd;
require("./43004.js");
function Yd(e, t, r) {
  return e * t * r / (t + r * e);
}
function Qd(e, t, r, n, i = 0.15) {
  if (i === 0) {
    return Ed(e, t, r);
  } else if (e < t) {
    return -Yd(t - e, n, i) + t;
  } else if (e > r) {
    return +Yd(e - r, n, i) + r;
  } else {
    return e;
  }
}
var $d = require("./15154.js");
var Gd = $d;
function Kd(e) {
  if (e === null || e === undefined || e === "") {
    if (zl) {
      Bl("Global", "Something went wrong when calculating CSS length. Please report an issue at https://github.com/ant-design/ant-design-mobile/issues/new/choose");
    }
    return 0;
  }
  var t = e.trim();
  if (t.endsWith("px")) {
    return parseFloat(t);
  } else if (t.endsWith("rem")) {
    return parseFloat(t) * parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  } else if (t.endsWith("vw")) {
    return parseFloat(t) * window.innerWidth / 100;
  } else {
    if (zl) {
      Bl("Global", `You are using a not supported CSS unit in \`${e}\`. Only \`px\` \`rem\` and \`vw\` are supported.`);
    }
    return 0;
  }
}
var Jd = "adm-picker-view";
var Xd = (0, a.memo)(function (e) {
  var t = e.value;
  var r = e.column;
  var n = e.renderLabel;
  function i(t) {
    e.onSelect(t, e.index);
  }
  var s = Fn(function () {
    return {
      from: {
        y: 0
      },
      config: {
        tension: 400,
        mass: 0.8
      }
    };
  });
  var l = (0, p.Z)(s, 2);
  var c = l[0].y;
  var d = l[1];
  var f = (0, a.useRef)(false);
  var g = (0, a.useRef)(null);
  var v = (0, a.useRef)(null);
  var y = (0, a.useRef)(34);
  function h(e) {
    var t = e * -y.current;
    d.start({
      y: t
    });
    var n = r[e];
    if (n) {
      i(n.value);
    }
  }
  m(function () {
    var e = v.current;
    if (e) {
      y.current = Kd(window.getComputedStyle(e).getPropertyValue("height"));
    }
  });
  m(function () {
    if (!f.current && t !== null) {
      var e = r.findIndex(function (e) {
        return e.value === t;
      });
      if (!(e < 0)) {
        var n = e * -y.current;
        d.start({
          y: n,
          immediate: c.goal !== n
        });
      }
    }
  }, [t, r]);
  m(function () {
    if (r.length === 0) {
      if (t !== null) {
        i(null);
      }
    } else if (!r.some(function (e) {
      return e.value === t;
    })) {
      var e = r[0];
      i(e.value);
    }
  }, [r, t]);
  function b(e) {
    var t = (0, p.Z)(e.direction, 2);
    var r = t[1];
    var n = (0, p.Z)(e.distance, 2);
    var i = n[1];
    var o = (0, p.Z)(e.velocity, 2);
    var a = o[1];
    var s = (0, p.Z)(e.offset, 2);
    var u = s[1];
    var l = e.last;
    return {
      direction: r,
      distance: i,
      velocity: a,
      offset: u,
      last: l
    };
  }
  function w(e) {
    f.current = true;
    var t = -(r.length - 1) * y.current;
    var n = 0;
    var i = b(e);
    var o = i.direction;
    var a = i.last;
    var s = i.velocity;
    var u = i.offset;
    if (a) {
      f.current = false;
      var l = u + s * o * 50;
      var c = Ed(l, t, n);
      var p = -Math.round(c / y.current);
      h(p);
    } else {
      var g = u;
      d.start({
        y: Qd(g, t, n, y.current * 50, 0.2)
      });
    }
  }
  function x(e) {
    f.current = true;
    var t = -(r.length - 1) * y.current;
    var n = 0;
    var i = b(e);
    var o = i.direction;
    var a = i.last;
    var s = i.velocity;
    var u = i.distance;
    var l = -o;
    var p = c.get();
    if (a) {
      f.current = false;
      var g = s * l * 50;
      var m = p + u * l + g;
      var v = Ed(m, t, n);
      var w = -Math.round(v / y.current);
      h(w);
    } else {
      var x = p + u * l;
      d.start({
        y: Qd(x, t, n, y.current * 50, 0.2)
      });
    }
  }
  ma(function (e) {
    e.event.stopPropagation();
    w(e);
  }, {
    axis: "y",
    from: function () {
      return [0, c.get()];
    },
    filterTaps: true,
    pointer: {
      touch: true
    },
    target: g
  });
  va(function (e) {
    e.event.stopPropagation();
    x(e);
  }, {
    target: e.mouseWheel ? g : undefined,
    axis: "y",
    from: function () {
      return [0, c.get()];
    },
    preventDefault: true,
    eventOptions: T ? {
      passive: false
    } : undefined
  });
  var E = null;
  function k() {
    if (E === null) {
      return null;
    }
    var e = r[E];
    var t = E - 1;
    var n = E + 1;
    var i = r[t];
    var o = r[n];
    return a.createElement("div", {
      className: `${Jd}-column-accessible`
    }, a.createElement("div", {
      className: `${Jd}-column-accessible-current`,
      role: "button",
      "aria-label": e ? `当前选择的是：${e.label}` : "当前未选择"
    }, "-"), a.createElement("div", {
      className: `${Jd}-column-accessible-button`,
      onClick: function () {
        if (i) {
          h(t);
        }
      },
      role: i ? "button" : "text",
      "aria-label": i ? `选择上一项：${i.label}` : "没有上一项"
    }, "-"), a.createElement("div", {
      className: `${Jd}-column-accessible-button`,
      onClick: function () {
        if (o) {
          h(n);
        }
      },
      role: o ? "button" : "text",
      "aria-label": o ? `选择下一项：${o.label}` : "没有下一项"
    }, "-"));
  }
  return a.createElement("div", {
    className: `${Jd}-column`
  }, a.createElement("div", {
    className: `${Jd}-item-height-measure`,
    ref: v
  }), a.createElement(fi.div, {
    ref: g,
    style: {
      translateY: c
    },
    className: `${Jd}-column-wheel`,
    "aria-hidden": true
  }, r.map(function (t, r) {
    var s = e.value === t.value;
    function l() {
      f.current = false;
      h(r);
    }
    if (s) {
      E = r;
    }
    return a.createElement("div", {
      key: t.key ?? t.value,
      "data-selected": s,
      className: u(`${Jd}-column-item`, (0, o.Z)({}, `${Jd}-column-item-active`, s)),
      onClick: l,
      "aria-hidden": !s,
      "aria-label": s ? "active" : ""
    }, a.createElement("div", {
      className: `${Jd}-column-item-label`
    }, n(t)));
  })), k());
}, function (e, t) {
  return e.index === t.index && e.value === t.value && e.onSelect === t.onSelect && e.renderLabel === t.renderLabel && e.mouseWheel === t.mouseWheel && !!Gd(e.column, t.column);
});
function ef(e) {
  var t = null;
  return function () {
    if (t === null) {
      t = e();
    }
    return t;
  };
}
function tf(e, t) {
  var r = ef(function () {
    var r = typeof e === "function" ? e(t) : e;
    return r.map(function (e) {
      return e.map(function (e) {
        if (typeof e === "string") {
          return {
            label: e,
            value: e
          };
        } else {
          return e;
        }
      });
    });
  });
  var n = ef(function () {
    return t.map(function (e, t) {
      var n;
      var i = r()[t];
      if (i && (n = i.find(function (t) {
        return t.value === e;
      })) !== null && n !== undefined) {
        return n;
      } else {
        return null;
      }
    });
  });
  var i = {
    get columns() {
      return r();
    },
    get items() {
      return n();
    }
  };
  return i;
}
function rf(e, t) {
  return (0, a.useMemo)(function () {
    return tf(e, t);
  }, [e, t]);
}
Xd.displayName = "Wheel";
var nf = require("./89120.js");
var of = nf;
function af(e, t) {
  if (gs) {
    if (!ls(e)) {
      console.error(`useDebounceFn expected parameter is a function, got ${typeof e}`);
    }
  }
  var n = ds(e);
  var i = t?.wait ?? 1000;
  var o = (0, a.useMemo)(function () {
    return of(function () {
      var e = [];
      for (var t = 0; t < arguments.length; t++) {
        e[t] = arguments[t];
      }
      return n.current.apply(n, (0, Ta.ev)([], (0, Ta.CR)(e), false));
    }, i, t);
  }, []);
  vs(function () {
    o.cancel();
  });
  return {
    run: o,
    cancel: o.cancel,
    flush: o.flush
  };
}
var sf = af;
var uf = Ts(a.useEffect);
function lf(e, t, r) {
  var n = (0, Ta.CR)((0, a.useState)({}), 2);
  var i = n[0];
  var o = n[1];
  var s = sf(function () {
    o({});
  }, r).run;
  (0, a.useEffect)(function () {
    return s();
  }, t);
  uf(e, [i]);
}
var cf = lf;
function pf(e) {
  return e.label;
}
require("./74738.js");
var df = require("./74241.js");
var ff = false;
var gf = new Set();
function mf() {
  return ff;
}
function vf(e) {
  gf.add(e);
  return function () {
    gf.delete(e);
  };
}
function yf() {
  return (0, df.useSyncExternalStore)(vf, mf, mf);
}
var hf = "adm-spin-loading";
var bf = {
  default: "var(--adm-color-weak)",
  primary: "var(--adm-color-primary)",
  white: "var(--adm-color-white)"
};
var wf = {
  color: "default"
};
var xf = 94.2477796076937;
var Ef = (0, a.memo)(function (e) {
  var r = c(wf, e);
  var n = yf();
  var i = Fn({
    cancel: n,
    loop: {
      reverse: true
    },
    from: {
      percent: 80
    },
    to: {
      percent: 30
    },
    config: {
      duration: 1200
    }
  });
  var o = i.percent;
  return l(r, a.createElement(fi.div, {
    className: hf,
    style: {
      "--color": bf[r.color] ?? r.color,
      "--percent": o
    }
  }, a.createElement("svg", {
    className: `${hf}-svg`,
    viewBox: "0 0 32 32"
  }, a.createElement(fi.circle, {
    className: `${hf}-fill`,
    fill: "transparent",
    strokeWidth: "2",
    strokeDasharray: xf,
    strokeDashoffset: o,
    strokeLinecap: "square",
    r: 15,
    cx: 16,
    cy: 16
  }))));
});
var kf = Ef;
var Sf = "adm-picker-view";
var Tf = {
  defaultValue: [],
  renderLabel: pf,
  mouseWheel: false,
  loadingContent: a.createElement("div", {
    className: `${Sf}-loading-content`
  }, a.createElement(kf, null))
};
var Cf = (0, a.memo)(function (e) {
  var t = c(Tf, e);
  var r = (0, a.useState)(t.value === undefined ? t.defaultValue : t.value);
  var n = (0, p.Z)(r, 2);
  var i = n[0];
  var o = n[1];
  (0, a.useEffect)(function () {
    if (t.value !== undefined && t.value !== i) {
      o(t.value);
    }
  }, [t.value]);
  (0, a.useEffect)(function () {
    if (t.value !== i) {
      var e = window.setTimeout(function () {
        if (t.value !== undefined && t.value !== i) {
          o(t.value);
        }
      }, 1000);
      return function () {
        window.clearTimeout(e);
      };
    }
  }, [t.value, i]);
  var s = rf(t.columns, i);
  var u = s.columns;
  cf(function () {
    var e;
    if (t.value !== i) {
      if ((e = t.onChange) !== null && e !== undefined) {
        e.call(t, i, s);
      }
    }
  }, [i], {
    wait: 0,
    leading: false,
    trailing: true
  });
  var d = (0, a.useCallback)(function (e, t) {
    o(function (r) {
      var n = (0, j.Z)(r);
      n[t] = e;
      return n;
    });
  }, []);
  return l(t, a.createElement("div", {
    className: `${Sf}`
  }, t.loading ? t.loadingContent : a.createElement(a.Fragment, null, u.map(function (e, r) {
    return a.createElement(Xd, {
      key: r,
      index: r,
      column: e,
      value: i[r],
      onSelect: d,
      renderLabel: t.renderLabel,
      mouseWheel: t.mouseWheel
    });
  }), a.createElement("div", {
    className: `${Sf}-mask`
  }, a.createElement("div", {
    className: `${Sf}-mask-top`
  }), a.createElement("div", {
    className: `${Sf}-mask-middle`
  }), a.createElement("div", {
    className: `${Sf}-mask-bottom`
  })))));
});
Cf.displayName = "PickerView";
require("./71465.js");
var Af = Cf;
var _f = "adm-picker";
var Of = {
  defaultValue: [],
  closeOnMaskClick: true,
  renderLabel: pf,
  destroyOnClose: false,
  forceRender: false
};
var Mf = (0, a.memo)((0, a.forwardRef)(function (e, t) {
  var r;
  var n = Ti();
  var i = n.locale;
  var o = c(Of, {
    confirmText: i.common.confirm,
    cancelText: i.common.cancel
  }, e);
  var s = Jl({
    value: o.visible,
    defaultValue: false,
    onChange: function (e) {
      var t;
      if (e === false) {
        if ((t = o.onClose) !== null && t !== undefined) {
          t.call(o);
        }
      }
    }
  });
  var d = (0, p.Z)(s, 2);
  var f = d[0];
  var g = d[1];
  var m = {
    toggle: function () {
      g(function (e) {
        return !e;
      });
    },
    open: function () {
      g(true);
    },
    close: function () {
      g(false);
    }
  };
  (0, a.useImperativeHandle)(t, function () {
    return m;
  });
  var v = Jl(Object.assign(Object.assign({}, o), {
    onChange: function (e) {
      var t;
      var r = tf(o.columns, e);
      if ((t = o.onConfirm) !== null && t !== undefined) {
        t.call(o, e, r);
      }
    }
  }));
  var y = (0, p.Z)(v, 2);
  var h = y[0];
  var b = y[1];
  var w = rf(o.columns, h);
  var x = (0, a.useState)(h);
  var E = (0, p.Z)(x, 2);
  var k = E[0];
  var S = E[1];
  (0, a.useEffect)(function () {
    if (k !== h) {
      S(h);
    }
  }, [f]);
  (0, a.useEffect)(function () {
    if (!f) {
      S(h);
    }
  }, [h]);
  var T = Kl(function (e, t) {
    var r;
    S(e);
    if (f) {
      if ((r = o.onSelect) !== null && r !== undefined) {
        r.call(o, e, t);
      }
    }
  });
  var C = l(o, a.createElement("div", {
    className: _f
  }, a.createElement("div", {
    className: `${_f}-header`
  }, a.createElement("a", {
    role: "button",
    className: `${_f}-header-button`,
    onClick: function () {
      var e;
      if ((e = o.onCancel) !== null && e !== undefined) {
        e.call(o);
      }
      g(false);
    }
  }, o.cancelText), a.createElement("div", {
    className: `${_f}-header-title`
  }, o.title), a.createElement("a", {
    role: "button",
    className: u(`${_f}-header-button`, o.loading && `${_f}-header-button-disabled`),
    onClick: function () {
      if (!o.loading) {
        b(k, true);
        g(false);
      }
    },
    "aria-disabled": o.loading
  }, o.confirmText)), a.createElement("div", {
    className: `${_f}-body`
  }, a.createElement(Af, {
    loading: o.loading,
    loadingContent: o.loadingContent,
    columns: o.columns,
    renderLabel: o.renderLabel,
    value: k,
    mouseWheel: o.mouseWheel,
    onChange: T
  }))));
  var A = a.createElement(xa, {
    style: o.popupStyle,
    className: u(`${_f}-popup`, o.popupClassName),
    visible: f,
    position: "bottom",
    onMaskClick: function () {
      var e;
      if (o.closeOnMaskClick) {
        if ((e = o.onCancel) !== null && e !== undefined) {
          e.call(o);
        }
        g(false);
      }
    },
    getContainer: o.getContainer,
    destroyOnClose: o.destroyOnClose,
    afterShow: o.afterShow,
    afterClose: o.afterClose,
    onClick: o.onClick,
    forceRender: o.forceRender,
    stopPropagation: o.stopPropagation
  }, C, a.createElement(Sa, {
    position: "bottom"
  }));
  return a.createElement(a.Fragment, null, A, (r = o.children) === null || r === undefined ? undefined : r.call(o, w.items, m));
}));
function Pf(e) {
  return new Promise(function (t) {
    function r() {
      var r = (0, a.useState)(false);
      var i = (0, p.Z)(r, 2);
      var o = i[0];
      var s = i[1];
      (0, a.useEffect)(function () {
        s(true);
      }, []);
      return a.createElement(Mf, Object.assign({}, e, {
        visible: o,
        onConfirm: function (r, n) {
          var i;
          if ((i = e.onConfirm) !== null && i !== undefined) {
            i.call(e, r, n);
          }
          t(r);
        },
        onClose: function () {
          var r;
          if ((r = e.onClose) !== null && r !== undefined) {
            r.call(e);
          }
          s(false);
          t(null);
        },
        afterClose: function () {
          var t;
          if ((t = e.afterClose) !== null && t !== undefined) {
            t.call(e);
          }
          n();
        }
      }));
    }
    var n = Fa(a.createElement(r, null));
  });
}
Mf.displayName = "Picker";
var qf = i(Mf, {
  prompt: Pf
});
require("./99115.js");
var Nf = "adm-progress-bar";
var Rf = {
  percent: 0,
  rounded: true,
  text: false
};
function If(e) {
  var t = c(Rf, e);
  var r = {
    width: `${t.percent}%`
  };
  var n = function () {
    if (t.text === true) {
      return `${t.percent}%`;
    } else if (typeof t.text === "function") {
      return t.text(t.percent);
    } else {
      return t.text;
    }
  }();
  return l(t, a.createElement("div", {
    className: u(Nf, t.rounded && `${Nf}-rounded`)
  }, a.createElement("div", {
    className: `${Nf}-trail`
  }, a.createElement("div", {
    className: `${Nf}-fill`,
    style: r
  })), iu(n) && a.createElement("div", {
    className: `${Nf}-text`
  }, n)));
}
var jf = If;
require("./77383.js");
function Df(e) {
  return new Promise(function (t) {
    return setTimeout(t, e);
  });
}
var Lf = "adm-pull-to-refresh";
var Ff = {
  pullingText: "下拉刷新",
  canReleaseText: "释放立即刷新",
  refreshingText: "加载中...",
  completeText: "刷新成功",
  completeDelay: 500,
  disabled: false,
  onRefresh: function () {}
};
function Zf(e) {
  var n = Ti();
  var i = n.locale;
  var o = c(Ff, {
    refreshingText: `${i.common.loading}...`,
    pullingText: i.PullToRefresh.pulling,
    canReleaseText: i.PullToRefresh.canRelease,
    completeText: i.PullToRefresh.complete
  }, e);
  var s = o.headHeight ?? Hp(40);
  var u = o.threshold ?? Hp(60);
  var l = (0, a.useState)("pulling");
  var d = (0, p.Z)(l, 2);
  var f = d[0];
  var g = d[1];
  var m = Fn(function () {
    return {
      from: {
        height: 0
      },
      config: {
        tension: 300,
        friction: 30,
        round: true,
        clamp: true
      }
    };
  });
  var v = (0, p.Z)(m, 2);
  var y = v[0];
  var h = v[1];
  var b = (0, a.useRef)(null);
  var w = (0, a.useRef)(false);
  (0, a.useEffect)(function () {
    var e;
    if ((e = b.current) !== null && e !== undefined) {
      e.addEventListener("touchmove", function () {});
    }
  }, []);
  function x() {
    return new Promise(function (e) {
      h.start({
        to: {
          height: 0
        },
        onResolve: function () {
          g("pulling");
          e();
        }
      });
    });
  }
  function E() {
    return (0, Ta.mG)(this, undefined, undefined, (0, B.Z)().mark(function e() {
      return (0, B.Z)().wrap(function (e) {
        while (1) {
          switch (e.prev = e.next) {
            case 0:
              h.start({
                height: s
              });
              g("refreshing");
              e.prev = 2;
              e.next = 5;
              return o.onRefresh();
            case 5:
              g("complete");
              e.next = 12;
              break;
            case 8:
              e.prev = 8;
              e.t0 = e.catch(2);
              x();
              throw e.t0;
            case 12:
              if (!(o.completeDelay > 0)) {
                e.next = 15;
                break;
              }
              e.next = 15;
              return Df(o.completeDelay);
            case 15:
              x();
            case 16:
            case "end":
              return e.stop();
          }
        }
      }, e, null, [[2, 8]]);
    }));
  }
  ma(function (e) {
    if (f !== "refreshing" && f !== "complete") {
      var t = e.event;
      if (e.last) {
        w.current = false;
        if (f === "canRelease") {
          E();
        } else {
          h.start({
            height: 0
          });
        }
        return;
      }
      var r = (0, p.Z)(e.movement, 2);
      var n = r[1];
      var i = Math.ceil(n);
      if (e.first && i > 0) {
        function o(e) {
          if ("scrollTop" in e) {
            return e.scrollTop;
          } else {
            return e.scrollY;
          }
        }
        var a = e.event.target;
        if (!a || !(a instanceof Element)) {
          return;
        }
        var l = S(a);
        while (1) {
          if (!l) {
            return;
          }
          var c = o(l);
          if (c > 0) {
            return;
          }
          if (l instanceof Window) {
            break;
          }
          l = S(l.parentNode);
        }
        w.current = true;
      }
      if (w.current) {
        if (t.cancelable) {
          t.preventDefault();
        }
        t.stopPropagation();
        var d = Math.max(Qd(i, 0, 0, s * 5, 0.5), 0);
        h.start({
          height: d
        });
        g(d > u ? "canRelease" : "pulling");
      }
    }
  }, {
    pointer: {
      touch: true
    },
    axis: "y",
    target: b,
    enabled: !o.disabled,
    eventOptions: T ? {
      passive: false
    } : undefined
  });
  function k() {
    var e;
    if (o.renderText) {
      if ((e = o.renderText) === null || e === undefined) {
        return undefined;
      } else {
        return e.call(o, f);
      }
    } else if (f === "pulling") {
      return o.pullingText;
    } else if (f === "canRelease") {
      return o.canReleaseText;
    } else if (f === "refreshing") {
      return o.refreshingText;
    } else if (f === "complete") {
      return o.completeText;
    } else {
      return undefined;
    }
  }
  return a.createElement(fi.div, {
    ref: b,
    className: Lf
  }, a.createElement(fi.div, {
    style: y,
    className: `${Lf}-head`
  }, a.createElement("div", {
    className: `${Lf}-head-content`,
    style: {
      height: s
    }
  }, k())), a.createElement("div", {
    className: `${Lf}-content`
  }, o.children));
}
var zf = Zf;
require("./11212.js");
require("./92461.js");
var Uf = "adm-grid";
function Bf(e) {
  var t = {
    "--columns": e.columns.toString()
  };
  var r = e.gap;
  if (r !== undefined) {
    if (Array.isArray(r)) {
      t["--gap-horizontal"] = us(r[0]);
      t["--gap-vertical"] = us(r[1]);
    } else {
      t["--gap"] = us(r);
    }
  }
  return l(e, a.createElement("div", {
    className: Uf,
    style: t
  }, e.children));
}
function Vf(e) {
  var t = c({
    span: 1
  }, e);
  var r = {
    "--item-span": t.span
  };
  return l(t, a.createElement("div", {
    className: `${Uf}-item`,
    style: r,
    onClick: t.onClick
  }, t.children));
}
var Hf = i(Bf, {
  Item: Vf
});
var Wf = (0, a.memo)(function () {
  return a.createElement("svg", {
    width: "17px",
    height: "13px",
    viewBox: "0 0 17 13",
    version: "1.1",
    xmlns: "http://www.w3.org/2000/svg"
  }, a.createElement("g", {
    stroke: "none",
    strokeWidth: "1",
    fill: "none",
    fillRule: "evenodd",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, a.createElement("g", {
    transform: "translate(-2832.000000, -1103.000000)",
    stroke: "#FFFFFF",
    strokeWidth: "3"
  }, a.createElement("g", {
    transform: "translate(2610.000000, 955.000000)"
  }, a.createElement("g", {
    transform: "translate(24.000000, 91.000000)"
  }, a.createElement("g", {
    transform: "translate(179.177408, 36.687816)"
  }, a.createElement("polyline", {
    points: "34.2767388 22 24.797043 31.4796958 21 27.6826527"
  })))))));
});
function Yf(e = {}) {
  var t = (0, a.useMemo)(function () {
    var t = e.label;
    var r = t === undefined ? "label" : t;
    var n = e.value;
    var i = n === undefined ? "value" : n;
    var o = e.disabled;
    var a = o === undefined ? "disabled" : o;
    var s = e.children;
    var u = s === undefined ? "children" : s;
    return [r, i, u, a];
  }, [JSON.stringify(e)]);
  return t;
}
var Qf = "adm-selector";
var $f = {
  multiple: false,
  defaultValue: [],
  showCheckMark: true
};
function Gf(e) {
  var t = c($f, e);
  var r = Yf(t.fieldNames);
  var n = (0, p.Z)(r, 4);
  var i = n[0];
  var s = n[1];
  var d = n[3];
  var f = Jl({
    value: t.value,
    defaultValue: t.defaultValue,
    onChange: function (e) {
      var r;
      var n = {
        get items() {
          return t.options.filter(function (t) {
            return e.includes(t[s]);
          });
        }
      };
      if ((r = t.onChange) !== null && r !== undefined) {
        r.call(t, e, n);
      }
    }
  });
  var g = (0, p.Z)(f, 2);
  var m = g[0];
  var v = g[1];
  var y = Ti();
  var h = y.locale;
  var b = t.options.map(function (e) {
    var r;
    var n = (m || []).includes(e[s]);
    var l = e[d] || t.disabled;
    var c = u(`${Qf}-item`, (r = {}, (0, o.Z)(r, `${Qf}-item-active`, n && !t.multiple), (0, o.Z)(r, `${Qf}-item-multiple-active`, n && t.multiple), (0, o.Z)(r, `${Qf}-item-disabled`, l), r));
    return a.createElement("div", {
      key: e[s],
      className: c,
      onClick: function () {
        if (!l) {
          if (t.multiple) {
            var r = n ? m.filter(function (t) {
              return t !== e[s];
            }) : [].concat((0, j.Z)(m), [e[s]]);
            v(r);
          } else {
            var i = n ? [] : [e[s]];
            v(i);
          }
        }
      },
      role: "option",
      "aria-selected": n && !t.multiple || n && t.multiple
    }, e[i], e.description && a.createElement("div", {
      className: `${Qf}-item-description`
    }, e.description), n && t.showCheckMark && a.createElement("div", {
      className: `${Qf}-check-mark-wrapper`
    }, a.createElement(Wf, null)));
  });
  return l(t, a.createElement("div", {
    className: Qf,
    role: "listbox",
    "aria-label": h.Selector.name
  }, t.columns ? a.createElement(Hf, {
    columns: t.columns
  }, b) : a.createElement(Pd, {
    wrap: true
  }, b)));
}
var Kf = Gf;
require("./50622.js");
function Jf(e) {
  return l(e, a.createElement("div", {
    className: "adm-swiper-item",
    onClick: e.onClick
  }, e.children));
}
require("./39991.js");
var Xf = "adm-page-indicator";
var eg = {
  color: "primary",
  direction: "horizontal"
};
var tg = (0, a.memo)(function (e) {
  for (var t = c(eg, e), r = [], n = 0; n < t.total; n++) {
    r.push(a.createElement("div", {
      key: n,
      className: u(`${Xf}-dot`, (0, o.Z)({}, `${Xf}-dot-active`, t.current === n))
    }));
  }
  return l(t, a.createElement("div", {
    className: u(Xf, `${Xf}-${t.direction}`, `${Xf}-color-${t.color}`)
  }, r));
});
var rg = tg;
function ng(e) {
  var t = (0, a.useState)(e);
  var r = (0, p.Z)(t, 2);
  var n = r[0];
  var i = r[1];
  var o = (0, a.useRef)(n);
  (0, a.useEffect)(function () {
    o.current = n;
  }, [n]);
  return [n, i, o];
}
function ig(e) {
  var t = (0, Ta.CR)((0, a.useState)(e), 2);
  var r = t[0];
  var n = t[1];
  var i = ds(r);
  var o = (0, a.useCallback)(function () {
    return i.current;
  }, []);
  return [r, n, o];
}
var og = ig;
function ag(e, t) {
  var r = Object.keys(e);
  var n = Object.keys(t);
  var i = new Set([].concat(r, n));
  var o = {};
  i.forEach(function (r) {
    var n = e[r];
    var i = t[r];
    o[r] = typeof n === "function" && typeof i === "function" ? function () {
      n.apply(undefined, arguments);
      i.apply(undefined, arguments);
    } : n || i;
  });
  return o;
}
var sg;
var ug = "adm-swiper";
var lg = {
  mousedown: "onMouseDown",
  mousemove: "onMouseMove",
  mouseup: "onMouseUp"
};
var cg = {
  defaultIndex: 0,
  allowTouchMove: true,
  autoplay: false,
  autoplayInterval: 3000,
  loop: false,
  direction: "horizontal",
  slideSize: 100,
  trackOffset: 0,
  stuckAtBoundary: true,
  rubberband: true,
  stopPropagation: []
};
var pg = (0, a.forwardRef)((0, ss.staged)(function (e, t) {
  var r = c(cg, e);
  var n = r.direction;
  var i = r.total;
  var s = r.children;
  var d = r.indicator;
  var f = (0, a.useState)({});
  var g = (0, p.Z)(f, 1);
  var v = g[0];
  var y = (0, a.useRef)(null);
  var h = n === "vertical";
  var b = r.slideSize / 100;
  var w = r.trackOffset / 100;
  var x = (0, a.useMemo)(function () {
    var e = 0;
    var t = undefined;
    var r = undefined;
    if (typeof s === "function") {
      t = s;
    } else {
      r = a.Children.map(s, function (t) {
        if (a.isValidElement(t)) {
          if (t.type !== Jf) {
            Ul("Swiper", "The children of `Swiper` must be `Swiper.Item` components.");
            return null;
          } else {
            e++;
            return t;
          }
        } else {
          return null;
        }
      });
    }
    return {
      renderChildren: t,
      validChildren: r,
      count: e
    };
  }, [s]);
  var E = x.validChildren;
  var k = x.count;
  var S = x.renderChildren;
  var T = i ?? k;
  if (T === 0 || !E && !S) {
    Ul("Swiper", "`Swiper` needs at least one child.");
    return null;
  } else {
    return function () {
      var e = r.loop;
      if (b * (T - 1) < 1) {
        e = false;
      }
      var s = (0, a.useRef)(null);
      function c() {
        var e = s.current;
        if (!e) {
          return 0;
        }
        var t = h ? e.offsetHeight : e.offsetWidth;
        return t * r.slideSize / 100;
      }
      var f = og(r.defaultIndex);
      var g = (0, p.Z)(f, 3);
      var x = g[0];
      var k = g[1];
      var C = g[2];
      var A = ng(false);
      var _ = (0, p.Z)(A, 3);
      var O = _[0];
      var M = _[1];
      var P = _[2];
      function q(e) {
        var t = 0;
        var n = T - 1;
        if (r.stuckAtBoundary) {
          t += w / b;
          n -= (1 - b - w) / b;
        }
        return Ed(e, t, n);
      }
      var N = Fn(function () {
        return {
          position: q(x) * 100,
          config: {
            tension: 200,
            friction: 30
          },
          onRest: function () {
            if (!P.current && e) {
              var t = I.get();
              var r = T * 100;
              var n = dg(t, r);
              if (n !== t) {
                j.start({
                  position: n,
                  immediate: true
                });
              }
            }
          }
        };
      }, [T]);
      var R = (0, p.Z)(N, 2);
      var I = R[0].position;
      var j = R[1];
      var D = (0, a.useRef)(null);
      function L() {
        var e;
        if ((e = D.current) !== null && e !== undefined) {
          e.call(D);
        }
        P.current = false;
      }
      var F = ma(function (e) {
        D.current = e.cancel;
        if (e.intentional && (e.first && !sg && (sg = v), sg === v)) {
          sg = e.last ? undefined : v;
          var t = c();
          if (t) {
            var r = h ? 1 : 0;
            var n = e.offset[r];
            var i = e.direction[r];
            var o = e.velocity[r];
            M(true);
            if (e.last) {
              var a = Math.floor(n / t);
              var s = a + 1;
              var u = Math.round((n + o * 2000 * i) / t);
              Z(Ed(u, a, s));
              window.setTimeout(function () {
                M(false);
              });
            } else {
              j.start({
                position: n * 100 / t,
                immediate: true
              });
            }
          }
        }
      }, {
        transform: function (e) {
          var t = (0, p.Z)(e, 2);
          var r = t[0];
          var n = t[1];
          return [-r, -n];
        },
        from: function () {
          var e = c();
          return [I.get() / 100 * e, I.get() / 100 * e];
        },
        triggerAllEvents: true,
        bounds: function () {
          if (e) {
            return {};
          }
          var t = c();
          var r = q(0) * t;
          var n = q(T - 1) * t;
          if (h) {
            return {
              top: r,
              bottom: n
            };
          } else {
            return {
              left: r,
              right: n
            };
          }
        },
        rubberband: r.rubberband,
        axis: h ? "y" : "x",
        preventScroll: !h,
        pointer: {
          touch: true
        }
      });
      function Z(t) {
        var n;
        var i = arguments.length > 1 && arguments[1] !== undefined && arguments[1];
        var o = Math.round(t);
        var a = e ? dg(o, T) : Ed(o, 0, T - 1);
        if (a !== C()) {
          if ((n = r.onIndexChange) !== null && n !== undefined) {
            n.call(r, a);
          }
        }
        k(a);
        j.start({
          position: (e ? o : q(o)) * 100,
          immediate: i
        });
      }
      function z() {
        Z(Math.round(I.get() / 100) + 1);
      }
      function U() {
        Z(Math.round(I.get() / 100) - 1);
      }
      (0, a.useImperativeHandle)(t, function () {
        return {
          swipeTo: Z,
          swipeNext: z,
          swipePrev: U
        };
      });
      m(function () {
        var e = T - 1;
        if (x > e) {
          Z(e, true);
        }
      });
      var B = r.autoplay;
      var V = r.autoplayInterval;
      var W = function e() {
        y.current = window.setTimeout(function () {
          z();
          e();
        }, V);
      };
      function Y(t, r) {
        var n;
        var i = {};
        if (e) {
          n = {};
          (0, o.Z)(n, h ? "y" : "x", I.to(function (e) {
            var r = t * 100 - e;
            var n = T * 100;
            var i = n / 2;
            r = dg(r + i, n) - i;
            return `${r}%`;
          }));
          (0, o.Z)(n, h ? "top" : "left", `-${t * 100}%`);
          i = n;
        }
        return a.createElement(fi.div, {
          className: u(`${ug}-slide`, (0, o.Z)({}, `${ug}-slide-active`, x === t)),
          style: i,
          key: t
        }, r);
      }
      function Q() {
        if (S && i) {
          var e = 2;
          var t = Math.max(x - e, 0);
          for (var r = Math.min(x + e, i - 1), n = [], o = t; o <= r; o += 1) {
            n.push(Y(o, S(o)));
          }
          return a.createElement(a.Fragment, null, a.createElement("div", {
            className: `${ug}-slide-placeholder`,
            style: {
              width: `${t * 100}%`
            }
          }), n);
        }
        return a.Children.map(E, function (e, t) {
          return Y(t, e);
        });
      }
      function $() {
        if (e) {
          return a.createElement("div", {
            className: `${ug}-track-inner`
          }, Q());
        } else {
          return a.createElement(fi.div, {
            className: `${ug}-track-inner`,
            style: (0, o.Z)({}, h ? "y" : "x", I.to(function (e) {
              return `${-e}%`;
            }))
          }, Q());
        }
      }
      (0, a.useEffect)(function () {
        if (B && !O) {
          W();
          return function () {
            if (y.current) {
              window.clearTimeout(y.current);
            }
          };
        }
      }, [B, V, O, T]);
      var G;
      var K = {
        "--slide-size": `${r.slideSize}%`,
        "--track-offset": `${r.trackOffset}%`
      };
      var J = Object.assign({}, r.allowTouchMove ? F() : {});
      var X = {};
      var ee = (0, H.Z)(r.stopPropagation);
      try {
        for (ee.s(); !(G = ee.n()).done;) {
          var te = G.value;
          var re = lg[te];
          X[re] = function (e) {
            e.stopPropagation();
          };
        }
      } catch (oe) {
        ee.e(oe);
      } finally {
        ee.f();
      }
      var ne = ag(J, X);
      var ie = null;
      if (typeof d === "function") {
        ie = d(T, x);
      } else if (d !== false) {
        ie = a.createElement("div", {
          className: `${ug}-indicator`
        }, a.createElement(rg, Object.assign({}, r.indicatorProps, {
          total: T,
          current: x,
          direction: n
        })));
      }
      return l(r, a.createElement("div", {
        className: u(ug, `${ug}-${n}`),
        style: K
      }, a.createElement("div", Object.assign({
        ref: s,
        className: u(`${ug}-track`, (0, o.Z)({}, `${ug}-track-allow-touch-move`, r.allowTouchMove)),
        onClickCapture: function (e) {
          if (P.current) {
            e.stopPropagation();
          }
          L();
        }
      }, ne), $()), ie));
    };
  }
}));
function dg(e, t) {
  var r = e % t;
  if (r < 0) {
    return r + t;
  } else {
    return r;
  }
}
var fg = i(pg, {
  Item: Jf
});
require("./22689.js");
var gg = (0, a.memo)(function (e) {
  return l(e, a.createElement("svg", {
    width: "28px",
    height: "28px",
    viewBox: "0 0 28 28"
  }, a.createElement("g", {
    stroke: "none",
    strokeWidth: "1",
    fill: "none",
    fillRule: "evenodd"
  }, a.createElement("g", {
    transform: "translate(-137.000000, -840.000000)",
    fill: "#1576FE"
  }, a.createElement("g", {
    transform: "translate(80.000000, 823.000000)"
  }, a.createElement("g", {
    transform: "translate(53.000000, 13.000000)"
  }, a.createElement("path", {
    d: "M17.9996753,31.5 C10.5556724,31.5 4.5,25.4443275 4.5,18.0003247 C4.5,10.5563219 10.5556724,4.5 17.9996753,4.5 C18.5355492,4.5 18.9702974,4.93474816 18.9702974,5.47062208 C18.9702974,6.006496 18.5355492,6.44124416 17.9996753,6.44124416 C11.6261524,6.44124416 6.44124416,11.6267709 6.44124416,18.0002938 C6.44124416,24.3738167 11.6261524,29.5587249 17.9996753,29.5587249 C24.3731982,29.5587249 29.5587249,24.3738167 29.5587249,18.0002938 C29.5587249,14.7964616 28.2778291,11.8169616 25.9523687,9.61220279 C25.5637302,9.24317094 25.5473089,8.62893223 25.9157222,8.23967523 C26.2841356,7.84976878 26.8989928,7.83461537 27.2882498,8.20302872 C30.0042351,10.7787368 31.5,14.2580826 31.5,18.0002938 C31.5,25.4443275 25.4436781,31.5 17.9996753,31.5 Z"
  })))))));
});
var mg = "adm-switch";
var vg = {
  defaultChecked: false
};
function yg(e) {
  var t;
  var r = c(vg, e);
  var n = r.disabled || r.loading || false;
  var i = (0, a.useState)(false);
  var s = (0, p.Z)(i, 2);
  var d = s[0];
  var f = s[1];
  var g = Ti();
  var m = g.locale;
  var v = Jl({
    value: r.checked,
    defaultValue: r.defaultChecked,
    onChange: r.onChange
  });
  var y = (0, p.Z)(v, 2);
  var h = y[0];
  var b = y[1];
  function w() {
    return (0, Ta.mG)(this, undefined, undefined, (0, B.Z)().mark(function e() {
      var t;
      var i;
      return (0, B.Z)().wrap(function (e) {
        while (1) {
          switch (e.prev = e.next) {
            case 0:
              if (!n && !r.loading && !d) {
                e.next = 2;
                break;
              }
              return e.abrupt("return");
            case 2:
              t = !h;
              if (!r.beforeChange) {
                e.next = 15;
                break;
              }
              f(true);
              e.prev = 5;
              e.next = 8;
              return r.beforeChange(t);
            case 8:
              f(false);
              e.next = 15;
              break;
            case 11:
              e.prev = 11;
              e.t0 = e.catch(5);
              f(false);
              throw e.t0;
            case 15:
              i = b(t);
              if (!Ka(i)) {
                e.next = 28;
                break;
              }
              f(true);
              e.prev = 18;
              e.next = 21;
              return i;
            case 21:
              f(false);
              e.next = 28;
              break;
            case 24:
              e.prev = 24;
              e.t1 = e.catch(18);
              f(false);
              throw e.t1;
            case 28:
            case "end":
              return e.stop();
          }
        }
      }, e, null, [[5, 11], [18, 24]]);
    }));
  }
  return l(r, a.createElement("div", {
    onClick: w,
    className: u(mg, (t = {}, (0, o.Z)(t, `${mg}-checked`, h), (0, o.Z)(t, `${mg}-disabled`, n || d), t)),
    role: "switch",
    "aria-label": m.Switch.name,
    "aria-checked": h,
    "aria-disabled": n
  }, a.createElement("div", {
    className: `${mg}-checkbox`
  }, a.createElement("div", {
    className: `${mg}-handle`
  }, (r.loading || d) && a.createElement(gg, {
    className: `${mg}-spin-icon`
  })), a.createElement("div", {
    className: `${mg}-inner`
  }, h ? r.checkedText : r.uncheckedText))));
}
var hg = yg;
require("./57818.js");
require("./35709.js");
var bg = "adm-badge";
var wg = a.createElement(a.Fragment, null);
function xg(e) {
  var t;
  var r = e.content;
  var n = e.color;
  var i = e.children;
  var s = r === wg;
  var c = u(bg, (t = {}, (0, o.Z)(t, `${bg}-fixed`, !!i), (0, o.Z)(t, `${bg}-dot`, s), (0, o.Z)(t, `${bg}-bordered`, e.bordered), t));
  var p = r || r === 0 ? l(e, a.createElement("div", {
    className: c,
    style: {
      "--color": n
    }
  }, !s && a.createElement("div", {
    className: `${bg}-content`
  }, r))) : null;
  if (i) {
    return a.createElement("div", {
      className: u(`${bg}-wrapper`, e.wrapperClassName),
      style: e.wrapperStyle
    }, i, p);
  } else {
    return p;
  }
}
var Eg = i(xg, {
  dot: wg
});
function kg() {
  return null;
}
var Sg = "adm-tab-bar";
var Tg = {
  safeArea: false
};
function Cg(e) {
  var r = c(Tg, e);
  var n = null;
  var i = [];
  jl(r.children, function (e, t) {
    if ((0, a.isValidElement)(e)) {
      var r = e.key;
      if (typeof r === "string") {
        if (t === 0) {
          n = r;
        }
        i.push(e);
      }
    }
  });
  var s = Jl({
    value: r.activeKey,
    defaultValue: r.defaultActiveKey ?? n,
    onChange: function (e) {
      var t;
      if (e !== null) {
        if ((t = r.onChange) !== null && t !== undefined) {
          t.call(r, e);
        }
      }
    }
  });
  var d = (0, p.Z)(s, 2);
  var f = d[0];
  var g = d[1];
  return l(r, a.createElement("div", {
    className: Sg
  }, a.createElement("div", {
    className: `${Sg}-wrap`
  }, i.map(function (e) {
    var t = e.key === f;
    function r() {
      var r = e.props.icon && a.createElement("div", {
        className: `${Sg}-item-icon`
      }, typeof e.props.icon === "function" ? e.props.icon(t) : e.props.icon);
      var n = e.props.title && a.createElement("div", {
        className: u(`${Sg}-item-title`, Boolean(r) && `${Sg}-item-title-with-icon`)
      }, typeof e.props.title === "function" ? e.props.title(t) : e.props.title);
      if (r) {
        return a.createElement(a.Fragment, null, a.createElement(Eg, {
          content: e.props.badge,
          className: `${Sg}-icon-badge`
        }, r), n);
      } else if (n) {
        return a.createElement(Eg, {
          content: e.props.badge,
          className: `${Sg}-title-badge`
        }, n);
      } else {
        return null;
      }
    }
    return l(e.props, a.createElement("div", {
      key: e.key,
      onClick: function () {
        var t = e.key;
        if (t !== undefined && t !== null) {
          g(t.toString());
        }
      },
      className: u(`${Sg}-item`, (0, o.Z)({}, `${Sg}-item-active`, t))
    }, r()));
  })), r.safeArea && a.createElement(Sa, {
    position: "bottom"
  })));
}
var Ag = i(Cg, {
  Item: kg
});
require("./99569.js");
function _g(e, t, r) {
  var n = Kl(e);
  (0, a.useEffect)(function () {
    var e = new MutationObserver(function () {
      n();
    });
    if (t.current) {
      e.observe(t.current, r);
      return function () {
        e.disconnect();
      };
    }
  }, [t]);
}
function Og(e, t) {
  var r = Kl(e);
  m(function () {
    var e = t.current;
    if (e) {
      if (window.ResizeObserver) {
        var n;
        var i = new ResizeObserver(function () {
          n = window.requestAnimationFrame(function () {
            return r(e);
          });
        });
        i.observe(e);
        return function () {
          window.cancelAnimationFrame(n);
          i.disconnect();
        };
      }
      r(e);
    }
  }, [t]);
}
var Mg;
var Pg = "adm-tabs";
function qg() {
  return null;
}
var Ng = {
  activeLineMode: "auto",
  stretch: true,
  direction: "ltr"
};
function Rg(e) {
  var r = c(Ng, e);
  var n = (0, a.useRef)(null);
  var i = (0, a.useRef)(null);
  var s = {};
  var d = null;
  var f = [];
  var g = r.direction === "rtl";
  jl(r.children, function (e, t) {
    if ((0, a.isValidElement)(e)) {
      var r = e.key;
      if (typeof r === "string") {
        if (t === 0) {
          d = r;
        }
        var n = f.push(e);
        s[r] = n - 1;
      }
    }
  });
  var v = Jl({
    value: r.activeKey,
    defaultValue: r.defaultActiveKey ?? d,
    onChange: function (e) {
      var t;
      if (e !== null) {
        if ((t = r.onChange) !== null && t !== undefined) {
          t.call(r, e);
        }
      }
    }
  });
  var y = (0, p.Z)(v, 2);
  var h = y[0];
  var b = y[1];
  var w = Fn(function () {
    return {
      x: 0,
      width: 0,
      config: {
        tension: 300,
        clamp: true
      }
    };
  });
  var x = (0, p.Z)(w, 2);
  var E = x[0];
  var k = E.x;
  var S = E.width;
  var T = x[1];
  var C = Fn(function () {
    return {
      scrollLeft: 0,
      config: {
        tension: 300,
        clamp: true
      }
    };
  });
  var A = (0, p.Z)(C, 2);
  var _ = A[0].scrollLeft;
  var O = A[1];
  var M = Fn(function () {
    return {
      leftMaskOpacity: 0,
      rightMaskOpacity: 0,
      config: {
        clamp: true
      }
    };
  });
  var P = (0, p.Z)(M, 2);
  var q = P[0];
  var N = q.leftMaskOpacity;
  var R = q.rightMaskOpacity;
  var I = P[1];
  function j(e = false, t = false) {
    var o = n.current;
    if (o) {
      var a = s[h];
      if (a !== undefined) {
        var u = i.current;
        if (u) {
          var l = o.children.item(a + 1);
          var c = l.children.item(0);
          var p = c.offsetLeft;
          var d = c.offsetWidth;
          var f = l.offsetLeft;
          var m = l.offsetWidth;
          var v = o.offsetWidth;
          var y = o.scrollWidth;
          var b = o.scrollLeft;
          var w = u.offsetWidth;
          var x = 0;
          var E = 0;
          if (r.activeLineMode === "auto") {
            x = p;
            E = d;
          } else if (r.activeLineMode === "full") {
            x = f;
            E = m;
          } else {
            x = p + (d - w) / 2;
          }
          if (g) {
            var k = ["auto", "full"].includes(r.activeLineMode) ? E : w;
            x = -(v - x - k);
          }
          T.start({
            x: x,
            width: E,
            immediate: e
          });
          var S = y - v;
          if (!(S <= 0)) {
            var C = 0;
            C = g ? -Ed(v / 2 - p + d / 2 - w, 0, S) : Ed(p - (v - d) / 2, 0, S);
            if (!t || r.autoScroll !== false) {
              O.start({
                scrollLeft: C,
                from: {
                  scrollLeft: b
                },
                immediate: e
              });
            }
          }
        }
      } else {
        T.start({
          x: 0,
          width: 0,
          immediate: true
        });
      }
    }
  }
  m(function () {
    j(!k.isAnimating);
  }, []);
  Cs(function () {
    j();
  }, [h]);
  Og(function () {
    j(!k.isAnimating);
  }, n);
  _g(function () {
    j(!k.isAnimating, true);
  }, n, {
    subtree: true,
    childList: true,
    characterData: true
  });
  var D = gd(function (e = false) {
    var t = n.current;
    if (t) {
      var r = t.scrollLeft;
      var i = false;
      var o = false;
      if (g) {
        i = Math.round(-r) + t.offsetWidth < t.scrollWidth;
        o = r < 0;
      } else {
        i = r > 0;
        o = r + t.offsetWidth < t.scrollWidth;
      }
      I.start({
        leftMaskOpacity: i ? 1 : 0,
        rightMaskOpacity: o ? 1 : 0,
        immediate: e
      });
    }
  }, {
    wait: 100,
    trailing: true,
    leading: true
  });
  var L = D.run;
  m(function () {
    L(true);
  }, []);
  return l(r, a.createElement("div", {
    className: Pg,
    style: {
      direction: r.direction
    }
  }, a.createElement("div", {
    className: `${Pg}-header`
  }, a.createElement(fi.div, {
    className: u(`${Pg}-header-mask`, `${Pg}-header-mask-left`),
    style: {
      opacity: N
    }
  }), a.createElement(fi.div, {
    className: u(`${Pg}-header-mask`, `${Pg}-header-mask-right`),
    style: {
      opacity: R
    }
  }), a.createElement(fi.div, {
    className: `${Pg}-tab-list`,
    ref: n,
    scrollLeft: _,
    onScroll: L,
    role: "tablist"
  }, a.createElement(fi.div, {
    ref: i,
    className: `${Pg}-tab-line`,
    style: {
      width: r.activeLineMode === "fixed" ? "var(--fixed-active-line-width, 30px)" : S,
      x: k
    }
  }), f.map(function (e) {
    var t;
    return l(e.props, a.createElement("div", {
      key: e.key,
      className: u(`${Pg}-tab-wrapper`, (0, o.Z)({}, `${Pg}-tab-wrapper-stretch`, r.stretch))
    }, a.createElement("div", {
      onClick: function () {
        var t = e.key;
        if (!e.props.disabled) {
          if (t !== undefined && t !== null) {
            b(t.toString());
          }
        }
      },
      className: u(`${Pg}-tab`, (t = {}, (0, o.Z)(t, `${Pg}-tab-active`, e.key === h), (0, o.Z)(t, `${Pg}-tab-disabled`, e.props.disabled), t)),
      role: "tab",
      "aria-selected": e.key === h
    }, e.props.title)));
  }))), f.map(function (e) {
    if (e.props.children === undefined) {
      return null;
    }
    var t = e.key === h;
    return a.createElement(Ai, {
      key: e.key,
      active: t,
      forceRender: e.props.forceRender,
      destroyOnClose: e.props.destroyOnClose
    }, a.createElement("div", {
      className: `${Pg}-content`,
      style: {
        display: t ? "block" : "none"
      }
    }, e.props.children));
  })));
}
var Ig = i(Rg, {
  Tab: qg
});
require("./60882.js");
(function (e) {
  e[e.HIGH_SURROGATE_START = 55296] = "HIGH_SURROGATE_START";
  e[e.HIGH_SURROGATE_END = 56319] = "HIGH_SURROGATE_END";
  e[e.LOW_SURROGATE_START = 56320] = "LOW_SURROGATE_START";
  e[e.REGIONAL_INDICATOR_START = 127462] = "REGIONAL_INDICATOR_START";
  e[e.REGIONAL_INDICATOR_END = 127487] = "REGIONAL_INDICATOR_END";
  e[e.FITZPATRICK_MODIFIER_START = 127995] = "FITZPATRICK_MODIFIER_START";
  e[e.FITZPATRICK_MODIFIER_END = 127999] = "FITZPATRICK_MODIFIER_END";
  e[e.VARIATION_MODIFIER_START = 65024] = "VARIATION_MODIFIER_START";
  e[e.VARIATION_MODIFIER_END = 65039] = "VARIATION_MODIFIER_END";
  e[e.DIACRITICAL_MARKS_START = 8400] = "DIACRITICAL_MARKS_START";
  e[e.DIACRITICAL_MARKS_END = 8447] = "DIACRITICAL_MARKS_END";
  e[e.SUBDIVISION_INDICATOR_START = 127988] = "SUBDIVISION_INDICATOR_START";
  e[e.TAGS_START = 917504] = "TAGS_START";
  e[e.TAGS_END = 917631] = "TAGS_END";
  e[e.ZWJ = 8205] = "ZWJ";
})(Mg ||= {});
const jg = Object.freeze([776, 2359, 2367, 2984, 3007, 3021, 3633, 3635, 3648, 3657, 4352, 4449, 4520]);
var Dg;
function Lg(e) {
  if (typeof e != "string") {
    throw new TypeError("string cannot be undefined or null");
  }
  const t = [];
  let r = 0;
  let n = 0;
  while (r < e.length) {
    n += Fg(r + n, e);
    if (Yg(e[r + n])) {
      n++;
    }
    if (Vg(e[r + n])) {
      n++;
    }
    if (Hg(e[r + n])) {
      n++;
    }
    if (Qg(e[r + n])) {
      n++;
    } else {
      t.push(e.substring(r, r + n));
      r += n;
      n = 0;
    }
  }
  return t;
}
function Fg(e, t) {
  const r = t[e];
  if (!Zg(r) || e === t.length - 1) {
    return 1;
  }
  const n = r + t[e + 1];
  let i = t.substring(e + 2, e + 5);
  if (zg(n) && zg(i)) {
    return 4;
  } else if (Ug(n) && Wg(i)) {
    return t.slice(e).indexOf(String.fromCodePoint(917631)) + 2;
  } else if (Bg(i)) {
    return 4;
  } else {
    return 2;
  }
}
function Zg(e) {
  return e && Gg(e[0].charCodeAt(0), 55296, 56319);
}
function zg(e) {
  return Gg($g(e), 127462, 127487);
}
function Ug(e) {
  return Gg($g(e), 127988, 127988);
}
function Bg(e) {
  return Gg($g(e), 127995, 127999);
}
function Vg(e) {
  return typeof e == "string" && Gg(e.charCodeAt(0), 65024, 65039);
}
function Hg(e) {
  return typeof e == "string" && Gg(e.charCodeAt(0), 8400, 8447);
}
function Wg(e) {
  const t = e.codePointAt(0);
  return typeof e == "string" && typeof t == "number" && Gg(t, 917504, 917631);
}
function Yg(e) {
  return typeof e == "string" && jg.includes(e.charCodeAt(0));
}
function Qg(e) {
  return typeof e == "string" && e.charCodeAt(0) === 8205;
}
function $g(e) {
  return (e.charCodeAt(0) - 55296 << 10) + (e.charCodeAt(1) - 56320) + 65536;
}
function Gg(e, t, r) {
  return e >= t && e <= r;
}
(function (e) {
  e[e.unit_1 = 1] = "unit_1";
  e[e.unit_2 = 2] = "unit_2";
  e[e.unit_4 = 4] = "unit_4";
})(Dg ||= {});
var Kg = "adm-text-area";
var Jg = {
  rows: 2,
  showCount: false,
  autoSize: false,
  defaultValue: ""
};
var Xg = (0, a.forwardRef)(function (e, t) {
  var r = c(Jg, e);
  var n = r.autoSize;
  var i = r.showCount;
  var o = r.maxLength;
  var s = Jl(Object.assign(Object.assign({}, r), {
    value: r.value === null ? "" : r.value
  }));
  var u = (0, p.Z)(s, 2);
  var d = u[0];
  var f = u[1];
  if (r.value === null) {
    Bl("TextArea", "`value` prop on `TextArea` should not be `null`. Consider using an empty string to clear the component.");
  }
  var g = (0, a.useRef)(null);
  var v = (0, a.useRef)("auto");
  var y = (0, a.useRef)(null);
  (0, a.useImperativeHandle)(t, function () {
    return {
      clear: function () {
        f("");
      },
      focus: function () {
        var e;
        if ((e = g.current) !== null && e !== undefined) {
          e.focus();
        }
      },
      blur: function () {
        var e;
        if ((e = g.current) !== null && e !== undefined) {
          e.blur();
        }
      },
      get nativeElement() {
        return g.current;
      }
    };
  });
  m(function () {
    if (n) {
      var e = g.current;
      var t = y.current;
      if (e && (e.style.height = v.current, t)) {
        var r = t.scrollHeight;
        if (typeof n === "object") {
          var i = window.getComputedStyle(e);
          var o = parseFloat(i.lineHeight);
          if (n.minRows) {
            r = Math.max(r, n.minRows * o);
          }
          if (n.maxRows) {
            r = Math.min(r, n.maxRows * o);
          }
        }
        v.current = `${r}px`;
        e.style.height = `${r}px`;
      }
    }
  }, [d, n]);
  var h;
  var b = (0, a.useRef)(false);
  var w = Lg(d).length;
  if (typeof i === "function") {
    h = i(w, o);
  } else if (i) {
    h = a.createElement("div", {
      className: `${Kg}-count`
    }, o === undefined ? w : w + "/" + o);
  }
  var x = r.rows;
  if (typeof n === "object") {
    if (n.maxRows && x > n.maxRows) {
      x = n.maxRows;
    }
    if (n.minRows && x < n.minRows) {
      x = n.minRows;
    }
  }
  return l(r, a.createElement("div", {
    className: Kg
  }, a.createElement("textarea", {
    ref: g,
    className: `${Kg}-element`,
    rows: x,
    value: d,
    placeholder: r.placeholder,
    onChange: function (e) {
      var t = e.target.value;
      if (o && !b.current) {
        t = Lg(t).slice(0, o).join("");
      }
      f(t);
    },
    id: r.id,
    onCompositionStart: function (e) {
      var t;
      b.current = true;
      if ((t = r.onCompositionStart) !== null && t !== undefined) {
        t.call(r, e);
      }
    },
    onCompositionEnd: function (e) {
      var t;
      b.current = false;
      if (o) {
        var n = e.target.value;
        f(Lg(n).slice(0, o).join(""));
      }
      if ((t = r.onCompositionEnd) !== null && t !== undefined) {
        t.call(r, e);
      }
    },
    autoComplete: r.autoComplete,
    autoFocus: r.autoFocus,
    disabled: r.disabled,
    readOnly: r.readOnly,
    name: r.name,
    onFocus: r.onFocus,
    onBlur: r.onBlur,
    onClick: r.onClick
  }), h, n && a.createElement("textarea", {
    ref: y,
    className: `${Kg}-element ${Kg}-element-hidden`,
    value: d,
    rows: x,
    "aria-hidden": true,
    readOnly: true
  })));
});
Xg.defaultProps = Jg;
var em = Xg;
require("./30853.js");
var tm = require("./37514.js");
var rm = "adm-toast";
var nm = {
  maskClickable: true,
  stopPropagation: ["click"]
};
function im(e) {
  var t = c(nm, e);
  var r = t.maskClickable;
  var n = t.content;
  var i = t.icon;
  var o = t.position;
  var s = (0, a.useMemo)(function () {
    if (i === null || i === undefined) {
      return null;
    }
    switch (i) {
      case "success":
        return a.createElement(tm.Z, {
          className: `${rm}-icon-success`
        });
      case "fail":
        return a.createElement(Di.Z, {
          className: `${rm}-icon-fail`
        });
      case "loading":
        return a.createElement(kf, {
          color: "white",
          className: `${rm}-loading`
        });
      default:
        return i;
    }
  }, [i]);
  var l = (0, a.useMemo)(function () {
    switch (o) {
      case "top":
        return "20%";
      case "bottom":
        return "80%";
      default:
        return "50%";
    }
  }, [o]);
  return a.createElement(ji, {
    visible: t.visible,
    destroyOnClose: true,
    opacity: 0,
    disableBodyScroll: !r,
    getContainer: t.getContainer,
    afterClose: t.afterClose,
    style: Object.assign({
      pointerEvents: r ? "none" : "auto"
    }, t.maskStyle),
    className: u(`${rm}-mask`, t.maskClassName),
    stopPropagation: t.stopPropagation
  }, a.createElement("div", {
    className: u(`${rm}-wrap`)
  }, a.createElement("div", {
    style: {
      top: l
    },
    className: u(`${rm}-main`, `${rm}${i ? "-main-icon" : "-main-text"}`)
  }, s && a.createElement("div", {
    className: `${rm}-icon`
  }, s), a.createElement(Is, null, n))));
}
var om = null;
var am = null;
var sm = {
  duration: 2000,
  position: "center",
  maskClickable: true
};
function um(e) {
  return a.createElement(im, Object.assign({}, e));
}
function lm(e) {
  var t = c(sm, typeof e === "string" ? {
    content: e
  } : e);
  var r = a.createElement(um, Object.assign({}, t, {
    onClose: function () {
      om = null;
    }
  }));
  if (om) {
    om.replace(r);
  } else {
    om = Za(r);
  }
  if (am) {
    window.clearTimeout(am);
  }
  if (t.duration !== 0) {
    am = window.setTimeout(function () {
      cm();
    }, t.duration);
  }
  return om;
}
function cm() {
  if (om !== null && om !== undefined) {
    om.close();
  }
  om = null;
}
function pm(e) {
  if (e.duration !== undefined) {
    sm.duration = e.duration;
  }
  if (e.position !== undefined) {
    sm.position = e.position;
  }
  if (e.maskClickable !== undefined) {
    sm.maskClickable = e.maskClickable;
  }
}
var dm = {
  show: lm,
  clear: cm,
  config: pm
};
var fm = dm;
};
