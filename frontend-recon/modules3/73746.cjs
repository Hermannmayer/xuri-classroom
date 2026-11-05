// webpack module 73746 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./59496.js");
var i = require("./75090.js").default;
function o(e, t) {
  if (!e || typeof e !== "object") {
    throw new TypeError("First argument must be an object");
  }
  var r;
  var n;
  var i = typeof t === "function";
  var o = {};
  var a = {};
  for (r in e) {
    n = e[r];
    if (i && (o = t(r, n), o && o.length === 2)) {
      a[o[0]] = o[1];
    } else if (typeof n === "string") {
      a[n] = r;
    }
  }
  return a;
}
function a(e, t) {
  if (e.indexOf("-") === -1) {
    return t && typeof t.is === "string";
  }
  switch (e) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return false;
    default:
      return true;
  }
}
var s = {
  reactCompat: true
};
function u(e, t) {
  if (e !== null && e !== undefined) {
    try {
      t.style = i(e, s);
    } catch (r) {
      t.style = {};
    }
  }
}
var l = n.version.split(".")[0] >= 16;
var c = new Set(["tr", "tbody", "thead", "tfoot", "colgroup", "table", "head", "html", "frameset"]);
function p(e) {
  return !c.has(e.name);
}
module.exports = {
  PRESERVE_CUSTOM_ATTRIBUTES: l,
  invertObject: o,
  isCustomComponent: a,
  setStyleProp: u,
  canTextBeChildOfNode: p,
  elementsWithNoTextChildren: c
};
};
