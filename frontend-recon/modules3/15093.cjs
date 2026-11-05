// webpack module 15093 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Np: function () {
    return it;
  },
  JF: function () {
    return g;
  },
  _T: function () {
    return bt;
  },
  S9: function () {
    return ft;
  },
  ge: function () {
    return gt;
  },
  cW: function () {
    return ct;
  },
  P4: function () {
    return pt;
  },
  TE: function () {
    return vt;
  },
  Zm: function () {
    return yt;
  },
  g: function () {
    return mt;
  },
  c_: function () {
    return ht;
  },
  Zj: function () {
    return dt;
  },
  dQ: function () {
    return at;
  },
  pO: function () {
    return st;
  }
});
var n;
var i = require("./61553.js");
var o = function () {
  function e() {
    var e = [];
    for (var t = 0; t < arguments.length; t++) {
      e[t] = arguments[t];
    }
    var r = this;
    this.buildListener = function (e) {
      return function (t, r) {
        var n = this;
        for (var o = 0; o < e.length; o++) {
          var a = e[o];
          if ((0, i.LQ)(a)) {
            a.call(this, t, r);
          } else if ((0, i.d8)(a) && (0, i.LQ)(e[o + 1])) {
            if (a === t.type) {
              e[o + 1].call(this, t.payload, r);
            }
            o++;
          } else {
            (0, i.S6)(a, function (e, o) {
              if ((0, i.LQ)(e) && (0, i.d8)(o) && o === t.type) {
                e.call(n, t.payload, r);
                return false;
              }
            });
          }
        }
      };
    };
    this.notify = function (e, t, n) {
      if ((0, i.d8)(e)) {
        r.listener.call(n, {
          type: e,
          payload: t
        }, n);
      }
    };
    this.listener = this.buildListener(e);
  }
  return e;
}();
var a = function () {
  function e(t, r) {
    e = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (e, t) {
      e.__proto__ = t;
    } || function (e, t) {
      for (var r in t) {
        if (Object.prototype.hasOwnProperty.call(t, r)) {
          e[r] = t[r];
        }
      }
    };
    return e(t, r);
  }
  return function (t, r) {
    if (typeof r !== "function" && r !== null) {
      throw new TypeError("Class extends value " + String(r) + " is not a constructor or null");
    }
    function n() {
      this.constructor = t;
    }
    e(t, r);
    t.prototype = r === null ? Object.create(r) : (n.prototype = r.prototype, new n());
  };
}();
var s = function (e) {
  function t(t) {
    var r = t === undefined ? {} : t;
    var n = r.lifecycles;
    var a = r.context;
    var s = e.call(this) || this;
    s.lifecycles = [];
    s.outerLifecycles = new Map();
    s.buildLifeCycles = function (e) {
      return e.reduce(function (e, t) {
        if (t instanceof o) {
          return e.concat(t);
        } else if ((0, i.H1)(t)) {
          return s.buildLifeCycles(t);
        } else if (typeof t === "object") {
          s.context = t;
          return e;
        } else {
          return e;
        }
      }, []);
    };
    s.addLifeCycles = function (e, t = []) {
      var r = s.buildLifeCycles(t);
      if (r.length) {
        s.outerLifecycles.set(e, r);
      }
    };
    s.hasLifeCycles = function (e) {
      return s.outerLifecycles.has(e);
    };
    s.removeLifeCycles = function (e) {
      s.outerLifecycles.delete(e);
    };
    s.setLifeCycles = function (e = []) {
      s.lifecycles = s.buildLifeCycles(e);
    };
    s.publish = function (e, t, r) {
      if ((0, i.d8)(e)) {
        s.lifecycles.forEach(function (n) {
          n.notify(e, t, r || s.context);
        });
        s.outerLifecycles.forEach(function (n) {
          n.forEach(function (n) {
            n.notify(e, t, r || s.context);
          });
        });
        s.notify({
          type: e,
          payload: t
        });
      }
    };
    s.clear = function () {
      s.lifecycles = [];
      s.outerLifecycles.clear();
      s.unsubscribe();
    };
    s.lifecycles = s.buildLifeCycles(n || []);
    s.context = a;
    return s;
  }
  a(t, e);
  return t;
}(i.lT);
var u = require("./87183.js");
function l(e) {
  return e instanceof nt;
}
function c(e) {
  return e instanceof Fe;
}
function p(e) {
  return e instanceof Fe || e instanceof et;
}
function d(e) {
  return e instanceof Ge;
}
function f(e) {
  return e instanceof Je;
}
function g(e) {
  return e instanceof et;
}
function m(e) {
  return !(0, i.LQ)(e?.initialize) && e?.displayName === "Form";
}
function v(e) {
  return !(0, i.LQ)(e?.initialize) && e?.displayName === "Field";
}
function y(e) {
  return !(0, i.LQ)(e?.initialize) && e?.displayName === "ArrayField";
}
function h(e) {
  return c(e) || d(e) || f(e);
}
function b(e) {
  return !(0, i.LQ)(e?.initialize) && e?.displayName === "ObjectField";
}
function w(e) {
  return e && e instanceof qe;
}
var x = function () {
  function e(e) {
    var t = this;
    this.getGraph = function () {
      var e = {};
      e[""] = t.form.getState();
      (0, i.S6)(t.form.fields, function (t, r) {
        e[r] = t.getState();
      });
      return e;
    };
    this.setGraph = function (e) {
      var r = t.form;
      function n(e, r) {
        var n = i.Dm.parse(e);
        var o = n.segments[n.segments.length - 1];
        var a = n.parent();
        if (v(r)) {
          return t.form.createField({
            name: o,
            basePath: a
          });
        } else if (y(r)) {
          return t.form.createArrayField({
            name: o,
            basePath: a
          });
        } else if (b(r)) {
          return t.form.createObjectField({
            name: o,
            basePath: a
          });
        } else {
          return t.form.createVoidField({
            name: o,
            basePath: a
          });
        }
      }
      (0, i.S6)(e, function (e, t) {
        if (m(e)) {
          r.setState(e);
        } else {
          var i = r.fields[t];
          if (i) {
            i.setState(e);
          } else {
            n(t, e).setState(e);
          }
        }
      });
    };
    this.form = e;
    (0, u.Ou)(this, {
      setGraph: u.dC
    });
  }
  return e;
}();
var E = require("./91273.js");
(function (e) {
  e.ON_FORM_INIT = "onFormInit";
  e.ON_FORM_MOUNT = "onFormMount";
  e.ON_FORM_UNMOUNT = "onFormUnmount";
  e.ON_FORM_INPUT_CHANGE = "onFormInputChange";
  e.ON_FORM_VALUES_CHANGE = "onFormValuesChange";
  e.ON_FORM_INITIAL_VALUES_CHANGE = "onFormInitialValuesChange";
  e.ON_FORM_SUBMIT = "onFormSubmit";
  e.ON_FORM_RESET = "onFormReset";
  e.ON_FORM_SUBMIT_START = "onFormSubmitStart";
  e.ON_FORM_SUBMITTING = "onFormSubmitting";
  e.ON_FORM_SUBMIT_END = "onFormSubmitEnd";
  e.ON_FORM_SUBMIT_VALIDATE_START = "onFormSubmitValidateStart";
  e.ON_FORM_SUBMIT_VALIDATE_SUCCESS = "onFormSubmitValidateSuccess";
  e.ON_FORM_SUBMIT_VALIDATE_FAILED = "onFormSubmitValidateFailed";
  e.ON_FORM_SUBMIT_VALIDATE_END = "onFormSubmitValidateEnd";
  e.ON_FORM_SUBMIT_SUCCESS = "onFormSubmitSuccess";
  e.ON_FORM_SUBMIT_FAILED = "onFormSubmitFailed";
  e.ON_FORM_VALIDATE_START = "onFormValidateStart";
  e.ON_FORM_VALIDATING = "onFormValidating";
  e.ON_FORM_VALIDATE_SUCCESS = "onFormValidateSuccess";
  e.ON_FORM_VALIDATE_FAILED = "onFormValidateFailed";
  e.ON_FORM_VALIDATE_END = "onFormValidateEnd";
  e.ON_FORM_GRAPH_CHANGE = "onFormGraphChange";
  e.ON_FORM_LOADING = "onFormLoading";
  e.ON_FIELD_INIT = "onFieldInit";
  e.ON_FIELD_INPUT_VALUE_CHANGE = "onFieldInputValueChange";
  e.ON_FIELD_VALUE_CHANGE = "onFieldValueChange";
  e.ON_FIELD_INITIAL_VALUE_CHANGE = "onFieldInitialValueChange";
  e.ON_FIELD_SUBMIT = "onFieldSubmit";
  e.ON_FIELD_SUBMIT_START = "onFieldSubmitStart";
  e.ON_FIELD_SUBMITTING = "onFieldSubmitting";
  e.ON_FIELD_SUBMIT_END = "onFieldSubmitEnd";
  e.ON_FIELD_SUBMIT_VALIDATE_START = "onFieldSubmitValidateStart";
  e.ON_FIELD_SUBMIT_VALIDATE_SUCCESS = "onFieldSubmitValidateSuccess";
  e.ON_FIELD_SUBMIT_VALIDATE_FAILED = "onFieldSubmitValidateFailed";
  e.ON_FIELD_SUBMIT_VALIDATE_END = "onFieldSubmitValidateEnd";
  e.ON_FIELD_SUBMIT_SUCCESS = "onFieldSubmitSuccess";
  e.ON_FIELD_SUBMIT_FAILED = "onFieldSubmitFailed";
  e.ON_FIELD_VALIDATE_START = "onFieldValidateStart";
  e.ON_FIELD_VALIDATING = "onFieldValidating";
  e.ON_FIELD_VALIDATE_SUCCESS = "onFieldValidateSuccess";
  e.ON_FIELD_VALIDATE_FAILED = "onFieldValidateFailed";
  e.ON_FIELD_VALIDATE_END = "onFieldValidateEnd";
  e.ON_FIELD_LOADING = "onFieldLoading";
  e.ON_FIELD_RESET = "onFieldReset";
  e.ON_FIELD_MOUNT = "onFieldMount";
  e.ON_FIELD_UNMOUNT = "onFieldUnmount";
})(n ||= {});
var k = {
  form: true,
  parent: true,
  props: true,
  caches: true,
  requests: true,
  disposers: true,
  heart: true,
  graph: true,
  indexes: true,
  fields: true,
  lifecycles: true,
  componentType: true,
  componentProps: true,
  decoratorType: true,
  decoratorProps: true
};
var S = {
  address: true,
  path: true,
  valid: true,
  invalid: true,
  selfValid: true,
  selfInvalid: true,
  errors: true,
  successes: true,
  warnings: true,
  validateStatus: true
};
var T = "selfDisplay";
var C = "selfPattern";
var A = {
  pattern: C,
  editable: C,
  readOnly: C,
  readPretty: C,
  disabled: C,
  display: T,
  hidden: T,
  visible: T
};
var _ = 100;
var O = {
  lifecycles: [],
  context: [],
  effectStart: false,
  effectEnd: false,
  initializing: false
};
var M = /^\.(\d+)/;
function P() {
  P = Object.assign || function (e) {
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
  return P.apply(this, arguments);
}
function q(e, t, r, n) {
  function i(e) {
    if (e instanceof r) {
      return e;
    } else {
      return new r(function (t) {
        t(e);
      });
    }
  }
  return new (r ||= Promise)(function (r, o) {
    function a(e) {
      try {
        u(n.next(e));
      } catch (t) {
        o(t);
      }
    }
    function s(e) {
      try {
        u(n.throw(e));
      } catch (t) {
        o(t);
      }
    }
    function u(e) {
      if (e.done) {
        r(e.value);
      } else {
        i(e.value).then(a, s);
      }
    }
    u((n = n.apply(e, t || [])).next());
  });
}
function N(e, t) {
  var r;
  var n;
  var i;
  var o;
  var a = {
    label: 0,
    sent: function () {
      if (i[0] & 1) {
        throw i[1];
      }
      return i[1];
    },
    trys: [],
    ops: []
  };
  o = {
    next: s(0),
    throw: s(1),
    return: s(2)
  };
  if (typeof Symbol === "function") {
    o[Symbol.iterator] = function () {
      return this;
    };
  }
  return o;
  function s(e) {
    return function (t) {
      return u([e, t]);
    };
  }
  function u(o) {
    if (r) {
      throw new TypeError("Generator is already executing.");
    }
    while (a) {
      try {
        r = 1;
        if (n && (i = o[0] & 2 ? n.return : o[0] ? n.throw || ((i = n.return) && i.call(n), 0) : n.next) && !(i = i.call(n, o[1])).done) {
          return i;
        }
        n = 0;
        if (i) {
          o = [o[0] & 2, i.value];
        }
        switch (o[0]) {
          case 0:
          case 1:
            i = o;
            break;
          case 4:
            a.label++;
            return {
              value: o[1],
              done: false
            };
          case 5:
            a.label++;
            n = o[1];
            o = [0];
            continue;
          case 7:
            o = a.ops.pop();
            a.trys.pop();
            continue;
          default:
            i = a.trys;
            if (!(i = i.length > 0 && i[i.length - 1]) && (o[0] === 6 || o[0] === 2)) {
              a = 0;
              continue;
            }
            if (o[0] === 3 && (!i || o[1] > i[0] && o[1] < i[3])) {
              a.label = o[1];
              break;
            }
            if (o[0] === 6 && a.label < i[1]) {
              a.label = i[1];
              i = o;
              break;
            }
            if (i && a.label < i[2]) {
              a.label = i[2];
              a.ops.push(o);
              break;
            }
            if (i[2]) {
              a.ops.pop();
            }
            a.trys.pop();
            continue;
        }
        o = t.call(e, a);
      } catch (s) {
        o = [6, s];
        n = 0;
      } finally {
        r = i = 0;
      }
    }
    if (o[0] & 5) {
      throw o[1];
    }
    return {
      value: o[0] ? o[1] : undefined,
      done: true
    };
  }
}
var R = Object.prototype.hasOwnProperty;
function I(e, t, r) {
  if (l(e)) {
    e.notify(t);
  } else {
    e.notify(r);
  }
}
function j(e, t) {
  var r;
  if (t === undefined) {
    t = true;
  }
  if (e?.target) {
    if (typeof e.target === "object" && ("value" in e.target || "checked" in e.target)) {
      return true;
    }
    if (t) {
      if ((r = e.stopPropagation) !== null && r !== undefined) {
        r.call(e);
      }
    }
  }
  return false;
}
function D(e) {
  return e.map(function (e) {
    if (e?.target) {
      if ((0, i.JY)(e.target.value)) {
        return e.target.value;
      } else if ((0, i.JY)(e.target.checked)) {
        return e.target.checked;
      } else {
        return undefined;
      }
    } else {
      return e;
    }
  });
}
function L(e) {
  if (d(e)) {
    return [];
  } else if (f(e)) {
    return {};
  } else {
    return undefined;
  }
}
function F(e) {
  return Z(e.form.fields, e.address);
}
function Z(e, t) {
  var r = false;
  var n = t.segments;
  var o = n.reduce(function (t, o, a) {
    var s = t.concat(o);
    var u = n.slice(0, a + 1);
    var l = e[u.join(".")];
    if (r) {
      if (!g(l)) {
        r = false;
      }
      return t;
    }
    if (a >= n.length - 1) {
      return s;
    }
    if (g(l)) {
      var c = n.slice(0, a);
      var p = e[c.join(".")];
      if (d(p) && (0, i.sI)(o)) {
        r = true;
        return s;
      } else {
        return t;
      }
    }
    r = false;
    return s;
  }, []);
  return new i.Dm(o);
}
function z(e, t) {
  e.address = i.Dm.parse(t);
  e.path = F(e);
  e.form.indexes[e.path.toString()] = e.address.toString();
  return e;
}
function U(e, t) {
  t.forEach(function (t) {
    var r = t.type;
    var n = t.address;
    var i = t.oldAddress;
    var o = t.payload;
    if (r === "remove") {
      B(e, n, false);
    } else if (r === "update") {
      if (o) {
        e[n] = o;
        if (e[i] === o) {
          e[i] = undefined;
        }
      }
      if (n && o) {
        z(o, n);
      }
    }
  });
}
function B(e, t, r = true) {
  var n = e[t];
  if (n !== null && n !== undefined) {
    n.dispose();
  }
  if (h(n) && r) {
    var i = n.form;
    var o = n.path;
    i.deleteValuesIn(o);
    i.deleteInitialValuesIn(o);
  }
  delete e[t];
}
function V(e, t, r) {
  function n(t, r) {
    if (t.length) {
      e.setValuesIn(t, (0, i.d9)(r));
    } else {
      Object.assign(e.values, (0, i.d9)(r));
    }
  }
  function o(t, r = []) {
    var a = e.getValuesIn(r);
    var s = e.query(r).take();
    var u = s && !g(s);
    if (u && s.display === "none") {
      s.caches.value = (0, i.d9)(t);
    } else if (ke(a, t)) {
      n(r, t);
    } else {
      if ((0, i.xb)(t)) {
        return;
      }
      if (O.initializing) {
        return;
      }
      if ((0, i.Uk)(a) && (0, i.Uk)(t)) {
        (0, i.S6)(t, function (e, t) {
          o(e, r.concat(t));
        });
      } else if (s) {
        if (u && !s.selfModified) {
          n(r, t);
        }
      } else if (e.initialized) {
        n(r, t);
      }
    }
  }
  o(r, t);
}
function H(e, t) {
  return !!e && !!t && (!e.type || e.type === t.type) && (!e.code || e.code === t.code) && (!e.path || !t.path || !!i.Dm.parse(e.path).match(t.path)) && (!e.address || !t.address || !!i.Dm.parse(e.address).match(t.address)) && (!e.triggerType || e.triggerType === t.triggerType);
}
function W(e, t) {
  return e.feedbacks.filter(function (r) {
    var i;
    var o;
    return !!r.messages?.length && H(t, P(P({}, r), {
      address: (i = e.address) === null || i === undefined ? undefined : i.toString(),
      path: (o = e.path) === null || o === undefined ? undefined : o.toString()
    }));
  });
}
function Y(e, t) {
  if (e.feedbacks.length) {
    return W(e, t).reduce(function (e, t) {
      if ((0, i.xb)(t.messages)) {
        return e;
      } else {
        return e.concat(t.messages);
      }
    }, []);
  } else {
    return [];
  }
}
function Q(e, t) {
  if (t) {
    return (0, u.dC)(function () {
      if (e.feedbacks.length) {
        var i = W(e, t);
        if (i.length) {
          e.feedbacks = e.feedbacks.reduce(function (e, r) {
            if (i.includes(r)) {
              if (t.messages?.length) {
                r.messages = t.messages;
                return e.concat(r);
              } else {
                return e;
              }
            } else {
              return e.concat(r);
            }
          }, []);
          return;
        }
        if (t.messages?.length) {
          e.feedbacks = e.feedbacks.concat(t);
        }
      } else {
        if (!t.messages?.length) {
          return;
        }
        e.feedbacks = [t];
      }
    });
  }
}
function $(e, t = "onInput") {
  return q(undefined, undefined, undefined, function () {
    var r;
    return N(this, function (o) {
      switch (o.label) {
        case 0:
          return [4, (0, E.Gu)(e.value, e.validator, {
            triggerType: t,
            validateFirst: e.props.validateFirst ?? e.form.props.validateFirst,
            context: {
              field: e,
              form: e.form
            }
          })];
        case 1:
          r = o.sent();
          (0, u.dC)(function () {
            (0, i.S6)(r, function (r, n) {
              e.setFeedback({
                triggerType: t,
                type: n,
                code: (0, i.Ho)(`validate-${n}`),
                messages: r
              });
            });
          });
          return [2, r];
      }
    });
  });
}
function G(e, t, r) {
  var n;
  if ((0, i.JY)(r)) {
    var o = (0, E.oM)(e.validator);
    var a = o.some(function (e) {
      return t in e;
    });
    n = {};
    n[t] = r;
    var s = n;
    e.validator = a ? o.map(function (e) {
      if ((0, i.Uk)(e) && R.call(e, t)) {
        e[t] = r;
        return e;
      } else {
        return e;
      }
    }) : t === "required" ? [s].concat(o) : o.concat(s);
  }
}
function K(e, t) {
  var r = P({
    startIndex: 0,
    deleteCount: 0,
    insertCount: 0
  }, t);
  var o = r.startIndex;
  var a = r.deleteCount;
  var s = r.insertCount;
  var l = e.address.toString();
  var c = l.length;
  var p = e.form;
  var d = p.fields;
  var f = [];
  var g = s - a;
  function m(e) {
    return e.indexOf(l) === 0 && e.length > c;
  }
  function v(e) {
    var r = e.substring(c);
    var n = r.match(M)?.[1];
    if (n === undefined) {
      return false;
    }
    var i = Number(n);
    return i > o + a - 1;
  }
  function y(e) {
    var r = e.substring(c);
    var n = r.match(M)?.[1];
    if (n === undefined) {
      return false;
    }
    var i = Number(n);
    return i >= o && i < o + s;
  }
  function h(e) {
    var r = e.substring(0, c);
    var n = e.substring(c);
    var i = n.match(M)?.[1];
    if (i === undefined) {
      return false;
    }
    var s = Number(i);
    return s > o && !d[`${r}${n.replace(/^\.\d+/, `.${s + a}`)}`] || s === o;
  }
  function b(e) {
    if (g === 0) {
      return e;
    }
    var r = e.substring(0, c);
    var n = e.substring(c);
    var i = n.match(M)?.[1];
    if (i === undefined) {
      return e;
    }
    var o = Number(i) + g;
    return `${r}${n.replace(/^\.\d+/, `.${o}`)}`;
  }
  (0, u.dC)(function () {
    (0, i.S6)(d, function (e, t) {
      if (m(t)) {
        if (v(t)) {
          var r = b(t);
          f.push({
            type: "update",
            address: r,
            oldAddress: t,
            payload: e
          });
        }
        if (y(t) || h(t)) {
          f.push({
            type: "remove",
            address: t
          });
        }
      }
    });
    U(d, f);
  });
  e.form.notify(n.ON_FORM_GRAPH_CHANGE);
}
function J(e, t) {
  var r = P({
    fromIndex: 0,
    toIndex: 0
  }, t);
  var o = r.fromIndex;
  var a = r.toIndex;
  var s = e.address.toString();
  var l = e.form.fields;
  var c = s.length;
  var p = [];
  function d(e) {
    return e.indexOf(s) === 0 && e.length > c;
  }
  var f = o < a;
  function g(e) {
    var r = e.slice(s.length);
    var n = r.match(M)?.[1];
    if (n === undefined) {
      return false;
    }
    var i = Number(n);
    if (f) {
      return i > o && i <= a;
    } else {
      return i < o && i >= a;
    }
  }
  function m(e) {
    var r = e.substring(c);
    var n = r.match(M)?.[1];
    if (n === undefined) {
      return false;
    }
    var i = Number(n);
    return i === o;
  }
  function v(e) {
    var t = e.substring(0, c);
    var r = e.substring(c);
    var n = r.match(M)[1];
    var i = Number(n);
    var s = i;
    if (s === o) {
      s = a;
    } else {
      s += f ? -1 : 1;
    }
    return `${t}${r.replace(/^\.\d+/, `.${s}`)}`;
  }
  (0, u.dC)(function () {
    (0, i.S6)(l, function (e, t) {
      if (d(t) && (g(t) || m(t))) {
        var r = v(t);
        p.push({
          type: "update",
          address: r,
          oldAddress: t,
          payload: e
        });
        if (!l[r]) {
          p.push({
            type: "remove",
            address: t
          });
        }
      }
    });
    U(l, p);
  });
  e.form.notify(n.ON_FORM_GRAPH_CHANGE);
}
function X(e, t) {
  var r = e.address.toString();
  var n = e.form.fields;
  function o(e) {
    return e.indexOf(r) === 0 && e.length > r.length;
  }
  function a(e) {
    var i = e.slice(r.length);
    var o = i.match(M)?.[1];
    if (o === undefined) {
      return false;
    }
    var a = Number(o);
    return a >= t;
  }
  (0, u.dC)(function () {
    (0, i.S6)(n, function (e, t) {
      if (o(t) && a(t)) {
        e.destroy();
      }
    });
  });
}
function ee(e, t) {
  if (t.length !== 0) {
    var r = e.address.toString();
    var n = e.form.fields;
    function o(e) {
      return e.indexOf(r) === 0 && e.length > r.length;
    }
    function a(e) {
      var i = e.slice(r.length);
      var o = i.match(/^\.([^.]+)/)?.[1];
      return o !== undefined && t.includes(o);
    }
    (0, u.dC)(function () {
      (0, i.S6)(n, function (e, t) {
        if (o(t) && a(t)) {
          e.destroy();
        }
      });
    });
  }
}
var te = u.dC.scope.bound(function (e) {
  var t = e.form;
  for (var r = i.Dm.ensureIn(t, "requests.updates", []), n = i.Dm.ensureIn(t, "requests.updateIndexes", {}), o = 0; o < r.length; o++) {
    var a = r[o];
    var s = a.pattern;
    var u = a.callbacks;
    var l = false;
    if (e.match(s)) {
      u.forEach(function (t) {
        e.setState(t);
      });
      if (!s.isWildMatchPattern && !s.isMatchPattern) {
        r.splice(o--, 1);
        l = true;
      }
    }
    if (l) {
      delete n[s.toString()];
    } else {
      n[s.toString()] = o;
    }
  }
});
function re(e, t, r) {
  var n = i.Dm.ensureIn(e, "requests.updates", []);
  var o = i.Dm.ensureIn(e, "requests.updateIndexes", {});
  var a = t.toString();
  var s = o[a];
  if ((0, i.JY)(s)) {
    if (n[s] && !n[s].callbacks.some(function (e) {
      return e.toString() === r.toString() && e === r;
    })) {
      n[s].callbacks.push(r);
    }
  } else {
    o[a] = n.length;
    n.push({
      pattern: t,
      callbacks: [r]
    });
  }
}
function ne(e, t) {
  if (e) {
    if ((0, i.LQ)(t)) {
      t(e);
    } else {
      for (var r in t) {
        if (R.call(t, r) && !S[r] && !k[r]) {
          var n = A[r];
          if (!n || !R.call(t, n) || (0, i.JY)(t[n])) {
            var o = t[r];
            if (!(0, i.LQ)(o)) {
              e[r] = o;
            }
          }
        }
      }
    }
    return e;
  }
}
function ie(e, t) {
  if ((0, i.LQ)(t)) {
    return t(e);
  }
  var r = {};
  for (var n in e) {
    if (R.call(e, n) && !k[n]) {
      if (n !== "address" && n !== "path") {
        var o = e[n];
        if (!(0, i.LQ)(o)) {
          r[n] = (0, u.ZN)(o);
        }
      } else {
        r[n] = e[n].toString();
      }
    }
  }
  return r;
}
function oe(e) {
  var t;
  var r = (t = e.address) === null || t === undefined ? undefined : t.toString();
  return function (e) {
    var t = e.address;
    return t === r || t.indexOf(r + ".") === 0;
  };
}
function ae(e) {
  return u.dC.bound(function (t) {
    return ne(e, t);
  });
}
function se(e) {
  return function (t) {
    return ie(e, t);
  };
}
function ue(e) {
  return u.dC.bound(function (t, r) {
    if (w(t)) {
      t.forEach(function (e) {
        e.setState(r);
      });
    } else if (p(t)) {
      t.setState(r);
    } else {
      var n = 0;
      var o = i.Dm.parse(t);
      e.query(o).forEach(function (e) {
        e.setState(r);
        n++;
      });
      if (n === 0 || o.isWildMatchPattern) {
        re(e, o, r);
      }
    }
  });
}
function le(e) {
  return function (t, r) {
    if (w(t)) {
      return t.take(r);
    } else if (p(t)) {
      return t.getState(r);
    } else {
      return e.query(t).take(function (e) {
        return e.getState(r);
      });
    }
  };
}
function ce(e, t) {
  if (!Array.isArray(t.object) || t.key !== "length") {
    if ((0, u.r3)(e.initialValues, t.object) || e.initialValues === t.value) {
      if (t.type === "add" || t.type === "set") {
        V(e, t.path.slice(1), t.value);
      }
      if (e.initialized) {
        e.notify(n.ON_FORM_INITIAL_VALUES_CHANGE);
      }
    }
  }
}
function pe(e, t) {
  if (!Array.isArray(t.object) || t.key !== "length") {
    if (((0, u.r3)(e.values, t.object) || e.values === t.value) && e.initialized) {
      e.notify(n.ON_FORM_VALUES_CHANGE);
    }
  }
}
function de(e, t) {
  clearTimeout(e.requests.validate);
  if (t) {
    e.requests.validate = setTimeout(function () {
      (0, u.dC)(function () {
        e.validating = t;
        I(e, n.ON_FORM_VALIDATING, n.ON_FIELD_VALIDATING);
      });
    }, _);
    I(e, n.ON_FORM_VALIDATE_START, n.ON_FIELD_VALIDATE_START);
  } else {
    if (e.validating !== t) {
      e.validating = t;
    }
    I(e, n.ON_FORM_VALIDATE_END, n.ON_FIELD_VALIDATE_END);
  }
}
function fe(e, t) {
  clearTimeout(e.requests.submit);
  if (t) {
    e.requests.submit = setTimeout(function () {
      (0, u.dC)(function () {
        e.submitting = t;
        I(e, n.ON_FORM_SUBMITTING, n.ON_FIELD_SUBMITTING);
      });
    }, _);
    I(e, n.ON_FORM_SUBMIT_START, n.ON_FIELD_SUBMIT_START);
  } else {
    if (e.submitting !== t) {
      e.submitting = t;
    }
    I(e, n.ON_FORM_SUBMIT_END, n.ON_FIELD_SUBMIT_END);
  }
}
function ge(e, t) {
  clearTimeout(e.requests.loading);
  if (t) {
    e.requests.loading = setTimeout(function () {
      (0, u.dC)(function () {
        e.loading = t;
        I(e, n.ON_FORM_LOADING, n.ON_FIELD_LOADING);
      });
    }, _);
  } else if (e.loading !== t) {
    e.loading = t;
  }
}
function me(e, t) {
  return q(undefined, undefined, undefined, function () {
    var r;
    var o;
    var a;
    return N(this, function (s) {
      switch (s.label) {
        case 0:
          r = function (e) {
            if (l(e)) {
              return (0, u.ZN)(e.values);
            } else {
              return (0, u.ZN)(e.value);
            }
          };
          e.setSubmitting(true);
          s.label = 1;
        case 1:
          s.trys.push([1, 3,, 4]);
          I(e, n.ON_FORM_SUBMIT_VALIDATE_START, n.ON_FIELD_SUBMIT_VALIDATE_START);
          return [4, e.validate()];
        case 2:
          s.sent();
          I(e, n.ON_FORM_SUBMIT_VALIDATE_SUCCESS, n.ON_FIELD_SUBMIT_VALIDATE_SUCCESS);
          return [3, 4];
        case 3:
          s.sent();
          I(e, n.ON_FORM_SUBMIT_VALIDATE_FAILED, n.ON_FIELD_SUBMIT_VALIDATE_FAILED);
          return [3, 4];
        case 4:
          I(e, n.ON_FORM_SUBMIT_VALIDATE_END, n.ON_FIELD_SUBMIT_VALIDATE_END);
          s.label = 5;
        case 5:
          s.trys.push([5, 9,, 10]);
          if (e.invalid) {
            throw e.errors;
          }
          if ((0, i.LQ)(t)) {
            return [4, t(r(e))];
          } else {
            return [3, 7];
          }
        case 6:
          o = s.sent();
          return [3, 8];
        case 7:
          o = r(e);
          s.label = 8;
        case 8:
          I(e, n.ON_FORM_SUBMIT_SUCCESS, n.ON_FIELD_SUBMIT_SUCCESS);
          return [3, 10];
        case 9:
          a = s.sent();
          e.setSubmitting(false);
          I(e, n.ON_FORM_SUBMIT_FAILED, n.ON_FIELD_SUBMIT_FAILED);
          I(e, n.ON_FORM_SUBMIT, n.ON_FIELD_SUBMIT);
          throw a;
        case 10:
          e.setSubmitting(false);
          I(e, n.ON_FORM_SUBMIT, n.ON_FIELD_SUBMIT);
          return [2, o];
      }
    });
  });
}
function ve(e, t, r) {
  return q(undefined, undefined, undefined, function () {
    var i;
    return N(this, function (o) {
      switch (o.label) {
        case 0:
          if (l(e)) {
            e.setValidating(true);
          } else if (e.pattern !== "editable" || e.display !== "visible") {
            return [2];
          }
          i = [];
          e.query(t).forEach(function (t) {
            if (!g(t)) {
              i.push(he(t, r, t === e));
            }
          });
          return [4, Promise.all(i)];
        case 1:
          o.sent();
          if (l(e)) {
            e.setValidating(false);
          }
          if (e.invalid) {
            I(e, n.ON_FORM_VALIDATE_FAILED, n.ON_FIELD_VALIDATE_FAILED);
            throw e.errors;
          }
          I(e, n.ON_FORM_VALIDATE_SUCCESS, n.ON_FIELD_VALIDATE_SUCCESS);
          return [2];
      }
    });
  });
}
function ye(e, t, r) {
  return q(undefined, undefined, undefined, function () {
    var i;
    return N(this, function (o) {
      switch (o.label) {
        case 0:
          i = [];
          e.query(t).forEach(function (t) {
            if (!g(t)) {
              i.push(be(t, r, e === t));
            }
          });
          if (l(e)) {
            e.modified = false;
          }
          I(e, n.ON_FORM_RESET, n.ON_FIELD_RESET);
          return [4, Promise.all(i)];
        case 1:
          o.sent();
          return [2];
      }
    });
  });
}
var he = u.dC.bound(function (e, t, r = false) {
  return q(undefined, undefined, undefined, function () {
    var o;
    var a;
    var s;
    var u;
    var l;
    var c;
    var p;
    return N(this, function (d) {
      switch (d.label) {
        case 0:
          o = function () {
            de(e, true);
          };
          a = function () {
            de(e, false);
            if (!r) {
              if (e.selfValid) {
                e.notify(n.ON_FIELD_VALIDATE_SUCCESS);
              } else {
                e.notify(n.ON_FIELD_VALIDATE_FAILED);
              }
            }
          };
          if (e.pattern !== "editable" || e.display !== "visible") {
            return [2, {}];
          }
          o();
          if (t) {
            return [3, 5];
          }
          s = (0, E.oM)(e.validator).reduce(function (e, t) {
            if (e.indexOf(t.triggerType) > -1) {
              return e;
            } else {
              return e.concat(t.triggerType);
            }
          }, []);
          u = {};
          l = 0;
          d.label = 1;
        case 1:
          if (l < s.length) {
            return [4, $(e, s[l])];
          } else {
            return [3, 4];
          }
        case 2:
          c = d.sent();
          (0, i.S6)(c, function (e, t) {
            u[t] = u[t] || [];
            u[t] = u[t].concat(e);
          });
          d.label = 3;
        case 3:
          l++;
          return [3, 1];
        case 4:
          a();
          return [2, u];
        case 5:
          return [4, $(e, t)];
        case 6:
          p = d.sent();
          a();
          return [2, p];
      }
    });
  });
});
var be = u.dC.bound(function (e, t, r = false) {
  return q(undefined, undefined, undefined, function () {
    var o;
    var a;
    return N(this, function (s) {
      switch (s.label) {
        case 0:
          o = L(e);
          e.modified = false;
          e.selfModified = false;
          e.visited = false;
          e.feedbacks = [];
          e.inputValue = o;
          e.inputValues = [];
          e.caches = {};
          if (!(0, i.G7)(e.value)) {
            if (t?.forceClear) {
              e.value = o;
            } else {
              a = e.initialValue;
              e.value = (0, u.ZN)((0, i.G7)(a) ? o : a);
            }
          }
          if (!r) {
            e.notify(n.ON_FIELD_RESET);
          }
          if (t?.validate) {
            return [4, he(e)];
          } else {
            return [3, 2];
          }
        case 1:
          return [2, s.sent()];
        case 2:
          return [2];
      }
    });
  });
});
function we(e) {
  if (!e.selfModified) {
    e.selfModified = true;
    e.modified = true;
    var t = e.parent;
    while (t) {
      if (h(t)) {
        if (t.modified) {
          return;
        }
        t.modified = true;
      }
      t = t.parent;
    }
    e.form.modified = true;
  }
}
function xe(e) {
  if ((0, u.bi)(e)) {
    return e;
  } else {
    return (0, i.d9)(e || {});
  }
}
function Ee(e, t) {
  if (ke(e, t)) {
    return (0, i.d9)(t);
  } else {
    return e;
  }
}
function ke(e, t) {
  var r = !(0, i.G7)(e);
  var n = !(0, i.G7)(t);
  if (!r) {
    return n;
  }
  if (typeof e === typeof t) {
    if (e === "") {
      return false;
    }
    if (e === 0) {
      return false;
    }
  }
  var o = e !== null && (0, i.xb)(e, true);
  var a = t !== null && (0, i.xb)(t, true);
  return !!o && !a;
}
function Se(e) {
  var t = (0, i._K)(e.props.reactions);
  e.form.addEffects(e, function () {
    t.forEach(function (t) {
      if ((0, i.LQ)(t)) {
        e.disposers.push((0, u.EH)(u.dC.scope.bound(function () {
          if (!e.destroyed) {
            t(e);
          }
        })));
      }
    });
  });
}
function Te(e, t) {
  return (0, u.U5)(e, u.rg.bound(t));
}
function Ce() {
  O.initializing = true;
}
function Ae() {
  u.dC.endpoint(function () {
    O.initializing = false;
  });
}
function _e(e, t = e.index) {
  if (t > -1) {
    var r = e.parent;
    while (r) {
      if (d(r)) {
        return r;
      }
      if (r === e.form) {
        return;
      }
      r = r.parent;
    }
  }
}
function Oe(e) {
  var t = e.parent;
  while (t) {
    if (d(t)) {
      return;
    }
    if (f(t)) {
      return t;
    }
    if (t === e.form) {
      return;
    }
    t = t.parent;
  }
}
function Me(e, t) {
  if (e) {
    if ((0, i.LQ)(t)) {
      return t(e, e.address);
    } else {
      return e;
    }
  }
}
function Pe(e, t) {
  var r = t.toString();
  var n = e.indexes[r];
  var i = e.fields[r];
  var o = e.fields[n];
  if (i) {
    return r;
  } else if (o) {
    return n;
  } else {
    return undefined;
  }
}
var qe = function () {
  function e(e) {
    var t = this;
    this.addresses = [];
    this.pattern = i.Dm.parse(e.pattern, e.base);
    this.form = e.form;
    if (this.pattern.isMatchPattern) {
      (0, i.S6)(this.form.fields, function (e, r) {
        if (e) {
          if (e.match(t.pattern)) {
            t.addresses.push(r);
          }
        } else {
          delete t.form.fields[r];
        }
      });
    } else {
      var r = Pe(this.form, this.pattern.haveRelativePattern ? Z(e.form.fields, this.pattern) : this.pattern);
      if (r) {
        this.addresses = [r];
      }
    }
  }
  e.prototype.take = function (e) {
    return Me(this.form.fields[this.addresses[0]], e);
  };
  e.prototype.map = function (e) {
    var t = this;
    return this.addresses.map(function (r) {
      return Me(t.form.fields[r], e);
    });
  };
  e.prototype.forEach = function (e) {
    var t = this;
    return this.addresses.forEach(function (r) {
      return Me(t.form.fields[r], e);
    });
  };
  e.prototype.reduce = function (e, t) {
    var r = this;
    return this.addresses.reduce(function (t, n) {
      return Me(r.form.fields[n], function (r, n) {
        return e(t, r, n);
      });
    }, t);
  };
  e.prototype.get = function (e) {
    var t = this.take();
    if (t) {
      return t[e];
    }
  };
  e.prototype.getIn = function (e) {
    return i.Dm.getIn(this.take(), e);
  };
  e.prototype.value = function () {
    return this.get("value");
  };
  e.prototype.initialValue = function () {
    return this.get("initialValue");
  };
  return e;
}();
function Ne(e, t) {
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
function Re(e, t, r) {
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
var Ie = function () {
  function e() {
    var e = this;
    this.disposers = [];
    this.actions = {};
    this.setTitle = function (t) {
      e.title = t;
    };
    this.setDescription = function (t) {
      e.description = t;
    };
    this.setDisplay = function (t) {
      e.display = t;
    };
    this.setPattern = function (t) {
      e.pattern = t;
    };
    this.setComponent = function (t, r) {
      if (t) {
        e.componentType = t;
      }
      if (r) {
        e.componentProps = e.componentProps || {};
        Object.assign(e.componentProps, r);
      }
    };
    this.setComponentProps = function (t) {
      if (t) {
        e.componentProps = e.componentProps || {};
        Object.assign(e.componentProps, t);
      }
    };
    this.setDecorator = function (t, r) {
      if (t) {
        e.decoratorType = t;
      }
      if (r) {
        e.decoratorProps = e.decoratorProps || {};
        Object.assign(e.decoratorProps, r);
      }
    };
    this.setDecoratorProps = function (t) {
      if (t) {
        e.decoratorProps = e.decoratorProps || {};
        Object.assign(e.decoratorProps, t);
      }
    };
    this.setData = function (t) {
      e.data = t;
    };
    this.setContent = function (t) {
      e.content = t;
    };
    this.onInit = function () {
      e.initialized = true;
      te(e);
      e.notify(n.ON_FIELD_INIT);
    };
    this.onMount = function () {
      e.mounted = true;
      e.unmounted = false;
      e.notify(n.ON_FIELD_MOUNT);
    };
    this.onUnmount = function () {
      e.mounted = false;
      e.unmounted = true;
      e.notify(n.ON_FIELD_UNMOUNT);
    };
    this.query = function (t) {
      return new qe({
        pattern: t,
        base: e.address,
        form: e.form
      });
    };
    this.notify = function (t, r) {
      return e.form.notify(t, r ?? e);
    };
    this.dispose = function () {
      e.disposers.forEach(function (e) {
        e();
      });
      e.form.removeEffects(e);
    };
    this.destroy = function (t = true) {
      B(e.form.fields, e.address.toString(), t);
    };
    this.match = function (t) {
      return i.Dm.parse(t).matchAliasGroup(e.address, e.path);
    };
    this.inject = function (t) {
      (0, i.S6)(t, function (t, r) {
        if ((0, i.LQ)(t)) {
          e.actions[r] = t;
        }
      });
    };
    this.invoke = function (t) {
      var r;
      var n;
      var i = [];
      for (var o = 1; o < arguments.length; o++) {
        i[o - 1] = arguments[o];
      }
      if ((n = (r = e.actions)[t]) === null || n === undefined) {
        return undefined;
      } else {
        return n.call.apply(n, Re([r], Ne(i), false));
      }
    };
  }
  e.prototype.locate = function (e) {
    this.form.fields[e.toString()] = this;
    z(this, e);
  };
  Object.defineProperty(e.prototype, "indexes", {
    get: function () {
      return this.path.transform(/^\d+$/, function () {
        var e = [];
        for (var t = 0; t < arguments.length; t++) {
          e[t] = arguments[t];
        }
        return e.map(function (e) {
          return Number(e);
        });
      });
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "index", {
    get: function () {
      return this.indexes[this.indexes.length - 1] ?? -1;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "records", {
    get: function () {
      var e = _e(this);
      return e?.value;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "record", {
    get: function () {
      var t = Oe(this);
      if (t) {
        return t.value;
      }
      var r = this.index;
      var n = _e(this, r);
      if (n) {
        return n.value?.[r];
      } else {
        return this.form.values;
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "component", {
    get: function () {
      return [this.componentType, this.componentProps];
    },
    set: function (e) {
      var t = (0, i._K)(e);
      this.componentType = t[0];
      this.componentProps = t[1] || {};
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "decorator", {
    get: function () {
      return [this.decoratorType, this.decoratorProps];
    },
    set: function (e) {
      var t = (0, i._K)(e);
      this.decoratorType = t[0];
      this.decoratorProps = t[1] || {};
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "parent", {
    get: function () {
      var e = this.address.parent();
      var t = e.toString();
      while (!this.form.fields[t]) {
        e = e.parent();
        t = e.toString();
        if (!t) {
          return;
        }
      }
      return this.form.fields[t];
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "display", {
    get: function () {
      var t = this.parent?.display;
      if (t && t !== "visible") {
        if (this.selfDisplay && this.selfDisplay !== "visible") {
          return this.selfDisplay;
        } else {
          return t;
        }
      } else if ((0, i.JY)(this.selfDisplay)) {
        return this.selfDisplay;
      } else {
        return t || this.form.display || "visible";
      }
    },
    set: function (e) {
      this.selfDisplay = e;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "pattern", {
    get: function () {
      var t = this.parent?.pattern || this.form.pattern || "editable";
      var r = this.selfPattern;
      if ((0, i.JY)(r)) {
        if (t === "readPretty" && r !== "editable") {
          return t;
        } else {
          return r;
        }
      } else {
        return t;
      }
    },
    set: function (e) {
      this.selfPattern = e;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "editable", {
    get: function () {
      return this.pattern === "editable";
    },
    set: function (e) {
      if ((0, i.JY)(e)) {
        this.pattern = e ? "editable" : "readPretty";
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "disabled", {
    get: function () {
      return this.pattern === "disabled";
    },
    set: function (e) {
      if ((0, i.JY)(e)) {
        this.pattern = e ? "disabled" : "editable";
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "readOnly", {
    get: function () {
      return this.pattern === "readOnly";
    },
    set: function (e) {
      if ((0, i.JY)(e)) {
        this.pattern = e ? "readOnly" : "editable";
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "readPretty", {
    get: function () {
      return this.pattern === "readPretty";
    },
    set: function (e) {
      if ((0, i.JY)(e)) {
        this.pattern = e ? "readPretty" : "editable";
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "hidden", {
    get: function () {
      return this.display === "hidden";
    },
    set: function (e) {
      if ((0, i.JY)(e)) {
        this.display = e ? "hidden" : "visible";
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "visible", {
    get: function () {
      return this.display === "visible";
    },
    set: function (e) {
      if ((0, i.JY)(e)) {
        this.display = e ? "visible" : "none";
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "destroyed", {
    get: function () {
      return !this.form.fields[this.address.toString()];
    },
    enumerable: false,
    configurable: true
  });
  return e;
}();
var je = function () {
  function e(t, r) {
    e = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (e, t) {
      e.__proto__ = t;
    } || function (e, t) {
      for (var r in t) {
        if (Object.prototype.hasOwnProperty.call(t, r)) {
          e[r] = t[r];
        }
      }
    };
    return e(t, r);
  }
  return function (t, r) {
    if (typeof r !== "function" && r !== null) {
      throw new TypeError("Class extends value " + String(r) + " is not a constructor or null");
    }
    function n() {
      this.constructor = t;
    }
    e(t, r);
    t.prototype = r === null ? Object.create(r) : (n.prototype = r.prototype, new n());
  };
}();
function De(e, t, r, n) {
  function i(e) {
    if (e instanceof r) {
      return e;
    } else {
      return new r(function (t) {
        t(e);
      });
    }
  }
  return new (r ||= Promise)(function (r, o) {
    function a(e) {
      try {
        u(n.next(e));
      } catch (t) {
        o(t);
      }
    }
    function s(e) {
      try {
        u(n.throw(e));
      } catch (t) {
        o(t);
      }
    }
    function u(e) {
      if (e.done) {
        r(e.value);
      } else {
        i(e.value).then(a, s);
      }
    }
    u((n = n.apply(e, t || [])).next());
  });
}
function Le(e, t) {
  var r;
  var n;
  var i;
  var o;
  var a = {
    label: 0,
    sent: function () {
      if (i[0] & 1) {
        throw i[1];
      }
      return i[1];
    },
    trys: [],
    ops: []
  };
  o = {
    next: s(0),
    throw: s(1),
    return: s(2)
  };
  if (typeof Symbol === "function") {
    o[Symbol.iterator] = function () {
      return this;
    };
  }
  return o;
  function s(e) {
    return function (t) {
      return u([e, t]);
    };
  }
  function u(o) {
    if (r) {
      throw new TypeError("Generator is already executing.");
    }
    while (a) {
      try {
        r = 1;
        if (n && (i = o[0] & 2 ? n.return : o[0] ? n.throw || ((i = n.return) && i.call(n), 0) : n.next) && !(i = i.call(n, o[1])).done) {
          return i;
        }
        n = 0;
        if (i) {
          o = [o[0] & 2, i.value];
        }
        switch (o[0]) {
          case 0:
          case 1:
            i = o;
            break;
          case 4:
            a.label++;
            return {
              value: o[1],
              done: false
            };
          case 5:
            a.label++;
            n = o[1];
            o = [0];
            continue;
          case 7:
            o = a.ops.pop();
            a.trys.pop();
            continue;
          default:
            i = a.trys;
            if (!(i = i.length > 0 && i[i.length - 1]) && (o[0] === 6 || o[0] === 2)) {
              a = 0;
              continue;
            }
            if (o[0] === 3 && (!i || o[1] > i[0] && o[1] < i[3])) {
              a.label = o[1];
              break;
            }
            if (o[0] === 6 && a.label < i[1]) {
              a.label = i[1];
              i = o;
              break;
            }
            if (i && a.label < i[2]) {
              a.label = i[2];
              a.ops.push(o);
              break;
            }
            if (i[2]) {
              a.ops.pop();
            }
            a.trys.pop();
            continue;
        }
        o = t.call(e, a);
      } catch (s) {
        o = [6, s];
        n = 0;
      } finally {
        r = i = 0;
      }
    }
    if (o[0] & 5) {
      throw o[1];
    }
    return {
      value: o[0] ? o[1] : undefined,
      done: true
    };
  }
}
var Fe = function (e) {
  function t(t, r, i, o) {
    var a = e.call(this) || this;
    a.displayName = "Field";
    a.caches = {};
    a.requests = {};
    a.setDataSource = function (e) {
      a.dataSource = e;
    };
    a.setFeedback = function (e) {
      Q(a, e);
    };
    a.setSelfErrors = function (e) {
      a.selfErrors = e;
    };
    a.setSelfWarnings = function (e) {
      a.selfWarnings = e;
    };
    a.setSelfSuccesses = function (e) {
      a.selfSuccesses = e;
    };
    a.setValidator = function (e) {
      a.validator = e;
    };
    a.setValidatorRule = function (e, t) {
      G(a, e, t);
    };
    a.setRequired = function (e) {
      a.required = e;
    };
    a.setValue = function (e) {
      if (!a.destroyed) {
        if (!a.initialized) {
          if (a.display === "none") {
            a.caches.value = e;
            return;
          }
          e = Ee(e, a.initialValue);
          if (!ke(a.value, e) && !a.designable) {
            return;
          }
        }
        a.form.setValuesIn(a.path, e);
      }
    };
    a.setInitialValue = function (e) {
      if (!a.destroyed) {
        if (a.initialized || ke(a.initialValue, e) || a.designable) {
          a.form.setInitialValuesIn(a.path, e);
        }
      }
    };
    a.setLoading = function (e) {
      ge(a, e);
    };
    a.setValidating = function (e) {
      de(a, e);
    };
    a.setSubmitting = function (e) {
      fe(a, e);
    };
    a.setState = ae(a);
    a.getState = se(a);
    a.onInput = function () {
      var e = [];
      for (var t = 0; t < arguments.length; t++) {
        e[t] = arguments[t];
      }
      return De(a, undefined, undefined, function () {
        var t;
        var r;
        var i;
        var o;
        return Le(this, function (a) {
          switch (a.label) {
            case 0:
              t = function (e) {
                return !j(e[0]) || !("currentTarget" in e[0]) || e[0]?.target === e[0]?.currentTarget;
              };
              r = function (e) {
                if (e[0]?.target && !j(e[0])) {
                  return e;
                } else {
                  return D(e);
                }
              };
              if (t(e)) {
                i = r(e);
                o = i[0];
                this.caches.inputting = true;
                this.inputValue = o;
                this.inputValues = i;
                this.value = o;
                this.modify();
                this.notify(n.ON_FIELD_INPUT_VALUE_CHANGE);
                this.notify(n.ON_FORM_INPUT_CHANGE, this.form);
                return [4, he(this, "onInput")];
              } else {
                return [2];
              }
            case 1:
              a.sent();
              this.caches.inputting = false;
              return [2];
          }
        });
      });
    };
    a.onFocus = function () {
      var e = [];
      for (var t = 0; t < arguments.length; t++) {
        e[t] = arguments[t];
      }
      return De(a, undefined, undefined, function () {
        return Le(this, function (r) {
          switch (r.label) {
            case 0:
              if (e[0]?.target && !j(e[0], false)) {
                return [2];
              } else {
                this.active = true;
                this.visited = true;
                return [4, he(this, "onFocus")];
              }
            case 1:
              r.sent();
              return [2];
          }
        });
      });
    };
    a.onBlur = function () {
      var e = [];
      for (var t = 0; t < arguments.length; t++) {
        e[t] = arguments[t];
      }
      return De(a, undefined, undefined, function () {
        return Le(this, function (r) {
          switch (r.label) {
            case 0:
              if (e[0]?.target && !j(e[0], false)) {
                return [2];
              } else {
                this.active = false;
                return [4, he(this, "onBlur")];
              }
            case 1:
              r.sent();
              return [2];
          }
        });
      });
    };
    a.validate = function (e) {
      return ve(a, `${a.address}.**`, e);
    };
    a.submit = function (e) {
      return me(a, e);
    };
    a.reset = function (e) {
      return ye(a, `${a.address}.**`, e);
    };
    a.queryFeedbacks = function (e) {
      return W(a, e);
    };
    a.modify = function () {
      return we(a);
    };
    a.form = i;
    a.props = r;
    a.designable = o;
    Ce();
    a.locate(t);
    a.initialize();
    a.makeObservable();
    a.makeReactive();
    a.onInit();
    Ae();
    return a;
  }
  je(t, e);
  t.prototype.initialize = function () {
    this.initialized = false;
    this.loading = false;
    this.validating = false;
    this.submitting = false;
    this.selfModified = false;
    this.active = false;
    this.visited = false;
    this.mounted = false;
    this.unmounted = false;
    this.inputValues = [];
    this.inputValue = null;
    this.feedbacks = [];
    this.title = this.props.title;
    this.description = this.props.description;
    this.display = this.props.display;
    this.pattern = this.props.pattern;
    this.editable = this.props.editable;
    this.disabled = this.props.disabled;
    this.readOnly = this.props.readOnly;
    this.readPretty = this.props.readPretty;
    this.visible = this.props.visible;
    this.hidden = this.props.hidden;
    this.dataSource = this.props.dataSource;
    this.validator = this.props.validator;
    this.required = this.props.required;
    this.content = this.props.content;
    this.initialValue = this.props.initialValue;
    this.value = this.props.value;
    this.data = this.props.data;
    this.decorator = (0, i._K)(this.props.decorator);
    this.component = (0, i._K)(this.props.component);
  };
  t.prototype.makeObservable = function () {
    if (!this.designable) {
      (0, u.Ou)(this, {
        path: u.LO.ref,
        title: u.LO.ref,
        description: u.LO.ref,
        dataSource: u.LO.ref,
        selfDisplay: u.LO.ref,
        selfPattern: u.LO.ref,
        loading: u.LO.ref,
        validating: u.LO.ref,
        submitting: u.LO.ref,
        selfModified: u.LO.ref,
        modified: u.LO.ref,
        active: u.LO.ref,
        visited: u.LO.ref,
        initialized: u.LO.ref,
        mounted: u.LO.ref,
        unmounted: u.LO.ref,
        inputValue: u.LO.ref,
        inputValues: u.LO.ref,
        decoratorType: u.LO.ref,
        componentType: u.LO.ref,
        content: u.LO.ref,
        feedbacks: u.LO.ref,
        decoratorProps: u.LO,
        componentProps: u.LO,
        validator: u.LO.shallow,
        data: u.LO.shallow,
        component: u.LO.computed,
        decorator: u.LO.computed,
        errors: u.LO.computed,
        warnings: u.LO.computed,
        successes: u.LO.computed,
        valid: u.LO.computed,
        invalid: u.LO.computed,
        selfErrors: u.LO.computed,
        selfWarnings: u.LO.computed,
        selfSuccesses: u.LO.computed,
        selfValid: u.LO.computed,
        selfInvalid: u.LO.computed,
        validateStatus: u.LO.computed,
        value: u.LO.computed,
        initialValue: u.LO.computed,
        display: u.LO.computed,
        pattern: u.LO.computed,
        required: u.LO.computed,
        hidden: u.LO.computed,
        visible: u.LO.computed,
        disabled: u.LO.computed,
        readOnly: u.LO.computed,
        readPretty: u.LO.computed,
        editable: u.LO.computed,
        indexes: u.LO.computed,
        setDisplay: u.aD,
        setTitle: u.aD,
        setDescription: u.aD,
        setDataSource: u.aD,
        setValue: u.aD,
        setPattern: u.aD,
        setInitialValue: u.aD,
        setLoading: u.aD,
        setValidating: u.aD,
        setFeedback: u.aD,
        setSelfErrors: u.aD,
        setSelfWarnings: u.aD,
        setSelfSuccesses: u.aD,
        setValidator: u.aD,
        setRequired: u.aD,
        setComponent: u.aD,
        setComponentProps: u.aD,
        setDecorator: u.aD,
        setDecoratorProps: u.aD,
        setData: u.aD,
        setContent: u.aD,
        validate: u.aD,
        reset: u.aD,
        onInit: u.dC,
        onInput: u.dC,
        onMount: u.dC,
        onUnmount: u.dC,
        onFocus: u.dC,
        onBlur: u.dC
      });
    }
  };
  t.prototype.makeReactive = function () {
    var e = this;
    if (!this.designable) {
      this.disposers.push(Te(function () {
        return e.value;
      }, function (t) {
        e.notify(n.ON_FIELD_VALUE_CHANGE);
        if ((0, i.JY)(t)) {
          if (e.selfModified && !e.caches.inputting) {
            he(e);
          }
          if (!(0, i.xb)(t) && e.display === "none") {
            e.caches.value = (0, u.ZN)(t);
            e.form.deleteValuesIn(e.path);
          }
        }
      }), Te(function () {
        return e.initialValue;
      }, function () {
        e.notify(n.ON_FIELD_INITIAL_VALUE_CHANGE);
      }), Te(function () {
        return e.display;
      }, function (t) {
        var n = e.value;
        if (t !== "none") {
          if (n === undefined && e.caches.value !== undefined) {
            e.setValue(e.caches.value);
            e.caches.value = undefined;
          }
        } else {
          e.caches.value = (0, u.ZN)(n) ?? (0, u.ZN)(e.initialValue);
          e.form.deleteValuesIn(e.path);
        }
        if (t === "none" || t === "hidden") {
          e.setFeedback({
            type: "error",
            messages: []
          });
        }
      }), Te(function () {
        return e.pattern;
      }, function (t) {
        if (t !== "editable") {
          e.setFeedback({
            type: "error",
            messages: []
          });
        }
      }));
      Se(this);
    }
  };
  Object.defineProperty(t.prototype, "selfErrors", {
    get: function () {
      return Y(this, {
        type: "error"
      });
    },
    set: function (e) {
      this.setFeedback({
        type: "error",
        code: "EffectError",
        messages: e
      });
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "errors", {
    get: function () {
      return this.form.errors.filter(oe(this));
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "selfWarnings", {
    get: function () {
      return Y(this, {
        type: "warning"
      });
    },
    set: function (e) {
      this.setFeedback({
        type: "warning",
        code: "EffectWarning",
        messages: e
      });
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "warnings", {
    get: function () {
      return this.form.warnings.filter(oe(this));
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "selfSuccesses", {
    get: function () {
      return Y(this, {
        type: "success"
      });
    },
    set: function (e) {
      this.setFeedback({
        type: "success",
        code: "EffectSuccess",
        messages: e
      });
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "successes", {
    get: function () {
      return this.form.successes.filter(oe(this));
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "selfValid", {
    get: function () {
      return !this.selfErrors.length;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "valid", {
    get: function () {
      return !this.errors.length;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "selfInvalid", {
    get: function () {
      return !this.selfValid;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "invalid", {
    get: function () {
      return !this.valid;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "value", {
    get: function () {
      return this.form.getValuesIn(this.path);
    },
    set: function (e) {
      this.setValue(e);
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "initialValue", {
    get: function () {
      return this.form.getInitialValuesIn(this.path);
    },
    set: function (e) {
      this.setInitialValue(e);
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "required", {
    get: function () {
      var e = (0, i.H1)(this.validator) ? this.validator : (0, E.oM)(this.validator);
      return e.some(function (e) {
        return !!e?.required;
      });
    },
    set: function (e) {
      if (this.required !== e) {
        this.setValidatorRule("required", e);
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "validateStatus", {
    get: function () {
      if (this.validating) {
        return "validating";
      } else if (this.selfInvalid) {
        return "error";
      } else if (this.selfWarnings.length) {
        return "warning";
      } else if (this.selfSuccesses.length) {
        return "success";
      } else {
        return undefined;
      }
    },
    enumerable: false,
    configurable: true
  });
  return t;
}(Ie);
function Ze(e, t) {
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
function ze(e, t, r) {
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
function Ue(e, t) {
  return function () {
    var r = [];
    for (var n = 0; n < arguments.length; n++) {
      r[n] = arguments[n];
    }
    if (!O.effectStart) {
      throw new Error("Effect hooks cannot be used in asynchronous function body");
    }
    O.lifecycles.push(new o(e, function (e, n) {
      if ((0, i.LQ)(t)) {
        t.apply(undefined, ze([e, n], Ze(O.context), false)).apply(undefined, ze([], Ze(r), false));
      }
    }));
  };
}
function Be(e) {
  var t;
  return {
    provide: function (r) {
      if (!O.effectStart) {
        throw new Error("Provide method cannot be used in asynchronous function body");
      }
      t = O.context.length;
      O.context[t] = (0, i.JY)(r) ? r : e;
    },
    consume: function () {
      if (!O.effectStart) {
        throw new Error("Consume method cannot be used in asynchronous function body");
      }
      return O.context[t];
    }
  };
}
var Ve = Be();
var He = Ve.consume;
function We(e) {
  var t = [];
  for (var r = 1; r < arguments.length; r++) {
    t[r - 1] = arguments[r];
  }
  O.lifecycles = [];
  O.context = [];
  O.effectStart = true;
  O.effectEnd = false;
  if (l(e)) {
    Ve.provide(e);
  }
  t.forEach(function (t) {
    if ((0, i.LQ)(t)) {
      t(e);
    }
  });
  O.context = [];
  O.effectStart = false;
  O.effectEnd = true;
  return O.lifecycles;
}
var Ye = function () {
  function e(t, r) {
    e = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (e, t) {
      e.__proto__ = t;
    } || function (e, t) {
      for (var r in t) {
        if (Object.prototype.hasOwnProperty.call(t, r)) {
          e[r] = t[r];
        }
      }
    };
    return e(t, r);
  }
  return function (t, r) {
    if (typeof r !== "function" && r !== null) {
      throw new TypeError("Class extends value " + String(r) + " is not a constructor or null");
    }
    function n() {
      this.constructor = t;
    }
    e(t, r);
    t.prototype = r === null ? Object.create(r) : (n.prototype = r.prototype, new n());
  };
}();
function Qe(e, t) {
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
function $e(e, t, r) {
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
var Ge = function (e) {
  function t(t, r, n, o) {
    var a = e.call(this, t, r, n, o) || this;
    a.displayName = "ArrayField";
    a.push = function () {
      var e = [];
      for (var t = 0; t < arguments.length; t++) {
        e[t] = arguments[t];
      }
      return (0, u.aD)(function () {
        var t;
        if (!(0, i.H1)(a.value)) {
          a.value = [];
        }
        (t = a.value).push.apply(t, $e([], Qe(e), false));
        return a.onInput(a.value);
      });
    };
    a.pop = function () {
      if ((0, i.H1)(a.value)) {
        return (0, u.aD)(function () {
          var e = a.value.length - 1;
          K(a, {
            startIndex: e,
            deleteCount: 1
          });
          a.value.pop();
          return a.onInput(a.value);
        });
      }
    };
    a.insert = function (e) {
      var t = [];
      for (var r = 1; r < arguments.length; r++) {
        t[r - 1] = arguments[r];
      }
      return (0, u.aD)(function () {
        var r;
        if (!(0, i.H1)(a.value)) {
          a.value = [];
        }
        if (t.length !== 0) {
          K(a, {
            startIndex: e,
            insertCount: t.length
          });
          (r = a.value).splice.apply(r, $e([e, 0], Qe(t), false));
          return a.onInput(a.value);
        }
      });
    };
    a.remove = function (e) {
      if ((0, i.H1)(a.value)) {
        return (0, u.aD)(function () {
          K(a, {
            startIndex: e,
            deleteCount: 1
          });
          a.value.splice(e, 1);
          return a.onInput(a.value);
        });
      }
    };
    a.shift = function () {
      if ((0, i.H1)(a.value)) {
        return (0, u.aD)(function () {
          a.value.shift();
          return a.onInput(a.value);
        });
      }
    };
    a.unshift = function () {
      var e = [];
      for (var t = 0; t < arguments.length; t++) {
        e[t] = arguments[t];
      }
      return (0, u.aD)(function () {
        var t;
        if (!(0, i.H1)(a.value)) {
          a.value = [];
        }
        K(a, {
          startIndex: 0,
          insertCount: e.length
        });
        (t = a.value).unshift.apply(t, $e([], Qe(e), false));
        return a.onInput(a.value);
      });
    };
    a.move = function (e, t) {
      if ((0, i.H1)(a.value) && e !== t) {
        return (0, u.aD)(function () {
          (0, i.pB)(a.value, e, t);
          J(a, {
            fromIndex: e,
            toIndex: t
          });
          return a.onInput(a.value);
        });
      }
    };
    a.moveUp = function (e) {
      if ((0, i.H1)(a.value)) {
        return a.move(e, e - 1 < 0 ? a.value.length - 1 : e - 1);
      }
    };
    a.moveDown = function (e) {
      if ((0, i.H1)(a.value)) {
        return a.move(e, e + 1 >= a.value.length ? 0 : e + 1);
      }
    };
    a.makeAutoCleanable();
    return a;
  }
  Ye(t, e);
  t.prototype.makeAutoCleanable = function () {
    var e = this;
    this.disposers.push((0, u.U5)(function () {
      return e.value?.length;
    }, function (t, r) {
      if (r && !t) {
        X(e, 0);
      } else if (t < r) {
        X(e, t);
      }
    }));
  };
  return t;
}(Fe);
var Ke = function () {
  function e(t, r) {
    e = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (e, t) {
      e.__proto__ = t;
    } || function (e, t) {
      for (var r in t) {
        if (Object.prototype.hasOwnProperty.call(t, r)) {
          e[r] = t[r];
        }
      }
    };
    return e(t, r);
  }
  return function (t, r) {
    if (typeof r !== "function" && r !== null) {
      throw new TypeError("Class extends value " + String(r) + " is not a constructor or null");
    }
    function n() {
      this.constructor = t;
    }
    e(t, r);
    t.prototype = r === null ? Object.create(r) : (n.prototype = r.prototype, new n());
  };
}();
var Je = function (e) {
  function t(t, r, n, i) {
    var o = e.call(this, t, r, n, i) || this;
    o.displayName = "ObjectField";
    o.additionalProperties = [];
    o.addProperty = function (e, t) {
      o.form.setValuesIn(o.path.concat(e), t);
      o.additionalProperties.push(e);
      return o.onInput(o.value);
    };
    o.removeProperty = function (e) {
      o.form.deleteValuesIn(o.path.concat(e));
      o.additionalProperties.splice(o.additionalProperties.indexOf(e), 1);
      return o.onInput(o.value);
    };
    o.existProperty = function (e) {
      return o.form.existValuesIn(o.path.concat(e));
    };
    o.makeAutoCleanable();
    return o;
  }
  Ke(t, e);
  t.prototype.makeAutoCleanable = function () {
    var e = this;
    this.disposers.push((0, u.U5)(function () {
      return Object.keys(e.value || {});
    }, function (t) {
      var r = e.additionalProperties.filter(function (e) {
        return !t.includes(e);
      });
      ee(e, r);
    }));
  };
  return t;
}(Fe);
var Xe = function () {
  function e(t, r) {
    e = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (e, t) {
      e.__proto__ = t;
    } || function (e, t) {
      for (var r in t) {
        if (Object.prototype.hasOwnProperty.call(t, r)) {
          e[r] = t[r];
        }
      }
    };
    return e(t, r);
  }
  return function (t, r) {
    if (typeof r !== "function" && r !== null) {
      throw new TypeError("Class extends value " + String(r) + " is not a constructor or null");
    }
    function n() {
      this.constructor = t;
    }
    e(t, r);
    t.prototype = r === null ? Object.create(r) : (n.prototype = r.prototype, new n());
  };
}();
var et = function (e) {
  function t(t, r, n, i) {
    var o = e.call(this) || this;
    o.displayName = "VoidField";
    o.setState = ae(o);
    o.getState = se(o);
    o.form = n;
    o.props = r;
    o.designable = i;
    Ce();
    o.locate(t);
    o.initialize();
    o.makeObservable();
    o.makeReactive();
    o.onInit();
    Ae();
    return o;
  }
  Xe(t, e);
  t.prototype.initialize = function () {
    this.mounted = false;
    this.unmounted = false;
    this.initialized = false;
    this.title = this.props.title;
    this.description = this.props.description;
    this.pattern = this.props.pattern;
    this.display = this.props.display;
    this.hidden = this.props.hidden;
    this.editable = this.props.editable;
    this.disabled = this.props.disabled;
    this.readOnly = this.props.readOnly;
    this.readPretty = this.props.readPretty;
    this.visible = this.props.visible;
    this.content = this.props.content;
    this.data = this.props.data;
    this.decorator = (0, i._K)(this.props.decorator);
    this.component = (0, i._K)(this.props.component);
  };
  t.prototype.makeObservable = function () {
    if (!this.designable) {
      (0, u.Ou)(this, {
        path: u.LO.ref,
        title: u.LO.ref,
        description: u.LO.ref,
        selfDisplay: u.LO.ref,
        selfPattern: u.LO.ref,
        initialized: u.LO.ref,
        mounted: u.LO.ref,
        unmounted: u.LO.ref,
        decoratorType: u.LO.ref,
        componentType: u.LO.ref,
        content: u.LO.ref,
        data: u.LO.shallow,
        decoratorProps: u.LO,
        componentProps: u.LO,
        display: u.LO.computed,
        pattern: u.LO.computed,
        hidden: u.LO.computed,
        visible: u.LO.computed,
        disabled: u.LO.computed,
        readOnly: u.LO.computed,
        readPretty: u.LO.computed,
        editable: u.LO.computed,
        component: u.LO.computed,
        decorator: u.LO.computed,
        indexes: u.LO.computed,
        setTitle: u.aD,
        setDescription: u.aD,
        setDisplay: u.aD,
        setPattern: u.aD,
        setComponent: u.aD,
        setComponentProps: u.aD,
        setDecorator: u.aD,
        setDecoratorProps: u.aD,
        setData: u.aD,
        setContent: u.aD,
        onInit: u.dC,
        onMount: u.dC,
        onUnmount: u.dC
      });
    }
  };
  t.prototype.makeReactive = function () {
    if (!this.designable) {
      Se(this);
    }
  };
  return t;
}(Ie);
function tt() {
  tt = Object.assign || function (e) {
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
  return tt.apply(this, arguments);
}
var rt = "__FORMILY_DEV_TOOLS_HOOK__";
var nt = function () {
  function e(e) {
    var t = this;
    this.displayName = "Form";
    this.fields = {};
    this.requests = {};
    this.indexes = {};
    this.disposers = [];
    this.createField = function (e) {
      var r = i.Dm.parse(e.basePath).concat(e.name);
      var o = r.toString();
      if (o) {
        if (!t.fields[o] || !!t.props.designable) {
          (0, u.dC)(function () {
            new Fe(r, e, t, t.props.designable);
          });
          t.notify(n.ON_FORM_GRAPH_CHANGE);
        }
        return t.fields[o];
      }
    };
    this.createArrayField = function (e) {
      var r = i.Dm.parse(e.basePath).concat(e.name);
      var o = r.toString();
      if (o) {
        if (!t.fields[o] || !!t.props.designable) {
          (0, u.dC)(function () {
            new Ge(r, tt(tt({}, e), {
              value: (0, i.H1)(e.value) ? e.value : []
            }), t, t.props.designable);
          });
          t.notify(n.ON_FORM_GRAPH_CHANGE);
        }
        return t.fields[o];
      }
    };
    this.createObjectField = function (e) {
      var r = i.Dm.parse(e.basePath).concat(e.name);
      var o = r.toString();
      if (o) {
        if (!t.fields[o] || !!t.props.designable) {
          (0, u.dC)(function () {
            new Je(r, tt(tt({}, e), {
              value: (0, i.BP)(e.value) ? e.value : {}
            }), t, t.props.designable);
          });
          t.notify(n.ON_FORM_GRAPH_CHANGE);
        }
        return t.fields[o];
      }
    };
    this.createVoidField = function (e) {
      var r = i.Dm.parse(e.basePath).concat(e.name);
      var o = r.toString();
      if (o) {
        if (!t.fields[o] || !!t.props.designable) {
          (0, u.dC)(function () {
            new et(r, e, t, t.props.designable);
          });
          t.notify(n.ON_FORM_GRAPH_CHANGE);
        }
        return t.fields[o];
      }
    };
    this.setValues = function (e, r = "merge") {
      if ((0, i.Uk)(e)) {
        if (r === "merge" || r === "deepMerge") {
          (0, i.TS)(t.values, e, {
            arrayMerge: function (e, t) {
              return t;
            },
            assign: true
          });
        } else if (r === "shallowMerge") {
          Object.assign(t.values, e);
        } else {
          t.values = e;
        }
      }
    };
    this.setInitialValues = function (e, r = "merge") {
      if ((0, i.Uk)(e)) {
        if (r === "merge" || r === "deepMerge") {
          (0, i.TS)(t.initialValues, e, {
            arrayMerge: function (e, t) {
              return t;
            },
            assign: true
          });
        } else if (r === "shallowMerge") {
          Object.assign(t.initialValues, e);
        } else {
          t.initialValues = e;
        }
      }
    };
    this.setValuesIn = function (e, r) {
      i.Dm.setIn(t.values, e, r);
    };
    this.deleteValuesIn = function (e) {
      i.Dm.deleteIn(t.values, e);
    };
    this.existValuesIn = function (e) {
      return i.Dm.existIn(t.values, e);
    };
    this.getValuesIn = function (e) {
      return i.Dm.getIn(t.values, e);
    };
    this.setInitialValuesIn = function (e, r) {
      i.Dm.setIn(t.initialValues, e, r);
    };
    this.deleteInitialValuesIn = function (e) {
      i.Dm.deleteIn(t.initialValues, e);
    };
    this.existInitialValuesIn = function (e) {
      return i.Dm.existIn(t.initialValues, e);
    };
    this.getInitialValuesIn = function (e) {
      return i.Dm.getIn(t.initialValues, e);
    };
    this.setLoading = function (e) {
      ge(t, e);
    };
    this.setSubmitting = function (e) {
      fe(t, e);
    };
    this.setValidating = function (e) {
      de(t, e);
    };
    this.setDisplay = function (e) {
      t.display = e;
    };
    this.setPattern = function (e) {
      t.pattern = e;
    };
    this.addEffects = function (e, r) {
      if (!t.heart.hasLifeCycles(e)) {
        t.heart.addLifeCycles(e, We(t, r));
      }
    };
    this.removeEffects = function (e) {
      t.heart.removeLifeCycles(e);
    };
    this.setEffects = function (e) {
      t.heart.setLifeCycles(We(t, e));
    };
    this.clearErrors = function (e = "*") {
      t.query(e).forEach(function (e) {
        if (!g(e)) {
          e.setFeedback({
            type: "error",
            messages: []
          });
        }
      });
    };
    this.clearWarnings = function (e = "*") {
      t.query(e).forEach(function (e) {
        if (!g(e)) {
          e.setFeedback({
            type: "warning",
            messages: []
          });
        }
      });
    };
    this.clearSuccesses = function (e = "*") {
      t.query(e).forEach(function (e) {
        if (!g(e)) {
          e.setFeedback({
            type: "success",
            messages: []
          });
        }
      });
    };
    this.query = function (e) {
      return new qe({
        pattern: e,
        base: "",
        form: t
      });
    };
    this.queryFeedbacks = function (e) {
      return t.query(e.address || e.path || "*").reduce(function (t, r) {
        if (g(r)) {
          return t;
        } else {
          return t.concat(r.queryFeedbacks(e).map(function (e) {
            return tt(tt({}, e), {
              address: r.address.toString(),
              path: r.path.toString()
            });
          }).filter(function (e) {
            return e.messages.length > 0;
          }));
        }
      }, []);
    };
    this.notify = function (e, r) {
      t.heart.publish(e, r ?? t);
    };
    this.subscribe = function (e) {
      return t.heart.subscribe(e);
    };
    this.unsubscribe = function (e) {
      t.heart.unsubscribe(e);
    };
    this.onInit = function () {
      t.initialized = true;
      t.notify(n.ON_FORM_INIT);
    };
    this.onMount = function () {
      t.mounted = true;
      t.notify(n.ON_FORM_MOUNT);
      if (i.kk[rt] && !t.props.designable) {
        i.kk[rt].inject(t.id, t);
      }
    };
    this.onUnmount = function () {
      t.notify(n.ON_FORM_UNMOUNT);
      t.query("*").forEach(function (e) {
        return e.destroy(false);
      });
      t.disposers.forEach(function (e) {
        return e();
      });
      t.unmounted = true;
      t.indexes = {};
      t.heart.clear();
      if (i.kk[rt] && !t.props.designable) {
        i.kk[rt].unmount(t.id);
      }
    };
    this.setState = ae(this);
    this.getState = se(this);
    this.setFormState = ae(this);
    this.getFormState = se(this);
    this.setFieldState = ue(this);
    this.getFieldState = le(this);
    this.getFormGraph = function () {
      return t.graph.getGraph();
    };
    this.setFormGraph = function (e) {
      t.graph.setGraph(e);
    };
    this.clearFormGraph = function (e = "*", r = true) {
      t.query(e).forEach(function (e) {
        e.destroy(r);
      });
    };
    this.validate = function (e = "*") {
      return ve(t, e);
    };
    this.submit = function (e) {
      return me(t, e);
    };
    this.reset = function (e = "*", r) {
      return ye(t, e, r);
    };
    this.initialize(e);
    this.makeObservable();
    this.makeReactive();
    this.makeValues();
    this.onInit();
  }
  e.prototype.initialize = function (e) {
    this.id = (0, i.hQ)();
    this.props = tt({}, e);
    this.initialized = false;
    this.submitting = false;
    this.validating = false;
    this.loading = false;
    this.modified = false;
    this.mounted = false;
    this.unmounted = false;
    this.display = this.props.display || "visible";
    this.pattern = this.props.pattern || "editable";
    this.editable = this.props.editable;
    this.disabled = this.props.disabled;
    this.readOnly = this.props.readOnly;
    this.readPretty = this.props.readPretty;
    this.visible = this.props.visible;
    this.hidden = this.props.hidden;
    this.graph = new x(this);
    this.heart = new s({
      lifecycles: this.lifecycles,
      context: this
    });
  };
  e.prototype.makeValues = function () {
    this.values = xe(this.props.values);
    this.initialValues = xe(this.props.initialValues);
  };
  e.prototype.makeObservable = function () {
    (0, u.Ou)(this, {
      fields: u.LO.shallow,
      indexes: u.LO.shallow,
      initialized: u.LO.ref,
      validating: u.LO.ref,
      submitting: u.LO.ref,
      loading: u.LO.ref,
      modified: u.LO.ref,
      pattern: u.LO.ref,
      display: u.LO.ref,
      mounted: u.LO.ref,
      unmounted: u.LO.ref,
      values: u.LO,
      initialValues: u.LO,
      valid: u.LO.computed,
      invalid: u.LO.computed,
      errors: u.LO.computed,
      warnings: u.LO.computed,
      successes: u.LO.computed,
      hidden: u.LO.computed,
      visible: u.LO.computed,
      editable: u.LO.computed,
      readOnly: u.LO.computed,
      readPretty: u.LO.computed,
      disabled: u.LO.computed,
      setValues: u.aD,
      setValuesIn: u.aD,
      setInitialValues: u.aD,
      setInitialValuesIn: u.aD,
      setPattern: u.aD,
      setDisplay: u.aD,
      setState: u.aD,
      deleteInitialValuesIn: u.aD,
      deleteValuesIn: u.aD,
      setSubmitting: u.aD,
      setValidating: u.aD,
      reset: u.aD,
      submit: u.aD,
      validate: u.aD,
      onMount: u.dC,
      onUnmount: u.dC,
      onInit: u.dC
    });
  };
  e.prototype.makeReactive = function () {
    var e = this;
    this.disposers.push((0, u.N7)(this, function (t) {
      ce(e, t);
      pe(e, t);
    }, true));
  };
  Object.defineProperty(e.prototype, "valid", {
    get: function () {
      return !this.invalid;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "invalid", {
    get: function () {
      return this.errors.length > 0;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "errors", {
    get: function () {
      return this.queryFeedbacks({
        type: "error"
      });
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "warnings", {
    get: function () {
      return this.queryFeedbacks({
        type: "warning"
      });
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "successes", {
    get: function () {
      return this.queryFeedbacks({
        type: "success"
      });
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "lifecycles", {
    get: function () {
      return We(this, this.props.effects);
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "hidden", {
    get: function () {
      return this.display === "hidden";
    },
    set: function (e) {
      if ((0, i.JY)(e)) {
        this.display = e ? "hidden" : "visible";
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "visible", {
    get: function () {
      return this.display === "visible";
    },
    set: function (e) {
      if ((0, i.JY)(e)) {
        this.display = e ? "visible" : "none";
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "editable", {
    get: function () {
      return this.pattern === "editable";
    },
    set: function (e) {
      if ((0, i.JY)(e)) {
        this.pattern = e ? "editable" : "readPretty";
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "readOnly", {
    get: function () {
      return this.pattern === "readOnly";
    },
    set: function (e) {
      if ((0, i.JY)(e)) {
        this.pattern = e ? "readOnly" : "editable";
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "disabled", {
    get: function () {
      return this.pattern === "disabled";
    },
    set: function (e) {
      if ((0, i.JY)(e)) {
        this.pattern = e ? "disabled" : "editable";
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "readPretty", {
    get: function () {
      return this.pattern === "readPretty";
    },
    set: function (e) {
      if ((0, i.JY)(e)) {
        this.pattern = e ? "readPretty" : "editable";
      }
    },
    enumerable: false,
    configurable: true
  });
  return e;
}();
function it(e) {
  return new nt(e);
}
function ot(e) {
  return Ue(e, function (e) {
    return function (t) {
      (0, u.dC)(function () {
        t(e);
      });
    };
  });
}
ot(n.ON_FORM_INIT);
var at = ot(n.ON_FORM_MOUNT);
ot(n.ON_FORM_UNMOUNT);
var st = ot(n.ON_FORM_VALUES_CHANGE);
ot(n.ON_FORM_INITIAL_VALUES_CHANGE);
ot(n.ON_FORM_INPUT_CHANGE);
ot(n.ON_FORM_SUBMIT);
ot(n.ON_FORM_RESET);
ot(n.ON_FORM_SUBMIT_START);
ot(n.ON_FORM_SUBMIT_END);
ot(n.ON_FORM_SUBMIT_SUCCESS);
ot(n.ON_FORM_SUBMIT_FAILED);
ot(n.ON_FORM_SUBMIT_VALIDATE_START);
ot(n.ON_FORM_SUBMIT_VALIDATE_SUCCESS);
ot(n.ON_FORM_SUBMIT_VALIDATE_FAILED);
ot(n.ON_FORM_SUBMIT_VALIDATE_END);
ot(n.ON_FORM_VALIDATE_START);
ot(n.ON_FORM_VALIDATE_SUCCESS);
ot(n.ON_FORM_VALIDATE_FAILED);
ot(n.ON_FORM_VALIDATE_END);
ot(n.ON_FORM_GRAPH_CHANGE);
ot(n.ON_FORM_LOADING);
function ut(e) {
  return Ue(e, function (e, t) {
    return function (r, n) {
      if (i.Dm.parse(r).matchAliasGroup(e.address, e.path)) {
        (0, u.dC)(function () {
          n(e, t);
        });
      }
    };
  });
}
var lt = ut(n.ON_FIELD_INIT);
var ct = ut(n.ON_FIELD_MOUNT);
var pt = ut(n.ON_FIELD_UNMOUNT);
var dt = ut(n.ON_FIELD_VALUE_CHANGE);
var ft = ut(n.ON_FIELD_INITIAL_VALUE_CHANGE);
var gt = ut(n.ON_FIELD_INPUT_VALUE_CHANGE);
var mt = ut(n.ON_FIELD_VALIDATE_START);
var vt = ut(n.ON_FIELD_VALIDATE_END);
ut(n.ON_FIELD_VALIDATING);
var yt = ut(n.ON_FIELD_VALIDATE_FAILED);
var ht = ut(n.ON_FIELD_VALIDATE_SUCCESS);
ut(n.ON_FIELD_SUBMIT);
ut(n.ON_FIELD_SUBMIT_START);
ut(n.ON_FIELD_SUBMIT_END);
ut(n.ON_FIELD_SUBMIT_VALIDATE_START);
ut(n.ON_FIELD_SUBMIT_VALIDATE_END);
ut(n.ON_FIELD_SUBMIT_SUCCESS);
ut(n.ON_FIELD_SUBMIT_FAILED);
ut(n.ON_FIELD_SUBMIT_VALIDATE_SUCCESS);
ut(n.ON_FIELD_SUBMIT_VALIDATE_FAILED);
ut(n.ON_FIELD_RESET);
ut(n.ON_FIELD_LOADING);
function bt(e, t) {
  var r = He();
  var n = r.query(e).reduce(function (e, n) {
    t(n, r);
    return e + 1;
  }, 0);
  if (n === 0) {
    lt(e, t);
  }
}
};
