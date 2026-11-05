// webpack module 24269 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = function (e, t) {
  if (typeof e !== "string" || typeof t !== "string") {
    throw new TypeError("Expected the arguments to be of type `string`");
  }
  if (t === "") {
    return [e];
  }
  var r = e.indexOf(t);
  if (r === -1) {
    return [e];
  } else {
    return [e.slice(0, r), e.slice(r + t.length)];
  }
};
};
