// webpack module 14224 — body from webcrack
module.exports = function (module, exports, require) {
var t;
var r;
var n = module.exports = {};
function i() {
  throw new Error("setTimeout has not been defined");
}
function o() {
  throw new Error("clearTimeout has not been defined");
}
function a(e) {
  if (t === setTimeout) {
    return setTimeout(e, 0);
  }
  if ((t === i || !t) && setTimeout) {
    t = setTimeout;
    return setTimeout(e, 0);
  }
  try {
    return t(e, 0);
  } catch (r) {
    try {
      return t.call(null, e, 0);
    } catch (r) {
      return t.call(this, e, 0);
    }
  }
}
function s(e) {
  if (r === clearTimeout) {
    return clearTimeout(e);
  }
  if ((r === o || !r) && clearTimeout) {
    r = clearTimeout;
    return clearTimeout(e);
  }
  try {
    return r(e);
  } catch (t) {
    try {
      return r.call(null, e);
    } catch (t) {
      return r.call(this, e);
    }
  }
}
(function () {
  try {
    t = typeof setTimeout === "function" ? setTimeout : i;
  } catch (e) {
    t = i;
  }
  try {
    r = typeof clearTimeout === "function" ? clearTimeout : o;
  } catch (e) {
    r = o;
  }
})();
var u;
var l = [];
var c = false;
var p = -1;
function d() {
  if (c && u) {
    c = false;
    if (u.length) {
      l = u.concat(l);
    } else {
      p = -1;
    }
    if (l.length) {
      f();
    }
  }
}
function f() {
  if (!c) {
    var e = a(d);
    c = true;
    var t = l.length;
    while (t) {
      u = l;
      l = [];
      while (++p < t) {
        if (u) {
          u[p].run();
        }
      }
      p = -1;
      t = l.length;
    }
    u = null;
    c = false;
    s(e);
  }
}
function g(e, t) {
  this.fun = e;
  this.array = t;
}
function m() {}
n.nextTick = function (e) {
  var t = new Array(arguments.length - 1);
  if (arguments.length > 1) {
    for (var r = 1; r < arguments.length; r++) {
      t[r - 1] = arguments[r];
    }
  }
  l.push(new g(e, t));
  if (l.length === 1 && !c) {
    a(f);
  }
};
g.prototype.run = function () {
  this.fun.apply(null, this.array);
};
n.title = "browser";
n.browser = true;
n.env = {};
n.argv = [];
n.version = "";
n.versions = {};
n.on = m;
n.addListener = m;
n.once = m;
n.off = m;
n.removeListener = m;
n.removeAllListeners = m;
n.emit = m;
n.prependListener = m;
n.prependOnceListener = m;
n.listeners = function (e) {
  return [];
};
n.binding = function (e) {
  throw new Error("process.binding is not supported");
};
n.cwd = function () {
  return "/";
};
n.chdir = function (e) {
  throw new Error("process.chdir is not supported");
};
n.umask = function () {
  return 0;
};
};
