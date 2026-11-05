// webpack module 15983 — body from webcrack
module.exports = function (module, exports, require) {
(function () {
  "use strict";

  if (typeof window === "object") {
    if ("IntersectionObserver" in window && "IntersectionObserverEntry" in window && "intersectionRatio" in window.IntersectionObserverEntry.prototype) {
      if (!("isIntersecting" in window.IntersectionObserverEntry.prototype)) {
        Object.defineProperty(window.IntersectionObserverEntry.prototype, "isIntersecting", {
          get: function () {
            return this.intersectionRatio > 0;
          }
        });
      }
    } else {
      var e = function (e) {
        var t = e;
        var r = i(t);
        while (r) {
          t = r.ownerDocument;
          r = i(t);
        }
        return t;
      }(window.document);
      var t = [];
      var r = null;
      var n = null;
      a.prototype.THROTTLE_TIMEOUT = 100;
      a.prototype.POLL_INTERVAL = null;
      a.prototype.USE_MUTATION_OBSERVER = true;
      a._setupCrossOriginUpdater = function () {
        r ||= function (e, r) {
          n = e && r ? m(e, r) : f();
          t.forEach(function (e) {
            e._checkForIntersections();
          });
        };
        return r;
      };
      a._resetCrossOriginUpdater = function () {
        r = null;
        n = null;
      };
      a.prototype.observe = function (e) {
        var t = this._observationTargets.some(function (t) {
          return t.element == e;
        });
        if (!t) {
          if (!e || e.nodeType != 1) {
            throw new Error("target must be an Element");
          }
          this._registerInstance();
          this._observationTargets.push({
            element: e,
            entry: null
          });
          this._monitorIntersections(e.ownerDocument);
          this._checkForIntersections();
        }
      };
      a.prototype.unobserve = function (e) {
        this._observationTargets = this._observationTargets.filter(function (t) {
          return t.element != e;
        });
        this._unmonitorIntersections(e.ownerDocument);
        if (this._observationTargets.length == 0) {
          this._unregisterInstance();
        }
      };
      a.prototype.disconnect = function () {
        this._observationTargets = [];
        this._unmonitorAllIntersections();
        this._unregisterInstance();
      };
      a.prototype.takeRecords = function () {
        var e = this._queuedEntries.slice();
        this._queuedEntries = [];
        return e;
      };
      a.prototype._initThresholds = function (e) {
        var t = e || [0];
        if (!Array.isArray(t)) {
          t = [t];
        }
        return t.sort().filter(function (e, t, r) {
          if (typeof e != "number" || isNaN(e) || e < 0 || e > 1) {
            throw new Error("threshold must be a number between 0 and 1 inclusively");
          }
          return e !== r[t - 1];
        });
      };
      a.prototype._parseRootMargin = function (e) {
        var t = e || "0px";
        var r = t.split(/\s+/).map(function (e) {
          var t = /^(-?\d*\.?\d+)(px|%)$/.exec(e);
          if (!t) {
            throw new Error("rootMargin must be specified in pixels or percent");
          }
          return {
            value: parseFloat(t[1]),
            unit: t[2]
          };
        });
        r[1] = r[1] || r[0];
        r[2] = r[2] || r[0];
        r[3] = r[3] || r[1];
        return r;
      };
      a.prototype._monitorIntersections = function (t) {
        var r = t.defaultView;
        if (r && this._monitoringDocuments.indexOf(t) == -1) {
          var n = this._checkForIntersections;
          var o = null;
          var a = null;
          if (this.POLL_INTERVAL) {
            o = r.setInterval(n, this.POLL_INTERVAL);
          } else {
            l(r, "resize", n, true);
            l(t, "scroll", n, true);
            if (this.USE_MUTATION_OBSERVER && "MutationObserver" in r) {
              a = new r.MutationObserver(n);
              a.observe(t, {
                attributes: true,
                childList: true,
                characterData: true,
                subtree: true
              });
            }
          }
          this._monitoringDocuments.push(t);
          this._monitoringUnsubscribes.push(function () {
            var e = t.defaultView;
            if (e) {
              if (o) {
                e.clearInterval(o);
              }
              c(e, "resize", n, true);
            }
            c(t, "scroll", n, true);
            if (a) {
              a.disconnect();
            }
          });
          var s = this.root && (this.root.ownerDocument || this.root) || e;
          if (t != s) {
            var u = i(t);
            if (u) {
              this._monitorIntersections(u.ownerDocument);
            }
          }
        }
      };
      a.prototype._unmonitorIntersections = function (t) {
        var r = this._monitoringDocuments.indexOf(t);
        if (r != -1) {
          var n = this.root && (this.root.ownerDocument || this.root) || e;
          var o = this._observationTargets.some(function (e) {
            var r = e.element.ownerDocument;
            if (r == t) {
              return true;
            }
            while (r && r != n) {
              var o = i(r);
              r = o && o.ownerDocument;
              if (r == t) {
                return true;
              }
            }
            return false;
          });
          if (!o) {
            var a = this._monitoringUnsubscribes[r];
            this._monitoringDocuments.splice(r, 1);
            this._monitoringUnsubscribes.splice(r, 1);
            a();
            if (t != n) {
              var s = i(t);
              if (s) {
                this._unmonitorIntersections(s.ownerDocument);
              }
            }
          }
        }
      };
      a.prototype._unmonitorAllIntersections = function () {
        var e = this._monitoringUnsubscribes.slice(0);
        this._monitoringDocuments.length = 0;
        this._monitoringUnsubscribes.length = 0;
        for (var t = 0; t < e.length; t++) {
          e[t]();
        }
      };
      a.prototype._checkForIntersections = function () {
        if (this.root || !r || n) {
          var e = this._rootIsInDom();
          var t = e ? this._getRootRect() : f();
          this._observationTargets.forEach(function (n) {
            var i = n.element;
            var a = d(i);
            var u = this._rootContainsTarget(i);
            var l = n.entry;
            var c = e && u && this._computeTargetAndRootIntersection(i, a, t);
            var p = null;
            if (this._rootContainsTarget(i)) {
              if (!r || !!this.root) {
                p = t;
              }
            } else {
              p = f();
            }
            var g = n.entry = new o({
              time: s(),
              target: i,
              boundingClientRect: a,
              rootBounds: p,
              intersectionRect: c
            });
            if (l) {
              if (e && u) {
                if (this._hasCrossedThreshold(l, g)) {
                  this._queuedEntries.push(g);
                }
              } else if (l && l.isIntersecting) {
                this._queuedEntries.push(g);
              }
            } else {
              this._queuedEntries.push(g);
            }
          }, this);
          if (this._queuedEntries.length) {
            this._callback(this.takeRecords(), this);
          }
        }
      };
      a.prototype._computeTargetAndRootIntersection = function (t, i, o) {
        if (window.getComputedStyle(t).display != "none") {
          var a = i;
          var s = y(t);
          var u = false;
          while (!u && s) {
            var l = null;
            var c = s.nodeType == 1 ? window.getComputedStyle(s) : {};
            if (c.display == "none") {
              return null;
            }
            if (s == this.root || s.nodeType == 9) {
              u = true;
              if (s == this.root || s == e) {
                if (r && !this.root) {
                  if (!n || n.width == 0 && n.height == 0) {
                    s = null;
                    l = null;
                    a = null;
                  } else {
                    l = n;
                  }
                } else {
                  l = o;
                }
              } else {
                var f = y(s);
                var g = f && d(f);
                var v = f && this._computeTargetAndRootIntersection(f, g, o);
                if (g && v) {
                  s = f;
                  l = m(g, v);
                } else {
                  s = null;
                  a = null;
                }
              }
            } else {
              var h = s.ownerDocument;
              if (s != h.body && s != h.documentElement && c.overflow != "visible") {
                l = d(s);
              }
            }
            if (l) {
              a = p(l, a);
            }
            if (!a) {
              break;
            }
            s = s && y(s);
          }
          return a;
        }
      };
      a.prototype._getRootRect = function () {
        var t;
        if (this.root && !h(this.root)) {
          t = d(this.root);
        } else {
          var r = h(this.root) ? this.root : e;
          var n = r.documentElement;
          var i = r.body;
          t = {
            top: 0,
            left: 0,
            right: n.clientWidth || i.clientWidth,
            width: n.clientWidth || i.clientWidth,
            bottom: n.clientHeight || i.clientHeight,
            height: n.clientHeight || i.clientHeight
          };
        }
        return this._expandRectByRootMargin(t);
      };
      a.prototype._expandRectByRootMargin = function (e) {
        var t = this._rootMarginValues.map(function (t, r) {
          if (t.unit == "px") {
            return t.value;
          } else {
            return t.value * (r % 2 ? e.width : e.height) / 100;
          }
        });
        var r = {
          top: e.top - t[0],
          right: e.right + t[1],
          bottom: e.bottom + t[2],
          left: e.left - t[3]
        };
        r.width = r.right - r.left;
        r.height = r.bottom - r.top;
        return r;
      };
      a.prototype._hasCrossedThreshold = function (e, t) {
        var r = e && e.isIntersecting ? e.intersectionRatio || 0 : -1;
        var n = t.isIntersecting ? t.intersectionRatio || 0 : -1;
        if (r !== n) {
          for (var i = 0; i < this.thresholds.length; i++) {
            var o = this.thresholds[i];
            if (o == r || o == n || o < r !== o < n) {
              return true;
            }
          }
        }
      };
      a.prototype._rootIsInDom = function () {
        return !this.root || v(e, this.root);
      };
      a.prototype._rootContainsTarget = function (t) {
        var r = this.root && (this.root.ownerDocument || this.root) || e;
        return v(r, t) && (!this.root || r == t.ownerDocument);
      };
      a.prototype._registerInstance = function () {
        if (t.indexOf(this) < 0) {
          t.push(this);
        }
      };
      a.prototype._unregisterInstance = function () {
        var e = t.indexOf(this);
        if (e != -1) {
          t.splice(e, 1);
        }
      };
      window.IntersectionObserver = a;
      window.IntersectionObserverEntry = o;
    }
  }
  function i(e) {
    try {
      return e.defaultView && e.defaultView.frameElement || null;
    } catch (t) {
      return null;
    }
  }
  function o(e) {
    this.time = e.time;
    this.target = e.target;
    this.rootBounds = g(e.rootBounds);
    this.boundingClientRect = g(e.boundingClientRect);
    this.intersectionRect = g(e.intersectionRect || f());
    this.isIntersecting = !!e.intersectionRect;
    var t = this.boundingClientRect;
    var r = t.width * t.height;
    var n = this.intersectionRect;
    var i = n.width * n.height;
    this.intersectionRatio = r ? Number((i / r).toFixed(4)) : this.isIntersecting ? 1 : 0;
  }
  function a(e, t) {
    var r = t || {};
    if (typeof e != "function") {
      throw new Error("callback must be a function");
    }
    if (r.root && r.root.nodeType != 1 && r.root.nodeType != 9) {
      throw new Error("root must be a Document or Element");
    }
    this._checkForIntersections = u(this._checkForIntersections.bind(this), this.THROTTLE_TIMEOUT);
    this._callback = e;
    this._observationTargets = [];
    this._queuedEntries = [];
    this._rootMarginValues = this._parseRootMargin(r.rootMargin);
    this.thresholds = this._initThresholds(r.threshold);
    this.root = r.root || null;
    this.rootMargin = this._rootMarginValues.map(function (e) {
      return e.value + e.unit;
    }).join(" ");
    this._monitoringDocuments = [];
    this._monitoringUnsubscribes = [];
  }
  function s() {
    return window.performance && performance.now && performance.now();
  }
  function u(e, t) {
    var r = null;
    return function () {
      r ||= setTimeout(function () {
        e();
        r = null;
      }, t);
    };
  }
  function l(e, t, r, n) {
    if (typeof e.addEventListener == "function") {
      e.addEventListener(t, r, n || false);
    } else if (typeof e.attachEvent == "function") {
      e.attachEvent("on" + t, r);
    }
  }
  function c(e, t, r, n) {
    if (typeof e.removeEventListener == "function") {
      e.removeEventListener(t, r, n || false);
    } else if (typeof e.detachEvent == "function") {
      e.detachEvent("on" + t, r);
    }
  }
  function p(e, t) {
    var r = Math.max(e.top, t.top);
    var n = Math.min(e.bottom, t.bottom);
    var i = Math.max(e.left, t.left);
    var o = Math.min(e.right, t.right);
    var a = o - i;
    var s = n - r;
    return a >= 0 && s >= 0 && {
      top: r,
      bottom: n,
      left: i,
      right: o,
      width: a,
      height: s
    } || null;
  }
  function d(e) {
    var t;
    try {
      t = e.getBoundingClientRect();
    } catch (r) {}
    if (t) {
      if (!t.width || !t.height) {
        t = {
          top: t.top,
          right: t.right,
          bottom: t.bottom,
          left: t.left,
          width: t.right - t.left,
          height: t.bottom - t.top
        };
      }
      return t;
    } else {
      return f();
    }
  }
  function f() {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0
    };
  }
  function g(e) {
    if (!e || "x" in e) {
      return e;
    } else {
      return {
        top: e.top,
        y: e.top,
        bottom: e.bottom,
        left: e.left,
        x: e.left,
        right: e.right,
        width: e.width,
        height: e.height
      };
    }
  }
  function m(e, t) {
    var r = t.top - e.top;
    var n = t.left - e.left;
    return {
      top: r,
      left: n,
      height: t.height,
      width: t.width,
      bottom: r + t.height,
      right: n + t.width
    };
  }
  function v(e, t) {
    var r = t;
    while (r) {
      if (r == e) {
        return true;
      }
      r = y(r);
    }
    return false;
  }
  function y(t) {
    var r = t.parentNode;
    if (t.nodeType == 9 && t != e) {
      return i(t);
    } else {
      if (r && r.assignedSlot) {
        r = r.assignedSlot.parentNode;
      }
      if (r && r.nodeType == 11 && r.host) {
        return r.host;
      } else {
        return r;
      }
    }
  }
  function h(e) {
    return e && e.nodeType === 9;
  }
})();
};
