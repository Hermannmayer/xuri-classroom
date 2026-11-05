// webpack module 23881 — body from webcrack
module.exports = function (module, exports, require) {
function n(e, t) {
  if (o(e)) {
    e = "100%";
  }
  var r = a(e);
  e = t === 360 ? e : Math.min(t, Math.max(0, parseFloat(e)));
  if (r) {
    e = parseInt(String(e * t), 10) / 100;
  }
  if (Math.abs(e - t) < 0.000001) {
    return 1;
  } else {
    e = t === 360 ? (e < 0 ? e % t + t : e % t) / parseFloat(String(t)) : e % t / parseFloat(String(t));
    return e;
  }
}
function i(e) {
  return Math.min(1, Math.max(0, e));
}
function o(e) {
  return typeof e === "string" && e.indexOf(".") !== -1 && parseFloat(e) === 1;
}
function a(e) {
  return typeof e === "string" && e.indexOf("%") !== -1;
}
function s(e) {
  e = parseFloat(e);
  if (isNaN(e) || e < 0 || e > 1) {
    e = 1;
  }
  return e;
}
function u(e) {
  if (e <= 1) {
    return `${Number(e) * 100}%`;
  } else {
    return e;
  }
}
function l(e) {
  if (e.length === 1) {
    return "0" + e;
  } else {
    return String(e);
  }
}
require.d(exports, {
  sh: function () {
    return n;
  },
  V2: function () {
    return i;
  },
  Yq: function () {
    return s;
  },
  JX: function () {
    return u;
  },
  FZ: function () {
    return l;
  }
});
};
