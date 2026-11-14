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
  Steps,
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
} from '../../api/compose';

interface RepoView {
  id: string;
  name?: string;
  total?: number;
}

const DEFAULT_COUNTS: Record<string, number> = { Radio: 20, Checkbox: 10, Judge: 10, FillBlank: 5, Textarea: 2 };
const DEFAULT_SCORES: Record<string, number> = { Radio: 2, Checkbox: 3, Judge: 2, FillBlank: 2, Textarea: 10 };
const DEFAULT_RATIOS: Record<string, number> = { Radio: 30, Checkbox: 20, Judge: 20, FillBlank: 15, Textarea: 15 };

/** 组卷中心：范围 → 规则 → 预览生成 */
export default function ComposePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [repos, setRepos] = useState<RepoView[]>([]);
  const [stats, setStats] = useState<ComposeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(searchParams.get('name') || '');
  const [repoIds, setRepoIds] = useState<string[]>([]);
  const [types, setTypes] = useState<ComposeType[]>([...COMPOSE_TYPES]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [mode, setMode] = useState<'random' | 'ratio' | 'sequential'>('random');
  const [counts, setCounts] = useState<Record<string, number>>({ ...DEFAULT_COUNTS });
  const [scores, setScores] = useState<Record<string, number>>({ ...DEFAULT_SCORES });
  const [ratios, setRatios] = useState<Record<string, number>>({ ...DEFAULT_RATIOS });
  const [totalQuestions, setTotalQuestions] = useState(100);
  const [rangeStart, setRangeStart] = useState<Record<string, number>>({});
  const [rangeEnd, setRangeEnd] = useState<Record<string, number>>({});
  const [sets, setSets] = useState(1);
  const [seed, setSeed] = useState<number | null>(null);
  const [unique, setUnique] = useState(true);
  const [shortage, setShortage] = useState<'reuse' | 'less' | 'error'>('less');
  const [weights, setWeights] = useState<Record<string, number>>({ 易: 5, 中: 3, 难: 2 });
  const [publish, setPublish] = useState(true);
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
  });

  const next = () => {
    if (step === 0) {
      if (!repoIds.length) {
        message.warning('请先选择至少一个题库');
        return;
      }
      if (!types.length) {
        message.warning('请至少选择一种题型');
        return;
      }
    }
    setStep(step + 1);
  };

  const doPlan = async () => {
    setPlanning(true);
    try {
      const result = await planCompose(buildRequest());
      setPlan(result);
      setStep(2);
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
      const result = await createCompose({ ...buildRequest(), publish });
      message.success(publish ? '已生成并发布为考试' : '已生成试卷集');
      navigate('/compose/batch/' + result.batchId);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const typeTable = (
    <Table
      size="small"
      pagination={false}
      rowKey="type"
      dataSource={COMPOSE_TYPES.filter((type) => types.includes(type)).map((type) => ({ type }))}
      columns={[
        { title: '题型', dataIndex: 'type', render: (type: ComposeType) => TYPE_LABELS[type] },
        {
          title: '可用题量',
          render: (_: unknown, row: { type: ComposeType }) => stats?.byType?.[TYPE_LABELS[row.type]] ?? '-',
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
    <div style={{ padding: 20, maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            从题库组卷
          </Typography.Title>
          <Typography.Text type="secondary">选范围 → 定规则 → 预览，生成后进入试卷集</Typography.Text>
        </div>
        <Button onClick={() => navigate('/teaching?tab=exam')}>取消</Button>
      </div>

      <Steps
        current={step}
        size="small"
        style={{ marginBottom: 16 }}
        items={[{ title: '选题范围' }, { title: '组卷规则' }, { title: '预览与生成' }]}
      />

      {step === 0 && (
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
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
              <Checkbox.Group
                value={types}
                onChange={(values) => setTypes(values as ComposeType[])}
                options={COMPOSE_TYPES.map((type) => ({ label: TYPE_LABELS[type], value: type }))}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 240 }}>
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
              <div style={{ minWidth: 240 }}>
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
            {statsLoading ? (
              <Spin />
            ) : (
              stats && (
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
              )
            )}
          </Space>
        </Card>
      )}

      {step === 1 && (
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>抽题方式</div>
              <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
                <Radio.Button value="random">随机抽取</Radio.Button>
                <Radio.Button value="ratio">按比例</Radio.Button>
                <Radio.Button value="sequential">顺序区间</Radio.Button>
              </Radio.Group>
              {mode === 'ratio' && (
                <span style={{ marginLeft: 12 }}>
                  总题数 <InputNumber min={1} value={totalQuestions} onChange={(v) => setTotalQuestions(Number(v ?? 1))} />
                </span>
              )}
            </div>
            {typeTable}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>
                生成套数 <InputNumber min={1} max={50} value={sets} onChange={(v) => setSets(Number(v ?? 1))} />
              </span>
              <span>
                随机种子 <InputNumber value={seed ?? undefined} onChange={(v) => setSeed(v === null ? null : Number(v))} placeholder="留空自动" />
              </span>
              <Checkbox checked={unique} onChange={(e) => setUnique(e.target.checked)}>
                多套之间不重复
              </Checkbox>
              <span>
                题不够时{' '}
                <Select
                  style={{ width: 150 }}
                  value={shortage}
                  onChange={setShortage}
                  options={[
                    { label: '少出并提示', value: 'less' },
                    { label: '复用旧题并提示', value: 'reuse' },
                    { label: '直接报错', value: 'error' },
                  ]}
                />
              </span>
              <Checkbox checked={publish} onChange={(e) => setPublish(e.target.checked)}>
                生成后发布为考试
              </Checkbox>
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
                      <Typography.Text type="secondary">按权重分配，题库不足时自动借用其他难度</Typography.Text>
                    </Space>
                  ),
                },
              ]}
            />
          </Space>
        </Card>
      )}

      {step === 2 && (
        <Card size="small">
          {!plan ? (
            <Empty description="还没有生成预览" />
          ) : (
            <>
              {plan.warnings?.length > 0 && (
                <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={plan.warnings.join('；')} />
              )}
              <Tabs
                items={plan.variants.map((variant) => ({
                  key: String(variant.seq),
                  label: '第 ' + variant.seq + ' 套' + (variant.repeated ? '（重复 ' + variant.repeated + ' 题）' : ''),
                  children: (
                    <div>
                      <Space wrap style={{ marginBottom: 10 }}>
                        <Tag color="blue">{variant.total} 题</Tag>
                        <Tag color="green">{variant.score} 分</Tag>
                        {Object.entries(variant.byType).map(([key, value]) => (
                          <Tag key={key}>
                            {key} {value}
                          </Tag>
                        ))}
                      </Space>
                      {(variant.survey.children ?? []).map((group) => (
                        <div key={group.id} style={{ marginBottom: 10 }}>
                          <div style={{ fontWeight: 600 }}>{group.title}</div>
                          <div style={{ color: 'var(--bp-text-soft)', fontSize: 13 }}>
                            {(group.children ?? []).map((q) => (q.title || '').replace(/<[^>]+>/g, '').slice(0, 40)).join(' / ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
                }))}
              />
            </>
          )}
        </Card>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        {step > 0 && <Button onClick={() => setStep(step - 1)}>上一步</Button>}
        {step === 0 && (
          <Button type="primary" onClick={next}>
            下一步：组卷规则
          </Button>
        )}
        {step === 1 && (
          <Button type="primary" loading={planning} onClick={doPlan}>
            预览 {sets > 1 ? sets + ' 套' : ''}
          </Button>
        )}
        {step === 2 && (
          <Button type="primary" loading={creating} onClick={doCreate}>
            {publish ? '生成并发布' : '生成试卷集'}
          </Button>
        )}
      </div>
    </div>
  );
}
