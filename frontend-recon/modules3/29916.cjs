// webpack module 29916 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./26509.js");
var i = require("./73746.js");
var o = ["checked", "value"];
var a = ["input", "select", "textarea"];
var s = {
  reset: true,
  submit: true
};
function u(e) {
  return n.possibleStandardNames[e];
}
module.exports = function (e, t) {
  var r;
  var l;
  var c;
  var p;
  var d;
  e = e || {};
  var f = {};
  var g = e.type && s[e.type];
  for (r in e) {
    c = e[r];
    if (n.isCustomAttribute(r)) {
      f[r] = c;
    } else {
      l = r.toLowerCase();
      p = u(l);
      if (p) {
        d = n.getPropertyInfo(p);
        if (o.indexOf(p) !== -1 && a.indexOf(t) !== -1 && !g) {
          p = u("default" + l);
        }
        f[p] = c;
        switch (d && d.type) {
          case n.BOOLEAN:
            f[p] = true;
            break;
          case n.OVERLOADED_BOOLEAN:
            if (c === "") {
              f[p] = true;
            }
            break;
        }
      } else if (i.PRESERVE_CUSTOM_ATTRIBUTES) {
        f[r] = c;
      }
    }
  }
  i.setStyleProp(e.style, f);
  return f;
};
};
