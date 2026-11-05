// webpack module 66261 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Z: function () {
    return l;
  }
});
var n = require("./34256.js");
var i = require("./21486.js");
var o = {
  adjustX: 1,
  adjustY: 1
};
var a = {
  adjustX: 0,
  adjustY: 0
};
var s = [0, 0];
function u(e) {
  if (typeof e === "boolean") {
    if (e) {
      return o;
    } else {
      return a;
    }
  } else {
    return (0, n.Z)((0, n.Z)({}, a), e);
  }
}
function l(e) {
  var t = e.arrowWidth;
  var r = t === undefined ? 4 : t;
  var o = e.horizontalArrowShift;
  var a = o === undefined ? 16 : o;
  var l = e.verticalArrowShift;
  var c = l === undefined ? 8 : l;
  var p = e.autoAdjustOverflow;
  var d = e.arrowPointAtCenter;
  var f = {
    left: {
      points: ["cr", "cl"],
      offset: [-4, 0]
    },
    right: {
      points: ["cl", "cr"],
      offset: [4, 0]
    },
    top: {
      points: ["bc", "tc"],
      offset: [0, -4]
    },
    bottom: {
      points: ["tc", "bc"],
      offset: [0, 4]
    },
    topLeft: {
      points: ["bl", "tc"],
      offset: [-(a + r), -4]
    },
    leftTop: {
      points: ["tr", "cl"],
      offset: [-4, -(c + r)]
    },
    topRight: {
      points: ["br", "tc"],
      offset: [a + r, -4]
    },
    rightTop: {
      points: ["tl", "cr"],
      offset: [4, -(c + r)]
    },
    bottomRight: {
      points: ["tr", "bc"],
      offset: [a + r, 4]
    },
    rightBottom: {
      points: ["bl", "cr"],
      offset: [4, c + r]
    },
    bottomLeft: {
      points: ["tl", "bc"],
      offset: [-(a + r), 4]
    },
    leftBottom: {
      points: ["br", "cl"],
      offset: [-4, c + r]
    }
  };
  Object.keys(f).forEach(function (e) {
    f[e] = d ? (0, n.Z)((0, n.Z)({}, f[e]), {
      overflow: u(p),
      targetOffset: s
    }) : (0, n.Z)((0, n.Z)({}, i.C[e]), {
      overflow: u(p)
    });
    f[e].ignoreShake = true;
  });
  return f;
}
};
