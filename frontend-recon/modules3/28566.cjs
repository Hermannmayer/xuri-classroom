// webpack module 28566 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Headers: function () {
    return p;
  },
  Request: function () {
    return x;
  },
  Response: function () {
    return S;
  },
  DOMException: function () {
    return C;
  },
  fetch: function () {
    return A;
  }
});
var n = typeof globalThis !== "undefined" && globalThis || typeof self !== "undefined" && self || typeof require.g !== "undefined" && require.g || {};
var i = {
  searchParams: "URLSearchParams" in n,
  iterable: "Symbol" in n && "iterator" in Symbol,
  blob: "FileReader" in n && "Blob" in n && function () {
    try {
      new Blob();
      return true;
    } catch (e) {
      return false;
    }
  }(),
  formData: "FormData" in n,
  arrayBuffer: "ArrayBuffer" in n
};
function o(e) {
  return e && DataView.prototype.isPrototypeOf(e);
}
if (i.arrayBuffer) {
  var a = ["[object Int8Array]", "[object Uint8Array]", "[object Uint8ClampedArray]", "[object Int16Array]", "[object Uint16Array]", "[object Int32Array]", "[object Uint32Array]", "[object Float32Array]", "[object Float64Array]"];
  var s = ArrayBuffer.isView || function (e) {
    return e && a.indexOf(Object.prototype.toString.call(e)) > -1;
  };
}
function u(e) {
  if (typeof e !== "string") {
    e = String(e);
  }
  if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(e) || e === "") {
    throw new TypeError("Invalid character in header field name: \"" + e + "\"");
  }
  return e.toLowerCase();
}
function l(e) {
  if (typeof e !== "string") {
    e = String(e);
  }
  return e;
}
function c(e) {
  var t = {
    next: function () {
      var t = e.shift();
      return {
        done: t === undefined,
        value: t
      };
    }
  };
  if (i.iterable) {
    t[Symbol.iterator] = function () {
      return t;
    };
  }
  return t;
}
function p(e) {
  this.map = {};
  if (e instanceof p) {
    e.forEach(function (e, t) {
      this.append(t, e);
    }, this);
  } else if (Array.isArray(e)) {
    e.forEach(function (e) {
      if (e.length != 2) {
        throw new TypeError("Headers constructor: expected name/value pair to be length 2, found" + e.length);
      }
      this.append(e[0], e[1]);
    }, this);
  } else if (e) {
    Object.getOwnPropertyNames(e).forEach(function (t) {
      this.append(t, e[t]);
    }, this);
  }
}
function d(e) {
  if (!e._noBody) {
    if (e.bodyUsed) {
      return Promise.reject(new TypeError("Already read"));
    } else {
      e.bodyUsed = true;
      return;
    }
  }
}
function f(e) {
  return new Promise(function (t, r) {
    e.onload = function () {
      t(e.result);
    };
    e.onerror = function () {
      r(e.error);
    };
  });
}
function g(e) {
  var t = new FileReader();
  var r = f(t);
  t.readAsArrayBuffer(e);
  return r;
}
function m(e) {
  var t = new FileReader();
  var r = f(t);
  var n = /charset=([A-Za-z0-9_-]+)/.exec(e.type);
  var i = n ? n[1] : "utf-8";
  t.readAsText(e, i);
  return r;
}
function v(e) {
  for (var t = new Uint8Array(e), r = new Array(t.length), n = 0; n < t.length; n++) {
    r[n] = String.fromCharCode(t[n]);
  }
  return r.join("");
}
function y(e) {
  if (e.slice) {
    return e.slice(0);
  }
  var t = new Uint8Array(e.byteLength);
  t.set(new Uint8Array(e));
  return t.buffer;
}
function h() {
  this.bodyUsed = false;
  this._initBody = function (e) {
    this.bodyUsed = this.bodyUsed;
    this._bodyInit = e;
    if (e) {
      if (typeof e === "string") {
        this._bodyText = e;
      } else if (i.blob && Blob.prototype.isPrototypeOf(e)) {
        this._bodyBlob = e;
      } else if (i.formData && FormData.prototype.isPrototypeOf(e)) {
        this._bodyFormData = e;
      } else if (i.searchParams && URLSearchParams.prototype.isPrototypeOf(e)) {
        this._bodyText = e.toString();
      } else if (i.arrayBuffer && i.blob && o(e)) {
        this._bodyArrayBuffer = y(e.buffer);
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (i.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(e) || s(e))) {
        this._bodyArrayBuffer = y(e);
      } else {
        this._bodyText = e = Object.prototype.toString.call(e);
      }
    } else {
      this._noBody = true;
      this._bodyText = "";
    }
    if (!this.headers.get("content-type")) {
      if (typeof e === "string") {
        this.headers.set("content-type", "text/plain;charset=UTF-8");
      } else if (this._bodyBlob && this._bodyBlob.type) {
        this.headers.set("content-type", this._bodyBlob.type);
      } else if (i.searchParams && URLSearchParams.prototype.isPrototypeOf(e)) {
        this.headers.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8");
      }
    }
  };
  if (i.blob) {
    this.blob = function () {
      var e = d(this);
      if (e) {
        return e;
      }
      if (this._bodyBlob) {
        return Promise.resolve(this._bodyBlob);
      }
      if (this._bodyArrayBuffer) {
        return Promise.resolve(new Blob([this._bodyArrayBuffer]));
      }
      if (this._bodyFormData) {
        throw new Error("could not read FormData body as blob");
      }
      return Promise.resolve(new Blob([this._bodyText]));
    };
  }
  this.arrayBuffer = function () {
    if (this._bodyArrayBuffer) {
      var e = d(this);
      return e || (ArrayBuffer.isView(this._bodyArrayBuffer) ? Promise.resolve(this._bodyArrayBuffer.buffer.slice(this._bodyArrayBuffer.byteOffset, this._bodyArrayBuffer.byteOffset + this._bodyArrayBuffer.byteLength)) : Promise.resolve(this._bodyArrayBuffer));
    }
    if (i.blob) {
      return this.blob().then(g);
    }
    throw new Error("could not read as ArrayBuffer");
  };
  this.text = function () {
    var e = d(this);
    if (e) {
      return e;
    }
    if (this._bodyBlob) {
      return m(this._bodyBlob);
    }
    if (this._bodyArrayBuffer) {
      return Promise.resolve(v(this._bodyArrayBuffer));
    }
    if (this._bodyFormData) {
      throw new Error("could not read FormData body as text");
    }
    return Promise.resolve(this._bodyText);
  };
  if (i.formData) {
    this.formData = function () {
      return this.text().then(E);
    };
  }
  this.json = function () {
    return this.text().then(JSON.parse);
  };
  return this;
}
p.prototype.append = function (e, t) {
  e = u(e);
  t = l(t);
  var r = this.map[e];
  this.map[e] = r ? r + ", " + t : t;
};
p.prototype.delete = function (e) {
  delete this.map[u(e)];
};
p.prototype.get = function (e) {
  e = u(e);
  if (this.has(e)) {
    return this.map[e];
  } else {
    return null;
  }
};
p.prototype.has = function (e) {
  return this.map.hasOwnProperty(u(e));
};
p.prototype.set = function (e, t) {
  this.map[u(e)] = l(t);
};
p.prototype.forEach = function (e, t) {
  for (var r in this.map) {
    if (this.map.hasOwnProperty(r)) {
      e.call(t, this.map[r], r, this);
    }
  }
};
p.prototype.keys = function () {
  var e = [];
  this.forEach(function (t, r) {
    e.push(r);
  });
  return c(e);
};
p.prototype.values = function () {
  var e = [];
  this.forEach(function (t) {
    e.push(t);
  });
  return c(e);
};
p.prototype.entries = function () {
  var e = [];
  this.forEach(function (t, r) {
    e.push([r, t]);
  });
  return c(e);
};
if (i.iterable) {
  p.prototype[Symbol.iterator] = p.prototype.entries;
}
var b = ["CONNECT", "DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT", "TRACE"];
function w(e) {
  var t = e.toUpperCase();
  if (b.indexOf(t) > -1) {
    return t;
  } else {
    return e;
  }
}
function x(e, t) {
  if (!(this instanceof x)) {
    throw new TypeError("Please use the \"new\" operator, this DOM object constructor cannot be called as a function.");
  }
  t = t || {};
  var r = t.body;
  if (e instanceof x) {
    if (e.bodyUsed) {
      throw new TypeError("Already read");
    }
    this.url = e.url;
    this.credentials = e.credentials;
    if (!t.headers) {
      this.headers = new p(e.headers);
    }
    this.method = e.method;
    this.mode = e.mode;
    this.signal = e.signal;
    if (!r && e._bodyInit != null) {
      r = e._bodyInit;
      e.bodyUsed = true;
    }
  } else {
    this.url = String(e);
  }
  this.credentials = t.credentials || this.credentials || "same-origin";
  if (!!t.headers || !this.headers) {
    this.headers = new p(t.headers);
  }
  this.method = w(t.method || this.method || "GET");
  this.mode = t.mode || this.mode || null;
  this.signal = t.signal || this.signal || function () {
    if ("AbortController" in n) {
      var e = new AbortController();
      return e.signal;
    }
  }();
  this.referrer = null;
  if ((this.method === "GET" || this.method === "HEAD") && r) {
    throw new TypeError("Body not allowed for GET or HEAD requests");
  }
  this._initBody(r);
  if ((this.method === "GET" || this.method === "HEAD") && (t.cache === "no-store" || t.cache === "no-cache")) {
    var i = /([?&])_=[^&]*/;
    if (i.test(this.url)) {
      this.url = this.url.replace(i, "$1_=" + new Date().getTime());
    } else {
      var o = /\?/;
      this.url += (o.test(this.url) ? "&" : "?") + "_=" + new Date().getTime();
    }
  }
}
function E(e) {
  var t = new FormData();
  e.trim().split("&").forEach(function (e) {
    if (e) {
      var r = e.split("=");
      var n = r.shift().replace(/\+/g, " ");
      var i = r.join("=").replace(/\+/g, " ");
      t.append(decodeURIComponent(n), decodeURIComponent(i));
    }
  });
  return t;
}
function k(e) {
  var t = new p();
  var r = e.replace(/\r?\n[\t ]+/g, " ");
  r.split("\r").map(function (e) {
    if (e.indexOf("\n") === 0) {
      return e.substr(1, e.length);
    } else {
      return e;
    }
  }).forEach(function (e) {
    var r = e.split(":");
    var n = r.shift().trim();
    if (n) {
      var i = r.join(":").trim();
      try {
        t.append(n, i);
      } catch (o) {
        console.warn("Response " + o.message);
      }
    }
  });
  return t;
}
function S(e, t) {
  if (!(this instanceof S)) {
    throw new TypeError("Please use the \"new\" operator, this DOM object constructor cannot be called as a function.");
  }
  t ||= {};
  this.type = "default";
  this.status = t.status === undefined ? 200 : t.status;
  if (this.status < 200 || this.status > 599) {
    throw new RangeError("Failed to construct 'Response': The status provided (0) is outside the range [200, 599].");
  }
  this.ok = this.status >= 200 && this.status < 300;
  this.statusText = t.statusText === undefined ? "" : "" + t.statusText;
  this.headers = new p(t.headers);
  this.url = t.url || "";
  this._initBody(e);
}
x.prototype.clone = function () {
  return new x(this, {
    body: this._bodyInit
  });
};
h.call(x.prototype);
h.call(S.prototype);
S.prototype.clone = function () {
  return new S(this._bodyInit, {
    status: this.status,
    statusText: this.statusText,
    headers: new p(this.headers),
    url: this.url
  });
};
S.error = function () {
  var e = new S(null, {
    status: 200,
    statusText: ""
  });
  e.ok = false;
  e.status = 0;
  e.type = "error";
  return e;
};
var T = [301, 302, 303, 307, 308];
S.redirect = function (e, t) {
  if (T.indexOf(t) === -1) {
    throw new RangeError("Invalid status code");
  }
  return new S(null, {
    status: t,
    headers: {
      location: e
    }
  });
};
var C = n.DOMException;
try {
  new C();
} catch (_) {
  C = function (e, t) {
    this.message = e;
    this.name = t;
    var r = Error(e);
    this.stack = r.stack;
  };
  C.prototype = Object.create(Error.prototype);
  C.prototype.constructor = C;
}
function A(e, t) {
  return new Promise(function (r, o) {
    var a = new x(e, t);
    if (a.signal && a.signal.aborted) {
      return o(new C("Aborted", "AbortError"));
    }
    var s = new XMLHttpRequest();
    function c() {
      s.abort();
    }
    function d(e) {
      try {
        if (e === "" && n.location.href) {
          return n.location.href;
        } else {
          return e;
        }
      } catch (t) {
        return e;
      }
    }
    s.onload = function () {
      var e = {
        statusText: s.statusText,
        headers: k(s.getAllResponseHeaders() || "")
      };
      if (a.url.indexOf("file://") === 0 && (s.status < 200 || s.status > 599)) {
        e.status = 200;
      } else {
        e.status = s.status;
      }
      e.url = "responseURL" in s ? s.responseURL : e.headers.get("X-Request-URL");
      var t = "response" in s ? s.response : s.responseText;
      setTimeout(function () {
        r(new S(t, e));
      }, 0);
    };
    s.onerror = function () {
      setTimeout(function () {
        o(new TypeError("Network request failed"));
      }, 0);
    };
    s.ontimeout = function () {
      setTimeout(function () {
        o(new TypeError("Network request timed out"));
      }, 0);
    };
    s.onabort = function () {
      setTimeout(function () {
        o(new C("Aborted", "AbortError"));
      }, 0);
    };
    s.open(a.method, d(a.url), true);
    if (a.credentials === "include") {
      s.withCredentials = true;
    } else if (a.credentials === "omit") {
      s.withCredentials = false;
    }
    if ("responseType" in s) {
      if (i.blob) {
        s.responseType = "blob";
      } else if (i.arrayBuffer) {
        s.responseType = "arraybuffer";
      }
    }
    if (t && typeof t.headers === "object" && !(t.headers instanceof p) && (!n.Headers || !(t.headers instanceof n.Headers))) {
      var f = [];
      Object.getOwnPropertyNames(t.headers).forEach(function (e) {
        f.push(u(e));
        s.setRequestHeader(e, l(t.headers[e]));
      });
      a.headers.forEach(function (e, t) {
        if (f.indexOf(t) === -1) {
          s.setRequestHeader(t, e);
        }
      });
    } else {
      a.headers.forEach(function (e, t) {
        s.setRequestHeader(t, e);
      });
    }
    if (a.signal) {
      a.signal.addEventListener("abort", c);
      s.onreadystatechange = function () {
        if (s.readyState === 4) {
          a.signal.removeEventListener("abort", c);
        }
      };
    }
    s.send(typeof a._bodyInit === "undefined" ? null : a._bodyInit);
  });
}
A.polyfill = true;
if (!n.fetch) {
  n.fetch = A;
  n.Headers = p;
  n.Request = x;
  n.Response = S;
}
};
