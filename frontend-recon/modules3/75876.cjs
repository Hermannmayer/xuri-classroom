// webpack module 75876 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./92632.js");
var i = Function.toString;
if (typeof n.inspectSource != "function") {
  n.inspectSource = function (e) {
    return i.call(e);
  };
}
module.exports = n.inspectSource;
};
