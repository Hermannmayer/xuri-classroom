// webpack module 55377 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./78426.js");
var i = require("./4484.js");
module.exports = function (e) {
  if (e === undefined) {
    return 0;
  }
  var t = n(e);
  var r = i(t);
  if (t !== r) {
    throw RangeError("Wrong length or index");
  }
  return r;
};
};
