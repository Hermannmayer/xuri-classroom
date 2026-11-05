# 规则表达式引擎（逆向还原）

> 这是 SurveyKing 前端**唯一无法从后端拿到**的部分，也是重写的主要成本。
> 本文档基于构建产物逆向 + **实机执行验证**（`scripts/test-rules.mjs`，9/9 通过）。

## 一、为什么必须重写

后端 `SurveyServiceImpl` 对规则只做一件事：

```java
SchemaHelper.ignoreAttributes(schema, "finishRule", "visibleRule", "jumpRule");
```

规则字符串由前端**解析、求值、驱动界面**。后端只存不用。

涉及字段（`SurveySchema.Attribute`）：
`visibleRule` · `requiredRule` · `jumpRule` · `finishRule` · `replaceTextRule` · `validateRule` · `checkedRule` · `calculate` · `globalRule`

## 二、规则数据形状（用户配置层）

设计器里保存的是 JSON 字符串，结构：

```ts
interface RuleConfig {
  conditionLogic: 'AND' | 'OR';
  conditionItem: ConditionItem[];
}

interface ConditionItem {
  qId: string;        // 目标题目 id
  condition: 'CHECKED' | 'UNCHECKED' | 'ANSWERED' | 'NOT_ANSWERED'
           | 'SHOW' | 'HIDE' | '>' | '<' | '==';
  oId?: string[];     // 选项 id 数组（CHECKED/UNCHECKED 用）
  compare?: string;   // 比较值（> < == 用）
  type?: 'show';      // 全局规则里标记动作类型
}
```

## 三、编译结果（表达式语法）

`conditionItem` 被编译成一段表达式字符串（模块 `86343`，函数 `d`）：

| condition | 编译结果 |
|---|---|
| `CHECKED` | `AND(#{q.o1} , #{q.o2})` |
| `UNCHECKED` | `NOT(AND(#{q.o1} , #{q.o2}))` |
| `ANSWERED` | `AND(#{+q})` |
| `NOT_ANSWERED` | `NOT(#{+q})` |
| `SHOW` | `AND(#{-q})` |
| `HIDE` | `NOT(#{-q})` |
| `>` / `<` / `==` | `#{q} > 5` |
| 多条 | `conditionLogic==='AND' ? 'AND(item , item)' : 'OR(item , item)'` |

### 引用语法完整表（`#{...}` 内部）

| 写法 | 含义 | 求值方式 |
|---|---|---|
| `#{qId}` | 题目取值 | 单选返回第一个值；多选返回数组 |
| `#{qId.oId}` | 某选项是否被选中 | 布尔 |
| `#{qId.oId.subId}` | 矩阵题的 行.列 | 布尔/值 |
| `#{_qId}` | 题目**文本** | 字符串（文本替换用） |
| `#{$qId}` | 题目**得分** | 数字（计分用） |
| `#{qId\|默认值}` | 带默认值 | `\|` 后缀 |
| `#{+qId}` | 是否**已作答** | 布尔 |
| `#{-qId}` | 是否**已显示** | 由调用方判断 `display === 'visible'` |

### 函数

`AND(...)` · `OR(...)` · `NOT(...)` —— 参数用 ` ,`（空格+逗号）分隔。

## 四、求值语义（实测确认）

引擎核心三个函数（模块 `83676`）：

| 导出 | 作用 |
|---|---|
| `Op(expr)` | 解析单个引用 → `['q1','o1','s1']` |
| `d0({optionTypes, qValue, expression})` | 对单个引用求值 |
| `vW(expr, callback)` | 解析整条表达式，叶子交给 callback 取值，返回 `{success, result}` |
| `Xn(schema)` | 把整棵 schema 拍平成题目列表 |

### 关键语义（容易写错的地方）

1. **布尔型选项判断的是「键是否存在」，不是值真假**

   ```js
   d0({ optionTypes: { o1: 'boolean' }, qValue: { o1: false }, expression: '#{q1.o1}' })
   // → true   ← 因为 key 存在
   ```

   原因：多选/勾选的答案是「只记录被选中的选项」的 map，不存在 `false` 值。
   正确写法是看 key 在不在：`{o1:true}` → `true`，`{}` → `false`。

2. **`#{qId}` 取的是 map 的第一个值**

   ```js
   d0({ qValue: { o1: 'A' }, expression: '#{q1}' }) // → 'A'
   ```

3. **矩阵题按列聚合**

   源码对 `Matrix*` 类型做了特殊处理：`Object.values(r).map(row => row[optionId])`，
   即把每一行在该列的取值收集成数组；`MatrixAuto` 走另一条分支。

4. **`vW` 返回 `{success, result}`**，解析失败时 `success=false`。
   设计器据此决定是否写入 `rule_visible_<qId>` 标记，进而控制字段显隐。

## 五、运行时接线方式

`86343` 里每个题目的 `reactions` 大致是：

```js
// 伪代码，据产物还原
if (schema.attribute.visibleRule) {
  const expr = buildExpression(JSON.parse(attribute.visibleRule), flatten(schema));
  const { success, result } = vW(expr, (leaf) => {
    if (leaf.startsWith('+')) return !!query(leaf.slice(1)).get('value');
    if (leaf.startsWith('-')) return query(leaf.slice(1)).get('display') === 'visible';
    return d0({ optionTypes, qValue: query(leaf).get('value'), expression: leaf });
  });
  if (success) toggleFlag(`rule_visible_${schema.id}`, result);
}
```

即：**规则不是直接控制显隐，而是写入一个标记位，由渲染层读标记位。**

## 六、验证证据

`scripts/test-rules.mjs` 在 Node + jsdom 里直接加载逆向出的模块 `83676` 并断言：

```
✓ Op 解析 #{q1.o1}
✓ Op 解析 #{q1.o1.s1}
✓ 选项被选中 → true
✓ 选项不在答案里 → false
✓ 单选题取值 #{q1} → 首个值
✓ AND(真,真) → true
✓ AND(真,假) → false
✓ OR(假,真) → true
✓ NOT(真) → false

通过 9/9
```

复现：

```bash
node scripts/test-rules.mjs
```

## 七、重写建议

这套语言很小（一个引用语法 + 三个函数 + 关系运算），**重写成本远低于读它的成本**。建议：

- 直接实现一个 ~200 行的求值器，语法照抄上表
- 保留 `visibleRule` 等字段名和 JSON 结构 → 存量问卷可无缝迁移
- 不要试图还原原实现里的 Formily `reactions` 机制，那是框架耦合，换成自己的响应式即可
- 唯一必须逐条对齐的是**布尔选项的「键存在」语义**（上面第 1 条），这是最容易踩的坑
