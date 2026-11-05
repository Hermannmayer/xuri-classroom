// webpack module 11590 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  g0: function () {
    return M;
  },
  Rk: function () {
    return u;
  },
  AK: function () {
    return o;
  },
  Al: function () {
    return s;
  },
  zE: function () {
    return f;
  }
});
var n = require("./59496.js");
var i = require("./99937.js");
function o(e = "") {
  var t = (0, n.useContext)(i.Z);
  var r = t.theme;
  return `survey-${r}${e}`;
}
var a = require("./83676.js");
function s() {
  return (0, n.useContext)(a.ZX);
}
function u() {
  var e = (0, n.useContext)(a.ZX);
  return e.innerStore;
}
function l(e) {
  var t = n.useRef(e);
  n.useEffect(function () {
    t.current = e;
  });
  return t;
}
var c = l;
var p = typeof performance !== "undefined" ? performance : Date;
function d() {
  return p.now();
}
function f(e, t = 30, r = false) {
  var i = c(e);
  var o = 1000 / t;
  var a = n.useRef(0);
  var s = n.useRef();
  function u() {
    return s.current && clearTimeout(s.current);
  }
  var l = [t, r, i];
  n.useEffect(function () {
    return function () {
      a.current = 0;
      u();
    };
  }, l);
  return n.useCallback(function () {
    var e = arguments;
    var t = d();
    function n() {
      a.current = t;
      u();
      i.current.apply(null, e);
    }
    var l = a.current;
    if (r && l === 0) {
      return n();
    }
    if (t - l > o) {
      if (l > 0) {
        return n();
      }
      a.current = t;
    }
    u();
    s.current = setTimeout(function () {
      n();
      a.current = 0;
    }, o);
  }, l);
}
var g = require("./92145.js");
var m = require("./23639.js");
var v = require("./23874.js");
var y = require("./66439.js");
var h = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
var b = ["Radio", "Checkbox", "Judge", "Select"];
var w = {
  Radio: "单选题",
  Checkbox: "多选题",
  Judge: "判断题",
  FillBlank: "填空题",
  MultipleBlank: "多项填空题",
  HorzBlank: "横向填空题",
  Textarea: "简答题",
  Select: "下拉题",
  Cascader: "级联题",
  MatrixRadio: "矩阵单选题",
  MatrixCheckbox: "矩阵多选题",
  MatrixFillBlank: "矩阵填空题",
  MatrixAuto: "矩阵题",
  Score: "评分题",
  Nps: "NPS 题"
};
function x(e) {
  return (e === null || e === undefined ? undefined : e.replace(/\s+/g, " ").trim()) || "";
}
function E(e) {
  if (!e) {
    return "";
  }
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return x(e.replace(/<[^>]+>/g, " "));
  }
  var t = new DOMParser().parseFromString(e, "text/html");
  return x(t.body.textContent || "");
}
function k(e) {
  return w[e] || e;
}
function S(e) {
  var t;
  return ((t = e.children) === null || t === undefined ? undefined : t.map(function (e, t) {
    var r = E(e.title);
    if (!r) {
      return null;
    }
    var n = h[t] || `${t + 1}`;
    return `${n}. ${r}`;
  }).filter(function (e) {
    return !!e;
  })) || [];
}
function T(e) {
  var t;
  if ((t = e.children) !== null && t !== undefined && t.length) {
    if (b.includes(e.type)) {
      return e.children.map(function (e, t) {
        var r;
        if ((r = e.attribute) === null || r === undefined || !r.examCorrectAnswer) {
          return null;
        }
        var n = h[t] || `${t + 1}`;
        var i = E(e.title);
        if (i) {
          return `${n}. ${i}`;
        } else {
          return n;
        }
      }).filter(function (e) {
        return !!e;
      }).join("；");
    } else {
      return e.children.map(function (e) {
        return x(e.attribute?.examCorrectAnswer);
      }).filter(function (e) {
        return !!e;
      }).join("；");
    }
  } else {
    return "";
  }
}
function C(e) {
  var t = E(e.title);
  if (!t) {
    return "";
  }
  var r = ["请根据以下题目信息生成答案解析。", `题型：${k(e.type)}`, `题目：${t}`];
  var n = S(e);
  if (n.length > 0) {
    r.push("选项：");
    r.push.apply(r, (0, y.Z)(n));
  }
  var i = T(e);
  if (i) {
    r.push(`标准答案：${i}`);
  }
  return r.join("\n");
}
var A = require("./81715.js");
var _ = "题目AI解析";
function O(e) {
  if (e && typeof e === "object" && "data" in e) {
    return e.data?.id;
  }
}
function M(e, t) {
  var r = (0, n.useState)("");
  var i = (0, v.Z)(r, 2);
  var o = i[0];
  var a = i[1];
  var s = (0, n.useState)(false);
  var u = (0, v.Z)(s, 2);
  var l = u[0];
  var c = u[1];
  var p = (0, n.useState)("");
  var d = (0, v.Z)(p, 2);
  var f = d[0];
  var y = d[1];
  var h = (0, n.useState)(false);
  var b = (0, v.Z)(h, 2);
  var w = b[0];
  var x = b[1];
  var E = (0, n.useRef)(undefined);
  var k = (0, n.useRef)(undefined);
  var S = (0, n.useMemo)(function () {
    return C(e);
  }, [e]);
  var T = (0, n.useCallback)(function () {
    var e;
    if ((e = E.current) !== null && e !== undefined) {
      e.close();
    }
    E.current = undefined;
    var t = k.current;
    k.current = undefined;
    if (t) {
      A.hi.closeAIAnswerAnalysisConversation(t).catch(function () {});
    }
  }, []);
  var M = (0, n.useCallback)((0, m.Z)((0, g.Z)().mark(function e() {
    var r;
    var n;
    var i;
    var o;
    return (0, g.Z)().wrap(function (e) {
      while (1) {
        switch (e.prev = e.next) {
          case 0:
            if (t && !l && S) {
              e.next = 2;
              break;
            }
            return e.abrupt("return");
          case 2:
            x(true);
            c(true);
            y("");
            a("");
            T();
            e.next = 9;
            return A.hi.createAIAnswerAnalysisConversation({
              title: _
            });
          case 9:
            r = e.sent;
            n = O(r);
            if (n) {
              e.next = 15;
              break;
            }
            c(false);
            y(r?.message || "创建 AI 解析会话失败");
            return e.abrupt("return");
          case 15:
            k.current = n;
            e.prev = 16;
            e.next = 19;
            return A.hi.createAIAnswerAnalysisStream({
              content: S,
              conversationId: n
            });
          case 19:
            i = e.sent;
            E.current = i;
            o = "";
            i.onmessage = function (e) {
              try {
                var t = JSON.parse(e.data);
                if (t.eventType === "in_progress") {
                  if (t.content) {
                    o += t.content;
                    a(o);
                  }
                  return;
                }
                c(false);
                if (t.eventType === "error") {
                  y(t.content || "AI 解析生成失败");
                }
                T();
              } catch (r) {
                c(false);
                y("AI 解析结果解析失败");
                T();
              }
            };
            i.onerror = function () {
              c(false);
              y("AI 解析生成失败，请稍后重试");
              T();
            };
            e.next = 31;
            break;
          case 26:
            e.prev = 26;
            e.t0 = e.catch(16);
            c(false);
            y(e.t0?.message || "AI 解析生成失败，请稍后重试");
            T();
          case 31:
          case "end":
            return e.stop();
        }
      }
    }, e, null, [[16, 26]]);
  })), [t, l, S, T]);
  (0, n.useEffect)(function () {
    a("");
    y("");
    x(false);
    c(false);
    T();
  }, [T, e.id]);
  (0, n.useEffect)(function () {
    return function () {
      T();
    };
  }, [T]);
  return {
    content: o,
    error: f,
    generate: M,
    loading: l,
    visible: w
  };
}
};
