// webpack module 60730 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = function (e) {
  if (typeof e != "function") {
    throw TypeError(String(e) + " is not a function");
  }
  return e;
};
};
