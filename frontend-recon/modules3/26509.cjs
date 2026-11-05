// webpack module 26509 — body from webcrack
module.exports = function (module, exports, require) {
function n(e, t) {
  return i(e) || o(e, t) || a(e, t) || u();
}
function i(e) {
  if (Array.isArray(e)) {
    return e;
  }
}
function o(e, t) {
  var r = e == null ? null : typeof Symbol !== "undefined" && e[Symbol.iterator] || e["@@iterator"];
  if (r != null) {
    var n;
    var i;
    var o = [];
    var a = true;
    var s = false;
    try {
      for (r = r.call(e); !(a = (n = r.next()).done); a = true) {
        o.push(n.value);
        if (t && o.length === t) {
          break;
        }
      }
    } catch (u) {
      s = true;
      i = u;
    } finally {
      try {
        if (!a && r.return != null) {
          r.return();
        }
      } finally {
        if (s) {
          throw i;
        }
      }
    }
    return o;
  }
}
function a(e, t) {
  if (e) {
    if (typeof e === "string") {
      return s(e, t);
    }
    var r = Object.prototype.toString.call(e).slice(8, -1);
    if (r === "Object" && e.constructor) {
      r = e.constructor.name;
    }
    if (r === "Map" || r === "Set") {
      return Array.from(e);
    } else if (r === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)) {
      return s(e, t);
    } else {
      return undefined;
    }
  }
}
function s(e, t) {
  if (t == null || t > e.length) {
    t = e.length;
  }
  for (var r = 0, n = new Array(t); r < t; r++) {
    n[r] = e[r];
  }
  return n;
}
function u() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
Object.defineProperty(exports, "__esModule", {
  value: true
});
var l = 0;
var c = 1;
var p = 2;
var d = 3;
var f = 4;
var g = 5;
var m = 6;
function v(e) {
  if (h.hasOwnProperty(e)) {
    return h[e];
  } else {
    return null;
  }
}
function y(e, t, r, n, i, o, a) {
  this.acceptsBooleans = t === p || t === d || t === f;
  this.attributeName = n;
  this.attributeNamespace = i;
  this.mustUseProperty = r;
  this.propertyName = e;
  this.type = t;
  this.sanitizeURL = o;
  this.removeEmptyString = a;
}
var h = {};
var b = ["children", "dangerouslySetInnerHTML", "defaultValue", "defaultChecked", "innerHTML", "suppressContentEditableWarning", "suppressHydrationWarning", "style"];
b.forEach(function (e) {
  h[e] = new y(e, l, false, e, null, false, false);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function (e) {
  var t = n(e, 2);
  var r = t[0];
  var i = t[1];
  h[r] = new y(r, c, false, i, null, false, false);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function (e) {
  h[e] = new y(e, p, false, e.toLowerCase(), null, false, false);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function (e) {
  h[e] = new y(e, p, false, e, null, false, false);
});
["allowFullScreen", "async", "autoFocus", "autoPlay", "controls", "default", "defer", "disabled", "disablePictureInPicture", "disableRemotePlayback", "formNoValidate", "hidden", "loop", "noModule", "noValidate", "open", "playsInline", "readOnly", "required", "reversed", "scoped", "seamless", "itemScope"].forEach(function (e) {
  h[e] = new y(e, d, false, e.toLowerCase(), null, false, false);
});
["checked", "multiple", "muted", "selected"].forEach(function (e) {
  h[e] = new y(e, d, true, e, null, false, false);
});
["capture", "download"].forEach(function (e) {
  h[e] = new y(e, f, false, e, null, false, false);
});
["cols", "rows", "size", "span"].forEach(function (e) {
  h[e] = new y(e, m, false, e, null, false, false);
});
["rowSpan", "start"].forEach(function (e) {
  h[e] = new y(e, g, false, e.toLowerCase(), null, false, false);
});
var w = /[\-\:]([a-z])/g;
function x(e) {
  return e[1].toUpperCase();
}
["accent-height", "alignment-baseline", "arabic-form", "baseline-shift", "cap-height", "clip-path", "clip-rule", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "dominant-baseline", "enable-background", "fill-opacity", "fill-rule", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "glyph-name", "glyph-orientation-horizontal", "glyph-orientation-vertical", "horiz-adv-x", "horiz-origin-x", "image-rendering", "letter-spacing", "lighting-color", "marker-end", "marker-mid", "marker-start", "overline-position", "overline-thickness", "paint-order", "panose-1", "pointer-events", "rendering-intent", "shape-rendering", "stop-color", "stop-opacity", "strikethrough-position", "strikethrough-thickness", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke-width", "text-anchor", "text-decoration", "text-rendering", "underline-position", "underline-thickness", "unicode-bidi", "unicode-range", "units-per-em", "v-alphabetic", "v-hanging", "v-ideographic", "v-mathematical", "vector-effect", "vert-adv-y", "vert-origin-x", "vert-origin-y", "word-spacing", "writing-mode", "xmlns:xlink", "x-height"].forEach(function (e) {
  var t = e.replace(w, x);
  h[t] = new y(t, c, false, e, null, false, false);
});
["xlink:actuate", "xlink:arcrole", "xlink:role", "xlink:show", "xlink:title", "xlink:type"].forEach(function (e) {
  var t = e.replace(w, x);
  h[t] = new y(t, c, false, e, "http://www.w3.org/1999/xlink", false, false);
});
["xml:base", "xml:lang", "xml:space"].forEach(function (e) {
  var t = e.replace(w, x);
  h[t] = new y(t, c, false, e, "http://www.w3.org/XML/1998/namespace", false, false);
});
["tabIndex", "crossOrigin"].forEach(function (e) {
  h[e] = new y(e, c, false, e.toLowerCase(), null, false, false);
});
var E = "xlinkHref";
h[E] = new y("xlinkHref", c, false, "xlink:href", "http://www.w3.org/1999/xlink", true, false);
["src", "href", "action", "formAction"].forEach(function (e) {
  h[e] = new y(e, c, false, e.toLowerCase(), null, true, true);
});
var k = require("./72529.js");
var S = k.CAMELCASE;
var T = k.SAME;
var C = k.possibleStandardNames;
var A = ":A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
var _ = A + "\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
var O = RegExp.prototype.test.bind(new RegExp("^(data|aria)-[" + _ + "]*$"));
var M = Object.keys(C).reduce(function (e, t) {
  var r = C[t];
  if (r === T) {
    e[t] = t;
  } else if (r === S) {
    e[t.toLowerCase()] = t;
  } else {
    e[t] = r;
  }
  return e;
}, {});
exports.BOOLEAN = d;
exports.BOOLEANISH_STRING = p;
exports.NUMERIC = g;
exports.OVERLOADED_BOOLEAN = f;
exports.POSITIVE_NUMERIC = m;
exports.RESERVED = l;
exports.STRING = c;
exports.getPropertyInfo = v;
exports.isCustomAttribute = O;
exports.possibleStandardNames = M;
};
