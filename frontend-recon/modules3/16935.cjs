// webpack module 16935 — body from webcrack
module.exports = function (module, exports, require) {
module.exports = function () {
  var e = document.getSelection();
  if (!e.rangeCount) {
    return function () {};
  }
  var t = document.activeElement;
  var r = [];
  for (var n = 0; n < e.rangeCount; n++) {
    r.push(e.getRangeAt(n));
  }
  switch (t.tagName.toUpperCase()) {
    case "INPUT":
    case "TEXTAREA":
      t.blur();
      break;
    default:
      t = null;
      break;
  }
  e.removeAllRanges();
  return function () {
    if (e.type === "Caret") {
      e.removeAllRanges();
    }
    if (!e.rangeCount) {
      r.forEach(function (t) {
        e.addRange(t);
      });
    }
    if (t) {
      t.focus();
    }
  };
};
};
