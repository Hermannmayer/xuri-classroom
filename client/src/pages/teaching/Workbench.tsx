import { useCallback, useEffect, useState } from 'react';
import { App, Card, Empty, Spin, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { get } from '../../api';
import BackButton from '../../components/BackButton';
import TableScrollRegion from '../../components/TableScrollRegion';

interface TeachingProject {
  projectId: string;
  projectName?: string;
  status?: number;
  answerCount?: number;
  avgScore?: number | null;
}

interface TeachingClass {
  deptId?: string;
  deptName?: string;
  answerCount?: number;
  avgScore?: number | null;
}

const score = (v?: number | null) => (v === null || v === undefined ? '—' : v.toFixed(1));

/**
 * 教学工作台（老师视角）。
 *
 * 和学员的「我的任务」彻底分开：这里没有练习记录 / 我的成绩，
 * 只有「我参与的考试」和「每个班的作答情况」。
 */
export default function TeachingWorkbench() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<TeachingProject[]>([]);
  const [classes, setClasses] = useState<TeachingClass[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const list = await get<TeachingProject[]>('/api/teaching/projects');
      setProjects(list ?? []);
      if ((list ?? []).length > 0) setActiveId((list ?? [])[0].projectId);
    } catch (e) {
      message.error((e as Error).message || '读取考试列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!activeId) {
      setClasses([]);
      return;
    }
    setClassLoading(true);
    get<TeachingClass[]>('/api/teaching/classes', { projectId: activeId })
      .then((list) => setClasses(list ?? []))
      .catch((e: Error) => message.error(e.message || '读取班级统计失败'))
      .finally(() => setClassLoading(false));
  }, [activeId, message]);

  const active = projects.find((p) => p.projectId === activeId);

  return (
    <div style={{ maxWidth: 1200 }}>
      <BackButton to="/home" label="返回首页" style={{ marginBottom: 4 }} />
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>TEACHING / 教学工作台</div>
        <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
          班级学情
        </h2>
        <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
          我参与的考试，以及每个班（用户组）的作答情况。点一行看该场考试的班级分布。
        </div>
      </div>

      <Card className="bp-corners" size="small" title="我的考试" style={{ marginBottom: 14 }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : projects.length === 0 ? (
          <Empty description="还没有你参与的考试" />
        ) : (
          <TableScrollRegion label="我的考试（可横向滚动）">
            <Table<TeachingProject>
              rowKey="projectId"
              size="small"
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              dataSource={projects}
              rowClassName={(row) => (row.projectId === activeId ? 'bp-row-active' : '')}
              onRow={(row) => ({ onClick: () => setActiveId(row.projectId) })}
              columns={[
                { title: '考试', dataIndex: 'projectName', render: (_: unknown, r) => r.projectName || '(未命名)' },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 100,
                  render: (_: unknown, r) => (r.status === 1 ? <Tag color="success">已发布</Tag> : <Tag>未发布</Tag>),
                },
                { title: '交卷', dataIndex: 'answerCount', width: 90, render: (v?: number) => v ?? 0 },
                { title: '平均分', dataIndex: 'avgScore', width: 100, render: (v?: number | null) => score(v) },
                {
                  title: '操作',
                  width: 90,
                  render: (_: unknown, r) => (
                    <a
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/survey/${r.projectId}`);
                      }}
                    >
                      查看
                    </a>
                  ),
                },
              ]}
            />
          </TableScrollRegion>
        )}
      </Card>

      <Card
        className="bp-corners"
        size="small"
        title={active ? `班级分布：${active.projectName || '(未命名)'}` : '班级分布'}
      >
        {!activeId ? (
          <Empty description="先选一场考试" />
        ) : classLoading ? (
          <div style={{ padding: 30, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : classes.length === 0 ? (
          <Empty description="这场考试还没有人交卷" />
        ) : (
          <Table<TeachingClass>
            rowKey={(row) => row.deptId || row.deptName || 'none'}
            size="small"
            pagination={false}
            dataSource={classes}
            columns={[
              { title: '班级 / 用户组', dataIndex: 'deptName', render: (v?: string) => v || '未分组' },
              { title: '交卷', dataIndex: 'answerCount', width: 100, render: (v?: number) => v ?? 0 },
              { title: '平均分', dataIndex: 'avgScore', width: 120, render: (v?: number | null) => score(v) },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
