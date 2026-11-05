// webpack module 10021 — body from webcrack
module.exports = function (module, exports, require) {
function n(e, t) {
  if (t == null || t > e.length) {
    t = e.length;
  }
  for (var r = 0, n = Array(t); r < t; r++) {
    n[r] = e[r];
  }
  return n;
}
function i(e) {
  if (Array.isArray(e)) {
    return e;
  }
}
function o(e, t) {
  var r = e == null ? null : typeof Symbol != "undefined" && e[Symbol.iterator] || e["@@iterator"];
  if (r != null) {
    var n;
    var i;
    var o;
    var a;
    var s = [];
    var u = true;
    var l = false;
    try {
      o = (r = r.call(e)).next;
      if (t === 0) ;else {
        for (; !(u = (n = o.call(r)).done) && (s.push(n.value), s.length !== t); u = true);
      }
    } catch (e) {
      l = true;
      i = e;
    } finally {
      try {
        if (!u && r.return != null && (a = r.return(), Object(a) !== a)) {
          return;
        }
      } finally {
        if (l) {
          throw i;
        }
      }
    }
    return s;
  }
}
function a() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function s(e, t) {
  return i(e) || o(e, t) || u(e, t) || a();
}
function u(e, t) {
  if (e) {
    if (typeof e == "string") {
      return n(e, t);
    }
    var r = {}.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor) {
      r = e.constructor.name;
    }
    if (r === "Map" || r === "Set") {
      return Array.from(e);
    } else if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)) {
      return n(e, t);
    } else {
      return undefined;
    }
  }
}
require.d(exports, {
  Z: function () {
    return we;
  }
});
const l = Object.entries;
const c = Object.setPrototypeOf;
const p = Object.isFrozen;
const d = Object.getPrototypeOf;
const f = Object.getOwnPropertyDescriptor;
let g = Object.freeze;
let m = Object.seal;
let v = Object.create;
let y = typeof Reflect !== "undefined" && Reflect;
let h = y.apply;
let b = y.construct;
g ||= function (e) {
  return e;
};
m ||= function (e) {
  return e;
};
h ||= function (e, t) {
  for (var r = arguments.length, n = new Array(r > 2 ? r - 2 : 0), i = 2; i < r; i++) {
    n[i - 2] = arguments[i];
  }
  return e.apply(t, n);
};
b ||= function (e) {
  for (var t = arguments.length, r = new Array(t > 1 ? t - 1 : 0), n = 1; n < t; n++) {
    r[n - 1] = arguments[n];
  }
  return new e(...r);
};
const w = Z(Array.prototype.forEach);
const x = Z(Array.prototype.lastIndexOf);
const E = Z(Array.prototype.pop);
const k = Z(Array.prototype.push);
const S = Z(Array.prototype.splice);
const T = Array.isArray;
const C = Z(String.prototype.toLowerCase);
const A = Z(String.prototype.toString);
const _ = Z(String.prototype.match);
const O = Z(String.prototype.replace);
const M = Z(String.prototype.indexOf);
const P = Z(String.prototype.trim);
const q = Z(Number.prototype.toString);
const N = Z(Boolean.prototype.toString);
const R = typeof BigInt === "undefined" ? null : Z(BigInt.prototype.toString);
const I = typeof Symbol === "undefined" ? null : Z(Symbol.prototype.toString);
const j = Z(Object.prototype.hasOwnProperty);
const D = Z(Object.prototype.toString);
const L = Z(RegExp.prototype.test);
const F = z(TypeError);
function Z(e) {
  return function (t) {
    if (t instanceof RegExp) {
      t.lastIndex = 0;
    }
    for (var r = arguments.length, n = new Array(r > 1 ? r - 1 : 0), i = 1; i < r; i++) {
      n[i - 1] = arguments[i];
    }
    return h(e, t, n);
  };
}
function z(e) {
  return function () {
    for (var t = arguments.length, r = new Array(t), n = 0; n < t; n++) {
      r[n] = arguments[n];
    }
    return b(e, r);
  };
}
function U(e, t, r = C) {
  if (c) {
    c(e, null);
  }
  if (!T(t)) {
    return e;
  }
  let n = t.length;
  while (n--) {
    let i = t[n];
    if (typeof i === "string") {
      const e = r(i);
      if (e !== i) {
        if (!p(t)) {
          t[n] = e;
        }
        i = e;
      }
    }
    e[i] = true;
  }
  return e;
}
function B(e) {
  for (let t = 0; t < e.length; t++) {
    const r = j(e, t);
    if (!r) {
      e[t] = null;
    }
  }
  return e;
}
function V(e) {
  const t = v(null);
  for (const n of l(e)) {
    var r = s(n, 2);
    const i = r[0];
    const o = r[1];
    const a = j(e, i);
    if (a) {
      if (T(o)) {
        t[i] = B(o);
      } else if (o && typeof o === "object" && o.constructor === Object) {
        t[i] = V(o);
      } else {
        t[i] = o;
      }
    }
  }
  return t;
}
function H(e) {
  switch (typeof e) {
    case "string":
      return e;
    case "number":
      return q(e);
    case "boolean":
      return N(e);
    case "bigint":
      if (R) {
        return R(e);
      } else {
        return "0";
      }
    case "symbol":
      if (I) {
        return I(e);
      } else {
        return "Symbol()";
      }
    case "undefined":
      return D(e);
    case "function":
    case "object":
      {
        if (e === null) {
          return D(e);
        }
        const t = e;
        const r = W(t, "toString");
        if (typeof r === "function") {
          const e = r(t);
          if (typeof e === "string") {
            return e;
          } else {
            return D(e);
          }
        }
        return D(e);
      }
    default:
      return D(e);
  }
}
function W(e, t) {
  while (e !== null) {
    const r = f(e, t);
    if (r) {
      if (r.get) {
        return Z(r.get);
      }
      if (typeof r.value === "function") {
        return Z(r.value);
      }
    }
    e = d(e);
  }
  function r() {
    return null;
  }
  return r;
}
function Y(e) {
  try {
    L(e, "");
    return true;
  } catch (t) {
    return false;
  }
}
const Q = g(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "search", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]);
const $ = g(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "enterkeyhint", "exportparts", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "inputmode", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "part", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]);
const G = g(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]);
const K = g(["animate", "color-profile", "cursor", "discard", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]);
const J = g(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "mprescripts"]);
const X = g(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]);
const ee = g(["#text"]);
const te = g(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "command", "commandfor", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "exportparts", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inert", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "nonce", "noshade", "novalidate", "nowrap", "open", "optimum", "part", "pattern", "placeholder", "playsinline", "popover", "popovertarget", "popovertargetaction", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "slot", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "wrap", "xmlns"]);
const re = g(["accent-height", "accumulate", "additive", "alignment-baseline", "amplitude", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dur", "edgemode", "elevation", "end", "exponent", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "intercept", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "mask-type", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "slope", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "tablevalues", "targetx", "targety", "transform", "transform-origin", "text-anchor", "text-decoration", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]);
const ne = g(["accent", "accentunder", "align", "bevelled", "close", "columnalign", "columnlines", "columnspacing", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lquote", "lspace", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]);
const ie = g(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]);
const oe = m(/{{[\w\W]*|^[\w\W]*}}/g);
const ae = m(/<%[\w\W]*|^[\w\W]*%>/g);
const se = m(/\${[\w\W]*/g);
const ue = m(/^data-[\-\w.\u00B7-\uFFFF]+$/);
const le = m(/^aria-[\-\w]+$/);
const ce = m(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i);
const pe = m(/^(?:\w+script|data):/i);
const de = m(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g);
const fe = m(/^html$/i);
const ge = m(/^[a-z][.\w]*(-[.\w]+)+$/i);
const me = {
  element: 1,
  attribute: 2,
  text: 3,
  cdataSection: 4,
  entityReference: 5,
  entityNode: 6,
  progressingInstruction: 7,
  comment: 8,
  document: 9,
  documentType: 10,
  documentFragment: 11,
  notation: 12
};
const ve = function () {
  if (typeof window === "undefined") {
    return null;
  } else {
    return window;
  }
};
const ye = function (e, t) {
  if (typeof e !== "object" || typeof e.createPolicy !== "function") {
    return null;
  }
  let r = null;
  const n = "data-tt-policy-suffix";
  if (t && t.hasAttribute(n)) {
    r = t.getAttribute(n);
  }
  const i = "dompurify" + (r ? "#" + r : "");
  try {
    return e.createPolicy(i, {
      createHTML(e) {
        return e;
      },
      createScriptURL(e) {
        return e;
      }
    });
  } catch (o) {
    console.warn("TrustedTypes policy " + i + " could not be created.");
    return null;
  }
};
const he = function () {
  return {
    afterSanitizeAttributes: [],
    afterSanitizeElements: [],
    afterSanitizeShadowDOM: [],
    beforeSanitizeAttributes: [],
    beforeSanitizeElements: [],
    beforeSanitizeShadowDOM: [],
    uponSanitizeAttribute: [],
    uponSanitizeElement: [],
    uponSanitizeShadowNode: []
  };
};
function be(e = ve()) {
  const t = e => be(e);
  t.version = "3.4.6";
  t.removed = [];
  if (!e || !e.document || e.document.nodeType !== me.document || !e.Element) {
    t.isSupported = false;
    return t;
  }
  let r = e.document;
  const n = r;
  const i = n.currentScript;
  e.DocumentFragment;
  const o = e.HTMLTemplateElement;
  const a = e.Node;
  const s = e.Element;
  const u = e.NodeFilter;
  const c = e.NamedNodeMap;
  if (c === undefined) {
    if (!e.NamedNodeMap) {
      e.MozNamedAttrMap;
    }
  }
  e.HTMLFormElement;
  const p = e.DOMParser;
  const d = e.trustedTypes;
  const f = s.prototype;
  const m = W(f, "cloneNode");
  const y = W(f, "remove");
  const h = W(f, "nextSibling");
  const b = W(f, "childNodes");
  const q = W(f, "parentNode");
  const N = W(f, "shadowRoot");
  const R = W(f, "attributes");
  const I = a && a.prototype ? W(a.prototype, "nodeType") : null;
  const D = a && a.prototype ? W(a.prototype, "nodeName") : null;
  if (typeof o === "function") {
    const e = r.createElement("template");
    if (e.content && e.content.ownerDocument) {
      r = e.content.ownerDocument;
    }
  }
  let Z;
  let z = "";
  const B = r;
  const we = B.implementation;
  const xe = B.createNodeIterator;
  const Ee = B.createDocumentFragment;
  const ke = B.getElementsByTagName;
  const Se = n.importNode;
  let Te = he();
  t.isSupported = typeof l === "function" && typeof q === "function" && we && we.createHTMLDocument !== undefined;
  const Ce = oe;
  const Ae = ae;
  const _e = se;
  const Oe = ue;
  const Me = le;
  const Pe = pe;
  const qe = de;
  const Ne = ge;
  let Re = ce;
  let Ie = null;
  const je = U({}, [...Q, ...$, ...G, ...J, ...ee]);
  let De = null;
  const Le = U({}, [...te, ...re, ...ne, ...ie]);
  let Fe = Object.seal(v(null, {
    tagNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeNameCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    allowCustomizedBuiltInElements: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: false
    }
  }));
  let Ze = null;
  let ze = null;
  const Ue = Object.seal(v(null, {
    tagCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    },
    attributeCheck: {
      writable: true,
      configurable: false,
      enumerable: true,
      value: null
    }
  }));
  let Be = true;
  let Ve = true;
  let He = false;
  let We = true;
  let Ye = false;
  let Qe = true;
  let $e = false;
  let Ge = false;
  let Ke = false;
  let Je = false;
  let Xe = false;
  let et = false;
  let tt = true;
  let rt = false;
  const nt = "user-content-";
  let it = true;
  let ot = false;
  let at = {};
  let st = null;
  const ut = U({}, ["annotation-xml", "audio", "colgroup", "desc", "foreignobject", "head", "iframe", "math", "mi", "mn", "mo", "ms", "mtext", "noembed", "noframes", "noscript", "plaintext", "script", "style", "svg", "template", "thead", "title", "video", "xmp"]);
  let lt = null;
  const ct = U({}, ["audio", "video", "img", "source", "image", "track"]);
  let pt = null;
  const dt = U({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "role", "summary", "title", "value", "style", "xmlns"]);
  const ft = "http://www.w3.org/1998/Math/MathML";
  const gt = "http://www.w3.org/2000/svg";
  const mt = "http://www.w3.org/1999/xhtml";
  let vt = mt;
  let yt = false;
  let ht = null;
  const bt = U({}, [ft, gt, mt], A);
  let wt = U({}, ["mi", "mo", "mn", "ms", "mtext"]);
  let xt = U({}, ["annotation-xml"]);
  const Et = U({}, ["title", "style", "font", "a", "script"]);
  let kt = null;
  const St = ["application/xhtml+xml", "text/html"];
  const Tt = "text/html";
  let Ct = null;
  let At = null;
  const _t = r.createElement("form");
  const Ot = function (e) {
    return e instanceof RegExp || e instanceof Function;
  };
  const Mt = function (e = {}) {
    if (At && At === e) {
      return;
    }
    if (!e || typeof e !== "object") {
      e = {};
    }
    e = V(e);
    kt = St.indexOf(e.PARSER_MEDIA_TYPE) === -1 ? Tt : e.PARSER_MEDIA_TYPE;
    Ct = kt === "application/xhtml+xml" ? A : C;
    Ie = j(e, "ALLOWED_TAGS") && T(e.ALLOWED_TAGS) ? U({}, e.ALLOWED_TAGS, Ct) : je;
    De = j(e, "ALLOWED_ATTR") && T(e.ALLOWED_ATTR) ? U({}, e.ALLOWED_ATTR, Ct) : Le;
    ht = j(e, "ALLOWED_NAMESPACES") && T(e.ALLOWED_NAMESPACES) ? U({}, e.ALLOWED_NAMESPACES, A) : bt;
    pt = j(e, "ADD_URI_SAFE_ATTR") && T(e.ADD_URI_SAFE_ATTR) ? U(V(dt), e.ADD_URI_SAFE_ATTR, Ct) : dt;
    lt = j(e, "ADD_DATA_URI_TAGS") && T(e.ADD_DATA_URI_TAGS) ? U(V(ct), e.ADD_DATA_URI_TAGS, Ct) : ct;
    st = j(e, "FORBID_CONTENTS") && T(e.FORBID_CONTENTS) ? U({}, e.FORBID_CONTENTS, Ct) : ut;
    Ze = j(e, "FORBID_TAGS") && T(e.FORBID_TAGS) ? U({}, e.FORBID_TAGS, Ct) : V({});
    ze = j(e, "FORBID_ATTR") && T(e.FORBID_ATTR) ? U({}, e.FORBID_ATTR, Ct) : V({});
    at = !!j(e, "USE_PROFILES") && (e.USE_PROFILES && typeof e.USE_PROFILES === "object" ? V(e.USE_PROFILES) : e.USE_PROFILES);
    Be = e.ALLOW_ARIA_ATTR !== false;
    Ve = e.ALLOW_DATA_ATTR !== false;
    He = e.ALLOW_UNKNOWN_PROTOCOLS || false;
    We = e.ALLOW_SELF_CLOSE_IN_ATTR !== false;
    Ye = e.SAFE_FOR_TEMPLATES || false;
    Qe = e.SAFE_FOR_XML !== false;
    $e = e.WHOLE_DOCUMENT || false;
    Je = e.RETURN_DOM || false;
    Xe = e.RETURN_DOM_FRAGMENT || false;
    et = e.RETURN_TRUSTED_TYPE || false;
    Ke = e.FORCE_BODY || false;
    tt = e.SANITIZE_DOM !== false;
    rt = e.SANITIZE_NAMED_PROPS || false;
    it = e.KEEP_CONTENT !== false;
    ot = e.IN_PLACE || false;
    Re = Y(e.ALLOWED_URI_REGEXP) ? e.ALLOWED_URI_REGEXP : ce;
    vt = typeof e.NAMESPACE === "string" ? e.NAMESPACE : mt;
    wt = j(e, "MATHML_TEXT_INTEGRATION_POINTS") && e.MATHML_TEXT_INTEGRATION_POINTS && typeof e.MATHML_TEXT_INTEGRATION_POINTS === "object" ? V(e.MATHML_TEXT_INTEGRATION_POINTS) : U({}, ["mi", "mo", "mn", "ms", "mtext"]);
    xt = j(e, "HTML_INTEGRATION_POINTS") && e.HTML_INTEGRATION_POINTS && typeof e.HTML_INTEGRATION_POINTS === "object" ? V(e.HTML_INTEGRATION_POINTS) : U({}, ["annotation-xml"]);
    const t = j(e, "CUSTOM_ELEMENT_HANDLING") && e.CUSTOM_ELEMENT_HANDLING && typeof e.CUSTOM_ELEMENT_HANDLING === "object" ? V(e.CUSTOM_ELEMENT_HANDLING) : v(null);
    Fe = v(null);
    if (j(t, "tagNameCheck") && Ot(t.tagNameCheck)) {
      Fe.tagNameCheck = t.tagNameCheck;
    }
    if (j(t, "attributeNameCheck") && Ot(t.attributeNameCheck)) {
      Fe.attributeNameCheck = t.attributeNameCheck;
    }
    if (j(t, "allowCustomizedBuiltInElements") && typeof t.allowCustomizedBuiltInElements === "boolean") {
      Fe.allowCustomizedBuiltInElements = t.allowCustomizedBuiltInElements;
    }
    if (Ye) {
      Ve = false;
    }
    if (Xe) {
      Je = true;
    }
    if (at) {
      Ie = U({}, ee);
      De = v(null);
      if (at.html === true) {
        U(Ie, Q);
        U(De, te);
      }
      if (at.svg === true) {
        U(Ie, $);
        U(De, re);
        U(De, ie);
      }
      if (at.svgFilters === true) {
        U(Ie, G);
        U(De, re);
        U(De, ie);
      }
      if (at.mathMl === true) {
        U(Ie, J);
        U(De, ne);
        U(De, ie);
      }
    }
    Ue.tagCheck = null;
    Ue.attributeCheck = null;
    if (j(e, "ADD_TAGS")) {
      if (typeof e.ADD_TAGS === "function") {
        Ue.tagCheck = e.ADD_TAGS;
      } else if (T(e.ADD_TAGS)) {
        if (Ie === je) {
          Ie = V(Ie);
        }
        U(Ie, e.ADD_TAGS, Ct);
      }
    }
    if (j(e, "ADD_ATTR")) {
      if (typeof e.ADD_ATTR === "function") {
        Ue.attributeCheck = e.ADD_ATTR;
      } else if (T(e.ADD_ATTR)) {
        if (De === Le) {
          De = V(De);
        }
        U(De, e.ADD_ATTR, Ct);
      }
    }
    if (j(e, "ADD_URI_SAFE_ATTR") && T(e.ADD_URI_SAFE_ATTR)) {
      U(pt, e.ADD_URI_SAFE_ATTR, Ct);
    }
    if (j(e, "FORBID_CONTENTS") && T(e.FORBID_CONTENTS)) {
      if (st === ut) {
        st = V(st);
      }
      U(st, e.FORBID_CONTENTS, Ct);
    }
    if (j(e, "ADD_FORBID_CONTENTS") && T(e.ADD_FORBID_CONTENTS)) {
      if (st === ut) {
        st = V(st);
      }
      U(st, e.ADD_FORBID_CONTENTS, Ct);
    }
    if (it) {
      Ie["#text"] = true;
    }
    if ($e) {
      U(Ie, ["html", "head", "body"]);
    }
    if (Ie.table) {
      U(Ie, ["tbody"]);
      delete Ze.tbody;
    }
    if (e.TRUSTED_TYPES_POLICY) {
      if (typeof e.TRUSTED_TYPES_POLICY.createHTML !== "function") {
        throw F("TRUSTED_TYPES_POLICY configuration option must provide a \"createHTML\" hook.");
      }
      if (typeof e.TRUSTED_TYPES_POLICY.createScriptURL !== "function") {
        throw F("TRUSTED_TYPES_POLICY configuration option must provide a \"createScriptURL\" hook.");
      }
      Z = e.TRUSTED_TYPES_POLICY;
      z = Z.createHTML("");
    } else {
      if (Z === undefined) {
        Z = ye(d, i);
      }
      if (Z !== null && typeof z === "string") {
        z = Z.createHTML("");
      }
    }
    if (g) {
      g(e);
    }
    At = e;
  };
  const Pt = U({}, [...$, ...G, ...K]);
  const qt = U({}, [...J, ...X]);
  const Nt = function (e) {
    let t = q(e);
    if (!t || !t.tagName) {
      t = {
        namespaceURI: vt,
        tagName: "template"
      };
    }
    const r = C(e.tagName);
    const n = C(t.tagName);
    return !!ht[e.namespaceURI] && (e.namespaceURI === gt ? t.namespaceURI === mt ? r === "svg" : t.namespaceURI === ft ? r === "svg" && (n === "annotation-xml" || wt[n]) : Boolean(Pt[r]) : e.namespaceURI === ft ? t.namespaceURI === mt ? r === "math" : t.namespaceURI === gt ? r === "math" && xt[n] : Boolean(qt[r]) : e.namespaceURI === mt ? (t.namespaceURI !== gt || !!xt[n]) && (t.namespaceURI !== ft || !!wt[n]) && !qt[r] && (Et[r] || !Pt[r]) : kt === "application/xhtml+xml" && !!ht[e.namespaceURI]);
  };
  const Rt = function (e) {
    k(t.removed, {
      element: e
    });
    try {
      q(e).removeChild(e);
    } catch (r) {
      y(e);
    }
  };
  const It = function (e, r) {
    try {
      k(t.removed, {
        attribute: r.getAttributeNode(e),
        from: r
      });
    } catch (n) {
      k(t.removed, {
        attribute: null,
        from: r
      });
    }
    r.removeAttribute(e);
    if (e === "is") {
      if (Je || Xe) {
        try {
          Rt(r);
        } catch (n) {}
      } else {
        try {
          r.setAttribute(e, "");
        } catch (n) {}
      }
    }
  };
  const jt = function (e) {
    let t = null;
    let n = null;
    if (Ke) {
      e = "<remove></remove>" + e;
    } else {
      const t = _(e, /^[\r\n\t ]+/);
      n = t && t[0];
    }
    if (kt === "application/xhtml+xml" && vt === mt) {
      e = "<html xmlns=\"http://www.w3.org/1999/xhtml\"><head></head><body>" + e + "</body></html>";
    }
    const i = Z ? Z.createHTML(e) : e;
    if (vt === mt) {
      try {
        t = new p().parseFromString(i, kt);
      } catch (a) {}
    }
    if (!t || !t.documentElement) {
      t = we.createDocument(vt, "template", null);
      try {
        t.documentElement.innerHTML = yt ? z : i;
      } catch (a) {}
    }
    const o = t.body || t.documentElement;
    if (e && n) {
      o.insertBefore(r.createTextNode(n), o.childNodes[0] || null);
    }
    if (vt === mt) {
      return ke.call(t, $e ? "html" : "body")[0];
    } else if ($e) {
      return t.documentElement;
    } else {
      return o;
    }
  };
  const Dt = function (e) {
    return xe.call(e.ownerDocument || e, e, u.SHOW_ELEMENT | u.SHOW_COMMENT | u.SHOW_TEXT | u.SHOW_PROCESSING_INSTRUCTION | u.SHOW_CDATA_SECTION, null);
  };
  const Lt = function (e) {
    e.normalize();
    const t = xe.call(e.ownerDocument || e, e, u.SHOW_TEXT | u.SHOW_COMMENT | u.SHOW_CDATA_SECTION | u.SHOW_PROCESSING_INSTRUCTION, null);
    let r = t.nextNode();
    while (r) {
      let e = r.data;
      w([Ce, Ae, _e], t => {
        e = O(e, t, " ");
      });
      r.data = e;
      r = t.nextNode();
    }
  };
  const Ft = function (e) {
    const t = D ? D(e) : null;
    return typeof t === "string" && Ct(t) === "form" && (typeof e.nodeName !== "string" || typeof e.textContent !== "string" || typeof e.removeChild !== "function" || e.attributes !== R(e) || typeof e.removeAttribute !== "function" || typeof e.setAttribute !== "function" || typeof e.namespaceURI !== "string" || typeof e.insertBefore !== "function" || typeof e.hasChildNodes !== "function" || e.childNodes !== b(e));
  };
  const Zt = function (e) {
    if (!I || typeof e !== "object" || e === null) {
      return false;
    }
    try {
      return I(e) === me.documentFragment;
    } catch (t) {
      return false;
    }
  };
  const zt = function (e) {
    if (!I || typeof e !== "object" || e === null) {
      return false;
    }
    try {
      return typeof I(e) === "number";
    } catch (t) {
      return false;
    }
  };
  function Ut(e, r, n) {
    w(e, e => {
      e.call(t, r, n, At);
    });
  }
  const Bt = function (e) {
    let r = null;
    Ut(Te.beforeSanitizeElements, e, null);
    if (Ft(e)) {
      Rt(e);
      return true;
    }
    const n = Ct(e.nodeName);
    Ut(Te.uponSanitizeElement, e, {
      tagName: n,
      allowedTags: Ie
    });
    if (Qe && e.hasChildNodes() && !zt(e.firstElementChild) && L(/<[/\w!]/g, e.innerHTML) && L(/<[/\w!]/g, e.textContent)) {
      Rt(e);
      return true;
    }
    if (Qe && e.namespaceURI === mt && n === "style" && zt(e.firstElementChild)) {
      Rt(e);
      return true;
    }
    if (e.nodeType === me.progressingInstruction) {
      Rt(e);
      return true;
    }
    if (Qe && e.nodeType === me.comment && L(/<[/\w]/g, e.data)) {
      Rt(e);
      return true;
    }
    if (Ze[n] || (!(Ue.tagCheck instanceof Function) || !Ue.tagCheck(n)) && !Ie[n]) {
      if (!Ze[n] && Wt(n)) {
        if (Fe.tagNameCheck instanceof RegExp && L(Fe.tagNameCheck, n)) {
          return false;
        }
        if (Fe.tagNameCheck instanceof Function && Fe.tagNameCheck(n)) {
          return false;
        }
      }
      if (it && !st[n]) {
        const t = q(e) || e.parentNode;
        const r = b(e) || e.childNodes;
        if (r && t) {
          const n = r.length;
          for (let i = n - 1; i >= 0; --i) {
            const n = m(r[i], true);
            t.insertBefore(n, h(e));
          }
        }
      }
      Rt(e);
      return true;
    }
    const i = I ? I(e) : e.nodeType;
    if ((i !== me.element || Nt(e)) && (n !== "noscript" && n !== "noembed" && n !== "noframes" || !L(/<\/no(script|embed|frames)/i, e.innerHTML))) {
      if (Ye && e.nodeType === me.text) {
        r = e.textContent;
        w([Ce, Ae, _e], e => {
          r = O(r, e, " ");
        });
        if (e.textContent !== r) {
          k(t.removed, {
            element: e.cloneNode()
          });
          e.textContent = r;
        }
      }
      Ut(Te.afterSanitizeElements, e, null);
      return false;
    } else {
      Rt(e);
      return true;
    }
  };
  const Vt = function (e, t, n) {
    if (ze[t]) {
      return false;
    }
    if (tt && (t === "id" || t === "name") && (n in r || n in _t)) {
      return false;
    }
    const i = De[t] || Ue.attributeCheck instanceof Function && Ue.attributeCheck(t, e);
    if (Ve && !ze[t] && L(Oe, t)) ;else if (Be && L(Me, t)) ;else if (!i || ze[t]) {
      if ((!Wt(e) || (!(Fe.tagNameCheck instanceof RegExp) || !L(Fe.tagNameCheck, e)) && (!(Fe.tagNameCheck instanceof Function) || !Fe.tagNameCheck(e)) || (!(Fe.attributeNameCheck instanceof RegExp) || !L(Fe.attributeNameCheck, t)) && (!(Fe.attributeNameCheck instanceof Function) || !Fe.attributeNameCheck(t, e))) && (t !== "is" || !Fe.allowCustomizedBuiltInElements || (!(Fe.tagNameCheck instanceof RegExp) || !L(Fe.tagNameCheck, n)) && (!(Fe.tagNameCheck instanceof Function) || !Fe.tagNameCheck(n)))) {
        return false;
      }
    } else if (pt[t]) ;else if (L(Re, O(n, qe, ""))) ;else if (t !== "src" && t !== "xlink:href" && t !== "href" || e === "script" || M(n, "data:") !== 0 || !lt[e]) {
      if (He && !L(Pe, O(n, qe, ""))) ;else if (n) {
        return false;
      }
    } else {
      ;
    }
    return true;
  };
  const Ht = U({}, ["annotation-xml", "color-profile", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "missing-glyph"]);
  const Wt = function (e) {
    return !Ht[C(e)] && L(Ne, e);
  };
  const Yt = function (e) {
    Ut(Te.beforeSanitizeAttributes, e, null);
    const r = e.attributes;
    if (!r || Ft(e)) {
      return;
    }
    const n = {
      attrName: "",
      attrValue: "",
      keepAttr: true,
      allowedAttributes: De,
      forceKeepAttr: undefined
    };
    let i = r.length;
    while (i--) {
      const a = r[i];
      const s = a.name;
      const u = a.namespaceURI;
      const l = a.value;
      const c = Ct(s);
      const p = l;
      let f = s === "value" ? p : P(p);
      n.attrName = c;
      n.attrValue = f;
      n.keepAttr = true;
      n.forceKeepAttr = undefined;
      Ut(Te.uponSanitizeAttribute, e, n);
      f = n.attrValue;
      if (!!rt && (c === "id" || c === "name") && M(f, nt) !== 0) {
        It(s, e);
        f = nt + f;
      }
      if (Qe && L(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, f)) {
        It(s, e);
        continue;
      }
      if (c === "attributename" && _(f, "href")) {
        It(s, e);
        continue;
      }
      if (n.forceKeepAttr) {
        continue;
      }
      if (!n.keepAttr) {
        It(s, e);
        continue;
      }
      if (!We && L(/\/>/i, f)) {
        It(s, e);
        continue;
      }
      if (Ye) {
        w([Ce, Ae, _e], e => {
          f = O(f, e, " ");
        });
      }
      const g = Ct(e.nodeName);
      if (Vt(g, c, f)) {
        if (Z && typeof d === "object" && typeof d.getAttributeType === "function") {
          if (u) ;else {
            switch (d.getAttributeType(g, c)) {
              case "TrustedHTML":
                f = Z.createHTML(f);
                break;
              case "TrustedScriptURL":
                f = Z.createScriptURL(f);
                break;
            }
          }
        }
        if (f !== p) {
          try {
            if (u) {
              e.setAttributeNS(u, s, f);
            } else {
              e.setAttribute(s, f);
            }
            if (Ft(e)) {
              Rt(e);
            } else {
              E(t.removed);
            }
          } catch (o) {
            It(s, e);
          }
        }
      } else {
        It(s, e);
      }
    }
    Ut(Te.afterSanitizeAttributes, e, null);
  };
  const Qt = function (e) {
    let t = null;
    const r = Dt(e);
    Ut(Te.beforeSanitizeShadowDOM, e, null);
    while (t = r.nextNode()) {
      Ut(Te.uponSanitizeShadowNode, t, null);
      Bt(t);
      Yt(t);
      if (Zt(t.content)) {
        Qt(t.content);
      }
    }
    Ut(Te.afterSanitizeShadowDOM, e, null);
  };
  const $t = function (e) {
    const t = I ? I(e) : e.nodeType;
    if (t === me.element) {
      const t = N ? N(e) : e.shadowRoot;
      if (Zt(t)) {
        $t(t);
        Qt(t);
      }
    }
    const r = b ? b(e) : e.childNodes;
    if (!r) {
      return;
    }
    const n = [];
    w(r, e => {
      k(n, e);
    });
    for (const i of n) {
      $t(i);
    }
  };
  t.sanitize = function (e, r = {}) {
    let i = null;
    let o = null;
    let a = null;
    let s = null;
    yt = !e;
    if (yt) {
      e = "<!-->";
    }
    if (typeof e !== "string" && !zt(e) && (e = H(e), typeof e !== "string")) {
      throw F("dirty is not a string, aborting");
    }
    if (!t.isSupported) {
      return e;
    }
    if (!Ge) {
      Mt(r);
    }
    t.removed = [];
    if (typeof e === "string") {
      ot = false;
    }
    if (ot) {
      const t = D ? D(e) : e.nodeName;
      if (typeof t === "string") {
        const e = Ct(t);
        if (!Ie[e] || Ze[e]) {
          throw F("root node is forbidden and cannot be sanitized in-place");
        }
      }
      if (Ft(e)) {
        throw F("root node is clobbered and cannot be sanitized in-place");
      }
      $t(e);
    } else if (zt(e)) {
      i = jt("<!---->");
      o = i.ownerDocument.importNode(e, true);
      if (o.nodeType === me.element && o.nodeName === "BODY" || o.nodeName === "HTML") {
        i = o;
      } else {
        i.appendChild(o);
      }
      $t(o);
    } else {
      if (!Je && !Ye && !$e && e.indexOf("<") === -1) {
        if (Z && et) {
          return Z.createHTML(e);
        } else {
          return e;
        }
      }
      i = jt(e);
      if (!i) {
        if (Je) {
          return null;
        } else if (et) {
          return z;
        } else {
          return "";
        }
      }
    }
    if (i && Ke) {
      Rt(i.firstChild);
    }
    const u = Dt(ot ? e : i);
    while (a = u.nextNode()) {
      Bt(a);
      Yt(a);
      if (Zt(a.content)) {
        Qt(a.content);
      }
    }
    if (ot) {
      if (Ye) {
        Lt(e);
      }
      return e;
    }
    if (Je) {
      if (Ye) {
        Lt(i);
      }
      if (Xe) {
        s = Ee.call(i.ownerDocument);
        while (i.firstChild) {
          s.appendChild(i.firstChild);
        }
      } else {
        s = i;
      }
      if (De.shadowroot || De.shadowrootmode) {
        s = Se.call(n, s, true);
      }
      return s;
    }
    let l = $e ? i.outerHTML : i.innerHTML;
    if ($e && Ie["!doctype"] && i.ownerDocument && i.ownerDocument.doctype && i.ownerDocument.doctype.name && L(fe, i.ownerDocument.doctype.name)) {
      l = "<!DOCTYPE " + i.ownerDocument.doctype.name + ">\n" + l;
    }
    if (Ye) {
      w([Ce, Ae, _e], e => {
        l = O(l, e, " ");
      });
    }
    if (Z && et) {
      return Z.createHTML(l);
    } else {
      return l;
    }
  };
  t.setConfig = function (e = {}) {
    Mt(e);
    Ge = true;
  };
  t.clearConfig = function () {
    At = null;
    Ge = false;
  };
  t.isValidAttribute = function (e, t, r) {
    if (!At) {
      Mt({});
    }
    const n = Ct(e);
    const i = Ct(t);
    return Vt(n, i, r);
  };
  t.addHook = function (e, t) {
    if (typeof t === "function") {
      k(Te[e], t);
    }
  };
  t.removeHook = function (e, t) {
    if (t !== undefined) {
      const r = x(Te[e], t);
      if (r === -1) {
        return undefined;
      } else {
        return S(Te[e], r, 1)[0];
      }
    }
    return E(Te[e]);
  };
  t.removeHooks = function (e) {
    Te[e] = [];
  };
  t.removeAllHooks = function () {
    Te = he();
  };
  return t;
}
var we = be();
};
