// webpack module 79806 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = p;
var o = i(require("./90585.js"));
var a = i(require("./49277.js"));
var s = i(require("./56463.js"));
var u = n(require("./59496.js"));
var l = require("./17190.js");
var c = require("./96583.js");
function p(e, t) {
  function r() {
    var r;
    var n;
    var i = null;
    var p = {
      add: function (e, t) {
        if (i !== null && i !== undefined) {
          i.component.add(e, t);
        }
      }
    };
    var d = (0, s.default)(p);
    var f = (0, a.default)(d, 2);
    var g = f[0];
    var m = f[1];
    function v(a) {
      var s = a.prefixCls;
      var u = r("message", s);
      var c = r();
      var p = a.key || (0, l.getKeyThenIncreaseKey)();
      var d = new Promise(function (r) {
        function s() {
          if (typeof a.onClose === "function") {
            a.onClose();
          }
          return r(true);
        }
        e((0, o.default)((0, o.default)({}, a), {
          prefixCls: u,
          rootPrefixCls: c,
          getPopupContainer: n
        }), function (e) {
          var r = e.prefixCls;
          var n = e.instance;
          i = n;
          g(t((0, o.default)((0, o.default)({}, a), {
            key: p,
            onClose: s
          }), r));
        });
      });
      function f() {
        if (i) {
          i.removeNotice(p);
        }
      }
      f.then = function (e, t) {
        return d.then(e, t);
      };
      f.promise = d;
      return f;
    }
    var y = u.useRef({});
    y.current.open = v;
    l.typeList.forEach(function (e) {
      return (0, l.attachTypeApi)(y.current, e);
    });
    return [y.current, u.createElement(c.ConfigConsumer, {
      key: "holder"
    }, function (e) {
      r = e.getPrefixCls;
      n = e.getPopupContainer;
      return m;
    })];
  }
  return r;
}
};
