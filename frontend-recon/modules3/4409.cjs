// webpack module 4409 — body from webcrack
module.exports = function (module, exports, require) {
var n = this && this.__extends || function () {
  function e(t, r) {
    e = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (e, t) {
      e.__proto__ = t;
    } || function (e, t) {
      for (var r in t) {
        if (Object.prototype.hasOwnProperty.call(t, r)) {
          e[r] = t[r];
        }
      }
    };
    return e(t, r);
  }
  return function (t, r) {
    if (typeof r !== "function" && r !== null) {
      throw new TypeError("Class extends value " + String(r) + " is not a constructor or null");
    }
    function n() {
      this.constructor = t;
    }
    e(t, r);
    t.prototype = r === null ? Object.create(r) : (n.prototype = r.prototype, new n());
  };
}();
var i = this && this.__assign || function () {
  i = Object.assign || function (e) {
    var t;
    for (var r = 1, n = arguments.length; r < n; r++) {
      t = arguments[r];
      for (var i in t) {
        if (Object.prototype.hasOwnProperty.call(t, i)) {
          e[i] = t[i];
        }
      }
    }
    return e;
  };
  return i.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cloneNode = exports.hasChildren = exports.isDocument = exports.isDirective = exports.isComment = exports.isText = exports.isCDATA = exports.isTag = exports.Element = exports.Document = exports.CDATA = exports.NodeWithChildren = exports.ProcessingInstruction = exports.Comment = exports.Text = exports.DataNode = exports.Node = undefined;
var o = require("./13706.js");
var a = function () {
  function e() {
    this.parent = null;
    this.prev = null;
    this.next = null;
    this.startIndex = null;
    this.endIndex = null;
  }
  Object.defineProperty(e.prototype, "parentNode", {
    get: function () {
      return this.parent;
    },
    set: function (e) {
      this.parent = e;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "previousSibling", {
    get: function () {
      return this.prev;
    },
    set: function (e) {
      this.prev = e;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(e.prototype, "nextSibling", {
    get: function () {
      return this.next;
    },
    set: function (e) {
      this.next = e;
    },
    enumerable: false,
    configurable: true
  });
  e.prototype.cloneNode = function (e = false) {
    return E(this, e);
  };
  return e;
}();
exports.Node = a;
var s = function (e) {
  function t(t) {
    var r = e.call(this) || this;
    r.data = t;
    return r;
  }
  n(t, e);
  Object.defineProperty(t.prototype, "nodeValue", {
    get: function () {
      return this.data;
    },
    set: function (e) {
      this.data = e;
    },
    enumerable: false,
    configurable: true
  });
  return t;
}(a);
exports.DataNode = s;
var u = function (e) {
  function t() {
    var t = e !== null && e.apply(this, arguments) || this;
    t.type = o.ElementType.Text;
    return t;
  }
  n(t, e);
  Object.defineProperty(t.prototype, "nodeType", {
    get: function () {
      return 3;
    },
    enumerable: false,
    configurable: true
  });
  return t;
}(s);
exports.Text = u;
var l = function (e) {
  function t() {
    var t = e !== null && e.apply(this, arguments) || this;
    t.type = o.ElementType.Comment;
    return t;
  }
  n(t, e);
  Object.defineProperty(t.prototype, "nodeType", {
    get: function () {
      return 8;
    },
    enumerable: false,
    configurable: true
  });
  return t;
}(s);
exports.Comment = l;
var c = function (e) {
  function t(t, r) {
    var n = e.call(this, r) || this;
    n.name = t;
    n.type = o.ElementType.Directive;
    return n;
  }
  n(t, e);
  Object.defineProperty(t.prototype, "nodeType", {
    get: function () {
      return 1;
    },
    enumerable: false,
    configurable: true
  });
  return t;
}(s);
exports.ProcessingInstruction = c;
var p = function (e) {
  function t(t) {
    var r = e.call(this) || this;
    r.children = t;
    return r;
  }
  n(t, e);
  Object.defineProperty(t.prototype, "firstChild", {
    get: function () {
      return this.children[0] ?? null;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "lastChild", {
    get: function () {
      if (this.children.length > 0) {
        return this.children[this.children.length - 1];
      } else {
        return null;
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "childNodes", {
    get: function () {
      return this.children;
    },
    set: function (e) {
      this.children = e;
    },
    enumerable: false,
    configurable: true
  });
  return t;
}(a);
exports.NodeWithChildren = p;
var d = function (e) {
  function t() {
    var t = e !== null && e.apply(this, arguments) || this;
    t.type = o.ElementType.CDATA;
    return t;
  }
  n(t, e);
  Object.defineProperty(t.prototype, "nodeType", {
    get: function () {
      return 4;
    },
    enumerable: false,
    configurable: true
  });
  return t;
}(p);
exports.CDATA = d;
var f = function (e) {
  function t() {
    var t = e !== null && e.apply(this, arguments) || this;
    t.type = o.ElementType.Root;
    return t;
  }
  n(t, e);
  Object.defineProperty(t.prototype, "nodeType", {
    get: function () {
      return 9;
    },
    enumerable: false,
    configurable: true
  });
  return t;
}(p);
exports.Document = f;
var g = function (e) {
  function t(t, r, n = [], i = t === "script" ? o.ElementType.Script : t === "style" ? o.ElementType.Style : o.ElementType.Tag) {
    var a = e.call(this, n) || this;
    a.name = t;
    a.attribs = r;
    a.type = i;
    return a;
  }
  n(t, e);
  Object.defineProperty(t.prototype, "nodeType", {
    get: function () {
      return 1;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "tagName", {
    get: function () {
      return this.name;
    },
    set: function (e) {
      this.name = e;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(t.prototype, "attributes", {
    get: function () {
      var e = this;
      return Object.keys(this.attribs).map(function (t) {
        return {
          name: t,
          value: e.attribs[t],
          namespace: e["x-attribsNamespace"]?.[t],
          prefix: e["x-attribsPrefix"]?.[t]
        };
      });
    },
    enumerable: false,
    configurable: true
  });
  return t;
}(p);
function m(e) {
  return (0, o.isTag)(e);
}
function v(e) {
  return e.type === o.ElementType.CDATA;
}
function y(e) {
  return e.type === o.ElementType.Text;
}
function h(e) {
  return e.type === o.ElementType.Comment;
}
function b(e) {
  return e.type === o.ElementType.Directive;
}
function w(e) {
  return e.type === o.ElementType.Root;
}
function x(e) {
  return Object.prototype.hasOwnProperty.call(e, "children");
}
function E(e, t) {
  var r;
  if (t === undefined) {
    t = false;
  }
  if (y(e)) {
    r = new u(e.data);
  } else if (h(e)) {
    r = new l(e.data);
  } else if (m(e)) {
    var n = t ? k(e.children) : [];
    var o = new g(e.name, i({}, e.attribs), n);
    n.forEach(function (e) {
      return e.parent = o;
    });
    if (e.namespace != null) {
      o.namespace = e.namespace;
    }
    if (e["x-attribsNamespace"]) {
      o["x-attribsNamespace"] = i({}, e["x-attribsNamespace"]);
    }
    if (e["x-attribsPrefix"]) {
      o["x-attribsPrefix"] = i({}, e["x-attribsPrefix"]);
    }
    r = o;
  } else if (v(e)) {
    n = t ? k(e.children) : [];
    var a = new d(n);
    n.forEach(function (e) {
      return e.parent = a;
    });
    r = a;
  } else if (w(e)) {
    n = t ? k(e.children) : [];
    var s = new f(n);
    n.forEach(function (e) {
      return e.parent = s;
    });
    if (e["x-mode"]) {
      s["x-mode"] = e["x-mode"];
    }
    r = s;
  } else {
    if (!b(e)) {
      throw new Error(`Not implemented yet: ${e.type}`);
    }
    var p = new c(e.name, e.data);
    if (e["x-name"] != null) {
      p["x-name"] = e["x-name"];
      p["x-publicId"] = e["x-publicId"];
      p["x-systemId"] = e["x-systemId"];
    }
    r = p;
  }
  r.startIndex = e.startIndex;
  r.endIndex = e.endIndex;
  if (e.sourceCodeLocation != null) {
    r.sourceCodeLocation = e.sourceCodeLocation;
  }
  return r;
}
function k(e) {
  for (var t = e.map(function (e) {
      return E(e, true);
    }), r = 1; r < t.length; r++) {
    t[r].prev = t[r - 1];
    t[r - 1].next = t[r];
  }
  return t;
}
exports.Element = g;
exports.isTag = m;
exports.isCDATA = v;
exports.isText = y;
exports.isComment = h;
exports.isDirective = b;
exports.isDocument = w;
exports.hasChildren = x;
exports.cloneNode = E;
};
