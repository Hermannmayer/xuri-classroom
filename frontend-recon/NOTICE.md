# 来源与使用须知

## 这份东西是什么

`frontend-recon/` 是对 **SurveyKing 前端**的逆向工程记录与产物。

SurveyKing 上游（`github.com/javahuang/SurveyKing`，MIT）**只开源了后端**：
仓库里的 `client/` 目录只有一个内容为 `todo` 的 README，线上发布的是
UmiJS 3.5.41 编译出来的构建产物，放在 `server/api/src/main/resources/static/`。

所以这里的内容全部来自**对构建产物的逆向**，而不是任何泄露的源代码。

## 各目录的来源

| 目录 | 来源 | 性质 |
|---|---|---|
| `web/` | 从本地部署实例（`192.168.0.2:201`）抓取 | **原作者的构建产物**，非开源代码，非本人创作 |
| `modules3/` | 由 `web/umi.*.js` 解包而来 | 上述产物的派生 |
| `extract/` | 由本人脚本从 `web/` 提取 | 数据（端点、路由、文案） |
| `spec/` | 本人撰写 | 文档 |
| `recovered/rules/build-expression.js` | 本人重写 | 对原逻辑的等价实现 |
| `recovered/rules/engine.mjs` | 本人编写，运行时加载 `modules3/` | 封装 |
| `recovered/api/client.js` | 由本人脚本按逆向结果生成 | 代码生成 |
| `recovered/_reference/*.cjs` | 从产物中拆出的原始模块 | **原作者代码** |
| `recovered/i18n/zh-CN.json` | 从产物中提取 | 文案抄录 |
| `scripts/` | 本人编写 | 工具 |

## 使用范围

当前仅用于**本地研究**与**互操作**（为自己部署的系统重写前端）。

## 如果要公开这个仓库

上游是 MIT，但 MIT 覆盖的是"仓库里存在的代码"——前端产物不在其中，
也没有单独的许可声明。**公开托管 `web/` 与 `recovered/_reference/` 存在争议风险。**

若要推送，建议先剔除这两块（本地文件保留，只从 Git 历史中移除）：

```bash
# 从索引移除，保留磁盘文件
git rm -r --cached frontend-recon/web frontend-recon/recovered/_reference
printf 'frontend-recon/web/\nfrontend-recon/recovered/_reference/\n' >> .gitignore
git commit -m "chore: 从版本控制中移除上游构建产物"

# 如果这些内容已经进了历史，还需要重写历史（谨慎，先备份）
# git filter-repo --path frontend-recon/web --path frontend-recon/recovered/_reference --invert-paths
```

剔除后 `npm run serve` / `npm test` 会失效，需先重新抓取：

```bash
cd frontend-recon
npm run fetch   # 从你自己的实例重新下载产物
npm run unpack  # 重新解包
```

## 免责

本项目不包含、也不再分发 SurveyKing 的源代码。所有逆向产物仅作为
接口契约与行为参考，用于自行实现新前端。若原作者有异议，删除即可。
