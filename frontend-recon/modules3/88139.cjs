// webpack module 88139 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getStyle = l;
exports.registerTheme = c;
var i = require("./56088.js");
var o = require("./22611.js");
var a = n(require("./70330.js"));
var s = require("./16732.js");
n(require("./2410.js"));
var u = `-ant-${Date.now()}-${Math.random()}`;
function l(e, t) {
  var r = {};
  function n(e, t) {
    var r = e.clone();
    r = (t === null || t === undefined ? undefined : t(r)) || r;
    return r.toRgbString();
  }
  function a(e, t) {
    var a = new o.TinyColor(e);
    var s = (0, i.generate)(a.toRgbString());
    r[`${t}-color`] = n(a);
    r[`${t}-color-disabled`] = s[1];
    r[`${t}-color-hover`] = s[4];
    r[`${t}-color-active`] = s[6];
    r[`${t}-color-outline`] = a.clone().setAlpha(0.2).toRgbString();
    r[`${t}-color-deprecated-bg`] = s[0];
    r[`${t}-color-deprecated-border`] = s[2];
  }
  if (t.primaryColor) {
    a(t.primaryColor, "primary");
    var s = new o.TinyColor(t.primaryColor);
    var u = (0, i.generate)(s.toRgbString());
    u.forEach(function (e, t) {
      r[`primary-${t + 1}`] = e;
    });
    r["primary-color-deprecated-l-35"] = n(s, function (e) {
      return e.lighten(35);
    });
    r["primary-color-deprecated-l-20"] = n(s, function (e) {
      return e.lighten(20);
    });
    r["primary-color-deprecated-t-20"] = n(s, function (e) {
      return e.tint(20);
    });
    r["primary-color-deprecated-t-50"] = n(s, function (e) {
      return e.tint(50);
    });
    r["primary-color-deprecated-f-12"] = n(s, function (e) {
      return e.setAlpha(e.getAlpha() * 0.12);
    });
    var l = new o.TinyColor(u[0]);
    r["primary-color-active-deprecated-f-30"] = n(l, function (e) {
      return e.setAlpha(e.getAlpha() * 0.3);
    });
    r["primary-color-active-deprecated-d-02"] = n(l, function (e) {
      return e.darken(2);
    });
  }
  if (t.successColor) {
    a(t.successColor, "success");
  }
  if (t.warningColor) {
    a(t.warningColor, "warning");
  }
  if (t.errorColor) {
    a(t.errorColor, "error");
  }
  if (t.infoColor) {
    a(t.infoColor, "info");
  }
  var c = Object.keys(r).map(function (t) {
    return `--${e}-${t}: ${r[t]};`;
  });
  return `
  :root {
    ${c.join("\n")}
  }
  `.trim();
}
function c(e, t) {
  var r = l(e, t);
  if ((0, a.default)()) {
    (0, s.updateCSS)(r, `${u}-dynamic-theme`);
  }
}
};
