// webpack module 11195 — body from webcrack
module.exports = function (module, exports, require) {
var r;
var n = Symbol.for("react.element");
var i = Symbol.for("react.portal");
var o = Symbol.for("react.fragment");
var a = Symbol.for("react.strict_mode");
var s = Symbol.for("react.profiler");
var u = Symbol.for("react.provider");
var l = Symbol.for("react.context");
var c = Symbol.for("react.server_context");
var p = Symbol.for("react.forward_ref");
var d = Symbol.for("react.suspense");
var f = Symbol.for("react.suspense_list");
var g = Symbol.for("react.memo");
var m = Symbol.for("react.lazy");
var v = Symbol.for("react.offscreen");
function y(e) {
  if (typeof e === "object" && e !== null) {
    var t = e.$$typeof;
    switch (t) {
      case n:
        e = e.type;
        switch (e) {
          case o:
          case s:
          case a:
          case d:
          case f:
            return e;
          default:
            e = e && e.$$typeof;
            switch (e) {
              case c:
              case l:
              case p:
              case m:
              case g:
              case u:
                return e;
              default:
                return t;
            }
        }
      case i:
        return t;
    }
  }
}
r = Symbol.for("react.module.reference");
exports.ContextConsumer = l;
exports.ContextProvider = u;
exports.Element = n;
exports.ForwardRef = p;
exports.Fragment = o;
exports.Lazy = m;
exports.Memo = g;
exports.Portal = i;
exports.Profiler = s;
exports.StrictMode = a;
exports.Suspense = d;
exports.SuspenseList = f;
exports.isAsyncMode = function () {
  return false;
};
exports.isConcurrentMode = function () {
  return false;
};
exports.isContextConsumer = function (e) {
  return y(e) === l;
};
exports.isContextProvider = function (e) {
  return y(e) === u;
};
exports.isElement = function (e) {
  return typeof e === "object" && e !== null && e.$$typeof === n;
};
exports.isForwardRef = function (e) {
  return y(e) === p;
};
exports.isFragment = function (e) {
  return y(e) === o;
};
exports.isLazy = function (e) {
  return y(e) === m;
};
exports.isMemo = function (e) {
  return y(e) === g;
};
exports.isPortal = function (e) {
  return y(e) === i;
};
exports.isProfiler = function (e) {
  return y(e) === s;
};
exports.isStrictMode = function (e) {
  return y(e) === a;
};
exports.isSuspense = function (e) {
  return y(e) === d;
};
exports.isSuspenseList = function (e) {
  return y(e) === f;
};
exports.isValidElementType = function (e) {
  return typeof e === "string" || typeof e === "function" || e === o || e === s || e === a || e === d || e === f || e === v || typeof e === "object" && e !== null && (e.$$typeof === m || e.$$typeof === g || e.$$typeof === u || e.$$typeof === l || e.$$typeof === p || e.$$typeof === r || e.getModuleId !== undefined);
};
exports.typeOf = y;
};
