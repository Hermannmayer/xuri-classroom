# SurveyKing 闭源前端逆向工程

把 SurveyKing 只分发构建产物、不公开源码的前端，拆解成**可运行、可读、可复用**的工程。

## 快速开始

```bash
npm install          # 只装逆向工具链（webcrack / prettier / jsdom）

npm run serve        # 起本地基线：http://127.0.0.1:4173 → 代理到真实后端
npm test             # 离线自检：规则引擎 + 编译器 + 求值器
npm run test:net     # 联机自检：用生成的 API 客户端真打后端
```

`npm run serve` 需要后端可访问，默认 `http://192.168.0.2:201`，可改：
```bash
node scripts/serve.mjs web http://你的后端:端口 4173
```

## 目录

| 路径 | 内容 | 入库 |
|---|---|---|
| `web/` | 从实例抓下来的原始产物（165 文件 / 14 MB） | ✅ 原始素材，丢了不可复现 |
| `modules3/` | 解包结果包上 webpack 工厂外壳，可直接 `require`（1086 个） | ✅ 让 `npm test` 免联网即可跑 |
| `extract/` | 机械抽取的中间数据（端点、i18n、路由、页面清单） | ✅ |
| `spec/` | **人类可读的规格文档**（架构/API/页面/模型/规则引擎/可行性） | ✅ |
| `recovered/` | **可移植的源码级产物**（规则引擎、API 客户端、i18n） | ✅ |
| `scripts/` | 全部工具链脚本 | ✅ |
| `dec_umi_nojsx/` | webcrack 解包结果（1085 个模块） | ❌ 由 `npm run unpack` 重建 |
| `pretty/` | prettier 美化后的产物 | ❌ 可由 `web/` 重新美化 |
| `modules/` `modules2/` | 早期按 chunk 拆的版本 | ❌ 已被 `modules3/` 取代 |
| `dec_umi/` `dec_test/` `analysis/` `digest/` | 试验产物 | ❌ |
| `node_modules/` | 依赖 | ❌ |

**入库与不入库的界线**：原始素材 + 结论 + 可复用代码入库；一切能从 `web/` 重新算出来的中间产物不入库。

`web/` 的归属与公开风险见 [NOTICE.md](./NOTICE.md)。

## 流水线

```
1. 抓产物    scripts/fetch-assets.mjs      从 umi.js 运行时解出 chunk→hash，全量下载
2. 美化      prettier                      压缩产物 → 可读结构
3. 解包      webcrack --no-jsx             1085 个独立模块，变量名还原、JSX 还原成 createElement
4. 包装      scripts/wrap-webcrack.mjs     模块 → 可 require 的 .cjs
5. 运行时    scripts/webpack-runtime.mjs   自己实现 webpack require（d/r/n/t/e/nmd/bind）
6. 环境      scripts/dom-shim.mjs          jsdom 垫片，让浏览器代码能在 Node 里跑
7. 验证      scripts/test-rules.mjs        直接调用原版模块，断言行为
```

## 核心发现

1. **前端不开源**：仓库 `client/` 只有 `todo`，发布的是 UmiJS 3.5.41 构建产物
2. **技术栈**：React 17.0.2 + AntD 4 + **Formily**（表单引擎）+ dva + axios
3. **鉴权**：Cookie 会话 + `X-XSRF-TOKEN` 双提交 CSRF，响应包装 `{code,message,data}`
4. **规则引擎在前端**：后端对 `visibleRule`/`jumpRule` 只存储不求值，全靠前端解析
5. **问卷 = 考试**：都是 `Project`，用 `mode` 区分，整棵树存成一个 JSON 字段

详见 `spec/`。

## 已验证

| 验证项 | 命令 | 结果 |
|---|---|---|
| 基线可运行 | `npm run serve` | 登录成功，进 `/home` |
| 规则求值器 | `npm run test` | 9/9 |
| 表达式编译器 | `npm run test` | 4/4 |
| 求值器封装 | `npm run test` | 6/6 |
| API 客户端联机 | `npm run test:net` | 4/4 |

## 从零重建

入库的只有原始素材和结论。下面这些目录**不在版本控制里**，需要时按顺序生成：

```bash
npm install                    # 装 webcrack / prettier / jsdom
npm run fetch                  # 1. 从实例重新抓产物 → web/
npm run unpack                 # 2. webcrack 解包 + 包装 → dec_umi_nojsx/, modules3/
npx prettier --write pretty/*  # 3. 美化（先把 web/*.js 拷进 pretty/）
npm run test                   # 4. 验证
```

`npm run fetch` 默认抓 `http://192.168.0.2:201`，换地址：
```bash
node scripts/fetch-assets.mjs http://你的地址:端口 ./web
```

## 局限

- 设计器（`p__repo__Template`，935 KB / 21 556 行）**未回收**为可编译源码；React/Formily 耦合深，建议照着 `spec/model.md` 重写
- 原产物无 sourcemap，变量名是还原的推断值，不是原始命名
- `dec_umi_nojsx/` 里少数模块仍带 ESM 语法，直接跑需 `.mjs` 或转译
- **新前端本体尚未开工**：这里只有规格 + 可复用模块，没有 `web-next/` 之类的应用工程
