// webpack module 27481 — body from webcrack
module.exports = function (module, exports, require) {
var n;
var i;
var o = require("./55477.js");
var a = require("./20172.js");
var s = o.process;
var u = s && s.versions;
var l = u && u.v8;
if (l) {
  n = l.split(".");
  i = n[0] + n[1];
} else if (a) {
  n = a.match(/Edge\/(\d+)/);
  if (!n || n[1] >= 74) {
    n = a.match(/Chrome\/(\d+)/);
    if (n) {
      i = n[1];
    }
  }
}
module.exports = i && +i;
};
