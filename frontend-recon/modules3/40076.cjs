// webpack module 40076 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./40602.js").default;
var i = require("./48932.js").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NoStyleItemContext = exports.NoFormStyle = exports.FormProvider = exports.FormItemPrefixContext = exports.FormItemInputContext = exports.FormContext = undefined;
var o = i(require("./90585.js"));
var a = require("./95611.js");
var s = i(require("./44653.js"));
var u = n(require("./59496.js"));
var l = u;
exports.FormContext = l.createContext({
  labelAlign: "right",
  vertical: false,
  itemRef: function () {}
});
exports.NoStyleItemContext = l.createContext(null);
exports.FormProvider = function (e) {
  var t = (0, s.default)(e, ["prefixCls"]);
  return l.createElement(a.FormProvider, (0, o.default)({}, t));
};
exports.FormItemPrefixContext = l.createContext({
  prefixCls: ""
});
var c = exports.FormItemInputContext = l.createContext({});
exports.NoFormStyle = function (e) {
  var t = e.children;
  var r = e.status;
  var n = e.override;
  var i = (0, u.useContext)(c);
  var a = (0, u.useMemo)(function () {
    var e = (0, o.default)({}, i);
    if (n) {
      delete e.isFormItemInput;
    }
    if (r) {
      delete e.status;
      delete e.hasFeedback;
      delete e.feedbackIcon;
    }
    return e;
  }, [r, n, i]);
  return l.createElement(c.Provider, {
    value: a
  }, t);
};
};
