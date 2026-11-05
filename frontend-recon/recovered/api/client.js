/**
 * SurveyKing API 客户端
 *
 * 由闭源前端构建产物逆向生成，端点与调用名与原实现一致。
 * 零依赖，只要一个 fetch。
 *
 * 约定（全部经实测确认）：
 *   - 会话走 Cookie（credentials: "include"）
 *   - CSRF 双提交：Cookie XSRF-TOKEN → 请求头 X-XSRF-TOKEN
 *   - 响应统一 { code, message, data }，code===200 为成功
 *   - 401 跳登录，403 无权限，4043 是需提示的业务错误
 *   - GET 参数走 querystring 且剔除 null/空串
 */

const OK = 200;
const UN_AUTHORIZED = 401;
const FORBIDDEN = 403;
const BIZ_ERROR = 4043;

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

function toQuery(params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => usp.append(k, String(x)));
    else usp.append(k, String(v));
  }
  return usp.toString();
}

export class ApiError extends Error {
  constructor(code, message, data) {
    super(message || `API error ${code}`);
    this.name = "ApiError";
    this.code = code;
    this.data = data;
  }
}

export class SurveyKingClient {
  /**
   * @param {Object} [opts]
   * @param {string} [opts.baseURL=""]       后端地址，同源部署留空
   * @param {(payload:any)=>void} [opts.onUnauthorized] 401 回调（默认跳 /user/login）
   * @param {(msg:string)=>void} [opts.onBizError]     4043 提示回调
   */
  constructor({ baseURL = "", onUnauthorized, onBizError, fetchImpl } = {}) {
    this.baseURL = baseURL.replace(/\/$/, "");
    this.fetch = fetchImpl || ((...args) => fetch(...args));
    this.onUnauthorized = onUnauthorized || (() => {
      if (typeof location !== "undefined") location.href = "/user/login";
    });
    this.onBizError = onBizError || (() => {});
  }

  async request(method, url, data, options = {}) {
    const isForm = typeof FormData !== "undefined" && data instanceof FormData;
    const headers = {
      Accept: "application/json",
      "Accept-Language": (options.locale || "zh-CN"),
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    };
    const csrf = readCookie("XSRF-TOKEN");
    if (csrf) headers["X-XSRF-TOKEN"] = csrf;
    if (!isForm && data !== undefined) headers["Content-Type"] = "application/json";

    let finalUrl = this.baseURL + url;
    const init = { method, headers, credentials: "include" };

    if (method === "GET" || method === "DELETE") {
      const qs = toQuery(data);
      if (qs) finalUrl += (finalUrl.includes("?") ? "&" : "?") + qs;
    } else if (isForm) {
      init.body = data;
    } else if (data !== undefined) {
      init.body = JSON.stringify(data);
    }

    const res = await this.fetch(finalUrl, init);

    // 文件下载：直接返回 Response，交给调用方处理 blob
    if (options.raw) return res;

    const payload = await res.json().catch(() => ({}));

    if (payload.code === UN_AUTHORIZED) {
      this.onUnauthorized(payload);
      throw new ApiError(UN_AUTHORIZED, payload.message || "未登录");
    }
    if (payload.code === FORBIDDEN) {
      throw new ApiError(FORBIDDEN, payload.message || "未授权访问");
    }
    if (payload.code === BIZ_ERROR) {
      this.onBizError(payload.message);
      throw new ApiError(BIZ_ERROR, payload.message);
    }
    if (payload.code !== OK) {
      throw new ApiError(payload.code, payload.message, payload.data);
    }
    return payload.data;
  }

  get(url, params, options) {
    return this.request("GET", url, params, options);
  }

  post(url, data, options) {
    return this.request("POST", url, data, options);
  }

  delete(url, params, options) {
    return this.request("DELETE", url, params, options);
  }

  /**
   * 分页列表：后端返回 { list, total }，这里补齐表格组件需要的形状
   * @returns {Promise<{current:number,pageSize:number,list:any[],total:number}>}
   */
  async getWithPagination(url, { current = 1, pageSize = 10, ...rest } = {}) {
    const res = await this.get(url, { current, pageSize, ...rest });
    if (!res) return { current, pageSize, list: [], total: 0 };
    return { current, pageSize, data: res.list, list: res.list || [], total: res.total ?? 0 };
  }

  /** 下载：解析 content-disposition 拿文件名 */
  async download(url, params) {
    const res = await this.request("GET", url, params, { raw: true });
    const disposition = res.headers.get("content-disposition") || "";
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const fileName = match ? decodeURIComponent(match[1]) : "download";
    const blob = await res.blob();
    return { blob, fileName };
  }

  // ===== 以下方法由逆向结果生成 =====

  // ---- ai ----
  /** GET /api/ai/chat/answer-analysis/close-conversation */
  closeAIAnswerAnalysisConversation(params) {
    return this.get(`/api/ai/chat/answer-analysis/close-conversation`, params);
  }
  /** POST /api/ai/chat/close-conversation */
  closeAIConversation(data) {
    return this.post(`/api/ai/chat/close-conversation`, data);
  }
  /** POST /api/ai/chat/answer-analysis/create-conversation */
  createAIAnswerAnalysisConversation(data) {
    return this.post(`/api/ai/chat/answer-analysis/create-conversation`, data);
  }
  /** GET /api/ai/chat/answer-analysis/stream */
  createAIAnswerAnalysisStream(params) {
    return this.get(`/api/ai/chat/answer-analysis/stream`, params);
  }
  /** GET /api/ai/chat/stream */
  createAIChatStream(params) {
    return this.get(`/api/ai/chat/stream`, params);
  }
  /** POST /api/ai/chat/create-conversation */
  createAIConversation(data) {
    return this.post(`/api/ai/chat/create-conversation`, data);
  }
  /** GET /api/ai/chat/models */
  getAIModels(params) {
    return this.get(`/api/ai/chat/models`, params);
  }

  // ---- answer ----
  /** GET /api/answer/upload */
  answerUpload(params) {
    return this.get(`/api/answer/upload`, params);
  }
  /** POST /api/answer/delete */
  deleteAnswer(data) {
    return this.post(`/api/answer/delete`, data);
  }
  /** GET /api/answer/list */
  loadData(params) {
    return this.get(`/api/answer/list`, params);
  }
  /** GET /api/answer/trash */
  loadDeletedData(params) {
    return this.get(`/api/answer/trash`, params);
  }
  /** POST /api/answer/destroy */
  physicalDeleteAnswer(data) {
    return this.post(`/api/answer/destroy`, data);
  }
  /** POST /api/answer/restore */
  restoreAnswer(data) {
    return this.post(`/api/answer/restore`, data);
  }
  /** POST /api/answer/create */
  saveAnswer(data) {
    return this.post(`/api/answer/create`, data);
  }
  /** POST /api/answer/update */
  updateAnswer(data) {
    return this.post(`/api/answer/update`, data);
  }

  // ---- currentUser ----
  /** GET /api/currentUser */
  currentuser(params) {
    return this.get(`/api/currentUser`, params);
  }

  // ---- exercise ----
  /** POST /api/exercise/delete */
  deleteExercise(data) {
    return this.post(`/api/exercise/delete`, data);
  }
  /** GET /api/exercise/list */
  listExercise(params) {
    return this.get(`/api/exercise/list`, params);
  }

  // ---- file ----
  /** POST /api/file/delete */
  deleteImage(data) {
    return this.post(`/api/file/delete`, data);
  }
  /** GET /api/file/create */
  fileCreate(params) {
    return this.get(`/api/file/create`, params);
  }
  /** GET /api/file/list */
  loadFiles(params) {
    return this.get(`/api/file/list`, params);
  }

  // ---- importUser ----
  /** GET /api/importUser */
  importuser(params) {
    return this.get(`/api/importUser`, params);
  }

  // ---- listHistoryTask ----
  /** GET /api/listHistoryTask */
  listHistoryTask(params) {
    return this.get(`/api/listHistoryTask`, params);
  }

  // ---- listUserTask ----
  /** GET /api/listUserTask */
  listUserTask(params) {
    return this.get(`/api/listUserTask`, params);
  }

  // ---- oauth ----
  /** DELETE /api/oauth/bindings/{id} */
  deleteOAuthBinding(id, data) {
    return this.delete(`/api/oauth/bindings/${encodeURIComponent(id)}`, data);
  }
  /** GET /api/oauth/bindings */
  getOAuthBindings(params) {
    return this.get(`/api/oauth/bindings`, params);
  }
  /** POST /api/oauth/bind/{id} */
  startOAuthBind(id, data) {
    return this.post(`/api/oauth/bind/${encodeURIComponent(id)}`, data);
  }

  // ---- project ----
  /** POST /api/project/partner/create */
  addProjectPartner(data) {
    return this.post(`/api/project/partner/create`, data);
  }
  /** POST /api/project/delete */
  deleteProject(data) {
    return this.post(`/api/project/delete`, data);
  }
  /** POST /api/project/partner/delete */
  deleteProjectPartner(data) {
    return this.post(`/api/project/partner/delete`, data);
  }
  /** POST /api/project/destroy */
  destroyProject(data) {
    return this.post(`/api/project/destroy`, data);
  }
  /** GET /api/project/trash */
  getDeletedProject(params) {
    return this.get(`/api/project/trash`, params);
  }
  /** POST /api/project/partner/import */
  importProjectPartner(data) {
    return this.post(`/api/project/partner/import`, data);
  }
  /** GET /api/project/partner/list */
  loadProjectPartner(params) {
    return this.get(`/api/project/partner/list`, params);
  }
  /** GET /api/project/list */
  loadProjects(params) {
    return this.get(`/api/project/list`, params);
  }
  /** POST /api/project/restore */
  restoreProject(data) {
    return this.post(`/api/project/restore`, data);
  }
  /** POST /api/project/create */
  saveProject(data) {
    return this.post(`/api/project/create`, data);
  }
  /** POST /api/project/selectDept */
  selectDept(data) {
    return this.post(`/api/project/selectDept`, data);
  }
  /** POST /api/project/selectDict */
  selectDict(data) {
    return this.post(`/api/project/selectDict`, data);
  }
  /** POST /api/project/selectPosition */
  selectPosition(data) {
    return this.post(`/api/project/selectPosition`, data);
  }
  /** POST /api/project/selectRepo */
  selectRepo(data) {
    return this.post(`/api/project/selectRepo`, data);
  }
  /** POST /api/project/selectRole */
  selectRole(data) {
    return this.post(`/api/project/selectRole`, data);
  }
  /** POST /api/project/selectTag */
  selectTag(data) {
    return this.post(`/api/project/selectTag`, data);
  }
  /** POST /api/project/selectTemplate */
  selectTemplate(data) {
    return this.post(`/api/project/selectTemplate`, data);
  }
  /** POST /api/project/selectUser */
  selectUser(data) {
    return this.post(`/api/project/selectUser`, data);
  }
  /** POST /api/project/update */
  updateProject(data) {
    return this.post(`/api/project/update`, data);
  }
  /** POST /api/project/update */
  updateSetting(data) {
    return this.post(`/api/project/update`, data);
  }

  // ---- projectid ----
  /** GET /api/project?id= */
  loadProject(params) {
    return this.get(`/api/project?id=`, params);
  }

  // ---- public ----
  /** POST /api/public/dbInit */
  dbInit(data) {
    return this.post(`/api/public/dbInit`, data);
  }
  /** GET /api/public/dbInit/environment */
  dbInitEnvironment(params) {
    return this.get(`/api/public/dbInit/environment`, params);
  }
  /** POST /api/public/dbInit/test */
  dbInitTest(data) {
    return this.post(`/api/public/dbInit/test`, data);
  }
  /** GET /api/public/oauth/register/{id} */
  getOAuthRegistration(id, params) {
    return this.get(`/api/public/oauth/register/${encodeURIComponent(id)}`, params);
  }
  /** POST /api/public/getQueryResult */
  getQueryResult(data) {
    return this.post(`/api/public/getQueryResult`, data);
  }
  /** GET /api/public/listRegisterRole */
  getRegisterRoles(params) {
    return this.get(`/api/public/listRegisterRole`, params);
  }
  /** POST /api/public/loadDict */
  loadDict(data) {
    return this.post(`/api/public/loadDict`, data);
  }
  /** POST /api/public/loadExamResult */
  loadExamResult(data) {
    return this.post(`/api/public/loadExamResult`, data);
  }
  /** POST /api/public/loadLinkResult */
  loadLinkResult(data) {
    return this.post(`/api/public/loadLinkResult`, data);
  }
  /** GET /api/public/loadProject */
  loadproject(params) {
    return this.get(`/api/public/loadProject`, params);
  }
  /** POST /api/public/loadQuery */
  loadQuery(data) {
    return this.post(`/api/public/loadQuery`, data);
  }
  /** POST /api/public/login */
  login(data) {
    return this.post(`/api/public/login`, data);
  }
  /** POST /api/public/logout */
  logout(data) {
    return this.post(`/api/public/logout`, data);
  }
  /** POST /api/public/oauth/login/{id} */
  oauthLogin(id, data) {
    return this.post(`/api/public/oauth/login/${encodeURIComponent(id)}`, data);
  }
  /** POST /api/public/oauth/survey/wechat/start */
  oauthSurveyWechatStart(data) {
    return this.post(`/api/public/oauth/survey/wechat/start`, data);
  }
  /** GET /api/public/preview/{id} */
  preview(id, params) {
    return this.get(`/api/public/preview/${encodeURIComponent(id)}`, params);
  }
  /** POST /api/public/register */
  register(data) {
    return this.post(`/api/public/register`, data);
  }
  /** POST /api/public/saveAnswer */
  saveanswer(data) {
    return this.post(`/api/public/saveAnswer`, data);
  }
  /** GET /api/public/statistics */
  statistics(params) {
    return this.get(`/api/public/statistics`, params);
  }
  /** GET /api/public/upload */
  upload(params) {
    return this.get(`/api/public/upload`, params);
  }
  /** GET /api/public/validateProject */
  validateproject(params) {
    return this.get(`/api/public/validateProject`, params);
  }

  // ---- repo ----
  /** POST /api/repo/partner/create */
  addRepoPartner(data) {
    return this.post(`/api/repo/partner/create`, data);
  }
  /** POST /api/repo/batchCreate */
  batchAddRepoTemplate(data) {
    return this.post(`/api/repo/batchCreate`, data);
  }
  /** POST /api/repo/book/create */
  createUserBook(data) {
    return this.post(`/api/repo/book/create`, data);
  }
  /** POST /api/repo/delete */
  deleteRepo(data) {
    return this.post(`/api/repo/delete`, data);
  }
  /** POST /api/repo/partner/delete */
  deleteRepoPartner(data) {
    return this.post(`/api/repo/partner/delete`, data);
  }
  /** POST /api/repo/book/delete */
  deleteUserBook(data) {
    return this.post(`/api/repo/book/delete`, data);
  }
  /** GET /api/repo/book/question */
  getUserBookQuestion(params) {
    return this.get(`/api/repo/book/question`, params);
  }
  /** GET /api/repo/book/list */
  listUserBook(params) {
    return this.get(`/api/repo/book/list`, params);
  }
  /** GET /api/repo/list */
  loadRepo(params) {
    return this.get(`/api/repo/list`, params);
  }
  /** GET /api/repo/partner/list */
  loadRepoPartner(params) {
    return this.get(`/api/repo/partner/list`, params);
  }
  /** POST /api/repo/pick */
  pickRepoQuestion(data) {
    return this.post(`/api/repo/pick`, data);
  }
  /** POST /api/repo/create */
  repoCreate(data) {
    return this.post(`/api/repo/create`, data);
  }
  /** GET /api/repo/import */
  repoImport(params) {
    return this.get(`/api/repo/import`, params);
  }
  /** POST /api/repo/unbind */
  repoUnbind(data) {
    return this.post(`/api/repo/unbind`, data);
  }
  /** POST /api/repo/update */
  saveOrUpdateRepo(data) {
    return this.post(`/api/repo/update`, data);
  }
  /** POST /api/repo/book/update */
  updateUserBook(data) {
    return this.post(`/api/repo/book/update`, data);
  }

  // ---- report ----
  /** GET /api/report/{id} */
  loadReportData(id, params) {
    return this.get(`/api/report/${encodeURIComponent(id)}`, params);
  }

  // ---- system ----
  /** GET /api/system/checkUsernameExist */
  checkUsernameExist(params) {
    return this.get(`/api/system/checkUsernameExist`, params);
  }
  /** POST /api/system/dept/delete */
  deleteDept(data) {
    return this.post(`/api/system/dept/delete`, data);
  }
  /** POST /api/system/dict/delete */
  deleteDict(data) {
    return this.post(`/api/system/dict/delete`, data);
  }
  /** POST /api/system/dictItem/delete */
  deleteDictItem(data) {
    return this.post(`/api/system/dictItem/delete`, data);
  }
  /** POST /api/system/position/delete */
  deletePosition(data) {
    return this.post(`/api/system/position/delete`, data);
  }
  /** POST /api/system/role/delete */
  deleteRole(data) {
    return this.post(`/api/system/role/delete`, data);
  }
  /** POST /api/system/user/delete */
  deleteUser(data) {
    return this.post(`/api/system/user/delete`, data);
  }
  /** GET /api/system/backup/export */
  exportSystemBackup(params) {
    return this.get(`/api/system/backup/export`, params);
  }
  /** GET /api/system/aiSetting */
  getAiSetting(params) {
    return this.get(`/api/system/aiSetting`, params);
  }
  /** GET /api/system/oauthSetting */
  getOAuthSetting(params) {
    return this.get(`/api/system/oauthSetting`, params);
  }
  /** POST /api/system/dictItem/import */
  importDictItems(data) {
    return this.post(`/api/system/dictItem/import`, data);
  }
  /** POST /api/system/backup/import */
  importSystemBackup(data) {
    return this.post(`/api/system/backup/import`, data);
  }
  /** GET /api/system/dept/list */
  loadDepts(params) {
    return this.get(`/api/system/dept/list`, params);
  }
  /** GET /api/system/dictItem/list */
  loadDictItems(params) {
    return this.get(`/api/system/dictItem/list`, params);
  }
  /** GET /api/system/dict/list */
  loadDicts(params) {
    return this.get(`/api/system/dict/list`, params);
  }
  /** GET /api/system/permission/list */
  loadPermissions(params) {
    return this.get(`/api/system/permission/list`, params);
  }
  /** GET /api/system/position/list */
  loadPositions(params) {
    return this.get(`/api/system/position/list`, params);
  }
  /** GET /api/system/role/list */
  loadRoles(params) {
    return this.get(`/api/system/role/list`, params);
  }
  /** GET /api/system/user/list */
  loadUsers(params) {
    return this.get(`/api/system/user/list`, params);
  }
  /** POST /api/system/dept/create */
  saveDept(data) {
    return this.post(`/api/system/dept/create`, data);
  }
  /** POST /api/system/dict/create */
  saveDict(data) {
    return this.post(`/api/system/dict/create`, data);
  }
  /** POST /api/system/dictItem/update */
  saveOrUpdateDictItem(data) {
    return this.post(`/api/system/dictItem/update`, data);
  }
  /** POST /api/system/position/create */
  savePosition(data) {
    return this.post(`/api/system/position/create`, data);
  }
  /** POST /api/system/role/create */
  saveRole(data) {
    return this.post(`/api/system/role/create`, data);
  }
  /** POST /api/system/user/create */
  saveUser(data) {
    return this.post(`/api/system/user/create`, data);
  }
  /** POST /api/system/dept/sort */
  sortDept(data) {
    return this.post(`/api/system/dept/sort`, data);
  }
  /** GET /api/system */
  sysInfo(params) {
    return this.get(`/api/system`, params);
  }
  /** POST /api/system/dictItem/create */
  systemDictItemCreate(data) {
    return this.post(`/api/system/dictItem/create`, data);
  }
  /** POST /api/system/dept/update */
  updateDept(data) {
    return this.post(`/api/system/dept/update`, data);
  }
  /** POST /api/system/dict/update */
  updateDict(data) {
    return this.post(`/api/system/dict/update`, data);
  }
  /** POST /api/system/oauthSetting */
  updateOAuthSetting(data) {
    return this.post(`/api/system/oauthSetting`, data);
  }
  /** POST /api/system/position/update */
  updatePosition(data) {
    return this.post(`/api/system/position/update`, data);
  }
  /** POST /api/system/role/update */
  updateRole(data) {
    return this.post(`/api/system/role/update`, data);
  }
  /** POST /api/system/update */
  updateSysInfo(data) {
    return this.post(`/api/system/update`, data);
  }
  /** POST /api/system/user/update */
  updateUser(data) {
    return this.post(`/api/system/user/update`, data);
  }

  // ---- template ----
  /** POST /api/template/delete */
  deleteTemplate(data) {
    return this.post(`/api/template/delete`, data);
  }
  /** GET /api/template/get */
  getTemplate(params) {
    return this.get(`/api/template/get`, params);
  }
  /** GET /api/template/listCategory */
  loadCategories(params) {
    return this.get(`/api/template/listCategory`, params);
  }
  /** GET /api/template/listTag */
  loadTags(params) {
    return this.get(`/api/template/listTag`, params);
  }
  /** GET /api/template/list */
  loadTemplate(params) {
    return this.get(`/api/template/list`, params);
  }
  /** POST /api/template/create */
  saveTemplate(data) {
    return this.post(`/api/template/create`, data);
  }

  // ---- user ----
  /** POST /api/user */
  updateUserInfo(data) {
    return this.post(`/api/user`, data);
  }

  // ---- userOverview ----
  /** GET /api/userOverview */
  userOverview(params) {
    return this.get(`/api/userOverview`, params);
  }

  // ---- workflow ----
  /** POST /api/workflow/approvalTask */
  approvalTask(data) {
    return this.post(`/api/workflow/approvalTask`, data);
  }
  /** POST /api/workflow/deploy?projectId= */
  deployFlow(data) {
    return this.post(`/api/workflow/deploy?projectId=`, data);
  }
  /** GET /api/workflow/getAuditRecord?processInstanceId= */
  getAuditRecord(params) {
    return this.get(`/api/workflow/getAuditRecord?processInstanceId=`, params);
  }
  /** GET /api/workflow/getFlow?projectId= */
  getFlow(params) {
    return this.get(`/api/workflow/getFlow?projectId=`, params);
  }
  /** GET /api/workflow/statics */
  getFlowStatics(params) {
    return this.get(`/api/workflow/statics`, params);
  }
  /** GET /api/workflow/getRevertNodes?processInstanceId= */
  getRevertNodes(params) {
    return this.get(`/api/workflow/getRevertNodes?processInstanceId=`, params);
  }
  /** GET /api/workflow/loadSchema */
  loadFlowSchema(params) {
    return this.get(`/api/workflow/loadSchema`, params);
  }
  /** GET /api/workflow/getFlowTasks */
  loadFlowTasks(params) {
    return this.get(`/api/workflow/getFlowTasks`, params);
  }
  /** POST /api/workflow/saveFlow */
  saveFlow(data) {
    return this.post(`/api/workflow/saveFlow`, data);
  }
}

export default SurveyKingClient;