// webpack module 83810 — body from webcrack
module.exports = function (module, exports, require) {
var t = "html";
var r = "head";
var n = "body";
var i = /<([a-zA-Z]+[0-9]?)/;
var o = /<head[^]*>/i;
var a = /<body[^]*>/i;
function s() {
  throw new Error("This browser does not support `document.implementation.createHTMLDocument`");
}
function u() {
  throw new Error("This browser does not support `DOMParser.prototype.parseFromString`");
}
var l = typeof window === "object" && window.DOMParser;
if (typeof l === "function") {
  var c = new l();
  var p = "text/html";
  u = function (e, t) {
    if (t) {
      e = "<" + t + ">" + e + "</" + t + ">";
    }
    return c.parseFromString(e, p);
  };
  s = u;
}
if (typeof document === "object" && document.implementation) {
  var d = document.implementation.createHTMLDocument();
  s = function (e, t) {
    if (t) {
      var r = d.documentElement.querySelector(t);
      r.innerHTML = e;
      return d;
    }
    d.documentElement.innerHTML = e;
    return d;
  };
}
var f;
var g = typeof document === "object" ? document.createElement("template") : {};
function m(e) {
  var l;
  var c;
  var p;
  var d;
  var g = e.match(i);
  if (g && g[1]) {
    l = g[1].toLowerCase();
  }
  switch (l) {
    case t:
      c = u(e);
      if (!o.test(e)) {
        p = c.querySelector(r);
        if (p) {
          p.parentNode.removeChild(p);
        }
      }
      if (!a.test(e)) {
        p = c.querySelector(n);
        if (p) {
          p.parentNode.removeChild(p);
        }
      }
      return c.querySelectorAll(t);
    case r:
    case n:
      c = s(e);
      d = c.querySelectorAll(l);
      if (a.test(e) && o.test(e)) {
        return d[0].parentNode.childNodes;
      } else {
        return d;
      }
    default:
      if (f) {
        return f(e);
      } else {
        p = s(e, n).querySelector(n);
        return p.childNodes;
      }
  }
}
if (g.content) {
  f = function (e) {
    g.innerHTML = e;
    return g.content.childNodes;
  };
}
module.exports = m;
};
