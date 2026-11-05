// webpack module 26779 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60511.js");
var i = require("./3402.js");
var o = require("./8185.js");
var a = require("./83721.js");
var s = require("./70836.js");
function u(e) {
  var t = [];
  a.arrayEach(e, function (e) {
    if (e) {
      t.push(e);
    }
  });
  return t;
}
function l(e, t) {
  var r = {};
  for (var n = 1; n < e[0].length; ++n) {
    r[n] = true;
  }
  var i = t[0].length;
  for (n = 1; n < t.length; ++n) {
    if (t[n].length > i) {
      i = t[n].length;
    }
  }
  for (var o = 1; o < e.length; ++o) {
    for (var a = 1; a < e[o].length; ++a) {
      var u = false;
      var l = false;
      for (var c = 0; c < t.length; ++c) {
        var p = t[c];
        if (!(p.length < i)) {
          var d = p[0];
          if (e[o][0] === d) {
            l = true;
            for (var f = 1; f < p.length; ++f) {
              if (!u) {
                var g = p[f] === undefined || p[f] === "*";
                if (g) {
                  u = true;
                } else {
                  var m = s.parse(p[f] + "");
                  var v = [s.createToken(e[o][a], s.TOKEN_TYPE_LITERAL)].concat(m);
                  u = s.compute(v);
                }
              }
            }
          }
        }
      }
      if (l) {
        r[a] = r[a] && u;
      }
    }
  }
  var y = [];
  for (var h = 0; h < e[0].length; ++h) {
    if (r[h]) {
      y.push(h - 1);
    }
  }
  return y;
}
exports.FINDFIELD = function (e, t) {
  var r = null;
  a.arrayEach(e, function (e, n) {
    if (e[0] === t) {
      r = n;
      return false;
    }
  });
  if (r == null) {
    return n.value;
  } else {
    return r;
  }
};
exports.DAVERAGE = function (e, r, i) {
  if (isNaN(r) && typeof r !== "string") {
    return n.value;
  }
  var o = l(e, i);
  var s = [];
  if (typeof r === "string") {
    var u = exports.FINDFIELD(e, r);
    s = a.rest(e[u]);
  } else {
    s = a.rest(e[r]);
  }
  var c = 0;
  a.arrayEach(o, function (e) {
    c += s[e];
  });
  if (o.length === 0) {
    return n.div0;
  } else {
    return c / o.length;
  }
};
exports.DCOUNT = function (e, r, o) {
  if (isNaN(r) && typeof r !== "string") {
    return n.value;
  }
  var s = l(e, o);
  var u = [];
  if (typeof r === "string") {
    var c = exports.FINDFIELD(e, r);
    u = a.rest(e[c]);
  } else {
    u = a.rest(e[r]);
  }
  var p = [];
  a.arrayEach(s, function (e) {
    p.push(u[e]);
  });
  return i.COUNT(p);
};
exports.DCOUNTA = function (e, r, o) {
  if (isNaN(r) && typeof r !== "string") {
    return n.value;
  }
  var s = l(e, o);
  var u = [];
  if (typeof r === "string") {
    var c = exports.FINDFIELD(e, r);
    u = a.rest(e[c]);
  } else {
    u = a.rest(e[r]);
  }
  var p = [];
  a.arrayEach(s, function (e) {
    p.push(u[e]);
  });
  return i.COUNTA(p);
};
exports.DGET = function (e, r, i) {
  if (isNaN(r) && typeof r !== "string") {
    return n.value;
  }
  var o = l(e, i);
  var s = [];
  if (typeof r === "string") {
    var u = exports.FINDFIELD(e, r);
    s = a.rest(e[u]);
  } else {
    s = a.rest(e[r]);
  }
  if (o.length === 0) {
    return n.value;
  } else if (o.length > 1) {
    return n.num;
  } else {
    return s[o[0]];
  }
};
exports.DMAX = function (e, r, i) {
  if (isNaN(r) && typeof r !== "string") {
    return n.value;
  }
  var o = l(e, i);
  var s = [];
  if (typeof r === "string") {
    var u = exports.FINDFIELD(e, r);
    s = a.rest(e[u]);
  } else {
    s = a.rest(e[r]);
  }
  var c = s[o[0]];
  a.arrayEach(o, function (e) {
    if (c < s[e]) {
      c = s[e];
    }
  });
  return c;
};
exports.DMIN = function (e, r, i) {
  if (isNaN(r) && typeof r !== "string") {
    return n.value;
  }
  var o = l(e, i);
  var s = [];
  if (typeof r === "string") {
    var u = exports.FINDFIELD(e, r);
    s = a.rest(e[u]);
  } else {
    s = a.rest(e[r]);
  }
  var c = s[o[0]];
  a.arrayEach(o, function (e) {
    if (c > s[e]) {
      c = s[e];
    }
  });
  return c;
};
exports.DPRODUCT = function (e, r, i) {
  if (isNaN(r) && typeof r !== "string") {
    return n.value;
  }
  var o = l(e, i);
  var s = [];
  if (typeof r === "string") {
    var c = exports.FINDFIELD(e, r);
    s = a.rest(e[c]);
  } else {
    s = a.rest(e[r]);
  }
  var p = [];
  a.arrayEach(o, function (e) {
    p.push(s[e]);
  });
  p = u(p);
  var d = 1;
  a.arrayEach(p, function (e) {
    d *= e;
  });
  return d;
};
exports.DSTDEV = function (e, r, o) {
  if (isNaN(r) && typeof r !== "string") {
    return n.value;
  }
  var s = l(e, o);
  var c = [];
  if (typeof r === "string") {
    var p = exports.FINDFIELD(e, r);
    c = a.rest(e[p]);
  } else {
    c = a.rest(e[r]);
  }
  var d = [];
  a.arrayEach(s, function (e) {
    d.push(c[e]);
  });
  d = u(d);
  return i.STDEV.S(d);
};
exports.DSTDEVP = function (e, r, o) {
  if (isNaN(r) && typeof r !== "string") {
    return n.value;
  }
  var s = l(e, o);
  var c = [];
  if (typeof r === "string") {
    var p = exports.FINDFIELD(e, r);
    c = a.rest(e[p]);
  } else {
    c = a.rest(e[r]);
  }
  var d = [];
  a.arrayEach(s, function (e) {
    d.push(c[e]);
  });
  d = u(d);
  return i.STDEV.P(d);
};
exports.DSUM = function (e, r, i) {
  if (isNaN(r) && typeof r !== "string") {
    return n.value;
  }
  var s = l(e, i);
  var u = [];
  if (typeof r === "string") {
    var c = exports.FINDFIELD(e, r);
    u = a.rest(e[c]);
  } else {
    u = a.rest(e[r]);
  }
  var p = [];
  a.arrayEach(s, function (e) {
    p.push(u[e]);
  });
  return o.SUM(p);
};
exports.DVAR = function (e, r, o) {
  if (isNaN(r) && typeof r !== "string") {
    return n.value;
  }
  var s = l(e, o);
  var u = [];
  if (typeof r === "string") {
    var c = exports.FINDFIELD(e, r);
    u = a.rest(e[c]);
  } else {
    u = a.rest(e[r]);
  }
  var p = [];
  a.arrayEach(s, function (e) {
    p.push(u[e]);
  });
  return i.VAR.S(p);
};
exports.DVARP = function (e, r, o) {
  if (isNaN(r) && typeof r !== "string") {
    return n.value;
  }
  var s = l(e, o);
  var u = [];
  if (typeof r === "string") {
    var c = exports.FINDFIELD(e, r);
    u = a.rest(e[c]);
  } else {
    u = a.rest(e[r]);
  }
  var p = [];
  a.arrayEach(s, function (e) {
    p.push(u[e]);
  });
  return i.VAR.P(p);
};
};
