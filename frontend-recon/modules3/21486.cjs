// webpack module 21486 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  C: function () {
    return o;
  }
});
var n = {
  adjustX: 1,
  adjustY: 1
};
var i = [0, 0];
var o = {
  left: {
    points: ["cr", "cl"],
    overflow: n,
    offset: [-4, 0],
    targetOffset: i
  },
  right: {
    points: ["cl", "cr"],
    overflow: n,
    offset: [4, 0],
    targetOffset: i
  },
  top: {
    points: ["bc", "tc"],
    overflow: n,
    offset: [0, -4],
    targetOffset: i
  },
  bottom: {
    points: ["tc", "bc"],
    overflow: n,
    offset: [0, 4],
    targetOffset: i
  },
  topLeft: {
    points: ["bl", "tl"],
    overflow: n,
    offset: [0, -4],
    targetOffset: i
  },
  leftTop: {
    points: ["tr", "tl"],
    overflow: n,
    offset: [-4, 0],
    targetOffset: i
  },
  topRight: {
    points: ["br", "tr"],
    overflow: n,
    offset: [0, -4],
    targetOffset: i
  },
  rightTop: {
    points: ["tl", "tr"],
    overflow: n,
    offset: [4, 0],
    targetOffset: i
  },
  bottomRight: {
    points: ["tr", "br"],
    overflow: n,
    offset: [0, 4],
    targetOffset: i
  },
  rightBottom: {
    points: ["bl", "br"],
    overflow: n,
    offset: [4, 0],
    targetOffset: i
  },
  bottomLeft: {
    points: ["tl", "bl"],
    overflow: n,
    offset: [0, 4],
    targetOffset: i
  },
  leftBottom: {
    points: ["br", "bl"],
    overflow: n,
    offset: [-4, 0],
    targetOffset: i
  }
};
};
