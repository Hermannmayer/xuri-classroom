// webpack module 67215 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  r: function () {
    return u;
  },
  j: function () {
    return l;
  }
});
var n = require("./21487.js");
var i = require("./66439.js");
var o = require("./91613.js");
var a = require("./88769.js");
function s(e, t) {
  var r;
  return (a.lw === null || a.lw === undefined || (r = (0, a.lw)()) === null || r === undefined ? undefined : r.formatMessage({
    id: e,
    defaultMessage: t
  })) || t;
}
function u(e) {
  var t;
  var r = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "antd";
  var n = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "onInput";
  var a = [];
  var u = e.attribute;
  if (u && u.required) {
    a.push({
      required: true,
      message: r === "antdForm" ? s("pages.answer.validation.input", "请输入") : s("pages.answer.validation.questionRequired", "这道题未回答"),
      triggerType: n === "onSubmit" ? "manual" : n,
      theme: r,
      schema: e
    });
  }
  if (u && u.answerLimit) {
    a.push({
      answerLimit: true,
      schema: e
    });
  }
  if (u !== null && u !== undefined && u.scope) {
    a.push({
      scope: true,
      schema: (0, o.Z)({}, e)
    });
  }
  if ((t = e.children) !== null && t !== undefined) {
    t.forEach(function (t) {
      a.push.apply(a, (0, i.Z)(l(t, e)));
    });
  }
  a.forEach(function (e) {
    e.triggerType = n === "onSubmit" ? "manual" : n;
  });
  return a;
}
function l(e, t) {
  var r;
  var i;
  var a;
  var u;
  var l;
  var c = [];
  if ((r = e.attribute) !== null && r !== undefined && r.dataType) {
    c.push((l = {}, (0, n.Z)(l, e.attribute.dataType, true), (0, n.Z)(l, "schema", (0, o.Z)((0, o.Z)({}, e), {}, {
      parent: t
    })), l));
  }
  if ((i = e.attribute) !== null && i !== undefined && i.required) {
    c.push({
      required: true,
      message: s("pages.answer.validation.optionRequired", "这个选项未回答"),
      schema: (0, o.Z)((0, o.Z)({}, e), {}, {
        parent: t
      })
    });
  }
  if ((a = e.attribute) !== null && a !== undefined && a.textLimit) {
    c.push({
      textLimit: true,
      schema: (0, o.Z)((0, o.Z)({}, e), {}, {
        parent: t
      })
    });
  }
  if ((u = e.attribute) !== null && u !== undefined && u.scope) {
    c.push({
      scope: true,
      schema: (0, o.Z)((0, o.Z)({}, e), {}, {
        parent: t
      })
    });
  }
  return c;
}
};
