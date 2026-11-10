import { useCallback, useEffect, useState } from 'react';
import { App, Card, Col, Row, Spin, Statistic, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { get, getWithPagination, listProjects } from '../../api';
import type { ProjectView } from '../../api';
import { can } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';

const fmtScore = (v?: number | null) => (v === null || v === undefined ? '—' : v.toFixed(1));

function Shell({ eyebrow, title, desc, children }: { eyebrow: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>{eyebrow}</div>
        <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
          {title}
        </h2>
        <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>{desc}</div>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ 学员 */

interface MyReportRow {
  projectId: string;
  projectName?: string;
  attempts?: number;
  bestScore?: number | null;
}

export function StudentHome({ authorities }: { authorities: string[] }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const canAnswer = can(authorities, PERMISSION_CODES.projectAnswer);
  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [report, setReport] = useState<MyReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        listProjects({ current: 1, pageSize: 50 }).catch(() => ({ data: [] as ProjectView[], total: 0 })),
        get<MyReportRow[]>('/api/my-report/list').catch(() => [] as MyReportRow[]),
      ]);
      setProjects((p.data ?? []).filter((row) => row.mode !== 'folder'));
      setReport(r ?? []);
    } catch (e) {
      message.error((e as Error).message || '读取首页数据失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = projects.filter((p) => p.status === 1).length;
  const avg = report.length
    ? report.reduce((sum, r) => sum + (r.bestScore ?? 0), 0) / report.filter((r) => r.bestScore != null).length || 0
    : 0;

  return (
    <Shell eyebrow="HOME / 学员" title="我的学习" desc="待考考试、练习入口和最近的成绩，都在这里。">
      <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
        <Col xs={12} md={6}>
          <Card className="bp-corners" size="small">
            <Statistic title="待考 / 进行中" value={open} suffix="场" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="bp-corners" size="small">
            <Statistic title="我已交卷" value={report.length} suffix="场" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="bp-corners" size="small">
            <Statistic title="最高分平均" value={Number.isFinite(avg) ? avg.toFixed(1) : '—'} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="bp-corners" size="small">
            <Statistic title="练习记录" value="去练习" valueStyle={{ fontSize: 18 }} />
            <a style={{ fontSize: 12 }} onClick={() => navigate('/tasks?tab=practice')}>
              打开练习记录 →
            </a>
          </Card>
        </Col>
      </Row>

      <Card className="bp-corners" size="small" title="考试安排">
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : (
          <Table<ProjectView>
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={projects.slice(0, 5)}
            locale={{ emptyText: '暂时没有安排给你的考试' }}
            columns={[
              { title: '考试', dataIndex: 'name', render: (_: unknown, r) => r.name || '(未命名)' },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (_: unknown, r) => (r.status === 1 ? <Tag color="success">已发布</Tag> : <Tag>未发布</Tag>),
              },
              {
                title: '操作',
                width: 90,
                render: (_: unknown, r) =>
                  canAnswer ? (
                    <a onClick={() => navigate(`/s/${r.id}`)}>开始答题</a>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>未开放</span>
                  ),
              },
            ]}
          />
        )}
      </Card>
    </Shell>
  );
}

/* ------------------------------------------------------------------ 老师 */

interface TeachingProject {
  projectId: string;
  projectName?: string;
  status?: number;
  answerCount?: number;
  avgScore?: number | null;
}

export function TeacherHome() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState<TeachingProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<TeachingProject[]>('/api/teaching/projects')
      .then((list) => setRows(list ?? []))
      .catch((e: Error) => message.error(e.message || '读取教学数据失败'))
      .finally(() => setLoading(false));
  }, [message]);

  const published = rows.filter((r) => r.status === 1).length;
  const answers = rows.reduce((sum, r) => sum + (r.answerCount ?? 0), 0);
  const scored = rows.filter((r) => r.avgScore != null && (r.answerCount ?? 0) > 0);
  const avg = scored.length ? scored.reduce((s, r) => s + (r.avgScore ?? 0), 0) / scored.length : null;

  return (
    <Shell
      eyebrow="HOME / 教师"
      title="我的教学"
      desc="我发布/参与的考试、收集到的答卷和得分情况。"
    >
      <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
        <Col xs={12} md={6}>
          <Card className="bp-corners" size="small">
            <Statistic title="已发布" value={published} suffix={`/ ${rows.length} 场`} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="bp-corners" size="small">
            <Statistic title="累计收集答卷" value={answers} suffix="份" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="bp-corners" size="small">
            <Statistic title="平均分（有答卷的场次）" value={avg === null ? '—' : avg.toFixed(1)} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="bp-corners" size="small">
            <Statistic title="班级学情" value="查看" valueStyle={{ fontSize: 18 }} />
            <a style={{ fontSize: 12 }} onClick={() => navigate('/teaching?tab=insight')}>
              按班级看作答 →
            </a>
          </Card>
        </Col>
      </Row>

      <Card className="bp-corners" size="small" title="我发布的考试（收集情况）">
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : (
          <Table<TeachingProject>
            rowKey="projectId"
            size="small"
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            dataSource={rows}
            locale={{ emptyText: '还没有发布过考试' }}
            columns={[
              { title: '考试', dataIndex: 'projectName', render: (_: unknown, r) => r.projectName || '(未命名)' },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (_: unknown, r) => (r.status === 1 ? <Tag color="success">已发布</Tag> : <Tag>未发布</Tag>),
              },
              { title: '收集答卷', dataIndex: 'answerCount', width: 110, render: (v?: number) => v ?? 0 },
              { title: '平均分', dataIndex: 'avgScore', width: 100, render: (v?: number | null) => fmtScore(v) },
              {
                title: '操作',
                width: 130,
                render: (_: unknown, r) => (
                  <>
                    <a onClick={() => navigate(`/survey/${r.projectId}`)}>数据</a>
                    <span style={{ margin: '0 6px', color: 'var(--bp-line)' }}>|</span>
                    <a onClick={() => navigate('/teaching?tab=insight')}>按班级</a>
                  </>
                ),
              },
            ]}
          />
        )}
      </Card>
    </Shell>
  );
}

/* ------------------------------------------------------------------ 管理员 */

export function AdminHome() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [stat, setStat] = useState({ users: 0, repos: 0, projects: 0, answers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getWithPagination('/api/system/user/list', { current: 1, pageSize: 1 }).catch(() => ({ total: 0 })),
      getWithPagination('/api/repo/list', { current: 1, pageSize: 1 }).catch(() => ({ total: 0 })),
      listProjects({ current: 1, pageSize: 1 }).catch(() => ({ total: 0 })),
      get<TeachingProject[]>('/api/teaching/projects').catch(() => [] as TeachingProject[]),
    ])
      .then(([u, rp, pj, tj]) => {
        setStat({
          users: u.total ?? 0,
          repos: rp.total ?? 0,
          projects: pj.total ?? 0,
          answers: (tj ?? []).reduce((s, x) => s + (x.answerCount ?? 0), 0),
        });
      })
      .catch((e: Error) => message.error(e.message || '读取系统数据失败'))
      .finally(() => setLoading(false));
  }, [message]);

  return (
    <Shell eyebrow="HOME / 管理员" title="系统概览" desc="全站规模与入口。">
      <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
        {[
          { title: '用户', value: stat.users, to: '/system/user' },
          { title: '题库', value: stat.repos, to: '/repo/index' },
          { title: '考试 / 问卷', value: stat.projects, to: '/teaching?tab=exam' },
          { title: '累计答卷', value: stat.answers, to: '/teaching?tab=insight' },
        ].map((item) => (
          <Col xs={12} md={6} key={item.title}>
            <Card className="bp-corners" size="small" hoverable onClick={() => navigate(item.to)}>
              <Statistic title={item.title} value={loading ? '—' : item.value} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card className="bp-corners" size="small" title="常用入口">
        <Row gutter={[12, 12]}>
          {[
            { label: '权限配置', to: '/system/permissions' },
            { label: '用户管理', to: '/system/user' },
            { label: '用户组', to: '/system/group' },
            { label: '系统设置', to: '/system/setting' },
            { label: '操作日志', to: '/system/audit' },
            { label: '教学管理', to: '/teaching?tab=exam' },
          ].map((item) => (
            <Col xs={12} md={8} key={item.to}>
              <a onClick={() => navigate(item.to)}>{item.label} →</a>
            </Col>
          ))}
        </Row>
      </Card>
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
  if (can(authorities, PERMISSION_CODES.portalTeacher) && can(authorities, PERMISSION_CODES.projectReport)) return <TeacherHome />;
  return <StudentHome authorities={authorities} />;
}
