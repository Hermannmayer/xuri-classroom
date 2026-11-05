
### 顶层 / 杂项（11）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| GET | `/api/answer` | AnswerApi.getAnswer | `AnswerView` | query:AnswerQuery | — |
| GET | `/api/currentUser` | UserApi.currentUser | `UserInfo` | — | （仅字面量出现） |
| GET | `/api/dashboard/list` | DashboardApi.listDashboard | `List<DashboardView>` | query:DashboardQuery | — |
| GET | `/api/file` | FileApi.getFile | `ResponseEntity<Resource>` | query:FileQuery | （仅字面量出现） |
| POST | `/api/importUser` | UserApi.importUser | `void` | request:UserRequest | （仅字面量出现） |
| GET | `/api/listHistoryTask` | UserApi.myHistoryTask | `PaginationResponse<MyTaskView>` | query:MyTaskQuery | `listHistoryTask` (2645) |
| GET | `/api/listUserTask` | UserApi.myTask | `PaginationResponse<MyTaskView>` | query:MyTaskQuery | `listUserTask` (2645) |
| GET | `/api/project` | ProjectApi.getProject | `ProjectView` | id:String | （仅字面量出现） |
| GET | `/api/system` | SystemApi.getSystemInfo | `SystemInfo` | — | `sysInfo` |
| POST | `/api/user` | UserApi.updateUser | `UserInfo` | request:UserProfileRequest@RequestBody | `updateUserInfo` (3633) |
| GET | `/api/userOverview` | UserApi.userOverview | `UserOverview` | — | `userOverview` |

### 公共 / 登录注册 / 初始化（21）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| POST | `/api/public/getQueryResult` | SurveyApi.getQueryResult | `PublicQueryView` | request:PublicQueryRequest@RequestBody | `getQueryResult` (p__Answer__PublicQuery) |
| GET | `/api/public/listRegisterRole` | UserApi.getRegisterRoles | `List<RegisterRoleView>` | — | `getRegisterRoles` (p__user__Register) |
| POST | `/api/public/loadDict` | SurveyApi.loadDict | `List<PublicDictView>` | request:PublicDictRequest@RequestBody | `loadDict` (p__Answer) |
| POST | `/api/public/loadExamResult` | SurveyApi.loadExamResult | `PublicExamResult` | request:PublicExamRequest@RequestBody | `loadExamResult` (p__Answer__ExamResult) |
| POST | `/api/public/loadLinkResult` | SurveyApi.loadLinkResult | `PublicLinkResult` | request:PublicLinkRequest@RequestBody | `loadLinkResult` |
| POST | `/api/public/loadProject` | SurveyApi.loadProject | `PublicProjectView` | query:ProjectQuery@RequestBody | （仅字面量出现） |
| POST | `/api/public/loadQuery` | SurveyApi.loadQuery | `PublicQueryVerifyView` | request:PublicQueryRequest@RequestBody | `loadQuery` (p__Answer__PublicQuery) |
| POST | `/api/public/login` | UserApi.login | `ResponseEntity` | request:AuthRequest@RequestBody,Valid<br>httpRequest:HttpServletRequest | （仅字面量出现） |
| POST | `/api/public/logout` | UserApi.logout | `ResponseEntity` | httpRequest:HttpServletRequest | `logout` |
| GET | `/api/public/oauth/callback/{channel}` | OAuthApi.callback | `ResponseEntity<Void>` | channel:String@PathVariable<br>code:String@RequestParam<br>state:String@RequestParam<br>error:String@RequestParam<br>request:HttpServletRequest | — |
| POST | `/api/public/oauth/login/{provider}/start` | OAuthApi.startLogin | `ResponseEntity<OAuthStartResponse>` | provider:String@PathVariable<br>request:OAuthStartRequest@RequestBody<br>httpRequest:HttpServletRequest | — |
| GET | `/api/public/oauth/register/{ticket}` | OAuthApi.registration | `OAuthRegistrationView` | ticket:String@PathVariable | — |
| POST | `/api/public/oauth/register/{ticket}` | OAuthApi.completeRegistration | `ResponseEntity<OAuthRegistrationResult>` | ticket:String@PathVariable<br>request:RegisterRequest@RequestBody,Valid<br>httpRequest:HttpServletRequest | — |
| POST | `/api/public/oauth/survey/wechat/start` | OAuthApi.startSurveyWechat | `ResponseEntity<OAuthStartResponse>` | request:SurveyWechatOAuthStartRequest@RequestBody<br>httpRequest:HttpServletRequest | （仅字面量出现） |
| GET | `/api/public/preview/{attachmentId}` | SurveyApi.preview | `ResponseEntity<Resource>` | attachmentId:String@PathVariable | — |
| POST | `/api/public/register` | UserApi.register | `void` | request:RegisterRequest@RequestBody | `register` |
| POST | `/api/public/saveAnswer` | SurveyApi.saveAnswer | `PublicAnswerView` | request:AnswerRequest@RequestBody | （仅字面量出现） |
| POST | `/api/public/statistics` | SurveyApi.statProject | `PublicStatisticsView` | query:ProjectQuery@RequestBody | （仅字面量出现） |
| POST | `/api/public/tempSaveAnswer` | SurveyApi.tempSaveAnswer | `void` | request:AnswerRequest@RequestBody | — |
| POST | `/api/public/upload` | SurveyApi.upload | `FileView` | request:UploadFileRequest | （仅字面量出现） |
| POST | `/api/public/validateProject` | SurveyApi.validateProject | `PublicProjectView` | query:ProjectQuery@RequestBody | （仅字面量出现） |

### 系统管理（34）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| GET | `/api/system/aiSetting` | SystemApi.getSystemAiSetting | `SystemInfo.AiSetting` | — | `getAiSetting` (p__system__SystemSettings) |
| GET | `/api/system/checkUsernameExist` | SystemApi.checkUsernameExist | `boolean` | username:String | `checkUsernameExist` (p__system__User) |
| POST | `/api/system/dept/create` | SystemApi.addOrg | `void` | request:DeptRequest@RequestBody | `saveDept` |
| POST | `/api/system/dept/delete` | SystemApi.deleteOrg | `void` | request:DeptRequest@RequestBody | `deleteDept` |
| GET | `/api/system/dept/list` | SystemApi.listDept | `List<DeptView>` | — | `loadDepts` |
| POST | `/api/system/dept/sort` | SystemApi.sortOrg | `void` | request:DeptSortRequest@RequestBody | `sortDept` |
| POST | `/api/system/dept/update` | SystemApi.updateOrg | `void` | request:DeptRequest@RequestBody | `updateDept` |
| POST | `/api/system/dict/create` | SystemApi.addDict | `void` | request:CommDictRequest@RequestBody | `saveDict` (p__system__Dict) |
| POST | `/api/system/dict/delete` | SystemApi.deleteDict | `void` | request:CommDictRequest@RequestBody | `deleteDict` (p__system__Dict) |
| GET | `/api/system/dict/list` | SystemApi.listDict | `PaginationResponse<CommDictView>` | query:CommDictQuery | `loadDicts` (p__system__Dict) |
| POST | `/api/system/dict/update` | SystemApi.updateDict | `void` | request:CommDictRequest@RequestBody | `updateDict` (p__system__Dict) |
| POST | `/api/system/dictItem/create` | SystemApi.createDictItem | `void` | request:CommDictItemRequest@RequestBody | （仅字面量出现） |
| POST | `/api/system/dictItem/delete` | SystemApi.deleteDictItem | `void` | request:CommDictItemRequest@RequestBody | `deleteDictItem` (p__system__Dict) |
| POST | `/api/system/dictItem/import` | SystemApi.importDictItem | `void` | request:CommDictItemRequest | `importDictItems` (p__system__Dict) |
| GET | `/api/system/dictItem/list` | SystemApi.listDictItem | `PaginationResponse<CommDictItemView>` | query:CommDictItemQuery | `loadDictItems` (p__system__Dict) |
| POST | `/api/system/dictItem/update` | SystemApi.updateItem | `void` | request:CommDictItemRequest@RequestBody | `saveOrUpdateDictItem` (p__system__Dict) |
| GET | `/api/system/oauthSetting` | SystemApi.getOAuthSetting | `OAuthSettingView` | — | `getOAuthSetting` (p__system__SystemSettings)<br>`updateOAuthSetting` (p__system__SystemSettings) |
| POST | `/api/system/oauthSetting` | SystemApi.updateOAuthSetting | `void` | request:OAuthSettingRequest@RequestBody | `getOAuthSetting` (p__system__SystemSettings)<br>`updateOAuthSetting` (p__system__SystemSettings) |
| GET | `/api/system/permission/diff` | SystemApi.extractCodeDiffDbPermissions | `void` | — | — |
| REQUEST | `/api/system/permission/list` | SystemApi.permissions | `List<PermissionView>` | — | `loadPermissions` |
| POST | `/api/system/position/create` | SystemApi.addPosition | `void` | request:PositionRequest@RequestBody | `savePosition` |
| POST | `/api/system/position/delete` | SystemApi.deletePosition | `void` | request:PositionRequest@RequestBody | `deletePosition` |
| GET | `/api/system/position/list` | SystemApi.listPosition | `PaginationResponse<PositionView>` | query:PositionQuery | `loadPositions` |
| POST | `/api/system/position/update` | SystemApi.updatePosition | `void` | request:PositionRequest@RequestBody | `updatePosition` |
| POST | `/api/system/role/create` | SystemApi.createRole | `void` | request:RoleRequest@RequestBody | `saveRole` |
| POST | `/api/system/role/delete` | SystemApi.deleteRole | `void` | request:RoleRequest@RequestBody | `deleteRole` |
| REQUEST | `/api/system/role/list` | SystemApi.roles | `PaginationResponse<RoleView>` | query:RoleQuery | `loadRoles` (p__system__User) |
| POST | `/api/system/role/update` | SystemApi.updateRole | `void` | request:RoleRequest@RequestBody | `updateRole` (p__system__Role) |
| POST | `/api/system/update` | SystemApi.updateSystemInfo | `void` | request:SystemInfoRequest@RequestBody | `updateSysInfo` (p__system__SystemSettings) |
| POST | `/api/system/user/create` | SystemApi.createUser | `void` | request:UserRequest@RequestBody,Valid | `saveUser` |
| POST | `/api/system/user/delete` | SystemApi.deleteUser | `void` | request:UserRequest@RequestBody | `deleteUser` |
| REQUEST | `/api/system/user/list` | SystemApi.roles | `PaginationResponse<UserView>` | query:UserQuery | `loadUsers` (p__system__Dept) |
| POST | `/api/system/user/update` | SystemApi.updateUser | `void` | request:UserRequest@RequestBody,Valid | `updateUser` |
| POST | `/api/system/user/updatePosition` | SystemApi.updateUserPosition | `void` | request:UserRequest@RequestBody,Valid | — |

### 项目（21）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| POST | `/api/project/create` | ProjectApi.addProject | `ProjectView` | project:ProjectRequest@RequestBody | `saveProject` (p__Project) |
| POST | `/api/project/delete` | ProjectApi.deleteProject | `void` | project:ProjectRequest@RequestBody | `deleteProject` (p__Project) |
| POST | `/api/project/destroy` | ProjectApi.batchDestroyProject | `void` | request:ProjectRequest@RequestBody | `destroyProject` (p__Project) |
| GET | `/api/project/list` | ProjectApi.listProject | `PaginationResponse<ProjectView>` | query:ProjectQuery | `loadProjects` (p__Project) |
| POST | `/api/project/partner/create` | ProjectApi.addProjectPartner | `void` | request:ProjectPartnerRequest@RequestBody | `addProjectPartner` (1642) |
| POST | `/api/project/partner/delete` | ProjectApi.deleteProjectPartner | `void` | request:ProjectPartnerRequest@RequestBody | `deleteProjectPartner` (1642) |
| GET | `/api/project/partner/download` | ProjectApi.downloadPartner | `void` | query:ProjectPartnerQuery | （仅字面量出现） |
| POST | `/api/project/partner/import` | ProjectApi.importPartner | `void` | request:WhiteListRequest | `importProjectPartner` (1642) |
| GET | `/api/project/partner/list` | ProjectApi.listProjectPartner | `PaginationResponse<ProjectPartnerView>` | query:ProjectPartnerQuery | `loadProjectPartner` (1642) |
| POST | `/api/project/restore` | ProjectApi.restoreProject | `void` | request:ProjectRequest@RequestBody | `restoreProject` (p__Project) |
| POST | `/api/project/selectDept` | ProjectApi.selectDept | `List<DeptView>` | request:SelectDeptRequest@RequestBody | `selectDept` (1642) |
| POST | `/api/project/selectDict` | ProjectApi.selectDict | `List<CommDictView>` | — | `selectDict` |
| POST | `/api/project/selectPosition` | ProjectApi.selectPosition | `List<PositionView>` | request:SelectPositionRequest@RequestBody | `selectPosition` |
| POST | `/api/project/selectRepo` | ProjectApi.selectRepo | `List<RepoView>` | request:SelectRepoRequest@RequestBody | `selectRepo` (p__repo__Template) |
| POST | `/api/project/selectRole` | ProjectApi.selectRole | `List<RoleView>` | request:SelectRoleRequest@RequestBody | `selectRole` (p__system__SystemSettings) |
| POST | `/api/project/selectTag` | ProjectApi.selectTag | `Set<String>` | request:SelectTagRequest@RequestBody | `selectTag` (p__repo__Template) |
| POST | `/api/project/selectTemplate` | ProjectApi.selectTemplate | `Map<String, List<TemplateView>>` | request:SelectTemplateRequest@RequestBody | `selectTemplate` (p__repo__Template) |
| POST | `/api/project/selectUser` | ProjectApi.selectUser | `List<UserInfo>` | request:SelectUserRequest@RequestBody | `selectUser` (1642) |
| GET | `/api/project/setting` | ProjectApi.getSetting | `ProjectSetting` | query:ProjectQuery | — |
| GET | `/api/project/trash` | ProjectApi.getDeleted | `List<ProjectView>` | query:ProjectQuery | `getDeletedProject` (p__Project) |
| POST | `/api/project/update` | ProjectApi.updateProject | `void` | project:ProjectRequest@RequestBody | `updateProject` (p__Project)<br>`updateSetting` |

### 答卷（9）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| POST | `/api/answer/create` | AnswerApi.saveAnswer | `void` | request:AnswerRequest@RequestBody | `saveAnswer` |
| POST | `/api/answer/delete` | AnswerApi.deleteAnswer | `void` | request:AnswerRequest@RequestBody | `deleteAnswer` |
| POST | `/api/answer/destroy` | AnswerApi.batchDestroyAnswer | `void` | request:AnswerRequest@RequestBody | `physicalDeleteAnswer` |
| GET | `/api/answer/download` | AnswerApi.download | `ResponseEntity<Resource>` | query:DownloadQuery | （仅字面量出现） |
| GET | `/api/answer/list` | AnswerApi.listAnswer | `PaginationResponse<AnswerView>` | query:AnswerQuery | `loadData` |
| POST | `/api/answer/restore` | AnswerApi.restoreAnswer | `void` | request:AnswerRequest@RequestBody | `restoreAnswer` |
| GET | `/api/answer/trash` | AnswerApi.listAnswerDeleted | `List<AnswerView>` | query:AnswerQuery | `loadDeletedData` |
| POST | `/api/answer/update` | AnswerApi.updateAnswer | `void` | request:AnswerRequest@RequestBody | `updateAnswer` |
| POST | `/api/answer/upload` | AnswerApi.upload | `AnswerUploadView` | request:AnswerUploadRequest | （仅字面量出现） |

### 题库（17）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| POST | `/api/repo/batchCreate` | RepoApi.batchAddRepoTemplate | `void` | request:RepoTemplateRequest@RequestBody | `batchAddRepoTemplate` |
| POST | `/api/repo/book/create` | RepoApi.createUserBook | `void` | request:UserBookRequest@RequestBody | `createUserBook` |
| POST | `/api/repo/book/delete` | RepoApi.deleteUserBook | `void` | request:UserBookRequest@RequestBody | `deleteUserBook` (p__repo__Book) |
| GET | `/api/repo/book/list` | RepoApi.listUserBook | `PaginationResponse<UserBookView>` | query:UserBookQuery | `listUserBook` (p__repo__Book) |
| GET | `/api/repo/book/question` | RepoApi.getUserBookQuestion | `SurveySchema` | id:String@RequestParam | `getUserBookQuestion` |
| POST | `/api/repo/book/update` | RepoApi.updateUserBook | `UserBookView` | request:UserBookRequest@RequestBody | `updateUserBook` (p__Answer__Practice) |
| POST | `/api/repo/create` | RepoApi.addRepo | `void` | request:RepoRequest@RequestBody,Valid | （仅字面量出现） |
| POST | `/api/repo/delete` | RepoApi.deleteRepo | `void` | request:RepoRequest@RequestBody | `deleteRepo` (p__repo__Repo) |
| GET | `/api/repo/export` | RepoApi.exportRepoQuestions | `void` | request:RepoRequest | （仅字面量出现） |
| POST | `/api/repo/import` | RepoApi.importFromTemplate | `void` | request:RepoTemplateRequest | （仅字面量出现） |
| GET | `/api/repo/list` | RepoApi.listRepo | `PaginationResponse<RepoView>` | query:RepoQuery | `loadRepo` (4942) |
| POST | `/api/repo/partner/create` | RepoApi.addRepoPartner | `void` | request:RepoPartnerRequest@RequestBody | `addRepoPartner` (p__repo__Repo) |
| POST | `/api/repo/partner/delete` | RepoApi.deleteRepoPartner | `void` | request:RepoPartnerRequest@RequestBody | `deleteRepoPartner` (p__repo__Repo) |
| GET | `/api/repo/partner/list` | RepoApi.listRepoPartner | `PaginationResponse<RepoPartnerView>` | query:RepoPartnerQuery | `loadRepoPartner` |
| POST | `/api/repo/pick` | RepoApi.pickQuestionFromRepo | `List<SurveySchema>` | repos:List<ProjectSetting.RandomSurveyCondition>@RequestBody | `pickRepoQuestion` (p__repo__Template) |
| POST | `/api/repo/unbind` | RepoApi.batchUnBindTemplate | `void` | request:RepoTemplateRequest@RequestBody | （仅字面量出现） |
| POST | `/api/repo/update` | RepoApi.updateRepo | `void` | request:RepoRequest@RequestBody,Valid | `saveOrUpdateRepo` (p__repo__Repo) |

### 练习（2）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| POST | `/api/exercise/delete` | ExerciseApi.deleteExercise | `void` | request:AnswerRequest@RequestBody | `deleteExercise` (4942) |
| GET | `/api/exercise/list` | ExerciseApi.historyExercise | `PaginationResponse<ExerciseView>` | query:HistoryExerciseQuery@Valid | `listExercise` (4942) |

### 模板（7）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| POST | `/api/template/create` | TemplateApi.addTemplate | `String` | template:TemplateRequest@RequestBody | `saveTemplate` |
| POST | `/api/template/delete` | TemplateApi.deleteTemplate | `void` | request:TemplateRequest@RequestBody | `deleteTemplate` |
| GET | `/api/template/get` | TemplateApi.getTemplate | `TemplateView` | query:TemplateQuery | `getTemplate` (p__Answer__Practice) |
| GET | `/api/template/list` | TemplateApi.listQuestionTemplate | `PaginationResponse<TemplateView>` | query:TemplateQuery | `loadTemplate` |
| GET | `/api/template/listCategory` | TemplateApi.listTemplateCategories | `Set<String>` | query:CategoryQuery | `loadCategories` (p__repo__Template) |
| GET | `/api/template/listTag` | TemplateApi.getTags | `Set<String>` | query:TagQuery | `loadTags` (p__repo__Repo) |
| POST | `/api/template/update` | TemplateApi.updateTemplate | `void` | template:TemplateRequest@RequestBody | — |

### 文件（4）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| POST | `/api/file/create` | FileApi.upload | `FileView` | request:UploadFileRequest | （仅字面量出现） |
| POST | `/api/file/delete` | FileApi.deleteImage | `void` | request:UploadFileRequest@RequestBody | `deleteImage` |
| GET | `/api/file/downloadTemplate` | FileApi.downloadTemplate | `ResponseEntity<Resource>` | name:String | （仅字面量出现） |
| GET | `/api/file/list` | FileApi.listFiles | `List<FileView>` | query:FileQuery | `loadFiles` (1027) |

### 报表（1）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| GET | `/api/report/{shortId}` | ReportApi.getData | `ReportData` | shortId:String@PathVariable | — |

### AI（7）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| POST | `/api/ai/chat/answer-analysis/close-conversation` | ChatController.closeAnswerAnalysisConversation | `void` | conversationId:String@RequestParam | （仅字面量出现） |
| POST | `/api/ai/chat/answer-analysis/create-conversation` | ChatController.createAnswerAnalysisConversation | `ConversationResponse` | conversationRequest:ConversationRequest@RequestBody<br>model:String@RequestParam | `createAIAnswerAnalysisConversation` |
| GET | `/api/ai/chat/answer-analysis/stream` | ChatController.createAnswerAnalysisStream | `Flux<StreamResponseEvent>` | content:String@RequestParam<br>model:String@RequestParam<br>conversationId:String@RequestParam | （仅字面量出现） |
| POST | `/api/ai/chat/close-conversation` | ChatController.closeConversation | `void` | conversationId:String@RequestParam | （仅字面量出现） |
| POST | `/api/ai/chat/create-conversation` | ChatController.createConversation | `ConversationResponse` | conversationRequest:ConversationRequest@RequestBody<br>model:String@RequestParam | `createAIConversation` (p__Project) |
| GET | `/api/ai/chat/models` | ChatController.getModels | `List<ModelType>` | — | `getAIModels` (p__Project) |
| GET | `/api/ai/chat/stream` | ChatController.createChatStream | `Flux<StreamResponseEvent>` | content:String@RequestParam<br>model:String@RequestParam<br>conversationId:String@RequestParam<br>locale:String@RequestParam | （仅字面量出现） |

### OAuth（3）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| POST | `/api/oauth/bind/{provider}/start` | OAuthApi.startBind | `ResponseEntity<OAuthStartResponse>` | provider:String@PathVariable<br>request:OAuthStartRequest@RequestBody<br>httpRequest:HttpServletRequest | — |
| GET | `/api/oauth/bindings` | OAuthApi.bindings | `List<OAuthBindingView>` | — | `getOAuthBindings` (p__account__settings) |
| DELETE | `/api/oauth/bindings/{bindingId}` | OAuthApi.unbind | `void` | bindingId:String@PathVariable | — |

### 流程（预留模块）（10）

| 方法 | 路径 | 后端处理器 | 返回 | 请求参数 | 前端调用 |
|---|---|---|---|---|---|
| POST | `/api/workflow/approvalTask` | FlowApi.approvalTask | `void` | request:ApprovalTaskRequest@RequestBody | `approvalTask` |
| POST | `/api/workflow/deploy` | FlowApi.deploy | `void` | projectId:String | （仅字面量出现） |
| GET | `/api/workflow/getAuditRecord` | FlowApi.getAuditRecord | `List<FlowOperationView>` | processInstanceId:String | （仅字面量出现） |
| GET | `/api/workflow/getFlow` | FlowApi.getFlowEntry | `FlowEntryView` | projectId:String | （仅字面量出现） |
| GET | `/api/workflow/getFlowTasks` | FlowApi.getFlowTasks | `PaginationResponse<FlowTaskView>` | query:FlowTaskQuery | `loadFlowTasks` |
| GET | `/api/workflow/getRevertNodes` | FlowApi.getRevertNodes | `List<RevokeView>` | processInstanceId:String | （仅字面量出现） |
| GET | `/api/workflow/getTaskInfo` | FlowApi.getTaskInfo | `void` | — | — |
| GET | `/api/workflow/loadSchema` | FlowApi.loadSchema | `SurveySchema` | query:SchemaQuery | `loadFlowSchema` |
| POST | `/api/workflow/saveFlow` | FlowApi.saveFlow | `void` | request:FlowEntryRequest@RequestBody | `saveFlow` |
| GET | `/api/workflow/statics` | FlowApi.statics | `FlowStaticsView` | — | `getFlowStatics` |
