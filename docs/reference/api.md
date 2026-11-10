<!-- 由 npm run docs:gen 生成；不要手改。来源：server/api/**/*.java -->

# 接口表（生成）

> 共 167 个方法级映射。`${api.prefix}` 在运行时由配置替换；权限列为空表示方法上没有 `@PreAuthorize`。

| 方法 | 路径 | 类/方法 | 权限 | 数据权限 |
|---|---|---|---|---|
| GET | `${api.prefix}/answer/list` | `AnswerApi#listAnswer` | `hasAuthority('answer:list')` | 是 |
| GET | `${api.prefix}/answer/trash` | `AnswerApi#listAnswerDeleted` | `hasAuthority('answer:list')` | 是 |
| GET | `${api.prefix}/answer` | `AnswerApi#getAnswer` | `hasAuthority('answer:detail')` | — |
| POST | `${api.prefix}/answer/create` | `AnswerApi#saveAnswer` | `hasAuthority('answer:create')` | 是 |
| POST | `${api.prefix}/answer/update` | `AnswerApi#updateAnswer` | `hasAuthority('answer:update')` | 是 |
| POST | `${api.prefix}/answer/delete` | `AnswerApi#deleteAnswer` | `hasAuthority('answer:delete')` | — |
| POST | `${api.prefix}/answer/destroy` | `AnswerApi#batchDestroyAnswer` | `hasAuthority('answer:delete')` | — |
| POST | `${api.prefix}/answer/restore` | `AnswerApi#restoreAnswer` | `hasAuthority('answer:restore') or hasRole('admin')` | — |
| GET | `${api.prefix}/answer/download` | `AnswerApi#download` | `hasAuthority('answer:export')` | 是 |
| POST | `${api.prefix}/answer/upload` | `AnswerApi#upload` | `hasAuthority('answer:upload')` | 是 |
| GET | `${api.prefix}/system/audit/list` | `AuditApi#list` | `hasAuthority('system:log:list')` | — |
| GET | `${api.prefix}/system/audit/actions` | `AuditApi#actions` | `hasAuthority('system:log:list')` | — |
| GET | `${api.prefix}/dashboard/list` | `DashboardApi#listDashboard` | — | — |
| GET | `${api.prefix}/exercise/list` | `ExerciseApi#historyExercise` | `hasAuthority('exercise:list')` | — |
| POST | `${api.prefix}/exercise/delete` | `ExerciseApi#deleteExercise` | `hasAuthority('exercise:list')` | — |
| GET | `${api.prefix}/file` | `FileApi#getFile` | `hasAuthority('file:detail')` | — |
| GET | `${api.prefix}/file/list` | `FileApi#listFiles` | `hasAuthority('file:list')` | — |
| POST | `${api.prefix}/file/create` | `FileApi#upload` | `hasAnyAuthority('file:upload','file:import') or hasRole('admin')` | — |
| POST | `${api.prefix}/file/delete` | `FileApi#deleteImage` | `hasAuthority('file:delete')` | — |
| GET | `${api.prefix}/file/downloadTemplate` | `FileApi#downloadTemplate` | `hasAnyAuthority('file:import','template:import') or hasRole('admin')` | — |
| GET | `${api.prefix}/my-report/list` | `MyReportApi#listMine` | `hasAuthority('project:report') or hasRole('admin')` | — |
| POST | `${api.prefix}/public/oauth/login/{provider}/start` | `OAuthApi#startLogin` | — | — |
| POST | `${api.prefix}/oauth/bind/{provider}/start` | `OAuthApi#startBind` | `isAuthenticated()` | — |
| POST | `${api.prefix}/public/oauth/survey/wechat/start` | `OAuthApi#startSurveyWechat` | `isAuthenticated()` | — |
| GET | `${api.prefix}/public/oauth/callback/{channel}` | `OAuthApi#callback` | — | — |
| GET | `${api.prefix}/public/oauth/register/{ticket}` | `OAuthApi#registration` | — | — |
| POST | `${api.prefix}/public/oauth/register/{ticket}` | `OAuthApi#completeRegistration` | — | — |
| GET | `${api.prefix}/oauth/bindings` | `OAuthApi#bindings` | `isAuthenticated()` | — |
| DELETE | `${api.prefix}/oauth/bindings/{bindingId}` | `OAuthApi#unbind` | `isAuthenticated()` | — |
| GET | `${api.prefix}/project/list` | `ProjectApi#listProject` | `hasAuthority('project:list') or hasAuthority('exercise:list')` | — |
| GET | `${api.prefix}/project` | `ProjectApi#getProject` | `hasAuthority('project:detail')` | 是 |
| GET | `${api.prefix}/project/setting` | `ProjectApi#getSetting` | `hasAuthority('project:detail')` | 是 |
| POST | `${api.prefix}/project/create` | `ProjectApi#addProject` | `hasAuthority('project:create')` | 是 |
| POST | `${api.prefix}/project/update` | `ProjectApi#updateProject` | `hasAuthority('project:update')` | 是 |
| POST | `${api.prefix}/project/status` | `ProjectApi#updateProjectStatus` | `hasAuthority('project:publish') or hasRole('admin')` | 是 |
| POST | `${api.prefix}/project/delete` | `ProjectApi#deleteProject` | `hasAuthority('project:delete')` | 是 |
| GET | `${api.prefix}/project/partner/list` | `ProjectApi#listProjectPartner` | `hasAuthority('project:detail')` | 是 |
| POST | `${api.prefix}/project/partner/create` | `ProjectApi#addProjectPartner` | `hasAuthority('project:partner') or hasRole('admin')` | 是 |
| POST | `${api.prefix}/project/partner/delete` | `ProjectApi#deleteProjectPartner` | `hasAuthority('project:partner') or hasRole('admin')` | 是 |
| GET | `${api.prefix}/project/partner/download` | `ProjectApi#downloadPartner` | `hasAuthority('project:partner') or hasRole('admin')` | 是 |
| POST | `${api.prefix}/project/partner/import` | `ProjectApi#importPartner` | `hasAuthority('project:partner') or hasRole('admin')` | 是 |
| GET | `${api.prefix}/project/trash` | `ProjectApi#getDeleted` | `hasAuthority('project:list')` | 是 |
| POST | `${api.prefix}/project/destroy` | `ProjectApi#batchDestroyProject` | `hasAuthority('project:delete')` | — |
| POST | `${api.prefix}/project/restore` | `ProjectApi#restoreProject` | `hasAuthority('project:create')` | — |
| POST | `${api.prefix}/project/selectUser` | `ProjectApi#selectUser` | `hasAnyAuthority('project:detail','project:create','project:update')` | — |
| POST | `${api.prefix}/project/selectDept` | `ProjectApi#selectDept` | `hasAnyAuthority('project:detail','project:create','project:update')` | — |
| POST | `${api.prefix}/project/selectRole` | `ProjectApi#selectRole` | `hasAnyAuthority('project:detail','project:create','project:update')` | — |
| POST | `${api.prefix}/project/selectPosition` | `ProjectApi#selectPosition` | `hasAnyAuthority('project:detail','project:create','project:update')` | — |
| POST | `${api.prefix}/project/selectDict` | `ProjectApi#selectDict` | `hasAnyAuthority('project:detail','project:create','project:update')` | — |
| POST | `${api.prefix}/project/selectTemplate` | `ProjectApi#selectTemplate` | `hasAnyAuthority('project:detail','project:create','project:update')` | — |
| POST | `${api.prefix}/project/selectRepo` | `ProjectApi#selectRepo` | — | — |
| POST | `${api.prefix}/project/selectTag` | `ProjectApi#selectTag` | — | — |
| GET | `${api.prefix}/repo/list` | `RepoApi#listRepo` | `hasAnyAuthority('repo:list', 'exercise:list')` | — |
| GET | `${api.prefix}/repo/detail` | `RepoApi#getRpo` | `hasAnyAuthority('repo:detail','repo:questions:read')` | — |
| POST | `${api.prefix}/repo/create` | `RepoApi#addRepo` | `hasAuthority('repo:create')` | — |
| POST | `${api.prefix}/repo/update` | `RepoApi#updateRepo` | `hasAuthority('repo:update')` | — |
| POST | `${api.prefix}/repo/delete` | `RepoApi#deleteRepo` | `hasAuthority('repo:delete')` | — |
| GET | `${api.prefix}/repo/partner/list` | `RepoApi#listRepoPartner` | `hasAuthority('repo:list')` | — |
| POST | `${api.prefix}/repo/partner/create` | `RepoApi#addRepoPartner` | `hasAuthority('repo:grant') or hasRole('admin')` | — |
| POST | `${api.prefix}/repo/partner/delete` | `RepoApi#deleteRepoPartner` | `hasAuthority('repo:grant') or hasRole('admin')` | — |
| POST | `${api.prefix}/repo/batchCreate` | `RepoApi#batchAddRepoTemplate` | `hasAuthority('repo:create')` | — |
| POST | `${api.prefix}/repo/unbind` | `RepoApi#batchUnBindTemplate` | `hasAuthority('repo:update')` | — |
| POST | `${api.prefix}/repo/pick` | `RepoApi#pickQuestionFromRepo` | `hasAnyAuthority('repo:detail','repo:book') or hasRole('admin')` | — |
| POST | `${api.prefix}/repo/import` | `RepoApi#importFromTemplate` | `hasAuthority('template:import') or hasRole('admin')` | — |
| GET | `${api.prefix}/repo/book/list` | `RepoApi#listUserBook` | `hasAuthority('repo:book')` | — |
| GET | `${api.prefix}/repo/book/question` | `RepoApi#getUserBookQuestion` | `hasAuthority('repo:book')` | — |
| POST | `${api.prefix}/repo/book/create` | `RepoApi#createUserBook` | `hasAuthority('repo:book')` | — |
| POST | `${api.prefix}/repo/book/update` | `RepoApi#updateUserBook` | `hasAuthority('repo:book')` | — |
| POST | `${api.prefix}/repo/book/delete` | `RepoApi#deleteUserBook` | `hasAuthority('repo:book')` | — |
| GET | `${api.prefix}/repo/export` | `RepoApi#exportRepoQuestions` | `hasAuthority('repo:export')` | — |
| POST | `${api.prefix}/repo/export/token` | `RepoApi#exportToken` | `hasAuthority('repo:export') or hasAuthority('answer:export')` | — |
| POST | `${api.prefix}/report/statistics` | `ReportApi#statProject` | `hasAuthority('project:report') or hasRole('admin')` | — |
| GET | `${api.prefix}/report/{shortId}` | `ReportApi#getData` | `hasAuthority('project:report')` | 是 |
| POST | `${api.prefix}/public/loadProject` | `SurveyApi#loadProject` | — | — |
| POST | `${api.prefix}/public/projectOutline` | `SurveyApi#projectOutline` | — | — |
| POST | `${api.prefix}/public/validateProjectOutline` | `SurveyApi#validateProjectOutline` | — | — |
| POST | `${api.prefix}/public/question` | `SurveyApi#question` | — | — |
| POST | `${api.prefix}/public/validateProject` | `SurveyApi#validateProject` | — | — |
| POST | `${api.prefix}/public/saveAnswer` | `SurveyApi#saveAnswer` | — | — |
| POST | `${api.prefix}/public/tempSaveAnswer` | `SurveyApi#tempSaveAnswer` | — | — |
| POST | `${api.prefix}/public/upload` | `SurveyApi#upload` | — | — |
| GET | `${api.prefix}/public/preview/{attachmentId}` | `SurveyApi#preview` | — | — |
| POST | `${api.prefix}/public/loadQuery` | `SurveyApi#loadQuery` | — | — |
| POST | `${api.prefix}/public/getQueryResult` | `SurveyApi#getQueryResult` | — | — |
| POST | `${api.prefix}/public/loadDict` | `SurveyApi#loadDict` | — | — |
| POST | `${api.prefix}/public/loadExamResult` | `SurveyApi#loadExamResult` | — | — |
| POST | `${api.prefix}/public/loadLinkResult` | `SurveyApi#loadLinkResult` | — | — |
| POST | `${api.prefix}/public/exam/switch-screen` | `SurveyApi#recordSwitchScreen` | — | — |
| POST | `${api.prefix}/public/attempts` | `SurveyApi#listAttempts` | — | — |
| GET | `${api.prefix}/system` | `SystemApi#getSystemInfo` | — | — |
| GET | `${api.prefix}/system/aiSetting` | `SystemApi#getSystemAiSetting` | `hasRole('admin')` | — |
| GET | `${api.prefix}/system/oauthSetting` | `SystemApi#getOAuthSetting` | `hasRole('admin')` | — |
| POST | `${api.prefix}/system/oauthSetting` | `SystemApi#updateOAuthSetting` | `hasRole('admin')` | — |
| POST | `${api.prefix}/system/update` | `SystemApi#updateSystemInfo` | `hasRole('admin') or hasAuthority('system:setting:update')` | — |
| REQUEST | `${api.prefix}/system/role/list` | `SystemApi#roles` | `hasAuthority('system:role:list')` | — |
| GET | `${api.prefix}/system/role/options` | `SystemApi#roleOptions` | `hasAnyAuthority('system:role:list','system:dept:list','system:dept:update','org:list','class:list') or hasRole('admin')` | — |
| POST | `${api.prefix}/system/role/create` | `SystemApi#createRole` | `hasAuthority('system:role:create')` | — |
| POST | `${api.prefix}/system/role/update` | `SystemApi#updateRole` | `hasAuthority('system:role:update')` | — |
| POST | `${api.prefix}/system/role/delete` | `SystemApi#deleteRole` | `hasAuthority('system:role:delete')` | — |
| GET | `${api.prefix}/system/permission/list` | `SystemApi#permissions` | `hasAuthority('system:role:list') or hasRole('admin')` | — |
| GET | `${api.prefix}/system/permission/diff` | `SystemApi#extractCodeDiffDbPermissions` | `hasRole('admin')` | — |
| REQUEST | `${api.prefix}/system/user/list` | `SystemApi#roles` | `hasAuthority('system:user:list')` | — |
| GET | `${api.prefix}/system/user/options` | `SystemApi#userOptions` | `hasAnyAuthority('system:user:list','user:select') or hasRole('admin')` | — |
| POST | `${api.prefix}/system/user/create` | `SystemApi#createUser` | `hasAnyAuthority('system:user:create','system:user:create:student','system:user:create:teacher') or hasRole('admin')` | — |
| POST | `${api.prefix}/system/user/update` | `SystemApi#updateUser` | `hasAuthority('system:user:update')` | — |
| POST | `${api.prefix}/system/user/updatePosition` | `SystemApi#updateUserPosition` | `hasRole('admin')` | — |
| POST | `${api.prefix}/system/user/delete` | `SystemApi#deleteUser` | `hasAuthority('system:user:delete')` | — |
| GET | `${api.prefix}/system/checkUsernameExist` | `SystemApi#checkUsernameExist` | `hasAuthority('system:user:delete')` | — |
| GET | `${api.prefix}/system/position/list` | `SystemApi#listPosition` | `hasRole('admin')` | — |
| POST | `${api.prefix}/system/position/create` | `SystemApi#addPosition` | `hasRole('admin')` | — |
| POST | `${api.prefix}/system/position/update` | `SystemApi#updatePosition` | `hasRole('admin')` | — |
| POST | `${api.prefix}/system/position/delete` | `SystemApi#deletePosition` | `hasRole('admin')` | — |
| GET | `${api.prefix}/system/dept/list` | `SystemApi#listDept` | `hasAnyAuthority('system:dept:list','org:list') or hasRole('admin')` | — |
| POST | `${api.prefix}/system/dept/create` | `SystemApi#addOrg` | `hasAuthority('system:dept:create')` | — |
| POST | `${api.prefix}/system/dept/update` | `SystemApi#updateOrg` | `hasAuthority('system:dept:update')` | — |
| GET | `${api.prefix}/system/dept/delete-check` | `SystemApi#deleteCheck` | `hasAuthority('system:dept:delete') or hasRole('admin')` | — |
| POST | `${api.prefix}/system/dept/delete` | `SystemApi#deleteOrg` | `hasAuthority('system:dept:delete')` | — |
| POST | `${api.prefix}/system/dept/sort` | `SystemApi#sortOrg` | `hasAuthority('system:dept:create')` | — |
| GET | `${api.prefix}/system/dict/list` | `SystemApi#listDict` | `hasAuthority('system:dict:list')` | — |
| POST | `${api.prefix}/system/dict/create` | `SystemApi#addDict` | `hasAuthority('system:dict:create')` | — |
| POST | `${api.prefix}/system/dict/update` | `SystemApi#updateDict` | `hasAuthority('system:dict:update')` | — |
| POST | `${api.prefix}/system/dict/delete` | `SystemApi#deleteDict` | `hasAuthority('system:dict:delete')` | — |
| GET | `${api.prefix}/system/dictItem/list` | `SystemApi#listDictItem` | `hasAuthority('system:dictItem:list')` | — |
| POST | `${api.prefix}/system/dictItem/create` | `SystemApi#createDictItem` | `hasAuthority('system:dictItem:create')` | — |
| POST | `${api.prefix}/system/dictItem/update` | `SystemApi#updateItem` | `hasAuthority('system:dictItem:update')` | — |
| POST | `${api.prefix}/system/dictItem/import` | `SystemApi#importDictItem` | `hasAuthority('system:dictItem:import')` | — |
| POST | `${api.prefix}/system/dictItem/delete` | `SystemApi#deleteDictItem` | `hasAuthority('system:dictItem:delete')` | — |
| POST | `${api.prefix}/system/protection` | `SystemProtectionApi#updateProtection` | `hasAuthority('content:protect') or hasRole('admin')` | — |
| GET | `${api.prefix}/teaching/projects` | `TeachingApi#myProjects` | `hasAuthority('project:report') or hasRole('admin')` | — |
| GET | `${api.prefix}/teaching/classes` | `TeachingApi#classes` | `hasAuthority('project:report') or hasRole('admin')` | — |
| GET | `${api.prefix}/teaching/classes/tree` | `TeachingApi#classTree` | `hasAuthority('class:list') or hasRole('admin')` | — |
| POST | `${api.prefix}/teaching/classes/create` | `TeachingApi#createClass` | `hasAuthority('class:list') or hasRole('admin')` | — |
| POST | `${api.prefix}/teaching/classes/update` | `TeachingApi#updateClass` | `hasAuthority('class:list') or hasRole('admin')` | — |
| GET | `${api.prefix}/teaching/classes/resources` | `TeachingApi#classResources` | `hasAuthority('class:list') or hasRole('admin')` | — |
| POST | `${api.prefix}/teaching/classes/resources/assign` | `TeachingApi#assignClassResource` | `hasAuthority('class:list') or hasRole('admin')` | — |
| POST | `${api.prefix}/teaching/classes/resources/update` | `TeachingApi#updateClassResource` | `hasAuthority('class:list') or hasRole('admin')` | — |
| POST | `${api.prefix}/teaching/classes/resources/delete` | `TeachingApi#deleteClassResource` | `hasAuthority('class:list') or hasRole('admin')` | — |
| GET | `${api.prefix}/teaching/classes/members` | `TeachingApi#classMembers` | `hasAuthority('class:detail') or hasRole('admin')` | — |
| GET | `${api.prefix}/teaching/classes/teachers` | `TeachingApi#classTeachers` | `hasAuthority('class:grant') or hasRole('admin')` | — |
| GET | `${api.prefix}/teaching/classes/teacher-options` | `TeachingApi#classTeacherOptions` | `hasAuthority('class:grant') or hasRole('admin')` | — |
| POST | `${api.prefix}/teaching/classes/partner/create` | `TeachingApi#addClassPartners` | `hasAuthority('class:grant') or hasRole('admin')` | — |
| POST | `${api.prefix}/teaching/classes/partner/update` | `TeachingApi#updateClassPartner` | `hasAuthority('class:grant') or hasRole('admin')` | — |
| POST | `${api.prefix}/teaching/classes/partner/delete` | `TeachingApi#deleteClassPartner` | `hasAuthority('class:grant') or hasRole('admin')` | — |
| POST | `${api.prefix}/teaching/classes/member/create` | `TeachingApi#createClassMember` | `hasAuthority('class:member:create') or hasRole('admin')` | — |
| POST | `${api.prefix}/teaching/classes/member/update` | `TeachingApi#updateClassMember` | `hasAuthority('class:member:update') or hasRole('admin')` | — |
| POST | `${api.prefix}/teaching/classes/member/delete` | `TeachingApi#deleteClassMember` | `hasAuthority('class:member:delete') or hasRole('admin')` | — |
| POST | `${api.prefix}/teaching` | `TeachingApi#importClassMembers` | `hasAuthority('class:member:create') or hasRole('admin')` | — |
| GET | `${api.prefix}/teaching/classes/member/template` | `TeachingApi#classMemberTemplate` | `hasAuthority('class:member:create') or hasRole('admin')` | — |
| GET | `${api.prefix}/template/list` | `TemplateApi#listQuestionTemplate` | `hasAnyAuthority('template:list','repo:detail','repo:questions:read') or hasRole('admin')` | — |
| GET | `${api.prefix}/template/get` | `TemplateApi#getTemplate` | `hasAuthority('template:list')` | — |
| POST | `${api.prefix}/template/create` | `TemplateApi#addTemplate` | `hasAuthority('template:create')` | — |
| POST | `${api.prefix}/template/update` | `TemplateApi#updateTemplate` | `hasAuthority('template:update')` | — |
| POST | `${api.prefix}/template/delete` | `TemplateApi#deleteTemplate` | `hasAuthority('template:delete')` | — |
| GET | `${api.prefix}/template/listCategory` | `TemplateApi#listTemplateCategories` | `hasAuthority('template:list')` | — |
| GET | `${api.prefix}/template/listTag` | `TemplateApi#getTags` | `hasAuthority('template:list')` | — |
| POST | `${api.prefix}/public/login` | `UserApi#login` | — | — |
| POST | `${api.prefix}/public/logout` | `UserApi#logout` | — | — |
| POST | `${api.prefix}/public/register` | `UserApi#register` | — | — |
| GET | `${api.prefix}/currentUser` | `UserApi#currentUser` | `isAuthenticated()` | — |
| GET | `${api.prefix}/userOverview` | `UserApi#userOverview` | `isAuthenticated()` | — |
| POST | `${api.prefix}/user` | `UserApi#updateUser` | `hasAuthority('user:update')` | — |
| GET | `${api.prefix}/public/listRegisterRole` | `UserApi#getRegisterRoles` | `hasAuthority('user:update')` | — |
| POST | `${api.prefix}/importUser` | `UserApi#importUser` | `hasAnyAuthority('user:import','system:user:create','system:user:create:student','system:user:create:teacher') or hasRole('admin')` | — |
| POST | `${api.prefix}/user/ui-zoom` | `UserApi#updateUiZoom` | `isAuthenticated()` | — |
| POST | `${api.prefix}/user/ui-theme` | `UserApi#updateUiTheme` | `isAuthenticated()` | — |
| GET | `${api.prefix}/listUserTask` | `UserApi#myTask` | `isAuthenticated()` | — |
| GET | `${api.prefix}/listHistoryTask` | `UserApi#myHistoryTask` | `isAuthenticated()` | — |
