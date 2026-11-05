// webpack module 94228 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = c;
var o = i(require("./90585.js"));
var a = i(require("./49277.js"));
var s = i(require("./56463.js"));
var u = n(require("./59496.js"));
var l = require("./96583.js");
function c(e, t) {
  function r() {
    var r;
    var n = null;
    var i = {
      add: function (e, t) {
        if (n !== null && n !== undefined) {
          n.component.add(e, t);
        }
      }
    };
    var c = (0, s.default)(i);
    var p = (0, a.default)(c, 2);
    var d = p[0];
    var f = p[1];
    function g(i) {
      var a = i.prefixCls;
      var s = r("notification", a);
      e((0, o.default)((0, o.default)({}, i), {
        prefixCls: s
      }), function (e) {
        var r = e.prefixCls;
        var o = e.instance;
        n = o;
        d(t(i, r));
      });
    }
    var m = u.useRef({});
    m.current.open = g;
    ["success", "info", "warning", "error"].forEach(function (e) {
      m.current[e] = function (t) {
        return m.current.open((0, o.default)((0, o.default)({}, t), {
          type: e
        }));
      };
    });
    return [m.current, u.createElement(l.ConfigConsumer, {
      key: "holder"
    }, function (e) {
      r = e.getPrefixCls;
      return f;
    })];
  }
  return r;
}
};
