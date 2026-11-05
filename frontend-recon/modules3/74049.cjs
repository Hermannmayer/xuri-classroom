// webpack module 74049 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./36257.js");
function i() {}
function o() {}
o.resetWarningCache = i;
module.exports = function () {
  function e(e, t, r, i, o, a) {
    if (a !== n) {
      var s = new Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");
      s.name = "Invariant Violation";
      throw s;
    }
  }
  function t() {
    return e;
  }
  e.isRequired = e;
  var r = {
    array: e,
    bigint: e,
    bool: e,
    func: e,
    number: e,
    object: e,
    string: e,
    symbol: e,
    any: e,
    arrayOf: t,
    element: e,
    elementType: e,
    instanceOf: t,
    node: e,
    objectOf: t,
    oneOf: t,
    oneOfType: t,
    shape: t,
    exact: t,
    checkPropTypes: o,
    resetWarningCache: i
  };
  r.PropTypes = r;
  return r;
};
};
