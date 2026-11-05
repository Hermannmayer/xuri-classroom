// webpack module 81715 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  pJ: function () {
    return V;
  },
  Vo: function () {
    return b;
  },
  hd: function () {
    return K;
  },
  hi: function () {
    return y;
  },
  on: function () {
    return A;
  },
  Gr: function () {
    return B;
  },
  LR: function () {
    return C;
  },
  UJ: function () {
    return H;
  },
  a4: function () {
    return W;
  },
  Ee: function () {
    return J.Ee;
  },
  hE: function () {
    return T;
  },
  WO: function () {
    return _;
  },
  eM: function () {
    return G;
  },
  Ge: function () {
    return $;
  },
  ok: function () {
    return N;
  },
  dD: function () {
    return M;
  },
  LF: function () {
    return Y;
  },
  iZ: function () {
    return Q;
  },
  m2: function () {
    return R;
  },
  dk: function () {
    return I;
  },
  zE: function () {
    return Z;
  }
});
var n = require("./91613.js");
require("./95307.js");
var i = require("./16179.js");
var o = require("./92145.js");
var a = require("./23639.js");
var s = require("./67012.js");
var u = require("./15162.js");
var l = require("./59859.js");
var c = require("./88769.js");
var p = require("./47493.js");
function d(e, t) {
  var n;
  return (c.lw === null || c.lw === undefined || (n = (0, c.lw)()) === null || n === undefined ? undefined : n.formatMessage({
    id: e,
    defaultMessage: t
  })) ?? t;
}
function f() {
  var e;
  return (c.lw === null || c.lw === undefined || (e = (0, c.lw)()) === null || e === undefined ? undefined : e.locale) || (typeof navigator !== "undefined" ? navigator.language : undefined) || "zh-CN";
}
function g(e) {
  var t = e + "=";
  for (var r = document.cookie.split(";"), n = 0; n < r.length; n++) {
    var i = r[n].trim();
    if (i.indexOf(t) == 0) {
      return i.substring(t.length, i.length);
    }
  }
  return "";
}
function m(e, t, r, n) {
  return v.apply(this, arguments);
}
function v() {
  v = (0, a.Z)((0, o.Z)().mark(function e(t, r, a, c) {
    return (0, o.Z)().wrap(function (e) {
      while (1) {
        switch (e.prev = e.next) {
          case 0:
            return e.abrupt("return", (0, s.Z)((0, n.Z)({
              url: r,
              method: t,
              data: a,
              transformResponse: [function (e) {
                var t = JSON.parse(e);
                if (t.code === 200) {
                  t.success = true;
                } else if (t.code === 401) {
                  t.success = false;
                  l.m8.push("/user/login");
                } else {
                  t.success = false;
                }
                return t;
              }],
              headers: {
                Accept: "application/json",
                "Accept-Language": f(),
                "Cache-Control": "no-cache",
                "X-XSRF-TOKEN": g("XSRF-TOKEN"),
                Expires: "-1",
                Pragma: "no-cache",
                "Content-Type": a instanceof FormData ? "multipart/form-data" : "application/json"
              },
              params: t === "GET" ? a : undefined,
              paramsSerializer: function (e) {
                return u.stringify(e, {
                  skipNull: true,
                  skipEmptyString: true
                });
              },
              withCredentials: true
            }, c)).then(function (e) {
              if (e.data.code === 403) {
                i.default.error(d("pages.api.error.unauthorized", "未授权访问"));
              }
              if (e.data.code === 4043) {
                i.default.error(e.data.message);
              }
              return e.data;
            }).catch(function (e) {
              console.error(e);
              var t = d("pages.api.error.network", "网络连接失败");
              i.default.error(t);
              return {
                code: 504,
                success: false,
                message: t
              };
            }));
          case 1:
          case "end":
            return e.stop();
        }
      }
    }, e);
  }));
  return v.apply(this, arguments);
}
var y = {
  put: function (e, t) {
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              r.next = 2;
              return m("PUT", e, t);
            case 2:
              return r.abrupt("return", r.sent);
            case 3:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  delete: function (e) {
    return (0, a.Z)((0, o.Z)().mark(function t() {
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              t.next = 2;
              return m("DELETE", e);
            case 2:
              return t.abrupt("return", t.sent);
            case 3:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  post: function (e, t) {
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              r.next = 2;
              return m("POST", e, t);
            case 2:
              return r.abrupt("return", r.sent);
            case 3:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  patch: function (e, t) {
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              r.next = 2;
              return m("PATCH", e, t);
            case 2:
              return r.abrupt("return", r.sent);
            case 3:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  get: function (e, t) {
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              r.next = 2;
              return m("GET", e, t).then(function (e) {
                if (e.code === 200) {
                  return e.data;
                }
              });
            case 2:
              return r.abrupt("return", r.sent);
            case 3:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  upload: function (e, t, r) {
    return (0, a.Z)((0, o.Z)().mark(function n() {
      var a;
      var s;
      var u;
      return (0, o.Z)().wrap(function (n) {
        while (1) {
          switch (n.prev = n.next) {
            case 0:
              a = (0, p.wr)();
              if (!Object.values(t).some(function (e) {
                return e instanceof Blob && e.size > a * 1024 * 1024;
              })) {
                n.next = 5;
                break;
              }
              s = (0, c.lw)().formatMessage({
                id: "pages.common.upload.sizeExceeded",
                defaultMessage: "单个文件不能超过 {size} MB"
              }, {
                size: a
              });
              i.default.error(s);
              return n.abrupt("return", {
                code: 500,
                success: false,
                message: s
              });
            case 5:
              u = new FormData();
              Object.keys(t).forEach(function (e) {
                if (t[e]) {
                  u.append(e, t[e]);
                }
              });
              return n.abrupt("return", m("POST", e, u, {
                transformRequest: function (e) {
                  e.toString = function () {
                    return "[object FormData]";
                  };
                  return e;
                },
                onUploadProgress: function (e) {
                  if (r) {
                    r(e);
                  }
                }
              }));
            case 8:
            case "end":
              return n.stop();
          }
        }
      }, n);
    }))();
  },
  download: function (e, t) {
    return (0, a.Z)((0, o.Z)().mark(function r() {
      var i;
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              i = typeof e === "string" ? {
                url: e
              } : e;
              return r.abrupt("return", (0, s.Z)((0, n.Z)({
                method: "GET",
                responseType: "blob",
                headers: {
                  Accept: "application/json",
                  "Accept-Language": f(),
                  "Cache-Control": "no-cache",
                  "X-XSRF-TOKEN": g("XSRF-TOKEN"),
                  Expires: "-1",
                  Pragma: "no-cache"
                },
                withCredentials: true,
                onDownloadProgress: function (e) {
                  if (t) {
                    t(e.loaded);
                  }
                }
              }, i)).then(function () {
                var r = (0, a.Z)((0, o.Z)().mark(function r(n) {
                  var i;
                  var a;
                  var s;
                  var u;
                  var l;
                  return (0, o.Z)().wrap(function (r) {
                    while (1) {
                      switch (r.prev = r.next) {
                        case 0:
                          if (n.headers["content-disposition"] || !String(n.headers["content-type"]).includes("application/json")) {
                            r.next = 7;
                            break;
                          }
                          r.t0 = JSON;
                          r.next = 4;
                          return n.data.text();
                        case 4:
                          r.t1 = r.sent;
                          i = r.t0.parse.call(r.t0, r.t1);
                          throw new Error(i.message || d("pages.api.error.network", "网络连接失败"));
                        case 7:
                          a = n.headers["content-disposition"];
                          s = typeof e !== "string" && e.fileName ? e.fileName : decodeURI((a === null || a === undefined ? undefined : a.substr(a.indexOf("=") + 1)) || "download");
                          u = window.URL.createObjectURL(new Blob([n.data]));
                          l = document.createElement("a");
                          l.href = u;
                          l.setAttribute("download", s);
                          document.body.appendChild(l);
                          l.click();
                          document.body.removeChild(l);
                          window.URL.revokeObjectURL(u);
                          if (t) {
                            t("done");
                          }
                        case 18:
                        case "end":
                          return r.stop();
                      }
                    }
                  }, r);
                }));
                return function (e) {
                  return r.apply(this, arguments);
                };
              }()));
            case 2:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  getWithPagination: function (e, t) {
    var r = this;
    return (0, a.Z)((0, o.Z)().mark(function i() {
      var a;
      var s;
      var u;
      var l;
      return (0, o.Z)().wrap(function (i) {
        while (1) {
          switch (i.prev = i.next) {
            case 0:
              a = t.current;
              s = a === undefined ? 1 : a;
              u = t.pageSize;
              l = u === undefined ? 10 : u;
              return i.abrupt("return", r.get(e, t).then(function (e) {
                if (e) {
                  return (0, n.Z)({
                    current: s,
                    pageSize: l,
                    data: e.list
                  }, e);
                } else {
                  return {
                    current: s,
                    pageSize: l,
                    list: [],
                    total: 0
                  };
                }
              }));
            case 2:
            case "end":
              return i.stop();
          }
        }
      }, i);
    }))();
  },
  logout: function () {
    var e = this;
    return (0, a.Z)((0, o.Z)().mark(function t() {
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              return t.abrupt("return", e.post("/api/public/logout"));
            case 1:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  dbInitEnvironment: function () {
    var e = this;
    return (0, a.Z)((0, o.Z)().mark(function t() {
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              return t.abrupt("return", e.get("/api/public/dbInit/environment"));
            case 1:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  dbInitTest: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/public/dbInit/test", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  dbInit: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/public/dbInit", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  sysInfo: function () {
    var e = this;
    return (0, a.Z)((0, o.Z)().mark(function t() {
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              return t.abrupt("return", e.get("/api/system"));
            case 1:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  getAiSetting: function () {
    var e = this;
    return (0, a.Z)((0, o.Z)().mark(function t() {
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              return t.abrupt("return", e.get("/api/system/aiSetting"));
            case 1:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  getOAuthSetting: function () {
    var e = this;
    return (0, a.Z)((0, o.Z)().mark(function t() {
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              return t.abrupt("return", e.get("/api/system/oauthSetting"));
            case 1:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  updateOAuthSetting: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/oauthSetting", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  startOAuthLogin: function (e, t) {
    var r = this;
    return (0, a.Z)((0, o.Z)().mark(function n() {
      return (0, o.Z)().wrap(function (n) {
        while (1) {
          switch (n.prev = n.next) {
            case 0:
              return n.abrupt("return", r.post(`/api/public/oauth/login/${e}/start`, {
                redirect: t
              }));
            case 1:
            case "end":
              return n.stop();
          }
        }
      }, n);
    }))();
  },
  startOAuthBind: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post(`/api/oauth/bind/${e}/start`, {
                redirect: "/account/settings?tab=security"
              }));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  startSurveyWechatOAuth: function (e, t) {
    var r = this;
    return (0, a.Z)((0, o.Z)().mark(function n() {
      return (0, o.Z)().wrap(function (n) {
        while (1) {
          switch (n.prev = n.next) {
            case 0:
              return n.abrupt("return", r.post("/api/public/oauth/survey/wechat/start", {
                projectId: e,
                redirect: t
              }));
            case 1:
            case "end":
              return n.stop();
          }
        }
      }, n);
    }))();
  },
  getOAuthBindings: function () {
    var e = this;
    return (0, a.Z)((0, o.Z)().mark(function t() {
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              return t.abrupt("return", e.get("/api/oauth/bindings"));
            case 1:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  deleteOAuthBinding: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.delete(`/api/oauth/bindings/${e}`));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  getOAuthRegistration: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.get(`/api/public/oauth/register/${encodeURIComponent(e)}`));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  register: function (e) {
    return (0, a.Z)((0, o.Z)().mark(function t() {
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              return t.abrupt("return", y.post("/api/public/register", e));
            case 1:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  userOverview: function () {
    return (0, a.Z)((0, o.Z)().mark(function e() {
      return (0, o.Z)().wrap(function (e) {
        while (1) {
          switch (e.prev = e.next) {
            case 0:
              return e.abrupt("return", y.get("/api/userOverview"));
            case 1:
            case "end":
              return e.stop();
          }
        }
      }, e);
    }))();
  },
  getRegisterRoles: function () {
    return (0, a.Z)((0, o.Z)().mark(function e() {
      return (0, o.Z)().wrap(function (e) {
        while (1) {
          switch (e.prev = e.next) {
            case 0:
              return e.abrupt("return", y.get("/api/public/listRegisterRole"));
            case 1:
            case "end":
              return e.stop();
          }
        }
      }, e);
    }))();
  },
  updateSysInfo: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/update", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  exportSystemBackup: function () {
    var e = this;
    return (0, a.Z)((0, o.Z)().mark(function t() {
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              return t.abrupt("return", e.download("/api/system/backup/export"));
            case 1:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  importSystemBackup: function (e) {
    return (0, a.Z)((0, o.Z)().mark(function t() {
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              return t.abrupt("return", m("POST", "/api/system/backup/import", e.file, {
                headers: {
                  Accept: "application/json",
                  "Accept-Language": f(),
                  "X-XSRF-TOKEN": g("XSRF-TOKEN"),
                  "Content-Type": "application/octet-stream"
                }
              }));
            case 1:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  loadProjects: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.getWithPagination("/api/project/list", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  loadProject: function (e) {
    return this.get(`/api/project?id=${e}`);
  },
  getDeletedProject: function () {
    return this.get("/api/project/trash");
  },
  destroyProject: function (e) {
    return this.post("/api/project/destroy", {
      ids: e
    });
  },
  restoreProject: function (e) {
    return this.post("/api/project/restore", {
      ids: e
    });
  },
  loadData: function (e) {
    return this.getWithPagination("/api/answer/list", e);
  },
  loadDeletedData: function (e) {
    return this.get("/api/answer/trash", e);
  },
  saveAnswer: function (e) {
    return this.post("/api/answer/create", e);
  },
  restoreAnswer: function (e) {
    return this.post("/api/answer/restore", {
      ids: e
    });
  },
  updateAnswer: function (e) {
    return this.post("/api/answer/update", e);
  },
  deleteAnswer: function (e) {
    return this.post("/api/answer/delete", {
      ids: e
    });
  },
  physicalDeleteAnswer: function (e) {
    return this.post("/api/answer/destroy", {
      ids: e
    });
  },
  saveProject: function (e) {
    return this.post("/api/project/create", e);
  },
  updateProject: function (e) {
    return this.post("/api/project/update", e);
  },
  deleteProject: function (e) {
    return this.post("/api/project/delete", {
      id: e
    });
  },
  updateSetting: function (e) {
    return this.post("/api/project/update", e);
  },
  loadReportData: function (e, t = "") {
    return this.get(`/api/report/${e}?search=${t}`);
  },
  loadFiles: function (e) {
    return this.get("/api/file/list", e);
  },
  uploadImage: function (e, t, r) {
    return this.upload("/api/file/create", {
      fileType: e,
      file: t,
      publicRead: true
    }, r);
  },
  deleteImage: function (e) {
    return this.post("/api/file/delete", {
      id: e
    });
  },
  getTemplate: function (e) {
    return this.get("/api/template/get", e);
  },
  loadTemplate: function (e) {
    return this.getWithPagination("/api/template/list", e);
  },
  saveTemplate: function (e) {
    return this.post("/api/template/create", e);
  },
  deleteTemplate: function () {
    for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) {
      t[r] = arguments[r];
    }
    return this.post("/api/template/delete", {
      ids: t
    });
  },
  loadCategories: function (e) {
    return this.get("/api/template/listCategory", e);
  },
  loadTags: function (e) {
    return this.get("/api/template/listTag", e);
  },
  loadRoles: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.getWithPagination("/api/system/role/list", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  deleteRole: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/role/delete", {
                id: e
              }));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  saveRole: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/role/create", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  updateRole: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/role/update", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  loadPermissions: function () {
    return this.get("/api/system/permission/list");
  },
  loadUsers: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.getWithPagination("/api/system/user/list", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  deleteUser: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/user/delete", {
                id: e
              }));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  saveUser: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/user/create", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  updateUser: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/user/update", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  updateUserInfo: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/user", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  checkUsernameExist: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.get("/api/system/checkUsernameExist", {
                username: e
              }));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  loadDepts: function () {
    var e = this;
    return (0, a.Z)((0, o.Z)().mark(function t() {
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              return t.abrupt("return", e.get("/api/system/dept/list"));
            case 1:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  saveDept: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/dept/create", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  updateDept: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/dept/update", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  sortDept: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/dept/sort", {
                nodes: e
              }));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  deleteDept: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/dept/delete", {
                id: e
              }));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  loadPositions: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.getWithPagination("/api/system/position/list", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  savePosition: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/position/create", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  updatePosition: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/position/update", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  deletePosition: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/position/delete", {
                id: e
              }));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  saveFlow: function (e) {
    return this.post("/api/workflow/saveFlow", e);
  },
  getFlow: function (e) {
    return this.get(`/api/workflow/getFlow?projectId=${e}`);
  },
  deployFlow: function (e) {
    return this.post(`/api/workflow/deploy?projectId=${e}`);
  },
  loadFlowTasks: function (e) {
    return this.getWithPagination("/api/workflow/getFlowTasks", e);
  },
  loadFlowSchema: function (e) {
    return this.get("/api/workflow/loadSchema", e);
  },
  approvalTask: function (e) {
    return this.post("/api/workflow/approvalTask", e);
  },
  getFlowStatics: function () {
    return this.get("/api/workflow/statics");
  },
  getAuditRecord: function (e) {
    return this.get(`/api/workflow/getAuditRecord?processInstanceId=${e}`);
  },
  getRevertNodes: function (e) {
    return this.get(`/api/workflow/getRevertNodes?processInstanceId=${e}`);
  },
  loadProjectPartner: function (e) {
    return this.getWithPagination("/api/project/partner/list", e);
  },
  addProjectPartner: function (e) {
    return this.post("/api/project/partner/create", e);
  },
  deleteProjectPartner: function (e) {
    return this.post("/api/project/partner/delete", e);
  },
  importProjectPartner: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.upload("/api/project/partner/import", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  selectUser: function (e) {
    return this.post("/api/project/selectUser", e);
  },
  selectDept: function (e) {
    return this.post("/api/project/selectDept", e);
  },
  selectRole: function (e) {
    return this.post("/api/project/selectRole", e);
  },
  selectDict: function () {
    return this.post("/api/project/selectDict");
  },
  selectPosition: function (e) {
    return this.post("/api/project/selectPosition", e);
  },
  selectTemplate: function (e) {
    return this.post("/api/project/selectTemplate", e);
  },
  selectRepo: function (e) {
    return this.post("/api/project/selectRepo", e);
  },
  selectTag: function (e) {
    return this.post("/api/project/selectTag", e);
  },
  loadRepo: function (e) {
    return this.getWithPagination("/api/repo/list", e);
  },
  loadRepoPartner: function (e) {
    return this.getWithPagination("/api/repo/partner/list", e);
  },
  addRepoPartner: function (e) {
    return this.post("/api/repo/partner/create", e);
  },
  deleteRepoPartner: function (e) {
    return this.post("/api/repo/partner/delete", e);
  },
  saveOrUpdateRepo: function (e) {
    if (e.id) {
      return this.post("/api/repo/update", e);
    } else {
      return this.post("/api/repo/create", e);
    }
  },
  deleteRepo: function (e) {
    return this.post("/api/repo/delete", {
      id: e
    });
  },
  batchAddRepoTemplate: function (e) {
    return this.post("/api/repo/batchCreate", e);
  },
  pickRepoQuestion: function (e) {
    return this.post("/api/repo/pick", e);
  },
  batchUnbindRepoTemplate: function (e, t) {
    return this.post("/api/repo/unbind", {
      repoId: e,
      ids: t
    });
  },
  loadQuery: function (e) {
    return this.post("/api/public/loadQuery", e);
  },
  loadDict: function (e) {
    return this.post("/api/public/loadDict", e);
  },
  loadExamResult: function (e) {
    return this.post("/api/public/loadExamResult", e);
  },
  loadLinkResult: function (e) {
    return this.post("/api/public/loadLinkResult", e);
  },
  getQueryResult: function (e) {
    return this.post("/api/public/getQueryResult", e);
  },
  loadDicts: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.getWithPagination("/api/system/dict/list", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  saveDict: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/dict/create", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  updateDict: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/dict/update", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  deleteDict: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/dict/delete", {
                id: e
              }));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  loadDictItems: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.getWithPagination("/api/system/dictItem/list", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  saveOrUpdateDictItem: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              if (!e.id) {
                r.next = 2;
                break;
              }
              return r.abrupt("return", t.post("/api/system/dictItem/update", e));
            case 2:
              return r.abrupt("return", t.post("/api/system/dictItem/create", e));
            case 3:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  deleteDictItem: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/system/dictItem/delete", {
                id: e
              }));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  importDictItems: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.upload("/api/system/dictItem/import", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  listUserBook: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.getWithPagination("/api/repo/book/list", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  getUserBookQuestion: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.get("/api/repo/book/question", {
                id: e
              }));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  createUserBook: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/repo/book/create", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  updateUserBook: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/repo/book/update", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  deleteUserBook: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/repo/book/delete", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  listUserTask: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.getWithPagination("/api/listUserTask", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  listHistoryTask: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.getWithPagination("/api/listHistoryTask", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  listExercise: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.getWithPagination("/api/exercise/list", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  deleteExercise: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/exercise/delete", {
                ids: e
              }));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  getAIModels: function () {
    var e = this;
    return (0, a.Z)((0, o.Z)().mark(function t() {
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              return t.abrupt("return", e.get("/api/ai/chat/models"));
            case 1:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  createAIConversation: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/ai/chat/create-conversation", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  createAIAnswerAnalysisConversation: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              return r.abrupt("return", t.post("/api/ai/chat/answer-analysis/create-conversation", e));
            case 1:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  createAIChatStream: function (e) {
    return (0, a.Z)((0, o.Z)().mark(function t() {
      var r;
      var n;
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              r = new URLSearchParams();
              if (e.content) {
                r.append("content", e.content);
              }
              if (e.model) {
                r.append("model", e.model);
              }
              if (e.conversationId) {
                r.append("conversation_id", e.conversationId);
              }
              if (e.locale) {
                r.append("locale", e.locale);
              }
              n = `/api/ai/chat/stream?${r.toString()}`;
              return t.abrupt("return", new EventSource(n, {
                withCredentials: true
              }));
            case 7:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  createAIAnswerAnalysisStream: function (e) {
    return (0, a.Z)((0, o.Z)().mark(function t() {
      var r;
      var n;
      return (0, o.Z)().wrap(function (t) {
        while (1) {
          switch (t.prev = t.next) {
            case 0:
              r = new URLSearchParams();
              if (e.content) {
                r.append("content", e.content);
              }
              if (e.model) {
                r.append("model", e.model);
              }
              if (e.conversationId) {
                r.append("conversation_id", e.conversationId);
              }
              n = `/api/ai/chat/answer-analysis/stream?${r.toString()}`;
              return t.abrupt("return", new EventSource(n, {
                withCredentials: true
              }));
            case 6:
            case "end":
              return t.stop();
          }
        }
      }, t);
    }))();
  },
  closeAIConversation: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      var n;
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              n = new URLSearchParams();
              n.append("conversationId", e);
              return r.abrupt("return", t.post(`/api/ai/chat/close-conversation?${n.toString()}`));
            case 3:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  },
  closeAIAnswerAnalysisConversation: function (e) {
    var t = this;
    return (0, a.Z)((0, o.Z)().mark(function r() {
      var n;
      return (0, o.Z)().wrap(function (r) {
        while (1) {
          switch (r.prev = r.next) {
            case 0:
              n = new URLSearchParams();
              n.append("conversationId", e);
              return r.abrupt("return", t.post(`/api/ai/chat/answer-analysis/close-conversation?${n.toString()}`));
            case 3:
            case "end":
              return r.stop();
          }
        }
      }, r);
    }))();
  }
};
var h = require("./59496.js");
var b = (0, h.createContext)({});
var w = require("./66439.js");
function x(e) {
  return typeof e === "function" || toString.call(e) === "[object Object]";
}
function E(e) {
  if (typeof e === "object") {
    return e === null;
  } else {
    return typeof e !== "function";
  }
}
function k(e) {
  return e !== "__proto__" && e !== "constructor" && e !== "prototype";
}
function S(e) {
  var t = 0;
  for (var r = arguments.length, n = new Array(r > 1 ? r - 1 : 0), i = 1; i < r; i++) {
    n[i - 1] = arguments[i];
  }
  if (E(e)) {
    e = n[t++];
  }
  e ||= {};
  for (; t < n.length; t++) {
    if (x(n[t])) {
      for (var o = 0, a = Object.keys(n[t]); o < a.length; o++) {
        var s = a[o];
        if (k(s)) {
          if (x(e[s]) && x(n[t][s])) {
            S(e[s], n[t][s]);
          } else {
            e[s] = n[t][s];
          }
        }
      }
    }
  }
  return e;
}
function T(e, t, r = "id", n = false) {
  if (!t) {
    return e;
  }
  var i = (0, w.Z)(e);
  while (i.length) {
    var o = i[n ? "pop" : "shift"]();
    if (o && o[r] === t) {
      return o;
    }
    if (o !== null && o !== undefined && o.children) {
      i.push.apply(i, (0, w.Z)(o.children));
    }
  }
  return null;
}
function C(e, t) {
  var r = document.createElement("a");
  r.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(t));
  r.setAttribute("download", e);
  r.style.display = "none";
  document.body.appendChild(r);
  r.click();
  document.body.removeChild(r);
}
function A() {
  var e = false;
  var t = navigator.userAgent.toLowerCase();
  var r = t ? t.match(/BeStore/i) : "";
  var n = /android/i.test(t);
  var i = /iphone|ipad|ipod/i.test(t);
  e = (r === null || r === undefined ? undefined : r.toString()) === "bestore";
  if (window.WeixinJSBridge) {
    window.WeixinJSBridge.call("closeWindow");
  } else if (window.AlipayJSBridge) {
    window.AlipayJSBridge.call("closeWebview");
  } else if (e && n) {
    window.obj.closePageLppzRequest("");
  } else if (e && i) {
    window.webkit.messageHandlers.closePageLppzRequest.postMessage("");
  } else {
    window.close();
  }
}
function _(e) {
  var t = document.createElement("div");
  function r(e) {
    var t = e.getElementsByClassName("ql-formula");
    while (t.length > 0) {
      var r;
      var n = t[0].dataset.value;
      if ((r = t[0].parentNode) !== null && r !== undefined) {
        r.append(n);
      }
      t[0].parentNode.removeChild(t[0]);
    }
  }
  t.innerHTML = e || "";
  r(t);
  return t.textContent || t.innerText || "";
}
window.assignDeep = S;
var O = require("./41165.js");
function M() {
  return (0, O.a)().isMobile;
}
var P = require("./70769.js");
function q() {
  return (0, h.useContext)(P.Il);
}
function N() {
  return q().homeStore;
}
function R() {
  return q().systemStore;
}
function I(e) {
  var t = q();
  if (e === 0) {
    return t.privateTemplateStore;
  } else {
    return t.publicTemplateStore;
  }
}
function j(e) {
  var t = h.useRef(e);
  h.useEffect(function () {
    t.current = e;
  });
  return t;
}
var D = j;
var L = typeof performance !== "undefined" ? performance : Date;
function F() {
  return L.now();
}
function Z(e, t = 30, r = false) {
  var n = D(e);
  var i = 1000 / t;
  var o = h.useRef(0);
  var a = h.useRef();
  function s() {
    return a.current && clearTimeout(a.current);
  }
  var u = [t, r, n];
  h.useEffect(function () {
    return function () {
      o.current = 0;
      s();
    };
  }, u);
  return h.useCallback(function () {
    var e = arguments;
    var t = F();
    function u() {
      o.current = t;
      s();
      n.current.apply(null, e);
    }
    var l = o.current;
    if (r && l === 0) {
      return u();
    }
    if (t - l > i) {
      if (l > 0) {
        return u();
      }
      o.current = t;
    }
    s();
    a.current = setTimeout(function () {
      u();
      o.current = 0;
    }, i);
  }, u);
}
var z = require("./1521.js");
var U = require("./4637.js");
function B(e, t) {
  return function (r) {
    var i = r.name || t?.name;
    if (!i) {
      throw new Error("field name 未定义");
    }
    var o = (0, h.useMemo)(function () {
      return (0, z.$j)((0, z.Pi)(e), (0, z.jM)(function (e, t) {
        return (0, n.Z)((0, n.Z)({}, e), {}, {
          onChange: function (e) {
            t.onInput(e);
          },
          hasError: t.errors.length > 0
        });
      }));
    }, []);
    return (0, U.jsx)(z.gN, (0, n.Z)((0, n.Z)((0, n.Z)({}, r), t), {}, {
      name: i,
      component: [o, r],
      reactions: [function (e) {
        var t = r.syncDisplay;
        if (t) {
          if (typeof t === "string") {
            var n = e.query(e.path.parent().concat(t)).get("value");
            e.display = n ? "visible" : "none";
          } else if (typeof t === "object") {
            Object.keys(t).forEach(function (r) {
              var n = e.query(e.path.parent().concat(r)).get("value");
              if (t[r].includes(n)) {
                e.display = "visible";
              } else {
                e.display = "none";
              }
            });
          }
        }
        var i = r.mirrorFieldAddress;
        if (i) {
          var o = e.query(i);
          var a = o.get("value");
          if (a) {
            e.visible = true;
          } else if (o.take() !== undefined) {
            e.visible = false;
          }
        }
      }].concat((0, w.Z)(r.reactions || []))
    }));
  };
}
var V = "admin";
function H(e, t) {
  if (e.code === V) {
    return t.formatMessage({
      id: "pages.system.role.builtin.admin.name",
      defaultMessage: e.name
    });
  } else {
    return e.name;
  }
}
function W(e, t) {
  if (e.code === V) {
    return t.formatMessage({
      id: "pages.system.role.builtin.admin.remark",
      defaultMessage: e.remark
    });
  } else {
    return e.remark;
  }
}
function Y(e) {
  var t = R();
  var r = t.id2name;
  var i = (0, l.YB)();
  var o = t.depts;
  var a = t.roles;
  var s = t.positions;
  (0, h.useEffect)(function () {
    if (o.length === 0) {
      t.loadDepts();
    }
    if (a.length === 0) {
      t.loadRoles({
        pageSize: 1024
      });
    }
    if (s.length === 0) {
      t.loadPositions({
        pageSize: 1024
      });
    }
  }, []);
  (0, h.useEffect)(function () {
    var n = e.filter(function (e) {
      return e.startsWith("U:");
    }).map(function (e) {
      return e.split(":")[1];
    }).filter(function (e) {
      return !r.user[e];
    });
    if (n.length > 0) {
      t.loadUsers({
        ids: n
      });
    }
    n = e.filter(function (e) {
      return e.startsWith("R:");
    }).map(function (e) {
      return e.split(":")[1];
    }).filter(function (e) {
      return !r.role[e];
    });
    if (n.length > 0) {
      t.loadRoles({});
    }
    n = e.filter(function (e) {
      return e.startsWith("P:");
    }).map(function (e) {
      return e.split(":")[1];
    }).filter(function (e) {
      return !r.org[e];
    });
    if (n.length > 0) {
      t.loadDepts();
    }
    n = e.filter(function (e) {
      return e.startsWith("P:");
    }).map(function (e) {
      return e.split(":")[2];
    }).filter(function (e) {
      return !r.position[e];
    });
    if (n.length > 0) {
      t.loadPositions({});
    }
  }, []);
  var u = (0, n.Z)({}, r.role);
  a.forEach(function (e) {
    u[e.id] = H(e, i);
  });
  return (0, n.Z)((0, n.Z)({}, r), {}, {
    role: u
  });
}
function Q(e, t) {
  var r = q();
  var n = r.projectStoreObj[e];
  if (e === "new") {
    return new P.Uf(e, t);
  } else {
    if (!n) {
      n = new P.Uf(e, t);
      r.projectStoreObj[e] = n;
    }
    return n;
  }
}
function $(e) {
  return Q(e).flowStore;
}
function G() {
  var e = q();
  return e.examStore;
}
var K = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9]{8,16}$/;
var J = require("./9598.js");
};
