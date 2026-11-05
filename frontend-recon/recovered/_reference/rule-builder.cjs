// webpack module 86343 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Mt: function () {
    return W;
  },
  MB: function () {
    return re;
  },
  HN: function () {
    return q;
  },
  we: function () {
    return I;
  },
  k9: function () {
    return O;
  },
  jI: function () {
    return Q;
  }
});
var n = require("./59496.js");
var i = require("./83676.js");
var o = require("./99937.js");
var a = require("./93803.js");
var s = require("./66439.js");
var u = require("./23874.js");
var l = require("./1521.js");
var c = require("./87183.js");
var p = require("./4637.js");
function d(e, t) {
  var r = [];
  e.conditionItem.forEach(function (e) {
    var t = e.condition;
    var n = e.qId;
    if (t === "CHECKED" || t === "UNCHECKED") {
      var i;
      var o = (i = e.oId) === null || i === undefined ? undefined : i.map(function (t) {
        return `#{${e.qId}.${t}}`;
      }).join(" ,");
      if (t === "CHECKED") {
        r.push(`AND(${o})`);
      } else {
        r.push(`NOT(AND(${o}))`);
      }
    } else if (t === "ANSWERED") {
      r.push(`AND(#{+${n}})`);
    } else if (t === "NOT_ANSWERED") {
      r.push(`NOT(#{+${n}})`);
    } else if (t === "SHOW") {
      r.push(`AND(#{-${n}})`);
    } else if (t === "HIDE") {
      r.push(`NOT(#{-${n}})`);
    } else if (t && [">", "<", "=="].includes(t)) {
      r.push(`#{${n}} ${t} ${e.compare}`);
    }
  });
  if (e.conditionLogic === "AND") {
    return `AND(${r.join(" ,")})`;
  } else {
    return `OR(${r.join(" ,")})`;
  }
}
function f(e) {
  var r = e.schema;
  var o = r.attribute?.globalRule;
  var a = (0, n.useMemo)(function () {
    return (0, i.Xn)(r);
  }, [r]);
  var f = (0, n.useContext)(i.ZX);
  var g = f.optionTypes;
  var m = (0, l.cI)();
  if (o) {
    return (0, p.jsx)(l.gN, {
      name: "_globalField",
      reactions: o.map(function (e, t) {
        var n = JSON.parse(e);
        var o = d(n, a);
        var l = n.conditionItem.map(function (e) {
          return e.qId;
        });
        var p = null;
        a.forEach(function (e) {
          if (l.includes(e.id)) {
            p = e;
          }
        });
        return function (e) {
          var a = (0, i.vW)(o, function (t) {
            var r = (0, i.Op)(t);
            var n = (0, u.Z)(r, 2);
            var o = n[0];
            n[1];
            if (o.startsWith("+")) {
              var a = e.query(o.substring(1)).get("value");
              return !!a;
            }
            if (o.startsWith("-")) {
              var s = e.query(o.substring(1)).get("display");
              return s === "visible";
            }
            var l = e.query(o).get("value");
            return (0, i.d0)({
              optionTypes: g,
              qValue: l,
              expression: t
            });
          });
          n.result.forEach(function (e, n) {
            var o = `${t}-${n}`;
            var u = e.qId;
            if (u) {
              var l = m.query(u).take();
              if (l) {
                if (e.type === "show") {
                  var d = (0, c.rg)(function () {
                    return l.data;
                  });
                  if (a.success) {
                    var f = `rule_visible_global${o}`;
                    if (a.result && d.includes(f)) {
                      d.splice(d.findIndex(function (e) {
                        return e === f;
                      }), 1);
                    } else if (!a.result && !d.includes(f)) {
                      d.push(f);
                    }
                    l.data = (0, s.Z)(d);
                  }
                }
                if (e.type === "jump") {
                  var g = `rule_jump_global${o}`;
                  if (p === null) {
                    return;
                  }
                  var v = (0, i.BB)(p, r, u);
                  if (a.success) {
                    v.forEach(function (e) {
                      var t = m.query(e.id).take();
                      if (t) {
                        var r = (0, c.rg)(function () {
                          return t.data || [];
                        });
                        if (a.result && !r.includes(g)) {
                          r.push(g);
                        } else if (!a.result && r.includes(g)) {
                          r.splice(r.findIndex(function (e) {
                            return e === g;
                          }), 1);
                        }
                        t.data = (0, s.Z)(r);
                      }
                    });
                  }
                }
              }
            }
          });
        };
      })
    });
  } else {
    return (0, p.jsx)(p.Fragment, {});
  }
}
var g = require("./11590.js");
var m = require("./21487.js");
require("./45068.js");
var v = require("./11961.js");
var y = require("./91613.js");
var h = require("./61553.js");
require("./41315.js");
var b = require("./16698.js");
require("./51554.js");
var w = require("./9423.js");
var x = w.Z.Text;
w.Z.Link;
var E = {
  FillBlank: "单行文本题",
  Textarea: "多行文本题",
  User: "成员题",
  Dept: "部门题",
  MultipleBlank: "多项填空题",
  HorzBlank: "横向填空题",
  Signature: "签名题",
  Radio: "单选题",
  Checkbox: "多选题",
  Select: "下拉题",
  Cascader: "级联题",
  MatrixAuto: "矩阵自增题",
  MatrixRadio: "矩阵单选题",
  MatrixCheckbox: "矩阵多选题",
  MatrixFillBlank: "矩阵填空题",
  MatrixScore: "矩阵打分提",
  MatrixNps: "矩阵NPS题",
  Upload: "上传题",
  Score: "打分题",
  Nps: "Nps 题",
  Address: "地理位置题",
  Survey: "问卷",
  QuestionSet: "题组",
  Pagination: "分页",
  Remark: "备注",
  SplitLine: "分割线",
  Option: "选项",
  Barcode: "条码题",
  Button: "按钮",
  Drug: "药物题"
};
var k = {
  antd: "PC端主题",
  antdForm: "表单主题",
  antdMobile: "手机端主题"
};
function S(e) {
  var t = e.schema;
  var r = (0, g.Al)();
  var n = r.theme;
  return (0, p.jsx)("div", {
    style: {
      textAlign: "center"
    },
    children: (0, p.jsxs)(b.Z, {
      children: ["当前主题", (0, p.jsxs)(x, {
        mark: true,
        children: ["(", k[n], ")"]
      }), "暂不支持", (0, p.jsx)(x, {
        strong: true,
        children: E[t.type]
      }), " 题型"]
    })
  });
}
var T = require("./67608.js");
var C = require("./81715.js");
var A = require("./74834.js");
var _ = (0, l.Pi)(function (e) {
  var t = e.id;
  var r = e.index;
  var c = e.qsIndex;
  var d = (0, n.useState)();
  var f = (0, u.Z)(d, 2);
  var b = f[0];
  var w = f[1];
  var x = b?.type;
  var E = (0, n.useContext)(o.Z);
  var k = E.theme;
  var _ = E.onLink;
  var O = (0, l.cI)();
  var M = O.getFieldState(t, function (e) {
    return e.display;
  });
  var P = (0, g.Rk)();
  var q = P.props.onLazyLoad;
  var N = (0, n.useMemo)(function () {
    return !!O.values[t];
  }, []);
  var R = (0, n.useMemo)(function () {
    if (b) {
      return (0, l.$j)((0, a.I8)(k, x) || S, (0, l.jM)(function (e, t) {
        return (0, y.Z)((0, y.Z)({}, e), {}, {
          onChange: function (r, n) {
            var i;
            var o;
            function a() {
              if (t.selfErrors.length > 0) {
                t.validate().catch(function () {});
              }
            }
            var s = (i = b.children) === null || i === undefined ? undefined : i.find(function (e) {
              return e.id === n;
            });
            if ((s === null || s === undefined || (o = s.attribute) === null || o === undefined || !o.readOnly) && !e.readOnly) {
              if ((0, h.xb)(r)) {
                t.onInput(undefined);
                a();
                return;
              }
              if (r) {
                Object.keys(r).forEach(function (e) {
                  if (r[e] === undefined) {
                    r[e] = "";
                  }
                });
              }
              t.onInput(r);
              a();
            }
          },
          onBlur: function (e, r) {
            if (r) {
              var n;
              var o = (n = b.children) === null || n === undefined ? undefined : n.find(function (e) {
                return e.id === r;
              });
              if (o !== null && o !== undefined && o.linkSurveys && _) {
                _({
                  optionId: r,
                  questionId: b.id,
                  value: e[r]
                });
              }
              var a = (0, i.Pn)(b, e, r);
              if (a) {
                v.Z.confirm({
                  title: "提示信息",
                  content: (0, p.jsx)(T.Z, {
                    html: a
                  }),
                  okText: "是",
                  cancelText: "否",
                  onOk: function () {
                    t.onInput(e);
                  },
                  onCancel: function () {
                    e[r] = undefined;
                    t.onInput(e);
                  }
                });
              }
            }
            t.onBlur(e);
          }
        });
      }), (0, l.vl)((0, a.Ub)(k, x)));
    } else {
      return (0, p.jsx)(p.Fragment, {});
    }
  }, [b, k, x]);
  var I = (0, n.useCallback)(function (e) {
    if (b) {
      return (0, p.jsx)("div", {
        tabIndex: -1,
        onBlur: e?.onBlur,
        "data-id": e.schema.id,
        style: {
          outline: "none"
        },
        children: n.createElement((0, a.GZ)(k, "Question"), e)
      });
    } else {
      return (0, p.jsx)(p.Fragment, {});
    }
  }, [k, b]);
  var j = (0, n.useMemo)(function () {
    return (0, l.$j)(I, (0, l.jM)(function (e, t) {
      return (0, y.Z)((0, y.Z)({}, e), {}, {
        error: t.selfErrors.length ? (0, s.Z)(t.selfErrors) : [],
        warning: t.selfWarnings.length ? t.selfWarnings : [],
        required: t.required,
        onChange: function (r) {
          function n() {
            if (t.selfErrors.length > 0) {
              t.validate().catch(function () {});
            }
          }
          if (!e.readOnly) {
            if ((0, h.xb)(r)) {
              t.onInput(undefined);
              n();
              return;
            }
            if (r) {
              Object.keys(r).forEach(function (e) {
                if (r[e] === undefined) {
                  r[e] = "";
                }
              });
            }
            t.onInput(r);
            n();
          }
        },
        onBlur: function (e, r) {
          if (r) {
            var n = (0, i.Pn)(b, e, r);
            if (n) {
              v.Z.confirm({
                title: "提示信息",
                content: (0, p.jsx)(T.Z, {
                  html: n
                }),
                okText: "是",
                cancelText: "否",
                onOk: function () {
                  t.onInput(e);
                },
                onCancel: function () {
                  e[r] = undefined;
                  t.onInput(e);
                }
              });
            }
          }
          t.onBlur(e);
        }
      });
    }));
  }, [I]);
  var D = (0, n.useMemo)(function () {
    return (0, l.$j)((0, a.I8)(k, x), (0, l.jM)(function (e) {
      return (0, y.Z)({}, e);
    }));
  }, [k, x]);
  var L = O.getFieldState(t, function (e) {
    return e.componentProps?.preload;
  });
  (0, n.useEffect)(function () {
    if (!b && q && (M === "visible" || L)) {
      q(t).then(function (e) {
        w(e.schema);
        var r = O.query(t).take();
        if (r !== null && r !== undefined) {
          r.setComponentProps({
            note: e.note
          });
        }
      });
    }
  }, [M, b, L]);
  (0, n.useEffect)(function () {
    if (b) {
      var e = O.query(t).take();
      if (e) {
        e.setDecorator(j);
        e.setDecoratorProps({
          schema: b,
          index: r,
          qsIndex: c
        });
        if (e !== null && e !== undefined) {
          e.setComponent(R);
        }
        if (e !== null && e !== undefined) {
          e.setComponentProps({
            schema: b,
            controlShow: undefined
          });
        }
        var n = O.values[t];
        if (n) {
          P.computeReviewAnswer(b, n, true, false);
          e.readOnly = true;
        }
      }
    }
  }, [b]);
  var F = P.reviewAnswer[t];
  var Z = F?.visible;
  var z = (0, A.H)();
  (0, n.useEffect)(function () {
    if (!N && Z) {
      var e = O.query(t).take();
      C.hi.updateUserBook({
        templateId: t,
        answerId: z.answerId,
        answer: (0, m.Z)({}, `${t}`, e.value)
      }).then(function (e) {
        var r = P.answerSheet.find(function (e) {
          return e.id === t;
        });
        if (e.success && r && e.data.qscore !== undefined) {
          if (e.data.qscore > 0) {
            r.isCorrect = true;
          } else {
            r.isCorrect = false;
          }
          r.finished = true;
        }
      });
      e.readOnly = true;
    }
  }, [Z]);
  if (b && (0, i.nj)(b.type)) {
    return (0, p.jsx)(p.Fragment, {
      children: (0, p.jsx)(l.jG, {
        name: t,
        data: [],
        component: [D, {
          schema: b,
          controlShow: undefined
        }]
      })
    });
  } else {
    return (0, p.jsx)(p.Fragment, {
      children: (0, p.jsx)(l.gN, {
        name: t,
        display: "hidden",
        data: []
      })
    });
  }
});
function O(e) {
  var t = (0, n.useContext)(o.Z);
  var r = t.theme;
  var s = t.footerVisible;
  var u = t.headerVisible;
  var l = e.schema;
  var c = (0, g.Rk)();
  var d = c.lazy;
  function m(e) {
    var t = (0, a.GZ)(r, "Survey");
    if (t) {
      return n.createElement(t, {
        schema: l,
        footerVisible: s,
        headerVisible: u
      }, e);
    }
  }
  function v() {
    var e;
    var t = -1;
    if ((e = l.children) === null || e === undefined) {
      return undefined;
    } else {
      return e.map(function (e) {
        var s = e.type;
        var u = e.id;
        if ((!(0, i.nj)(s) || s === "QuestionSet") && e.attribute?.display !== "hidden" && e.attribute?.examAnswerMode !== "none") {
          t++;
        }
        if (s === "QuestionSet") {
          return (0, p.jsx)(I, {
            schema: e,
            index: t
          }, u);
        } else if (d) {
          return (0, p.jsx)(_, {
            id: u,
            index: e.attribute?.examAnswerMode === "none" ? -1 : t
          }, u);
        } else {
          return (0, p.jsx)(q, {
            schema: e,
            index: e.attribute?.examAnswerMode === "none" ? -1 : t
          }, u);
        }
      });
    }
  }
  return (0, p.jsxs)(p.Fragment, {
    children: [m(v()), (0, p.jsx)(f, {
      schema: l
    })]
  });
}
var M = require("./67215.js");
var P = require("./46026.js");
var q = (0, l.Pi)(function (e) {
  var d = e.schema;
  var f = e.index;
  var b = e.qsIndex;
  var w = d.id;
  var x = d.type;
  var E = (0, n.useContext)(o.Z);
  var k = E.theme;
  var A = E.optionTypes;
  var _ = E.id2title;
  var O = E.schema;
  var q = E.onLink;
  var I = E.triggerType;
  var j = (0, l.cI)();
  var D = (0, g.Rk)();
  var L = (0, C.dD)();
  var F = (0, n.useMemo)(function () {
    return (0, i.cB)(d, "calculate");
  }, [d]);
  var Z = (0, n.useRef)();
  var z = (0, n.useRef)([]);
  var U = (0, n.useMemo)(function () {
    if (d.attribute?.display === "hidden") {
      return ["hidden_self"];
    } else {
      return [];
    }
  }, [d]);
  var B = (0, n.useMemo)(function () {
    return (0, l.$j)((0, a.I8)(k, x) || S, (0, l.jM)(function (e, t) {
      return (0, y.Z)((0, y.Z)({}, e), {}, {
        onChange: function (r, n) {
          var o;
          var a;
          function s() {
            if (t.selfErrors.length > 0) {
              t.validate().catch(function () {});
            }
          }
          var u = (o = d.children) === null || o === undefined ? undefined : o.find(function (e) {
            return e.id === n;
          });
          if ((u === null || u === undefined || (a = u.attribute) === null || a === undefined || !a.readOnly) && !e.readOnly) {
            if ((0, h.xb)(r)) {
              t.onInput(undefined);
              s();
              return;
            }
            if (x.startsWith("Matrix") && (0, i.hb)(r)) {
              s();
              t.onInput(undefined);
              return;
            }
            if (r) {
              Object.keys(r).forEach(function (e) {
                if (r[e] === undefined) {
                  r[e] = "";
                }
              });
            }
            t.onInput(r);
            s();
          }
        },
        onBlur: function (e, r) {
          if (r) {
            var n;
            var o = (n = d.children) === null || n === undefined ? undefined : n.find(function (e) {
              return e.id === r;
            });
            if (o !== null && o !== undefined && o.linkSurveys && q) {
              q({
                optionId: r,
                questionId: d.id,
                value: e[r]
              });
            }
            var a = (0, i.Pn)(d, e, r);
            if (a) {
              if (L) {
                P.Vq.confirm({
                  title: "警告",
                  content: (0, p.jsx)(T.Z, {
                    html: a
                  }),
                  confirmText: "是",
                  cancelText: "否"
                }).then(function (n) {
                  if (!n) {
                    e[r] = undefined;
                  }
                  t.onBlur(e);
                });
              } else {
                v.Z.confirm({
                  title: "提示信息",
                  content: (0, p.jsx)(T.Z, {
                    html: a
                  }),
                  okText: "是",
                  cancelText: "否",
                  onOk: function () {
                    t.onBlur(e);
                  },
                  onCancel: function () {
                    e[r] = undefined;
                    t.onBlur(e);
                  }
                });
              }
            } else {
              t.onBlur(e);
            }
          }
        }
      });
    }), (0, l.vl)((0, a.Ub)(k, x)));
  }, [d, k, x]);
  var V = (0, n.useCallback)(function (e) {
    return (0, p.jsx)("div", {
      tabIndex: -1,
      onBlur: e?.onBlur,
      "data-id": e.schema.id,
      children: n.createElement((0, a.GZ)(k, "Question"), e)
    });
  }, [k]);
  var H = (0, n.useMemo)(function () {
    return (0, l.$j)(V, (0, l.jM)(function (e, t) {
      return (0, y.Z)((0, y.Z)({}, e), {}, {
        error: t.selfErrors.length ? (0, s.Z)(t.selfErrors) : [],
        warning: t.selfWarnings.length ? t.selfWarnings : [],
        required: t.required,
        onChange: function (r, n) {
          function o() {
            if (t.selfErrors.length > 0) {
              t.validate().catch(function () {});
            }
          }
          if (!e.readOnly) {
            if ((0, h.xb)(r)) {
              t.onInput(undefined);
              o();
              return;
            }
            if (x.startsWith("Matrix") && (0, i.hb)(r)) {
              o();
              t.onInput(undefined);
              return;
            }
            if (r) {
              Object.keys(r).forEach(function (e) {
                if (r[e] === undefined) {
                  r[e] = "";
                }
              });
            }
            t.onInput(r);
            o();
          }
        },
        onBlur: function (e, r) {
          if (r) {
            var n = (0, i.Pn)(d, e, r);
            if (n) {
              v.Z.confirm({
                title: "提示信息",
                content: (0, p.jsx)(T.Z, {
                  html: n
                }),
                okText: "是",
                cancelText: "否",
                onOk: function () {
                  t.onInput(e);
                },
                onCancel: function () {
                  e[r] = undefined;
                  t.onInput(e);
                }
              });
            }
          }
        }
      });
    }));
  }, [V]);
  var W = (0, n.useMemo)(function () {
    return (0, l.$j)((0, a.I8)(k, x), (0, l.jM)(function (e, t) {
      return (0, y.Z)({}, e);
    }));
  }, [k, x]);
  if ((0, i.nj)(d.type)) {
    return (0, p.jsxs)(p.Fragment, {
      children: [(0, p.jsx)(l.jG, {
        name: w,
        data: U,
        component: [W, {
          schema: d,
          controlShow: undefined
        }],
        reactions: [function (e) {
          var r = d.attribute?.replaceTextRule;
          if (r) {
            var n = (0, i.vW)(r, function (t) {
              var r = (0, i.Op)(t);
              var n = (0, u.Z)(r, 1);
              var o = n[0];
              var a = e.query(o).get("value");
              return (0, i.d0)({
                optionTypes: A,
                qValue: a,
                expression: t,
                id2title: _
              });
            });
            var o = "";
            if (n.success && n.result) {
              o = n.result;
            }
            e.setComponentProps((0, y.Z)((0, y.Z)({}, e.componentProps), {}, {
              replaceTitle: o
            }));
          }
        }, function (e) {
          var r = d.attribute?.visibleRule;
          if (r) {
            var n = (0, i.vW)(r, function (t) {
              var r = (0, i.Op)(t);
              var n = (0, u.Z)(r, 2);
              var o = n[0];
              n[1];
              var a = e.query(o).get("value");
              return (0, i.d0)({
                optionTypes: A,
                qValue: a,
                expression: t
              });
            });
            if (n.success) {
              var o = `rule_visible_${d.id}`;
              var a = (0, c.rg)(function () {
                return e.data;
              });
              if (n.result && a.includes(o)) {
                a.splice(a.findIndex(function (e) {
                  return e === o;
                }), 1);
              } else if (!n.result && !a.includes(o)) {
                a.push(o);
              }
              e.data = (0, s.Z)(a);
            }
          }
        }]
      }), (0, p.jsx)(N, {
        id: w
      })]
    });
  } else {
    return (0, p.jsxs)(p.Fragment, {
      children: [(0, p.jsx)(l.gN, {
        name: w,
        display: d.attribute?.display,
        readPretty: d.attribute?.readOnly,
        component: [B, {
          schema: d,
          controlShow: undefined
        }],
        data: U,
        decorator: [H, {
          schema: d,
          index: f,
          qsIndex: b
        }],
        validator: (0, M.r)(d, k, I),
        reactions: [function (e) {
          var r = d.attribute?.finishRule;
          if (r) {
            var n = (0, i.vW)(r, function (t) {
              var r = (0, i.Op)(t);
              var n = (0, u.Z)(r, 2);
              var o = n[0];
              n[1];
              var a = e.query(o).get("value");
              return (0, i.d0)({
                optionTypes: A,
                qValue: a,
                expression: t
              });
            });
            if (n.success && n.result !== undefined) {
              var o = (0, i.BB)(d, O);
              o.forEach(function (e) {
                var t = j.query(e.id).take();
                if (t) {
                  var r = `rule_finish_${d.id}`;
                  var i = (0, c.rg)(function () {
                    return t.data;
                  });
                  if (n.result && i && !i.includes(r)) {
                    i.push(r);
                  } else if (!n.result && i && i.includes(r)) {
                    i.splice(i.findIndex(function (e) {
                      return e === r;
                    }), 1);
                  }
                  t.data = (0, s.Z)(i);
                }
              });
            }
          }
        }, function (e) {
          var r = d.attribute?.jumpRule;
          if (r) {
            var n = (0, i.vW)(r, function (t) {
              var r = (0, i.Op)(t);
              var n = (0, u.Z)(r, 2);
              var o = n[0];
              n[1];
              var a = e.query(o).get("value");
              return (0, i.d0)({
                optionTypes: A,
                qValue: a,
                expression: t,
                id2title: _,
                returnId: true
              });
            });
            var o = `rule_jump_${d.id}`;
            z.current.forEach(function (e) {
              var t = j.query(e).take();
              var r = (0, c.rg)(function () {
                return t?.data || [];
              });
              r.splice(r.indexOf(o), 1);
              if (t) {
                t.data = (0, s.Z)(r);
              }
            });
            z.current = [];
            if (n.success && n.result !== undefined && n.result) {
              var a = (0, i.BB)(d, O, n.result);
              a.forEach(function (e) {
                z.current.push(e.id);
                var t = j.query(e.id).take();
                if (t) {
                  var r = (0, c.rg)(function () {
                    return t.data || [];
                  });
                  if (n.result && !r.includes(o)) {
                    r.push(o);
                  } else if (!n.result && r.includes(o)) {
                    r.splice(r.findIndex(function (e) {
                      return e === o;
                    }), 1);
                  }
                  t.data = (0, s.Z)(r);
                }
              });
            }
          }
        }, function (e) {
          var r;
          var n = d.attribute?.visibleRule;
          var o = (0, c.rg)(function () {
            return e.data;
          });
          if (n) {
            var a = (0, i.vW)(n, function (t) {
              var r = (0, i.Op)(t);
              var n = (0, u.Z)(r, 2);
              var o = n[0];
              n[1];
              var a = e.query(o).get("value");
              return (0, i.d0)({
                optionTypes: A,
                qValue: a,
                expression: t
              });
            });
            if (a.success) {
              var l = `rule_visible_${d.id}`;
              if (a.result && o.includes(l)) {
                o.splice(o.findIndex(function (e) {
                  return e === l;
                }), 1);
              } else if (!a.result && !o.includes(l)) {
                o.push(l);
              }
              e.data = (0, s.Z)(o);
            }
          }
          if ((r = d.children) !== null && r !== undefined) {
            r.forEach(function (t) {
              var n = t.attribute?.visibleRule;
              if (n) {
                var o = (0, i.vW)(n, function (t) {
                  var r = (0, i.Op)(t);
                  var n = (0, u.Z)(r, 2);
                  var o = n[0];
                  n[1];
                  var a = e.query(o).get("value");
                  return (0, i.d0)({
                    optionTypes: A,
                    qValue: a,
                    expression: t
                  });
                });
                if (o.success) {
                  D.hiddenOption[w] ||= [];
                  if (o.result) {
                    D.hiddenOption[w] = (0, s.Z)(D.hiddenOption[w].filter(function (e) {
                      return e !== t.id;
                    }));
                  } else if (!D.hiddenOption[w].includes(t.id)) {
                    D.hiddenOption[w] = [].concat((0, s.Z)(D.hiddenOption[w]), [t.id]);
                  }
                }
              }
            });
          }
        }, function (e) {
          Object.entries(F).forEach(function (t) {
            var r = (0, u.Z)(t, 2);
            var n = r[0];
            var o = r[1];
            var a = o;
            var s = (0, i.vW)(a, function (t) {
              var r = (0, i.Op)(t);
              var n = (0, u.Z)(r, 2);
              var o = n[0];
              n[1];
              var a = e.query(o);
              var s = a.get("value");
              var l = a.get("componentProps").schema;
              return (0, i.d0)({
                optionTypes: A,
                qValue: s,
                expression: t,
                id2title: _,
                qSchema: l
              });
            });
            if (s.success) {
              e.setState(function (e) {
                var t;
                return e.value = (0, y.Z)((0, y.Z)({}, e.value), {}, (0, m.Z)({}, n, (0, i.A7)(s.result, (t = d.children) === null || t === undefined ? undefined : t.find(function (e) {
                  return e.id === n;
                }))));
              });
            }
          });
        }, function (e) {
          var r = d.attribute?.requiredRule;
          if (r) {
            var n = (0, i.vW)(r, function (t) {
              var r = (0, i.Op)(t);
              var n = (0, u.Z)(r, 2);
              var o = n[0];
              n[1];
              var a = e.query(o).get("value");
              return (0, i.d0)({
                optionTypes: A,
                qValue: a,
                expression: t
              });
            });
            if (n.success) {
              if (n.result) {
                e.required = true;
              } else {
                e.required = false;
              }
            }
          }
        }, function (e) {
          var r = d.attribute?.replaceTextRule;
          if (r) {
            var n = (0, i.vW)(r, function (t) {
              var r = (0, i.Op)(t);
              var n = (0, u.Z)(r, 1);
              var o = n[0];
              var a = e.query(o).get("value");
              return (0, i.d0)({
                optionTypes: A,
                qValue: a,
                expression: t,
                id2title: _
              });
            });
            var o = "";
            if (n.success && n.result) {
              o = n.result;
            }
            e.setDecoratorProps((0, y.Z)((0, y.Z)({}, e.decoratorProps), {}, {
              replaceTitle: o
            }));
          }
        }, function (e) {
          var r = d.attribute?.validateRule;
          if (r) {
            var n = (0, i.vW)(r, function (t) {
              var r = (0, i.Op)(t);
              var n = (0, u.Z)(r, 1);
              var o = n[0];
              var a = e.query(o).get("value");
              return (0, i.d0)({
                optionTypes: A,
                qValue: a,
                expression: t,
                id2title: _
              });
            });
            if (n.success) {
              if (n.result) {
                e.setSelfErrors([n.result]);
              } else {
                e.setSelfErrors([]);
              }
            }
          }
        }, function (e) {
          var t;
          var r = (t = d.children) === null || t === undefined ? undefined : t.filter(function (e) {
            return e.attribute?.rejectOtherOption;
          });
          if (r && r.length > 0) {
            var n = e.value;
            var i = R(Z.current, n);
            if (i) {
              var o;
              var a;
              var s = (o = d.children) === null || o === undefined ? undefined : o.find(function (e) {
                return e.id === i;
              });
              if (s && (a = s.attribute) !== null && a !== undefined && a.rejectOtherOption) {
                if (s.attribute.rejectOtherOption === "rejectAll") {
                  n = (0, m.Z)({}, i, n[i]);
                } else if (s.attribute.rejectOtherOption === "rejectOther") {
                  r.forEach(function (e) {
                    if (e && e.id !== i) {
                      delete n[e.id];
                    }
                  });
                }
              } else {
                r.filter(function (e) {
                  return e.attribute?.rejectOtherOption === "rejectAll";
                }).forEach(function (e) {
                  if (e && e.id !== i) {
                    delete n[e.id];
                  }
                });
              }
              e.setState(function (e) {
                return e.value = (0, y.Z)({}, n);
              });
            }
            Z.current = (0, c.ZN)(n);
          }
        }, function (e) {
          var t;
          if ((t = d.children) !== null && t !== undefined) {
            t.forEach(function (t) {
              var n = t.attribute?.checkedRule;
              if (n) {
                var o = (0, i.vW)(n, function (t) {
                  var r = (0, i.Op)(t);
                  var n = (0, u.Z)(r, 2);
                  var o = n[0];
                  n[1];
                  var a = e.query(o).get("value");
                  return (0, i.d0)({
                    optionTypes: A,
                    qValue: a,
                    expression: t
                  });
                });
                if (o.success) {
                  var a;
                  if (d.type === "Radio") {
                    if (!!o.result && ((a = e.value) === null || a === undefined || !a[t.id])) {
                      e.value = (0, m.Z)({}, t.id, true);
                    }
                  }
                  if (d.type === "Checkbox") {
                    var s = e.value;
                    if (!!o.result && (s === null || s === undefined || !s[t.id])) {
                      s[t.id] = true;
                    }
                    if (!o.result && s?.[t.id] !== undefined) {
                      delete s[t.id];
                    }
                    e.value = (0, y.Z)({}, s);
                  }
                }
              }
            });
          }
        }]
      }), (0, p.jsx)(N, {
        id: w
      })]
    });
  }
});
var N = (0, l.Pi)(function (e) {
  var t = (0, l.cI)();
  var r = t.query(e.id).take();
  var o = r?.data;
  var a = (0, g.Rk)();
  (0, n.useEffect)(function () {
    var e = r.data;
    r.display = (0, i.mc)(e);
    a.compute();
  }, [o, r]);
  return (0, p.jsx)(p.Fragment, {});
});
function R(e, t) {
  if (t) {
    var r = Object.keys(t).filter(function (t) {
      return !e || !e.hasOwnProperty(t);
    });
    if (r.length > 0) {
      return r[0];
    }
  }
}
function I(e) {
  var t = e.schema;
  var r = e.index;
  var d = t.id;
  var f = (0, n.useContext)(o.Z);
  var g = f.theme;
  var m = f.optionTypes;
  var v = f.id2title;
  function h() {
    var e;
    var n = -1;
    if ((e = t.children) === null || e === undefined) {
      return undefined;
    } else {
      return e.filter(function (e) {
        return e.attribute?.display !== "hidden";
      }).map(function (e) {
        if ((!(0, i.nj)(e.type) || e.type === "QuestionSet") && e.attribute?.examAnswerMode !== "none") {
          n++;
        }
        if (e.type === "QuestionSet") {
          return (0, p.jsx)(I, {
            schema: e,
            index: n
          }, e.id);
        } else {
          return (0, p.jsx)(q, {
            schema: e,
            index: e.attribute?.examAnswerMode === "none" ? -1 : n,
            qsIndex: r
          }, e.id);
        }
      });
    }
  }
  return (0, p.jsxs)(l.jG, {
    name: d,
    data: [],
    decorator: [(0, a.GZ)(g, "QuestionSet"), {
      schema: t,
      index: r
    }],
    reactions: [function (e) {
      var n = t.attribute?.replaceTextRule;
      if (n) {
        var o = (0, i.vW)(n, function (t) {
          var r = (0, i.Op)(t);
          var n = (0, u.Z)(r, 1);
          var o = n[0];
          var a = e.query(o).get("value");
          return (0, i.d0)({
            optionTypes: m,
            qValue: a,
            expression: t,
            id2title: v
          });
        });
        var a = "";
        if (o.success && o.result) {
          a = o.result;
        }
        e.setComponentProps((0, y.Z)((0, y.Z)({}, e.componentProps), {}, {
          replaceTitle: a
        }));
      }
    }, function (e) {
      var n = t.attribute?.visibleRule;
      if (n) {
        var o = (0, i.vW)(n, function (t) {
          var r = (0, i.Op)(t);
          var n = (0, u.Z)(r, 2);
          var o = n[0];
          n[1];
          var a = e.query(o).get("value");
          return (0, i.d0)({
            optionTypes: m,
            qValue: a,
            expression: t
          });
        });
        if (o.success) {
          var a = `rule_visible_${t.id}`;
          var l = (0, c.rg)(function () {
            return e.data;
          });
          if (o.result && l.includes(a)) {
            l.splice(l.findIndex(function (e) {
              return e === a;
            }), 1);
          } else if (!o.result && !l.includes(a)) {
            l.push(a);
          }
          e.data = (0, s.Z)(l);
        }
      }
    }],
    children: [h(), (0, p.jsx)(N, {
      id: d
    })]
  });
}
var j = require("./5726.js");
var D = j;
var L = require("./24449.js");
var F = require("./25030.js");
require("./77962.js");
var Z = require("./93597.js");
var z = Z;
var U = require("./68102.js");
var B = U;
var V = require("./99471.js");
var H = V;
D.extend(B);
D.extend(z);
D.extend(H);
var W = (0, F.default)((0, y.Z)({}, L.Z));
var Y = W;
var Q = n.forwardRef(function (e, t) {
  return (0, p.jsx)(Y, (0, y.Z)((0, y.Z)({}, e), {}, {
    picker: "time",
    mode: undefined,
    ref: t
  }));
});
Q.displayName = "TimePicker";
require("./29040.js");
var $ = require("./12388.js");
require("./95307.js");
var G = require("./16179.js");
var K = require("./27423.js");
var J = require("./38399.js");
var X = J;
var ee = require("./93977.js");
var te = require("./84207.js");
function re(e) {
  var t = (0, n.useRef)(null);
  var r = (0, n.useState)(false);
  var i = (0, u.Z)(r, 2);
  var o = i[0];
  var a = i[1];
  var s = (0, C.dD)();
  function l() {
    var t = e.value || {};
    var r = e.schema.type;
    if (r === "Radio" || r === "Checkbox") {
      return (0, K.l_)(t, e.schema).join(" ");
    }
    return Object.values(t).join(";");
  }
  (0, te.Z)(t, function () {
    a(false);
  });
  return (0, p.jsxs)("div", {
    className: X("preview", {
      active: o
    }),
    ref: t,
    onClick: function () {
      a(true);
    },
    children: [ne(e), o && (0, p.jsx)(ee.CopyToClipboard, {
      text: l(),
      onCopy: function () {
        if (s) {
          P.FN.show({
            icon: "success",
            content: "复制成功"
          });
        } else {
          G.default.success("复制成功");
        }
      },
      children: (0, p.jsx)($.Z, {
        size: "small",
        className: "preview-copy-btn",
        children: "复制"
      })
    })]
  });
}
function ne(e) {
  var t;
  var r = e.schema;
  var n = e.value;
  if (!n) {
    return "";
  }
  if (r.type === "Radio" || r.type === "Select" || r.type === "Judge") {
    Object.entries(n).some(function (e) {
      var n;
      var i;
      var o = (0, u.Z)(e, 2);
      var a = o[0];
      var s = o[1];
      if (s === true) {
        t = (0, p.jsx)(T.Z, {
          html: (n = r.children) === null || n === undefined || (i = n.find(function (e) {
            return e.id === a;
          })) === null || i === undefined ? undefined : i.title
        });
      } else if (s) {
        var l;
        var c;
        t = (0, p.jsx)(T.Z, {
          html: (l = r.children) === null || l === undefined || (c = l.find(function (e) {
            return e.id === a;
          })) === null || c === undefined ? undefined : c.title
        });
      }
      return true;
    });
  } else {
    if (r.type === "Checkbox") {
      return Object.entries(n).map(function (e) {
        var t;
        var n;
        var i;
        var o;
        var a = (0, u.Z)(e, 2);
        var s = a[0];
        var l = a[1];
        if (l === true) {
          return (0, p.jsx)(T.Z, {
            html: (t = r.children) === null || t === undefined || (n = t.find(function (e) {
              return e.id === s;
            })) === null || n === undefined ? undefined : n.title
          }, s);
        } else if (l) {
          return (0, p.jsx)(T.Z, {
            html: (i = r.children) === null || i === undefined || (o = i.find(function (e) {
              return e.id === s;
            })) === null || o === undefined ? undefined : o.title
          }, s);
        } else {
          return undefined;
        }
      }).reduce(function (e, t) {
        return [e, ", ", t];
      });
    }
    if (r.type === "Cascader") {
      var i = r.children.map(function (e) {
        return e.id;
      });
      var o = i.map(function (e) {
        return n[e];
      });
      var a = r.dataSource;
      return o.filter(function (e) {
        return e !== undefined;
      }).map(function (e, t) {
        var r;
        var n = (r = a) === null || r === undefined ? undefined : r.find(function (t) {
          return t.value === e;
        });
        a = n.children;
        return (0, p.jsx)("span", {
          children: n.label
        }, i[t]);
      });
    }
    if (r.type === "FillBlank" || r.type === "MultipleBlank" || r.type === "Textarea" || r.type === "Score" || r.type === "Nps") {
      return Object.entries(n).map(function (e) {
        var t = (0, u.Z)(e, 2);
        var r = t[0];
        var n = t[1];
        return (0, p.jsx)("span", {
          children: n
        }, r);
      });
    }
  }
  return t;
}
require("./4033.js");
};
