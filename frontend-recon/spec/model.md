# SurveyKing 数据模型与问卷 DSL

> 依据：后端 Java 源码（权威、全部开源）+ 前端产物佐证。
> 关键文件：
> - 问卷 DSL：`server/shared/src/main/java/cn/surveyking/server/domain/dto/SurveySchema.java`
> - 项目设置：`server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectSetting.java`
> - 实体：`server/rdbms/src/main/java/cn/surveyking/server/domain/model/{Project,Answer,Repo,Template}.java`

## 一、核心结论：没有独立的「问卷」实体

**问卷 = 考试 = `Project`**，用 `mode` 区分：

```java
public class Project extends BaseModel {
    private String name;
    private String parentId;        // 0 = 无父级（支持文件夹树）
    private ProjectModeEnum mode;   // survey | exam
    @TableField(typeHandler = JacksonTypeHandler.class)
    private SurveySchema survey;    // ← 整棵问卷树存这一个 JSON 字段
    private ProjectSetting setting; // ← 发布/答题/考试设置
    private Integer status;         // 1 已发布 / 0 未发布
    private Long priority;
}
```

所以**整个问卷结构是 `t_project.survey` 里的一个 JSON**，随项目一起存取，没有独立的题目表。
这一点决定了前端重建的形态：设计器编辑的是一棵**内存里的树**，整棵树序列化后一次性提交。

```sql
t_project (
  id, name, parent_id, mode, survey(LONGTEXT JSON), setting(LONGTEXT JSON),
  status, priority, create_at, update_at
)
```

## 二、问卷 DSL（`SurveySchema`）

### 2.1 节点结构

```ts
interface SurveySchema {
  id: string;
  title: string;
  description?: string;
  type: QuestionType;          // 见 2.2
  attribute: Attribute;        // 70+ 个属性，见 2.3
  dataSource?: DataSource[];   // 选项（可递归，支持级联）
  children?: SurveySchema[];   // 子题（题组 / 矩阵行 / 分页内容）
  row?: Row[];                 // 矩阵的行
  linkSurveys?: LinkSurvey[];  // 跨问卷关联（预填/回写）
  tags?: string[];
}
```

### 2.2 题型枚举（32 种，全集）

出处：`SurveySchema.QuestionType`

| 分类 | 题型 |
|---|---|
| **数据类**（`dataType()`，会存答案） | `FillBlank` `Textarea` `MultipleBlank` `Signature` `Score` `Radio` `Checkbox` `Select` `Cascader` `Upload` `MatrixAuto` `MatrixRadio` `MatrixCheckbox` `MatrixFillBlank` `MatrixScore` `MatrixNps` `User` `Dept` `Nps` `HorzBlank` `Address` `Barcode` `RichText` `Judge` |
| **空结构类**（`voidType()`，不存答案） | `Survey` `QuestionSet` `Pagination` `Remark` `SplitLine` `Option` `RandomSurvey` |
| **可自动计分**（`examType()`） | `FillBlank` `Textarea` `MultipleBlank` `Radio` `Checkbox` `Select` `HorzBlank` |

> 注意 `Option` 也在枚举里但它同时是选项结构，历史遗留。

### 2.3 `Attribute` 属性全集（重写时的工作量所在）

按用途分组：

**展示**
`display`(none/visible/hidden) · `hidden` · `width` · `readOnly` · `required` · `defaultChecked` · `rows` · `columns` · `suffix` · `placeholder` · `content`（填空题干）· `backgroundImage` · `headerImage` · `cornerText`（矩阵左上角）· `scoreStyle` · `autoSize` · `dateTimeFormat`

**数据类型与校验**
`dataType`（`text,number,date,dateTime,time,email,mobile,idCard,select,selectDict,chinese,alphabet,horzBlank,password`）· `scope`（硬校验）· `scopeDesc` · `softScope`（软校验，超限可提交）· `softScopeDesc` · `textLimit`（如 `[1,2]`）· `answerLimit` · `regexp: ExpressionMessage[]`（`{id, expression, message}`）· `unique` / `uniqueText`

**规则（全部是字符串表达式）**
`visibleRule`（显隐）· `requiredRule`（动态必填）· `jumpRule`（跳转）· `finishRule`（结束）· `replaceTextRule`（文本替换）· `validateRule`（校验）· `checkedRule`（选项自动勾选）· `calculate`（计算）· `globalRule: string[]`

**选项行为**
`rejectOtherOption`（`rejectAll` 排他 / `rejectOther` 互斥）· `quota`（配额）· `statEnabled`（显示投票结果）· `dictCode`（下拉字典）· `cascaderLevel`（级联层级）

**题型专有**
`npsStart` / `npsEnd` / `npsStartNum` / `npsTotalNum` / `npsInvertSort` · `fileAccept` / `maxFileCount` / `maxFileSize` / `cameraOnly` · `mapMove`（地图题）· `fieldInTitle`（标题里的 `___` 当填空）· `exclusiveFillBlankInMatrix` · `totalPage` / `currentPage` / `submitButton`（分页）· `randomSurvey: RandomSurveyCondition[]`

**考试**
`examScore` · `examAnswerMode`（`onlyOne` / `selectAll` / `selectCorrect` / `select` / `manual` / `none`）· `examMatchRule`（`completeSame` / `contain`）· `examCorrectAnswer` · `examAnalysis`

### 2.4 选项结构

```java
class DataSource { String label; String value; List<DataSource> children; }  // children 支持级联
```

### 2.5 跨问卷关联

```java
class LinkSurvey {
  Boolean enableUpdate; String linkSurveyId; String linkQuestionId; String linkOptionId;
  LinkType linkType;            // eq | like
  List<LinkField> linkFields;   // {linkQuestionId, linkOptionId, fillQuestionId, fillOptionId}
}
```

## 三、⚠️ 规则表达式引擎在**前端**

这是重写最大的隐藏成本。

后端 `SurveyServiceImpl` 里对规则字段只做一件事：

```java
SchemaHelper.ignoreAttributes(schema, "finishRule", "visibleRule", "jumpRule");
```

**没有解析器、没有求值**。也就是说 `visibleRule` / `jumpRule` / `calculate` 这些字符串表达式，
**由前端自己解析并求值**，后端只负责存储。

前端侧的实现痕迹（`pretty/umi.ded23be0.js` L51740-51810）：
- 依赖 **Formily** 的 `reactions` 机制做联动（`__FORMILY_DEV_TOOLS_HOOK__` 可证）
- 形如 `evaluate(ruleString, (expr) => { const [questionId] = parseRef(expr); return compute({optionTypes, qValue, expression: expr}); })`
- 求值成功→写入 `e.data` 的 `rule_visible_<questionId>` 标记，驱动字段显隐

**含义**：重写前端必须**重新实现这套表达式语言**（词法、变量引用、运算、与题型相关的比较语义）。
这是从闭源产物里最值得继续深挖的部分。

## 四、发布与答题设置（`ProjectSetting`）

```java
class ProjectSetting {
  Integer status;              // 0 停 / 1 开
  ProjectModeEnum mode;
  AnswerSetting answerSetting; // 答题行为
  SubmittedSetting submittedSetting; // 提交后
  ExamSetting examSetting;     // 考试
}
```

**AnswerSetting（答题行为）**
`password` · `progressBar` · `loginRequired` · `questionNumber` · `autoSave` · `initialValues` ·
`maxAnswers` · `endTime` · `wechatOnly` · `wechatUserInfo` ·
`ipLimit` / `cookieLimit` / `loginLimit` / `whitelistLimit`（均为 `{limitNum, limitFreq}`）·
`onePageOneQuestion` · `answerSheetVisible` · `whitelistType` ·
`triggerType`（`onInput` / `onBlur` / `onSubmit`）· `copyEnabled` · `defaultLocale`

**SubmittedSetting（提交后）**
`contentHtml` · `enableUpdate` · `redirectUrl` · `publicQuery: PublicQuery[]` ·
`answerAnalysis` · `transcriptVisible` · `rankVisible`

**ExamSetting（考试）**
`startTime` · `endTime` · `minSubmitMinutes` · `maxSubmitMinutes` · `rankingEnabled` ·
`exerciseMode`（边做边看答案）· `passMode` + `passModePerSeconds`（闯关）·
`randomOrder` · `randomSurvey: RandomSurveyCondition[]`（按题库/标签/题型抽题）·
`randomSurveyWrong`（错题练习）· `maxSwitchScreenTimes`（切屏限制）

## 五、答卷（`Answer`）

```java
class Answer extends BaseModel {
    String id;                  // UUID
    String projectId;
    String repoId;              // 练习场景
    LinkedHashMap tempAnswer;   // 暂存答案
    LinkedHashMap answer;       // 最终答案  ← questionId -> 值
    SurveySchema survey;        // 答卷时的问卷快照（防止问卷改动影响历史答卷）
    AnswerMetaInfo metaInfo;    // 来源/设备/IP/耗时等
    Double examScore;
    AnswerExamInfo examInfo;    // 逐题得分、对错
    Integer tempSave;           // 0 暂存 / 1 已完成
    ExamExerciseTypeEnum examExerciseType;
    String createBy;
}
```

**关键设计**：
- `answer` 是 `questionId → 答案值` 的扁平 Map，不是按题目顺序的数组
- `survey` 存**答卷时的问卷快照**——重写前端时不要依赖「线上问卷结构」去渲染历史答卷
- 判分结果落在 `examScore` + `examInfo`，由后端 `AnswerScoreEvaluator` 计算

## 六、对重写的结论

| 维度 | 判断 |
|---|---|
| 数据结构 | **完全可复用**。JSON 存整棵树，前端只需读写同一个结构 |
| 后端配合 | **零改动**。新增前端只要命中同样的 `/api/*` 契约 |
| 题型渲染 | 32 种，其中 24 种要真渲染，8 种是结构节点 |
| 最大难点 | **规则表达式引擎**（前端闭源、需重写）+ 矩阵/级联/上传等复杂题型的交互 |
| 次要难点 | 报告图表、公开查询页、移动端适配、微信授权 |

数据模型这一层不需要逆向推测——后端源码就是规范。真正需要从产物继续挖的是**表达式语法**与**交互细节**。
