// webpack module 54175 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./27015.js");
var i = require("./55878.js");
var o = require("./57965.js");
var a = i("iterator");
module.exports = !n(function () {
  var e = new URL("b?a=1&b=2&c=3", "http://a");
  var t = e.searchParams;
  var r = "";
  e.pathname = "c%20d";
  t.forEach(function (e, n) {
    t.delete("b");
    r += n + e;
  });
  return o && !e.toJSON || !t.sort || e.href !== "http://a/c%20d?a=1&c=3" || t.get("c") !== "3" || String(new URLSearchParams("?a=1")) !== "a=1" || !t[a] || new URL("https://a@b").username !== "a" || new URLSearchParams(new URLSearchParams("a=b")).get("a") !== "b" || new URL("http://тест").host !== "xn--e1aybc" || new URL("http://a#б").hash !== "#%D0%B1" || r !== "a1c3" || new URL("http://x", undefined).host !== "x";
});
};
