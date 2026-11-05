// webpack module 54525 — body from webcrack
module.exports = function (module, exports, require) {
var t = "%[a-f0-9]{2}";
var r = new RegExp("(" + t + ")|([^%]+?)", "gi");
var n = new RegExp("(" + t + ")+", "gi");
function i(e, t) {
  try {
    return [decodeURIComponent(e.join(""))];
  } catch (o) {}
  if (e.length === 1) {
    return e;
  }
  t = t || 1;
  var r = e.slice(0, t);
  var n = e.slice(t);
  return Array.prototype.concat.call([], i(r), i(n));
}
function o(e) {
  try {
    return decodeURIComponent(e);
  } catch (o) {
    for (var t = e.match(r) || [], n = 1; n < t.length; n++) {
      e = i(t, n).join("");
      t = e.match(r) || [];
    }
    return e;
  }
}
function a(e) {
  var t = {
    "%FE%FF": "��",
    "%FF%FE": "��"
  };
  var r = n.exec(e);
  while (r) {
    try {
      t[r[0]] = decodeURIComponent(r[0]);
    } catch (l) {
      var i = o(r[0]);
      if (i !== r[0]) {
        t[r[0]] = i;
      }
    }
    r = n.exec(e);
  }
  t["%C2"] = "�";
  for (var a = Object.keys(t), s = 0; s < a.length; s++) {
    var u = a[s];
    e = e.replace(new RegExp(u, "g"), t[u]);
  }
  return e;
}
module.exports = function (e) {
  if (typeof e !== "string") {
    throw new TypeError("Expected `encodedURI` to be of type `string`, got `" + typeof e + "`");
  }
  try {
    e = e.replace(/\+/g, " ");
    return decodeURIComponent(e);
  } catch (t) {
    return a(e);
  }
};
};
