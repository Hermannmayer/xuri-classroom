// webpack module 90889 — body from webcrack
module.exports = function (module, exports, require) {
var t = String.prototype.replace;
var r = /%20/g;
var n = {
  RFC1738: "RFC1738",
  RFC3986: "RFC3986"
};
module.exports = {
  default: n.RFC3986,
  formatters: {
    RFC1738: function (e) {
      return t.call(e, r, "+");
    },
    RFC3986: function (e) {
      return String(e);
    }
  },
  RFC1738: n.RFC1738,
  RFC3986: n.RFC3986
};
};
