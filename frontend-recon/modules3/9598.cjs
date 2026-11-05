// webpack module 9598 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  md: function () {
    return o;
  },
  Jn: function () {
    return a;
  },
  by: function () {
    return u;
  },
  Ee: function () {
    return c;
  }
});
var n = require("./91613.js");
var i = require("./81764.js");
function o(e = []) {
  var t = e.reduce(function (e, t) {
    return {
      totalQuestions: e.totalQuestions + (t.questionsNum || 0),
      totalScore: e.totalScore + (t.examScore || 0) * (t.questionsNum || 0)
    };
  }, {
    totalQuestions: 0,
    totalScore: 0
  });
  return (0, n.Z)((0, n.Z)({}, t), {}, {
    totalScore: (0, i.round)(t.totalScore, 10)
  });
}
function a(e) {
  var t = e;
  var r = "";
  do {
    r = String.fromCharCode(65 + t % 26) + r;
    t = Math.floor(t / 26) - 1;
  } while (t >= 0);
  return r;
}
var s = /^((?:(?:\s|&nbsp;)*<(?:p|div|span|strong|b|em|i)(?:\s[^>]*)?>)*(?:\s|&nbsp;)*)[A-Z]{1,3}(?:\s|&nbsp;)*[.\uff0e\u3001:\uff1a)\uff09](?:\s|&nbsp;)*/i;
function u(e) {
  return e.replace(s, "$1");
}
function l(e) {
  var r;
  var n = e.attribute?.examCorrectAnswer;
  var i = new Set((Array.isArray(n) ? n : [n]).filter(function (e) {
    return !!e;
  }));
  return ((r = e.children) === null || r === undefined ? undefined : r.map(function (e, t) {
    return {
      option: e,
      index: t
    };
  }).filter(function (e) {
    var t;
    var r = e.option;
    return (t = r.attribute) !== null && t !== undefined && !!t.examCorrectAnswer || i.has(r.id);
  })) || [];
}
function c(e) {
  var t;
  var r = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    correct: "对",
    incorrect: "错"
  };
  var n = l(e);
  if (e.type === "Radio" || e.type === "Checkbox") {
    return n.map(function (e) {
      var t = e.index;
      return a(t);
    }).join("/");
  }
  if (e.type === "Judge") {
    var i;
    var o;
    var s = (i = n[0]) === null || i === undefined || (o = i.option.title) === null || o === undefined ? undefined : o.trim();
    var u = (s === null || s === undefined ? undefined : s.toLowerCase()) || "";
    if (["对", "正确", "是", "true", "yes", "1"].includes(u)) {
      return r.correct;
    } else if (["错", "错误", "否", "false", "no", "0"].includes(u)) {
      return r.incorrect;
    } else {
      return s;
    }
  }
  if ((t = e.children) === null || t === undefined) {
    return undefined;
  } else {
    return t.map(function (e) {
      var r = e.attribute?.examCorrectAnswer;
      if (r) {
        if (r === e.id) {
          return e.title;
        } else {
          return r;
        }
      }
    }).filter(function (e) {
      return e;
    }).join(",");
  }
}
};
