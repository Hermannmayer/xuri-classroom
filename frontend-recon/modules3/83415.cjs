// webpack module 83415 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return a;
  },
  o: function () {
    return s;
  }
});
var n;
var i = require("./96417.js");
function o(e) {
  var t = `rc-scrollbar-measure-${Math.random().toString(36).substring(7)}`;
  var r = document.createElement("div");
  r.id = t;
  var n;
  var o;
  var a = r.style;
  a.position = "absolute";
  a.left = "0";
  a.top = "0";
  a.width = "100px";
  a.height = "100px";
  a.overflow = "scroll";
  if (e) {
    var s = getComputedStyle(e);
    a.scrollbarColor = s.scrollbarColor;
    a.scrollbarWidth = s.scrollbarWidth;
    var u = getComputedStyle(e, "::-webkit-scrollbar");
    var l = parseInt(u.width, 10);
    var c = parseInt(u.height, 10);
    try {
      var p = l ? `width: ${u.width};` : "";
      var d = c ? `height: ${u.height};` : "";
      (0, i.hq)(`
#${t}::-webkit-scrollbar {
${p}
${d}
}`, t);
    } catch (m) {
      console.error(m);
      n = l;
      o = c;
    }
  }
  document.body.appendChild(r);
  var f = e && n && !isNaN(n) ? n : r.offsetWidth - r.clientWidth;
  var g = e && o && !isNaN(o) ? o : r.offsetHeight - r.clientHeight;
  document.body.removeChild(r);
  (0, i.jL)(t);
  return {
    width: f,
    height: g
  };
}
function a(e) {
  if (typeof document === "undefined") {
    return 0;
  } else {
    if (e || n === undefined) {
      n = o();
    }
    return n.width;
  }
}
function s(e) {
  if (typeof document !== "undefined" && e && e instanceof Element) {
    return o(e);
  } else {
    return {
      width: 0,
      height: 0
    };
  }
}
};
