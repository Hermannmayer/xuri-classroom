// webpack module 91612 — body from webcrack
module.exports = function (module, exports, require) {
var n = this && this.__createBinding || (Object.create ? function (e, t, r, n = r) {
  var i = Object.getOwnPropertyDescriptor(t, r);
  if (!i || !!("get" in i ? !t.__esModule : i.writable || i.configurable)) {
    i = {
      enumerable: true,
      get: function () {
        return t[r];
      }
    };
  }
  Object.defineProperty(e, n, i);
} : function (e, t, r, n = r) {
  e[n] = t[r];
});
var i = this && this.__exportStar || function (e, t) {
  for (var r in e) {
    if (r !== "default" && !Object.prototype.hasOwnProperty.call(t, r)) {
      n(t, e, r);
    }
  }
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DomHandler = undefined;
var o = require("./13706.js");
var a = require("./4409.js");
i(require("./4409.js"), exports);
var s = {
  withStartIndices: false,
  withEndIndices: false,
  xmlMode: false
};
var u = function () {
  function e(e, t, r) {
    this.dom = [];
    this.root = new a.Document(this.dom);
    this.done = false;
    this.tagStack = [this.root];
    this.lastNode = null;
    this.parser = null;
    if (typeof t === "function") {
      r = t;
      t = s;
    }
    if (typeof e === "object") {
      t = e;
      e = undefined;
    }
    this.callback = e ?? null;
    this.options = t ?? s;
    this.elementCB = r ?? null;
  }
  e.prototype.onparserinit = function (e) {
    this.parser = e;
  };
  e.prototype.onreset = function () {
    this.dom = [];
    this.root = new a.Document(this.dom);
    this.done = false;
    this.tagStack = [this.root];
    this.lastNode = null;
    this.parser = null;
  };
  e.prototype.onend = function () {
    if (!this.done) {
      this.done = true;
      this.parser = null;
      this.handleCallback(null);
    }
  };
  e.prototype.onerror = function (e) {
    this.handleCallback(e);
  };
  e.prototype.onclosetag = function () {
    this.lastNode = null;
    var e = this.tagStack.pop();
    if (this.options.withEndIndices) {
      e.endIndex = this.parser.endIndex;
    }
    if (this.elementCB) {
      this.elementCB(e);
    }
  };
  e.prototype.onopentag = function (e, t) {
    var r = this.options.xmlMode ? o.ElementType.Tag : undefined;
    var n = new a.Element(e, t, undefined, r);
    this.addNode(n);
    this.tagStack.push(n);
  };
  e.prototype.ontext = function (e) {
    var t = this.lastNode;
    if (t && t.type === o.ElementType.Text) {
      t.data += e;
      if (this.options.withEndIndices) {
        t.endIndex = this.parser.endIndex;
      }
    } else {
      var r = new a.Text(e);
      this.addNode(r);
      this.lastNode = r;
    }
  };
  e.prototype.oncomment = function (e) {
    if (this.lastNode && this.lastNode.type === o.ElementType.Comment) {
      this.lastNode.data += e;
    } else {
      var t = new a.Comment(e);
      this.addNode(t);
      this.lastNode = t;
    }
  };
  e.prototype.oncommentend = function () {
    this.lastNode = null;
  };
  e.prototype.oncdatastart = function () {
    var e = new a.Text("");
    var t = new a.CDATA([e]);
    this.addNode(t);
    e.parent = t;
    this.lastNode = e;
  };
  e.prototype.oncdataend = function () {
    this.lastNode = null;
  };
  e.prototype.onprocessinginstruction = function (e, t) {
    var r = new a.ProcessingInstruction(e, t);
    this.addNode(r);
  };
  e.prototype.handleCallback = function (e) {
    if (typeof this.callback === "function") {
      this.callback(e, this.dom);
    } else if (e) {
      throw e;
    }
  };
  e.prototype.addNode = function (e) {
    var t = this.tagStack[this.tagStack.length - 1];
    var r = t.children[t.children.length - 1];
    if (this.options.withStartIndices) {
      e.startIndex = this.parser.startIndex;
    }
    if (this.options.withEndIndices) {
      e.endIndex = this.parser.endIndex;
    }
    t.children.push(e);
    if (r) {
      e.prev = r;
      r.next = e;
    }
    e.parent = t;
    this.lastNode = null;
  };
  return e;
}();
exports.DomHandler = u;
exports.default = u;
};
