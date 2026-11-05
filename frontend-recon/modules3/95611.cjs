// webpack module 95611 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Field: function () {
    return te;
  },
  FieldContext: function () {
    return E;
  },
  FormProvider: function () {
    return me;
  },
  List: function () {
    return ne;
  },
  ListContext: function () {
    return S;
  },
  default: function () {
    return Ce;
  },
  useForm: function () {
    return fe;
  },
  useWatch: function () {
    return ke;
  }
});
var n = require("59496");
var i = require("34256");
var o = require("37913");
var a = require("92145");
var s = require("23639");
var u = require("91613");
var l = require("66439");
var c = require("8951");
var p = require("45810");
var d = require("39695");
var f = require("78212");
var g = require("19746");
var m = require("21487");
var v = require("3787");
var y = require("44207");
var h = require("68044");
var b = "RC_FORM_INTERNAL_HOOKS";
function w() {
  (0, h.ZP)(false, "Can not find FormContext. Please make sure you wrap Field under Form.");
}
var x = n.createContext({
  getFieldValue: w,
  getFieldsValue: w,
  getFieldError: w,
  getFieldWarning: w,
  getFieldsError: w,
  isFieldsTouched: w,
  isFieldTouched: w,
  isFieldValidating: w,
  isFieldsValidating: w,
  resetFields: w,
  setFields: w,
  setFieldValue: w,
  setFieldsValue: w,
  validateFields: w,
  submit: w,
  getInternalHooks: function () {
    w();
    return {
      dispatch: w,
      initEntityValue: w,
      registerField: w,
      useSubscribe: w,
      setInitialValues: w,
      destroyForm: w,
      setCallbacks: w,
      registerWatch: w,
      getFields: w,
      setValidateMessages: w,
      setPreserve: w,
      getInitialValue: w
    };
  }
});
var E = x;
var k = n.createContext(null);
var S = k;
function T(e) {
  if (e === undefined || e === null) {
    return [];
  } else if (Array.isArray(e)) {
    return e;
  } else {
    return [e];
  }
}
function C(e) {
  return e && !!e._init;
}
var A = require("63325");
var _ = "'${name}' is not a valid ${type}";
var O = {
  default: "Validation error on field '${name}'",
  required: "'${name}' is required",
  enum: "'${name}' must be one of [${enum}]",
  whitespace: "'${name}' cannot be empty",
  date: {
    format: "'${name}' is invalid for format date",
    parse: "'${name}' could not be parsed as date",
    invalid: "'${name}' is invalid date"
  },
  types: {
    string: _,
    method: _,
    array: _,
    object: _,
    number: _,
    date: _,
    boolean: _,
    integer: _,
    float: _,
    regexp: _,
    email: _,
    url: _,
    hex: _
  },
  string: {
    len: "'${name}' must be exactly ${len} characters",
    min: "'${name}' must be at least ${min} characters",
    max: "'${name}' cannot be longer than ${max} characters",
    range: "'${name}' must be between ${min} and ${max} characters"
  },
  number: {
    len: "'${name}' must equal ${len}",
    min: "'${name}' cannot be less than ${min}",
    max: "'${name}' cannot be greater than ${max}",
    range: "'${name}' must be between ${min} and ${max}"
  },
  array: {
    len: "'${name}' must be exactly ${len} in length",
    min: "'${name}' cannot be less than ${min} in length",
    max: "'${name}' cannot be greater than ${max} in length",
    range: "'${name}' must be between ${min} and ${max} in length"
  },
  pattern: {
    mismatch: "'${name}' does not match pattern ${pattern}"
  }
};
var M = require("19889");
var P = A.Z;
function q(e, t) {
  return e.replace(/\$\{\w+\}/g, function (e) {
    var r = e.slice(2, -1);
    return t[r];
  });
}
var N = "CODE_LOGIC_ERROR";
function R(e, t, r, n, i) {
  return I.apply(this, arguments);
}
function I() {
  I = (0, s.Z)((0, a.Z)().mark(function e(t, r, i, o, s) {
    var c;
    var p;
    var d;
    var f;
    var g;
    var v;
    var y;
    var h;
    var b;
    return (0, a.Z)().wrap(function (e) {
      while (1) {
        switch (e.prev = e.next) {
          case 0:
            c = (0, u.Z)({}, i);
            delete c.ruleIndex;
            P.warning = function () {};
            if (c.validator) {
              p = c.validator;
              c.validator = function () {
                try {
                  return p.apply(undefined, arguments);
                } catch (e) {
                  console.error(e);
                  return Promise.reject(N);
                }
              };
            }
            d = null;
            if (c && c.type === "array" && c.defaultField) {
              d = c.defaultField;
              delete c.defaultField;
            }
            f = new P((0, m.Z)({}, t, [c]));
            g = (0, M.T)(O, o.validateMessages);
            f.messages(g);
            v = [];
            e.prev = 10;
            e.next = 13;
            return Promise.resolve(f.validate((0, m.Z)({}, t, r), (0, u.Z)({}, o)));
          case 13:
            e.next = 18;
            break;
          case 15:
            e.prev = 15;
            e.t0 = e.catch(10);
            if (e.t0.errors) {
              v = e.t0.errors.map(function (e, t) {
                var r = e.message;
                var i = r === N ? g.default : r;
                if (n.isValidElement(i)) {
                  return n.cloneElement(i, {
                    key: `error_${t}`
                  });
                } else {
                  return i;
                }
              });
            }
          case 18:
            if (v.length || !d) {
              e.next = 23;
              break;
            }
            e.next = 21;
            return Promise.all(r.map(function (e, r) {
              return R(`${t}.${r}`, e, d, o, s);
            }));
          case 21:
            y = e.sent;
            return e.abrupt("return", y.reduce(function (e, t) {
              return [].concat((0, l.Z)(e), (0, l.Z)(t));
            }, []));
          case 23:
            h = (0, u.Z)((0, u.Z)({}, i), {}, {
              name: t,
              enum: (i.enum || []).join(", ")
            }, s);
            b = v.map(function (e) {
              if (typeof e === "string") {
                return q(e, h);
              } else {
                return e;
              }
            });
            return e.abrupt("return", b);
          case 26:
          case "end":
            return e.stop();
        }
      }
    }, e, null, [[10, 15]]);
  }));
  return I.apply(this, arguments);
}
function j(e, t, r, n, i, o) {
  var l;
  var c = e.join(".");
  var p = r.map(function (e, t) {
    var r = e.validator;
    var n = (0, u.Z)((0, u.Z)({}, e), {}, {
      ruleIndex: t
    });
    if (r) {
      n.validator = function (e, t, n) {
        var i = false;
        function o() {
          for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
            t[r] = arguments[r];
          }
          Promise.resolve().then(function () {
            (0, h.ZP)(!i, "Your validator function has already return a promise. `callback` will be ignored.");
            if (!i) {
              n.apply(undefined, t);
            }
          });
        }
        var a = r(e, t, o);
        i = a && typeof a.then === "function" && typeof a.catch === "function";
        (0, h.ZP)(i, "`callback` is deprecated. Please return a promise instead.");
        if (i) {
          a.then(function () {
            n();
          }).catch(function (e) {
            n(e || " ");
          });
        }
      };
    }
    return n;
  }).sort(function (e, t) {
    var r = e.warningOnly;
    var n = e.ruleIndex;
    var i = t.warningOnly;
    var o = t.ruleIndex;
    if (!!r === !!i) {
      return n - o;
    } else if (r) {
      return 1;
    } else {
      return -1;
    }
  });
  if (i === true) {
    l = new Promise(function () {
      var e = (0, s.Z)((0, a.Z)().mark(function e(r, i) {
        var s;
        var u;
        var l;
        return (0, a.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                s = 0;
              case 1:
                if (!(s < p.length)) {
                  e.next = 12;
                  break;
                }
                u = p[s];
                e.next = 5;
                return R(c, t, u, n, o);
              case 5:
                l = e.sent;
                if (!l.length) {
                  e.next = 9;
                  break;
                }
                i([{
                  errors: l,
                  rule: u
                }]);
                return e.abrupt("return");
              case 9:
                s += 1;
                e.next = 1;
                break;
              case 12:
                r([]);
              case 13:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }));
      return function (t, r) {
        return e.apply(this, arguments);
      };
    }());
  } else {
    var d = p.map(function (e) {
      return R(c, t, e, n, o).then(function (t) {
        return {
          errors: t,
          rule: e
        };
      });
    });
    l = (i ? F(d) : D(d)).then(function (e) {
      return Promise.reject(e);
    });
  }
  l.catch(function (e) {
    return e;
  });
  return l;
}
function D(e) {
  return L.apply(this, arguments);
}
function L() {
  L = (0, s.Z)((0, a.Z)().mark(function e(t) {
    return (0, a.Z)().wrap(function (e) {
      while (1) {
        switch (e.prev = e.next) {
          case 0:
            return e.abrupt("return", Promise.all(t).then(function (e) {
              var t;
              var r = (t = []).concat.apply(t, (0, l.Z)(e));
              return r;
            }));
          case 1:
          case "end":
            return e.stop();
        }
      }
    }, e);
  }));
  return L.apply(this, arguments);
}
function F(e) {
  return Z.apply(this, arguments);
}
function Z() {
  Z = (0, s.Z)((0, a.Z)().mark(function e(t) {
    var r;
    return (0, a.Z)().wrap(function (e) {
      while (1) {
        switch (e.prev = e.next) {
          case 0:
            r = 0;
            return e.abrupt("return", new Promise(function (e) {
              t.forEach(function (n) {
                n.then(function (n) {
                  if (n.errors.length) {
                    e([n]);
                  }
                  r += 1;
                  if (r === t.length) {
                    e([]);
                  }
                });
              });
            }));
          case 2:
          case "end":
            return e.stop();
        }
      }
    }, e);
  }));
  return Z.apply(this, arguments);
}
var z = require("75728");
var U = require("64209");
function B(e) {
  return T(e);
}
function V(e, t) {
  var r = {};
  t.forEach(function (t) {
    var n = (0, U.Z)(e, t);
    r = (0, M.Z)(r, t, n);
  });
  return r;
}
function H(e, t, r = false) {
  return e && e.some(function (e) {
    return W(t, e, r);
  });
}
function W(e, t, r = false) {
  return !!e && !!t && (!!r || e.length === t.length) && t.every(function (t, r) {
    return e[r] === t;
  });
}
function Y(e, t) {
  if (e === t) {
    return true;
  }
  if (!e && t || e && !t) {
    return false;
  }
  if (!e || !t || (0, z.Z)(e) !== "object" || (0, z.Z)(t) !== "object") {
    return false;
  }
  var r = Object.keys(e);
  var n = Object.keys(t);
  var i = new Set([].concat(r, n));
  return (0, l.Z)(i).every(function (r) {
    var n = e[r];
    var i = t[r];
    return typeof n === "function" && typeof i === "function" || n === i;
  });
}
function Q(e) {
  var t = arguments.length <= 1 ? undefined : arguments[1];
  if (t && t.target && (0, z.Z)(t.target) === "object" && e in t.target) {
    return t.target[e];
  } else {
    return t;
  }
}
function $(e, t, r) {
  var n = e.length;
  if (t < 0 || t >= n || r < 0 || r >= n) {
    return e;
  }
  var i = e[t];
  var o = t - r;
  if (o > 0) {
    return [].concat((0, l.Z)(e.slice(0, r)), [i], (0, l.Z)(e.slice(r, t)), (0, l.Z)(e.slice(t + 1, n)));
  } else if (o < 0) {
    return [].concat((0, l.Z)(e.slice(0, t)), (0, l.Z)(e.slice(t + 1, r + 1)), [i], (0, l.Z)(e.slice(r + 1, n)));
  } else {
    return e;
  }
}
var G = ["name"];
var K = [];
function J(e, t, r, n, i, o) {
  if (typeof e === "function") {
    return e(t, r, "source" in o ? {
      source: o.source
    } : {});
  } else {
    return n !== i;
  }
}
var X = function (e) {
  (0, f.Z)(r, e);
  var t = (0, g.Z)(r);
  function r(e) {
    var i;
    (0, c.Z)(this, r);
    i = t.call(this, e);
    (0, m.Z)((0, d.Z)(i), "state", {
      resetCount: 0
    });
    (0, m.Z)((0, d.Z)(i), "cancelRegisterFunc", null);
    (0, m.Z)((0, d.Z)(i), "mounted", false);
    (0, m.Z)((0, d.Z)(i), "touched", false);
    (0, m.Z)((0, d.Z)(i), "dirty", false);
    (0, m.Z)((0, d.Z)(i), "validatePromise", undefined);
    (0, m.Z)((0, d.Z)(i), "prevValidating", undefined);
    (0, m.Z)((0, d.Z)(i), "errors", K);
    (0, m.Z)((0, d.Z)(i), "warnings", K);
    (0, m.Z)((0, d.Z)(i), "cancelRegister", function () {
      var e = i.props;
      var t = e.preserve;
      var r = e.isListField;
      var n = e.name;
      if (i.cancelRegisterFunc) {
        i.cancelRegisterFunc(r, t, B(n));
      }
      i.cancelRegisterFunc = null;
    });
    (0, m.Z)((0, d.Z)(i), "getNamePath", function () {
      var e = i.props;
      var t = e.name;
      var r = e.fieldContext;
      var n = r.prefixName;
      var o = n === undefined ? [] : n;
      if (t !== undefined) {
        return [].concat((0, l.Z)(o), (0, l.Z)(t));
      } else {
        return [];
      }
    });
    (0, m.Z)((0, d.Z)(i), "getRules", function () {
      var e = i.props;
      var t = e.rules;
      var r = t === undefined ? [] : t;
      var n = e.fieldContext;
      return r.map(function (e) {
        if (typeof e === "function") {
          return e(n);
        } else {
          return e;
        }
      });
    });
    (0, m.Z)((0, d.Z)(i), "refresh", function () {
      if (i.mounted) {
        i.setState(function (e) {
          var t = e.resetCount;
          return {
            resetCount: t + 1
          };
        });
      }
    });
    (0, m.Z)((0, d.Z)(i), "metaCache", null);
    (0, m.Z)((0, d.Z)(i), "triggerMetaEvent", function (e) {
      var t = i.props.onMetaChange;
      if (t) {
        var r = (0, u.Z)((0, u.Z)({}, i.getMeta()), {}, {
          destroy: e
        });
        if (!(0, y.Z)(i.metaCache, r)) {
          t(r);
        }
        i.metaCache = r;
      } else {
        i.metaCache = null;
      }
    });
    (0, m.Z)((0, d.Z)(i), "onStoreChange", function (e, t, r) {
      var n = i.props;
      var o = n.shouldUpdate;
      var a = n.dependencies;
      var s = a === undefined ? [] : a;
      var u = n.onReset;
      var l = r.store;
      var c = i.getNamePath();
      var p = i.getValue(e);
      var d = i.getValue(l);
      var f = t && H(t, c);
      if (r.type === "valueUpdate" && r.source === "external" && p !== d) {
        i.touched = true;
        i.dirty = true;
        i.validatePromise = null;
        i.errors = K;
        i.warnings = K;
        i.triggerMetaEvent();
      }
      switch (r.type) {
        case "reset":
          if (!t || f) {
            i.touched = false;
            i.dirty = false;
            i.validatePromise = undefined;
            i.errors = K;
            i.warnings = K;
            i.triggerMetaEvent();
            if (u !== null && u !== undefined) {
              u();
            }
            i.refresh();
            return;
          }
          break;
        case "remove":
          if (o) {
            i.reRender();
            return;
          }
          break;
        case "setField":
          var g = r.data;
          if (f) {
            if ("touched" in g) {
              i.touched = g.touched;
            }
            if ("validating" in g && !("originRCField" in g)) {
              i.validatePromise = g.validating ? Promise.resolve([]) : null;
            }
            if ("errors" in g) {
              i.errors = g.errors || K;
            }
            if ("warnings" in g) {
              i.warnings = g.warnings || K;
            }
            i.dirty = true;
            i.triggerMetaEvent();
            i.reRender();
            return;
          }
          if ("value" in g && H(t, c, true)) {
            i.reRender();
            return;
          }
          if (o && !c.length && J(o, e, l, p, d, r)) {
            i.reRender();
            return;
          }
          break;
        case "dependenciesUpdate":
          var m = s.map(B);
          if (m.some(function (e) {
            return H(r.relatedFields, e);
          })) {
            i.reRender();
            return;
          }
          break;
        default:
          if (f || (!s.length || c.length || o) && J(o, e, l, p, d, r)) {
            i.reRender();
            return;
          }
          break;
      }
      if (o === true) {
        i.reRender();
      }
    });
    (0, m.Z)((0, d.Z)(i), "validateRules", function (e) {
      var t = i.getNamePath();
      var r = i.getValue();
      var n = e || {};
      var o = n.triggerName;
      var u = n.validateOnly;
      var c = u !== undefined && u;
      var p = Promise.resolve().then((0, s.Z)((0, a.Z)().mark(function n() {
        var s;
        var u;
        var c;
        var d;
        var f;
        var g;
        var m;
        return (0, a.Z)().wrap(function (n) {
          while (1) {
            switch (n.prev = n.next) {
              case 0:
                if (i.mounted) {
                  n.next = 2;
                  break;
                }
                return n.abrupt("return", []);
              case 2:
                s = i.props;
                u = s.validateFirst;
                c = u !== undefined && u;
                d = s.messageVariables;
                f = s.validateDebounce;
                g = i.getRules();
                if (o) {
                  g = g.filter(function (e) {
                    return e;
                  }).filter(function (e) {
                    var t = e.validateTrigger;
                    if (!t) {
                      return true;
                    }
                    var r = T(t);
                    return r.includes(o);
                  });
                }
                if (!f || !o) {
                  n.next = 10;
                  break;
                }
                n.next = 8;
                return new Promise(function (e) {
                  setTimeout(e, f);
                });
              case 8:
                if (i.validatePromise === p) {
                  n.next = 10;
                  break;
                }
                return n.abrupt("return", []);
              case 10:
                m = j(t, r, g, e, c, d);
                m.catch(function (e) {
                  return e;
                }).then(function (e = K) {
                  if (i.validatePromise === p) {
                    var t;
                    i.validatePromise = null;
                    var r = [];
                    var n = [];
                    if ((t = e.forEach) !== null && t !== undefined) {
                      t.call(e, function (e) {
                        var t = e.rule.warningOnly;
                        var i = e.errors;
                        var o = i === undefined ? K : i;
                        if (t) {
                          n.push.apply(n, (0, l.Z)(o));
                        } else {
                          r.push.apply(r, (0, l.Z)(o));
                        }
                      });
                    }
                    i.errors = r;
                    i.warnings = n;
                    i.triggerMetaEvent();
                    i.reRender();
                  }
                });
                return n.abrupt("return", m);
              case 13:
              case "end":
                return n.stop();
            }
          }
        }, n);
      })));
      if (!c) {
        i.validatePromise = p;
        i.dirty = true;
        i.errors = K;
        i.warnings = K;
        i.triggerMetaEvent();
        i.reRender();
      }
      return p;
    });
    (0, m.Z)((0, d.Z)(i), "isFieldValidating", function () {
      return !!i.validatePromise;
    });
    (0, m.Z)((0, d.Z)(i), "isFieldTouched", function () {
      return i.touched;
    });
    (0, m.Z)((0, d.Z)(i), "isFieldDirty", function () {
      if (i.dirty || i.props.initialValue !== undefined) {
        return true;
      }
      var e = i.props.fieldContext;
      var t = e.getInternalHooks(b);
      var r = t.getInitialValue;
      return r(i.getNamePath()) !== undefined;
    });
    (0, m.Z)((0, d.Z)(i), "getErrors", function () {
      return i.errors;
    });
    (0, m.Z)((0, d.Z)(i), "getWarnings", function () {
      return i.warnings;
    });
    (0, m.Z)((0, d.Z)(i), "isListField", function () {
      return i.props.isListField;
    });
    (0, m.Z)((0, d.Z)(i), "isList", function () {
      return i.props.isList;
    });
    (0, m.Z)((0, d.Z)(i), "isPreserve", function () {
      return i.props.preserve;
    });
    (0, m.Z)((0, d.Z)(i), "getMeta", function () {
      i.prevValidating = i.isFieldValidating();
      var e = {
        touched: i.isFieldTouched(),
        validating: i.prevValidating,
        errors: i.errors,
        warnings: i.warnings,
        name: i.getNamePath(),
        validated: i.validatePromise === null
      };
      return e;
    });
    (0, m.Z)((0, d.Z)(i), "getOnlyChild", function (e) {
      if (typeof e === "function") {
        var t = i.getMeta();
        return (0, u.Z)((0, u.Z)({}, i.getOnlyChild(e(i.getControlled(), t, i.props.fieldContext))), {}, {
          isFunction: true
        });
      }
      var r = (0, v.Z)(e);
      if (r.length === 1 && n.isValidElement(r[0])) {
        return {
          child: r[0],
          isFunction: false
        };
      } else {
        return {
          child: r,
          isFunction: false
        };
      }
    });
    (0, m.Z)((0, d.Z)(i), "getValue", function (e) {
      var t = i.props.fieldContext.getFieldsValue;
      var r = i.getNamePath();
      return (0, U.Z)(e || t(true), r);
    });
    (0, m.Z)((0, d.Z)(i), "getControlled", function (e = {}) {
      var t = i.props;
      var r = t.trigger;
      var n = t.validateTrigger;
      var o = t.getValueFromEvent;
      var a = t.normalize;
      var s = t.valuePropName;
      var l = t.getValueProps;
      var c = t.fieldContext;
      var p = n !== undefined ? n : c.validateTrigger;
      var d = i.getNamePath();
      var f = c.getInternalHooks;
      var g = c.getFieldsValue;
      var v = f(b);
      var y = v.dispatch;
      var h = i.getValue();
      var w = l || function (e) {
        return (0, m.Z)({}, s, e);
      };
      var x = e[r];
      var E = (0, u.Z)((0, u.Z)({}, e), w(h));
      E[r] = function () {
        var e;
        i.touched = true;
        i.dirty = true;
        i.triggerMetaEvent();
        for (var t = arguments.length, r = new Array(t), n = 0; n < t; n++) {
          r[n] = arguments[n];
        }
        e = o ? o.apply(undefined, r) : Q.apply(undefined, [s].concat(r));
        if (a) {
          e = a(e, h, g(true));
        }
        y({
          type: "updateValue",
          namePath: d,
          value: e
        });
        if (x) {
          x.apply(undefined, r);
        }
      };
      var k = T(p || []);
      k.forEach(function (e) {
        var t = E[e];
        E[e] = function () {
          if (t) {
            t.apply(undefined, arguments);
          }
          var r = i.props.rules;
          if (r && r.length) {
            y({
              type: "validateField",
              namePath: d,
              triggerName: e
            });
          }
        };
      });
      return E;
    });
    if (e.fieldContext) {
      var o = e.fieldContext.getInternalHooks;
      var p = o(b);
      var f = p.initEntityValue;
      f((0, d.Z)(i));
    }
    return i;
  }
  (0, p.Z)(r, [{
    key: "componentDidMount",
    value: function () {
      var e = this.props;
      var t = e.shouldUpdate;
      var r = e.fieldContext;
      this.mounted = true;
      if (r) {
        var n = r.getInternalHooks;
        var i = n(b);
        var o = i.registerField;
        this.cancelRegisterFunc = o(this);
      }
      if (t === true) {
        this.reRender();
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function () {
      this.cancelRegister();
      this.triggerMetaEvent(true);
      this.mounted = false;
    }
  }, {
    key: "reRender",
    value: function () {
      if (this.mounted) {
        this.forceUpdate();
      }
    }
  }, {
    key: "render",
    value: function () {
      var e;
      var t = this.state.resetCount;
      var r = this.props.children;
      var i = this.getOnlyChild(r);
      var o = i.child;
      var a = i.isFunction;
      if (a) {
        e = o;
      } else if (n.isValidElement(o)) {
        e = n.cloneElement(o, this.getControlled(o.props));
      } else {
        (0, h.ZP)(!o, "`children` of Field is not validate ReactElement.");
        e = o;
      }
      return n.createElement(n.Fragment, {
        key: t
      }, e);
    }
  }]);
  return r;
}(n.Component);
function ee(e) {
  var t = e.name;
  var r = (0, o.Z)(e, G);
  var a = n.useContext(E);
  var s = n.useContext(S);
  var u = t !== undefined ? B(t) : undefined;
  var l = "keep";
  if (!r.isListField) {
    l = `_${(u || []).join("_")}`;
  }
  return n.createElement(X, (0, i.Z)({
    key: l,
    name: u,
    isListField: !!s
  }, r, {
    fieldContext: a
  }));
}
(0, m.Z)(X, "contextType", E);
(0, m.Z)(X, "defaultProps", {
  trigger: "onChange",
  valuePropName: "value"
});
var te = ee;
function re(e) {
  var t = e.name;
  var r = e.initialValue;
  var i = e.children;
  var o = e.rules;
  var a = e.validateTrigger;
  var s = e.isListField;
  var c = n.useContext(E);
  var p = n.useContext(S);
  var d = n.useRef({
    keys: [],
    id: 0
  });
  var f = d.current;
  var g = n.useMemo(function () {
    var e = B(c.prefixName) || [];
    return [].concat((0, l.Z)(e), (0, l.Z)(B(t)));
  }, [c.prefixName, t]);
  var m = n.useMemo(function () {
    return (0, u.Z)((0, u.Z)({}, c), {}, {
      prefixName: g
    });
  }, [c, g]);
  var v = n.useMemo(function () {
    return {
      getKey: function (e) {
        var t = g.length;
        var r = e[t];
        return [f.keys[r], e.slice(t + 1)];
      }
    };
  }, [g]);
  if (typeof i !== "function") {
    (0, h.ZP)(false, "Form.List only accepts function as children.");
    return null;
  }
  function y(e, t, r) {
    var n = r.source;
    return n !== "internal" && e !== t;
  }
  return n.createElement(S.Provider, {
    value: v
  }, n.createElement(E.Provider, {
    value: m
  }, n.createElement(te, {
    name: [],
    shouldUpdate: y,
    rules: o,
    validateTrigger: a,
    initialValue: r,
    isList: true,
    isListField: s ?? !!p
  }, function (e, t) {
    var r = e.value;
    var n = r === undefined ? [] : r;
    var o = e.onChange;
    var a = c.getFieldValue;
    function s() {
      var e = a(g || []);
      return e || [];
    }
    var u = {
      add: function (e, t) {
        var r = s();
        if (t >= 0 && t <= r.length) {
          f.keys = [].concat((0, l.Z)(f.keys.slice(0, t)), [f.id], (0, l.Z)(f.keys.slice(t)));
          o([].concat((0, l.Z)(r.slice(0, t)), [e], (0, l.Z)(r.slice(t))));
        } else {
          f.keys = [].concat((0, l.Z)(f.keys), [f.id]);
          o([].concat((0, l.Z)(r), [e]));
        }
        f.id += 1;
      },
      remove: function (e) {
        var t = s();
        var r = new Set(Array.isArray(e) ? e : [e]);
        if (!(r.size <= 0)) {
          f.keys = f.keys.filter(function (e, t) {
            return !r.has(t);
          });
          o(t.filter(function (e, t) {
            return !r.has(t);
          }));
        }
      },
      move: function (e, t) {
        if (e !== t) {
          var r = s();
          if (!(e < 0) && !(e >= r.length) && !(t < 0) && !(t >= r.length)) {
            f.keys = $(f.keys, e, t);
            o($(r, e, t));
          }
        }
      }
    };
    var p = n || [];
    if (!Array.isArray(p)) {
      p = [];
    }
    return i(p.map(function (e, t) {
      var r = f.keys[t];
      if (r === undefined) {
        f.keys[t] = f.id;
        r = f.keys[t];
        f.id += 1;
      }
      return {
        name: t,
        key: r,
        isListField: true
      };
    }), u, t);
  })));
}
var ne = re;
var ie = require("23874");
function oe(e) {
  var t = false;
  var r = e.length;
  var n = [];
  if (e.length) {
    return new Promise(function (i, o) {
      e.forEach(function (e, a) {
        e.catch(function (e) {
          t = true;
          return e;
        }).then(function (e) {
          r -= 1;
          n[a] = e;
          if (!(r > 0)) {
            if (t) {
              o(n);
            }
            i(n);
          }
        });
      });
    });
  } else {
    return Promise.resolve([]);
  }
}
var ae = "__@field_split__";
function se(e) {
  return e.map(function (e) {
    return `${(0, z.Z)(e)}:${e}`;
  }).join(ae);
}
var ue = function () {
  function e() {
    (0, c.Z)(this, e);
    (0, m.Z)(this, "kvs", new Map());
  }
  (0, p.Z)(e, [{
    key: "set",
    value: function (e, t) {
      this.kvs.set(se(e), t);
    }
  }, {
    key: "get",
    value: function (e) {
      return this.kvs.get(se(e));
    }
  }, {
    key: "update",
    value: function (e, t) {
      var r = this.get(e);
      var n = t(r);
      if (n) {
        this.set(e, n);
      } else {
        this.delete(e);
      }
    }
  }, {
    key: "delete",
    value: function (e) {
      this.kvs.delete(se(e));
    }
  }, {
    key: "map",
    value: function (e) {
      return (0, l.Z)(this.kvs.entries()).map(function (t) {
        var r = (0, ie.Z)(t, 2);
        var n = r[0];
        var i = r[1];
        var o = n.split(ae);
        return e({
          key: o.map(function (e) {
            var t = e.match(/^([^:]*):(.*)$/);
            var r = (0, ie.Z)(t, 3);
            var n = r[1];
            var i = r[2];
            if (n === "number") {
              return Number(i);
            } else {
              return i;
            }
          }),
          value: i
        });
      });
    }
  }, {
    key: "toJSON",
    value: function () {
      var e = {};
      this.map(function (t) {
        var r = t.key;
        var n = t.value;
        e[r.join(".")] = n;
        return null;
      });
      return e;
    }
  }]);
  return e;
}();
var le = ue;
var ce = ["name"];
var pe = (0, p.Z)(function e(t) {
  var r = this;
  (0, c.Z)(this, e);
  (0, m.Z)(this, "formHooked", false);
  (0, m.Z)(this, "forceRootUpdate", undefined);
  (0, m.Z)(this, "subscribable", true);
  (0, m.Z)(this, "store", {});
  (0, m.Z)(this, "fieldEntities", []);
  (0, m.Z)(this, "initialValues", {});
  (0, m.Z)(this, "callbacks", {});
  (0, m.Z)(this, "validateMessages", null);
  (0, m.Z)(this, "preserve", null);
  (0, m.Z)(this, "lastValidatePromise", null);
  (0, m.Z)(this, "getForm", function () {
    return {
      getFieldValue: r.getFieldValue,
      getFieldsValue: r.getFieldsValue,
      getFieldError: r.getFieldError,
      getFieldWarning: r.getFieldWarning,
      getFieldsError: r.getFieldsError,
      isFieldsTouched: r.isFieldsTouched,
      isFieldTouched: r.isFieldTouched,
      isFieldValidating: r.isFieldValidating,
      isFieldsValidating: r.isFieldsValidating,
      resetFields: r.resetFields,
      setFields: r.setFields,
      setFieldValue: r.setFieldValue,
      setFieldsValue: r.setFieldsValue,
      validateFields: r.validateFields,
      submit: r.submit,
      _init: true,
      getInternalHooks: r.getInternalHooks
    };
  });
  (0, m.Z)(this, "getInternalHooks", function (e) {
    if (e === b) {
      r.formHooked = true;
      return {
        dispatch: r.dispatch,
        initEntityValue: r.initEntityValue,
        registerField: r.registerField,
        useSubscribe: r.useSubscribe,
        setInitialValues: r.setInitialValues,
        destroyForm: r.destroyForm,
        setCallbacks: r.setCallbacks,
        setValidateMessages: r.setValidateMessages,
        getFields: r.getFields,
        setPreserve: r.setPreserve,
        getInitialValue: r.getInitialValue,
        registerWatch: r.registerWatch
      };
    } else {
      (0, h.ZP)(false, "`getInternalHooks` is internal usage. Should not call directly.");
      return null;
    }
  });
  (0, m.Z)(this, "useSubscribe", function (e) {
    r.subscribable = e;
  });
  (0, m.Z)(this, "prevWithoutPreserves", null);
  (0, m.Z)(this, "setInitialValues", function (e, t) {
    r.initialValues = e || {};
    if (t) {
      var n;
      var i = (0, M.T)(e, r.store);
      if ((n = r.prevWithoutPreserves) !== null && n !== undefined) {
        n.map(function (t) {
          var r = t.key;
          i = (0, M.Z)(i, r, (0, U.Z)(e, r));
        });
      }
      r.prevWithoutPreserves = null;
      r.updateStore(i);
    }
  });
  (0, m.Z)(this, "destroyForm", function () {
    var e = new le();
    r.getFieldEntities(true).forEach(function (t) {
      if (!r.isMergedPreserve(t.isPreserve())) {
        e.set(t.getNamePath(), true);
      }
    });
    r.prevWithoutPreserves = e;
  });
  (0, m.Z)(this, "getInitialValue", function (e) {
    var t = (0, U.Z)(r.initialValues, e);
    if (e.length) {
      return (0, M.T)(t);
    } else {
      return t;
    }
  });
  (0, m.Z)(this, "setCallbacks", function (e) {
    r.callbacks = e;
  });
  (0, m.Z)(this, "setValidateMessages", function (e) {
    r.validateMessages = e;
  });
  (0, m.Z)(this, "setPreserve", function (e) {
    r.preserve = e;
  });
  (0, m.Z)(this, "watchList", []);
  (0, m.Z)(this, "registerWatch", function (e) {
    r.watchList.push(e);
    return function () {
      r.watchList = r.watchList.filter(function (t) {
        return t !== e;
      });
    };
  });
  (0, m.Z)(this, "notifyWatch", function (e = []) {
    if (r.watchList.length) {
      var t = r.getFieldsValue();
      var n = r.getFieldsValue(true);
      r.watchList.forEach(function (r) {
        r(t, n, e);
      });
    }
  });
  (0, m.Z)(this, "timeoutId", null);
  (0, m.Z)(this, "warningUnhooked", function () {
    0;
  });
  (0, m.Z)(this, "updateStore", function (e) {
    r.store = e;
  });
  (0, m.Z)(this, "getFieldEntities", function (e = false) {
    if (e) {
      return r.fieldEntities.filter(function (e) {
        return e.getNamePath().length;
      });
    } else {
      return r.fieldEntities;
    }
  });
  (0, m.Z)(this, "getFieldsMap", function (e = false) {
    var t = new le();
    r.getFieldEntities(e).forEach(function (e) {
      var r = e.getNamePath();
      t.set(r, e);
    });
    return t;
  });
  (0, m.Z)(this, "getFieldEntitiesForNamePathList", function (e) {
    if (!e) {
      return r.getFieldEntities(true);
    }
    var t = r.getFieldsMap(true);
    return e.map(function (e) {
      var r = B(e);
      return t.get(r) || {
        INVALIDATE_NAME_PATH: B(e)
      };
    });
  });
  (0, m.Z)(this, "getFieldsValue", function (e, t) {
    var n;
    var i;
    var o;
    r.warningUnhooked();
    if (e === true || Array.isArray(e)) {
      n = e;
      i = t;
    } else if (e && (0, z.Z)(e) === "object") {
      o = e.strict;
      i = e.filter;
    }
    if (n === true && !i) {
      return r.store;
    }
    var a = r.getFieldEntitiesForNamePathList(Array.isArray(n) ? n : null);
    var s = [];
    a.forEach(function (e) {
      var t;
      var r;
      var a;
      var u;
      var l = "INVALIDATE_NAME_PATH" in e ? e.INVALIDATE_NAME_PATH : e.getNamePath();
      if (o) {
        if ((a = (u = e).isList) !== null && a !== undefined && a.call(u)) {
          return;
        }
      } else if (!n && (t = (r = e).isListField) !== null && t !== undefined && t.call(r)) {
        return;
      }
      if (i) {
        var c = "getMeta" in e ? e.getMeta() : null;
        if (i(c)) {
          s.push(l);
        }
      } else {
        s.push(l);
      }
    });
    return V(r.store, s.map(B));
  });
  (0, m.Z)(this, "getFieldValue", function (e) {
    r.warningUnhooked();
    var t = B(e);
    return (0, U.Z)(r.store, t);
  });
  (0, m.Z)(this, "getFieldsError", function (e) {
    r.warningUnhooked();
    var t = r.getFieldEntitiesForNamePathList(e);
    return t.map(function (t, r) {
      if (t && !("INVALIDATE_NAME_PATH" in t)) {
        return {
          name: t.getNamePath(),
          errors: t.getErrors(),
          warnings: t.getWarnings()
        };
      } else {
        return {
          name: B(e[r]),
          errors: [],
          warnings: []
        };
      }
    });
  });
  (0, m.Z)(this, "getFieldError", function (e) {
    r.warningUnhooked();
    var t = B(e);
    var n = r.getFieldsError([t])[0];
    return n.errors;
  });
  (0, m.Z)(this, "getFieldWarning", function (e) {
    r.warningUnhooked();
    var t = B(e);
    var n = r.getFieldsError([t])[0];
    return n.warnings;
  });
  (0, m.Z)(this, "isFieldsTouched", function () {
    r.warningUnhooked();
    for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++) {
      t[n] = arguments[n];
    }
    var i;
    var o = t[0];
    var a = t[1];
    var s = false;
    if (t.length === 0) {
      i = null;
    } else if (t.length === 1) {
      if (Array.isArray(o)) {
        i = o.map(B);
        s = false;
      } else {
        i = null;
        s = o;
      }
    } else {
      i = o.map(B);
      s = a;
    }
    var u = r.getFieldEntities(true);
    function c(e) {
      return e.isFieldTouched();
    }
    if (!i) {
      if (s) {
        return u.every(c);
      } else {
        return u.some(c);
      }
    }
    var p = new le();
    i.forEach(function (e) {
      p.set(e, []);
    });
    u.forEach(function (e) {
      var t = e.getNamePath();
      i.forEach(function (r) {
        if (r.every(function (e, r) {
          return t[r] === e;
        })) {
          p.update(r, function (t) {
            return [].concat((0, l.Z)(t), [e]);
          });
        }
      });
    });
    function d(e) {
      return e.some(c);
    }
    var f = p.map(function (e) {
      var t = e.value;
      return t;
    });
    if (s) {
      return f.every(d);
    } else {
      return f.some(d);
    }
  });
  (0, m.Z)(this, "isFieldTouched", function (e) {
    r.warningUnhooked();
    return r.isFieldsTouched([e]);
  });
  (0, m.Z)(this, "isFieldsValidating", function (e) {
    r.warningUnhooked();
    var t = r.getFieldEntities();
    if (!e) {
      return t.some(function (e) {
        return e.isFieldValidating();
      });
    }
    var n = e.map(B);
    return t.some(function (e) {
      var t = e.getNamePath();
      return H(n, t) && e.isFieldValidating();
    });
  });
  (0, m.Z)(this, "isFieldValidating", function (e) {
    r.warningUnhooked();
    return r.isFieldsValidating([e]);
  });
  (0, m.Z)(this, "resetWithFieldInitialValue", function (e = {}) {
    var t = new le();
    var n = r.getFieldEntities(true);
    n.forEach(function (e) {
      var r = e.props.initialValue;
      var n = e.getNamePath();
      if (r !== undefined) {
        var i = t.get(n) || new Set();
        i.add({
          entity: e,
          value: r
        });
        t.set(n, i);
      }
    });
    var i;
    function o(n) {
      n.forEach(function (n) {
        var i = n.props.initialValue;
        if (i !== undefined) {
          var o = n.getNamePath();
          var a = r.getInitialValue(o);
          if (a !== undefined) {
            (0, h.ZP)(false, `Form already set 'initialValues' with path '${o.join(".")}'. Field can not overwrite it.`);
          } else {
            var s = t.get(o);
            if (s && s.size > 1) {
              (0, h.ZP)(false, `Multiple Field with path '${o.join(".")}' set 'initialValue'. Can not decide which one to pick.`);
            } else if (s) {
              var u = r.getFieldValue(o);
              if (!e.skipExist || u === undefined) {
                r.updateStore((0, M.Z)(r.store, o, (0, l.Z)(s)[0].value));
              }
            }
          }
        }
      });
    }
    if (e.entities) {
      i = e.entities;
    } else if (e.namePathList) {
      i = [];
      e.namePathList.forEach(function (e) {
        var r;
        var n = t.get(e);
        if (n) {
          (r = i).push.apply(r, (0, l.Z)((0, l.Z)(n).map(function (e) {
            return e.entity;
          })));
        }
      });
    } else {
      i = n;
    }
    o(i);
  });
  (0, m.Z)(this, "resetFields", function (e) {
    r.warningUnhooked();
    var t = r.store;
    if (!e) {
      r.updateStore((0, M.T)(r.initialValues));
      r.resetWithFieldInitialValue();
      r.notifyObservers(t, null, {
        type: "reset"
      });
      r.notifyWatch();
      return;
    }
    var n = e.map(B);
    n.forEach(function (e) {
      var t = r.getInitialValue(e);
      r.updateStore((0, M.Z)(r.store, e, t));
    });
    r.resetWithFieldInitialValue({
      namePathList: n
    });
    r.notifyObservers(t, n, {
      type: "reset"
    });
    r.notifyWatch(n);
  });
  (0, m.Z)(this, "setFields", function (e) {
    r.warningUnhooked();
    var t = r.store;
    var n = [];
    e.forEach(function (e) {
      var i = e.name;
      var a = (0, o.Z)(e, ce);
      var s = B(i);
      n.push(s);
      if ("value" in a) {
        r.updateStore((0, M.Z)(r.store, s, a.value));
      }
      r.notifyObservers(t, [s], {
        type: "setField",
        data: e
      });
    });
    r.notifyWatch(n);
  });
  (0, m.Z)(this, "getFields", function () {
    var e = r.getFieldEntities(true);
    var t = e.map(function (e) {
      var t = e.getNamePath();
      var n = e.getMeta();
      var i = (0, u.Z)((0, u.Z)({}, n), {}, {
        name: t,
        value: r.getFieldValue(t)
      });
      Object.defineProperty(i, "originRCField", {
        value: true
      });
      return i;
    });
    return t;
  });
  (0, m.Z)(this, "initEntityValue", function (e) {
    var t = e.props.initialValue;
    if (t !== undefined) {
      var n = e.getNamePath();
      var i = (0, U.Z)(r.store, n);
      if (i === undefined) {
        r.updateStore((0, M.Z)(r.store, n, t));
      }
    }
  });
  (0, m.Z)(this, "isMergedPreserve", function (e) {
    var t = e !== undefined ? e : r.preserve;
    return t === null || t === undefined || t;
  });
  (0, m.Z)(this, "registerField", function (e) {
    r.fieldEntities.push(e);
    var t = e.getNamePath();
    r.notifyWatch([t]);
    if (e.props.initialValue !== undefined) {
      var n = r.store;
      r.resetWithFieldInitialValue({
        entities: [e],
        skipExist: true
      });
      r.notifyObservers(n, [e.getNamePath()], {
        type: "valueUpdate",
        source: "internal"
      });
    }
    return function (n, i, o = []) {
      r.fieldEntities = r.fieldEntities.filter(function (t) {
        return t !== e;
      });
      if (!r.isMergedPreserve(i) && (!n || o.length > 1)) {
        var a = n ? undefined : r.getInitialValue(t);
        if (t.length && r.getFieldValue(t) !== a && r.fieldEntities.every(function (e) {
          return !W(e.getNamePath(), t);
        })) {
          var s = r.store;
          r.updateStore((0, M.Z)(s, t, a, true));
          r.notifyObservers(s, [t], {
            type: "remove"
          });
          r.triggerDependenciesUpdate(s, t);
        }
      }
      r.notifyWatch([t]);
    };
  });
  (0, m.Z)(this, "dispatch", function (e) {
    switch (e.type) {
      case "updateValue":
        var t = e.namePath;
        var n = e.value;
        r.updateValue(t, n);
        break;
      case "validateField":
        var i = e.namePath;
        var o = e.triggerName;
        r.validateFields([i], {
          triggerName: o
        });
        break;
      default:
    }
  });
  (0, m.Z)(this, "notifyObservers", function (e, t, n) {
    if (r.subscribable) {
      var i = (0, u.Z)((0, u.Z)({}, n), {}, {
        store: r.getFieldsValue(true)
      });
      r.getFieldEntities().forEach(function (r) {
        var n = r.onStoreChange;
        n(e, t, i);
      });
    } else {
      r.forceRootUpdate();
    }
  });
  (0, m.Z)(this, "triggerDependenciesUpdate", function (e, t) {
    var n = r.getDependencyChildrenFields(t);
    if (n.length) {
      r.validateFields(n);
    }
    r.notifyObservers(e, n, {
      type: "dependenciesUpdate",
      relatedFields: [t].concat((0, l.Z)(n))
    });
    return n;
  });
  (0, m.Z)(this, "updateValue", function (e, t) {
    var n = B(e);
    var i = r.store;
    r.updateStore((0, M.Z)(r.store, n, t));
    r.notifyObservers(i, [n], {
      type: "valueUpdate",
      source: "internal"
    });
    r.notifyWatch([n]);
    var o = r.triggerDependenciesUpdate(i, n);
    var a = r.callbacks.onValuesChange;
    if (a) {
      var s = V(r.store, [n]);
      a(s, r.getFieldsValue());
    }
    r.triggerOnFieldsChange([n].concat((0, l.Z)(o)));
  });
  (0, m.Z)(this, "setFieldsValue", function (e) {
    r.warningUnhooked();
    var t = r.store;
    if (e) {
      var n = (0, M.T)(r.store, e);
      r.updateStore(n);
    }
    r.notifyObservers(t, null, {
      type: "valueUpdate",
      source: "external"
    });
    r.notifyWatch();
  });
  (0, m.Z)(this, "setFieldValue", function (e, t) {
    r.setFields([{
      name: e,
      value: t
    }]);
  });
  (0, m.Z)(this, "getDependencyChildrenFields", function (e) {
    var t = new Set();
    var n = [];
    var i = new le();
    r.getFieldEntities().forEach(function (e) {
      var t = e.props.dependencies;
      (t || []).forEach(function (t) {
        var r = B(t);
        i.update(r, function (t = new Set()) {
          t.add(e);
          return t;
        });
      });
    });
    var o = function e(r) {
      var o = i.get(r) || new Set();
      o.forEach(function (r) {
        if (!t.has(r)) {
          t.add(r);
          var i = r.getNamePath();
          if (r.isFieldDirty() && i.length) {
            n.push(i);
            e(i);
          }
        }
      });
    };
    o(e);
    return n;
  });
  (0, m.Z)(this, "triggerOnFieldsChange", function (e, t) {
    var n = r.callbacks.onFieldsChange;
    if (n) {
      var i = r.getFields();
      if (t) {
        var o = new le();
        t.forEach(function (e) {
          var t = e.name;
          var r = e.errors;
          o.set(t, r);
        });
        i.forEach(function (e) {
          e.errors = o.get(e.name) || e.errors;
        });
      }
      var a = i.filter(function (t) {
        var r = t.name;
        return H(e, r);
      });
      if (a.length) {
        n(a, i);
      }
    }
  });
  (0, m.Z)(this, "validateFields", function (e, t) {
    var i;
    var o;
    r.warningUnhooked();
    if (Array.isArray(e) || typeof e === "string" || typeof t === "string") {
      i = e;
      o = t;
    } else {
      o = e;
    }
    var a = !!i;
    var s = a ? i.map(B) : [];
    var c = [];
    var p = String(Date.now());
    var d = new Set();
    var f = o?.recursive;
    r.getFieldEntities(true).forEach(function (e) {
      if (!a) {
        s.push(e.getNamePath());
      }
      if (e.props.rules && e.props.rules.length) {
        var t = e.getNamePath();
        d.add(t.join(p));
        if (!a || H(s, t, f)) {
          var n = e.validateRules((0, u.Z)({
            validateMessages: (0, u.Z)((0, u.Z)({}, O), r.validateMessages)
          }, o));
          c.push(n.then(function () {
            return {
              name: t,
              errors: [],
              warnings: []
            };
          }).catch(function (e) {
            var r;
            var n = [];
            var i = [];
            if ((r = e.forEach) !== null && r !== undefined) {
              r.call(e, function (e) {
                var t = e.rule.warningOnly;
                var r = e.errors;
                if (t) {
                  i.push.apply(i, (0, l.Z)(r));
                } else {
                  n.push.apply(n, (0, l.Z)(r));
                }
              });
            }
            if (n.length) {
              return Promise.reject({
                name: t,
                errors: n,
                warnings: i
              });
            } else {
              return {
                name: t,
                errors: n,
                warnings: i
              };
            }
          }));
        }
      }
    });
    var g = oe(c);
    r.lastValidatePromise = g;
    g.catch(function (e) {
      return e;
    }).then(function (e) {
      var t = e.map(function (e) {
        var t = e.name;
        return t;
      });
      r.notifyObservers(r.store, t, {
        type: "validateFinish"
      });
      r.triggerOnFieldsChange(t, e);
    });
    var m = g.then(function () {
      if (r.lastValidatePromise === g) {
        return Promise.resolve(r.getFieldsValue(s));
      } else {
        return Promise.reject([]);
      }
    }).catch(function (e) {
      var t = e.filter(function (e) {
        return e && e.errors.length;
      });
      return Promise.reject({
        values: r.getFieldsValue(s),
        errorFields: t,
        outOfDate: r.lastValidatePromise !== g
      });
    });
    m.catch(function (e) {
      return e;
    });
    var v = s.filter(function (e) {
      return d.has(e.join(p));
    });
    r.triggerOnFieldsChange(v);
    return m;
  });
  (0, m.Z)(this, "submit", function () {
    r.warningUnhooked();
    r.validateFields().then(function (e) {
      var t = r.callbacks.onFinish;
      if (t) {
        try {
          t(e);
        } catch (n) {
          console.error(n);
        }
      }
    }).catch(function (e) {
      var t = r.callbacks.onFinishFailed;
      if (t) {
        t(e);
      }
    });
  });
  this.forceRootUpdate = t;
});
function de(e) {
  var t = n.useRef();
  var r = n.useState({});
  var i = (0, ie.Z)(r, 2);
  var o = i[1];
  if (!t.current) {
    if (e) {
      t.current = e;
    } else {
      function a() {
        o({});
      }
      var s = new pe(a);
      t.current = s.getForm();
    }
  }
  return [t.current];
}
var fe = de;
var ge = n.createContext({
  triggerFormChange: function () {},
  triggerFormFinish: function () {},
  registerForm: function () {},
  unregisterForm: function () {}
});
function me(e) {
  var t = e.validateMessages;
  var r = e.onFormChange;
  var i = e.onFormFinish;
  var o = e.children;
  var a = n.useContext(ge);
  var s = n.useRef({});
  return n.createElement(ge.Provider, {
    value: (0, u.Z)((0, u.Z)({}, a), {}, {
      validateMessages: (0, u.Z)((0, u.Z)({}, a.validateMessages), t),
      triggerFormChange: function (e, t) {
        if (r) {
          r(e, {
            changedFields: t,
            forms: s.current
          });
        }
        a.triggerFormChange(e, t);
      },
      triggerFormFinish: function (e, t) {
        if (i) {
          i(e, {
            values: t,
            forms: s.current
          });
        }
        a.triggerFormFinish(e, t);
      },
      registerForm: function (e, t) {
        if (e) {
          s.current = (0, u.Z)((0, u.Z)({}, s.current), {}, (0, m.Z)({}, e, t));
        }
        a.registerForm(e, t);
      },
      unregisterForm: function (e) {
        var t = (0, u.Z)({}, s.current);
        delete t[e];
        s.current = t;
        a.unregisterForm(e);
      }
    })
  }, o);
}
var ve = ge;
var ye = ["name", "initialValues", "fields", "form", "preserve", "children", "component", "validateMessages", "validateTrigger", "onValuesChange", "onFieldsChange", "onFinish", "onFinishFailed"];
function he(e, t) {
  var r = e.name;
  var a = e.initialValues;
  var s = e.fields;
  var l = e.form;
  var c = e.preserve;
  var p = e.children;
  var d = e.component;
  var f = d === undefined ? "form" : d;
  var g = e.validateMessages;
  var m = e.validateTrigger;
  var v = m === undefined ? "onChange" : m;
  var y = e.onValuesChange;
  var h = e.onFieldsChange;
  var w = e.onFinish;
  var x = e.onFinishFailed;
  var k = (0, o.Z)(e, ye);
  var T = n.useContext(ve);
  var C = fe(l);
  var A = (0, ie.Z)(C, 1);
  var _ = A[0];
  var O = _.getInternalHooks(b);
  var M = O.useSubscribe;
  var P = O.setInitialValues;
  var q = O.setCallbacks;
  var N = O.setValidateMessages;
  var R = O.setPreserve;
  var I = O.destroyForm;
  n.useImperativeHandle(t, function () {
    return _;
  });
  n.useEffect(function () {
    T.registerForm(r, _);
    return function () {
      T.unregisterForm(r);
    };
  }, [T, _, r]);
  N((0, u.Z)((0, u.Z)({}, T.validateMessages), g));
  q({
    onValuesChange: y,
    onFieldsChange: function (e) {
      T.triggerFormChange(r, e);
      if (h) {
        for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++) {
          n[i - 1] = arguments[i];
        }
        h.apply(undefined, [e].concat(n));
      }
    },
    onFinish: function (e) {
      T.triggerFormFinish(r, e);
      if (w) {
        w(e);
      }
    },
    onFinishFailed: x
  });
  R(c);
  var j;
  var D = n.useRef(null);
  P(a, !D.current);
  D.current ||= true;
  n.useEffect(function () {
    return I;
  }, []);
  var L = typeof p === "function";
  if (L) {
    var F = _.getFieldsValue(true);
    j = p(F, _);
  } else {
    j = p;
  }
  M(!L);
  var Z = n.useRef();
  n.useEffect(function () {
    if (!Y(Z.current || [], s || [])) {
      _.setFields(s || []);
    }
    Z.current = s;
  }, [s, _]);
  var z = n.useMemo(function () {
    return (0, u.Z)((0, u.Z)({}, _), {}, {
      validateTrigger: v
    });
  }, [_, v]);
  var U = n.createElement(S.Provider, {
    value: null
  }, n.createElement(E.Provider, {
    value: z
  }, j));
  if (f === false) {
    return U;
  } else {
    return n.createElement(f, (0, i.Z)({}, k, {
      onSubmit: function (e) {
        e.preventDefault();
        e.stopPropagation();
        _.submit();
      },
      onReset: function (e) {
        var t;
        e.preventDefault();
        _.resetFields();
        if ((t = k.onReset) !== null && t !== undefined) {
          t.call(k, e);
        }
      }
    }), U);
  }
}
var be = he;
function we(e) {
  try {
    return JSON.stringify(e);
  } catch (t) {
    return Math.random();
  }
}
function xe() {}
function Ee() {
  for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
    t[r] = arguments[r];
  }
  var i = t[0];
  var o = i === undefined ? [] : i;
  var a = t[1];
  var s = a === undefined ? {} : a;
  var u = C(s) ? {
    form: s
  } : s;
  var l = u.form;
  var c = (0, n.useState)();
  var p = (0, ie.Z)(c, 2);
  var d = p[0];
  var f = p[1];
  var g = (0, n.useMemo)(function () {
    return we(d);
  }, [d]);
  var m = (0, n.useRef)(g);
  m.current = g;
  var v = (0, n.useContext)(E);
  var y = l || v;
  var h = y && y._init;
  var w = B(o);
  var x = (0, n.useRef)(w);
  x.current = w;
  xe(w);
  (0, n.useEffect)(function () {
    if (h) {
      var e = y.getFieldsValue;
      var t = y.getInternalHooks;
      var r = t(b);
      var n = r.registerWatch;
      var i = n(function (e, t) {
        var r = (0, U.Z)(u.preserve ? t : e, x.current);
        var n = we(r);
        if (m.current !== n) {
          m.current = n;
          f(r);
        }
      });
      var o = (0, U.Z)(u.preserve ? e(true) : e(), x.current);
      if (d !== o) {
        f(o);
      }
      return i;
    }
  }, [h]);
  return d;
}
var ke = Ee;
var Se = n.forwardRef(be);
var Te = Se;
Te.FormProvider = me;
Te.Field = te;
Te.List = ne;
Te.useForm = fe;
Te.useWatch = ke;
var Ce = Te;
};
