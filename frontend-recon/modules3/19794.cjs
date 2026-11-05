// webpack module 19794 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./70235.js");
var i = require("./95932.js");
var o = require("./86182.js");
var a = "['’]";
var s = RegExp(a, "g");
function u(e) {
  return function (t) {
    return n(o(i(t).replace(s, "")), e, "");
  };
}
module.exports = u;
};
