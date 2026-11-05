import { useMemo, useState } from 'react';
import { Card } from 'antd';
import SchemaRenderer from '../renderer/SchemaRenderer';
import type { AnswerValue } from '../renderer/types';
import { evaluateVisible } from '../schema/rules/engine';
import type { SurveySchema } from '../schema/types';

/**
 * P1 验收页：不连后端，用一份内置 schema 验证题型注册、三态渲染与规则显隐。
 * 访问 /playground。
 */
const demo: SurveySchema = {
  id: 'root',
  title: '示例问卷',
  type: 'Survey',
  attribute: {},
  children: [
    {
      id: 'q1',
      title: '你的身份',
      type: 'Radio',
      attribute: { required: true },
      dataSource: [
        { label: '学生', value: 'o1' },
        { label: '教师', value: 'o2' },
      ],
    },
    {
      id: 'q2',
      title: '感兴趣的方向（可多选）',
      type: 'Checkbox',
      attribute: {},
      dataSource: [
        { label: '前端', value: 'o1' },
        { label: '后端', value: 'o2' },
        { label: '数据', value: 'o3' },
      ],
    },
    {
      id: 'q3',
      title: '所在年级',
      type: 'Select',
      attribute: {},
      dataSource: [
        { label: '一年级', value: 'o1' },
        { label: '二年级', value: 'o2' },
      ],
    },
    { id: 'q4', title: '姓名', type: 'FillBlank', attribute: { required: true, placeholder: '请输入真实姓名' } },
    { id: 'q5', title: '意见建议', type: 'Textarea', attribute: { rows: 3, placeholder: '随便写点什么' } },
    { id: 'q6', title: '课程满意度', type: 'Score', attribute: { scope: '[0,5]' } },
    {
      id: 'q7',
      title: '任教科目（选了「教师」才出现）',
      type: 'FillBlank',
      attribute: {
        placeholder: '例如：数学',
        visibleRule: JSON.stringify({
          conditionLogic: 'AND',
          conditionItem: [{ qId: 'q1', condition: 'CHECKED', oId: ['o2'] }],
        }),
      },
    },
    { id: 's1', title: '—', type: 'SplitLine', attribute: {} },
    { id: 'r1', title: '', type: 'Remark', attribute: { content: '以上为 P1 全部渲染能力演示。' } },
    {
      id: 'q8',
      title: '未注册题型会降级成占位框',
      type: 'Cascader',
      attribute: {},
      dataSource: [{ label: '省', value: 'p' }],
    },
  ],
};

export default function Playground() {
  const [values, setValues] = useState<Record<string, AnswerValue>>({});

  // 规则显隐：把每题的 visibleRule 求值成 displays
  const displays = useMemo(() => {
    const rules: Record<string, string | undefined> = {};
    for (const q of demo.children ?? []) {
      if (q.attribute?.visibleRule) rules[q.id] = q.attribute.visibleRule;
    }
    const result = evaluateVisible(rules, { values });
    return result;
  }, [values]);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <Card
        className="bp-corners"
        style={{ flex: 1, border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}
        title={<span className="bp-title" style={{ fontSize: 12 }}>RENDER / 渲染验收</span>}
      >
        <SchemaRenderer schema={demo} values={values} onChange={(qId, v) => setValues((p) => ({ ...p, [qId]: v }))} mode="answer" displays={displays} />
      </Card>

      <Card
        style={{ width: 340, border: '1px dashed var(--bp-line)', background: 'rgba(21,42,68,0.6)' }}
        title={<span className="bp-title" style={{ fontSize: 12 }}>VALUES / 当前答案</span>}
      >
        <pre style={{ fontSize: 11, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', color: 'var(--bp-text-soft)' }}>
          {JSON.stringify({ values, displays }, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
