// webpack module 74418 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  jD: function () {
    return o;
  },
  fk: function () {
    return a;
  }
});
var n;
var i = require("./67361.js");
function o() {
  return (0, i.Z)() && window.document.documentElement;
}
function a() {
  if (!o()) {
    return false;
  }
  if (n !== undefined) {
    return n;
  }
  var e = document.createElement("div");
  e.style.display = "flex";
  e.style.flexDirection = "column";
  e.style.rowGap = "1px";
  e.appendChild(document.createElement("div"));
  e.appendChild(document.createElement("div"));
  document.body.appendChild(e);
  n = e.scrollHeight === 1;
  document.body.removeChild(e);
  return n;
}
};
