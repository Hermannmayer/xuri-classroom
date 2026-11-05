// webpack module 52009 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./83810.js");
var i = require("./44007.js");
var o = i.formatDOM;
var a = /<(![a-zA-Z\s]+)>/;
function s(e) {
  if (typeof e !== "string") {
    throw new TypeError("First argument must be a string");
  }
  if (e === "") {
    return [];
  }
  var t;
  var r = e.match(a);
  if (r && r[1]) {
    t = r[1];
  }
  return o(n(e), null, t);
}
module.exports = s;
};
