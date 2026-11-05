// webpack module 70769 — body from webcrack
module.exports = function (module, exports, require) {
require.d(exports, {
  Cu: function () {
    return S;
  },
  Il: function () {
    return M;
  },
  __: function () {
    return n;
  },
  Uf: function () {
    return _;
  },
  ZP: function () {
    return O;
  }
});
var n;
var i = require("./45810.js");
var o = require("./8951.js");
var a = require("./59496.js");
var s = require("./92145.js");
var u = require("./23639.js");
var l = require("./81715.js");
var c = require("./87183.js");
var p = function () {
  function e() {
    (0, o.Z)(this, e);
    this.projects = [];
    this.pagination = {
      current: 1,
      pageSize: 25,
      total: 0
    };
    this.loading = false;
    this.total = 0;
    this.makeObservable();
  }
  (0, i.Z)(e, [{
    key: "makeObservable",
    value: function () {
      (0, c.Ou)(this, {
        projects: c.LO.ref,
        loading: c.LO.ref,
        total: c.LO.ref,
        loadProjects: c.aD
      });
    }
  }, {
    key: "loadProjects",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.loadProjects(t);
              case 3:
                r = e.sent;
                if (r) {
                  this.projects = r.list;
                  this.total = r.total;
                }
                this.loading = false;
              case 6:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }]);
  return e;
}();
var d = function () {
  function e() {
    (0, o.Z)(this, e);
    this.roles = [];
    this.loading = false;
    this.permissions = [];
    this.depts = [];
    this.positions = [];
    this.users = [];
    this.prevId2name = {
      user: {},
      org: {
        "${currentDeptId}": "发起人当前部门",
        "${parentDeptId}": "发起人上级部门"
      },
      position: {},
      role: {}
    };
    this.makeObservable();
  }
  (0, i.Z)(e, [{
    key: "makeObservable",
    value: function () {
      (0, c.Ou)(this, {
        roles: c.LO.ref,
        users: c.LO,
        loading: c.LO.ref,
        permissions: c.LO.ref,
        depts: c.LO.ref,
        positions: c.LO.ref,
        id2name: c.LO.computed,
        loadRoles: c.aD,
        deleteRole: c.aD,
        saveOrUpdateRole: c.aD,
        loadPermissions: c.aD,
        loadUsers: c.aD,
        deleteUser: c.aD,
        saveOrUpdateUser: c.aD,
        loadDepts: c.aD,
        deleteDept: c.aD,
        saveOrUpdateDept: c.aD,
        sortDept: c.aD
      });
    }
  }, {
    key: "id2name",
    get: function () {
      var e = this.prevId2name;
      this.users.map(function (t) {
        return e.user[t.id] = t.name;
      });
      this.roles.forEach(function (t) {
        return e.role[t.id] = t.name;
      });
      this.positions.forEach(function (t) {
        return e.position[t.id] = t.name;
      });
      this.depts.forEach(function (t) {
        return e.org[t.id] = t.name;
      });
      this.prevId2name = e;
      return e;
    }
  }, {
    key: "loadRoles",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.loadRoles(t);
              case 3:
                r = e.sent;
                if (r) {
                  this.roles = r.list;
                }
                this.loading = false;
                return e.abrupt("return", r);
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "deleteRole",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                return e.abrupt("return", l.hi.deleteRole(t));
              case 1:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "saveOrUpdateRole",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!t.id) {
                  e.next = 4;
                  break;
                }
                return e.abrupt("return", l.hi.updateRole(t));
              case 4:
                e.next = 6;
                return l.hi.saveRole(t);
              case 6:
                return e.abrupt("return", e.sent);
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "loadPermissions",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e() {
        var t;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.loadPermissions();
              case 2:
                t = e.sent;
                if (t) {
                  this.permissions = t;
                }
              case 4:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t() {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "loadUsers",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.loadUsers(t);
              case 3:
                r = e.sent;
                if (r) {
                  this.users = r.list;
                }
                this.loading = false;
                return e.abrupt("return", {
                  data: r.list,
                  success: true,
                  total: r.total
                });
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "deleteUser",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                return e.abrupt("return", l.hi.deleteUser(t));
              case 1:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "saveOrUpdateUser",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!t.id) {
                  e.next = 4;
                  break;
                }
                return e.abrupt("return", l.hi.updateUser(t));
              case 4:
                e.next = 6;
                return l.hi.saveUser(t);
              case 6:
                return e.abrupt("return", e.sent);
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "loadDepts",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e() {
        var t;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.loadDepts();
              case 3:
                t = e.sent;
                if (t) {
                  this.depts = t;
                }
                this.loading = false;
                return e.abrupt("return", t);
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t() {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "deleteDept",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.deleteDept(t);
              case 2:
                this.loadDepts();
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "saveOrUpdateDept",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!t.id) {
                  e.next = 6;
                  break;
                }
                e.next = 3;
                return l.hi.updateDept(t);
              case 3:
                r = e.sent;
                e.next = 9;
                break;
              case 6:
                e.next = 8;
                return l.hi.saveDept(t);
              case 8:
                r = e.sent;
              case 9:
                e.next = 11;
                return this.loadDepts();
              case 11:
                return e.abrupt("return", r);
              case 12:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "sortDept",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.sortDept(t);
              case 2:
                this.loadDepts();
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "loadPositions",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.loadPositions(t);
              case 3:
                r = e.sent;
                if (r.list) {
                  this.positions = r.list;
                }
                this.loading = false;
                return e.abrupt("return", r);
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "deletePosition",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.deletePosition(t);
              case 2:
                return e.abrupt("return", e.sent);
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "saveOrUpdatePosition",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!t.id) {
                  e.next = 6;
                  break;
                }
                e.next = 3;
                return l.hi.updatePosition(t);
              case 3:
                r = e.sent;
                e.next = 9;
                break;
              case 6:
                e.next = 8;
                return l.hi.savePosition(t);
              case 8:
                r = e.sent;
              case 9:
                return e.abrupt("return", r);
              case 10:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }]);
  return e;
}();
var f = require("./66439.js");
var g = require("./91613.js");
var m = function () {
  function e(t) {
    (0, o.Z)(this, e);
    this.templates = [];
    this.pagination = undefined;
    this.loading = false;
    this.total = 0;
    this.tags = [];
    this.categories = [];
    this.shared = undefined;
    this.shared = t;
    this.makeObservable();
  }
  (0, i.Z)(e, [{
    key: "makeObservable",
    value: function () {
      (0, c.Ou)(this, {
        templates: c.LO.ref,
        loading: c.LO.ref,
        total: c.LO.ref,
        tags: c.LO.ref,
        categories: c.LO.ref,
        loadTemplates: c.aD
      });
    }
  }, {
    key: "loadTemplates",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.loadTemplate((0, g.Z)((0, g.Z)({}, t), {}, {
                  shared: this.shared,
                  questionType: "Survey"
                }));
              case 3:
                r = e.sent;
                if (r) {
                  this.templates = r.list;
                  this.total = r.total;
                }
                this.loading = false;
              case 6:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "loadCategories",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e() {
        var t;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.loadCategories({
                  shared: this.shared
                });
              case 3:
                t = e.sent;
                if (t) {
                  this.categories = t;
                }
                this.loading = false;
              case 6:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t() {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "loadTags",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e() {
        var t;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.loadTags({
                  shared: this.shared
                });
              case 3:
                t = e.sent;
                if (t) {
                  this.tags = t;
                }
                this.loading = false;
              case 6:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t() {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "deleteTemplate",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.deleteTemplate(t);
              case 2:
                r = e.sent;
                if (r.success) {
                  this.templates = (0, f.Z)(this.templates.filter(function (e) {
                    return e.id !== t;
                  }));
                }
              case 4:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }]);
  return e;
}();
var v = function () {
  function e() {
    (0, o.Z)(this, e);
    this.repos = {
      list: [],
      total: 0
    };
    this.templates = {
      list: [],
      total: 0
    };
    this.loading = false;
    this.makeObservable();
  }
  (0, i.Z)(e, [{
    key: "makeObservable",
    value: function () {
      (0, c.Ou)(this, {
        repos: c.LO.shallow,
        templates: c.LO.shallow,
        loading: c.LO.ref
      });
    }
  }, {
    key: "loadTemplates",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.loadTemplate(t);
              case 3:
                r = e.sent;
                if (r) {
                  this.templates = r;
                }
                this.loading = false;
                return e.abrupt("return", r);
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }]);
  return e;
}();
var y = require("./43386.js");
require("./95307.js");
var h = require("./16179.js");
var b = require("./37913.js");
var w = require("./88769.js");
var x = ["list"];
var E = (w.XZ === null || w.XZ === undefined ? undefined : (0, w.XZ)()) || [];
function k(e, t, r) {
  var n;
  return (w.lw === null || w.lw === undefined || (n = (0, w.lw)()) === null || n === undefined ? undefined : n.formatMessage({
    id: e,
    defaultMessage: t
  }, r)) || t;
}
var S = function () {
  function e(t) {
    (0, o.Z)(this, e);
    this.records = [];
    this.deletedRecords = [];
    this.selected = [];
    this.selectedData = undefined;
    this.recycleSelected = [];
    this.currentIndex = -1;
    this.projectStore = undefined;
    this.loading = undefined;
    this.reportData = undefined;
    this.progress = undefined;
    this.pagination = {
      current: 1,
      pageSize: 100,
      total: 0
    };
    this.projectStore = t;
    this.makeObservable();
  }
  (0, i.Z)(e, [{
    key: "makeObservable",
    value: function () {
      (0, c.Ou)(this, {
        loading: c.LO.ref,
        pagination: c.LO.ref,
        records: c.LO.ref,
        deletedRecords: c.LO.ref,
        selected: c.LO.ref,
        recycleSelected: c.LO.ref,
        currentIndex: c.LO.ref,
        reportData: c.LO.ref,
        progress: c.LO.ref,
        id: c.LO.computed,
        loadData: c.aD,
        loadReportData: c.aD,
        downloadSurvey: c.aD,
        downloadCurrentAttachment: c.aD,
        downloadSurveyAttachment: c.aD,
        loadDeletedData: c.aD
      });
    }
  }, {
    key: "id",
    get: function () {
      return this.projectStore.id;
    }
  }, {
    key: "loadData",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        var n;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.loadData((0, g.Z)((0, g.Z)({
                  projectId: this.id
                }, this.pagination), t));
              case 2:
                r = e.sent;
                if (r) {
                  r.list;
                  n = (0, b.Z)(r, x);
                  this.pagination = n;
                  this.records = r.list;
                }
              case 4:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "loadDeletedData",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e() {
        var t;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.loadDeletedData({
                  projectId: this.id
                });
              case 2:
                t = e.sent;
                if (t) {
                  this.deletedRecords = t;
                }
              case 4:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t() {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "saveData",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                t.projectId = this.id;
                e.next = 4;
                return l.hi.saveAnswer(t);
              case 4:
                this.loading = false;
              case 5:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "updateData",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.updateAnswer(t);
              case 2:
                this.loadData();
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "getSelectedIds",
    value: function () {
      var e;
      var t = this;
      return ((e = this.records) === null || e === undefined ? undefined : e.reduce(function (e, r, n) {
        var i;
        if ((i = t.selected) !== null && i !== undefined && i.includes(n)) {
          e.push(r.id);
        }
        return e;
      }, [])) || [];
    }
  }, {
    key: "deleteData",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                r = [];
                r = t !== undefined ? [this.records[t].id] : this.getSelectedIds();
                e.next = 4;
                return l.hi.deleteAnswer(r);
              case 4:
                this.loadData();
              case 5:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "physicalDeleteData",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        var n;
        var i = this;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                r = [];
                r = t !== undefined ? [this.deletedRecords[t].id] : ((n = this.deletedRecords) === null || n === undefined ? undefined : n.reduce(function (e, t, r) {
                  var n;
                  if ((n = i.recycleSelected) !== null && n !== undefined && n.includes(r)) {
                    e.push(t.id);
                  }
                  return e;
                }, [])) || [];
                e.next = 4;
                return l.hi.physicalDeleteAnswer(r);
              case 4:
                this.loadDeletedData();
              case 5:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "restoreData",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        var n;
        var i = this;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                r = [];
                r = t !== undefined ? [this.deletedRecords[t].id] : ((n = this.deletedRecords) === null || n === undefined ? undefined : n.reduce(function (e, t, r) {
                  var n;
                  if ((n = i.recycleSelected) !== null && n !== undefined && n.includes(r)) {
                    e.push(t.id);
                  }
                  return e;
                }, [])) || [];
                e.next = 4;
                return l.hi.restoreAnswer(r);
              case 4:
                this.loadDeletedData();
              case 5:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "loadReportData",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.loadReportData(this.id, t);
              case 3:
                r = e.sent;
                if (r) {
                  this.reportData = (0, g.Z)((0, g.Z)({}, r), {}, {
                    search: t
                  });
                }
                this.loading = false;
              case 6:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "download",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        var n;
        var i;
        var o;
        var a;
        var u;
        var c;
        var p;
        var d;
        var f;
        var g = this;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                r = t.exportMode;
                n = t.type;
                i = n === undefined ? "answerAttachment" : n;
                o = t.nameExp;
                a = t.startTime;
                u = t.endTime;
                if (r !== "current") {
                  e.next = 6;
                  break;
                }
                c = this.pagination.current;
                p = this.pagination.pageSize;
                e.next = 14;
                break;
              case 6:
                if (r !== "selected") {
                  e.next = 13;
                  break;
                }
                d = this.getSelectedIds();
                if (d.length !== 0) {
                  e.next = 11;
                  break;
                }
                h.default.error(k("pages.answer.download.noSelection", "No data selected for export"));
                return e.abrupt("return");
              case 11:
                e.next = 14;
                break;
              case 13:
                p = -1;
              case 14:
                f = this.getPreferredLocale();
                e.next = 17;
                return l.hi.download({
                  url: "/api/answer/download",
                  params: {
                    projectId: this.id,
                    type: i,
                    ids: d,
                    current: c,
                    pageSize: p,
                    nameExp: o,
                    startTime: a,
                    endTime: u,
                    locale: f
                  }
                }, function (e) {
                  g.progress = e;
                });
              case 17:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "downloadSurvey",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t, r) {
        var n;
        var i = this;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                n = this.getPreferredLocale();
                e.next = 3;
                return l.hi.download({
                  url: "/api/answer/download",
                  params: {
                    projectId: this.id,
                    type: "answer",
                    current: t,
                    pageSize: r,
                    locale: n
                  }
                }, function (e) {
                  i.progress = e;
                });
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t, r) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "downloadCurrentAttachment",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        var n = this;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                r = this.getPreferredLocale();
                e.next = 3;
                return l.hi.download({
                  url: "/api/answer/download",
                  params: {
                    projectId: this.id,
                    ids: [t],
                    type: "attachment",
                    locale: r
                  }
                }, function (e) {
                  n.progress = e;
                });
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "downloadSurveyAttachment",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t, r, n, i) {
        var o;
        var a = this;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                o = this.getPreferredLocale();
                e.next = 3;
                return l.hi.download({
                  url: "/api/answer/download",
                  params: {
                    projectId: this.id,
                    type: t,
                    nameExp: r,
                    current: n,
                    pageSize: i,
                    locale: o
                  }
                }, function (e) {
                  a.progress = e;
                });
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t, r, n, i) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "getPreferredLocale",
    value: function () {
      return (w.Kd === null || w.Kd === undefined ? undefined : (0, w.Kd)()) || this.resolveBrowserLocale();
    }
  }, {
    key: "resolveBrowserLocale",
    value: function () {
      if (typeof navigator !== "undefined" && E.length) {
        var e;
        var t = (Array.isArray(navigator.languages) && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
        var r = E.map(function (e) {
          return e.toLowerCase();
        });
        var n = (0, y.Z)(t);
        try {
          function i() {
            var t = e.value;
            if (!t) {
              return "continue";
            }
            var n = t.replace("_", "-").toLowerCase();
            var i = r.findIndex(function (e) {
              return e === n;
            });
            if (i >= 0) {
              return {
                v: E[i]
              };
            }
            var o = n.split("-")[0];
            var a = r.findIndex(function (e) {
              return e.split("-")[0] === o;
            });
            if (a >= 0) {
              return {
                v: E[a]
              };
            } else {
              return undefined;
            }
          }
          for (n.s(); !(e = n.n()).done;) {
            var o = i();
            if (o !== "continue" && typeof o === "object") {
              return o.v;
            }
          }
        } catch (a) {
          n.e(a);
        } finally {
          n.f();
        }
        return E[0];
      }
    }
  }, {
    key: "upload",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t, r) {
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                return e.abrupt("return", l.hi.upload("/api/public/upload", (0, g.Z)({
                  fileType: 4,
                  basePath: this.id
                }, t), r));
              case 1:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t, r) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }]);
  return e;
}();
var T = require("./15093.js");
var C = function () {
  function e(t) {
    (0, o.Z)(this, e);
    this.loading = false;
    this.surveyStore = undefined;
    this.form = undefined;
    this.bpmnXml = undefined;
    this.tasks = [];
    this.surveyStore = t;
    this.form = (0, T.Np)({});
    this.makeObservable();
  }
  (0, i.Z)(e, [{
    key: "makeObservable",
    value: function () {
      (0, c.Ou)(this, {
        bpmnXml: c.LO.ref,
        loading: c.LO.ref,
        tasks: c.LO.shallow,
        saveFlow: c.aD,
        removeTask: c.aD
      });
    }
  }, {
    key: "removeTask",
    value: function (e, t) {
      var r = this.tasks[t];
      this.tasks[t] = (0, g.Z)((0, g.Z)({}, r), {}, {
        list: r.list.filter(function (t) {
          return t.id !== e;
        }),
        total: r.total - 1
      });
      return this.tasks[t];
    }
  }, {
    key: "getFlow",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r = this;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.getFlow(t).then(function (e) {
                  var t;
                  r.bpmnXml = e?.bpmnXml;
                  var n = {};
                  if (e !== null && e !== undefined && (t = e.nodes) !== null && t !== undefined) {
                    t.forEach(function (e) {
                      n[e.id] = e;
                    });
                  }
                  r.form.setValues(n);
                });
              case 3:
                this.loading = false;
              case 4:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "saveFlow",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.saveFlow(t);
              case 3:
                r = e.sent;
                this.bpmnXml = t.bpmnXml;
                this.loading = false;
                return e.abrupt("return", r);
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "deploy",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.deployFlow(t);
              case 3:
                r = e.sent;
                this.loading = false;
                return e.abrupt("return", r);
              case 6:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "loadFlowTasks",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.loadFlowTasks(t);
              case 2:
                r = e.sent;
                if (r) {
                  this.tasks[t.type] = r;
                }
              case 4:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }]);
  return e;
}();
var A = require("./25468.js");
(function (e) {
  e[e.BGI = 1] = "BGI";
  e[e.HI = 2] = "HI";
  e[e.QI = 3] = "QI";
  e[e.AnswerAttachment = 4] = "AnswerAttachment";
  e[e.QuestionTemplate = 5] = "QuestionTemplate";
  e[e.PosterImage = 6] = "PosterImage";
})(n ||= {});
var _ = function () {
  function e(t, r) {
    var n;
    var i;
    (0, o.Z)(this, e);
    this.id = undefined;
    this.parentId = undefined;
    this.project = undefined;
    this.loading = undefined;
    this.isPC = undefined;
    this.bgi = [];
    this.hi = [];
    this.qt = [];
    this.st = [];
    this.currentSchema = undefined;
    this.currentCategory = undefined;
    this.mode = undefined;
    this.images = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: []
    };
    this.dicts = [];
    this.reportData = undefined;
    this.flowStore = undefined;
    this.answerStore = undefined;
    this.id = t;
    this.mode = (r === null || r === undefined || (n = r.location.query) === null || n === undefined ? undefined : n.mode) || "survey";
    this.parentId = r === null || r === undefined || (i = r.location.query) === null || i === undefined ? undefined : i.parentId;
    this.makeObservable();
    this.loadFiles(1);
    this.loadFiles(2);
    this.flowStore = new C(this);
    this.answerStore = new S(this);
  }
  (0, i.Z)(e, [{
    key: "makeObservable",
    value: function () {
      (0, c.Ou)(this, {
        id: c.LO.ref,
        loading: c.LO.ref,
        project: c.LO.ref,
        bgi: c.LO,
        hi: c.LO,
        qt: c.LO.ref,
        st: c.LO.ref,
        currentSchema: c.LO.ref,
        currentCategory: c.LO.ref,
        mode: c.LO.ref,
        images: c.LO,
        reportData: c.LO.shallow,
        dicts: c.LO.ref,
        schema: c.LO.computed,
        setting: c.LO.computed,
        name: c.LO.computed,
        saveOrUpdateProject: c.aD,
        loadFiles: c.aD,
        uploadImage: c.aD,
        saveTemplate: c.aD,
        deleteTemplate: c.aD,
        loadDict: c.aD
      });
    }
  }, {
    key: "name",
    get: function () {
      return this.project?.name;
    }
  }, {
    key: "schema",
    get: function () {
      return this.project?.survey;
    }
  }, {
    key: "setting",
    get: function () {
      return this.project?.setting;
    }
  }, {
    key: "loadProject",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e() {
        var t;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!this.id || this.id === "new") {
                  e.next = 6;
                  break;
                }
                this.loading = true;
                e.next = 4;
                return l.hi.loadProject(this.id);
              case 4:
                t = e.sent;
                if (t) {
                  this.project = t;
                  this.id = t.id;
                }
              case 6:
                this.loading = false;
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t() {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "saveOrUpdateProject",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (this.id !== "new") {
                  e.next = 8;
                  break;
                }
                e.next = 3;
                return l.hi.saveProject((0, g.Z)((0, g.Z)({}, t), {}, {
                  name: (0, A.WO)(t.survey.title),
                  mode: this.mode,
                  parentId: this.parentId,
                  setting: {
                    status: 0,
                    answerSetting: {
                      progressBar: true,
                      autoSave: true
                    },
                    submittedSetting: {}
                  }
                }));
              case 3:
                r = e.sent;
                if (r.success) {
                  this.id = r.data.id;
                  this.project = r.data;
                }
                return e.abrupt("return", r);
              case 8:
                if (t.survey && this.project) {
                  this.project.survey = t.survey;
                }
                e.next = 11;
                return l.hi.updateProject((0, g.Z)((0, g.Z)({}, t), {}, {
                  id: this.id
                }));
              case 11:
                return e.abrupt("return", e.sent);
              case 12:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "deleteProject",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.deleteProject(t);
              case 2:
                return e.abrupt("return", e.sent);
              case 3:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "loadFiles",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.loadFiles({
                  type: t
                });
              case 3:
                r = e.sent;
                if (t === 1 && r) {
                  this.bgi = r;
                } else if (t === 2 && r) {
                  this.hi = r;
                }
                if (r) {
                  this.images[t] = r;
                }
                this.loading = false;
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "uploadImage",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t, r, n) {
        var i;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                this.loading = true;
                e.next = 3;
                return l.hi.uploadImage(t, r, n);
              case 3:
                i = e.sent;
                if (t === 1 && i.success) {
                  this.bgi.push(i.data);
                } else if (t === 2 && i.success) {
                  this.hi.push(i.data);
                }
                this.images[t] &&= [];
                if (i.success) {
                  this.images[t].push(i.data);
                }
                this.loading = false;
                return e.abrupt("return", i);
              case 9:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t, r, n) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "deleteImage",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t, r) {
        var n;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.deleteImage(t);
              case 2:
                n = e.sent;
                if (r === 1) {
                  this.bgi = this.bgi.filter(function (e) {
                    return e.id !== t;
                  });
                }
                if (r === 2) {
                  this.hi = this.hi.filter(function (e) {
                    return e.id !== t;
                  });
                }
                this.images[r].splice(this.images[r].findIndex(function (e) {
                  return e.id === t;
                }), 1);
                return e.abrupt("return", n);
              case 7:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t, r) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "saveTemplate",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.saveTemplate(t);
              case 2:
                r = e.sent;
                if (r.success) {
                  if (t.questionType === "Survey") {
                    this.st = [].concat((0, f.Z)(this.st), [(0, g.Z)((0, g.Z)({}, t), {}, {
                      id: r.data
                    })]);
                  } else {
                    this.qt = [].concat((0, f.Z)(this.qt), [(0, g.Z)((0, g.Z)({}, t), {}, {
                      id: r.data,
                      owner: true
                    })]);
                  }
                  this.currentSchema = undefined;
                } else {
                  h.default.error(r.message);
                }
                return e.abrupt("return", r);
              case 5:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "deleteTemplate",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                e.next = 2;
                return l.hi.deleteTemplate(t);
              case 2:
                r = e.sent;
                if (r.success && this.currentCategory) {
                  this.qt = (0, f.Z)(this.qt.filter(function (e) {
                    return e.id !== t;
                  }));
                }
                return e.abrupt("return", r);
              case 5:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "loadReportData",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e(t) {
        var r;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                if (!this.reportData || t) {
                  e.next = 2;
                  break;
                }
                return e.abrupt("return");
              case 2:
                e.next = 4;
                return l.hi.loadReportData(this.id);
              case 4:
                r = e.sent;
                this.reportData = r;
              case 6:
              case "end":
                return e.stop();
            }
          }
        }, e, this);
      }));
      function t(t) {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }, {
    key: "loadDict",
    value: function () {
      var e = (0, u.Z)((0, s.Z)().mark(function e() {
        var t = this;
        return (0, s.Z)().wrap(function (e) {
          while (1) {
            switch (e.prev = e.next) {
              case 0:
                l.hi.selectDict().then(function (e) {
                  if (e.success) {
                    t.dicts = e.data.map(function (e) {
                      return {
                        label: e.name,
                        value: e.code
                      };
                    });
                  }
                });
              case 1:
              case "end":
                return e.stop();
            }
          }
        }, e);
      }));
      function t() {
        return e.apply(this, arguments);
      }
      return t;
    }()
  }]);
  return e;
}();
var O = (0, i.Z)(function e() {
  (0, o.Z)(this, e);
  this.homeStore = undefined;
  this.systemStore = undefined;
  this.publicTemplateStore = undefined;
  this.privateTemplateStore = undefined;
  this.projectStoreObj = {};
  this.examStore = undefined;
  this.homeStore = new p();
  this.systemStore = new d();
  this.publicTemplateStore = new m(1);
  this.privateTemplateStore = new m(0);
  this.examStore = new v();
});
var M = (0, a.createContext)({});
};
