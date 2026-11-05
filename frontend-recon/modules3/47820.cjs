// webpack module 47820 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  y: function () {
    return Le;
  }
});
function n() {
  n = Object.assign || function (e) {
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
  return n.apply(this, arguments);
}
function i(e, t) {
  return n({
    flag: e
  }, t);
}
var o = i("[]");
var a = i("[\\d]");
var s = i("[[]]");
var u = i("()");
var l = i("{}");
var c = i("{x}");
function p() {
  p = Object.assign || function (e) {
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
  return p.apply(this, arguments);
}
function d(e, t) {
  return p({
    flag: e
  }, t);
}
var f = d("name", {
  expectNext: function (e) {
    if (this.includesContext(c)) {
      return e === f || e === A || e === E || e === w || e === h;
    } else {
      return e === v || e === A || e === M || e === E || e === C || e === h || e === O || e === x;
    }
  }
});
var g = d("*", {
  expectNext: function (e) {
    return e === v || e === T || e === x || e === M || e === A || e === C;
  }
});
var m = d("**", {
  expectNext: function (e) {
    return e === v || e === x || e === M || e === A || e === C;
  }
});
var v = d(".", {
  expectNext: function (e) {
    return e === v || e === f || e === k || e === g || e === m || e === x || e === b || e === M;
  },
  expectPrev: function (e) {
    return e === v || e === f || e === S || e === g || e === C || e === E || e === O || e === w;
  }
});
var y = d("!", {
  expectNext: function (e) {
    return e === f || e === k;
  }
});
var h = d(":", {
  expectNext: function (e) {
    if (this.includesContext(c)) {
      return e === f || e === b || e === x;
    } else {
      return e === f || e === k || e === E;
    }
  }
});
var b = d("{", {
  expectNext: function (e) {
    return e === f;
  },
  expectPrev: function (e) {
    if (this.includesContext(c)) {
      return e === h || e === A || e === x;
    } else {
      return e === v || e === h || e === T;
    }
  },
  updateContext: function () {
    this.state.context.push(l);
  }
});
var w = d("}", {
  expectNext: function (e) {
    if (this.includesContext(c)) {
      return e === A || e === w || e === M || e === E;
    } else {
      return e === v || e === M || e === A;
    }
  },
  expectPrev: function (e) {
    return e === f || e === w || e === E;
  },
  updateContext: function () {
    this.state.context.pop(l);
  }
});
var x = d("[", {
  expectNext: function (e) {
    if (this.includesContext(c)) {
      return e === f || e === x || e === b || e === E;
    } else {
      return e === f || e === k || e === h || e === x || e === _ || e === E;
    }
  },
  expectPrev: function (e) {
    if (this.includesContext(c)) {
      return e === h || e === A || e === x;
    } else {
      return e === g || e === x || e === v || e === f || e === T || e == A;
    }
  },
  updateContext: function () {
    this.state.context.push(o);
  }
});
var E = d("]", {
  expectNext: function (e) {
    if (this.includesContext(c)) {
      return e === A || e === w || e === E || e === M;
    } else {
      return e === v || e === M || e === A || e === C || e === E;
    }
  },
  updateContext: function () {
    if (!this.includesContext(a)) {
      if (!this.includesContext(o)) {
        throw this.unexpect();
      }
      this.state.context.pop();
    }
  }
});
var k = d("[[", {
  updateContext: function () {
    this.state.context.push(s);
  }
});
var S = d("]]", {
  updateContext: function () {
    if (this.curContext() !== s) {
      throw this.unexpect();
    }
    this.state.context.pop();
  }
});
var T = d("(", {
  expectNext: function (e) {
    return e === f || e === k || e === b || e === y || e === x;
  },
  expectPrev: function (e) {
    return e === g;
  },
  updateContext: function () {
    this.state.context.push(u);
  }
});
var C = d(")", {
  expectNext: function (e) {
    return e === v || e === M || e === A || e === C;
  },
  updateContext: function () {
    if (this.curContext() !== u) {
      throw this.unexpect();
    }
    this.state.context.pop();
  }
});
var A = d(",", {
  expectNext: function (e) {
    return e === f || e === k || e === x || e === b;
  }
});
var _ = d("ignore", {
  expectNext: function (e) {
    return e === S;
  },
  expectPrev: function (e) {
    return e == k;
  }
});
var O = d("expandTok", {
  expectNext: function (e) {
    return e === v || e === M || e === A || e === C;
  }
});
var M = d("eof");
var P = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
function q(e, t) {
  if (String.fromCharCode) {
    return e.codePointAt(t);
  }
  var r = e.charCodeAt(t);
  if (r <= 55295 || r >= 57344) {
    return r;
  }
  var n = e.charCodeAt(t + 1);
  return (r << 10) + n - 56613888;
}
function N(e) {
  return e === 42 || e === 46 || e === 33 || e === 91 || e === 93 || e === 40 || e === 41 || e === 44 || e === 58 || e === 126 || e === 123 || e === 125;
}
function R(e, t) {
  var r = new Error(e);
  Object.assign(r, t);
  return r;
}
function I(e, t, r) {
  var n = "";
  for (var i = t; i < r; i++) {
    var o = e.charAt(i);
    if (o !== "\\") {
      n += o;
    }
  }
  return n;
}
var j = function () {
  function e(e) {
    this.input = e;
    this.state = {
      context: [],
      type: null,
      pos: 0
    };
    this.type_ = null;
  }
  e.prototype.curContext = function () {
    return this.state.context[this.state.context.length - 1];
  };
  e.prototype.includesContext = function (e) {
    for (var t = this.state.context.length - 1; t >= 0; t--) {
      if (this.state.context[t] === e) {
        return true;
      }
    }
    return false;
  };
  e.prototype.unexpect = function (e) {
    e = e || this.state.type;
    return R(`Unexpect token "${e.flag}" in ${this.state.pos} char.`, {
      pos: this.state.pos
    });
  };
  e.prototype.expectNext = function (e, t) {
    if (e && e.expectNext && t && !e.expectNext.call(this, t)) {
      throw R(`Unexpect token "${t.flag}" token should not be behind "${e.flag}" token.(${this.state.pos}th char)`, {
        pos: this.state.pos
      });
    }
  };
  e.prototype.expectPrev = function (e, t) {
    if (e && e.expectPrev && t && !e.expectPrev.call(this, t)) {
      throw R(`Unexpect token "${e.flag}" should not be behind "${t.flag}"(${this.state.pos}th char).`, {
        pos: this.state.pos
      });
    }
  };
  e.prototype.match = function (e) {
    return this.state.type === e;
  };
  e.prototype.skipSpace = function () {
    if (this.curContext() !== s) {
      e: while (this.state.pos < this.input.length) {
        var e = this.input.charCodeAt(this.state.pos);
        switch (e) {
          case 32:
          case 160:
            ++this.state.pos;
            break;
          case 13:
            if (this.input.charCodeAt(this.state.pos + 1) === 10) {
              ++this.state.pos;
            }
          case 10:
          case 8232:
          case 8233:
            ++this.state.pos;
            break;
          default:
            if ((!(e > 8) || !(e < 14)) && (!(e >= 5760) || !P.test(String.fromCharCode(e)))) {
              break e;
            }
            ++this.state.pos;
        }
      }
    }
  };
  e.prototype.next = function () {
    this.type_ = this.state.type;
    if (this.input.length <= this.state.pos) {
      return this.finishToken(M);
    }
    this.skipSpace();
    this.readToken(this.getCode(), this.state.pos > 0 ? this.getCode(this.state.pos - 1) : -Infinity);
  };
  e.prototype.getCode = function (e = this.state.pos) {
    return q(this.input, e);
  };
  e.prototype.eat = function (e) {
    return !!this.match(e) && (this.next(), true);
  };
  e.prototype.readKeyWord = function () {
    var e = this.state.pos;
    var t = "";
    while (1) {
      var r = this.getCode();
      var n = this.getCode(this.state.pos - 1);
      if (this.input.length === this.state.pos) {
        t = I(this.input, e, this.state.pos + 1);
        break;
      }
      if (N(r) && n !== 92) {
        t = I(this.input, e, this.state.pos);
        break;
      }
      if (r === 32 || r === 160 || r === 10 || r === 8232 || r === 8233) {
        t = I(this.input, e, this.state.pos);
        break;
      }
      if (r === 13 && this.input.charCodeAt(this.state.pos + 1) === 10) {
        t = I(this.input, e, this.state.pos);
        break;
      }
      if (r > 8 && r < 14 || r >= 5760 && P.test(String.fromCharCode(r))) {
        t = I(this.input, e, this.state.pos);
        break;
      }
      this.state.pos++;
    }
    this.finishToken(f, t);
  };
  e.prototype.readIgnoreString = function () {
    var e;
    var t = this.state.pos;
    var r = "";
    while (1) {
      var n = this.getCode();
      if (this.state.pos >= this.input.length) {
        break;
      }
      if (n !== 91 && n !== 93 || e !== 92) {
        if (n == 93 && e === 93) {
          r = this.input.slice(t, this.state.pos - 1).replace(/\\([\[\]])/g, "$1");
          this.state.pos++;
          break;
        }
        this.state.pos++;
        e = n;
      } else {
        this.state.pos++;
        e = "";
      }
    }
    this.finishToken(_, r);
    this.finishToken(S);
  };
  e.prototype.finishToken = function (e, t) {
    var r = this.state.type;
    this.state.type = e;
    if (t !== undefined) {
      this.state.value = t;
    }
    this.expectNext(r, e);
    this.expectPrev(e, r);
    if (e.updateContext) {
      e.updateContext.call(this, r);
    }
  };
  e.prototype.readToken = function (e, t) {
    if (t === 92) {
      return this.readKeyWord();
    }
    if (this.input.length <= this.state.pos) {
      this.finishToken(M);
    } else if (this.curContext() === s) {
      this.readIgnoreString();
    } else if (e === 123) {
      this.state.pos++;
      this.finishToken(b);
    } else if (e === 125) {
      this.state.pos++;
      this.finishToken(w);
    } else if (e === 42) {
      this.state.pos++;
      if (this.getCode() === 42) {
        this.state.pos++;
        return this.finishToken(m);
      }
      this.finishToken(g);
    } else if (e === 33) {
      this.state.pos++;
      this.finishToken(y);
    } else if (e === 46) {
      this.state.pos++;
      this.finishToken(v);
    } else if (e === 91) {
      this.state.pos++;
      if (this.getCode() === 91) {
        this.state.pos++;
        return this.finishToken(k);
      }
      this.finishToken(x);
    } else if (e === 126) {
      this.state.pos++;
      this.finishToken(O);
    } else if (e === 93) {
      this.state.pos++;
      this.finishToken(E);
    } else if (e === 40) {
      this.state.pos++;
      this.finishToken(T);
    } else if (e === 41) {
      this.state.pos++;
      this.finishToken(C);
    } else if (e === 44) {
      this.state.pos++;
      this.finishToken(A);
    } else if (e === 58) {
      this.state.pos++;
      this.finishToken(h);
    } else {
      this.readKeyWord();
    }
  };
  return e;
}();
function D(e) {
  return function (t) {
    return t && t.type === e;
  };
}
var L = D("Identifier");
var F = D("IgnoreExpression");
var Z = D("DotOperator");
var z = D("WildcardOperator");
var U = D("ExpandOperator");
var B = D("GroupExpression");
var V = D("RangeExpression");
var H = D("DestructorExpression");
var W = D("ObjectPattern");
D("ObjectPatternProperty");
var Y = D("ArrayPattern");
var Q = Object.prototype.toString;
function $(e) {
  return function (t) {
    return Q.call(t) === `[object ${e}]`;
  };
}
var G = $("Function");
var K = Array.isArray || $("Array");
$("Object");
var J = $("String");
$("Boolean");
var X = $("Number");
function ee(e) {
  return typeof e === "object";
}
var te = $("RegExp");
function re(e) {
  return X(e) || /^(\d+)(\.\d+)?$/.test(e);
}
var ne = K;
var ie = Object.keys;
var oe = Object.prototype.hasOwnProperty;
function ae(e) {
  if (Array.isArray(e)) {
    return e;
  } else if (e !== undefined) {
    return [e];
  } else {
    return [];
  }
}
function se(e, t) {
  if (e === t) {
    return true;
  }
  if (e && t && typeof e === "object" && typeof t === "object") {
    var r = ne(e);
    var n = ne(t);
    var i = undefined;
    var o = undefined;
    var a = undefined;
    if (r && n) {
      o = e.length;
      if (o !== t.length) {
        return false;
      }
      for (i = o; i-- !== 0;) {
        if (!se(e[i], t[i])) {
          return false;
        }
      }
      return true;
    }
    if (r !== n) {
      return false;
    }
    var s = ie(e);
    o = s.length;
    if (o !== ie(t).length) {
      return false;
    }
    for (i = o; i-- !== 0;) {
      if (!oe.call(t, s[i])) {
        return false;
      }
    }
    for (i = o; i-- !== 0;) {
      a = s[i];
      if (!se(e[a], t[a])) {
        return false;
      }
    }
    return true;
  }
  return e !== e && t !== t;
}
function ue(e, t) {
  e = typeof e === "symbol" ? e : `${e}`;
  t = typeof t === "symbol" ? t : `${t}`;
  return e === t;
}
var le = new Map();
function ce(e) {
  return e !== undefined && e !== null;
}
function pe(e) {
  return le.get(e);
}
function de(e, t) {
  le.set(e, t);
}
function fe(e) {
  var t = [];
  if (W(e)) {
    var r = 0;
    e.properties.forEach(function (e) {
      t[r] = {
        path: []
      };
      t[r].key = e.key.value;
      t[r].path.push(e.key.value);
      if (L(e.value)) {
        t[r].key = e.value.value;
      }
      var n = t[r].path;
      var i = fe(e.value);
      var o = r;
      i.forEach(function (e) {
        if (t[o]) {
          t[o].key = e.key;
          t[o].path = n.concat(e.path);
        } else {
          t[o] = {
            key: e.key,
            path: n.concat(e.path)
          };
        }
        o++;
      });
      if (o > r) {
        r = o;
      } else {
        r++;
      }
    });
    return t;
  }
  if (Y(e)) {
    var n = 0;
    e.elements.forEach(function (e, r) {
      t[n] = {
        path: []
      };
      t[n].key = r;
      t[n].path.push(r);
      if (L(e)) {
        t[n].key = e.value;
      }
      var i = t[n].path;
      var o = fe(e);
      var a = n;
      o.forEach(function (e) {
        if (t[a]) {
          t[a].key = e.key;
          t[a].path = i.concat(e.path);
        } else {
          t[a] = {
            key: e.key,
            path: i.concat(e.path)
          };
        }
        a++;
      });
      if (a > n) {
        n = a;
      } else {
        n++;
      }
    });
    return t;
  }
  if (H(e)) {
    return fe(e.value);
  } else {
    return t;
  }
}
function ge(e, t, r, n) {
  t.forEach(function (t) {
    var i = t.key;
    var o = t.path;
    n.setIn([i], e, n.getIn(o, r));
  });
}
function me(e, t, r) {
  var n = {};
  if (t.length && X(t[0].path[0])) {
    n = [];
  }
  e = ce(e) ? e : {};
  t.forEach(function (t) {
    var i = t.key;
    var o = t.path;
    r.setIn(o, n, e[i]);
  });
  return n;
}
function ve(e, t, r) {
  t.forEach(function (t) {
    var n = t.key;
    r.deleteIn([n], e);
  });
}
function ye(e, t, r, n) {
  return t.every(function (t) {
    var i = t.key;
    return n.existIn([i], e, r);
  });
}
var he = function () {
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
function be(e = [], t) {
  var r = e.length;
  function n(i = 0) {
    var o = i < r - 1 ? n(i + 1) : t;
    var a = o && {
      type: "DotOperator",
      after: o
    };
    return {
      type: "Identifier",
      value: e[i],
      after: a
    };
  }
  return n();
}
function we(e, t, r) {
  if (re(e) && re(t)) {
    if (r === "+") {
      return String(Number(e) + Number(t));
    }
    if (r === "-") {
      return String(Number(e) - Number(t));
    }
    if (r === "*") {
      return String(Number(e) * Number(t));
    }
    if (r === "/") {
      return String(Number(e) / Number(t));
    }
  } else {
    if (r === "+") {
      return String(e) + String(t);
    }
    if (r === "-") {
      return "NaN";
    }
    if (r === "*") {
      return "NaN";
    }
    if (r === "/") {
      return "NaN";
    }
  }
  return String(Number(t));
}
var xe = function (e) {
  function t(t, r) {
    var n = e.call(this, t) || this;
    n.isMatchPattern = false;
    n.isWildMatchPattern = false;
    n.haveExcludePattern = false;
    n.haveRelativePattern = false;
    n.base = r;
    return n;
  }
  he(t, e);
  t.prototype.parse = function () {
    var e;
    this.data = {
      segments: []
    };
    if (!this.eat(M)) {
      this.next();
      e = this.parseAtom(this.state.type);
    }
    this.data.tree = e;
    return e;
  };
  t.prototype.append = function (e, t) {
    if (e && t) {
      e.after = t;
    }
  };
  t.prototype.parseAtom = function (e) {
    switch (e) {
      case b:
      case x:
        if (this.includesContext(c)) {
          if (e === b) {
            return this.parseObjectPattern();
          } else {
            return this.parseArrayPattern();
          }
        } else {
          return this.parseDestructorExpression();
        }
      case f:
        return this.parseIdentifier();
      case O:
        return this.parseExpandOperator();
      case m:
      case g:
        return this.parseWildcardOperator();
      case k:
        return this.parseIgnoreExpression();
      case v:
        return this.parseDotOperator();
    }
  };
  t.prototype.pushSegments = function (e) {
    this.data.segments.push(e);
  };
  t.prototype.parseIdentifier = function () {
    var e = {
      type: "Identifier",
      value: this.state.value
    };
    var t = !this.includesContext(c) && !this.isMatchPattern && !this.isWildMatchPattern;
    this.next();
    if (this.includesContext(a)) {
      if (this.state.type !== E) {
        throw this.unexpect();
      }
      this.state.context.pop();
      this.next();
    } else if (t) {
      this.pushSegments(e.value);
    }
    if (this.state.type === x) {
      this.next();
      if (this.state.type !== f) {
        throw this.unexpect();
      }
      this.state.context.push(a);
      var r = false;
      if (/^\d+$/.test(this.state.value)) {
        r = true;
      }
      var n = this.state.value;
      this.pushSegments(r ? Number(n) : n);
      var i = this.parseAtom(this.state.type);
      if (r) {
        i.arrayIndex = true;
      }
      this.append(e, i);
    } else {
      this.append(e, this.parseAtom(this.state.type));
    }
    return e;
  };
  t.prototype.parseExpandOperator = function () {
    var e = {
      type: "ExpandOperator"
    };
    this.isMatchPattern = true;
    this.isWildMatchPattern = true;
    this.data.segments = [];
    this.next();
    this.append(e, this.parseAtom(this.state.type));
    return e;
  };
  t.prototype.parseWildcardOperator = function () {
    var e = {
      type: "WildcardOperator"
    };
    if (this.state.type === m) {
      e.optional = true;
    }
    this.isMatchPattern = true;
    this.isWildMatchPattern = true;
    this.data.segments = [];
    this.next();
    if (this.state.type === T) {
      e.filter = this.parseGroupExpression(e);
    } else if (this.state.type === x) {
      e.filter = this.parseRangeExpression(e);
    }
    this.append(e, this.parseAtom(this.state.type));
    return e;
  };
  t.prototype.parseDestructorExpression = function () {
    var e = this;
    var t = {
      type: "DestructorExpression"
    };
    this.state.context.push(c);
    var r = this.state.pos - 1;
    t.value = this.state.type === b ? this.parseObjectPattern() : this.parseArrayPattern();
    var n = this.state.pos;
    this.state.context.pop();
    t.source = this.input.substring(r, n).replace(/\[\s*([\+\-\*\/])?\s*([^,\]\s]*)\s*\]/, function (t, r, n) {
      if (e.relative !== undefined) {
        if (r) {
          return we(e.relative, n || 1, r);
        } else if (n) {
          return we(e.relative, n, "+");
        } else {
          return String(e.relative);
        }
      } else {
        return t;
      }
    }).replace(/\s*\.\s*/g, "").replace(/\s*/g, "");
    if (this.relative === undefined) {
      de(t.source, fe(t));
    }
    this.relative = undefined;
    this.pushSegments(t.source);
    this.next();
    this.append(t, this.parseAtom(this.state.type));
    return t;
  };
  t.prototype.parseArrayPattern = function () {
    var e = {
      type: "ArrayPattern",
      elements: []
    };
    this.next();
    e.elements = this.parseArrayPatternElements();
    return e;
  };
  t.prototype.parseArrayPatternElements = function () {
    var e = [];
    while (this.state.type !== E && this.state.type !== M) {
      e.push(this.parseAtom(this.state.type));
      if (this.state.type === E) {
        if (this.includesContext(c)) {
          this.next();
        }
        return e;
      }
      this.next();
    }
    return e;
  };
  t.prototype.parseObjectPattern = function () {
    var e = {
      type: "ObjectPattern",
      properties: []
    };
    this.next();
    e.properties = this.parseObjectProperties();
    return e;
  };
  t.prototype.parseObjectProperties = function () {
    var e = [];
    while (this.state.type !== w && this.state.type !== M) {
      var t = {
        type: "ObjectPatternProperty",
        key: this.parseAtom(this.state.type)
      };
      e.push(t);
      if (this.state.type === h) {
        this.next();
        t.value = this.parseAtom(this.state.type);
      }
      if (this.state.type === w) {
        if (this.includesContext(c)) {
          this.next();
        }
        return e;
      }
      this.next();
    }
    return e;
  };
  t.prototype.parseDotOperator = function () {
    var e = {
      type: "DotOperator"
    };
    var t = this.type_;
    if (!t && this.base) {
      if (this.base.isMatchPattern) {
        throw new Error("Base path must be an absolute path.");
      }
      this.data.segments = this.base.toArr();
      while (this.state.type === v) {
        this.relative = this.data.segments.pop();
        this.haveRelativePattern = true;
        this.next();
      }
      return be(this.data.segments.slice(), this.parseAtom(this.state.type));
    }
    this.next();
    this.append(e, this.parseAtom(this.state.type));
    return e;
  };
  t.prototype.parseIgnoreExpression = function () {
    this.next();
    var e = String(this.state.value).replace(/\s*/g, "");
    var t = {
      type: "IgnoreExpression",
      value: e
    };
    this.pushSegments(e);
    this.next();
    this.append(t, this.parseAtom(this.state.type));
    this.next();
    return t;
  };
  t.prototype.parseGroupExpression = function (e) {
    var t = {
      type: "GroupExpression",
      value: []
    };
    this.isMatchPattern = true;
    this.data.segments = [];
    this.next();
    e: while (1) {
      switch (this.state.type) {
        case A:
          this.next();
          break;
        case y:
          t.isExclude = true;
          this.haveExcludePattern = true;
          this.next();
          break;
        case M:
          break e;
        case C:
          break e;
        default:
          t.value.push(this.parseAtom(this.state.type));
      }
    }
    this.next();
    this.append(e, this.parseAtom(this.state.type));
    return t;
  };
  t.prototype.parseRangeExpression = function (e) {
    var t = {
      type: "RangeExpression"
    };
    this.next();
    this.isMatchPattern = true;
    this.data.segments = [];
    var r = false;
    var n = false;
    e: while (1) {
      switch (this.state.type) {
        case h:
          n = true;
          r = true;
          this.next();
          break;
        case E:
          if (!n && !t.end) {
            t.end = t.start;
          }
          break e;
        case A:
          throw this.unexpect();
        case M:
          break e;
        default:
          if (r) {
            t.end = this.parseAtom(this.state.type);
          } else {
            t.start = this.parseAtom(this.state.type);
          }
      }
    }
    this.next();
    this.append(e, this.parseAtom(this.state.type));
    return t;
  };
  return t;
}(j);
var Ee = function () {
  function e(e, t) {
    this.tree = e;
    this.stack = [];
    this.excluding = false;
    this.wildcards = [];
    this.record = t;
  }
  e.prototype.next = function (e, t) {
    if (e.after) {
      return this.matchNode(e.after, t);
    }
    if (z(e) && !e.filter) {
      return !this.excluding && (t === 0 || !!e.optional || !!this.take(t));
    }
    var r = t === this.path.length - 1;
    if (r) {
      return !!this.take(t);
    }
    var n = this.wildcards.pop();
    return !!n && !!n.after && this.next(n, t);
  };
  e.prototype.shot = function () {
    if (this.record?.score >= 0) {
      this.record.score++;
    }
  };
  e.prototype.take = function (e) {
    return String(this.path[e] ?? "");
  };
  e.prototype.matchExcludeIdentifier = function (e, t, r) {
    var n = r === this.path.length - 1;
    var i = r < this.path.length;
    if (!t.after) {
      this.excluding = false;
    }
    if (e) {
      if (t.after) {
        return this.next(t, r);
      }
      if (n) {
        return false;
      }
    }
    return !!n || i;
  };
  e.prototype.matchIdentifier = function (e, t) {
    var r = this.take(t);
    var n = false;
    if (U(e.after)) {
      if (r.indexOf(e.value) === 0) {
        this.shot();
        n = true;
      }
      if (this.excluding) {
        return this.matchExcludeIdentifier(n, e.after, t);
      } else {
        return n && this.next(e.after, t);
      }
    } else {
      if (r === e.value) {
        this.shot();
        n = true;
      }
      if (this.excluding) {
        return this.matchExcludeIdentifier(n, e, t);
      } else {
        return n && this.next(e, t);
      }
    }
  };
  e.prototype.matchIgnoreExpression = function (e, t) {
    return se(e.value, this.take(t)) && this.next(e, t);
  };
  e.prototype.matchDestructorExpression = function (e, t) {
    return se(e.source, this.take(t)) && this.next(e, t);
  };
  e.prototype.matchExpandOperator = function (e, t) {
    return this.next(e, t);
  };
  e.prototype.matchWildcardOperator = function (e, t) {
    var r = false;
    if (e.filter) {
      this.stack.push(e);
      r = this.matchNode(e.filter, t);
      this.stack.pop();
    } else {
      r = this.next(e, t);
    }
    return r;
  };
  e.prototype.matchGroupExpression = function (e, t) {
    var r = this;
    var n = false;
    if (e.isExclude) {
      n = !this.excluding;
    }
    return ae(e.value)[n ? "every" : "some"](function (e) {
      r.wildcards = r.stack.slice();
      r.excluding = n;
      return r.matchNode(e, t);
    });
  };
  e.prototype.matchRangeExpression = function (e, t) {
    var r = Number(this.take(t));
    if (e.start) {
      if (e.end) {
        return r >= Number(e.start.value) && r <= Number(e.end.value);
      } else {
        return r >= Number(e.start.value);
      }
    } else if (e.end) {
      return r <= Number(e.end.value);
    } else {
      this.wildcards = this.stack.slice();
      return this.next(e, t);
    }
  };
  e.prototype.matchNode = function (e, t = 0) {
    if (Z(e)) {
      return this.next(e, t + 1);
    } else if (L(e)) {
      return this.matchIdentifier(e, t);
    } else if (F(e)) {
      return this.matchIgnoreExpression(e, t);
    } else if (H(e)) {
      return this.matchDestructorExpression(e, t);
    } else if (U(e)) {
      return this.matchExpandOperator(e, t);
    } else if (z(e)) {
      return this.matchWildcardOperator(e, t);
    } else if (B(e)) {
      return this.matchGroupExpression(e, t);
    } else {
      return !!V(e) && this.matchRangeExpression(e, t);
    }
  };
  e.prototype.match = function (e) {
    this.path = e;
    return {
      matched: this.matchNode(this.tree),
      record: this.record
    };
  };
  e.matchSegments = function (e, t, r) {
    if (e.length !== t.length) {
      return {
        matched: false,
        record: r
      };
    }
    function n(i = 0) {
      var o = ue(e[i], t[i]);
      if (r?.score >= 0) {
        r.score++;
      }
      return o && (!(i < e.length - 1) || n(i + 1));
    }
    return {
      matched: n(),
      record: r
    };
  };
  return e;
}();
function ke(e, t) {
  var r = typeof Symbol === "function" && e[Symbol.iterator];
  if (!r) {
    return e;
  }
  var n;
  var i;
  var o = r.call(e);
  var a = [];
  try {
    while ((t === undefined || t-- > 0) && !(n = o.next()).done) {
      a.push(n.value);
    }
  } catch (s) {
    i = {
      error: s
    };
  } finally {
    try {
      if (n && !n.done && (r = o.return)) {
        r.call(o);
      }
    } finally {
      if (i) {
        throw i.error;
      }
    }
  }
  return a;
}
function Se(e, t, r) {
  if (r || arguments.length === 2) {
    var n;
    for (var i = 0, o = t.length; i < o; i++) {
      if (!!n || !(i in t)) {
        n ||= Array.prototype.slice.call(t, 0, i);
        n[i] = t[i];
      }
    }
  }
  return e.concat(n || Array.prototype.slice.call(t));
}
var Te = new Map();
var Ce = Symbol("PATH_MATCHER");
function Ae(e) {
  return e !== undefined && e !== null;
}
function _e(e) {
  return e.indexOf("*") === -1 && e.indexOf("~") === -1 && e.indexOf("[") === -1 && e.indexOf("]") === -1 && e.indexOf(",") === -1 && e.indexOf(":") === -1 && e.indexOf(" ") === -1 && e[0] !== ".";
}
function Oe(e) {
  return typeof e === "object" || typeof e === "function";
}
function Me(e) {
  if (J(e)) {
    return /^\d+$/.test(e);
  } else {
    return X(e);
  }
}
function Pe(e, t) {
  for (var r = 0; r < e.length; r++) {
    var n = e[r];
    var i = pe(n);
    if (i) {
      t = me(t, i, {
        setIn: qe,
        getIn: Pe
      });
      break;
    }
    if (!Ae(t)) {
      return;
    }
    t = t[n];
  }
  return t;
}
function qe(e, t, r) {
  for (var n = 0; n < e.length; n++) {
    var i = e[n];
    var o = pe(i);
    if (o) {
      ge(t, o, r, {
        setIn: qe,
        getIn: Pe
      });
      break;
    }
    if (!Ae(t) || !Oe(t)) {
      return;
    }
    if (K(t) && !Me(i)) {
      return;
    }
    if (!Ae(t[i])) {
      if (r === undefined) {
        if (t[i] === null) {
          t[i] = r;
        }
        return;
      }
      if (n < e.length - 1) {
        t[i] = X(e[n + 1]) ? [] : {};
      }
    }
    if (n === e.length - 1) {
      t[i] = r;
    }
    t = t[i];
  }
}
function Ne(e, t) {
  for (var r = 0; r < e.length; r++) {
    var n = e[r];
    var i = pe(n);
    if (i) {
      ve(t, i, {
        setIn: qe,
        getIn: Pe,
        deleteIn: Ne
      });
      break;
    }
    if (r === e.length - 1 && Ae(t)) {
      delete t[n];
      return;
    }
    if (!Ae(t) || !Oe(t)) {
      return;
    }
    t = t[n];
    if (!ee(t)) {
      return;
    }
  }
}
var Re = Object.prototype.hasOwnProperty;
function Ie(e, t, r) {
  if (r instanceof Le) {
    r = r.length;
  }
  for (var n = r; n < e.length; n++) {
    var i = e[n];
    var o = pe(i);
    if (o) {
      return ye(t, o, r, {
        setIn: qe,
        getIn: Pe,
        deleteIn: Ne,
        existIn: Ie
      });
    }
    if (n === e.length - 1) {
      return Re.call(t, i);
    }
    if (!Ae(t) || !Oe(t)) {
      return false;
    }
    t = t[i];
    if (!ee(t)) {
      return false;
    }
  }
}
function je(e, t) {
  if (e instanceof Le) {
    return {
      entire: e.entire,
      segments: e.segments.slice(),
      isRegExp: false,
      haveRelativePattern: e.haveRelativePattern,
      isWildMatchPattern: e.isWildMatchPattern,
      isMatchPattern: e.isMatchPattern,
      haveExcludePattern: e.haveExcludePattern,
      tree: e.tree
    };
  }
  if (J(e)) {
    if (!e) {
      return {
        entire: "",
        segments: [],
        isRegExp: false,
        isWildMatchPattern: false,
        haveExcludePattern: false,
        isMatchPattern: false
      };
    }
    if (_e(e)) {
      return {
        entire: e,
        segments: e.split("."),
        isRegExp: false,
        isWildMatchPattern: false,
        haveExcludePattern: false,
        isMatchPattern: false
      };
    }
    var r = new xe(e, Le.parse(t));
    var n = r.parse();
    if (r.isMatchPattern) {
      return {
        entire: e,
        segments: [],
        isRegExp: false,
        haveRelativePattern: false,
        isWildMatchPattern: r.isWildMatchPattern,
        haveExcludePattern: r.haveExcludePattern,
        isMatchPattern: true,
        tree: n
      };
    }
    var i = r.data.segments;
    return {
      entire: i.join("."),
      segments: i,
      tree: n,
      isRegExp: false,
      haveRelativePattern: r.haveRelativePattern,
      isWildMatchPattern: false,
      haveExcludePattern: false,
      isMatchPattern: false
    };
  }
  if (G(e) && e[Ce]) {
    return je(e.path);
  } else if (K(e)) {
    return {
      entire: e.join("."),
      segments: e.reduce(function (e, t) {
        return e.concat(De(t));
      }, []),
      isRegExp: false,
      haveRelativePattern: false,
      isWildMatchPattern: false,
      haveExcludePattern: false,
      isMatchPattern: false
    };
  } else if (te(e)) {
    return {
      entire: e,
      segments: [],
      isRegExp: true,
      haveRelativePattern: false,
      isWildMatchPattern: false,
      haveExcludePattern: false,
      isMatchPattern: true
    };
  } else {
    return {
      entire: "",
      isRegExp: false,
      segments: e !== undefined ? [e] : [],
      haveRelativePattern: false,
      isWildMatchPattern: false,
      haveExcludePattern: false,
      isMatchPattern: false
    };
  }
}
function De(e) {
  if (J(e)) {
    e = e.replace(/\s*/g, "");
    try {
      var t = je(e);
      var r = t.segments;
      var n = t.isMatchPattern;
      if (n) {
        return e;
      } else {
        return r;
      }
    } catch (i) {
      return e;
    }
  } else if (e instanceof Le) {
    return e.segments;
  }
  return e;
}
var Le = function () {
  function e(t, r) {
    var n = this;
    this.concat = function () {
      var t;
      var r = [];
      for (var i = 0; i < arguments.length; i++) {
        r[i] = arguments[i];
      }
      if (n.isMatchPattern || n.isRegExp) {
        throw new Error(`${n.entire} cannot be concat`);
      }
      var o = new e("");
      o.segments = (t = n.segments).concat.apply(t, Se([], ke(r.map(function (e) {
        return De(e);
      })), false));
      o.entire = o.segments.join(".");
      return o;
    };
    this.slice = function (t, r) {
      if (n.isMatchPattern || n.isRegExp) {
        throw new Error(`${n.entire} cannot be slice`);
      }
      var i = new e("");
      i.segments = n.segments.slice(t, r);
      i.entire = i.segments.join(".");
      return i;
    };
    this.push = function () {
      var e = [];
      for (var t = 0; t < arguments.length; t++) {
        e[t] = arguments[t];
      }
      return n.concat.apply(n, Se([], ke(e), false));
    };
    this.pop = function () {
      if (n.isMatchPattern || n.isRegExp) {
        throw new Error(`${n.entire} cannot be pop`);
      }
      return new e(n.segments.slice(0, n.segments.length - 1));
    };
    this.splice = function (t, r) {
      var i = [];
      for (var o = 2; o < arguments.length; o++) {
        i[o - 2] = arguments[o];
      }
      if (n.isMatchPattern || n.isRegExp) {
        throw new Error(`${n.entire} cannot be splice`);
      }
      i = i.reduce(function (e, t) {
        return e.concat(De(t));
      }, []);
      var a = n.segments.slice();
      a.splice.apply(a, Se([t, r], ke(i), false));
      return new e(a);
    };
    this.forEach = function (e) {
      if (n.isMatchPattern || n.isRegExp) {
        throw new Error(`${n.entire} cannot be each`);
      }
      n.segments.forEach(e);
    };
    this.map = function (e) {
      if (n.isMatchPattern || n.isRegExp) {
        throw new Error(`${n.entire} cannot be map`);
      }
      return n.segments.map(e);
    };
    this.reduce = function (e, t) {
      if (n.isMatchPattern || n.isRegExp) {
        throw new Error(`${n.entire} cannot be reduce`);
      }
      return n.segments.reduce(e, t);
    };
    this.parent = function () {
      return n.slice(0, n.length - 1);
    };
    this.includes = function (t) {
      var r = e.parse(t);
      var i = r.entire;
      var o = r.segments;
      var a = r.isMatchPattern;
      var s = n.includesCache.get(i);
      if (s !== undefined) {
        return s;
      }
      function u(e) {
        n.includesCache.set(i, e);
        return e;
      }
      if (n.isMatchPattern) {
        if (a) {
          throw new Error(`${n.entire} cannot be used to match ${i}`);
        }
        return u(n.match(o));
      }
      if (a) {
        throw new Error(`${n.entire} cannot be used to match ${i}`);
      }
      if (o.length > n.segments.length) {
        return u(false);
      }
      for (var l = 0; l < o.length; l++) {
        if (!se(String(o[l]), String(n.segments[l]))) {
          return u(false);
        }
      }
      return u(true);
    };
    this.transform = function (e, t) {
      if (!G(t)) {
        return "";
      }
      if (n.isMatchPattern) {
        throw new Error(`${n.entire} cannot be transformed`);
      }
      var r = new RegExp(e);
      var i = n.segments.filter(function (e) {
        return r.test(e);
      });
      return t.apply(undefined, Se([], ke(i), false));
    };
    this.match = function (t) {
      var r;
      var i;
      var o = e.parse(t);
      var a = n.matchCache.get(o.entire);
      if (a !== undefined) {
        if (a.record && a.record.score !== undefined) {
          n.matchScore = a.record.score;
        }
        return a.matched;
      }
      function s(e) {
        n.matchCache.set(o.entire, e);
        return e;
      }
      if (o.isMatchPattern) {
        if (n.isMatchPattern) {
          throw new Error(`${o.entire} cannot match ${n.entire}`);
        }
        n.matchScore = 0;
        return s(o.match(n.segments));
      }
      if (n.isMatchPattern) {
        if (n.isRegExp) {
          try {
            if ((i = (r = n.entire) === null || r === undefined ? undefined : r.test) === null || i === undefined) {
              return undefined;
            } else {
              return i.call(r, o.entire);
            }
          } finally {
            n.entire.lastIndex = 0;
          }
        }
        var u = {
          score: 0
        };
        var l = s(new Ee(n.tree, u).match(o.segments));
        n.matchScore = u.score;
        return l.matched;
      }
      u = {
        score: 0
      };
      l = s(Ee.matchSegments(n.segments, o.segments, u));
      n.matchScore = u.score;
      return l.matched;
    };
    this.matchAliasGroup = function (t, r) {
      var i = e.parse(t);
      var o = e.parse(r);
      var a = n.match(i);
      var s = n.matchScore;
      var u = n.match(o);
      var l = n.matchScore;
      if (n.haveExcludePattern) {
        if (s >= l) {
          return a;
        } else {
          return u;
        }
      } else {
        return a || u;
      }
    };
    this.existIn = function (e, t = 0) {
      return Ie(n.segments, e, t);
    };
    this.getIn = function (e) {
      return Pe(n.segments, e);
    };
    this.setIn = function (e, t) {
      qe(n.segments, e, t);
      return e;
    };
    this.deleteIn = function (e) {
      Ne(n.segments, e);
      return e;
    };
    this.ensureIn = function (e, t) {
      var r = n.getIn(e);
      if (r === undefined) {
        n.setIn(e, t);
        return n.getIn(e);
      } else {
        return r;
      }
    };
    var i = je(t, r);
    var o = i.tree;
    var a = i.segments;
    var s = i.entire;
    var u = i.isRegExp;
    var l = i.isMatchPattern;
    var c = i.isWildMatchPattern;
    var p = i.haveRelativePattern;
    var d = i.haveExcludePattern;
    this.entire = s;
    this.segments = a;
    this.isMatchPattern = l;
    this.isWildMatchPattern = c;
    this.haveRelativePattern = p;
    this.isRegExp = u;
    this.haveExcludePattern = d;
    this.tree = o;
    this.matchCache = new Map();
    this.includesCache = new Map();
  }
  e.prototype.toString = function () {
    var e;
    if ((e = this.entire) === null || e === undefined) {
      return undefined;
    } else {
      return e.toString();
    }
  };
  e.prototype.toArr = function () {
    var e;
    if ((e = this.segments) === null || e === undefined) {
      return undefined;
    } else {
      return e.slice();
    }
  };
  Object.defineProperty(e.prototype, "length", {
    get: function () {
      return this.segments.length;
    },
    enumerable: false,
    configurable: true
  });
  e.match = function (t) {
    var r = e.parse(t);
    function n(e) {
      return r.match(e);
    }
    n[Ce] = true;
    n.path = r;
    return n;
  };
  e.isPathPattern = function (e) {
    return !!J(e) || !!K(e) || !!te(e) || !!G(e) && !!e[Ce];
  };
  e.transform = function (t, r, n) {
    return e.parse(t).transform(r, n);
  };
  e.parse = function (t = "", r) {
    if (t instanceof e) {
      var n = Te.get(t.entire);
      return n || (Te.set(t.entire, t), t);
    }
    if (t && t[Ce]) {
      return e.parse(t.path);
    }
    var i = r ? e.parse(r) : "";
    var o = `${t}:${i}`;
    n = Te.get(o);
    return n || (t = new e(t, r), Te.set(o, t), t);
  };
  e.getIn = function (t, r) {
    var n = e.parse(r);
    return n.getIn(t);
  };
  e.setIn = function (t, r, n) {
    var i = e.parse(r);
    return i.setIn(t, n);
  };
  e.deleteIn = function (t, r) {
    var n = e.parse(r);
    return n.deleteIn(t);
  };
  e.existIn = function (t, r, n) {
    var i = e.parse(r);
    return i.existIn(t, n);
  };
  e.ensureIn = function (t, r, n) {
    var i = e.parse(r);
    return i.ensureIn(t, n);
  };
  return e;
}();
};
