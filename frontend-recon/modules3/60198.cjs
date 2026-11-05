// webpack module 60198 — body from webcrack
module.exports = function (module, exports, require) {
var r = typeof Symbol === "function" && Symbol.for;
var n = r ? Symbol.for("react.element") : 60103;
var i = r ? Symbol.for("react.portal") : 60106;
var o = r ? Symbol.for("react.fragment") : 60107;
var a = r ? Symbol.for("react.strict_mode") : 60108;
var s = r ? Symbol.for("react.profiler") : 60114;
var u = r ? Symbol.for("react.provider") : 60109;
var l = r ? Symbol.for("react.context") : 60110;
var c = r ? Symbol.for("react.async_mode") : 60111;
var p = r ? Symbol.for("react.concurrent_mode") : 60111;
var d = r ? Symbol.for("react.forward_ref") : 60112;
var f = r ? Symbol.for("react.suspense") : 60113;
var g = r ? Symbol.for("react.suspense_list") : 60120;
var m = r ? Symbol.for("react.memo") : 60115;
var v = r ? Symbol.for("react.lazy") : 60116;
var y = r ? Symbol.for("react.block") : 60121;
var h = r ? Symbol.for("react.fundamental") : 60117;
var b = r ? Symbol.for("react.responder") : 60118;
var w = r ? Symbol.for("react.scope") : 60119;
function x(e) {
  if (typeof e === "object" && e !== null) {
    var t = e.$$typeof;
    switch (t) {
      case n:
        e = e.type;
        switch (e) {
          case c:
          case p:
          case o:
          case s:
          case a:
          case f:
            return e;
          default:
            e = e && e.$$typeof;
            switch (e) {
              case l:
              case d:
              case v:
              case m:
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
function E(e) {
  return x(e) === p;
}
exports.AsyncMode = c;
exports.ConcurrentMode = p;
exports.ContextConsumer = l;
exports.ContextProvider = u;
exports.Element = n;
exports.ForwardRef = d;
exports.Fragment = o;
exports.Lazy = v;
exports.Memo = m;
exports.Portal = i;
exports.Profiler = s;
exports.StrictMode = a;
exports.Suspense = f;
exports.isAsyncMode = function (e) {
  return E(e) || x(e) === c;
};
exports.isConcurrentMode = E;
exports.isContextConsumer = function (e) {
  return x(e) === l;
};
exports.isContextProvider = function (e) {
  return x(e) === u;
};
exports.isElement = function (e) {
  return typeof e === "object" && e !== null && e.$$typeof === n;
};
exports.isForwardRef = function (e) {
  return x(e) === d;
};
exports.isFragment = function (e) {
  return x(e) === o;
};
exports.isLazy = function (e) {
  return x(e) === v;
};
exports.isMemo = function (e) {
  return x(e) === m;
};
exports.isPortal = function (e) {
  return x(e) === i;
};
exports.isProfiler = function (e) {
  return x(e) === s;
};
exports.isStrictMode = function (e) {
  return x(e) === a;
};
exports.isSuspense = function (e) {
  return x(e) === f;
};
exports.isValidElementType = function (e) {
  return typeof e === "string" || typeof e === "function" || e === o || e === p || e === s || e === a || e === f || e === g || typeof e === "object" && e !== null && (e.$$typeof === v || e.$$typeof === m || e.$$typeof === u || e.$$typeof === l || e.$$typeof === d || e.$$typeof === h || e.$$typeof === b || e.$$typeof === w || e.$$typeof === y);
};
exports.typeOf = x;
};
