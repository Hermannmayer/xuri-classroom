import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Collapse,
  Empty,
  Input,
  InputNumber,
  message,
  Radio,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getWithPagination } from '../../api';
import {
  COMPOSE_TYPES,
  TYPE_LABELS,
  createCompose,
  getComposeStats,
  planCompose,
  type ComposePlan,
  type ComposeRequest,
  type ComposeStats,
  type ComposeType,
  type ComposeVariant,
} from '../../api/compose';

interface RepoView {
  id: string;
  name?: string;
  total?: number;
}

const TYPE_FULL: Record<ComposeType, string> = {
  Radio: '单选题',
  Checkbox: '多选题',
  Judge: '判断题',
  FillBlank: '填空题',
  Textarea: '简答题',
};

const DEFAULT_COUNTS: Record<string, number> = { Radio: 20, Checkbox: 10, Judge: 10, FillBlank: 5, Textarea: 2 };
const DEFAULT_SCORES: Record<string, number> = { Radio: 2, Checkbox: 3, Judge: 2, FillBlank: 2, Textarea: 10 };
const DEFAULT_WEIGHTS: Record<string, number> = { Radio: 30, Checkbox: 30, Judge: 20, FillBlank: 10, Textarea: 10 };

const LETTERS = 'ABCDEFGH';

const fmtScore = (value: number) => String(Math.round(value * 100) / 100);

function stripHtml(text?: string) {
  return (text || '').replace(/<[^>]+>/g, '');
}

/** 单套预览：逐题展示题干/选项/分值，不再拼成一行 */
function VariantPreview({ variant }: { variant: ComposeVariant }) {
  let number = 0;
  return (
    <div>
      <Space wrap style={{ marginBottom: 8 }}>
        <Tag color="blue">{variant.total} 题</Tag>
        <Tag color="green">{fmtScore(variant.score)} 分</Tag>
        {Object.entries(variant.byType).map(([key, value]) => (
          <Tag key={key}>
            {key} {value}
          </Tag>
        ))}
        {variant.repeated > 0 && <Tag color="red">与上一套重复 {variant.repeated} 题</Tag>}
      </Space>
      <div style={{ maxHeight: 520, overflow: 'auto', paddingRight: 4 }}>
        {(variant.survey.children ?? []).map((group) => (
          <div key={group.id} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, margin: '6px 0' }}>{group.title}</div>
            {(group.children ?? []).map((question) => {
              number += 1;
              const options = question.children ?? [];
              return (
                <div key={question.id} style={{ marginBottom: 10, fontSize: 13, lineHeight: 1.7 }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{number}. </span>
                    {stripHtml(question.title)}
                    {question.attribute?.examScore != null && (
                      <span style={{ color: 'var(--bp-text-soft)' }}>（{question.attribute.examScore} 分）</span>
                    )}
                  </div>
                  {options.length > 0 && question.type !== 'Textarea' && (
                    <div style={{ paddingLeft: 16, color: 'var(--bp-text-soft)' }}>
                      {options.map((option, index) => (
                        <span key={option.id} style={{ marginRight: 14 }}>
                          {LETTERS[index]}. {stripHtml(option.title)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 组卷中心：范围 + 规则 + 预览在一页完成 */
export default function ComposePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [repos, setRepos] = useState<RepoView[]>([]);
  const [stats, setStats] = useState<ComposeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [name, setName] = useState(searchParams.get('name') || '');
  const [repoIds, setRepoIds] = useState<string[]>([]);
  const [types, setTypes] = useState<ComposeType[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [mode, setMode] = useState<'random' | 'ratio' | 'sequential'>('random');
  const [counts, setCounts] = useState<Record<string, number>>({ ...DEFAULT_COUNTS });
  const [scores, setScores] = useState<Record<string, number>>({ ...DEFAULT_SCORES });
  const [ratios, setRatios] = useState<Record<string, number>>({ ...DEFAULT_WEIGHTS });
  const [totalQuestions, setTotalQuestions] = useState(100);
  const [rangeStart, setRangeStart] = useState<Record<string, number>>({});
  const [rangeEnd, setRangeEnd] = useState<Record<string, number>>({});
  const [sets, setSets] = useState(1);
  const [seed, setSeed] = useState<number | null>(null);
  const [unique, setUnique] = useState(true);
  const [shortage, setShortage] = useState<'reuse' | 'less' | 'error'>('less');
  const [weights, setWeights] = useState<Record<string, number>>({ 易: 5, 中: 3, 难: 2 });
  const [totalScore, setTotalScore] = useState(100);
  const [scoreWeights, setScoreWeights] = useState<Record<string, number>>({ ...DEFAULT_WEIGHTS });
  const [plan, setPlan] = useState<ComposePlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getWithPagination<RepoView>('/api/repo/list', { current: 1, pageSize: 200 })
      .then((res) => setRepos(res.data))
      .catch((e: Error) => message.error(e.message));
  }, []);

  useEffect(() => {
    if (!repoIds.length) {
      setStats(null);
      return;
    }
    let alive = true;
    setStatsLoading(true);
    getComposeStats(repoIds)
      .then((res) => {
        if (alive) setStats(res);
      })
      .catch((e: Error) => {
        if (alive) message.error(e.message);
      })
      .finally(() => {
        if (alive) setStatsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [repoIds]);

  /** 题库里没有的题型不出现（按当前统计过滤） */
  const availableTypes = useMemo(() => {
    if (!stats) return [] as ComposeType[];
    return COMPOSE_TYPES.filter((type) => (stats.byType[TYPE_FULL[type]] ?? 0) > 0);
  }, [stats]);

  useEffect(() => {
    if (!availableTypes.length) {
      setTypes([]);
      return;
    }
    setTypes((prev) => {
      const kept = prev.filter((type) => availableTypes.includes(type));
      return kept.length ? kept : [...availableTypes];
    });
  }, [availableTypes]);

  const chapterOptions = useMemo(
    () =>
      Object.keys(stats?.byChapter ?? {})
        .filter((key) => key !== '未设置')
        .map((key) => ({ label: key + '（' + (stats?.byChapter[key] ?? 0) + '）', value: key })),
    [stats],
  );
  const difficultyOptions = useMemo(
    () =>
      Object.keys(stats?.byDifficulty ?? {})
        .filter((key) => key !== '未设置')
        .map((key) => ({ label: key + '（' + (stats?.byDifficulty[key] ?? 0) + '）', value: key })),
    [stats],
  );

  const computedScore = useMemo(
    () => types.reduce((sum, type) => sum + Number(counts[type] ?? 0) * Number(scores[type] ?? 0), 0),
    [types, counts, scores],
  );
  const computedQuestions = useMemo(
    () => types.reduce((sum, type) => sum + Number(counts[type] ?? 0), 0),
    [types, counts],
  );

  const buildRequest = (): ComposeRequest => ({
    name: name.trim() || '组卷试卷',
    repoIds,
    types,
    chapters,
    difficulties,
    keyword: keyword.trim() || undefined,
    mode,
    counts,
    scores,
    ratios,
    totalQuestions,
    rangeStart,
    rangeEnd,
    sets,
    seed: seed ?? undefined,
    uniqueAcrossPapers: unique,
    shortagePolicy: shortage,
    difficultyWeights: weights,
    publish: true,
    category: searchParams.get('category') || undefined,
    parentId: searchParams.get('parentId') || undefined,
  });

  const applyTotalScore = () => {
    const active = types.filter((type) => Number(counts[type] ?? 0) > 0);
    const sumWeight = active.reduce((sum, type) => sum + Number(scoreWeights[type] ?? 0), 0);
    if (!active.length || sumWeight <= 0 || totalScore <= 0) {
      message.warning('先选择题型并填写题数与分值比例');
      return;
    }
    const next = { ...scores };
    let spent = 0;
    active.forEach((type, index) => {
      const count = Number(counts[type]);
      const isLast = index === active.length - 1;
      // 最后一类吸收四舍五入的零头，保证总分正好等于目标
      const per = isLast
        ? (totalScore - spent) / count
        : (totalScore * Number(scoreWeights[type] ?? 0)) / sumWeight / count;
      const rounded = Math.max(0, Math.round(per * 100) / 100);
      next[type] = rounded;
      spent += rounded * count;
    });
    setScores(next);
    message.success('已按总分分配每题分值，可继续微调');
  };

  const doPlan = async () => {
    if (!repoIds.length) {
      message.warning('请先选择题库');
      return;
    }
    if (!types.length) {
      message.warning('当前题库没有可用题型');
      return;
    }
    setPlanning(true);
    try {
      const result = await planCompose(buildRequest());
      setPlan(result);
      if (result.warnings?.length) message.warning(result.warnings[0]);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setPlanning(false);
    }
  };

  const doCreate = async () => {
    setCreating(true);
    try {
      const result = await createCompose(buildRequest());
      message.success('已生成 ' + (result.projectIds?.length ?? 0) + ' 套试卷，请在列表中查看');
      navigate('/teaching?tab=exam');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const activeTypes = types.filter((type) => availableTypes.includes(type));

  const typeTable = (
    <Table
      size="small"
      pagination={false}
      rowKey="type"
      dataSource={activeTypes.map((type) => ({ type }))}
      locale={{ emptyText: repoIds.length ? '当前题库没有可用题型' : '先选择题库' }}
      columns={[
        { title: '题型', dataIndex: 'type', width: 90, render: (type: ComposeType) => TYPE_LABELS[type] },
        {
          title: '可用题量',
          width: 100,
          render: (_: unknown, row: { type: ComposeType }) => stats?.byType[TYPE_FULL[row.type]] ?? '-',
        },
        ...(mode === 'ratio'
          ? [
              {
                title: '比例（权重）',
                render: (_: unknown, row: { type: ComposeType }) => (
                  <InputNumber
                    min={0}
                    value={ratios[row.type]}
                    onChange={(value) => setRatios({ ...ratios, [row.type]: Number(value ?? 0) })}
                  />
                ),
              },
            ]
          : mode === 'sequential'
            ? [
                {
                  title: '起始题号',
                  render: (_: unknown, row: { type: ComposeType }) => (
                    <InputNumber
                      min={1}
                      value={rangeStart[row.type] ?? 1}
                      onChange={(value) => setRangeStart({ ...rangeStart, [row.type]: Number(value ?? 1) })}
                    />
                  ),
                },
                {
                  title: '结束题号',
                  render: (_: unknown, row: { type: ComposeType }) => (
                    <InputNumber
                      min={1}
                      value={rangeEnd[row.type] ?? 10}
                      onChange={(value) => setRangeEnd({ ...rangeEnd, [row.type]: Number(value ?? 10) })}
                    />
                  ),
                },
              ]
            : [
                {
                  title: '题数',
                  render: (_: unknown, row: { type: ComposeType }) => (
                    <InputNumber
                      min={0}
                      value={counts[row.type]}
                      onChange={(value) => setCounts({ ...counts, [row.type]: Number(value ?? 0) })}
                    />
                  ),
                },
                {
                  title: '每题分值',
                  render: (_: unknown, row: { type: ComposeType }) => (
                    <InputNumber
                      min={0}
                      step={0.5}
                      value={scores[row.type]}
                      onChange={(value) => setScores({ ...scores, [row.type]: Number(value ?? 0) })}
                    />
                  ),
                },
              ]),
      ]}
    />
  );

  return (
    <div style={{ padding: 20, maxWidth: 1380, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            从题库组卷
          </Typography.Title>
          <Typography.Text type="secondary">选范围、定规则、看预览，都在这一页完成</Typography.Text>
        </div>
        <Button onClick={() => navigate('/teaching?tab=exam')}>取消</Button>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 680px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card size="small" title="① 选题范围">
            <Space direction="vertical" style={{ width: '100%' }} size={14}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>试卷名称</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：保育员三级模拟卷" />
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>题库</div>
                <Checkbox.Group
                  value={repoIds}
                  onChange={(values) => setRepoIds(values as string[])}
                  options={repos.map((repo) => ({
                    label: (repo.name || '未命名题库') + '（' + (repo.total ?? 0) + ' 题）',
                    value: repo.id,
                  }))}
                />
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>题型</div>
                {statsLoading ? (
                  <Spin size="small" />
                ) : availableTypes.length ? (
                  <Checkbox.Group
                    value={types}
                    onChange={(values) => setTypes(values as ComposeType[])}
                    options={availableTypes.map((type) => ({
                      label: TYPE_LABELS[type] + '（' + (stats?.byType[TYPE_FULL[type]] ?? 0) + '）',
                      value: type,
                    }))}
                  />
                ) : (
                  <Typography.Text type="secondary">
                    {repoIds.length ? '当前题库没有可用题型' : '先选择题库，题库里没有的题型不会显示'}
                  </Typography.Text>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 220, flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>章节</div>
                  <Select
                    mode="multiple"
                    allowClear
                    style={{ width: '100%' }}
                    placeholder="不限章节"
                    value={chapters}
                    onChange={setChapters}
                    options={chapterOptions}
                  />
                </div>
                <div style={{ minWidth: 220, flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>难度</div>
                  <Select
                    mode="multiple"
                    allowClear
                    style={{ width: '100%' }}
                    placeholder="不限难度"
                    value={difficulties}
                    onChange={setDifficulties}
                    options={difficultyOptions}
                  />
                </div>
                <div style={{ minWidth: 220, flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>题干关键词</div>
                  <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="可不填" />
                </div>
              </div>
              {stats && (
                <Alert
                  type="info"
                  showIcon
                  message={'可用题目 ' + stats.total + ' 题'}
                  description={
                    <Space wrap>
                      {Object.entries(stats.byType).map(([key, value]) => (
                        <Tag key={key}>
                          {key} {value}
                        </Tag>
                      ))}
                    </Space>
                  }
                />
              )}
            </Space>
          </Card>

          <Card size="small" title="② 组卷规则">
            <Space direction="vertical" style={{ width: '100%' }} size={14}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>抽题方式</div>
                <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
                  <Radio.Button value="random">随机抽取</Radio.Button>
                  <Radio.Button value="ratio">按比例</Radio.Button>
                  <Radio.Button value="sequential">顺序区间</Radio.Button>
                </Radio.Group>
                {mode === 'ratio' && (
                  <span style={{ marginLeft: 12 }}>
                    总题数{' '}
                    <InputNumber min={1} value={totalQuestions} onChange={(v) => setTotalQuestions(Number(v ?? 1))} />
                  </span>
                )}
              </div>

              {typeTable}

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>
                  整套总分{' '}
                  <InputNumber min={1} value={totalScore} onChange={(v) => setTotalScore(Number(v ?? 1))} />
                </span>
                <span style={{ color: 'var(--bp-text-soft)' }}>
                  当前配置：{computedQuestions} 题 / {fmtScore(computedScore)} 分
                </span>
                <Button size="small" onClick={applyTotalScore}>
                  按总分分配每题分值
                </Button>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography.Text type="secondary">题型分值比例：</Typography.Text>
                {activeTypes.map((type) => (
                  <span key={type}>
                    {TYPE_LABELS[type]}{' '}
                    <InputNumber
                      min={0}
                      style={{ width: 70 }}
                      value={scoreWeights[type]}
                      onChange={(v) => setScoreWeights({ ...scoreWeights, [type]: Number(v ?? 0) })}
                    />
                  </span>
                ))}
                <Typography.Text type="secondary">按比例分总分后，再除以题数得到每题分值</Typography.Text>
              </div>

              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>
                  生成套数 <InputNumber min={1} max={50} value={sets} onChange={(v) => setSets(Number(v ?? 1))} />
                </span>
                <span>
                  随机种子{' '}
                  <InputNumber value={seed ?? undefined} onChange={(v) => setSeed(v === null ? null : Number(v))} placeholder="留空自动" />
                </span>
                <Checkbox checked={unique} onChange={(e) => setUnique(e.target.checked)}>
                  多套之间不重复
                </Checkbox>
                <span>
                  题不够时{' '}
                  <Select
                    style={{ width: 140 }}
                    value={shortage}
                    onChange={setShortage}
                    options={[
                      { label: '少出并提示', value: 'less' },
                      { label: '复用旧题并提示', value: 'reuse' },
                      { label: '直接报错', value: 'error' },
                    ]}
                  />
                </span>
              </div>

              <Collapse
                size="small"
                items={[
                  {
                    key: 'more',
                    label: '更多规则：难度配比',
                    children: (
                      <Space>
                        {['易', '中', '难'].map((level) => (
                          <span key={level}>
                            {level}{' '}
                            <InputNumber
                              min={0}
                              value={weights[level]}
                              onChange={(v) => setWeights({ ...weights, [level]: Number(v ?? 0) })}
                            />
                          </span>
                        ))}
                        <Typography.Text type="secondary">按权重分配，题库不足时借用其他难度</Typography.Text>
                      </Space>
                    ),
                  },
                ]}
              />
            </Space>
          </Card>
        </div>

        <div style={{ flex: '0 1 520px', minWidth: 340, position: 'sticky', top: 12 }}>
          <Card
            size="small"
            title="③ 预览"
            extra={
              <Button size="small" type="primary" loading={planning} onClick={doPlan}>
                刷新预览
              </Button>
            }
          >
            {!plan ? (
              <Empty description="配置好左侧规则后点「刷新预览」" />
            ) : (
              <>
                {plan.warnings?.length > 0 && (
                  <Alert type="warning" showIcon style={{ marginBottom: 8 }} message={plan.warnings.join('；')} />
                )}
                <Tabs
                  size="small"
                  items={plan.variants.map((variant) => ({
                    key: String(variant.seq),
                    label: '第 ' + variant.seq + ' 套',
                    children: <VariantPreview variant={variant} />,
                  }))}
                />
              </>
            )}
          </Card>
        </div>
      </div>

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          marginTop: 12,
          padding: '10px 0',
          background: 'var(--bp-bg, #fff)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          borderTop: '1px solid var(--bp-line, #eee)',
        }}
      >
        <Button loading={planning} onClick={doPlan}>
          预览
        </Button>
        <Button type="primary" loading={creating} onClick={doCreate}>
          生成并发布
        </Button>
      </div>
    </div>
  );
}
