// webpack module 99250 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./19341.js");
var i = require("./60730.js");
var o = require("./13093.js");
var a = require("./99112.js");
var s = require("./98199.js");
n({
  target: "Promise",
  stat: true
}, {
  allSettled: function (e) {
    var t = this;
    var r = o.f(t);
    var n = r.resolve;
    var u = r.reject;
    var l = a(function () {
      var r = i(t.resolve);
      var o = [];
      var a = 0;
      var u = 1;
      s(e, function (e) {
        var i = a++;
        var s = false;
        o.push(undefined);
        u++;
        r.call(t, e).then(function (e) {
          if (!s) {
            s = true;
            o[i] = {
              status: "fulfilled",
              value: e
            };
            if (! --u) {
              n(o);
            }
          }
        }, function (e) {
          if (!s) {
            s = true;
            o[i] = {
              status: "rejected",
              reason: e
            };
            if (! --u) {
              n(o);
            }
          }
        });
      });
      if (! --u) {
        n(o);
      }
    });
    if (l.error) {
      u(l.value);
    }
    return r.promise;
  }
});
};
