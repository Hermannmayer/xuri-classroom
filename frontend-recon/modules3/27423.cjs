// webpack module 27423 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  xi: function () {
    return i;
  },
  fQ: function () {
    return o;
  },
  l_: function () {
    return v;
  },
  IR: function () {
    return m;
  },
  gh: function () {
    return E;
  },
  ZZ: function () {
    return g;
  }
});
var n = require("./59496.js");
var i = (0, n.createContext)({});
var o = i.Provider;
var a = require("./66439.js");
var s = require("./83676.js");
var u = require("./5726.js");
var l = u;
var c = require("./83639.js");
var p = c;
var d = require("./25468.js");
function f(e) {
  if (e === "Upload" || e === "Signature") {
    return "image";
  } else if (e == "User") {
    return "user";
  } else if (e === "Dept") {
    return "dept";
  } else {
    return "string";
  }
}
function g(e) {
  var t;
  var r = [];
  if (e !== null && e !== undefined && (t = e.children) !== null && t !== undefined) {
    t.filter(function (e) {
      return !(0, s.nj)(e.type) || e.type === "QuestionSet";
    }).map(function (e) {
      if (e.type === "QuestionSet") {
        r.push.apply(r, (0, a.Z)(g(e)));
      } else {
        r.push({
          name: e.id,
          title: (0, d.WO)(e.title),
          schema: e,
          type: f(e.type)
        });
      }
    });
  }
  return r;
}
function m(e, t) {
  return e.map(function (e) {
    var r;
    var n = {};
    var i = p((r = e.metaInfo) === null || r === undefined ? undefined : r.clientInfo.agent);
    t.forEach(function (t) {
      var r;
      var o;
      var a;
      var s = t.name;
      switch (s) {
        case "startTime":
          n.startTime = l((r = e.metaInfo) === null || r === undefined ? undefined : r.answerInfo.startTime).format("YYYY-MM-DD HH:mm:ss");
          return;
        case "endTime":
          n.endTime = l((o = e.metaInfo) === null || o === undefined ? undefined : o.answerInfo.endTime).format("YYYY-MM-DD HH:mm:ss");
          return;
        case "totalTime":
          n.totalTime = E(e.metaInfo ? e.metaInfo.answerInfo.endTime - e.metaInfo.answerInfo.startTime : 0);
          return;
        case "remoteIp":
          n.remoteIp = (a = e.metaInfo) === null || a === undefined ? undefined : a.clientInfo.remoteIp;
          return;
        case "browserType":
          n.browserType = `${i.browser.name} ${i.browser.version}`;
          return;
        case "deviceType":
          n.deviceType = `${i.device.vendor || ""} ${i.device.type || ""}`;
          return;
        case "platform":
          n.platform = `${i.os.name} ${i.os.version}`;
          return;
        case "openid":
          n.openid = e.answer.openid;
          return;
        case "wechatNickname":
          n.wechatNickname = e.answer.wechatNickname;
          return;
        case "wechatAvatarUrl":
          n.wechatAvatarUrl = e.answer.wechatAvatarUrl;
          return;
        default:
          break;
      }
      if (t.schema) {
        var u = t.schema || {};
        var c = u.type;
        var p = u.id;
        var d = e.answer[p];
        if (d) {
          var f = [];
          f = c === "Cascader" ? b(d, u) : c === "MatrixAuto" ? x(d, u) : c.startsWith("Matrix") ? w(d, u) : c === "Upload" || c === "Signature" ? h(d, u, e.attachment) : v(d, u);
          n[p] = c === "Upload" || c === "Signature" ? f : f.join(",");
        }
      } else {
        n[t.name] = e[t.name];
      }
    });
    n.id = e.id;
    n._raw = e;
    return n;
  });
}
function v(e, t) {
  var r;
  var n = [];
  if ((r = t.children) !== null && r !== undefined) {
    r.forEach(function (t) {
      var a = e[t.id];
      if (t.dataSource) {
        n.push(t.dataSource.find(function (e) {
          return e.value === a;
        })?.label || a);
      } else if (t.attribute?.dataType === "selectDict") {
        var s;
        n.push(a === null || a === undefined || (s = a.split("|")) === null || s === undefined ? undefined : s[1]);
      } else if (a === true) {
        n.push((0, d.WO)(t.title));
      } else if (t.attribute?.dataType === "horzBlank" && a) {
        n.push(y(t, a));
      } else if (a) {
        n.push(a);
      }
    });
  }
  return n;
}
function y(e, t) {
  var r;
  var n = [];
  console.log(e);
  if (t) {
    if ((r = e.children) !== null && r !== undefined) {
      r.forEach(function (e) {
        var o;
        var a;
        var s = e.id;
        var u = t[s] || "";
        if (e.attribute?.dataType === "select") {
          n.push(((o = e.dataSource) === null || o === undefined || (a = o.find(function (e) {
            return e.value === u;
          })) === null || a === undefined ? undefined : a.label) || u);
        } else if (e.attribute?.dataType === "selectDict") {
          n.push(u.split("|")[1]);
        } else {
          n.push(u);
        }
      });
    }
  }
  return n.join(",");
}
function h(e, t, r) {
  var n;
  var i = [];
  if ((n = t.children) !== null && n !== undefined) {
    n.forEach(function (t) {
      var n = e[t.id];
      i = r.filter(function (e) {
        return n.includes(e.id);
      });
    });
  }
  return i;
}
function b(e, t) {
  var r;
  var n = [];
  var i = t?.dataSource;
  if (i) {
    if ((r = t.children) !== null && r !== undefined) {
      r.forEach(function (t) {
        if (e.hasOwnProperty(t.id)) {
          var r;
          var o = (r = i) === null || r === undefined ? undefined : r.find(function (r) {
            return r.value === e[t.id];
          });
          if (o) {
            i = o.children;
            n.push(o.label);
          } else {
            n.push("");
          }
        }
      });
    }
    return n;
  } else {
    return n;
  }
}
function w(e, t) {
  var r;
  var n = [];
  if ((r = t.row) !== null && r !== undefined) {
    r.forEach(function (r) {
      var i = r.id;
      var o = (0, d.WO)(r.title);
      if (e[i] !== undefined) {
        n.push(`${o}:(${v(e[i], t)})`);
      }
    });
  }
  return n;
}
function x(e, t) {
  var r = [];
  e.forEach(function (e) {
    r.push(`(${v(e, t)})`);
  });
  return r;
}
function E(e) {
  var t = Math.floor(e / 86400000);
  var r = Math.floor(e / 3600000 % 24);
  var n = Math.floor(e / 60000 % 60);
  var i = Math.floor(e / 1000 % 60);
  var o = "";
  if (t > 0) {
    o += t + "天";
  }
  if (r > 0) {
    o += r + "小时";
  }
  if (n > 0) {
    o += n + "分钟";
  }
  if (i > 0) {
    o += i + "秒";
  }
  return o;
}
};
