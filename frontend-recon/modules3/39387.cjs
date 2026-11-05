// webpack module 39387 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return Te;
  }
});
var n = require("./34256.js");
var i = require("./75728.js");
var o = require("./96385.js");
var a = require("./91613.js");
var s = require("./21487.js");
var u = require("./23874.js");
var l = require("./37913.js");
var c = require("./59496.js");
var p = require("./38399.js");
var d = p;
var f = require("./83700.js");
var g = require("./47530.js");
var m = require("./59823.js");
var v = require("./78125.js");
var y = require("./27193.js");
var h = require("./68044.js");
var b = ["visible", "onVisibleChange", "getContainer", "current", "countRender"];
var w = c.createContext({
  previewUrls: new Map(),
  setPreviewUrls: function () {
    return null;
  },
  current: null,
  setCurrent: function () {
    return null;
  },
  setShowPreview: function () {
    return null;
  },
  setMousePosition: function () {
    return null;
  },
  registerImage: function () {
    return function () {
      return null;
    };
  },
  rootClassName: ""
});
var x = w.Provider;
function E(e) {
  var t = e.previewPrefixCls;
  var r = t === undefined ? "rc-image-preview" : t;
  var o = e.children;
  var a = e.icons;
  var s = a === undefined ? {} : a;
  var p = e.preview;
  var d = (0, i.Z)(p) === "object" ? p : {};
  var f = d.visible;
  var m = f === undefined ? undefined : f;
  var v = d.onVisibleChange;
  var y = v === undefined ? undefined : v;
  var h = d.getContainer;
  var w = h === undefined ? undefined : h;
  var E = d.current;
  var k = E === undefined ? 0 : E;
  var S = d.countRender;
  var T = S === undefined ? undefined : S;
  var C = (0, l.Z)(d, b);
  var A = (0, c.useState)(new Map());
  var _ = (0, u.Z)(A, 2);
  var O = _[0];
  var M = _[1];
  var P = (0, c.useState)();
  var q = (0, u.Z)(P, 2);
  var N = q[0];
  var R = q[1];
  var I = (0, g.Z)(!!m, {
    value: m,
    onChange: y
  });
  var j = (0, u.Z)(I, 2);
  var D = j[0];
  var L = j[1];
  var Z = (0, c.useState)(null);
  var z = (0, u.Z)(Z, 2);
  var U = z[0];
  var B = z[1];
  var V = m !== undefined;
  var H = Array.from(O.keys());
  var W = H[k];
  var Y = new Map(Array.from(O).filter(function (e) {
    var t = (0, u.Z)(e, 2);
    var r = t[1].canPreview;
    return !!r;
  }).map(function (e) {
    var t = (0, u.Z)(e, 2);
    var r = t[0];
    var n = t[1].url;
    return [r, n];
  }));
  function Q(e, t) {
    var r = !(arguments.length > 2) || arguments[2] === undefined || arguments[2];
    function n() {
      M(function (t) {
        var r = new Map(t);
        var n = r.delete(e);
        if (n) {
          return r;
        } else {
          return t;
        }
      });
    }
    M(function (n) {
      return new Map(n).set(e, {
        url: t,
        canPreview: r
      });
    });
    return n;
  }
  function $(e) {
    e.stopPropagation();
    L(false);
    B(null);
  }
  c.useEffect(function () {
    R(W);
  }, [W]);
  c.useEffect(function () {
    if (!D && V) {
      R(W);
    }
  }, [W, V, D]);
  return c.createElement(x, {
    value: {
      isPreviewGroup: true,
      previewUrls: Y,
      setPreviewUrls: M,
      current: N,
      setCurrent: R,
      setShowPreview: L,
      setMousePosition: B,
      registerImage: Q
    }
  }, o, c.createElement(F, (0, n.Z)({
    "aria-hidden": !D,
    visible: D,
    prefixCls: r,
    onClose: $,
    mousePosition: U,
    src: Y.get(N),
    icons: s,
    getContainer: w,
    countRender: T
  }, C)));
}
var k = E;
var S = require("./96598.js");
var T = require("./3570.js");
var C = 1;
var A = 50;
var _ = 1;
var O = 0.2;
function M(e) {
  var r = e.visible;
  var n = e.maskTransitionName;
  var i = e.getContainer;
  var o = e.prefixCls;
  var a = e.rootClassName;
  var u = e.icons;
  var l = e.countRender;
  var p = e.showSwitch;
  var f = e.showProgress;
  var g = e.current;
  var m = e.count;
  var v = e.scale;
  var y = e.onSwitchLeft;
  var h = e.onSwitchRight;
  var b = e.onClose;
  var w = e.onZoomIn;
  var x = e.onZoomOut;
  var E = e.onRotateRight;
  var k = e.onRotateLeft;
  var _ = u.rotateLeft;
  var O = u.rotateRight;
  var M = u.zoomIn;
  var P = u.zoomOut;
  var q = u.close;
  var N = u.left;
  var R = u.right;
  var I = `${o}-operations-operation`;
  var j = `${o}-operations-icon`;
  var D = [{
    icon: q,
    onClick: b,
    type: "close"
  }, {
    icon: M,
    onClick: w,
    type: "zoomIn",
    disabled: v === A
  }, {
    icon: P,
    onClick: x,
    type: "zoomOut",
    disabled: v === C
  }, {
    icon: O,
    onClick: E,
    type: "rotateRight"
  }, {
    icon: _,
    onClick: k,
    type: "rotateLeft"
  }];
  var L = c.createElement(c.Fragment, null, p && c.createElement(c.Fragment, null, c.createElement("div", {
    className: d(`${o}-switch-left`, (0, s.Z)({}, `${o}-switch-left-disabled`, g === 0)),
    onClick: y
  }, N), c.createElement("div", {
    className: d(`${o}-switch-right`, (0, s.Z)({}, `${o}-switch-right-disabled`, g === m - 1)),
    onClick: h
  }, R)), c.createElement("ul", {
    className: `${o}-operations`
  }, f && c.createElement("li", {
    className: `${o}-operations-progress`
  }, (l === null || l === undefined ? undefined : l(g + 1, m)) ?? `${g + 1} / ${m}`), D.map(function (e) {
    var t;
    var r = e.icon;
    var n = e.onClick;
    var i = e.type;
    var a = e.disabled;
    return c.createElement("li", {
      className: d(I, (t = {}, (0, s.Z)(t, `${o}-operations-operation-${i}`, true), (0, s.Z)(t, `${o}-operations-operation-disabled`, !!a), t)),
      onClick: n,
      key: i
    }, c.isValidElement(r) ? c.cloneElement(r, {
      className: j
    }) : r);
  })));
  return c.createElement(S.default, {
    visible: r,
    motionName: n
  }, function (e) {
    var t = e.className;
    var r = e.style;
    return c.createElement(T.Z, {
      open: true,
      getContainer: i ?? document.body
    }, c.createElement("div", {
      className: d(`${o}-operations-wrapper`, t, a),
      style: r
    }, L));
  });
}
var P = M;
var q = require("./45406.js");
var N = {
  x: 0,
  y: 0,
  rotate: 0,
  scale: 1
};
function R(e) {
  var t = (0, c.useRef)(null);
  var r = (0, c.useRef)([]);
  var n = (0, c.useState)(N);
  var i = (0, u.Z)(n, 2);
  var o = i[0];
  var s = i[1];
  function l() {
    s(N);
  }
  function p(e) {
    if (t.current === null) {
      r.current = [];
      t.current = (0, q.Z)(function () {
        s(function (e) {
          var n = e;
          r.current.forEach(function (e) {
            n = (0, a.Z)((0, a.Z)({}, n), e);
          });
          t.current = null;
          return n;
        });
      });
    }
    r.current.push((0, a.Z)((0, a.Z)({}, o), e));
  }
  function d(t, r, n) {
    var i = e.current;
    var a = i.width;
    var s = i.height;
    var u = i.offsetWidth;
    var l = i.offsetHeight;
    var c = i.offsetLeft;
    var d = i.offsetTop;
    var g = t;
    var m = o.scale * t;
    if (m > A) {
      g = A / o.scale;
      m = A;
    } else if (m < C) {
      g = C / o.scale;
      m = C;
    }
    var v = r ?? innerWidth / 2;
    var y = n ?? innerHeight / 2;
    var h = g - 1;
    var b = h * a * 0.5;
    var w = h * s * 0.5;
    var x = h * (v - o.x - c);
    var E = h * (y - o.y - d);
    var k = o.x - (x - b);
    var S = o.y - (E - w);
    if (t < 1 && m === 1) {
      var T = u * m;
      var _ = l * m;
      var O = (0, f.g1)();
      var M = O.width;
      var P = O.height;
      if (T <= M && _ <= P) {
        k = 0;
        S = 0;
      }
    }
    p({
      x: k,
      y: S,
      scale: m
    });
  }
  return {
    transform: o,
    resetTransform: l,
    updateTransform: p,
    dispatchZoonChange: d
  };
}
function I(e, t, r, n) {
  var i = t + r;
  var o = (r - n) / 2;
  if (r > n) {
    if (t > 0) {
      return (0, s.Z)({}, e, o);
    }
    if (t < 0 && i < n) {
      return (0, s.Z)({}, e, -o);
    }
  } else if (t < 0 || i > n) {
    return (0, s.Z)({}, e, t < 0 ? o : -o);
  }
  return {};
}
function j(e, t, r, n) {
  var i = (0, f.g1)();
  var o = i.width;
  var s = i.height;
  var u = null;
  if (e <= o && t <= s) {
    u = {
      x: 0,
      y: 0
    };
  } else if (e > o || t > s) {
    u = (0, a.Z)((0, a.Z)({}, I("x", r, e, o)), I("y", n, t, s));
  }
  return u;
}
var D = ["prefixCls", "src", "alt", "onClose", "afterClose", "visible", "icons", "rootClassName", "getContainer", "countRender", "scaleStep", "transitionName", "maskTransitionName"];
function L(e) {
  var t = e.prefixCls;
  var r = e.src;
  var i = e.alt;
  var o = e.onClose;
  e.afterClose;
  var p = e.visible;
  var f = e.icons;
  var g = f === undefined ? {} : f;
  var b = e.rootClassName;
  var x = e.getContainer;
  var E = e.countRender;
  var k = e.scaleStep;
  var S = k === undefined ? 0.5 : k;
  var T = e.transitionName;
  var C = T === undefined ? "zoom" : T;
  var A = e.maskTransitionName;
  var M = A === undefined ? "fade" : A;
  var q = (0, l.Z)(e, D);
  var N = (0, c.useRef)();
  var I = (0, c.useRef)({
    deltaX: 0,
    deltaY: 0,
    transformX: 0,
    transformY: 0
  });
  var L = (0, c.useState)(false);
  var F = (0, u.Z)(L, 2);
  var Z = F[0];
  var z = F[1];
  var U = (0, c.useContext)(w);
  var B = U.previewUrls;
  var V = U.current;
  var H = U.isPreviewGroup;
  var W = U.setCurrent;
  var Y = B.size;
  var Q = Array.from(B.keys());
  var $ = Q.indexOf(V);
  var G = H ? B.get(V) : r;
  var K = H && Y > 1;
  var J = H && Y >= 1;
  var X = R(N);
  var ee = X.transform;
  var te = X.resetTransform;
  var re = X.updateTransform;
  var ne = X.dispatchZoonChange;
  var ie = ee.rotate;
  var oe = ee.scale;
  var ae = d((0, s.Z)({}, `${t}-moving`, Z));
  function se() {
    te();
  }
  function ue() {
    ne(_ + S);
  }
  function le() {
    ne(_ - S);
  }
  function ce() {
    re({
      rotate: ie + 90
    });
  }
  function pe() {
    re({
      rotate: ie - 90
    });
  }
  function de(e) {
    e.preventDefault();
    e.stopPropagation();
    if ($ > 0) {
      W(Q[$ - 1]);
    }
  }
  function fe(e) {
    e.preventDefault();
    e.stopPropagation();
    if ($ < Y - 1) {
      W(Q[$ + 1]);
    }
  }
  function ge() {
    if (p && Z) {
      z(false);
      var e = I.current;
      var t = e.transformX;
      var r = e.transformY;
      var n = ee.x !== t && ee.y !== r;
      if (!n) {
        return;
      }
      var i = N.current.offsetWidth * oe;
      var o = N.current.offsetHeight * oe;
      var s = N.current.getBoundingClientRect();
      var u = s.left;
      var l = s.top;
      var c = ie % 180 !== 0;
      var d = j(c ? o : i, c ? i : o, u, l);
      if (d) {
        re((0, a.Z)({}, d));
      }
    }
  }
  function me(e) {
    if (e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      I.current = {
        deltaX: e.pageX - ee.x,
        deltaY: e.pageY - ee.y,
        transformX: ee.x,
        transformY: ee.y
      };
      z(true);
    }
  }
  function ve(e) {
    if (p && Z) {
      re({
        x: e.pageX - I.current.deltaX,
        y: e.pageY - I.current.deltaY
      });
    }
  }
  function ye(e) {
    if (p && e.deltaY != 0) {
      var t = Math.abs(e.deltaY / 100);
      var r = Math.min(t, O);
      var n = _ + r * S;
      if (e.deltaY > 0) {
        n = _ / n;
      }
      ne(n, e.clientX, e.clientY);
    }
  }
  var he = (0, c.useCallback)(function (e) {
    if (p && K) {
      if (e.keyCode === y.Z.LEFT) {
        if ($ > 0) {
          W(Q[$ - 1]);
        }
      } else if (e.keyCode === y.Z.RIGHT && $ < Y - 1) {
        W(Q[$ + 1]);
      }
    }
  }, [$, Y, Q, W, K, p]);
  function be(e) {
    if (p) {
      if (oe !== 1) {
        re({
          x: 0,
          y: 0,
          scale: 1
        });
      } else {
        ne(_ + S, e.clientX, e.clientY);
      }
    }
  }
  (0, c.useEffect)(function () {
    var e;
    var t;
    var r = (0, v.Z)(window, "mouseup", ge, false);
    var n = (0, v.Z)(window, "mousemove", ve, false);
    var i = (0, v.Z)(window, "keydown", he, false);
    try {
      if (window.top !== window.self) {
        e = (0, v.Z)(window.top, "mouseup", ge, false);
        t = (0, v.Z)(window.top, "mousemove", ve, false);
      }
    } catch (o) {
      (0, h.Kp)(false, `[rc-image] ${o}`);
    }
    return function () {
      var o;
      var a;
      r.remove();
      n.remove();
      i.remove();
      if ((o = e) !== null && o !== undefined) {
        o.remove();
      }
      if ((a = t) !== null && a !== undefined) {
        a.remove();
      }
    };
  }, [p, Z, he]);
  return c.createElement(c.Fragment, null, c.createElement(m.Z, (0, n.Z)({
    transitionName: C,
    maskTransitionName: M,
    closable: false,
    keyboard: true,
    prefixCls: t,
    onClose: o,
    afterClose: se,
    visible: p,
    wrapClassName: ae,
    rootClassName: b,
    getContainer: x
  }, q), c.createElement("div", {
    className: `${t}-img-wrapper`
  }, c.createElement("img", {
    width: e.width,
    height: e.height,
    onWheel: ye,
    onMouseDown: me,
    onDoubleClick: be,
    ref: N,
    className: `${t}-img`,
    src: G,
    alt: i,
    style: {
      transform: `translate3d(${ee.x}px, ${ee.y}px, 0) scale3d(${oe}, ${oe}, 1) rotate(${ie}deg)`
    }
  }))), c.createElement(P, {
    visible: p,
    maskTransitionName: M,
    getContainer: x,
    prefixCls: t,
    rootClassName: b,
    icons: g,
    countRender: E,
    showSwitch: K,
    showProgress: J,
    current: $,
    count: Y,
    scale: oe,
    onSwitchLeft: de,
    onSwitchRight: fe,
    onZoomIn: ue,
    onZoomOut: le,
    onRotateRight: ce,
    onRotateLeft: pe,
    onClose: o
  }));
}
var F = L;
var Z = ["src", "alt", "onPreviewClose", "prefixCls", "previewPrefixCls", "placeholder", "fallback", "width", "height", "style", "preview", "className", "onClick", "onError", "wrapperClassName", "wrapperStyle", "rootClassName", "crossOrigin", "decoding", "loading", "referrerPolicy", "sizes", "srcSet", "useMap", "draggable"];
var z = ["src", "visible", "onVisibleChange", "getContainer", "mask", "maskClassName", "icons", "scaleStep"];
var U = 0;
function B(e) {
  var r = e.src;
  var o = e.alt;
  var p = e.onPreviewClose;
  var m = e.prefixCls;
  var v = m === undefined ? "rc-image" : m;
  var y = e.previewPrefixCls;
  var h = y === undefined ? `${v}-preview` : y;
  var b = e.placeholder;
  var x = e.fallback;
  var E = e.width;
  var k = e.height;
  var S = e.style;
  var T = e.preview;
  var C = T === undefined || T;
  var A = e.className;
  var _ = e.onClick;
  var O = e.onError;
  var M = e.wrapperClassName;
  var P = e.wrapperStyle;
  var q = e.rootClassName;
  var N = e.crossOrigin;
  var R = e.decoding;
  var I = e.loading;
  var j = e.referrerPolicy;
  var D = e.sizes;
  var L = e.srcSet;
  var B = e.useMap;
  var V = e.draggable;
  var H = (0, l.Z)(e, Z);
  var W = b && b !== true;
  var Y = (0, i.Z)(C) === "object" ? C : {};
  var Q = Y.src;
  var $ = Y.visible;
  var G = $ === undefined ? undefined : $;
  var K = Y.onVisibleChange;
  var J = K === undefined ? p : K;
  var X = Y.getContainer;
  var ee = X === undefined ? undefined : X;
  var te = Y.mask;
  var re = Y.maskClassName;
  var ne = Y.icons;
  var ie = Y.scaleStep;
  var oe = (0, l.Z)(Y, z);
  var ae = Q ?? r;
  var se = G !== undefined;
  var ue = (0, g.Z)(!!G, {
    value: G,
    onChange: J
  });
  var le = (0, u.Z)(ue, 2);
  var ce = le[0];
  var pe = le[1];
  var de = (0, c.useState)(W ? "loading" : "normal");
  var fe = (0, u.Z)(de, 2);
  var ge = fe[0];
  var me = fe[1];
  var ve = (0, c.useState)(null);
  var ye = (0, u.Z)(ve, 2);
  var he = ye[0];
  var be = ye[1];
  var we = ge === "error";
  var xe = c.useContext(w);
  var Ee = xe.isPreviewGroup;
  var ke = xe.setCurrent;
  var Se = xe.setShowPreview;
  var Te = xe.setMousePosition;
  var Ce = xe.registerImage;
  var Ae = c.useState(function () {
    U += 1;
    return U;
  });
  var _e = (0, u.Z)(Ae, 1);
  var Oe = _e[0];
  var Me = !!C;
  var Pe = c.useRef(false);
  function qe() {
    me("normal");
  }
  function Ne(e) {
    if (O) {
      O(e);
    }
    me("error");
  }
  function Re(e) {
    if (!se) {
      var t = (0, f.os)(e.target);
      var r = t.left;
      var n = t.top;
      if (Ee) {
        ke(Oe);
        Te({
          x: r,
          y: n
        });
      } else {
        be({
          x: r,
          y: n
        });
      }
    }
    if (Ee) {
      Se(true);
    } else {
      pe(true);
    }
    if (_) {
      _(e);
    }
  }
  function Ie(e) {
    e.stopPropagation();
    pe(false);
    if (!se) {
      be(null);
    }
  }
  function je(e) {
    Pe.current = false;
    if (ge === "loading" && e !== null && e !== undefined && e.complete && (e.naturalWidth || e.naturalHeight)) {
      Pe.current = true;
      qe();
    }
  }
  c.useEffect(function () {
    var e = Ce(Oe, ae);
    return e;
  }, []);
  c.useEffect(function () {
    Ce(Oe, ae, Me);
  }, [ae, Me]);
  c.useEffect(function () {
    if (we) {
      me("normal");
    }
    if (W && !Pe.current) {
      me("loading");
    }
  }, [r]);
  var De = d(v, M, q, (0, s.Z)({}, `${v}-error`, we));
  var Le = we && x ? x : ae;
  var Fe = {
    crossOrigin: N,
    decoding: R,
    draggable: V,
    loading: I,
    referrerPolicy: j,
    sizes: D,
    srcSet: L,
    useMap: B,
    alt: o,
    className: d(`${v}-img`, (0, s.Z)({}, `${v}-img-placeholder`, b === true), A),
    style: (0, a.Z)({
      height: k
    }, S)
  };
  return c.createElement(c.Fragment, null, c.createElement("div", (0, n.Z)({}, H, {
    className: De,
    onClick: Me ? Re : _,
    style: (0, a.Z)({
      width: E,
      height: k
    }, P)
  }), c.createElement("img", (0, n.Z)({}, Fe, {
    ref: je
  }, we && x ? {
    src: x
  } : {
    onLoad: qe,
    onError: Ne,
    src: r
  }, {
    width: E,
    height: k
  })), ge === "loading" && c.createElement("div", {
    "aria-hidden": "true",
    className: `${v}-placeholder`
  }, b), te && Me && c.createElement("div", {
    className: d(`${v}-mask`, re),
    style: {
      display: Fe.style?.display === "none" ? "none" : undefined
    }
  }, te)), !Ee && Me && c.createElement(F, (0, n.Z)({
    "aria-hidden": !ce,
    visible: ce,
    prefixCls: h,
    onClose: Ie,
    mousePosition: he,
    src: Le,
    alt: o,
    getContainer: ee,
    icons: ne,
    scaleStep: ie,
    rootClassName: q
  }, oe)));
}
B.PreviewGroup = k;
B.displayName = "Image";
var V = B;
var H = V;
var W = require("./52520.js");
var Y = require("./86110.js");
var Q = require("./2824.js");
var $ = require("./95237.js");
var G = require("./51770.js");
var K = require("./69379.js");
var J = {
  icon: {
    tag: "svg",
    attrs: {
      viewBox: "64 64 896 896",
      focusable: "false"
    },
    children: [{
      tag: "defs",
      attrs: {},
      children: [{
        tag: "style",
        attrs: {}
      }]
    }, {
      tag: "path",
      attrs: {
        d: "M672 418H144c-17.7 0-32 14.3-32 32v414c0 17.7 14.3 32 32 32h528c17.7 0 32-14.3 32-32V450c0-17.7-14.3-32-32-32zm-44 402H188V494h440v326z"
      }
    }, {
      tag: "path",
      attrs: {
        d: "M819.3 328.5c-78.8-100.7-196-153.6-314.6-154.2l-.2-64c0-6.5-7.6-10.1-12.6-6.1l-128 101c-4 3.1-3.9 9.1 0 12.3L492 318.6c5.1 4 12.7.4 12.6-6.1v-63.9c12.9.1 25.9.9 38.8 2.5 42.1 5.2 82.1 18.2 119 38.7 38.1 21.2 71.2 49.7 98.4 84.3 27.1 34.7 46.7 73.7 58.1 115.8a325.95 325.95 0 016.5 140.9h74.9c14.8-103.6-11.3-213-81-302.3z"
      }
    }]
  },
  name: "rotate-left",
  theme: "outlined"
};
var X = J;
var ee = require("./18268.js");
function te(e, t) {
  return c.createElement(ee.Z, (0, a.Z)((0, a.Z)({}, e), {}, {
    ref: t,
    icon: X
  }));
}
var re = c.forwardRef(te);
var ne = re;
var ie = {
  icon: {
    tag: "svg",
    attrs: {
      viewBox: "64 64 896 896",
      focusable: "false"
    },
    children: [{
      tag: "defs",
      attrs: {},
      children: [{
        tag: "style",
        attrs: {}
      }]
    }, {
      tag: "path",
      attrs: {
        d: "M480.5 251.2c13-1.6 25.9-2.4 38.8-2.5v63.9c0 6.5 7.5 10.1 12.6 6.1L660 217.6c4-3.2 4-9.2 0-12.3l-128-101c-5.1-4-12.6-.4-12.6 6.1l-.2 64c-118.6.5-235.8 53.4-314.6 154.2A399.75 399.75 0 00123.5 631h74.9c-.9-5.3-1.7-10.7-2.4-16.1-5.1-42.1-2.1-84.1 8.9-124.8 11.4-42.2 31-81.1 58.1-115.8 27.2-34.7 60.3-63.2 98.4-84.3 37-20.6 76.9-33.6 119.1-38.8z"
      }
    }, {
      tag: "path",
      attrs: {
        d: "M880 418H352c-17.7 0-32 14.3-32 32v414c0 17.7 14.3 32 32 32h528c17.7 0 32-14.3 32-32V450c0-17.7-14.3-32-32-32zm-44 402H396V494h440v326z"
      }
    }]
  },
  name: "rotate-right",
  theme: "outlined"
};
var oe = ie;
function ae(e, t) {
  return c.createElement(ee.Z, (0, a.Z)((0, a.Z)({}, e), {}, {
    ref: t,
    icon: oe
  }));
}
var se = c.forwardRef(ae);
var ue = se;
var le = {
  icon: {
    tag: "svg",
    attrs: {
      viewBox: "64 64 896 896",
      focusable: "false"
    },
    children: [{
      tag: "path",
      attrs: {
        d: "M637 443H519V309c0-4.4-3.6-8-8-8h-60c-4.4 0-8 3.6-8 8v134H325c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h118v134c0 4.4 3.6 8 8 8h60c4.4 0 8-3.6 8-8V519h118c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8zm284 424L775 721c122.1-148.9 113.6-369.5-26-509-148-148.1-388.4-148.1-537 0-148.1 148.6-148.1 389 0 537 139.5 139.6 360.1 148.1 509 26l146 146c3.2 2.8 8.3 2.8 11 0l43-43c2.8-2.7 2.8-7.8 0-11zM696 696c-118.8 118.7-311.2 118.7-430 0-118.7-118.8-118.7-311.2 0-430 118.8-118.7 311.2-118.7 430 0 118.7 118.8 118.7 311.2 0 430z"
      }
    }]
  },
  name: "zoom-in",
  theme: "outlined"
};
var ce = le;
function pe(e, t) {
  return c.createElement(ee.Z, (0, a.Z)((0, a.Z)({}, e), {}, {
    ref: t,
    icon: ce
  }));
}
var de = c.forwardRef(pe);
var fe = de;
var ge = {
  icon: {
    tag: "svg",
    attrs: {
      viewBox: "64 64 896 896",
      focusable: "false"
    },
    children: [{
      tag: "path",
      attrs: {
        d: "M637 443H325c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h312c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8zm284 424L775 721c122.1-148.9 113.6-369.5-26-509-148-148.1-388.4-148.1-537 0-148.1 148.6-148.1 389 0 537 139.5 139.6 360.1 148.1 509 26l146 146c3.2 2.8 8.3 2.8 11 0l43-43c2.8-2.7 2.8-7.8 0-11zM696 696c-118.8 118.7-311.2 118.7-430 0-118.7-118.8-118.7-311.2 0-430 118.8-118.7 311.2-118.7 430 0 118.7 118.8 118.7 311.2 0 430z"
      }
    }]
  },
  name: "zoom-out",
  theme: "outlined"
};
var me = ge;
function ve(e, t) {
  return c.createElement(ee.Z, (0, a.Z)((0, a.Z)({}, e), {}, {
    ref: t,
    icon: me
  }));
}
var ye = c.forwardRef(ve);
var he = ye;
function be(e, t) {
  var r = {};
  for (var n in e) {
    if (Object.prototype.hasOwnProperty.call(e, n) && t.indexOf(n) < 0) {
      r[n] = e[n];
    }
  }
  if (e != null && typeof Object.getOwnPropertySymbols === "function") {
    var i = 0;
    for (n = Object.getOwnPropertySymbols(e); i < n.length; i++) {
      if (t.indexOf(n[i]) < 0 && Object.prototype.propertyIsEnumerable.call(e, n[i])) {
        r[n[i]] = e[n[i]];
      }
    }
  }
  return r;
}
var we = {
  rotateLeft: c.createElement(ne, null),
  rotateRight: c.createElement(ue, null),
  zoomIn: c.createElement(fe, null),
  zoomOut: c.createElement(he, null),
  close: c.createElement($.Z, null),
  left: c.createElement(G.Z, null),
  right: c.createElement(K.Z, null)
};
function xe(e) {
  var t = e.previewPrefixCls;
  var r = e.preview;
  var o = be(e, ["previewPrefixCls", "preview"]);
  var a = c.useContext(W.E_);
  var s = a.getPrefixCls;
  var u = s("image-preview", t);
  var l = s();
  var p = c.useMemo(function () {
    if (r === false) {
      return r;
    }
    var e = (0, i.Z)(r) === "object" ? r : {};
    return (0, n.Z)((0, n.Z)({}, e), {
      transitionName: (0, Q.mL)(l, "zoom", e.transitionName),
      maskTransitionName: (0, Q.mL)(l, "fade", e.maskTransitionName)
    });
  }, [r]);
  return c.createElement(H.PreviewGroup, (0, n.Z)({
    preview: p,
    previewPrefixCls: u,
    icons: we
  }, o));
}
var Ee = xe;
function ke(e, t) {
  var r = {};
  for (var n in e) {
    if (Object.prototype.hasOwnProperty.call(e, n) && t.indexOf(n) < 0) {
      r[n] = e[n];
    }
  }
  if (e != null && typeof Object.getOwnPropertySymbols === "function") {
    var i = 0;
    for (n = Object.getOwnPropertySymbols(e); i < n.length; i++) {
      if (t.indexOf(n[i]) < 0 && Object.prototype.propertyIsEnumerable.call(e, n[i])) {
        r[n[i]] = e[n[i]];
      }
    }
  }
  return r;
}
function Se(e) {
  var t = e.prefixCls;
  var r = e.preview;
  var a = ke(e, ["prefixCls", "preview"]);
  var s = (0, c.useContext)(W.E_);
  var u = s.getPrefixCls;
  var l = s.locale;
  var p = l === undefined ? Y.Z : l;
  var d = s.getPopupContainer;
  var f = u("image", t);
  var g = u();
  var m = p.Image || Y.Z.Image;
  var v = c.useMemo(function () {
    if (r === false) {
      return r;
    }
    var e = (0, i.Z)(r) === "object" ? r : {};
    var t = e.getContainer;
    var a = ke(e, ["getContainer"]);
    return (0, n.Z)((0, n.Z)({
      mask: c.createElement("div", {
        className: `${f}-mask-info`
      }, c.createElement(o.Z, null), m?.preview),
      icons: we
    }, a), {
      getContainer: t || d,
      transitionName: (0, Q.mL)(g, "zoom", e.transitionName),
      maskTransitionName: (0, Q.mL)(g, "fade", e.maskTransitionName)
    });
  }, [r, m]);
  return c.createElement(H, (0, n.Z)({
    prefixCls: f,
    preview: v
  }, a));
}
Se.PreviewGroup = Ee;
var Te = Se;
};
