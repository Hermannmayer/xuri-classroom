import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, message, Segmented, Spin, Tag } from 'antd';
import { ArrowLeftOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getWithPagination, post } from '../../api';
import ZoomControl from '../../components/ZoomControl';
import type { AnswerValue } from '../../renderer/types';
import SchemaRenderer from '../../renderer/SchemaRenderer';
import { isEmptyAnswer } from '../../schema/empty';
import { flattenSchema } from '../../schema/flatten';
import type { SurveySchema } from '../../schema/types';

/** 与 TemplateView 对齐 */
interface TemplateView {
  id: string;
  name?: string;
  questionType?: string;
  template?: SurveySchema;
}

const FONT_KEY = 'sk-font-scale';
const PRACTICE_TYPES = ['Radio', 'Checkbox', 'Judge', 'FillBlank', 'Textarea'] as const;
type Layout = 'single' | 'scroll';

interface PracticeProgress {
  repoId: string;
  repoName: string;
  root: SurveySchema;
  values: Record<string, AnswerValue>;
  index: number;
  layout: Layout;
  updatedAt: number;
}

const practiceKey = (repoId: string) => `practice:${repoId}`;

function parseCounts(value: string | null): { type: string; count: number }[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => {
      const [type, count] = part.split(':');
      return { type: String(type || '').trim(), count: Number(count) };
    })
    .filter(
      (item) =>
        (PRACTICE_TYPES as readonly string[]).includes(item.type) &&
        Number.isFinite(item.count) &&
        item.count > 0,
    );
}

export default function Practice() {
  const { repoId = '' } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const repoName =
    (location.state as { repoName?: string } | null)?.repoName || '题库练习';
  const mode = search.get('mode') || 'full';

  const [root, setRoot] = useState<SurveySchema>();
  const [values, setValues] = useState<Record<string, AnswerValue>>({});
  const [index, setIndex] = useState(0);
  const [layout, setLayout] = useState<Layout>('single');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem(FONT_KEY)) || 1);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let alive = true;
    const key = practiceKey(repoId);
    setInitialized(false);
    setLoading(true);
    setError(undefined);

    const load = async () => {
      try {
        if (!repoId) throw new Error('缺少题库 id');
        if (mode === 'resume') {
          const raw = localStorage.getItem(key);
          if (!raw) throw new Error('没有找到上次练习进度');
          const saved = JSON.parse(raw) as PracticeProgress;
          if (!saved.root?.children?.length) throw new Error('上次练习进度已损坏');
          if (!alive) return;
          setRoot(saved.root);
          setValues(saved.values ?? {});
          setIndex(Math.min(saved.index ?? 0, saved.root.children.length - 1));
          setLayout(saved.layout === 'scroll' ? 'scroll' : 'single');
          return;
        }

        let questions: SurveySchema[] = [];
        if (mode === 'random') {
          const counts = parseCounts(search.get('counts'));
          if (!counts.length) throw new Error('随机练习没有选择题型数量');
          const picked = await post<SurveySchema[]>(
            '/api/repo/pick',
            counts.map((item) => ({
              repoId,
              types: [item.type],
              questionsNum: item.count,
              examScore: 0,
            })),
          );
          questions = picked ?? [];
        } else {
          const res = await getWithPagination<TemplateView>('/api/template/list', {
            repoId,
            current: 1,
            pageSize: -1,
          });
          questions = (res.data ?? [])
            .map(
              (row) =>
                row.template ?? {
                  id: row.id,
                  title: row.name ?? '',
                  type: (row.questionType ?? 'Radio') as SurveySchema['type'],
                  attribute: {},
                  children: [],
                },
            )
            .filter(Boolean);
        }

        if (!questions.length) throw new Error('这个题库还没有可练习的题目');
        const nextRoot: SurveySchema = {
          id: `practice-${repoId}`,
          title: repoName,
          type: 'Survey',
          attribute: {},
          children: questions,
        };
        if (!alive) return;
        setRoot(nextRoot);
        setValues({});
        setIndex(0);
        setLayout('single');
      } catch (e) {
        if (alive) setError((e as Error).message || '加载练习失败');
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [repoId, mode, repoName, search]);

  const flat = useMemo(() => (root ? flattenSchema(root) : []), [root]);
  const answeredCount = useMemo(
    () => Object.values(values).filter((value) => !isEmptyAnswer(value, true)).length,
    [values],
  );

  // 每次答题/切题都把题目快照和进度写回 localStorage；刷新后「继续练习」可恢复
  useEffect(() => {
    if (!initialized || !root) return;
    const progress: PracticeProgress = {
      repoId,
      repoName,
      root,
      values,
      index,
      layout,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(practiceKey(repoId), JSON.stringify(progress));
    } catch {
      // localStorage 满/被禁用时不影响继续答题
    }
  }, [initialized, root, values, index, layout, repoId, repoName]);

  useEffect(() => {
    if (root) setInitialized(true);
  }, [root]);

  const setFont = (value: number) => {
    setFontScale(value);
    localStorage.setItem(FONT_KEY, String(value));
  };

  const submit = async () => {
    if (!root) return;
    setSubmitting(true);
    try {
      // 后端练习答案存在特殊项目 id "exercise" 下；AnswerRequest 没有 examExerciseType 字段，
      // 因此不会出现在 /api/exercise/list 的练习记录里（见汇报）。
      await post('/api/public/saveAnswer', {
        projectId: 'exercise',
        survey: root,
        answer: values,
        tempSave: 1,
      });
      localStorage.removeItem(practiceKey(repoId));
      message.success(`练习已完成，共 ${flat.length} 道题`);
      navigate('/repo/index');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => navigate('/repo/index');

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (error || !root || !flat.length) {
    return (
      <div className="bp-card" style={{ padding: 30 }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={error || '这个题库还没有可练习的题目'}
        >
          <Button onClick={goBack}>返回题库</Button>
        </Empty>
      </div>
    );
  }

  const pageSchema: SurveySchema | undefined = flat[index]
    ? { ...root, children: [flat[index].schema] }
    : undefined;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div
        className="bp-card"
        style={{
          padding: 14,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack} />
        <div style={{ minWidth: 0, flex: '1 1 220px' }}>
          <div className="bp-title" style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {repoName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 3 }}>
            <Tag color={mode === 'random' ? 'orange' : 'blue'}>
              {mode === 'random' ? '随机练习' : mode === 'resume' ? '继续练习' : '顺序练习'}
            </Tag>
            {layout === 'single' ? `第 ${index + 1} / ${flat.length} 题` : `已答 ${answeredCount} / ${flat.length} 题`}
          </div>
        </div>
        <Segmented
          value={layout}
          onChange={(value) => setLayout(value as Layout)}
          options={[
            { label: '一页一题', value: 'single' },
            { label: '瀑布流', value: 'scroll' },
          ]}
        />
        <ZoomControl value={fontScale} onChange={setFont} hideLabel />
      </div>

      <div
        className="bp-card"
        style={{ padding: 18, minHeight: 260, zoom: fontScale }}
      >
        {layout === 'single' && pageSchema ? (
          <SchemaRenderer
            schema={pageSchema}
            values={values}
            onChange={(qId, value) => setValues((prev) => ({ ...prev, [qId]: value }))}
            mode="answer"
          />
        ) : (
          <SchemaRenderer
            schema={root}
            values={values}
            onChange={(qId, value) => setValues((prev) => ({ ...prev, [qId]: value }))}
            mode="answer"
          />
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 10,
          marginTop: 14,
          flexWrap: 'wrap',
        }}
      >
        {layout === 'single' ? (
          <>
            <Button
              icon={<LeftOutlined />}
              disabled={index <= 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
            >
              上一题
            </Button>
            <Button
              icon={<RightOutlined />}
              iconPosition="end"
              disabled={index >= flat.length - 1}
              onClick={() => setIndex((value) => Math.min(flat.length - 1, value + 1))}
            >
              下一题
            </Button>
            <Button type="primary" loading={submitting} onClick={() => void submit()}>
              提交
            </Button>
          </>
        ) : (
          <Button type="primary" loading={submitting} onClick={() => void submit()}>
            标记完成
          </Button>
        )}
      </div>
    </div>
  );
}
