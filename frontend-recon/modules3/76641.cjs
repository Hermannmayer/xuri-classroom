// webpack module 76641 — body from webcrack
module.exports = function (module, exports, require) {
var n = require("./60511.js");
var i = require("./74617.js");
var o = require("./21523.js");
var a = require("./83721.js");
var s = require("./59759.js");
function u(e) {
  return /^[01]{1,10}$/.test(e);
}
exports.BESSELI = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return n.value;
  } else {
    return s.besseli(e, t);
  }
};
exports.BESSELJ = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return n.value;
  } else {
    return s.besselj(e, t);
  }
};
exports.BESSELK = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return n.value;
  } else {
    return s.besselk(e, t);
  }
};
exports.BESSELY = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return n.value;
  } else {
    return s.bessely(e, t);
  }
};
exports.BIN2DEC = function (e) {
  if (!u(e)) {
    return n.num;
  }
  var t = parseInt(e, 2);
  var r = e.toString();
  if (r.length === 10 && r.substring(0, 1) === "1") {
    return parseInt(r.substring(1), 2) - 512;
  } else {
    return t;
  }
};
exports.BIN2HEX = function (e, t) {
  if (!u(e)) {
    return n.num;
  }
  var r = e.toString();
  if (r.length === 10 && r.substring(0, 1) === "1") {
    return (1099511627264 + parseInt(r.substring(1), 2)).toString(16);
  }
  var i = parseInt(e, 2).toString(16);
  if (t === undefined) {
    return i;
  } else if (isNaN(t)) {
    return n.value;
  } else if (t < 0) {
    return n.num;
  } else {
    t = Math.floor(t);
    if (t >= i.length) {
      return o.REPT("0", t - i.length) + i;
    } else {
      return n.num;
    }
  }
};
exports.BIN2OCT = function (e, t) {
  if (!u(e)) {
    return n.num;
  }
  var r = e.toString();
  if (r.length === 10 && r.substring(0, 1) === "1") {
    return (1073741312 + parseInt(r.substring(1), 2)).toString(8);
  }
  var i = parseInt(e, 2).toString(8);
  if (t === undefined) {
    return i;
  } else if (isNaN(t)) {
    return n.value;
  } else if (t < 0) {
    return n.num;
  } else {
    t = Math.floor(t);
    if (t >= i.length) {
      return o.REPT("0", t - i.length) + i;
    } else {
      return n.num;
    }
  }
};
exports.BITAND = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return n.value;
  } else if (e < 0 || t < 0 || Math.floor(e) !== e || Math.floor(t) !== t || e > 281474976710655 || t > 281474976710655) {
    return n.num;
  } else {
    return e & t;
  }
};
exports.BITLSHIFT = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return n.value;
  } else if (e < 0 || Math.floor(e) !== e || e > 281474976710655 || Math.abs(t) > 53) {
    return n.num;
  } else if (t >= 0) {
    return e << t;
  } else {
    return e >> -t;
  }
};
exports.BITOR = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return n.value;
  } else if (e < 0 || t < 0 || Math.floor(e) !== e || Math.floor(t) !== t || e > 281474976710655 || t > 281474976710655) {
    return n.num;
  } else {
    return e | t;
  }
};
exports.BITRSHIFT = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return n.value;
  } else if (e < 0 || Math.floor(e) !== e || e > 281474976710655 || Math.abs(t) > 53) {
    return n.num;
  } else if (t >= 0) {
    return e >> t;
  } else {
    return e << -t;
  }
};
exports.BITXOR = function (e, t) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return n.value;
  } else if (e < 0 || t < 0 || Math.floor(e) !== e || Math.floor(t) !== t || e > 281474976710655 || t > 281474976710655) {
    return n.num;
  } else {
    return e ^ t;
  }
};
exports.COMPLEX = function (e, t, r) {
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return e;
  }
  r = r === undefined ? "i" : r;
  if (r !== "i" && r !== "j") {
    return n.value;
  }
  if (e === 0 && t === 0) {
    return 0;
  }
  if (e === 0) {
    if (t === 1) {
      return r;
    } else {
      return t.toString() + r;
    }
  }
  if (t === 0) {
    return e.toString();
  }
  var i = t > 0 ? "+" : "";
  return e.toString() + i + (t === 1 ? r : t.toString() + r);
};
exports.CONVERT = function (e, t, r) {
  e = a.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  var i;
  for (var o = [["a.u. of action", "?", null, "action", false, false, 1.05457168181818e-34], ["a.u. of charge", "e", null, "electric_charge", false, false, 1.60217653141414e-19], ["a.u. of energy", "Eh", null, "energy", false, false, 4.35974417757576e-18], ["a.u. of length", "a?", null, "length", false, false, 5.29177210818182e-11], ["a.u. of mass", "m?", null, "mass", false, false, 9.10938261616162e-31], ["a.u. of time", "?/Eh", null, "time", false, false, 2.41888432650516e-17], ["admiralty knot", "admkn", null, "speed", false, true, 0.514773333], ["ampere", "A", null, "electric_current", true, false, 1], ["ampere per meter", "A/m", null, "magnetic_field_intensity", true, false, 1], ["ångström", "Å", ["ang"], "length", false, true, 1e-10], ["are", "ar", null, "area", false, true, 100], ["astronomical unit", "ua", null, "length", false, false, 1.49597870691667e-11], ["bar", "bar", null, "pressure", false, false, 100000], ["barn", "b", null, "area", false, false, 1e-28], ["becquerel", "Bq", null, "radioactivity", true, false, 1], ["bit", "bit", ["b"], "information", false, true, 1], ["btu", "BTU", ["btu"], "energy", false, true, 1055.05585262], ["byte", "byte", null, "information", false, true, 8], ["candela", "cd", null, "luminous_intensity", true, false, 1], ["candela per square metre", "cd/m?", null, "luminance", true, false, 1], ["coulomb", "C", null, "electric_charge", true, false, 1], ["cubic ångström", "ang3", ["ang^3"], "volume", false, true, 1e-30], ["cubic foot", "ft3", ["ft^3"], "volume", false, true, 0.028316846592], ["cubic inch", "in3", ["in^3"], "volume", false, true, 0.000016387064], ["cubic light-year", "ly3", ["ly^3"], "volume", false, true, 8.46786664623715e-47], ["cubic metre", "m?", null, "volume", true, true, 1], ["cubic mile", "mi3", ["mi^3"], "volume", false, true, 4168181825.44058], ["cubic nautical mile", "Nmi3", ["Nmi^3"], "volume", false, true, 6352182208], ["cubic Pica", "Pica3", ["Picapt3", "Pica^3", "Picapt^3"], "volume", false, true, 7.58660370370369e-8], ["cubic yard", "yd3", ["yd^3"], "volume", false, true, 0.764554857984], ["cup", "cup", null, "volume", false, true, 0.0002365882365], ["dalton", "Da", ["u"], "mass", false, false, 1.66053886282828e-27], ["day", "d", ["day"], "time", false, true, 86400], ["degree", "°", null, "angle", false, false, 0.0174532925199433], ["degrees Rankine", "Rank", null, "temperature", false, true, 0.555555555555556], ["dyne", "dyn", ["dy"], "force", false, true, 0.00001], ["electronvolt", "eV", ["ev"], "energy", false, true, 1.60217656514141], ["ell", "ell", null, "length", false, true, 1.143], ["erg", "erg", ["e"], "energy", false, true, 1e-7], ["farad", "F", null, "electric_capacitance", true, false, 1], ["fluid ounce", "oz", null, "volume", false, true, 0.0000295735295625], ["foot", "ft", null, "length", false, true, 0.3048], ["foot-pound", "flb", null, "energy", false, true, 1.3558179483314], ["gal", "Gal", null, "acceleration", false, false, 0.01], ["gallon", "gal", null, "volume", false, true, 0.003785411784], ["gauss", "G", ["ga"], "magnetic_flux_density", false, true, 1], ["grain", "grain", null, "mass", false, true, 0.0000647989], ["gram", "g", null, "mass", false, true, 0.001], ["gray", "Gy", null, "absorbed_dose", true, false, 1], ["gross registered ton", "GRT", ["regton"], "volume", false, true, 2.8316846592], ["hectare", "ha", null, "area", false, true, 10000], ["henry", "H", null, "inductance", true, false, 1], ["hertz", "Hz", null, "frequency", true, false, 1], ["horsepower", "HP", ["h"], "power", false, true, 745.69987158227], ["horsepower-hour", "HPh", ["hh", "hph"], "energy", false, true, 2684519.538], ["hour", "h", ["hr"], "time", false, true, 3600], ["imperial gallon (U.K.)", "uk_gal", null, "volume", false, true, 0.00454609], ["imperial hundredweight", "lcwt", ["uk_cwt", "hweight"], "mass", false, true, 50.802345], ["imperial quart (U.K)", "uk_qt", null, "volume", false, true, 0.0011365225], ["imperial ton", "brton", ["uk_ton", "LTON"], "mass", false, true, 1016.046909], ["inch", "in", null, "length", false, true, 0.0254], ["international acre", "uk_acre", null, "area", false, true, 4046.8564224], ["IT calorie", "cal", null, "energy", false, true, 4.1868], ["joule", "J", null, "energy", true, true, 1], ["katal", "kat", null, "catalytic_activity", true, false, 1], ["kelvin", "K", ["kel"], "temperature", true, true, 1], ["kilogram", "kg", null, "mass", true, true, 1], ["knot", "kn", null, "speed", false, true, 0.514444444444444], ["light-year", "ly", null, "length", false, true, 9460730472580800], ["litre", "L", ["l", "lt"], "volume", false, true, 0.001], ["lumen", "lm", null, "luminous_flux", true, false, 1], ["lux", "lx", null, "illuminance", true, false, 1], ["maxwell", "Mx", null, "magnetic_flux", false, false, 1e-18], ["measurement ton", "MTON", null, "volume", false, true, 1.13267386368], ["meter per hour", "m/h", ["m/hr"], "speed", false, true, 0.00027777777777778], ["meter per second", "m/s", ["m/sec"], "speed", true, true, 1], ["meter per second squared", "m?s??", null, "acceleration", true, false, 1], ["parsec", "pc", ["parsec"], "length", false, true, 30856775814671900], ["meter squared per second", "m?/s", null, "kinematic_viscosity", true, false, 1], ["metre", "m", null, "length", true, true, 1], ["miles per hour", "mph", null, "speed", false, true, 0.44704], ["millimetre of mercury", "mmHg", null, "pressure", false, false, 133.322], ["minute", "?", null, "angle", false, false, 0.000290888208665722], ["minute", "min", ["mn"], "time", false, true, 60], ["modern teaspoon", "tspm", null, "volume", false, true, 0.000005], ["mole", "mol", null, "amount_of_substance", true, false, 1], ["morgen", "Morgen", null, "area", false, true, 2500], ["n.u. of action", "?", null, "action", false, false, 1.05457168181818e-34], ["n.u. of mass", "m?", null, "mass", false, false, 9.10938261616162e-31], ["n.u. of speed", "c?", null, "speed", false, false, 299792458], ["n.u. of time", "?/(me?c??)", null, "time", false, false, 1.28808866778687e-21], ["nautical mile", "M", ["Nmi"], "length", false, true, 1852], ["newton", "N", null, "force", true, true, 1], ["œrsted", "Oe ", null, "magnetic_field_intensity", false, false, 79.5774715459477], ["ohm", "Ω", null, "electric_resistance", true, false, 1], ["ounce mass", "ozm", null, "mass", false, true, 0.028349523125], ["pascal", "Pa", null, "pressure", true, false, 1], ["pascal second", "Pa?s", null, "dynamic_viscosity", true, false, 1], ["pferdestärke", "PS", null, "power", false, true, 735.49875], ["phot", "ph", null, "illuminance", false, false, 0.0001], ["pica (1/6 inch)", "pica", null, "length", false, true, 0.00035277777777778], ["pica (1/72 inch)", "Pica", ["Picapt"], "length", false, true, 0.00423333333333333], ["poise", "P", null, "dynamic_viscosity", false, false, 0.1], ["pond", "pond", null, "force", false, true, 0.00980665], ["pound force", "lbf", null, "force", false, true, 4.4482216152605], ["pound mass", "lbm", null, "mass", false, true, 0.45359237], ["quart", "qt", null, "volume", false, true, 0.000946352946], ["radian", "rad", null, "angle", true, false, 1], ["second", "?", null, "angle", false, false, 0.00000484813681109536], ["second", "s", ["sec"], "time", true, true, 1], ["short hundredweight", "cwt", ["shweight"], "mass", false, true, 45.359237], ["siemens", "S", null, "electrical_conductance", true, false, 1], ["sievert", "Sv", null, "equivalent_dose", true, false, 1], ["slug", "sg", null, "mass", false, true, 14.59390294], ["square ångström", "ang2", ["ang^2"], "area", false, true, 1e-20], ["square foot", "ft2", ["ft^2"], "area", false, true, 0.09290304], ["square inch", "in2", ["in^2"], "area", false, true, 0.00064516], ["square light-year", "ly2", ["ly^2"], "area", false, true, 8.95054210748189e+31], ["square meter", "m?", null, "area", true, true, 1], ["square mile", "mi2", ["mi^2"], "area", false, true, 2589988.110336], ["square nautical mile", "Nmi2", ["Nmi^2"], "area", false, true, 3429904], ["square Pica", "Pica2", ["Picapt2", "Pica^2", "Picapt^2"], "area", false, true, 0.00001792111111111], ["square yard", "yd2", ["yd^2"], "area", false, true, 0.83612736], ["statute mile", "mi", null, "length", false, true, 1609.344], ["steradian", "sr", null, "solid_angle", true, false, 1], ["stilb", "sb", null, "luminance", false, false, 0.0001], ["stokes", "St", null, "kinematic_viscosity", false, false, 0.0001], ["stone", "stone", null, "mass", false, true, 6.35029318], ["tablespoon", "tbs", null, "volume", false, true, 0.0000147868], ["teaspoon", "tsp", null, "volume", false, true, 0.00000492892], ["tesla", "T", null, "magnetic_flux_density", true, true, 1], ["thermodynamic calorie", "c", null, "energy", false, true, 4.184], ["ton", "ton", null, "mass", false, true, 907.18474], ["tonne", "t", null, "mass", false, false, 1000], ["U.K. pint", "uk_pt", null, "volume", false, true, 0.00056826125], ["U.S. bushel", "bushel", null, "volume", false, true, 0.03523907], ["U.S. oil barrel", "barrel", null, "volume", false, true, 0.158987295], ["U.S. pint", "pt", ["us_pt"], "volume", false, true, 0.000473176473], ["U.S. survey mile", "survey_mi", null, "length", false, true, 1609.347219], ["U.S. survey/statute acre", "us_acre", null, "area", false, true, 4046.87261], ["volt", "V", null, "voltage", true, false, 1], ["watt", "W", null, "power", true, true, 1], ["watt-hour", "Wh", ["wh"], "energy", false, true, 3600], ["weber", "Wb", null, "magnetic_flux", true, false, 1], ["yard", "yd", null, "length", false, true, 0.9144], ["year", "yr", null, "time", false, true, 31557600]], s = {
      Yi: ["yobi", 80, 1.2089258196146292e+24, "Yi", "yotta"],
      Zi: ["zebi", 70, 1.1805916207174113e+21, "Zi", "zetta"],
      Ei: ["exbi", 60, 1152921504606847000, "Ei", "exa"],
      Pi: ["pebi", 50, 1125899906842624, "Pi", "peta"],
      Ti: ["tebi", 40, 1099511627776, "Ti", "tera"],
      Gi: ["gibi", 30, 1073741824, "Gi", "giga"],
      Mi: ["mebi", 20, 1048576, "Mi", "mega"],
      ki: ["kibi", 10, 1024, "ki", "kilo"]
    }, u = {
      Y: ["yotta", 1e+24, "Y"],
      Z: ["zetta", 1e+21, "Z"],
      E: ["exa", 1000000000000000000, "E"],
      P: ["peta", 1000000000000000, "P"],
      T: ["tera", 1000000000000, "T"],
      G: ["giga", 1000000000, "G"],
      M: ["mega", 1000000, "M"],
      k: ["kilo", 1000, "k"],
      h: ["hecto", 100, "h"],
      e: ["dekao", 10, "e"],
      d: ["deci", 0.1, "d"],
      c: ["centi", 0.01, "c"],
      m: ["milli", 0.001, "m"],
      u: ["micro", 0.000001, "u"],
      n: ["nano", 1e-9, "n"],
      p: ["pico", 1e-12, "p"],
      f: ["femto", 1e-15, "f"],
      a: ["atto", 1e-18, "a"],
      z: ["zepto", 1e-21, "z"],
      y: ["yocto", 1e-24, "y"]
    }, l = null, c = null, p = t, d = r, f = 1, g = 1, m = 0; m < o.length; m++) {
    i = o[m][2] === null ? [] : o[m][2];
    if (o[m][1] === p || i.indexOf(p) >= 0) {
      l = o[m];
    }
    if (o[m][1] === d || i.indexOf(d) >= 0) {
      c = o[m];
    }
  }
  if (l === null) {
    var v = s[t.substring(0, 2)];
    var y = u[t.substring(0, 1)];
    if (t.substring(0, 2) === "da") {
      y = ["dekao", 10, "da"];
    }
    if (v) {
      f = v[2];
      p = t.substring(2);
    } else if (y) {
      f = y[1];
      p = t.substring(y[2].length);
    }
    for (var h = 0; h < o.length; h++) {
      i = o[h][2] === null ? [] : o[h][2];
      if (o[h][1] === p || i.indexOf(p) >= 0) {
        l = o[h];
      }
    }
  }
  if (c === null) {
    var b = s[r.substring(0, 2)];
    var w = u[r.substring(0, 1)];
    if (r.substring(0, 2) === "da") {
      w = ["dekao", 10, "da"];
    }
    if (b) {
      g = b[2];
      d = r.substring(2);
    } else if (w) {
      g = w[1];
      d = r.substring(w[2].length);
    }
    for (var x = 0; x < o.length; x++) {
      i = o[x][2] === null ? [] : o[x][2];
      if (o[x][1] === d || i.indexOf(d) >= 0) {
        c = o[x];
      }
    }
  }
  if (l === null || c === null || l[3] !== c[3]) {
    return n.na;
  } else {
    return e * l[6] * f / (c[6] * g);
  }
};
exports.DEC2BIN = function (e, t) {
  e = a.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  if (!/^-?[0-9]{1,3}$/.test(e) || e < -512 || e > 511) {
    return n.num;
  }
  if (e < 0) {
    return "1" + o.REPT("0", 9 - (512 + e).toString(2).length) + (512 + e).toString(2);
  }
  var r = parseInt(e, 10).toString(2);
  if (typeof t === "undefined") {
    return r;
  } else if (isNaN(t)) {
    return n.value;
  } else if (t < 0) {
    return n.num;
  } else {
    t = Math.floor(t);
    if (t >= r.length) {
      return o.REPT("0", t - r.length) + r;
    } else {
      return n.num;
    }
  }
};
exports.DEC2HEX = function (e, t) {
  e = a.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  if (!/^-?[0-9]{1,12}$/.test(e) || e < -549755813888 || e > 549755813887) {
    return n.num;
  }
  if (e < 0) {
    return (1099511627776 + e).toString(16);
  }
  var r = parseInt(e, 10).toString(16);
  if (typeof t === "undefined") {
    return r;
  } else if (isNaN(t)) {
    return n.value;
  } else if (t < 0) {
    return n.num;
  } else {
    t = Math.floor(t);
    if (t >= r.length) {
      return o.REPT("0", t - r.length) + r;
    } else {
      return n.num;
    }
  }
};
exports.DEC2OCT = function (e, t) {
  e = a.parseNumber(e);
  if (e instanceof Error) {
    return e;
  }
  if (!/^-?[0-9]{1,9}$/.test(e) || e < -536870912 || e > 536870911) {
    return n.num;
  }
  if (e < 0) {
    return (1073741824 + e).toString(8);
  }
  var r = parseInt(e, 10).toString(8);
  if (typeof t === "undefined") {
    return r;
  } else if (isNaN(t)) {
    return n.value;
  } else if (t < 0) {
    return n.num;
  } else {
    t = Math.floor(t);
    if (t >= r.length) {
      return o.REPT("0", t - r.length) + r;
    } else {
      return n.num;
    }
  }
};
exports.DELTA = function (e, t) {
  t = t === undefined ? 0 : t;
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return n.value;
  } else if (e === t) {
    return 1;
  } else {
    return 0;
  }
};
exports.ERF = function (e, t) {
  t = t === undefined ? 0 : t;
  e = a.parseNumber(e);
  t = a.parseNumber(t);
  if (a.anyIsError(e, t)) {
    return n.value;
  } else {
    return i.erf(e);
  }
};
exports.ERF.PRECISE = function () {
  throw new Error("ERF.PRECISE is not implemented");
};
exports.ERFC = function (e) {
  if (isNaN(e)) {
    return n.value;
  } else {
    return i.erfc(e);
  }
};
exports.ERFC.PRECISE = function () {
  throw new Error("ERFC.PRECISE is not implemented");
};
exports.GESTEP = function (e, t) {
  t = t || 0;
  e = a.parseNumber(e);
  if (a.anyIsError(t, e)) {
    return e;
  } else if (e >= t) {
    return 1;
  } else {
    return 0;
  }
};
exports.HEX2BIN = function (e, t) {
  if (!/^[0-9A-Fa-f]{1,10}$/.test(e)) {
    return n.num;
  }
  var r = e.length === 10 && e.substring(0, 1).toLowerCase() === "f";
  var i = r ? parseInt(e, 16) - 1099511627776 : parseInt(e, 16);
  if (i < -512 || i > 511) {
    return n.num;
  }
  if (r) {
    return "1" + o.REPT("0", 9 - (512 + i).toString(2).length) + (512 + i).toString(2);
  }
  var a = i.toString(2);
  if (t === undefined) {
    return a;
  } else if (isNaN(t)) {
    return n.value;
  } else if (t < 0) {
    return n.num;
  } else {
    t = Math.floor(t);
    if (t >= a.length) {
      return o.REPT("0", t - a.length) + a;
    } else {
      return n.num;
    }
  }
};
exports.HEX2DEC = function (e) {
  if (!/^[0-9A-Fa-f]{1,10}$/.test(e)) {
    return n.num;
  }
  var t = parseInt(e, 16);
  if (t >= 549755813888) {
    return t - 1099511627776;
  } else {
    return t;
  }
};
exports.HEX2OCT = function (e, t) {
  if (!/^[0-9A-Fa-f]{1,10}$/.test(e)) {
    return n.num;
  }
  var r = parseInt(e, 16);
  if (r > 536870911 && r < 1098974756864) {
    return n.num;
  }
  if (r >= 1098974756864) {
    return (r - 1098437885952).toString(8);
  }
  var i = r.toString(8);
  if (t === undefined) {
    return i;
  } else if (isNaN(t)) {
    return n.value;
  } else if (t < 0) {
    return n.num;
  } else {
    t = Math.floor(t);
    if (t >= i.length) {
      return o.REPT("0", t - i.length) + i;
    } else {
      return n.num;
    }
  }
};
exports.IMABS = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  } else {
    return Math.sqrt(Math.pow(r, 2) + Math.pow(i, 2));
  }
};
exports.IMAGINARY = function (e) {
  if (e === undefined || e === true || e === false) {
    return n.value;
  }
  if (e === 0 || e === "0") {
    return 0;
  }
  if (["i", "j"].indexOf(e) >= 0) {
    return 1;
  }
  e += "";
  e = e.replace("+i", "+1i").replace("-i", "-1i").replace("+j", "+1j").replace("-j", "-1j");
  var t = e.indexOf("+");
  var r = e.indexOf("-");
  if (t === 0) {
    t = e.indexOf("+", 1);
  }
  if (r === 0) {
    r = e.indexOf("-", 1);
  }
  var i = e.substring(e.length - 1, e.length);
  var o = i === "i" || i === "j";
  if (t >= 0 || r >= 0) {
    if (o) {
      if (t >= 0) {
        if (isNaN(e.substring(0, t)) || isNaN(e.substring(t + 1, e.length - 1))) {
          return n.num;
        } else {
          return Number(e.substring(t + 1, e.length - 1));
        }
      } else if (isNaN(e.substring(0, r)) || isNaN(e.substring(r + 1, e.length - 1))) {
        return n.num;
      } else {
        return -Number(e.substring(r + 1, e.length - 1));
      }
    } else {
      return n.num;
    }
  } else if (o) {
    if (isNaN(e.substring(0, e.length - 1))) {
      return n.num;
    } else {
      return e.substring(0, e.length - 1);
    }
  } else if (isNaN(e)) {
    return n.num;
  } else {
    return 0;
  }
};
exports.IMARGUMENT = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  } else if (r === 0 && i === 0) {
    return n.div0;
  } else if (r === 0 && i > 0) {
    return Math.PI / 2;
  } else if (r === 0 && i < 0) {
    return -Math.PI / 2;
  } else if (i === 0 && r > 0) {
    return 0;
  } else if (i === 0 && r < 0) {
    return -Math.PI;
  } else if (r > 0) {
    return Math.atan(i / r);
  } else if (r < 0 && i >= 0) {
    return Math.atan(i / r) + Math.PI;
  } else {
    return Math.atan(i / r) - Math.PI;
  }
};
exports.IMCONJUGATE = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  }
  var o = e.substring(e.length - 1);
  o = o === "i" || o === "j" ? o : "i";
  if (i !== 0) {
    return exports.COMPLEX(r, -i, o);
  } else {
    return e;
  }
};
exports.IMCOS = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  }
  var o = e.substring(e.length - 1);
  o = o === "i" || o === "j" ? o : "i";
  return exports.COMPLEX(Math.cos(r) * (Math.exp(i) + Math.exp(-i)) / 2, -Math.sin(r) * (Math.exp(i) - Math.exp(-i)) / 2, o);
};
exports.IMCOSH = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  }
  var o = e.substring(e.length - 1);
  o = o === "i" || o === "j" ? o : "i";
  return exports.COMPLEX(Math.cos(i) * (Math.exp(r) + Math.exp(-r)) / 2, Math.sin(i) * (Math.exp(r) - Math.exp(-r)) / 2, o);
};
exports.IMCOT = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  } else {
    return exports.IMDIV(exports.IMCOS(e), exports.IMSIN(e));
  }
};
exports.IMDIV = function (e, r) {
  var i = exports.IMREAL(e);
  var o = exports.IMAGINARY(e);
  var s = exports.IMREAL(r);
  var u = exports.IMAGINARY(r);
  if (a.anyIsError(i, o, s, u)) {
    return n.value;
  }
  var l = e.substring(e.length - 1);
  var c = r.substring(r.length - 1);
  var p = "i";
  if (l === "j" || c === "j") {
    p = "j";
  }
  if (s === 0 && u === 0) {
    return n.num;
  }
  var d = s * s + u * u;
  return exports.COMPLEX((i * s + o * u) / d, (o * s - i * u) / d, p);
};
exports.IMEXP = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  }
  var o = e.substring(e.length - 1);
  o = o === "i" || o === "j" ? o : "i";
  var s = Math.exp(r);
  return exports.COMPLEX(s * Math.cos(i), s * Math.sin(i), o);
};
exports.IMLN = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  }
  var o = e.substring(e.length - 1);
  o = o === "i" || o === "j" ? o : "i";
  return exports.COMPLEX(Math.log(Math.sqrt(r * r + i * i)), Math.atan(i / r), o);
};
exports.IMLOG10 = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  }
  var o = e.substring(e.length - 1);
  o = o === "i" || o === "j" ? o : "i";
  return exports.COMPLEX(Math.log(Math.sqrt(r * r + i * i)) / Math.log(10), Math.atan(i / r) / Math.log(10), o);
};
exports.IMLOG2 = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  }
  var o = e.substring(e.length - 1);
  o = o === "i" || o === "j" ? o : "i";
  return exports.COMPLEX(Math.log(Math.sqrt(r * r + i * i)) / Math.log(2), Math.atan(i / r) / Math.log(2), o);
};
exports.IMPOWER = function (e, r) {
  r = a.parseNumber(r);
  var i = exports.IMREAL(e);
  var o = exports.IMAGINARY(e);
  if (a.anyIsError(r, i, o)) {
    return n.value;
  }
  var s = e.substring(e.length - 1);
  s = s === "i" || s === "j" ? s : "i";
  var u = Math.pow(exports.IMABS(e), r);
  var l = exports.IMARGUMENT(e);
  return exports.COMPLEX(u * Math.cos(r * l), u * Math.sin(r * l), s);
};
exports.IMPRODUCT = function () {
  var e = arguments[0];
  if (!arguments.length) {
    return n.value;
  }
  for (var r = 1; r < arguments.length; r++) {
    var i = exports.IMREAL(e);
    var o = exports.IMAGINARY(e);
    var s = exports.IMREAL(arguments[r]);
    var u = exports.IMAGINARY(arguments[r]);
    if (a.anyIsError(i, o, s, u)) {
      return n.value;
    }
    e = exports.COMPLEX(i * s - o * u, i * u + o * s);
  }
  return e;
};
exports.IMREAL = function (e) {
  if (e === undefined || e === true || e === false) {
    return n.value;
  }
  if (e === 0 || e === "0") {
    return 0;
  }
  if (["i", "+i", "1i", "+1i", "-i", "-1i", "j", "+j", "1j", "+1j", "-j", "-1j"].indexOf(e) >= 0) {
    return 0;
  }
  e += "";
  var t = e.indexOf("+");
  var r = e.indexOf("-");
  if (t === 0) {
    t = e.indexOf("+", 1);
  }
  if (r === 0) {
    r = e.indexOf("-", 1);
  }
  var i = e.substring(e.length - 1, e.length);
  var o = i === "i" || i === "j";
  if (t >= 0 || r >= 0) {
    if (o) {
      if (t >= 0) {
        if (isNaN(e.substring(0, t)) || isNaN(e.substring(t + 1, e.length - 1))) {
          return n.num;
        } else {
          return Number(e.substring(0, t));
        }
      } else if (isNaN(e.substring(0, r)) || isNaN(e.substring(r + 1, e.length - 1))) {
        return n.num;
      } else {
        return Number(e.substring(0, r));
      }
    } else {
      return n.num;
    }
  } else if (o) {
    if (isNaN(e.substring(0, e.length - 1))) {
      return n.num;
    } else {
      return 0;
    }
  } else if (isNaN(e)) {
    return n.num;
  } else {
    return e;
  }
};
exports.IMSEC = function (e) {
  if (e === true || e === false) {
    return n.value;
  }
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  } else {
    return exports.IMDIV("1", exports.IMCOS(e));
  }
};
exports.IMSECH = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  } else {
    return exports.IMDIV("1", exports.IMCOSH(e));
  }
};
exports.IMSIN = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  }
  var o = e.substring(e.length - 1);
  o = o === "i" || o === "j" ? o : "i";
  return exports.COMPLEX(Math.sin(r) * (Math.exp(i) + Math.exp(-i)) / 2, Math.cos(r) * (Math.exp(i) - Math.exp(-i)) / 2, o);
};
exports.IMSINH = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  }
  var o = e.substring(e.length - 1);
  o = o === "i" || o === "j" ? o : "i";
  return exports.COMPLEX(Math.cos(i) * (Math.exp(r) - Math.exp(-r)) / 2, Math.sin(i) * (Math.exp(r) + Math.exp(-r)) / 2, o);
};
exports.IMSQRT = function (e) {
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  }
  var o = e.substring(e.length - 1);
  o = o === "i" || o === "j" ? o : "i";
  var s = Math.sqrt(exports.IMABS(e));
  var u = exports.IMARGUMENT(e);
  return exports.COMPLEX(s * Math.cos(u / 2), s * Math.sin(u / 2), o);
};
exports.IMCSC = function (e) {
  if (e === true || e === false) {
    return n.value;
  }
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.num;
  } else {
    return exports.IMDIV("1", exports.IMSIN(e));
  }
};
exports.IMCSCH = function (e) {
  if (e === true || e === false) {
    return n.value;
  }
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.num;
  } else {
    return exports.IMDIV("1", exports.IMSINH(e));
  }
};
exports.IMSUB = function (e, t) {
  var r = this.IMREAL(e);
  var i = this.IMAGINARY(e);
  var o = this.IMREAL(t);
  var s = this.IMAGINARY(t);
  if (a.anyIsError(r, i, o, s)) {
    return n.value;
  }
  var u = e.substring(e.length - 1);
  var l = t.substring(t.length - 1);
  var c = "i";
  if (u === "j" || l === "j") {
    c = "j";
  }
  return this.COMPLEX(r - o, i - s, c);
};
exports.IMSUM = function () {
  if (!arguments.length) {
    return n.value;
  }
  for (var e = a.flatten(arguments), t = e[0], r = 1; r < e.length; r++) {
    var i = this.IMREAL(t);
    var o = this.IMAGINARY(t);
    var s = this.IMREAL(e[r]);
    var u = this.IMAGINARY(e[r]);
    if (a.anyIsError(i, o, s, u)) {
      return n.value;
    }
    t = this.COMPLEX(i + s, o + u);
  }
  return t;
};
exports.IMTAN = function (e) {
  if (e === true || e === false) {
    return n.value;
  }
  var r = exports.IMREAL(e);
  var i = exports.IMAGINARY(e);
  if (a.anyIsError(r, i)) {
    return n.value;
  } else {
    return this.IMDIV(this.IMSIN(e), this.IMCOS(e));
  }
};
exports.OCT2BIN = function (e, t) {
  if (!/^[0-7]{1,10}$/.test(e)) {
    return n.num;
  }
  var r = e.length === 10 && e.substring(0, 1) === "7";
  var i = r ? parseInt(e, 8) - 1073741824 : parseInt(e, 8);
  if (i < -512 || i > 511) {
    return n.num;
  }
  if (r) {
    return "1" + o.REPT("0", 9 - (512 + i).toString(2).length) + (512 + i).toString(2);
  }
  var a = i.toString(2);
  if (typeof t === "undefined") {
    return a;
  } else if (isNaN(t)) {
    return n.value;
  } else if (t < 0) {
    return n.num;
  } else {
    t = Math.floor(t);
    if (t >= a.length) {
      return o.REPT("0", t - a.length) + a;
    } else {
      return n.num;
    }
  }
};
exports.OCT2DEC = function (e) {
  if (!/^[0-7]{1,10}$/.test(e)) {
    return n.num;
  }
  var t = parseInt(e, 8);
  if (t >= 536870912) {
    return t - 1073741824;
  } else {
    return t;
  }
};
exports.OCT2HEX = function (e, t) {
  if (!/^[0-7]{1,10}$/.test(e)) {
    return n.num;
  }
  var r = parseInt(e, 8);
  if (r >= 536870912) {
    return "ff" + (r + 3221225472).toString(16);
  }
  var i = r.toString(16);
  if (t === undefined) {
    return i;
  } else if (isNaN(t)) {
    return n.value;
  } else if (t < 0) {
    return n.num;
  } else {
    t = Math.floor(t);
    if (t >= i.length) {
      return o.REPT("0", t - i.length) + i;
    } else {
      return n.num;
    }
  }
};
};
