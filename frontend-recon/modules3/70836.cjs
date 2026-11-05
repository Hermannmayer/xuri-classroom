// webpack module 70836 — body from webcrack
module.exports = function (module, exports, require) {
var r = "=";
var n = [">", ">=", "<", "<=", "=", "<>"];
var i = "operator";
var o = "literal";
var a = [i, o];
function s(e, t) {
  if (a.indexOf(t) === -1) {
    throw new Error("Unsupported token type: " + t);
  }
  return {
    value: e,
    type: t
  };
}
function u(e) {
  if (typeof e === "string") {
    if (/^\d+(\.\d+)?$/.test(e)) {
      e = e.indexOf(".") === -1 ? parseInt(e, 10) : parseFloat(e);
    }
  }
  return e;
}
function l(e) {
  var t = e.length;
  var r = [];
  var n = 0;
  var i = "";
  var o = "";
  while (n < t) {
    var a = e.charAt(n);
    switch (a) {
      case ">":
      case "<":
      case "=":
        o += a;
        if (i.length > 0) {
          r.push(i);
          i = "";
        }
        break;
      default:
        if (o.length > 0) {
          r.push(o);
          o = "";
        }
        i += a;
        break;
    }
    n++;
  }
  if (i.length > 0) {
    r.push(i);
  }
  if (o.length > 0) {
    r.push(o);
  }
  return r;
}
function c(e) {
  var t = "";
  var a = [];
  for (var l = 0; l < e.length; l++) {
    var c = e[l];
    if (l === 0 && n.indexOf(c) >= 0) {
      a.push(s(c, i));
    } else {
      t += c;
    }
  }
  if (t.length > 0) {
    a.push(s(u(t), o));
  }
  if (a.length > 0 && a[0].type !== i) {
    a.unshift(s(r, i));
  }
  return a;
}
function p(e) {
  var t;
  var r = [];
  for (var n = 0; n < e.length; n++) {
    var a = e[n];
    switch (a.type) {
      case i:
        t = a.value;
        break;
      case o:
        r.push(a.value);
        break;
    }
  }
  return d(r, t);
}
function d(e, t) {
  var r = false;
  switch (t) {
    case ">":
      r = e[0] > e[1];
      break;
    case ">=":
      r = e[0] >= e[1];
      break;
    case "<":
      r = e[0] < e[1];
      break;
    case "<=":
      r = e[0] <= e[1];
      break;
    case "=":
      r = e[0] == e[1];
      break;
    case "<>":
      r = e[0] != e[1];
      break;
  }
  return r;
}
exports.TOKEN_TYPE_OPERATOR = i;
exports.TOKEN_TYPE_LITERAL = o;
exports.parse = function (e) {
  return c(l(e));
};
exports.createToken = s;
exports.compute = p;
};
