// webpack module 32429 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  ff: function () {
    return P;
  },
  SB: function () {
    return x;
  },
  Xn: function () {
    return A;
  },
  vW: function () {
    return E;
  },
  CL: function () {
    return S;
  },
  XO: function () {
    return C;
  },
  R6: function () {
    return y;
  },
  Op: function () {
    return h;
  },
  d0: function () {
    return b;
  },
  kb: function () {
    return k;
  },
  MA: function () {
    return O;
  },
  iq: function () {
    return T;
  }
});
var n = require("./21487.js");
var i = require("./23874.js");
var o = require("./66439.js");
var a = require("./91613.js");
var s = require("./30730.js");
var u = s;
var l = require("./73440.js");
var c = require("./88769.js");
var p = require("./10084.js");
function d(e, t) {
  var n;
  return (c.lw === null || c.lw === undefined || (n = (0, c.lw)()) === null || n === undefined ? undefined : n.formatMessage({
    id: e,
    defaultMessage: t
  })) ?? t;
}
var f = {
  getAgeFromIdNum: function (e) {
    var t = f.getBirthdayFromIdNum(e);
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
var g = (0, a.Z)((0, a.Z)({}, u), f);
function m(e) {
  return e !== undefined && e !== null && (typeof e !== "number" || e.toString() !== "NaN") && (typeof e !== "number" || e.toString() !== "Infinity") && (typeof e !== "string" || e.trim() !== "");
}
function v(e) {
  var t = ["FillBlank", "Textarea", "User", "Dept", "MultipleBlank", "HorzBlank", "Signature", "Radio", "Checkbox", "Select", "Cascader", "MatrixAuto", "MatrixRadio", "MatrixCheckbox", "MatrixFillBlank", "MatrixScore", "MatrixNps", "Upload", "Score", "Nps", "Address", "Drug"];
  return t.includes(e);
}
function y(e) {
  var t;
  var r = {};
  if ((t = e.children) !== null && t !== undefined) {
    t.forEach(function (e) {
      if (e.type === "QuestionSet") {
        if (e.children) {
          Object.assign(r, y(e));
        }
      } else {
        var t;
        var n = ["FillBlank", "MultipleBlank", "MatrixFillBlank", "HorzBlank", "Nps"];
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
function h(e) {
  return e.substring(2, e.length - 1).split(".").map(function (e) {
    return e.replace("_", "");
  });
}
function b(e, t, r, n) {
  var o = r.substring(2, r.length - 1).split(".");
  var a = (0, i.Z)(o, 2);
  var s = a[0];
  var u = a[1];
  if (s.startsWith("_") && n) {
    if (t) {
      return Object.keys(t).map(function (e) {
        var r = t[e];
        if (r === true) {
          return n[e];
        } else {
          return n[e] || "" + r;
        }
      }).join(";");
    } else {
      return undefined;
    }
  }
  if (s && !u) {
    return !!t && e[s] === "boolean" || (t ? Object.values(t)[0] : "");
  }
  if (s && u) {
    if (e[u] === "boolean") {
      return !!t && t[u] !== undefined;
    }
    if (t) {
      return t[u];
    }
  }
}
var w = {
  compile: function (e, t) {
    return (0, p.$)(e, t, g);
  }
};
function x() {
  var e = false;
  (function (t) {
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(t) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(t.substr(0, 4))) {
      e = true;
    }
  })(navigator.userAgent || navigator.vendor || window.opera);
  return e;
}
function E(e, t) {
  var r = 0;
  var n = [];
  var i = true;
  while (r < e.length) {
    var o = e[r];
    var a = e[r + 1];
    if (o === "#" && a === "{") {
      var s = "";
      while (o !== "}") {
        s += o;
        r++;
        o = e[r];
      }
      s += "}";
      r++;
      var u = t(s);
      if (!m(u)) {
        i = false;
        break;
      }
      if (typeof u === "string") {
        n.push(JSON.stringify(u));
      } else {
        n.push(u);
      }
    } else {
      n.push(o);
      r++;
    }
  }
  if (!i) {
    return {
      success: true,
      result: undefined
    };
  }
  try {
    var l = w.compile(n.join(""), {});
    return {
      success: true,
      result: l
    };
  } catch (c) {
    console.error("公式解析失败", n.join(""));
    return {
      success: false
    };
  }
}
function k(e = 10) {
  var t = (0, l.kP)("_0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", e);
  return t();
}
function S() {
  return /MicroMessenger/i.test(window.navigator.userAgent);
}
function T(e) {
  var t;
  for (var r = arguments.length, n = new Array(r > 1 ? r - 1 : 0), i = 1; i < r; i++) {
    n[i - 1] = arguments[i];
  }
  return ((t = e.children) === null || t === undefined ? undefined : t.some(function (e) {
    return !!e.attribute && !!n.some(function (t) {
      return e.attribute?.[t] !== undefined;
    }) || !!T.apply(undefined, [e].concat(n));
  })) || false;
}
function C(e, t) {
  var r;
  var i = {};
  function o(e) {
    var t;
    if ((t = e.children) !== null && t !== undefined) {
      t.forEach(function (t) {
        i[t.id] = {
          type: e.type,
          qId: e.id
        };
      });
    }
  }
  if (e !== null && e !== undefined && (r = e.children) !== null && r !== undefined) {
    r.forEach(function (e) {
      var t;
      if (e.type === "QuestionSet") {
        if ((t = e.children) !== null && t !== undefined) {
          t.forEach(function (e) {
            return o(e);
          });
        }
      } else {
        o(e);
      }
    });
  }
  var s = {};
  Object.keys(t.query).forEach(function (e) {
    var r = t.query[e];
    if (i[e]) {
      s[i[e].qId] = (0, a.Z)((0, a.Z)({}, s[i[e].qId]), {}, (0, n.Z)({}, e, r));
    }
  });
  return s;
}
function A(e) {
  var r;
  var n = [];
  if (v(e.type) && e.attribute?.display !== "hidden") {
    n.push(e);
  }
  if ((r = e.children) !== null && r !== undefined) {
    r.forEach(function (e) {
      return n.push.apply(n, (0, o.Z)(A(e)));
    });
  }
  return n;
}
function _(e) {
  var t = {};
  var r = function e(r) {
    t[r.id] = r.title;
    if (r.children) {
      r.children.forEach(e);
    }
  };
  r(e);
  return t;
}
function O(e, t, r, n) {
  t ||= d("pages.answer.result.defaultMessage", "问卷到此结束，感谢您的参与！");
  var o = new DOMParser();
  var a = o.parseFromString(t, "text/html");
  a.querySelectorAll(".ql-label").forEach(function (e) {
    e.textContent = `${n || 0}`;
  });
  var s = y(e);
  var u = _(e);
  a.querySelectorAll(".ql-score-logic").forEach(function (e) {
    var t = e.dataset.formula;
    if (t) {
      var a = E(t, function (e) {
        var t = h(e);
        var o = (0, i.Z)(t, 1);
        var a = o[0];
        var l = r[a];
        if (a === "score") {
          return n;
        } else {
          return b(s, l, e, u);
        }
      });
      if (a.success) {
        e.textContent = `${a.result ?? ""}`;
      }
    }
  });
  for (var l = Array.from(a.body.childNodes), c = 0; c < l.length; c++) {
    var p;
    if ((p = document.getElementById("result-message")) !== null && p !== undefined) {
      p.appendChild(l[c]);
    }
  }
}
var M = require("./59496.js");
var P = M.createContext({});
};
