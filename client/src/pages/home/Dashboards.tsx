import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Card, Col, Row, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { listProjects } from '../../api';
import type { ProjectView } from '../../api';
import type { DashboardOverview, DashboardSection, TeacherRecentRow } from '../../api/dashboard';
import {
  fetchOverview,
  fetchStudentBoard,
  fetchTeacherBoard,
  fetchTeacherTrend,
  fetchTrend,
  fmtDateTime,
  normalizeTrend,
  scoreTrend,
} from '../../api/dashboard';
import { can } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import LinkAction from '../../components/LinkAction';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  AreaTrend,
  BarSeries,
  Donut,
  ProgressRing,
  StatTile,
  fmtCompact,
  fmtDecimal,
  fmtInt,
  fmtPercent,
  ratioPercent,
} from '../../components/charts';

/** 图表统计窗口（天）。契约默认 14，后端允许 1~90 */
const DAYS = 14;

const SOFT = { color: 'var(--bp-text-soft)' } as const;
const NOTE: CSSProperties = { fontSize: 11, lineHeight: 1.5, color: 'var(--bp-text-soft)' };

function Shell({
  eyebrow,
  title,
  desc,
  extra,
  children,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={{ maxWidth: 1200 }}>
      <div
        style={{
          marginBottom: 14,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>{eyebrow}</div>
          <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
            {title}
          </h2>
          <div style={{ fontSize: 11, ...SOFT, marginTop: 4 }}>{desc}</div>
        </div>
        {extra ? <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{extra}</div> : null}
      </div>
      {children}
    </div>
  );
}

/**
 * 图表/表格的统一卡片外壳。
 *
 * note 用来放「这块的接口没通」这类小字原因：整页不做统一错误处理，
 * 哪个请求挂了就只在它自己的卡片下面留一行说明，其余部分照常可用。
 */
function Panel({
  title,
  extra,
  note,
  children,
}: {
  title: ReactNode;
  extra?: ReactNode;
  note?: string | null;
  children: ReactNode;
}) {
  return (
    <Card
      className="bp-corners bp-card"
      size="small"
      title={title}
      extra={extra}
      styles={{ body: { padding: '12px 14px 10px' } }}
      style={{ height: '100%' }}
    >
      {children}
      {note ? (
        <div style={{ ...NOTE, marginTop: 8, color: 'var(--bp-orange)' }}>统计接口未就绪：{note}</div>
      ) : null}
    </Card>
  );
}

interface SectionState<T> extends DashboardSection<T> {
  loading: boolean;
}

/**
 * 单个统计块的取数。
 *
 * 每个请求自己一个 state、自己一个 catch，互不牵连：首页允许「用户构成没了、
 * 答卷趋势还在」，不允许一个接口 500 就把整页打成白屏。
 */
function useSection<T>(load: () => Promise<DashboardSection<T>>, deps: unknown[]): SectionState<T> {
  const [state, setState] = useState<SectionState<T>>({ data: null, error: null, loading: true });

  useEffect(() => {
    let alive = true;
    setState((prev) => ({ ...prev, loading: true }));
    void load().then((result) => {
      if (!alive) return;
      setState({ data: result.data, error: result.error, loading: false });
    });
    return () => {
      alive = false;
    };
    // load 每次渲染都是新函数，真正的依赖由调用方通过 deps 给出（天数 / 刷新序号）
  }, deps);

  return state;
}

function RefreshLink({ onRefresh, busy }: { onRefresh: () => void; busy: boolean }) {
  return (
    <LinkAction onClick={onRefresh} style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--bp-text-soft)' }}>
      {busy ? '刷新中…' : '刷新数据 ↻'}
    </LinkAction>
  );
}

/* ------ 管理员 */

interface MetricRow {
  key: string;
  group: string;
  name: string;
  value: string;
  note: string;
  rowSpan: number;
}

/**
 * 第四行的「数据表」内容：题库 / 试卷 / 答卷 / 班级 / 成绩 / AI 六组。
 * 口径注释跟着数据走，方便老师问「这个数是算什么」时在页面上就能答。
 */
function buildMetricRows(data: DashboardOverview | null): MetricRow[] {
  const raw: Array<Omit<MetricRow, 'rowSpan'>> = [
    { key: 'repos', group: '题库', name: '题库', value: fmtInt(data?.questions?.repos), note: '可复用的题目集合' },
    { key: 'templates', group: '题库', name: '题目', value: fmtInt(data?.questions?.templates), note: '题库里的题目总数' },
    { key: 'folders', group: '试卷', name: '文件夹', value: fmtInt(data?.projects?.folder), note: '只用于分组' },
    {
      key: 'exam',
      group: '试卷',
      name: '考试',
      value: fmtInt(data?.projects?.exam),
      note: `进行中 ${fmtInt(data?.projects?.running)} 场`,
    },
    { key: 'survey', group: '试卷', name: '问卷', value: fmtInt(data?.projects?.survey), note: '考试以外的收集类项目' },
    { key: 'published', group: '试卷', name: '已发布', value: fmtInt(data?.projects?.published), note: '学员可见的份数' },
    { key: 'answers', group: '答卷', name: '累计', value: fmtInt(data?.answers?.total), note: '含待批改' },
    { key: 'today', group: '答卷', name: '今日', value: fmtInt(data?.answers?.today), note: '按自然日' },
    { key: 'last7d', group: '答卷', name: '近 7 天', value: fmtInt(data?.answers?.last7d), note: '滚动 7 天' },
    { key: 'last30d', group: '答卷', name: '近 30 天', value: fmtInt(data?.answers?.last30d), note: '滚动 30 天' },
    { key: 'graded', group: '答卷', name: '已批改', value: fmtInt(data?.answers?.graded), note: '含机器判分与人工批改' },
    { key: 'pending', group: '答卷', name: '待批改', value: fmtInt(data?.answers?.pending), note: '主观题等老师给分' },
    { key: 'classes', group: '班级', name: '班级', value: fmtInt(data?.classes?.total), note: '未删除的班级数' },
    {
      key: 'open',
      group: '班级',
      name: '开班中',
      value: fmtInt(data?.classes?.open),
      note: '近似口径：教学班 + 有在册学员 + 有已发布项目',
    },
    { key: 'students', group: '班级', name: '在册学员', value: fmtInt(data?.classes?.students), note: '去重人数（一人可在多班）' },
    {
      key: 'avgSize',
      group: '班级',
      name: '平均班额',
      value: fmtDecimal(data?.classes?.avgSize, 1),
      note: '在册学员 ÷ 班级数',
    },
    {
      key: 'avgScore',
      group: '成绩',
      name: '平均分',
      value: fmtDecimal(data?.scores?.avg, 1),
      note: `有分数的答卷 ${fmtInt(data?.scores?.scoredCount)} 份`,
    },
    {
      key: 'passRate',
      group: '成绩',
      name: '及格率',
      value: fmtPercent(data?.scores?.passRate),
      note: '绝对 60 分口径；无样本时显示 —',
    },
    { key: 'max', group: '成绩', name: '最高分', value: fmtDecimal(data?.scores?.max, 1), note: '全站最高' },
    { key: 'min', group: '成绩', name: '最低分', value: fmtDecimal(data?.scores?.min, 1), note: '全站最低' },
    { key: 'aiCalls', group: 'AI', name: '近 7 天调用', value: fmtInt(data?.ai?.calls7d), note: '出卷/改写/批改建议/学情' },
    {
      key: 'aiTokens',
      group: 'AI',
      name: '近 7 天 Token',
      value: fmtCompact(data?.ai?.tokens7d),
      note: '输入 + 输出合计',
    },
  ];

  const counts = new Map<string, number>();
  for (const row of raw) counts.set(row.group, (counts.get(row.group) ?? 0) + 1);
  const seen = new Set<string>();
  return raw.map((row) => {
    const first = !seen.has(row.group);
    seen.add(row.group);
    return { ...row, rowSpan: first ? counts.get(row.group) ?? 1 : 0 };
  });
}

export function AdminHome() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const overview = useSection(() => fetchOverview(DAYS), [tick]);
  const isMobile = useIsMobile();


  const trendState = useSection(() => fetchTrend(DAYS), [tick]);

  const data = overview.data;
  const users = data?.users ?? null;
  const classes = data?.classes ?? null;
  const projects = data?.projects ?? null;
  const answers = data?.answers ?? null;
  const scores = data?.scores ?? null;
  const trend = normalizeTrend(trendState.data, DAYS);
  const busy = overview.loading || trendState.loading;

  const gradedTotal = (answers?.graded ?? 0) + (answers?.pending ?? 0);
  const rows = buildMetricRows(data);

/**
   * 手机端把概览表按「题库 / 试卷 / 答卷」分组渲染成列表。
   * <p>表格在 390px 上无论怎么调列宽都别扭：分组列要么重复要么压成半个字，
   * 干脆换一套结构——每组一个小标题，组内一条一行，数值右对齐。
   */
  const metricGroups = useMemo(() => {
    const groups: Array<{ group: string; items: MetricRow[] }> = [];
    for (const row of rows) {
      if (row.rowSpan > 0) groups.push({ group: row.group, items: [] });
      const last = groups[groups.length - 1];
      if (last) last.items.push(row);
    }
    return groups;
  }, [rows]);

  return (
    <Shell
      eyebrow="HOME / 管理员"
      title="系统概览"
      desc="全站规模、近 14 天走势与批改/成绩情况；点击数字卡片可跳到对应页面。"
      extra={<RefreshLink onRefresh={() => setTick((value) => value + 1)} busy={busy} />}
    >
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <StatTile
            label="学员"
            value={users?.student ?? null}
            unit="人"
            loading={overview.loading}
            error={overview.error}
            hint={`在册学员 ${fmtInt(classes?.students)} 人 · 开班中 ${fmtInt(classes?.open)} 个（近似口径）`}
            onClick={() => navigate('/system/access?tab=user')}
            title="去用户管理"
          />
        </Col>
        <Col xs={12} md={6}>
          <StatTile
            label="老师"
            value={users?.teacher ?? null}
            unit="人"
            tone="orange"
            loading={overview.loading}
            error={overview.error}
            hint={`管理员 ${fmtInt(users?.admin)} 人 · 用户合计 ${fmtInt(users?.total)} 人`}
            onClick={() => navigate('/system/access?tab=role')}
            title="去角色权限"
          />
        </Col>
        <Col xs={12} md={6}>
          <StatTile
            label="管理员"
            value={users?.admin ?? null}
            unit="人"
            loading={overview.loading}
            error={overview.error}
            hint={`近 7 天活跃 ${fmtInt(users?.active7d)} 人 · 近 7 天交卷 ${fmtInt(answers?.last7d)} 份`}
            onClick={() => navigate('/system/access?tab=user')}
            title="去用户管理"
          />
        </Col>
        <Col xs={12} md={6}>
          <StatTile
            label="进行中考试"
            value={projects?.running ?? null}
            unit="场"
            tone="orange"
            loading={overview.loading}
            error={overview.error}
            hint={`已发布 ${fmtInt(projects?.published)} 份 · 共 ${fmtInt(projects?.total)} 个项目（未设时间窗的按长期开放计）`}
            onClick={() => navigate('/teaching?tab=exam')}
            title="去教学管理"
          />
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} md={12}>
          <Panel title="用户构成" extra={<span style={NOTE}>单位：人</span>}>
            <Donut
              data={[users?.student, users?.teacher, users?.admin]}
              labels={['学员', '老师', '管理员']}
              colors={['var(--bp-blue)', 'var(--bp-orange)', 'var(--bp-text-soft)']}
              height={168}
              centerLabel="用户总数"
              centerValue={users?.total ?? null}
              unit=" 人"
              loading={overview.loading}
              error={overview.error}
            />
          </Panel>
        </Col>
        <Col xs={24} md={12}>
          <Panel title={`近 ${DAYS} 天答卷量`} extra={<span style={NOTE}>柱：答卷 / 浅柱：已批改</span>}>
            <BarSeries
              data={trend.answers}
              compare={trend.graded}
              labels={trend.days}
              seriesLabel="答卷"
              compareLabel="已批改"
              unit="份"
              height={196}
              loading={trendState.loading}
              error={trendState.error}
            />
          </Panel>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} md={12}>
          <Panel title={`近 ${DAYS} 天平均分走势`} extra={<span style={NOTE}>缺口 = 当天没有分数</span>}>
            <AreaTrend
              data={trend.avgScores}
              labels={trend.days}
              unit="分"
              height={196}
              format={(value) => fmtDecimal(value, 0)}
              loading={trendState.loading}
              error={trendState.error}
            />
          </Panel>
        </Col>
        <Col xs={12} md={6}>
          <Panel title="及格率">
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 0' }}>
              <ProgressRing
                percent={scores?.passRate ?? null}
                label="及格率"
                hint={`有分数的答卷 ${fmtInt(scores?.scoredCount)} 份`}
                height={132}
                loading={overview.loading}
                error={overview.error}
              />
            </div>
          </Panel>
        </Col>
        <Col xs={12} md={6}>
          <Panel title="批改进度">
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 0' }}>
              <ProgressRing
                percent={ratioPercent(answers?.graded, gradedTotal)}
                label="批改进度"
                hint={`已批 ${fmtInt(answers?.graded)} · 待批 ${fmtInt(answers?.pending)}`}
                height={132}
                color="var(--bp-orange)"
                loading={overview.loading}
                error={overview.error}
              />
            </div>
          </Panel>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col span={24}>
          <Panel
            title="题库 / 试卷 / 答卷 / 班级概览"
            extra={<span style={NOTE}>数字口径见「说明」列</span>}
            note={overview.error}
          >
            {isMobile ? (
              <div>
                {metricGroups.map(({ group, items }) => (
                  <div key={group} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.16em',
                        color: 'var(--bp-text-soft)',
                        marginBottom: 4,
                      }}
                    >
                      {group}
                    </div>
                    {items.map((row) => (
                      <div
                        key={row.key}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '7px 0',
                          borderBottom: '1px dashed var(--bp-line-soft)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, lineHeight: 1.5 }}>{row.name}</div>
                          {row.note ? (
                            <div style={{ fontSize: 10, color: 'var(--bp-text-soft)', marginTop: 2, lineHeight: 1.5 }}>
                              {row.note}
                            </div>
                          ) : null}
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            flex: '0 0 auto',
                          }}
                        >
                          {row.value}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <Table<MetricRow>
                size="small"
                rowKey="key"
                pagination={false}
                loading={overview.loading}
                dataSource={rows}
                locale={{ emptyText: '统计接口暂不可用' }}
                columns={[
                  {
                    title: '分组',
                    dataIndex: 'group',
                    width: 84,
                    onCell: (row) => ({ rowSpan: row.rowSpan }),
                    render: (value: string) => (
                      <span style={{ fontSize: 11, letterSpacing: '0.08em', ...SOFT }}>{value}</span>
                    ),
                  },
                  { title: '指标', dataIndex: 'name', width: 140 },
                  {
                    title: '数值',
                    dataIndex: 'value',
                    width: 120,
                    align: 'right',
                    render: (value: string) => (
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{value}</span>
                    ),
                  },
                  {
                    title: '说明',
                    dataIndex: 'note',
                    render: (value: string) => <span style={{ ...NOTE }}>{value}</span>,
                  },
                ]}
              />
            )}
          </Panel>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col span={24}>
          <Panel title="常用入口">
            <Row gutter={[12, 8]}>
              {[
                { label: '权限配置', to: '/system/access?tab=role' },
                { label: '用户管理', to: '/system/access?tab=user' },
                { label: '用户组', to: '/system/access?tab=group' },
                { label: '系统设置', to: '/system/setting' },
                { label: '操作日志', to: '/system/audit' },
                { label: '教学管理', to: '/teaching?tab=exam' },
              ].map((item) => (
                <Col xs={12} md={8} key={item.to}>
                  <LinkAction onClick={() => navigate(item.to)} style={{ fontSize: 13 }}>
                    {item.label} →
                  </LinkAction>
                </Col>
              ))}
            </Row>
          </Panel>
        </Col>
      </Row>
    </Shell>
  );
}

/* ------ 老师 */

export function TeacherHome() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const board = useSection(() => fetchTeacherBoard(), [tick]);
  // 老师看的是「我的可见范围」，不是全站：/trend 会把别人的答卷画到这张图上
  const trendState = useSection(() => fetchTeacherTrend(DAYS), [tick]);

  const data = board.data;
  const recent = data?.recent ?? [];
  const trend = normalizeTrend(trendState.data, DAYS);
  const busy = board.loading || trendState.loading;

  return (
    <Shell
      eyebrow="HOME / 教师"
      title="我的教学"
      desc="我的班级与学员、待批改的答卷，以及最近几次考试的收集情况。"
      extra={<RefreshLink onRefresh={() => setTick((value) => value + 1)} busy={busy} />}
    >
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <StatTile
            label="我的班级"
            value={data?.classes ?? null}
            unit="个"
            loading={board.loading}
            error={board.error}
            hint={`参与项目 ${fmtInt(data?.projects)} 个 · 已发布 ${fmtInt(data?.published)} 个`}
            onClick={() => navigate('/teaching?tab=classes')}
            title="去班级管理"
          />
        </Col>
        <Col xs={12} md={6}>
          <StatTile
            label="在册学员"
            value={data?.students ?? null}
            unit="人"
            loading={board.loading}
            error={board.error}
            hint={`平均分 ${fmtDecimal(data?.avgScore, 1)} 分`}
            onClick={() => navigate('/teaching?tab=classes')}
            title="去班级管理"
          />
        </Col>
        <Col xs={12} md={6}>
          <StatTile
            label="待批改"
            value={data?.pendingGrading ?? null}
            unit="份"
            tone="orange"
            loading={board.loading}
            error={board.error}
            hint={`累计答卷 ${fmtInt(data?.answers)} 份`}
            onClick={() => navigate('/teaching?tab=classes')}
            title="按班级查看答卷"
          />
        </Col>
        <Col xs={12} md={6}>
          <StatTile
            label="近 7 天批改"
            value={data?.graded7d ?? null}
            unit="份"
            loading={board.loading}
            error={board.error}
            hint="按批改时间统计，不含机器判分"
            onClick={() => navigate('/teaching?tab=classes')}
            title="按班级查看答卷"
          />
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col span={24}>
          <Panel title={`近 ${DAYS} 天答卷量`} extra={<span style={NOTE}>柱：答卷 / 浅柱：已批改 · 我的可见范围</span>}>
            <BarSeries
              data={trend.answers}
              compare={trend.graded}
              labels={trend.days}
              seriesLabel="答卷"
              compareLabel="已批改"
              unit="份"
              height={190}
              loading={trendState.loading}
              error={trendState.error}
            />
          </Panel>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col span={24}>
          <Panel
            title="我发布的考试（收集情况）"
            extra={<span style={NOTE}>最近 {recent.length} 个</span>}
            note={board.error}
          >
            <Table<TeacherRecentRow>
              rowKey={(row) => row.projectId ?? row.projectName ?? 'row'}
              size="small"
              // 列宽合计约 510px，手机（324px 可用）不横滚会把交卷时间折成三行
              scroll={{ x: 520 }}
              loading={board.loading}
              pagination={recent.length > 8 ? { pageSize: 8, size: 'small', showSizeChanger: false } : false}
              dataSource={recent}
              locale={{ emptyText: '还没有发布过考试' }}
              columns={[
                {
                  title: '考试',
                  dataIndex: 'projectName',
                  render: (value: string | undefined, row) => (
                    <LinkAction onClick={() => navigate(`/survey/${row.projectId}`)}>
                      {value || '(未命名)'}
                    </LinkAction>
                  ),
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 90,
                  render: (value: number | undefined) =>
                    value === 1 ? <Tag color="success">已发布</Tag> : <Tag>未发布</Tag>,
                },
                { title: '答卷', dataIndex: 'answerCount', width: 80, render: (value?: number) => fmtInt(value ?? 0) },
                { title: '平均分', dataIndex: 'avgScore', width: 90, render: (value?: number | null) => fmtDecimal(value, 1) },
                {
                  title: '待批改',
                  dataIndex: 'pendingGrading',
                  width: 90,
                  render: (value?: number) => (
                    <span style={{ color: (value ?? 0) > 0 ? 'var(--bp-orange)' : undefined }}>{fmtInt(value ?? 0)}</span>
                  ),
                },
                {
                  title: '最近交卷',
                  dataIndex: 'lastAnswerAt',
                  width: 160,
                  render: (value?: string | number | null) => (
                    <span style={NOTE}>{fmtDateTime(value)}</span>
                  ),
                },
              ]}
            />
          </Panel>
        </Col>
      </Row>
    </Shell>
  );
}

/* ------ 学员 */

export function StudentHome({ authorities }: { authorities: string[] }) {
  const navigate = useNavigate();
  const canAnswer = can(authorities, PERMISSION_CODES.projectAnswer);
  const [tick, setTick] = useState(0);
  const board = useSection(() => fetchStudentBoard(), [tick]);
  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // 考试安排表沿用原逻辑：班级分配的考试可能在文件夹里，学员首页必须拉全层级
  useEffect(() => {
    let alive = true;
    setProjectsLoading(true);
    listProjects({ current: 1, pageSize: 50, flat: true })
      .then((page) => {
        if (!alive) return;
        setProjects((page.data ?? []).filter((row) => row.mode !== 'folder'));
        setProjectsError(null);
      })
      .catch((error: Error) => {
        if (!alive) return;
        setProjects([]);
        setProjectsError(error.message || '读取考试安排失败');
      })
      .finally(() => {
        if (alive) setProjectsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  const data = board.data;
  // 点数由 api 层的 STUDENT_RECENT_LIMIT（= 后端 recent 的 20 条）决定，这里不再写死
  const score = scoreTrend(data?.recent);
  const openExams = projects.filter((project) => project.status === 1).length;
  const busy = board.loading || projectsLoading;

  return (
    <Shell
      eyebrow="HOME / 学员"
      title="我的学习"
      desc="待考、已交卷、成绩走势和练习情况；下方是安排给你的考试。"
      extra={<RefreshLink onRefresh={() => setTick((value) => value + 1)} busy={busy} />}
    >
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <StatTile
            label="待考 / 进行中"
            value={data?.todoExams ?? null}
            unit="场"
            tone="orange"
            loading={board.loading}
            error={board.error}
            hint={`已发布 ${openExams} 场 · 所在班级 ${fmtInt(data?.classes)} 个`}
            onClick={() => navigate('/tasks?tab=exam')}
            title="去我的任务"
          />
        </Col>
        <Col xs={12} md={6}>
          <StatTile
            label="我已交卷"
            value={data?.answers ?? null}
            unit="份"
            loading={board.loading}
            error={board.error}
            hint={`最高分 ${fmtDecimal(data?.bestScore, 1)}`}
            onClick={() => navigate('/tasks?tab=exam')}
            title="去我的任务"
          />
        </Col>
        <Col xs={12} md={6}>
          <StatTile
            label="平均分"
            value={data?.avgScore ?? null}
            unit="分"
            loading={board.loading}
            error={board.error}
            hint={`练习 ${fmtInt(data?.practiceCount)} 次`}
          />
        </Col>
        <Col xs={12} md={6}>
          <StatTile
            label="练习做题数"
            value={data?.practiceQuestions ?? null}
            unit="道"
            tone="orange"
            loading={board.loading}
            error={board.error}
            hint={<LinkAction onClick={() => navigate('/tasks?tab=practice')}>打开练习记录 →</LinkAction>}
            onClick={() => navigate('/tasks?tab=practice')}
            title="去练习记录"
          />
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col span={24}>
          <Panel
            title="我的成绩走势"
            extra={<span style={NOTE}>最近 {score.values.length} 次作答（没有分数的日子断开）</span>}
          >
            <AreaTrend
              data={score.values}
              labels={score.labels}
              tooltipLabels={score.tooltips}
              unit="分"
              height={190}
              format={(value) => fmtDecimal(value, 0)}
              loading={board.loading}
              error={board.error}
            />
          </Panel>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col span={24}>
          <Panel
            title="考试安排"
            extra={<span style={NOTE}>共 {projects.length} 个，显示前 5 个</span>}
            note={projectsError}
          >
            <Table<ProjectView>
              rowKey="id"
              size="small"
              pagination={false}
              loading={projectsLoading}
              scroll={{ x: 520 }}
              dataSource={projects.slice(0, 5)}
              locale={{ emptyText: '暂时没有安排给你的考试' }}
              columns={[
                { title: '考试', dataIndex: 'name', render: (_: unknown, row) => row.name || '(未命名)' },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 100,
                  render: (_: unknown, row) =>
                    row.status === 1 ? <Tag color="success">已发布</Tag> : <Tag>未发布</Tag>,
                },
                {
                  title: '操作',
                  width: 90,
                  render: (_: unknown, row) =>
                    canAnswer ? (
                      <LinkAction onClick={() => navigate(`/s/${row.id}`)}>开始答题</LinkAction>
                    ) : (
                      <span style={{ fontSize: 11, ...SOFT }}>未开放</span>
                    ),
                },
              ]}
            />
          </Panel>
        </Col>
      </Row>
    </Shell>
  );
}

/**
 * 首页分发：门户权限决定视角，教学首页还要叠加接口权限。
 *
 * <p>TeacherHome 会请求 /api/teaching/projects（要 project:report）；只配了 portal:teacher
 * 的账号进来只会整页报错，所以这里必须 portal:teacher + project:report 才渲染教师首页。
 * 学员预设也带 project:report，因此只看 report 会把学员误判成老师，必须两个条件一起判。
 */
export default function Dashboard({ authorities }: { authorities: string[] }) {
  const has = (code: string) => authorities.includes(code) || authorities.includes('ROLE_admin');
  if (has(PERMISSION_CODES.portalAdmin)) return <AdminHome />;
  if (can(authorities, PERMISSION_CODES.portalTeacher) && can(authorities, PERMISSION_CODES.projectReport)) {
    return <TeacherHome />;
  }
  return <StudentHome authorities={authorities} />;
}
