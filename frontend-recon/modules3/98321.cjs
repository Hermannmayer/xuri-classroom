// webpack module 98321 — body from webcrack
module.exports = function (module, exports, require) {
var n;
var i;
var o;
var a = require("./55477.js");
var s = require("./27015.js");
var u = require("./28445.js");
var l = require("./52485.js");
var c = require("./94249.js");
var p = require("./7316.js");
var d = require("./31515.js");
var f = a.location;
var g = a.setImmediate;
var m = a.clearImmediate;
var v = a.process;
var y = a.MessageChannel;
var h = a.Dispatch;
var b = 0;
var w = {};
var x = "onreadystatechange";
function E(e) {
  if (w.hasOwnProperty(e)) {
    var t = w[e];
    delete w[e];
    t();
  }
}
function k(e) {
  return function () {
    E(e);
  };
}
function S(e) {
  E(e.data);
}
function T(e) {
  a.postMessage(e + "", f.protocol + "//" + f.host);
}
if (!g || !m) {
  g = function (e) {
    var t = [];
    var r = 1;
    while (arguments.length > r) {
      t.push(arguments[r++]);
    }
    w[++b] = function () {
      (typeof e == "function" ? e : Function(e)).apply(undefined, t);
    };
    n(b);
    return b;
  };
  m = function (e) {
    delete w[e];
  };
  if (u(v) == "process") {
    n = function (e) {
      v.nextTick(k(e));
    };
  } else if (h && h.now) {
    n = function (e) {
      h.now(k(e));
    };
  } else if (y && !d) {
    i = new y();
    o = i.port2;
    i.port1.onmessage = S;
    n = l(o.postMessage, o, 1);
  } else if (!a.addEventListener || typeof postMessage != "function" || a.importScripts || s(T) || f.protocol === "file:") {
    n = x in p("script") ? function (e) {
      c.appendChild(p("script"))[x] = function () {
        c.removeChild(this);
        E(e);
      };
    } : function (e) {
      setTimeout(k(e), 0);
    };
  } else {
    n = T;
    a.addEventListener("message", S, false);
  }
}
module.exports = {
  set: g,
  clear: m
};
};
