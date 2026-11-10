import { useCallback, useEffect, useState } from 'react';
import { App, Card, Empty, Select, Spin, Table } from 'antd';
import { useNavigate } from 'react-router-dom';
import { get } from '../../api';
import LinkAction from '../../components/LinkAction';

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
 * 班级学情（老师视角）。
 *
 * <p>合并进教学页后不再有独立大标题和「我的考试」表格：
 * 顶部一个考试下拉（名称 + 状态/交卷/平均分摘要），下方是该场考试的班级分布。
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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="bp-title" style={{ fontSize: 13 }}>
          学情
        </span>
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
          选一场考试，看各班的交卷与平均分
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 30, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : projects.length === 0 ? (
        <Empty description="还没有你参与的考试">
          <LinkAction onClick={() => navigate('/teaching?tab=exam')}>去考试/问卷</LinkAction>
        </Empty>
      ) : (
        <>
          <Select
            style={{ width: '100%', maxWidth: 520, marginBottom: 12 }}
            value={activeId}
            onChange={(value: string) => setActiveId(value)}
            placeholder="选择考试"
            options={projects.map((project) => ({
              value: project.projectId,
              label:
                (project.projectName || '(未命名)') +
                ' · ' +
                (project.status === 1 ? '已发布' : '未发布') +
                ' · 交卷 ' +
                (project.answerCount ?? 0) +
                ' · 平均 ' +
                score(project.avgScore),
            }))}
          />

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
        </>
      )}
    </div>
  );
}
