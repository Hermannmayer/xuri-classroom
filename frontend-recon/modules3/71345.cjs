// webpack module 71345 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./13093.js");
var o = require("./99112.js");
n({
  target: "Promise",
  stat: true
}, {
  try: function (e) {
    var t = i.f(this);
    var r = o(e);
    (r.error ? t.reject : t.resolve)(r.value);
    return t.promise;
  }
});
};
