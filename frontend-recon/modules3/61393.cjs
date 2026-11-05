// webpack module 61393 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  JH: function () {
    return a;
  },
  RY: function () {
    return s;
  },
  QT: function () {
    return u;
  },
  j1: function () {
    return l;
  }
});
var n = {};
var i = {
  exam: {},
  survey: {},
  template: {}
};
var o = {
  questionTypes: {},
  questionSettings: {},
  questionOperations: {},
  questionTitles: {},
  registerDesignerIcons: function (e) {
    Object.assign(n, e);
  },
  getDesignerIcon: function (e) {
    return n[e];
  },
  registerQuestionTemplates: function (e, t = "survey") {
    i[t] = e;
  },
  getQuestionTemplate: function (e, t = "survey") {
    return i[t][e] || {
      type: e
    };
  }
};
function a() {
  return o;
}
function s(e, t) {
  o.questionTypes[e] = t;
}
function u(e, t) {
  o.questionSettings[e] = t;
}
function l(e, t) {
  o.questionOperations[e] = t;
}
};
