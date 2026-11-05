import { useCallback, useEffect, useState } from 'react';
import { Avatar, Button, Card, Col, message, Row, Statistic, Tabs } from 'antd';
import { EditOutlined, FormOutlined } from '@ant-design/icons';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getWithPagination, listProjects } from '../api';
import type { ProjectView, SystemInfo, UserInfo } from '../api';
import { t } from '../i18n';
import { ProjectTable, RecordTable } from './home/tables';
import type { MyTask } from './home/tables';

const CARD_STYLE = { border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' } as const;
const CHIP_STYLE = {
  border: '1px solid var(--bp-line-soft)',
  padding: '1px 8px',
  fontSize: 10,
  letterSpacing: '0.12em',
  color: 'var(--bp-text-soft)',
} as const;

/** 旧版的时段问候：凌晨/早上/上午/中午/下午/傍晚/晚上/夜里 */
const GREETINGS: [number, string][] = [
  [6, 'dawn'],
  [9, 'morning'],
  [11, 'forenoon'],
  [13, 'noon'],
  [17, 'afternoon'],
  [19, 'dusk'],
  [23, 'night'],
];

function greeting() {
  const h = new Date().getHours();
  const key = GREETINGS.find(([limit]) => h < limit)?.[1] ?? 'midnight';
  return t(`pages.home.greeting.${key}`, '你好');
}

export default function Home() {
  const { user, system } = useOutletContext<{ user?: UserInfo; system?: SystemInfo }>();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<{ exam: ProjectView[]; survey: ProjectView[] }>({
    exam: [],
    survey: [],
  });
  const [totals, setTotals] = useState<{ exam: number; survey: number }>({ exam: 0, survey: 0 });
  const [records, setRecords] = useState<{ exam: MyTask[]; survey: MyTask[] }>({ exam: [], survey: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // 四个请求互不依赖，任何一个挂了都只提示一次，页面骨架照常渲染
    // ponytail: 首页只取前 50 个项目 / 20 条记录，再多需要翻页就接 Table 的远程分页
    const errors: string[] = [];
    const safe = <T,>(p: Promise<T>) =>
      p.catch((e: unknown) => {
        errors.push((e as Error).message);
        return undefined;
      });
    const [exam, survey, examRec, surveyRec] = await Promise.all([
      safe(listProjects({ mode: 'exam', pageSize: 50 })),
      safe(listProjects({ mode: 'survey', pageSize: 50 })),
      safe(getWithPagination<MyTask>('/api/listHistoryTask', { type: 'exam', pageSize: 20 })),
      safe(getWithPagination<MyTask>('/api/listHistoryTask', { type: 'survey', pageSize: 20 })),
    ]);
    setProjects({ exam: exam?.data ?? [], survey: survey?.data ?? [] });
    setTotals({ exam: exam?.total ?? 0, survey: survey?.total ?? 0 });
    setRecords({ exam: examRec?.data ?? [], survey: surveyRec?.data ?? [] });
    if (errors.length) message.error(errors[0]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const name = user?.name || user?.userId || '访客';
  const items = [
    {
      key: 'exam',
      label: t('pages.home.todo.tab.myExams', '我的考试'),
      children: <ProjectTable rows={projects.exam} loading={loading} label="考试" />,
    },
    {
      key: 'survey',
      label: t('pages.home.todo.tab.mySurveys', '我的问卷'),
      children: <ProjectTable rows={projects.survey} loading={loading} label="问卷" />,
    },
    {
      key: 'surveyHistory',
      label: t('pages.home.todo.tab.surveyHistory', '问卷记录'),
      children: <RecordTable rows={records.survey} loading={loading} />,
    },
    {
      key: 'examHistory',
      label: t('pages.home.todo.tab.examHistory', '考试记录'),
      children: <RecordTable rows={records.exam} loading={loading} exam />,
    },
  ];

  return (
    <>
      <Card
        className="bp-corners"
        style={CARD_STYLE}
        styles={{ body: { padding: '18px 22px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Avatar
            shape="square"
            size={46}
            style={{
              background: 'rgba(74,144,217,0.25)',
              border: '1px solid var(--bp-line)',
              fontSize: 20,
              flex: '0 0 auto',
            }}
          >
            {name.slice(0, 1).toUpperCase()}
          </Avatar>

          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
              WELCOME / 概览
            </div>
            <h2 style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.04em' }}>
              {t('pages.home.welcome.message', '欢迎')
                .replace('{greeting}', greeting())
                .replace('{name}', name)}
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <span style={CHIP_STYLE}>后端 · 已连接</span>
              <span style={CHIP_STYLE}>组织 · {user?.deptName || '—'}</span>
              <span style={CHIP_STYLE}>权限 · {user?.authorityList?.length ?? 0} 项</span>
              <span style={CHIP_STYLE}>{system?.name || 'SURVEY KING'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
            <Statistic
              title={t('pages.home.statistic.survey', '问卷数')}
              value={totals.survey}
              loading={loading}
              valueStyle={{ fontSize: 26, color: 'var(--bp-text)' }}
            />
            <div style={{ borderLeft: '1px dashed var(--bp-line)', height: 40, margin: '0 22px' }} />
            <Statistic
              title={t('pages.home.statistic.exam', '考试数')}
              value={totals.exam}
              loading={loading}
              valueStyle={{ fontSize: 26, color: 'var(--bp-orange)' }}
            />
          </div>
        </div>
      </Card>

      <hr className="bp-dim" style={{ margin: '18px 0' }} />

      <Row gutter={[14, 14]}>
        <Col xs={24} xl={16}>
          <Card
            className="bp-corners"
            style={CARD_STYLE}
            title={<span className="bp-title" style={{ fontSize: 12 }}>TASKS / 我的任务</span>}
          >
            <Tabs
              items={items}
              tabBarGutter={20}
              tabBarExtraContent={{
                right: (
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <a onClick={() => void load()}>刷新</a>
                    <a onClick={() => navigate('/project')}>全部项目 →</a>
                  </div>
                ),
              }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            className="bp-corners"
            style={CARD_STYLE}
            title={
              <span className="bp-title" style={{ fontSize: 12 }}>
                QUICK START / 快速开始
              </span>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button block icon={<EditOutlined />} onClick={() => navigate('/project')}>
                {t('pages.home.quickStart.createSurvey', '创建问卷')}
              </Button>
              <Button block type="primary" icon={<FormOutlined />} onClick={() => navigate('/project')}>
                {t('pages.home.quickStart.createExam', '创建考试')}
              </Button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 12, lineHeight: 1.8 }}>
              新建后在「我的项目」里编辑题目、发布并查看数据。
            </div>

            <hr className="bp-dim" style={{ margin: '14px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <a onClick={() => navigate('/project')}>我的项目</a>
              <a onClick={() => navigate('/exercise')}>我的练习</a>
              <a onClick={() => navigate('/repo/index')}>题库中心</a>
              <a onClick={() => navigate('/account/settings')}>账号设置</a>
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
}
