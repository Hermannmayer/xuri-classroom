---
id: module-files
title: 文件、附件与导入模板
status: current
keywords:
  - 附件
  - 上传
  - 文件存储
  - 导入模板
  - 缩略图
  - 配额
source_globs:
  - client/src/pages/system/Setting.tsx
  - client/src/api/request.ts
  - server/api/src/main/java/cn/surveyking/server/api/FileApi.java
  - server/api/src/main/java/cn/surveyking/server/api/SurveyApi.java
  - server/api/src/main/resources/template/*
  - server/shared/src/main/java/cn/surveyking/server/storage/**
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/UploadFileRequest.java
  - server/shared/src/main/java/cn/surveyking/server/domain/dto/FileQuery.java
  - server/shared/src/main/java/cn/surveyking/server/core/constant/StorageTypeEnum.java
  - server/shared/src/main/java/cn/surveyking/server/core/constant/AttachmentNameVariableEnum.java
  - server/shared/src/main/java/cn/surveyking/server/core/uitls/FileUtils.java
  - server/rdbms/src/main/java/cn/surveyking/server/domain/model/File.java
  - server/rdbms/src/main/java/cn/surveyking/server/mapper/FileMapper.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/FileServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerServiceImpl.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerExporter.java
  - server/rdbms/src/main/resources/scripts/init-mysql.sql
entrypoints:
  - client/src/pages/system/Setting.tsx
  - server/api/src/main/java/cn/surveyking/server/api/FileApi.java
  - server/rdbms/src/main/java/cn/surveyking/server/impl/FileServiceImpl.java
  - server/shared/src/main/java/cn/surveyking/server/storage/LocalStorageService.java
  - server/api/src/main/resources/template/卷王用户导入模板.xlsx
apis:
  - POST /api/file/create
  - GET /api/file
  - GET /api/file/list
  - POST /api/file/delete
  - GET /api/file/downloadTemplate
  - POST /api/public/upload
  - GET /api/public/preview/{attachmentId}
tables:
  - t_file
tests:
  - client:npm run check
  - docs:npm run docs:check
last_verified: 2026-11-09
verified_against: 6c14ecfdf35a6c2610f436152c616e25e525c5b6
---

# 文件、附件与导入模板

## 30 秒摘要

文件能力只有一套实现：本地磁盘 + `t_file` 元数据表，没有对象存储分支（`StorageService` 只由 `LocalStorageService` 实现）。后台上传走 `POST /api/file/create`，要 `file:upload` 或 `file:import`；答题附件走公开的 `POST /api/public/upload`，匿名可传，但受「题目类型 + 扩展名 + 大小 + 频率 + 项目配额」五重限制。读取统一走 `FileService#loadUserFile`（本人或 `shared=1`），预览有 inline 白名单。导入模板从 classpath 的 `template/*.xlsx` 直接下发。答卷提交时 `validateAndBindAnswerFiles` 会把附件与题目/答卷绑定，绑定后不能被别的答卷复用。

## 什么时候看这篇

- 附件传不上去、返回「文件上传错误」/「文件大小超出限制」/「存储配额已满」。
- 图片预览变成下载，或匿名打开 `/api/public/preview/<id>` 报无权限。
- 要加文件类型、改配额、换存储目录或增加 OSS/S3 实现。
- 要改导入模板（用户导入、题库导入、字典导入、白名单导入）。
- 导出答卷附件时文件名不对，或要调 zip 内命名规则。

## 代码地图

| 层 | 入口 | 说明 |
|---|---|---|
| 后台接口 | `server/api/src/main/java/cn/surveyking/server/api/FileApi.java` | `/create`、`/list`、`GET /api/file`、`/delete`、`/downloadTemplate` |
| 公开接口 | `server/api/src/main/java/cn/surveyking/server/api/SurveyApi.java` | `POST /api/public/upload`（置 `publicUpload=true`）、`GET /api/public/preview/{id}` |
| 业务实现 | `server/rdbms/src/main/java/cn/surveyking/server/impl/FileServiceImpl.java` | 校验、命名、路径、缩略图、条码、配额、绑定、读取、删除 |
| 存储抽象 | `server/shared/src/main/java/cn/surveyking/server/storage/` | `StorageService`、`AbstractStorageService`、`LocalStorageService`、`StorageProperties`、`StorageAutoConfiguration` |
| 请求/查询 DTO | `server/shared/src/main/java/cn/surveyking/server/domain/dto/UploadFileRequest.java`、`FileQuery.java` | `UploadFileRequest.publicUpload` 标了 `@JsonIgnore`；`FileQuery.id` 带 `@` 时读缩略图 |
| 常量 | `StorageTypeEnum`、`AttachmentNameVariableEnum`、`FileUtils.ALLOWED_EXTENSIONS` | 存储类型 1~5、导出命名变量、默认扩展名白名单 |
| 实体/Mapper | `server/rdbms/src/main/java/cn/surveyking/server/domain/model/File.java`、`mapper/FileMapper.java` | `t_file`；`selectTotalSizeByProjectId` / `selectTotalPublicSize` 供配额 |
| 答卷侧 | `server/rdbms/src/main/java/cn/surveyking/server/impl/AnswerExporter.java` | 导出时打 zip（整卷 Excel / 单份附件 / 批量附件）、按 `AttachmentNameVariableEnum` 命名 |
| 前端上传 | `client/src/pages/system/Setting.tsx` | 系统 Logo：`FormData` → `/api/file/create` → 存 `/api/public/preview/<id>` |
| 前端下载 | `client/src/api/request.ts`（`download`） | 先看 `content-type`，是 JSON 就按 `code/message` 抛中文错误，只有二进制才落盘 |
| 导入模板文件 | `server/api/src/main/resources/template/` | `卷王用户导入模板.xlsx`、`卷王题库导入模板.xlsx`、`字典导入模板.xlsx`、`白名单导入模板.xlsx` |
| 数据表 | `t_file` | `original_name`、`file_path`、`thumb_file_path`、`storage_type`、`shared`、`project_id`、`question_id`、`answer_id`、`file_size` |

## 关键流程

### 1. 后台上传（Logo / 通用附件）

1. `FileApi#upload` 先过 `@PreAuthorize("hasAnyAuthority('file:upload','file:import') or hasRole('admin')")`。
2. `FileServiceImpl#upload` 校验原始文件名（长度、`.`/`..`、斜杠、控制字符），取扩展名。
3. 非公开上传时，只有 `publicRead=true` 才要求是图片（`isSupportImage`）。
4. 图片一律做像素校验（`max-image-pixels`，默认 1600 万）；条码题调 `BarcodeReader` 读内容。
5. 生成文件名（默认 `seqAndOriginalName`：时间戳自增序号 + `_` + 原名）与路径（默认 `byId`：`<fileId>/<fileName>`，可用 `basePath` 再套一层）。
6. 图片额外生成 `_640x480` 缩略图（`AbstractStorageService#generateThumbImage`），与原图一起写盘。
7. 落 `t_file`；任一步抛异常都会把已写入的物理文件删掉再抛出。

### 2. 公开答题上传

1. `SurveyApi#upload` 强制 `request.setPublicUpload(true)`，请求体里传不了这个字段（`@JsonIgnore`）。
2. 必须带 `projectId` + `questionId`；`SurveyService#validateProject` 先校验项目状态（截止、密码、白名单等）。
3. 题目必须在项目 schema 里，且题型属于 `Upload` / `Signature` / `RichText` / `Barcode`。
4. 扩展名：题目配置了 `fileAccept` 就只认它，否则回落到 `FileUtils.ALLOWED_EXTENSIONS`；签名/富文本/条码必须是图片。
5. 大小：`min(题目 maxFileSize, max-public-file-size-mb=20)`，同时受 `spring.servlet.multipart.max-file-size: 20MB` 兜底。
6. 频率：单客户端 10 次/分、单项目 60 次/分（`assertPublicUploadRate`，内存窗口，进程重启清零）。
7. 配额：单项目 1024MB、所有公开附件合计 5120MB（`assertProjectStorageQuota`）。
8. 落盘路径固定为 `public/<projectId>/<questionId>/<fileId>/<fileName>`，每个路径段只允许 `[a-zA-Z0-9_-]`；`RichText` 图片置 `shared=1`，其余是私有附件。

### 3. 读取与预览

1. `GET /api/file` 走 `loadUserFile`：`assertReadableFile` 要求「本人上传」或 `shared=1`，否则 403。
2. `GET /api/public/preview/{id}` 走 `loadPublicFile`：只认 `shared=1`。登录页 Logo 就靠这条匿名可读。
3. `buildFileResponse`：只有 `SAFE_INLINE_EXTENSIONS`（图片、pdf、txt、音视频等）且请求 `dispositionType=inline` 才按原 MIME 内联，其余一律 `application/octet-stream` + `attachment`；统一加 `X-Content-Type-Options: nosniff`。
4. `FileQuery.id` 带 `@` 后缀时取 `thumb_file_path`（前端用缩略图 id 约定），找不到路径按「文件不存在」处理。

### 4. 删除

`FileApi#delete` 要 `file:delete`，但服务层仍只允许删**自己上传**的文件（`assertCurrentUserOwnsFile`）。删除时先按 `file_path` / `thumb_file_path` 统计其它行是否引用同一物理文件，无人引用才真删盘，最后 `removeById` 并清 `fileCache`（`allEntries`）。

### 5. 绑定到答卷

提交答卷时 `AnswerScoringService#beforeSaveAnswer` 调 `FileService#validateAndBindAnswerFiles`：对 `Upload` / `Signature` 题，收集答案里的文件 id，默认上限 20 个（`maxFileCount` 可覆盖），要求全部存在、`storage_type=ANSWER_ATTACHMENT`、属于本项目本题（或历史未绑定但在上一版答案里出现过），且答案为本答卷或尚未绑定；随后写 `answer_id`。绑定后该文件不能被别的答卷复用。

### 6. 导入模板

`GET /api/file/downloadTemplate?name=…` 要 `file:import` 或 `template:import`（或 admin），实现就是把 `name + ".xlsx"` 当 classpath 资源 `template/<name>.xlsx` 返回。当前 React 端只用 `name=用户导入模板`（`client/src/pages/system/User.tsx` 的 `downloadTemplate`）。

## 修改指南

### 加文件类型

改 `FileUtils.ALLOWED_EXTENSIONS`（公开答题的兜底白名单）与 `FileServiceImpl.SAFE_INLINE_EXTENSIONS`（能否内联预览，两者不是一回事）。若只是某个题目要放开，配题目的 `fileAccept`，不要动全局白名单。

### 改配额 / 频率

改 `application.yml` 的 `file-storage.*`（`max-public-file-size-mb`、`max-public-uploads-per-minute`、`max-project-storage-mb`、`max-total-public-storage-mb`、`max-image-pixels`）。改大单文件上限时同步改 `spring.servlet.multipart.max-file-size` 与 `max-request-size`，否则会在进 Controller 之前就被容器拒掉。

### 换存储后端

实现 `StorageService`（参考 `LocalStorageService` 的 `resolvePath` 越界校验），在 `StorageAutoConfiguration` 里加一个 `@ConditionalOnProperty` 分支并让 `@ConditionalOnMissingBean` 生效。注意 `t_file.file_path` 存的是相对路径，换后端要做数据迁移，旧行不会自动搬家。

### 换命名/路径策略

改 `file-storage.local.nameStrategy` 与 `pathStrategy`（`LocalStorageNameStrategyEnum` / `LocalStoragePathStrategyEnum`）。只影响新文件；老文件仍按库里的 `file_path` 读，不要批量重写路径。

### 换导出附件命名

命名完全由后端决定，前端不参与：实现在 `AnswerExporter#parseAttachmentNameByExp`，变量来自 `AttachmentNameVariableEnum`（`projectId`、`serialNum`、`serialNumInAnswer`、`uploadDate`、`uploadDateTime`、`sourceName`、`questionTitle`）。新增变量时同步前端导出设置里的提示。

### 加导入模板

把 `xxx导入模板.xlsx` 放进 `server/api/src/main/resources/template/`，前端用 `download('/api/file/downloadTemplate', { name: 'xxx导入模板' }, 'xxx导入模板.xlsx')`。不要给 `name` 传用户可控的任意串。

## 权限与数据范围

| 接口 | 权限 | 数据范围 / 约束 |
|---|---|---|
| `POST /api/file/create` | `file:upload` 或 `file:import`（或 admin） | 登录即可传；`publicRead=true` 仅限图片 |
| `GET /api/file/list` | `file:list` | 默认只返回本人上传；传 `ids` 时按 id 查，`projectId`/`questionId` 只做二次收窄 |
| `GET /api/file` | `file:detail` | 本人或 `shared=1` |
| `POST /api/file/delete` | `file:delete` | 仅本人上传的文件；老师可删自己传的，删不了别人的 |
| `GET /api/file/downloadTemplate` | `file:import` 或 `template:import`（或 admin） | classpath 模板，无用户数据 |
| `POST /api/public/upload` | 无（匿名） | 题型白名单 + 项目状态 + 扩展名 + 大小 + 频率 + 配额 |
| `GET /api/public/preview/{id}` | 无（匿名） | 仅 `shared=1`；Response 缓存 30 天 |

角色口径：管理员、老师都有 `file:list` / `file:detail` / `file:import` / `file:delete` / `file:upload`；学员只有 `answer:upload`（后台补录附件）与公开答题接口，没有 `file:*`。

## 坑与已知限制

- `file:upload` 与 `file:import` 是**兼容性双入口**：`/create` 认两个，`/downloadTemplate` 认 `file:import`/`template:import`。只给 `file:upload` 的角色能传 Logo，但拿不到导入模板。
- `publicUpload` 字段是 `@JsonIgnore`，只能由 `SurveyApi` 在服务端置 true；直接调 `/api/file/create` 走的是「后台上传」分支，不会做项目状态与配额校验。
- 匿名能读的文件必须是 `shared=1`。后台传完 Logo 忘了传 `publicRead=true`，登录页就会裂图，而且没有任何报错。
- 删除权限是「`file:delete` + 本人上传」的合取，不是单纯的权限点；给老师 `file:delete` 不等于能删别人的附件。
- `FileServiceImpl#loadFile` 不做属主校验（导出 zip 内部用），不要把它包装成新接口，否则等于绕开 `loadUserFile`。
- `listFiles` 的 `projectId` / `questionId` 是取回后再 `removeIf`，不是 SQL 条件；数据量大时仍会把该用户全部文件查出来。
- 物理文件按「路径引用计数」删除，所以两个 `t_file` 行指向同一路径时删一行不会掉文件；反过来，手工改过 `file_path` 的历史数据会留下孤儿文件。
- `fileCache` TTL 1 小时（`custom-cache.entries.fileCache`），`FileMapper` 的 `@Cacheable` 只在按 id 取文件时命中；删除会 `allEntries` 清空。
- 改 `file-storage.local.root-path` 不会迁移旧文件；开发环境是相对路径 `./files`，取决于进程工作目录（仓库里那份 `server/files/` 就是它）。
- 上传错误文案统一是 `ErrorCode.FileUploadError`，前端 `humanizeApiError` 会把非中文/内部异常兜底成「服务器内部错误」，排查要看后端日志里的具体分支。
- `downloadTemplate` 的 `name` 直接拼进 classpath 路径，没有白名单；请只在前端写死常量，别把用户输入透传进来。
- 当前 React 端没有「附件列表」页面，也没有 `Upload` / `Signature` / `Barcode` 题的作答组件（`client/src/renderer/questions/` 里没有对应文件）；答题附件上传仍由公开接口与旧版页面承担，新页面要接就得补渲染组件。
- 导出附件 zip 的条目名会做 `sanitizeZipEntryName`（去 `..`、去控制字符、截断 200 字符），改命名逻辑时别把这一步去掉。

## 验证

```bash
# 前端类型检查（Setting/User 页的 FormData 与 download 调用）
cd client && npm run check

# 文档与生成物
npm run docs:gen -- --check
npm run docs:check
```

手工探针（登录后带 Cookie）：

```bash
# 1) 后台上传：应返回 t_file 的 id 与 originalName
curl -s -b cookie.txt -F "file=@logo.png" -F "publicRead=true" \
  https://<host>/api/file/create

# 2) 公开预览：shared=1 才是 200，否则 403
curl -s -o /dev/null -w '%{http_code}\n' https://<host>/api/public/preview/<fileId>

# 3) 下载导入模板：应得到 xlsx，不是 JSON
curl -s -b cookie.txt -o t.xlsx -w '%{http_code} %{content_type}\n' \
  "https://<host>/api/file/downloadTemplate?name=%E7%94%A8%E6%88%B7%E5%AF%BC%E5%85%A5%E6%A8%A1%E6%9D%BF"

# 4) 库里核对：一条记录、路径与缩略图都在
docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking -e "
  SELECT id, original_name, file_path, thumb_file_path, shared, storage_type
  FROM t_file WHERE id='<fileId>';"
```

预期：1) 返回 `id`；2) `shared=1` 时 200、否则 403；3) 200 且 `content_type` 为 Excel；4) 行存在且 `file_path` 落在 `file-storage.local.root-path` 之下。

## 相关文档

- [权限、角色与用户组](./permissions.md)
- [权限变更流程（新增权限点/改角色/缓存/迁移）](../flows/permission-change.md)
- [首页与统计](./dashboard.md)
- [权限设计基线（历史推导，部分已过期）](./permissions.md)
- [模块页模板](https://github.com/Hermannmayer/xuri-classroom/blob/main/docs/ai/module-template.md)
- [文档入口与维护规则](../start/docs-workflow.md)
