// webpack module 48141 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60240.js");
var i = require("./29837.js");
function o(e, t, r) {
  for (var n, i = e; (n = i.next) != null; i = n) {
    if (n.key === t) {
      i.next = n.next;
      if (!r) {
        n.next = e.next;
        e.next = n;
      }
      return n;
    }
  }
}
function a(e, t) {
  if (e) {
    var r = o(e, t);
    return r && r.value;
  }
}
function s(e, t, r) {
  var n = o(e, t);
  if (n) {
    n.value = r;
  } else {
    e.next = {
      key: t,
      next: e.next,
      value: r
    };
  }
}
function u(e, t) {
  return !!e && !!o(e, t);
}
function l(e, t) {
  if (e) {
    return o(e, t, true);
  }
}
module.exports = function () {
  var e;
  var t = {
    assert: function (e) {
      if (!t.has(e)) {
        throw new i("Side channel does not contain " + n(e));
      }
    },
    delete: function (t) {
      var r = l(e, t);
      if (r && e && !e.next) {
        e = undefined;
      }
      return !!r;
    },
    get: function (t) {
      return a(e, t);
    },
    has: function (t) {
      return u(e, t);
    },
    set: function (t, r) {
      e ||= {
        next: undefined
      };
      s(e, t, r);
    }
  };
  return t;
};
};
