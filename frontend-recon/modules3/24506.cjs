// webpack module 24506 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./60730.js");
var o = require("./41497.js");
var a = require("./13093.js");
var s = require("./99112.js");
var u = require("./98199.js");
var l = "No one promise resolved";
n({
  target: "Promise",
  stat: true
}, {
  any: function (e) {
    var t = this;
    var r = a.f(t);
    var n = r.resolve;
    var c = r.reject;
    var p = s(function () {
      var r = i(t.resolve);
      var a = [];
      var s = 0;
      var p = 1;
      var d = false;
      u(e, function (e) {
        var i = s++;
        var u = false;
        a.push(undefined);
        p++;
        r.call(t, e).then(function (e) {
          if (!u && !d) {
            d = true;
            n(e);
          }
        }, function (e) {
          if (!u && !d) {
            u = true;
            a[i] = e;
            if (! --p) {
              c(new (o("AggregateError"))(a, l));
            }
          }
        });
      });
      if (! --p) {
        c(new (o("AggregateError"))(a, l));
      }
    });
    if (p.error) {
      c(p.value);
    }
    return r.promise;
  }
});
};
