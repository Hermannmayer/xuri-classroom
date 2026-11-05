// webpack module 32152 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./16902.js");
var i = require("./9507.js");
var o = require("./42786.js");
var a = "[object Null]";
var s = "[object Undefined]";
var u = n ? n.toStringTag : undefined;
function l(e) {
  if (e == null) {
    if (e === undefined) {
      return s;
    } else {
      return a;
    }
  } else if (u && u in Object(e)) {
    return i(e);
  } else {
    return o(e);
  }
}
module.exports = l;
};
