# 逆向产物：可复用源码

这里是从 SurveyKing 闭源前端构建产物里回收出来的、**能直接跑**的代码。

## 目录

```
recovered/
├── rules/
│   ├── build-expression.js   规则配置 → 表达式字符串（无依赖，可直接移植）
│   ├── engine.mjs            表达式求值器（加载原版模块，行为逐条对齐）
│   └── _reference/           原版模块，未改写，仅供对照
│       ├── formula-engine.cjs   模块 83676：Op / d0 / vW / Xn
│       ├── rule-builder.cjs     模块 86343：规则编辑 + 联动
│       └── api-client.cjs       模块 81715：原版 API 服务类
├── api/
│   ├── client.js             API 客户端（138 个方法，零依赖，fetch 实现）
│   └── smoke.mjs             联机冒烟测试
├── i18n/
│   └── zh-CN.json            1493 条 UI 文案
└── README.md
```

## 能跑的证据

```bash
npm test          # 离线：规则引擎 9 项 + 编译器 4 项 + 求值器 6 项，全绿
npm run test:net  # 联机：401 处理 / 200 解包 / 业务错误透出，4/4
```

## 怎么用

### 1. 只要规则引擎（推荐，零依赖）

```js
import { buildExpression } from './rules/build-expression.js';

const expr = buildExpression({
  conditionLogic: 'AND',
  conditionItem: [{ qId: 'q1', condition: 'CHECKED', oId: ['o1', 'o2'] }],
});
// → 'AND(AND(#{q1.o1} ,#{q1.o2}))'
```

求值器需要原版模块（`npm run unpack` 生成 `modules3/` 之后）：

```js
import { createRuleEngine } from './rules/engine.mjs';

const engine = createRuleEngine();
const { success, result } = engine.evalExpression(expr, (leaf) => {
  const [qId, oId] = engine.parseRef(leaf);
  const answer = answers[qId];
  return oId ? !!(answer && answer[oId]) : answer;
});
```

### 2. API 客户端（直接可用）

```js
import { SurveyKingClient } from './api/client.js';

const api = new SurveyKingClient({
  baseURL: 'http://192.168.0.2:201',   // 同源部署可留空
  onUnauthorized: () => location.replace('/user/login'),
  onBizError: (msg) => console.error(msg),
});

const sys = await api.get('/api/system');
const page = await api.getWithPagination('/api/project/list', { current: 1, pageSize: 10 });
const { blob, fileName } = await api.download('/api/project/partner/download', { projectId: 'x' });
```

138 个方法按模块分组（ai / answer / exercise / file / oauth / project / public / repo / report / system / template / user / workflow）。

已验证：401 解包、200 `data` 解包、业务错误 `message` 透出、分页封装、Cookie 会话。

### 3. 只读原版实现

`_reference/api-client.cjs` 是从产物里拆出的原始服务类。
不建议直接复用（依赖 axios + UmiJS request），但对照实现细节很方便。

## 为什么只回收了这三块

前端共 1085 个 webpack 模块，其中约 75 个是 SurveyKing 自己的代码，其余是 antd / Formily / rc-* / lodash 等第三方。

| 模块 | 判定 | 处理 |
|---|---|---|
| 83676 规则求值器 | 自有、且**后端没有** | 完整回收 + 加壳 |
| 86343 规则编译/联动 | 自有、且**后端没有** | 提取纯函数 + 保留原版 |
| 81715 API 客户端 | 自有，但可从后端推导 | 保留参考 |
| 82092/99594 设计器 | 自有，935 KB / 21 556 行 | 未回收——体量太大且 React 耦合深，建议重写 |
| 其余 | 第三方 | 丢弃 |

## 现有的局限

- 求值器加载需要浏览器垫片（`scripts/dom-shim.mjs`），因为原模块在初始化时会碰 DOM
- `rule-builder.cjs` 依赖 React/Formily，**不能**脱离框架跑；能复用的是其中 `buildExpression` 那段纯逻辑（已提取）
- 表达式编译器对空条件列表会产出 `AND()`，与原实现一致，未做额外防空——保持行为一致优先
