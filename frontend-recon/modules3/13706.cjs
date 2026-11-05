// webpack module 13706 — body from webcrack
module.exports = function (module, exports, require) {
var r;
function n(e) {
  return e.type === r.Tag || e.type === r.Script || e.type === r.Style;
}
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Doctype = exports.CDATA = exports.Tag = exports.Style = exports.Script = exports.Comment = exports.Directive = exports.Text = exports.Root = exports.isTag = exports.ElementType = undefined;
(function (e) {
  e.Root = "root";
  e.Text = "text";
  e.Directive = "directive";
  e.Comment = "comment";
  e.Script = "script";
  e.Style = "style";
  e.Tag = "tag";
  e.CDATA = "cdata";
  e.Doctype = "doctype";
})(r = exports.ElementType ||= {});
exports.isTag = n;
exports.Root = r.Root;
exports.Text = r.Text;
exports.Directive = r.Directive;
exports.Comment = r.Comment;
exports.Script = r.Script;
exports.Style = r.Style;
exports.Tag = r.Tag;
exports.CDATA = r.CDATA;
exports.Doctype = r.Doctype;
};
