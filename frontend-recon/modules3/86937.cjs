// webpack module 86937 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./91612.js");
var i = require("./52009.js");
var o = require("./29916.js");
var a = require("./82025.js");
i = typeof i.default === "function" ? i.default : i;
var s = {
  lowerCaseAttributeNames: false
};
function u(e, t) {
  if (typeof e !== "string") {
    throw new TypeError("First argument must be a string");
  }
  if (e === "") {
    return [];
  } else {
    t = t || {};
    return a(i(e, t.htmlparser2 || s), t);
  }
}
u.domToReact = a;
u.htmlToDOM = i;
u.attributesToProps = o;
u.Comment = n.Comment;
u.Element = n.Element;
u.ProcessingInstruction = n.ProcessingInstruction;
u.Text = n.Text;
module.exports = u;
u.default = u;
};
