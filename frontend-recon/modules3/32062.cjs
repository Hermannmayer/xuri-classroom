// webpack module 32062 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./22767.js");
var i = require("./59496.js");
exports.useSubscription = function (e) {
  var t = e.getCurrentValue;
  var r = e.subscribe;
  var o = i.useState(function () {
    return {
      getCurrentValue: t,
      subscribe: r,
      value: t()
    };
  });
  e = o[0];
  var a = o[1];
  o = e.value;
  if (e.getCurrentValue !== t || e.subscribe !== r) {
    o = t();
    a({
      getCurrentValue: t,
      subscribe: r,
      value: o
    });
  }
  i.useDebugValue(o);
  i.useEffect(function () {
    function e() {
      if (!i) {
        var e = t();
        a(function (i) {
          if (i.getCurrentValue !== t || i.subscribe !== r || i.value === e) {
            return i;
          } else {
            return n({}, i, {
              value: e
            });
          }
        });
      }
    }
    var i = false;
    var o = r(e);
    e();
    return function () {
      i = true;
      o();
    };
  }, [t, r]);
  return o;
};
};
