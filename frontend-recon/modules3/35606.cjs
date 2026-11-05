// webpack module 35606 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./55477.js");
var i = require("./27015.js");
var o = require("./8275.js");
var a = require("./24012.js").NATIVE_ARRAY_BUFFER_VIEWS;
var s = n.ArrayBuffer;
var u = n.Int8Array;
module.exports = !a || !i(function () {
  u(1);
}) || !i(function () {
  new u(-1);
}) || !o(function (e) {
  new u();
  new u(null);
  new u(1.5);
  new u(e);
}, true) || i(function () {
  return new u(new s(2), 1, undefined).length !== 1;
});
};
