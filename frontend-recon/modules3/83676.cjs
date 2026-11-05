// webpack module 83676 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  ZX: function () {
    return J.Z;
  },
  SB: function () {
    return j;
  },
  A7: function () {
    return I;
  },
  mc: function () {
    return W;
  },
  tK: function () {
    return ae;
  },
  Gt: function () {
    return S;
  },
  Xn: function () {
    return U;
  },
  vW: function () {
    return D;
  },
  cB: function () {
    return q;
  },
  BB: function () {
    return H;
  },
  _T: function () {
    return C;
  },
  a1: function () {
    return k;
  },
  xb: function () {
    return w;
  },
  ob: function () {
    return G;
  },
  hb: function () {
    return x;
  },
  nj: function () {
    return E;
  },
  CL: function () {
    return F;
  },
  R6: function () {
    return T;
  },
  Op: function () {
    return A;
  },
  Ck: function () {
    return V;
  },
  w2: function () {
    return Y;
  },
  QO: function () {
    return M;
  },
  d0: function () {
    return P;
  },
  kb: function () {
    return L;
  },
  RM: function () {
    return K.RM;
  },
  uF: function () {
    return K.uF;
  },
  lA: function () {
    return z;
  },
  qZ: function () {
    return Q;
  },
  Pn: function () {
    return B;
  }
});
var n = require("./23874.js");
var i = require("./66439.js");
var o = require("./91613.js");
var a = require("./30730.js");
var s = a;
var u = require("./73440.js");
var l = require("./5726.js");
var c = l;
var p = require("./18952.js");
var d = require("./61553.js");
var f = require("./87183.js");
var g = require("./47820.js");
var m = require("./10084.js");
require("./88769.js");
var v = g.y.getIn;
g.y.setIn;
var y = {
  getAgeFromIdNum: function (e) {
    var t = y.getBirthdayFromIdNum(e);
    var r = new Date(t);
    var n = new Date();
    var i = n.getFullYear() - r.getFullYear();
    if (n.getMonth() < r.getMonth() || n.getMonth() == r.getMonth() && n.getDate() < r.getDate()) {
      i--;
    }
    return i;
  },
  getBirthdayFromIdNum: function (e) {
    var t = (e + "").length;
    var r = "";
    if (t === 18) {
      r = e.substr(6, 4) + "/" + e.substr(10, 2) + "/" + e.substr(12, 2);
    }
    if (t === 15) {
      var n = "";
      n = e.charAt(6) + e.charAt(7);
      r = parseInt(n) < 10 ? "20" + e.substr(6, 2) + "/" + e.substr(8, 2) + "/" + e.substr(10, 2) : "19" + e.substr(6, 2) + "/" + e.substr(8, 2) + "/" + e.substr(10, 2);
    }
    return r;
  }
};
var h = (0, o.Z)((0, o.Z)((0, o.Z)({}, s), y), {}, {
  CURRENT_DATE: function (e) {
    return c().format(e || "YYYY-MM-DD");
  },
  CURRENT_TIME: function () {
    return c().format("HH:mm:ss");
  },
  CURRENT_DATETIME: function () {
    return c().format("YYYY-MM-DD HH:mm:ss");
  },
  UUID: function () {
    function e() {
      return Math.floor((1 + Math.random()) * 65536).toString(16).substring(1);
    }
    return `${e()}${e()}-${e()}-${e()}-${e()}-${e()}${e()}${e()}`;
  }
});
function b(e) {
  return e !== undefined && e !== null && (typeof e !== "number" || e.toString() !== "NaN") && (typeof e !== "number" || e.toString() !== "Infinity") && (typeof e !== "string" || e.trim() !== "");
}
function w(e) {
  return !b(e) || typeof e === "object" && (Object.keys(e).length === 0 || Object.values(e).filter(function (e) {
    return e !== undefined;
  }).length === 0);
}
function x(e) {
  if (e.toString() === "[object Object]") {
    var t = true;
    for (var r in e) {
      var n = Object.values(e[r]).filter(function (e) {
        return b(e);
      }).length;
      if (n > 0) {
        t = false;
      }
    }
    return t;
  }
  return false;
}
function E(e) {
  var t = ["SplitLine", "Pagination", "Remark", "QuestionSet"];
  return t.includes(e);
}
function k(e) {
  var t = ["FillBlank", "Textarea", "User", "Dept", "MultipleBlank", "HorzBlank", "Signature", "Radio", "Checkbox", "Select", "Cascader", "MatrixAuto", "MatrixRadio", "MatrixCheckbox", "MatrixFillBlank", "MatrixScore", "MatrixNps", "Upload", "Score", "Nps", "Address", "RichText", "Judge"];
  return t.includes(e);
}
function S(e) {
  var t;
  var r = ((t = e.children) === null || t === undefined ? undefined : t.filter(function (e) {
    return e.type !== "Pagination";
  })) || [];
  var n = (0, o.Z)((0, o.Z)({}, e), {}, {
    children: r
  });
  return n;
}
function T(e) {
  var t;
  var r = {};
  if ((t = e.children) !== null && t !== undefined) {
    t.forEach(function (e) {
      if (e.type === "QuestionSet") {
        if (e.children) {
          Object.assign(r, T(e));
        }
      } else {
        var t;
        var n = ["FillBlank", "MultipleBlank", "MatrixFillBlank", "HorzBlank", "", "Nps", "Score"];
        var i = "boolean";
        if (n.includes(e.type)) {
          i = "number";
        }
        r[e.id] = i;
        if ((t = e.children) !== null && t !== undefined) {
          t.forEach(function (e) {
            r[e.id] = i;
          });
        }
      }
    });
  }
  return r;
}
function C(e, t, r) {
  var n;
  var i;
  var o;
  var a = [];
  var s = [];
  if (t) {
    if ((o = e.children) !== null && o !== undefined) {
      o.filter(function (e) {
        return e.type !== "Pagination" && e.attribute?.display !== "hidden";
      }).forEach(function (e) {
        if (k(e.type) || e.type === "QuestionSet" || r) {
          s = [e];
          a.push(s);
        } else {
          s.push(e);
        }
      });
    }
    return a;
  }
  var u = (n = e.children) === null || n === undefined ? undefined : n.find(function (e) {
    return e.type === "Pagination";
  });
  if (u) {
    if ((i = e.children) !== null && i !== undefined) {
      i.forEach(function (e) {
        if (e.type === "Pagination") {
          s = [];
          a.push(s);
        } else {
          s.push(e);
        }
      });
    }
    return a;
  } else if (e.children) {
    return [e.children];
  } else {
    return [];
  }
}
function A(e) {
  return e.substring(2, e.length - 1).split(".").map(function (e) {
    return e.replace("_", "");
  });
}
function _(e) {
  var t = e;
  if (e.startsWith("_") || e.startsWith("$")) {
    t = t.substring(1);
  }
  if (e.includes("|")) {
    t = t.substring(0, t.indexOf("|"));
  }
  return t;
}
function O(e) {
  var t = e.substring(2, e.length - 1);
  var r = {
    qId: "",
    pattern: _(t)
  };
  var i = t.split("|");
  var o = (0, n.Z)(i, 2);
  var a = o[0];
  var s = o[1];
  r.defaultValue = s;
  if (a.startsWith("_")) {
    r.hasText = true;
  } else if (a.startsWith("$")) {
    r.hasScore = true;
  } else {
    r.hasText = false;
  }
  var u = a.split(".").map(function (e) {
    return e.replace(/^[_$]+/, "");
  });
  var l = (0, n.Z)(u, 3);
  var c = l[0];
  var p = l[1];
  var d = l[2];
  r.qId = c;
  r.optionId = p;
  r.subOptionId = d;
  return r;
}
function M(e, t) {
  var r = O(e);
  var n = r.qId;
  var i = r.optionId;
  var o = r.subOptionId;
  var a = r.defaultValue;
  var s = r.hasText;
  var u = r.pattern;
  var l = r.hasScore;
  var c = t.form;
  var p = t.returnId;
  var g = c.query(n);
  var m = (0, f.rg)(function () {
    return g.get("componentProps")?.schema;
  });
  if (m) {
    var y = m.type;
    if (s && p) {
      return (i || n).replace("_", "");
    }
    var h = g.get("value");
    if (h === undefined) {
      return a;
    }
    if (i === "ocr" && h) {
      var b = Object.values(h)[0];
      var w = "";
      b.some(function (e) {
        return !!e.extra && !!o && !!e.extra[o] && (w = e.extra[o], true);
      });
      return `${w}`;
    }
    var x = (0, f.rg)(function () {
      return v(c.values, u);
    });
    if (s) {
      if (["Radio", "Checkbox", "Select"].includes(m.type) && typeof x === "object") {
        var E;
        var k = (E = m.children) === null || E === undefined ? undefined : E.filter(function (e) {
          return Object.keys(x).includes(e.id);
        }).map(function (e) {
          return e.title;
        });
        if (m.type === "Checkbox") {
          return k;
        } else {
          return k?.[0];
        }
      }
      if ((0, d.Uk)(x)) {
        return Object.values(x)[0];
      } else {
        return x;
      }
    }
    if (l) {
      var S;
      var T = 0;
      if ((S = m.children) !== null && S !== undefined) {
        S.forEach(function (e, t) {
          if (h !== null && h !== undefined && !!h[e.id] && (!i || i === e.id)) {
            T = e.attribute?.score || e.attribute?.examScore || t + 1;
          }
        });
      }
      return T;
    }
    if ((0, d.d8)(x) || (0, d.e9)(x) || (0, d.Bl)(x)) {
      if (typeof x === "string" && x.includes("|")) {
        return x.substring(x.indexOf("|") + 1);
      }
      if (x !== "") {
        return x;
      }
    }
    if (x === undefined) {
      if (a !== undefined) {
        return a;
      } else {
        return m.type !== "Radio" && m.type !== "Checkbox" && m.type !== "Select" && m.type !== "MatrixRadio" && m.type !== "MatrixCheckbox" && undefined;
      }
    }
    if (n && i) {
      if (m.type === "MatrixAuto") {
        return h.map(function (e) {
          return e[i];
        }).filter(function (e) {
          return e;
        }).map(function (e) {
          if ((0, d.sI)(e)) {
            return e;
          } else {
            return `'${e}'`;
          }
        }) || [];
      }
      if (m.type.startsWith("Matrix")) {
        return Object.values(h).map(function (e) {
          return e[i];
        }).filter(function (e) {
          return e;
        }) || [];
      }
      if (typeof x === "string" && x.includes("|")) {
        return x.split("\\|")[1];
      }
    } else if (n && m.type === "MatrixAuto") {
      return h;
    }
    if (n && !i) {
      if (y === "Checkbox") {
        return Object.values(x) || (a ? [a] : []);
      }
      var C = Object.values(x)[0];
      if (typeof C === "string" && C.includes("|")) {
        return C.substring(C.indexOf("|") + 1);
      } else {
        return Object.values(x)[0] || a || "";
      }
    }
    return x;
  }
  console.log(n + " 未找到");
}
function P(e) {
  var t = e.optionTypes;
  var r = e.qValue;
  var i = e.expression;
  var o = e.id2title;
  var a = e.returnId;
  var s = e.qSchema;
  var u = i.substring(2, i.length - 1).split(".");
  var l = (0, n.Z)(u, 2);
  var c = l[0];
  var p = l[1];
  if (c.startsWith("_") && o) {
    if (a) {
      return (p || c).replace("_", "");
    } else if (r) {
      return Object.keys(r).map(function (e) {
        var t = r[e];
        if (t === true) {
          return o[e];
        } else {
          return o[e] || "" + t;
        }
      }).join(";");
    } else {
      return undefined;
    }
  }
  if (c && !p) {
    return !!r && t[c] === "boolean" || (r ? Object.values(r)[0] : "");
  }
  if (c && p) {
    if (s && s.type === "MatrixAuto" && r) {
      return r.map(function (e) {
        return e[p];
      }).filter(function (e) {
        return e;
      }) || [];
    }
    if (s && s.type.startsWith("Matrix") && r) {
      return Object.values(r).map(function (e) {
        return e[p];
      }).filter(function (e) {
        return e;
      }) || [];
    }
    if (t[p] === "boolean") {
      return !!r && r[p] !== undefined;
    }
    if (r) {
      return r[p];
    }
  }
}
function q(e, t) {
  var r;
  var n = {};
  if ((r = e.children) !== null && r !== undefined) {
    r.forEach(function (e) {
      var r = e.attribute && e.attribute[t];
      if (r) {
        n[e.id] = r;
      }
    });
  }
  return n;
}
var N = {
  compile: function (e, t) {
    return (0, m.$)(e, t, h);
  }
};
function R(e) {
  if (typeof e === "number") {
    return e;
  } else {
    return typeof e == "string" && !isNaN(e) && !isNaN(parseFloat(e));
  }
}
function I(e, t) {
  var r;
  if (t && (r = t.attribute) !== null && r !== undefined && r.numericScale) {
    var n = Math.round(e * Math.pow(10, t.attribute.numericScale)) / Math.pow(10, t.attribute.numericScale);
    if (b(n)) {
      return n;
    } else {
      return undefined;
    }
  }
  if (b(e)) {
    if (R(e)) {
      return Math.round(e * 1000) / 1000;
    } else {
      return e;
    }
  }
}
function j() {
  var e = false;
  (function (t) {
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(t) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(t.substr(0, 4))) {
      e = true;
    }
  })(navigator.userAgent || navigator.vendor || window.opera);
  return e;
}
function D(e, t) {
  var r = /#\{[^}]+\}/g;
  var n = true;
  var i = {};
  function o(e) {
    var r = t(e);
    if (typeof r === "object") {
      var o = `v_${L(6)}`;
      i[o] = r;
      return o;
    }
    if ((0, d.H1)(r)) {
      r = `[${r.join(",")}]`;
      return r;
    } else if (b(r)) {
      if (typeof r === "string") {
        r = JSON.stringify(r);
      }
      return r;
    } else {
      n = false;
      return "";
    }
  }
  try {
    var a = e.replace(r, o);
    if (!n) {
      return {
        success: true,
        result: undefined
      };
    }
    var s = N.compile(a, i);
    if (s instanceof Error) {
      throw new Error(a);
    }
    return {
      success: true,
      result: s
    };
  } catch (u) {
    console.warn("公式解析错误", u);
    return {
      success: false,
      result: null
    };
  }
}
function L(e = 10) {
  var t = (0, u.kP)("_0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", e);
  return t();
}
function F() {
  return /MicroMessenger/i.test(window.navigator.userAgent);
}
function Z(e, t = 0) {
  var r = t;
  if (e.offsetParent) {
    do {
      r += e.offsetTop;
    } while (e = e.offsetParent);
    return r;
  }
}
function z(e, t = 0) {
  var r = document.querySelector(`[data-id='${e}']`);
  if (r) {
    var n = Z(r, t);
    window.scroll({
      top: n
    });
  }
}
function U(e) {
  var r;
  var n = [];
  if (k(e.type) && e.attribute?.display !== "hidden") {
    n.push(e);
  }
  if ((r = e.children) !== null && r !== undefined) {
    r.forEach(function (e) {
      return n.push.apply(n, (0, i.Z)(U(e)));
    });
  }
  return n;
}
function B(e, t, r) {
  var n;
  var o;
  var s = (n = e.children) === null || n === undefined ? undefined : n.find(function (e) {
    return e.id === r;
  });
  if (s) {
    var u = s.attribute?.softScope;
    if (u) {
      var l = t[r];
      if (l !== undefined) {
        var c = s === null || s === undefined || (o = s.attribute) === null || o === undefined ? undefined : o.dataType;
        if (c) {
          var d = true;
          switch (c) {
            case "number":
              d = (0, p.$l)(u, l);
              break;
            case "date":
              d = (0, p.sm)(u, l);
              break;
            case "dateTime":
              d = (0, p.de)(u, l);
              break;
            case "time":
              d = (0, p.YM)(u, l);
              break;
            default:
              break;
          }
          if (!d) {
            return s.attribute?.softScopeDesc || "超出限定范围，请确认录入结果是否正确";
          }
        }
      }
    }
  }
}
function V(e, t) {
  var r = /(\[|\()(\d+)\s*,\s*(\d+)(\]|\))/;
  if (!e || !r.test(e)) {
    if (t) {
      return ["[", t[0], t[1], "]"];
    } else {
      return undefined;
    }
  }
  var i = e.match(r).slice(1, 5);
  var o = (0, n.Z)(i, 4);
  var a = o[0];
  var s = o[1];
  var u = o[2];
  var l = o[3];
  return [a, parseInt(s), parseInt(u), l];
}
function H(e, t, r) {
  var n;
  var i = [];
  var o = false;
  if ((n = t.children) !== null && n !== undefined) {
    n.every(function (t) {
      return r !== t.id && (o ? (i.push(t), true) : t.type === "QuestionSet" ? (n = t.children) === null || n === undefined ? undefined : n.forEach(function (t) {
        return r !== t.id && (o && i.push(t), t.id === e.id && (o = true), true);
      }) : (t.id === e.id && (o = true), true));
      var n;
    });
  }
  return i;
}
function W(e) {
  if (e.find(function (e) {
    return e.startsWith("rule_");
  })) {
    return "none";
  } else if (e.find(function (e) {
    return e.startsWith("hidden");
  })) {
    return "hidden";
  } else {
    return "visible";
  }
}
function Y(e) {
  var t;
  var r = [];
  var n = /<span class="ql-insert-blank" data-id="([^"]+)"[^>]*>[\s_]*<\/span>|(__{2,})/g;
  while ((t = n.exec(e)) !== null) {
    if (t[1]) {
      r.push({
        id: t[1],
        index: t.index
      });
    } else if (t[2]) {
      r.push({
        id: "",
        index: t.index
      });
    }
  }
  return r;
}
function Q(e, t) {
  var r = /(__{2,})(?![^<]*<\/span>)/g;
  var n = 0;
  if (e) {
    if (e === null || e === undefined) {
      return undefined;
    } else {
      return e.replace(r, function (e) {
        var r = t[n];
        var i = r ? r.id : "";
        n++;
        return `<span class="ql-insert-blank" data-id="${i}">${e}</span>`;
      });
    }
  } else {
    return "";
  }
}
function $() {
  var e = navigator.userAgent;
  var t = e.match(/OS (\d+)_\d+/);
  if (t) {
    return parseInt(t[1], 10);
  } else {
    return null;
  }
}
function G() {
  var e = $();
  return e !== null && e >= 17;
}
var K = require("./93803.js");
var J = require("./99937.js");
var X = require("./92145.js");
var ee = require("./23639.js");
var te = null;
var re = null;
var ne = "";
function ie() {
  return !!window.AMapUI || !!window.initAMapUI;
}
function oe(e, t, r) {
  if (r()) {
    return Promise.resolve();
  } else {
    return new Promise(function (n, i) {
      var o = document.getElementById(e);
      function a() {
        if (r()) {
          n();
        } else {
          i(new Error(`加载脚本失败: ${t}`));
        }
      }
      function s() {
        return i(new Error(`加载脚本失败: ${t}`));
      }
      if (o) {
        o.addEventListener("load", a, {
          once: true
        });
        o.addEventListener("error", s, {
          once: true
        });
        return;
      }
      var u = document.createElement("script");
      u.id = e;
      u.src = t;
      u.async = true;
      u.addEventListener("load", a, {
        once: true
      });
      u.addEventListener("error", s, {
        once: true
      });
      document.head.appendChild(u);
    });
  }
}
function ae(e) {
  return se.apply(this, arguments);
}
function se() {
  se = (0, ee.Z)((0, X.Z)().mark(function e(t) {
    var r;
    var n;
    var i;
    return (0, X.Z)().wrap(function (e) {
      while (1) {
        switch (e.prev = e.next) {
          case 0:
            r = t.key;
            n = t.securityJsCode;
            i = `${r}:${n}`;
            if (!window.AMap || ne !== i) {
              window._AMapSecurityConfig = {
                securityJsCode: n
              };
              ne = i;
              te = oe("surveyking-amap-jsapi", `https://webapi.amap.com/maps?v=1.4.15&key=${r}&plugin=AMap.Geocoder,AMap.Geolocation`, function () {
                return !!window.AMap;
              });
            }
            e.next = 5;
            return te;
          case 5:
            if (!ie()) {
              re = re || oe("surveyking-amap-ui", "https://webapi.amap.com/ui/1.1/main-async.js", ie);
            }
            e.next = 8;
            return re;
          case 8:
            if (window.initAMapUI) {
              window.initAMapUI();
            }
          case 9:
          case "end":
            return e.stop();
        }
      }
    }, e);
  }));
  return se.apply(this, arguments);
}
};
