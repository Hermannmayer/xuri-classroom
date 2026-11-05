// webpack module 10645 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = function (e) {
  return encodeURIComponent(e).replace(/[!'()*]/g, function (e) {
    return `%${e.charCodeAt(0).toString(16).toUpperCase()}`;
  });
};
};
