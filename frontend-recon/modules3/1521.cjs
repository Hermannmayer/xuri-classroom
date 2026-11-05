// webpack module 1521 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  OF: function () {
    return Me;
  },
  uI: function () {
    return le;
  },
  gN: function () {
    return je;
  },
  q3: function () {
    return re;
  },
  RV: function () {
    return be;
  },
  Wo: function () {
    return qe;
  },
  jG: function () {
    return Re;
  },
  $j: function () {
    return he;
  },
  jM: function () {
    return ve;
  },
  vl: function () {
    return ye;
  },
  Pi: function () {
    return X.Pi;
  },
  U$: function () {
    return pe;
  },
  cI: function () {
    return ce;
  },
  U7: function () {
    return de;
  }
});
var n = require("./61553.js");
var i = require("./87183.js");
var o = Symbol.for("__REVA_ACTIONS");
var a = {
  parent: true,
  root: true,
  properties: true,
  patternProperties: true,
  additionalProperties: true,
  items: true,
  additionalItems: true,
  "x-linkages": true,
  "x-reactions": true
};
var s = {
  title: "title",
  description: "description",
  default: "initialValue",
  enum: "dataSource",
  readOnly: "readOnly",
  writeOnly: "editable",
  "x-content": "content",
  "x-data": "data",
  "x-value": "value",
  "x-editable": "editable",
  "x-disabled": "disabled",
  "x-read-pretty": "readPretty",
  "x-read-only": "readOnly",
  "x-visible": "visible",
  "x-hidden": "hidden",
  "x-display": "display",
  "x-pattern": "pattern",
  "x-validator": "validator",
  "x-decorator": "decoratorType",
  "x-component": "componentType",
  "x-decorator-props": "decoratorProps",
  "x-component-props": "componentProps"
};
var u = {
  required: true,
  format: true,
  maxItems: true,
  minItems: true,
  maxLength: true,
  minLength: true,
  maximum: true,
  minimum: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  pattern: true,
  const: true,
  multipleOf: true,
  maxProperties: true,
  minProperties: true,
  uniqueItems: true
};
Object.keys(s);
Object.keys(u);
var l = Object.prototype.hasOwnProperty;
function c(e, t) {
  var r = [];
  var i = e;
  function o(e, a = []) {
    if ((0, n.Uk)(e)) {
      var s = r.indexOf(e);
      if (s > -1) {
        return;
      }
      var u = r.length;
      r.push(e);
      if (d(e) && i !== e) {
        t(e, a);
        return;
      }
      (0, n.S6)(e, function (e, t) {
        o(e, a.concat(t));
      });
      r.splice(u, 1);
    } else {
      t(e, a);
    }
  }
  o(e);
}
function p(e, t) {
  if (e["x-validator"] !== undefined) {
    t(e["x-validator"], ["x-validator"]);
  }
  var r = [];
  var i = e;
  function o(s, u) {
    var l;
    if (u === undefined) {
      u = [];
    }
    if (u[0] !== "x-compile-omitted" && u[0] !== "x-validator" && u[0] !== "version" && u[0] !== "_isJSONSchemaObject" && (String(u[0]).indexOf("x-") != -1 || !(0, n.LQ)(s)) && !a[u[0]]) {
      if (((l = e["x-compile-omitted"]) === null || l === undefined ? undefined : l.indexOf(u[0])) > -1) {
        t(s, u, true);
      } else if ((0, n.Uk)(s)) {
        if (u[0] === "default" || u[0] === "x-value") {
          t(s, u);
          return;
        }
        var c = r.indexOf(s);
        if (c > -1) {
          return;
        }
        var p = r.length;
        r.push(s);
        if (d(s) && i !== s) {
          t(s, u);
          return;
        }
        (0, n.S6)(s, function (e, t) {
          o(e, u.concat(t));
        });
        r.splice(p, 1);
      } else {
        t(s, u);
      }
    }
  }
  o(e);
}
function d(e) {
  return "$$typeof" in e && "_owner" in e || !!e._isAMomentObject || !!K.isSchemaInstance(e) || !!e[o] || !!(0, n.LQ)(e.toJS) || !!(0, n.LQ)(e.toJSON) || !!(0, i.bi)(e);
}
function f(e) {
  return (0, n._K)(e).map(function (e) {
    if (typeof e === "object") {
      return e;
    } else {
      return {
        label: e,
        value: e
      };
    }
  });
}
function g(e, t, r) {
  (0, i.rg)(function () {
    var i;
    var o = n.Dm.parse(t);
    var a = o.segments;
    var l = a[0];
    var c = l === "enum" && (0, n.H1)(r);
    var p = s[l];
    if (p) {
      n.Dm.setIn(e, [p].concat(a.slice(1)), c ? f(r) : r);
    } else {
      var d = u[l];
      if (d) {
        if ((i = e.setValidatorRule) !== null && i !== undefined) {
          i.call(e, l, r);
        }
      }
    }
  });
}
var m = /^\s*\{\{([\s\S]*)\}\}\s*$/;
var v = {
  silent: false,
  compile: function (e, t = {}) {
    if (!v.silent) {
      return new Function("$root", `with(\$root) { return (${e}); }`)(t);
    }
    try {
      return new Function("$root", `with(\$root) { return (${e}); }`)(t);
    } catch (De) {}
  }
};
function y(e = true) {
  v.silent = !!e;
}
function h(e) {
  if ((0, n.LQ)(e)) {
    v.compile = e;
  }
}
function b(e, t) {
  if ((0, n.d8)(e)) {
    var r = e.match(m);
    if (r) {
      return v.compile(r[1], t);
    } else {
      return e;
    }
  }
  return e;
}
function w(e, t) {
  var r = [];
  function i(e) {
    if ((0, n.d8)(e)) {
      return b(e, t);
    }
    if ((0, n.H1)(e)) {
      return e.map(function (e) {
        return i(e);
      });
    }
    if ((0, n.Uk)(e)) {
      if (d(e)) {
        return e;
      }
      var o = r.indexOf(e);
      if (o > -1) {
        return e;
      }
      var a = r.length;
      r.push(e);
      var s = (0, n.u4)(e, function (e, t, r) {
        e[r] = i(t);
        return e;
      }, {});
      r.splice(a, 1);
      return s;
    }
    return e;
  }
  return i(e);
}
function x(e, t, r) {
  c(t, function (t, o) {
    var a = w(t, r);
    if (a !== undefined) {
      var s = n.Dm.parse(o);
      var u = s.segments[0];
      if (l.call(e, u)) {
        (0, i.rg)(function () {
          return n.Dm.setIn(e, s, a);
        });
      }
    }
  });
}
function E(e, t, r, n = false) {
  p(t, function (t, o, a) {
    var s = t;
    var u = (0, i.WV)(function () {
      if (!a) {
        s = w(t, r);
      }
    });
    if (s !== undefined) {
      if (!n || !!u || !e.initialized) {
        g(e, o, s);
      }
    }
  });
}
var k = require("./15093.js");
function S(e, t) {
  var r = typeof Symbol === "function" && e[Symbol.iterator];
  if (!r) {
    return e;
  }
  var n;
  var i;
  var o = r.call(e);
  var a = [];
  try {
    while ((t === undefined || t-- > 0) && !(n = o.next()).done) {
      a.push(n.value);
    }
  } catch (s) {
    i = {
      error: s
    };
  } finally {
    try {
      if (n && !n.done && (r = o.return)) {
        r.call(o);
      }
    } finally {
      if (i) {
        throw i.error;
      }
    }
  }
  return a;
}
var T = {
  onFieldInit: k._T,
  onFieldMount: k.cW,
  onFieldUnmount: k.P4,
  onFieldValueChange: k.Zj,
  onFieldInputValueChange: k.ge,
  onFieldInitialValueChange: k.S9,
  onFieldValidateStart: k.g,
  onFieldValidateEnd: k.TE,
  onFieldValidateFailed: k.Zm,
  onFieldValidateSuccess: k.c_
};
var C = ["onFieldInit", "onFieldValueChange"];
function A(e, t, r) {
  var n = S(String(t).split(/\s*#\s*/), 2);
  var i = n[0];
  var o = n[1];
  return e.query(i).getIn(o || r || "value");
}
function _(e, t) {
  if ((0, n.H1)(t)) {
    var r = [];
    t.forEach(function (t) {
      if ((0, n.d8)(t)) {
        r.push(A(e, t));
      } else if ((0, n.Uk)(t) && t.name && t.source) {
        r[t.name] = A(e, t.source, t.property);
      }
    });
    return r;
  }
  if ((0, n.Uk)(t)) {
    return (0, n.u4)(t, function (t, r, n) {
      t[n] = A(e, r);
      return t;
    }, {});
  } else {
    return [];
  }
}
function O(e, t = false) {
  var r = e || {};
  var i = r.request;
  var o = r.target;
  var a = r.runner;
  var s = r.field;
  var u = r.scope;
  if (i) {
    if (o) {
      if (i.state) {
        s.form.setFieldState(o, function (e) {
          return x(e, i.state, (0, n.e_)(u, {
            $target: e
          }));
        });
      }
      if (i.schema) {
        s.form.setFieldState(o, function (e) {
          return E(e, i.schema, (0, n.e_)(u, {
            $target: e
          }), t);
        });
      }
      if ((0, n.d8)(a) && a) {
        s.form.setFieldState(o, function (e) {
          b(`{{function(){${a}}}}`, (0, n.e_)(u, {
            $target: e
          }))();
        });
      }
    } else {
      if (i.state) {
        s.setState(function (e) {
          return x(e, i.state, u);
        });
      }
      if (i.schema) {
        s.setState(function (e) {
          return E(e, i.schema, u, t);
        });
      }
      if ((0, n.d8)(a) && a) {
        b(`{{function(){${a}}}}`, u)();
      }
    }
  }
}
function M(e, t = {}) {
  function r(e, t) {
    return i.EH.memo(function () {
      return (0, i.LO)(e);
    }, t);
  }
  function o(t) {
    return e.setComponentProps(t);
  }
  var a = i.EH.effect;
  var s = i.EH.memo;
  var u = e;
  var l = e.form;
  var c = e.form.values;
  return (0, n.e_)({
    get $lookup() {
      return t?.scope?.$record ?? c;
    },
    get $records() {
      return e.records;
    },
    get $record() {
      var r = e.record;
      if (typeof r === "object") {
        return (0, n.e_)(r, {
          get $lookup() {
            return t?.scope?.$record ?? c;
          },
          get $index() {
            return e.index;
          }
        });
      } else {
        return r;
      }
    },
    get $index() {
      return e.index;
    }
  }, t.scope, {
    $form: l,
    $self: u,
    $observable: r,
    $effect: a,
    $memo: s,
    $props: o,
    $values: c
  });
}
function P(e, t) {
  return function (r) {
    O({
      field: r,
      request: {
        schema: e
      },
      scope: M(r, t)
    }, true);
  };
}
function q(e, t) {
  var r = (0, n._K)(e["x-reactions"]);
  return r.map(function (e) {
    return function (r) {
      var o = M(r, t);
      var a = b(e, o);
      if (a) {
        if ((0, n.LQ)(a)) {
          return a(r, o);
        }
        var s = a.when;
        var u = a.fulfill;
        var l = a.otherwise;
        var c = a.target;
        var p = a.effects;
        function d() {
          var e = _(r, a.dependencies);
          var t = e;
          var i = (0, n.e_)(o, {
            $target: null,
            $deps: e,
            $dependencies: t
          });
          var p = b(s, i);
          var d = !s || p;
          var f = d ? u : l;
          var g = f?.run;
          O({
            field: r,
            target: c,
            request: f,
            runner: g,
            scope: i
          });
        }
        if (c) {
          a.effects = p?.length ? p : C;
        }
        if (a.effects) {
          i.EH.memo(function () {
            (0, i.rg)(function () {
              (0, n.S6)(a.effects, function (e) {
                if (T[e]) {
                  T[e](r.address, d);
                }
              });
            });
          }, []);
        } else {
          d();
        }
      }
    };
  });
}
function N(e, t) {
  return {
    name: e.name,
    reactions: [P(e, t)].concat(q(e, t))
  };
}
function R() {
  R = Object.assign || function (e) {
    var t;
    for (var r = 1, n = arguments.length; r < n; r++) {
      t = arguments[r];
      for (var i in t) {
        if (Object.prototype.hasOwnProperty.call(t, i)) {
          e[i] = t[i];
        }
      }
    }
    return e;
  };
  return R.apply(this, arguments);
}
var I = [];
var j = {};
function D(e) {
  return I.reduce(function (e, t) {
    return t(e);
  }, R({}, e));
}
function L() {
  var e = [];
  for (var t = 0; t < arguments.length; t++) {
    e[t] = arguments[t];
  }
  e.forEach(function (e) {
    if ((0, n.LQ)(e)) {
      I.push(e);
    }
  });
}
function F(e, t) {
  if (e && (0, n.LQ)(t)) {
    j[e] = j[e] || [];
    j[e].push(t);
  }
}
function Z(e) {
  if ((0, n.H1)(e)) {
    e.forEach(function (e) {
      if ((0, n.H1)(j[e])) {
        j[e].forEach(function (e) {
          L(e);
        });
      }
    });
  }
}
function z() {
  z = Object.assign || function (e) {
    var t;
    for (var r = 1, n = arguments.length; r < n; r++) {
      t = arguments[r];
      for (var i in t) {
        if (Object.prototype.hasOwnProperty.call(t, i)) {
          e[i] = t[i];
        }
      }
    }
    return e;
  };
  return z.apply(this, arguments);
}
function U(e, t) {
  var r = typeof Symbol === "function" && e[Symbol.iterator];
  if (!r) {
    return e;
  }
  var n;
  var i;
  var o = r.call(e);
  var a = [];
  try {
    while ((t === undefined || t-- > 0) && !(n = o.next()).done) {
      a.push(n.value);
    }
  } catch (s) {
    i = {
      error: s
    };
  } finally {
    try {
      if (n && !n.done && (r = o.return)) {
        r.call(o);
      }
    } finally {
      if (i) {
        throw i.error;
      }
    }
  }
  return a;
}
function B(e, t, r) {
  if (r || arguments.length === 2) {
    var n;
    for (var i = 0, o = t.length; i < o; i++) {
      if (!!n || !(i in t)) {
        n ||= Array.prototype.slice.call(t, 0, i);
        n[i] = t[i];
      }
    }
  }
  return e.concat(n || Array.prototype.slice.call(t));
}
var V = ["card", "block", "grid-col", "grid-row", "grid", "layout", "step", "tab", "text-box"];
var H = {};
function W(e) {
  if ((0, n.d8)(e)) {
    return e.replace(/\$value/, "$self.value");
  }
}
function Y(e) {
  if ((0, n.H1)(e)) {
    return e.reduce(function (e, t) {
      if (t) {
        if (t.type === "value:visible") {
          return e.concat({
            target: t.target,
            when: W(t.condition),
            fulfill: {
              state: {
                visible: true
              }
            },
            otherwise: {
              state: {
                visible: false
              }
            }
          });
        } else if (t.type === "value:schema") {
          return e.concat({
            target: t.target,
            when: W(t.condition),
            fulfill: {
              schema: Q(z({
                version: "1.0"
              }, t.schema))
            },
            otherwise: {
              schema: Q(z({
                version: "1.0"
              }, t.otherwise))
            }
          });
        } else if (t.type === "value:state") {
          return e.concat({
            target: t.target,
            when: W(t.condition),
            fulfill: {
              state: t.state
            },
            otherwise: {
              state: t.otherwise
            }
          });
        } else {
          return undefined;
        }
      } else {
        return e;
      }
    }, []);
  } else {
    return [];
  }
}
function Q(e) {
  if ((0, n.JY)(e.editable)) {
    e["x-editable"] = e["x-editable"] || e.editable;
    delete e.editable;
  }
  if ((0, n.JY)(e.visible)) {
    e["x-visible"] = e["x-visible"] || e.visible;
    delete e.visible;
  }
  if ((0, n.JY)(e.display)) {
    e["x-display"] = e["x-display"] || (e.display ? "visible" : "hidden");
    delete e.display;
  }
  if ((0, n.JY)(e["x-props"])) {
    e["x-decorator-props"] = e["x-decorator-props"] || e["x-props"];
    delete e.display;
  }
  if (e["x-linkages"]) {
    e["x-reactions"] = (0, n._K)(e["x-reactions"]).concat(Y(e["x-linkages"]));
    delete e["x-linkages"];
  }
  if (e["x-component"]) {
    if (V.some(function (t) {
      return (0, n.vl)(t) === (0, n.vl)(e["x-component"]);
    })) {
      e.type = "void";
    }
  } else if (H[e.type]) {
    e["x-component"] = H[e.type];
  }
  if (!e["x-decorator"] && e.type !== "void" && e.type !== "object") {
    e["x-decorator"] = e["x-decorator"] || "FormItem";
  }
  if (e["x-rules"]) {
    e["x-validator"] = [].concat(e["x-validator"] || []).concat(e["x-rules"]);
  }
  return e;
}
F("1.0", Q);
function $(e) {
  V.push.apply(V, B([], U(e), false));
}
function G(e) {
  Object.assign(H, e);
}
var K = function () {
  function e(t, r) {
    var i = this;
    this._isJSONSchemaObject = true;
    this.version = "2.0";
    this.addProperty = function (t, r) {
      i.properties = i.properties || {};
      i.properties[t] = new e(r, i);
      i.properties[t].name = t;
      return i.properties[t];
    };
    this.removeProperty = function (e) {
      var t = i.properties[e];
      delete i.properties[e];
      return t;
    };
    this.setProperties = function (e) {
      for (var t in e) {
        i.addProperty(t, e[t]);
      }
      return i;
    };
    this.addPatternProperty = function (t, r) {
      if (r) {
        i.patternProperties = i.patternProperties || {};
        i.patternProperties[t] = new e(r, i);
        i.patternProperties[t].name = t;
        return i.patternProperties[t];
      }
    };
    this.removePatternProperty = function (e) {
      var t = i.patternProperties[e];
      delete i.patternProperties[e];
      return t;
    };
    this.setPatternProperties = function (e) {
      if (!e) {
        return i;
      }
      for (var t in e) {
        i.addPatternProperty(t, e[t]);
      }
      return i;
    };
    this.setAdditionalProperties = function (t) {
      if (t) {
        i.additionalProperties = new e(t);
        return i.additionalProperties;
      }
    };
    this.setItems = function (t) {
      if (t) {
        if (Array.isArray(t)) {
          i.items = t.map(function (t) {
            return new e(t, i);
          });
        } else {
          i.items = new e(t, i);
        }
        return i.items;
      }
    };
    this.setAdditionalItems = function (t) {
      if (t) {
        i.additionalItems = new e(t, i);
        return i.additionalItems;
      }
    };
    this.findDefinitions = function (e) {
      if (e && i.root && (0, n.d8)(e) && e.indexOf("#/") === 0) {
        return n.Dm.getIn(i.root, e.substring(2).split("/"));
      }
    };
    this.mapProperties = function (t) {
      return e.getOrderProperties(i).map(function (e, r) {
        var n = e.schema;
        var i = e.key;
        return t(n, i, r);
      });
    };
    this.mapPatternProperties = function (t) {
      return e.getOrderProperties(i, "patternProperties").map(function (e, r) {
        var n = e.schema;
        var i = e.key;
        return t(n, i, r);
      });
    };
    this.reduceProperties = function (t, r) {
      var n = r;
      e.getOrderProperties(i, "properties").forEach(function (e, r) {
        var i = e.schema;
        var o = e.key;
        n = t(n, i, o, r);
      });
      return n;
    };
    this.reducePatternProperties = function (t, r) {
      var n = r;
      e.getOrderProperties(i, "patternProperties").forEach(function (e, r) {
        var i = e.schema;
        var o = e.key;
        n = t(n, i, o, r);
      });
      return n;
    };
    this.compile = function (t) {
      var r = new e({}, i.parent);
      (0, n.S6)(i, function (e, i) {
        if (!(0, n.LQ)(e) || !!i.includes("x-")) {
          if (i !== "parent" && i !== "root") {
            if (a[i]) {
              r[i] = e ? b(e, t) : e;
            } else {
              r[i] = e ? w(e, t) : e;
            }
          }
        }
      });
      return r;
    };
    this.fromJSON = function (t) {
      if (t) {
        if (e.isSchemaInstance(t)) {
          return t;
        } else {
          (0, n.S6)(D(t), function (e, t) {
            if (!(0, n.LQ)(e) || !!t.includes("x-")) {
              if (t === "properties") {
                i.setProperties(e);
              } else if (t === "patternProperties") {
                i.setPatternProperties(e);
              } else if (t === "additionalProperties") {
                i.setAdditionalProperties(e);
              } else if (t === "items") {
                i.setItems(e);
              } else if (t === "additionalItems") {
                i.setAdditionalItems(e);
              } else if (t === "$ref") {
                i.fromJSON(i.findDefinitions(e));
              } else {
                i[t] = e;
              }
            }
          });
          return i;
        }
      } else {
        return i;
      }
    };
    this.toJSON = function (e = true) {
      var t = {};
      (0, n.S6)(i, function (r, i) {
        var o;
        var a;
        if ((!(0, n.LQ)(r) || i.includes("x-")) && i !== "parent" && i !== "root") {
          if (i === "properties" || i === "patternProperties") {
            if (!e) {
              return;
            }
            t[i] = (0, n.UI)(r, function (e) {
              var t;
              if ((t = e?.toJSON) === null || t === undefined) {
                return undefined;
              } else {
                return t.call(e);
              }
            });
          } else if (i === "additionalProperties" || i === "additionalItems") {
            if (!e) {
              return;
            }
            t[i] = (o = r?.toJSON) === null || o === undefined ? undefined : o.call(r);
          } else if (i === "items") {
            if (!e) {
              return;
            }
            if (Array.isArray(r)) {
              t[i] = r.map(function (e) {
                var t;
                if ((t = e?.toJSON) === null || t === undefined) {
                  return undefined;
                } else {
                  return t.call(e);
                }
              });
            } else {
              t[i] = (a = r?.toJSON) === null || a === undefined ? undefined : a.call(r);
            }
          } else {
            t[i] = r;
          }
        }
      });
      return t;
    };
    this.toFieldProps = function (e) {
      return N(i, e);
    };
    if (r) {
      this.parent = r;
      this.root = r.root;
    } else {
      this.root = this;
    }
    return this.fromJSON(t);
  }
  e.getOrderProperties = function (e = {}, t = "properties") {
    var r = [];
    var n = [];
    for (var i in e[t]) {
      var o = e[t][i];
      var a = o["x-index"];
      if (isNaN(a)) {
        n.push({
          schema: o,
          key: i
        });
      } else {
        r[a] = {
          schema: o,
          key: i
        };
      }
    }
    return r.concat(n).filter(function (e) {
      return !!e;
    });
  };
  e.compile = function (e, t) {
    return w(e, t);
  };
  e.shallowCompile = function (e, t) {
    return b(e, t);
  };
  e.isSchemaInstance = function (t) {
    return (0, n.iw)(t, e);
  };
  e.registerCompiler = h;
  e.registerPatches = L;
  e.registerVoidComponents = $;
  e.registerTypeDefaultComponents = G;
  e.registerPolyfills = F;
  e.enablePolyfills = Z;
  e.silent = y;
  return e;
}();
var J = require("./59496.js");
var X = require("./73616.js");
function ee(e) {
  (0, X.cF)(function () {
    e.onMount();
    return function () {
      return e.onUnmount();
    };
  }, [e]);
  return e;
}
function te() {
  var e = [];
  for (var t = 0; t < arguments.length; t++) {
    e[t] = arguments[t];
  }
  return function (t) {
    var r = t.children;
    return e.reduce(function (e, t) {
      return J.createElement(t.Provider, {
        value: undefined
      }, e);
    }, r);
  };
}
var re = (0, J.createContext)(null);
var ne = (0, J.createContext)(null);
var ie = (0, J.createContext)(null);
var oe = (0, J.createContext)(null);
var ae = (0, J.createContext)(null);
var se = (0, J.createContext)(null);
var ue = (0, J.createContext)(null);
var le = te(ne, ie, oe, ae, se, ue);
function ce() {
  return (0, J.useContext)(re);
}
function pe() {
  return (0, J.useContext)(ne);
}
function de(e) {
  var t = ce();
  (0, X.ls)(function () {
    var r = (0, n.hQ)();
    t.addEffects(r, e);
    return {
      dispose: function () {
        t.removeEffects(r);
      }
    };
  });
}
var fe = require("./72535.js");
var ge = fe;
function me() {
  me = Object.assign || function (e) {
    var t;
    for (var r = 1, n = arguments.length; r < n; r++) {
      t = arguments[r];
      for (var i in t) {
        if (Object.prototype.hasOwnProperty.call(t, i)) {
          e[i] = t[i];
        }
      }
    }
    return e;
  };
  return me.apply(this, arguments);
}
function ve() {
  var e = [];
  for (var t = 0; t < arguments.length; t++) {
    e[t] = arguments[t];
  }
  return function (t) {
    return (0, X.Pi)(function (r) {
      var i = pe();
      var o = e.reduce(function (e, t) {
        if ((0, n.LQ)(t)) {
          e = Object.assign(e, t(e, i));
        } else {
          (0, n.S6)(t, function (t, r) {
            var o = n.Dm.getIn(i, r);
            var a = (0, n.d8)(t) ? t : r;
            var s = n.Dm.getIn(e, a);
            if (r === "value" && t !== r) {
              delete e.value;
            }
            if (!(0, n.JY)(s) || !!(0, n.JY)(o)) {
              n.Dm.setIn(e, a, o);
            }
          });
        }
        return e;
      }, me({}, r));
      return J.createElement(t, o);
    }, {
      forwardRef: true
    });
  };
}
function ye(e, t) {
  return function (r) {
    return (0, X.Pi)(function (n) {
      var i = pe();
      if ((0, k.JF)(i) || i?.pattern !== "readPretty") {
        return J.createElement(r, n);
      } else {
        return J.createElement(e, me(me({}, t), n));
      }
    }, {
      forwardRef: true
    });
  };
}
function he(e) {
  var t = [];
  for (var r = 1; r < arguments.length; r++) {
    t[r - 1] = arguments[r];
  }
  var n = t.reduce(function (e, t) {
    return t(e);
  }, e);
  var i = J.forwardRef(function (e, t) {
    return J.createElement(n, me(me({}, e), {
      ref: t
    }));
  });
  if (e) {
    ge(i, e);
  }
  return i;
}
function be(e) {
  var t = ee(e.form);
  return J.createElement(le, null, J.createElement(re.Provider, {
    value: t
  }, e.children));
}
be.displayName = "FormProvider";
var we = (0, X.Pi)(function (e) {
  var t = (0, n.LQ)(e.children) ? e.children(ce()) : null;
  return J.createElement(J.Fragment, null, t);
});
we.displayName = "FormConsumer";
function xe() {
  xe = Object.assign || function (e) {
    var t;
    for (var r = 1, n = arguments.length; r < n; r++) {
      t = arguments[r];
      for (var i in t) {
        if (Object.prototype.hasOwnProperty.call(t, i)) {
          e[i] = t[i];
        }
      }
    }
    return e;
  };
  return xe.apply(this, arguments);
}
function Ee(e, t) {
  var r = typeof Symbol === "function" && e[Symbol.iterator];
  if (!r) {
    return e;
  }
  var n;
  var i;
  var o = r.call(e);
  var a = [];
  try {
    while ((t === undefined || t-- > 0) && !(n = o.next()).done) {
      a.push(n.value);
    }
  } catch (s) {
    i = {
      error: s
    };
  } finally {
    try {
      if (n && !n.done && (r = o.return)) {
        r.call(o);
      }
    } finally {
      if (i) {
        throw i.error;
      }
    }
  }
  return a;
}
function ke(e, t, r) {
  if (r || arguments.length === 2) {
    var n;
    for (var i = 0, o = t.length; i < o; i++) {
      if (!!n || !(i in t)) {
        n ||= Array.prototype.slice.call(t, 0, i);
        n[i] = t[i];
      }
    }
  }
  return e.concat(n || Array.prototype.slice.call(t));
}
function Se(e, t) {
  if ((e || t) && !(0, n.LQ)(e)) {
    return J.createElement(J.Fragment, null, e, t);
  }
}
function Te(e) {
  return e && (typeof e === "object" || typeof e === "function");
}
function Ce(e, t, r) {
  if ((0, n.LQ)(e)) {
    return e(t, r);
  } else {
    return e;
  }
}
function Ae(e) {
  var r = (0, J.useContext)(se);
  if (!e.field) {
    return J.createElement(J.Fragment, null, Ce(e.children));
  }
  var o = e.field;
  var a = Se(Ce(e.children, o, o.form), o.content ?? o.componentProps.children);
  if (o.display !== "visible") {
    return null;
  }
  function s(e) {
    if (Te(e)) {
      return e;
    } else {
      return n.Dm.getIn(r, e) ?? e;
    }
  }
  function u(e) {
    if (o.decoratorType) {
      return J.createElement(s(o.decoratorType), (0, i.ZN)(o.decoratorProps), e);
    } else {
      return J.createElement(J.Fragment, null, e);
    }
  }
  function l() {
    if (!o.componentType) {
      return a;
    }
    var n = (0, k.JF)(o) ? undefined : o.value;
    var u = (0, k.JF)(o) ? o.componentProps?.onChange : function () {
      var e;
      var t;
      var r = [];
      for (var n = 0; n < arguments.length; n++) {
        r[n] = arguments[n];
      }
      o.onInput.apply(o, ke([], Ee(r), false));
      if ((t = (e = o.componentProps) === null || e === undefined ? undefined : e.onChange) !== null && t !== undefined) {
        t.call.apply(t, ke([e], Ee(r), false));
      }
    };
    var l = (0, k.JF)(o) ? o.componentProps?.onFocus : function () {
      var e;
      var t;
      var r = [];
      for (var n = 0; n < arguments.length; n++) {
        r[n] = arguments[n];
      }
      o.onFocus.apply(o, ke([], Ee(r), false));
      if ((t = (e = o.componentProps) === null || e === undefined ? undefined : e.onFocus) !== null && t !== undefined) {
        t.call.apply(t, ke([e], Ee(r), false));
      }
    };
    var c = (0, k.JF)(o) ? o.componentProps?.onBlur : function () {
      var e;
      var t;
      var r = [];
      for (var n = 0; n < arguments.length; n++) {
        r[n] = arguments[n];
      }
      o.onBlur.apply(o, ke([], Ee(r), false));
      if ((t = (e = o.componentProps) === null || e === undefined ? undefined : e.onBlur) !== null && t !== undefined) {
        t.call.apply(t, ke([e], Ee(r), false));
      }
    };
    var p = (0, k.JF)(o) ? undefined : o.pattern === "disabled" || o.pattern === "readPretty";
    var d = (0, k.JF)(o) ? undefined : o.pattern === "readOnly";
    return J.createElement(s(o.componentType), xe(xe({
      disabled: p,
      readOnly: d
    }, (0, i.ZN)(o.componentProps)), {
      value: n,
      onChange: u,
      onFocus: l,
      onBlur: c
    }), a);
  }
  return u(l());
}
Ae.displayName = "ReactiveField";
var _e = (0, X.Pi)(Ae, {
  forwardRef: true
});
function Oe() {
  Oe = Object.assign || function (e) {
    var t;
    for (var r = 1, n = arguments.length; r < n; r++) {
      t = arguments[r];
      for (var i in t) {
        if (Object.prototype.hasOwnProperty.call(t, i)) {
          e[i] = t[i];
        }
      }
    }
    return e;
  };
  return Oe.apply(this, arguments);
}
function Me(e) {
  var t = ce();
  var r = pe();
  var n = ee(t.createArrayField(Oe({
    basePath: r?.address
  }, e)));
  return J.createElement(ne.Provider, {
    value: n
  }, J.createElement(_e, {
    field: n
  }, e.children));
}
Me.displayName = "ArrayField";
function Pe() {
  Pe = Object.assign || function (e) {
    var t;
    for (var r = 1, n = arguments.length; r < n; r++) {
      t = arguments[r];
      for (var i in t) {
        if (Object.prototype.hasOwnProperty.call(t, i)) {
          e[i] = t[i];
        }
      }
    }
    return e;
  };
  return Pe.apply(this, arguments);
}
function qe(e) {
  var t = ce();
  var r = pe();
  var n = ee(t.createObjectField(Pe({
    basePath: r?.address
  }, e)));
  return J.createElement(ne.Provider, {
    value: n
  }, J.createElement(_e, {
    field: n
  }, e.children));
}
qe.displayName = "ObjectField";
function Ne() {
  Ne = Object.assign || function (e) {
    var t;
    for (var r = 1, n = arguments.length; r < n; r++) {
      t = arguments[r];
      for (var i in t) {
        if (Object.prototype.hasOwnProperty.call(t, i)) {
          e[i] = t[i];
        }
      }
    }
    return e;
  };
  return Ne.apply(this, arguments);
}
function Re(e) {
  var t = ce();
  var r = pe();
  var n = ee(t.createVoidField(Ne({
    basePath: r?.address
  }, e)));
  return J.createElement(ne.Provider, {
    value: n
  }, J.createElement(_e, {
    field: n
  }, e.children));
}
Re.displayName = "VoidField";
function Ie() {
  Ie = Object.assign || function (e) {
    var t;
    for (var r = 1, n = arguments.length; r < n; r++) {
      t = arguments[r];
      for (var i in t) {
        if (Object.prototype.hasOwnProperty.call(t, i)) {
          e[i] = t[i];
        }
      }
    }
    return e;
  };
  return Ie.apply(this, arguments);
}
function je(e) {
  var t = ce();
  var r = pe();
  var n = t.createField(Ie({
    basePath: r?.address
  }, e));
  (0, J.useEffect)(function () {
    if (n !== null && n !== undefined) {
      n.onMount();
    }
    return function () {
      if (n !== null && n !== undefined) {
        n.onUnmount();
      }
    };
  }, [n]);
  return J.createElement(ne.Provider, {
    value: n
  }, J.createElement(_e, {
    field: n
  }, e.children));
}
je.displayName = "Field";
var De;
var Le;
var Ze = {
  portalDOM: (Le = (De = n.kk?.document) === null || De === undefined ? undefined : De.createElement) === null || Le === undefined ? undefined : Le.call(De, "div"),
  createPortal: n.kk?.ReactDOM?.createPortal
};
function ze() {
  var e;
  if (!Ze.createPortal) {
    try {
      if ((e = Ze.createPortal) === null || e === undefined) {
        Ze.createPortal = require("./87995.js")?.createPortal;
      }
    } catch (Fe) {}
  }
  if (!Ze.createPortal) {
    try {
      Promise.resolve().then(require.t.bind(require, 87995, 19)).then(function (e) {
        return Ze.createPortal ??= e?.createPortal;
      }).catch();
    } catch (n) {}
  }
}
ze();
};
