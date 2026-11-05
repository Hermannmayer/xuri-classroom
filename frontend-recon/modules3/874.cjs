// webpack module 874 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./16935.js");
var i = {
  "text/plain": "Text",
  "text/html": "Url",
  default: "Text"
};
var o = "Copy to clipboard: #{key}, Enter";
function a(e) {
  var t = (/mac os x/i.test(navigator.userAgent) ? "⌘" : "Ctrl") + "+C";
  return e.replace(/#{\s*key\s*}/g, t);
}
function s(e, t) {
  var r;
  var s;
  var u;
  var l;
  var c;
  var p;
  var d = false;
  t ||= {};
  r = t.debug || false;
  try {
    u = n();
    l = document.createRange();
    c = document.getSelection();
    p = document.createElement("span");
    p.textContent = e;
    p.ariaHidden = "true";
    p.style.all = "unset";
    p.style.position = "fixed";
    p.style.top = 0;
    p.style.clip = "rect(0, 0, 0, 0)";
    p.style.whiteSpace = "pre";
    p.style.webkitUserSelect = "text";
    p.style.MozUserSelect = "text";
    p.style.msUserSelect = "text";
    p.style.userSelect = "text";
    p.addEventListener("copy", function (n) {
      n.stopPropagation();
      if (t.format) {
        n.preventDefault();
        if (typeof n.clipboardData === "undefined") {
          if (r) {
            console.warn("unable to use e.clipboardData");
          }
          if (r) {
            console.warn("trying IE specific stuff");
          }
          window.clipboardData.clearData();
          var o = i[t.format] || i.default;
          window.clipboardData.setData(o, e);
        } else {
          n.clipboardData.clearData();
          n.clipboardData.setData(t.format, e);
        }
      }
      if (t.onCopy) {
        n.preventDefault();
        t.onCopy(n.clipboardData);
      }
    });
    document.body.appendChild(p);
    l.selectNodeContents(p);
    c.addRange(l);
    var f = document.execCommand("copy");
    if (!f) {
      throw new Error("copy command was unsuccessful");
    }
    d = true;
  } catch (g) {
    if (r) {
      console.error("unable to copy using execCommand: ", g);
    }
    if (r) {
      console.warn("trying IE specific stuff");
    }
    try {
      window.clipboardData.setData(t.format || "text", e);
      if (t.onCopy) {
        t.onCopy(window.clipboardData);
      }
      d = true;
    } catch (g) {
      if (r) {
        console.error("unable to copy using clipboardData: ", g);
      }
      if (r) {
        console.error("falling back to prompt");
      }
      s = a("message" in t ? t.message : o);
      window.prompt(s, e);
    }
  } finally {
    if (c) {
      if (typeof c.removeRange == "function") {
        c.removeRange(l);
      } else {
        c.removeAllRanges();
      }
    }
    if (p) {
      document.body.removeChild(p);
    }
    u();
  }
  return d;
}
module.exports = s;
};
