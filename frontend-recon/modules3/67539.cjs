// webpack module 67539 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60511.js");
exports.CELL = function () {
  throw new Error("CELL is not implemented");
};
exports.ERROR = {};
exports.ERROR.TYPE = function (e) {
  switch (e) {
    case n.nil:
      return 1;
    case n.div0:
      return 2;
    case n.value:
      return 3;
    case n.ref:
      return 4;
    case n.name:
      return 5;
    case n.num:
      return 6;
    case n.na:
      return 7;
    case n.data:
      return 8;
  }
  return n.na;
};
exports.INFO = function () {
  throw new Error("INFO is not implemented");
};
exports.ISBLANK = function (e) {
  return e === null;
};
exports.ISBINARY = function (e) {
  return /^[01]{1,10}$/.test(e);
};
exports.ISERR = function (e) {
  return [n.value, n.ref, n.div0, n.num, n.name, n.nil].indexOf(e) >= 0 || typeof e === "number" && (isNaN(e) || !isFinite(e));
};
exports.ISERROR = function (e) {
  return exports.ISERR(e) || e === n.na;
};
exports.ISEVEN = function (e) {
  return !(Math.floor(Math.abs(e)) & 1);
};
exports.ISFORMULA = function () {
  throw new Error("ISFORMULA is not implemented");
};
exports.ISLOGICAL = function (e) {
  return e === true || e === false;
};
exports.ISNA = function (e) {
  return e === n.na;
};
exports.ISNONTEXT = function (e) {
  return typeof e !== "string";
};
exports.ISNUMBER = function (e) {
  return typeof e === "number" && !isNaN(e) && isFinite(e);
};
exports.ISODD = function (e) {
  return !!(Math.floor(Math.abs(e)) & 1);
};
exports.ISREF = function () {
  throw new Error("ISREF is not implemented");
};
exports.ISTEXT = function (e) {
  return typeof e === "string";
};
exports.N = function (e) {
  if (this.ISNUMBER(e)) {
    return e;
  } else if (e instanceof Date) {
    return e.getTime();
  } else if (e === true) {
    return 1;
  } else if (e === false) {
    return 0;
  } else if (this.ISERROR(e)) {
    return e;
  } else {
    return 0;
  }
};
exports.NA = function () {
  return n.na;
};
exports.SHEET = function () {
  throw new Error("SHEET is not implemented");
};
exports.SHEETS = function () {
  throw new Error("SHEETS is not implemented");
};
exports.TYPE = function (e) {
  if (this.ISNUMBER(e)) {
    return 1;
  } else if (this.ISTEXT(e)) {
    return 2;
  } else if (this.ISLOGICAL(e)) {
    return 4;
  } else if (this.ISERROR(e)) {
    return 16;
  } else if (Array.isArray(e)) {
    return 64;
  } else {
    return undefined;
  }
};
};
