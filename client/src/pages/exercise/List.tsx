import { useCallback, useEffect, useState } from 'react';
import { Button, Empty, message, Pagination, Popconfirm, Progress, Segmented, Select, Space, Spin, Table, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getWithPagination, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import { pager, TABLE_COMPONENTS } from '../repo/table';

/** 与后端 ExerciseView 对齐 */
interface ExerciseView {
  id: string;
  projectName?: string;
  tempSave?: number;
  percent?: number;
  createAt?: string;
  examExerciseType?: string;
  repoId?: string;
  projectId?: string;
}

const TYPE_LABEL: Record<string, string> = {
  R: '随机练习',
  O: '顺序练习',
  W: '错题练习',
};

const TYPE_COLOR: Record<string, string> = {
  R: 'blue',
  O: 'default',
  W: 'orange',
};

/** 后端按 Answer.tempSave 过滤：0 暂存/进行中，1 已完成 */
type StatusFilter = 'all' | '0' | '1';

const MOBILE_QUERY = '(max-width: 767.98px)';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

function PracticeRecords() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [rows, setRows] = useState<ExerciseView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithPagination<ExerciseView>('/api/exercise/list', {
        current: page,
        pageSize,
        tempSave: status === 'all' ? undefined : Number(status),
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const enter = (row: ExerciseView) => {
    const target = row.repoId || row.projectId;
    if (!target) {
      message.warning('这条记录缺少题库信息，无法进入练习');
      return;
    }
    navigate(`/exercise/${target}`);
  };

  const remove = async (row: ExerciseView) => {
    try {
      await post<void>('/api/exercise/delete', { ids: [row.id] });
      message.success('已删除练习记录');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const emptyNode = (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有练习记录">
      <Button type="primary" onClick={() => navigate('/repo/index')}>
        去题库挑一套
      </Button>
    </Empty>
  );

  return (
    <>
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            PRACTICE / 我的练习
          </div>
          <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
            练习记录
          </h2>
          <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
            接着上次的进度继续练习；删除记录后不可恢复。
          </div>
        </div>
      </div>

      <hr className="bp-dim" style={{ margin: '0 0 16px' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {total} 条练习记录</span>
        <div style={{ flex: 1 }} />
        <Space size={8}>
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>状态</span>
          <Select<StatusFilter>
            value={status}
            style={{ width: 140 }}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '进行中', value: '0' },
              { label: '已完成', value: '1' },
            ]}
          />
        </Space>
      </div>

      {isMobile ? (
        <>
          <Spin spinning={loading}>
            {rows.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="bp-card"
                    style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 14,
                        }}
                        onClick={() => enter(row)}
                      >
                        {row.projectName || '(未命名练习)'}
                      </a>
                      {row.examExerciseType && (
                        <Tag color={TYPE_COLOR[row.examExerciseType] ?? 'default'}>
                          {TYPE_LABEL[row.examExerciseType] ?? row.examExerciseType}
                        </Tag>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Progress percent={row.percent ?? 0} size="small" style={{ flex: 1, minWidth: 0 }} />
                      <Tag color={row.tempSave === 1 ? 'blue' : 'orange'}>
                        {row.tempSave === 1 ? '已完成' : '进行中'}
                      </Tag>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        style={{ flex: 1, height: 38, paddingInline: 0 }}
                        onClick={() => enter(row)}
                      >
                        {row.tempSave === 1 ? '查看' : '继续练习'}
                      </Button>
                      <Popconfirm
                        title="删除这条练习记录？"
                        description="删除后不可恢复。"
                        okText="删除"
                        cancelText="取消"
                        onConfirm={() => remove(row)}
                      >
                        <Button danger style={{ flex: 1, height: 38, paddingInline: 0 }}>
                          删除
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              emptyNode
            )}
          </Spin>
          {rows.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 12,
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {total} 条练习记录</span>
              {total > pageSize && (
                <Pagination
                  simple
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={(p, s) => {
                    setPage(p);
                    setPageSize(s);
                  }}
                />
              )}
            </div>
          )}
        </>
      ) : (
      <Table<ExerciseView>
        rowKey="id"
        size="middle"
        components={TABLE_COMPONENTS}
        loading={loading}
        dataSource={rows}
        scroll={{ x: 820 }}
        locale={{ emptyText: emptyNode }}
        pagination={pager(page, pageSize, total, setPage, setPageSize, (n) => `共 ${n} 条练习记录`)}
        columns={[
          {
            title: '名称',
            dataIndex: 'projectName',
            render: (_: unknown, row) => (
              <a onClick={() => enter(row)}>{row.projectName || '(未命名练习)'}</a>
            ),
          },
          {
            title: '练习类型',
            dataIndex: 'examExerciseType',
            width: 120,
            render: (t) =>
              t ? <Tag color={TYPE_COLOR[t] ?? 'default'}>{TYPE_LABEL[t] ?? t}</Tag> : '—',
          },
          {
            title: '进度',
            dataIndex: 'percent',
            width: 190,
            render: (p) => <Progress percent={p ?? 0} size="small" />,
          },
          {
            title: '状态',
            dataIndex: 'tempSave',
            width: 100,
            render: (v) => (
              <Tag color={v === 1 ? 'blue' : 'orange'}>{v === 1 ? '已完成' : '进行中'}</Tag>
            ),
          },
          {
            title: '练习时间',
            dataIndex: 'createAt',
            width: 170,
            render: (v) => v || '—',
          },
          {
            title: '操作',
            width: 170,
            render: (_: unknown, row) => (
              <Space size={4}>
                <a onClick={() => enter(row)}>{row.tempSave === 1 ? '查看' : '继续练习'}</a>
                <Popconfirm
                  title="删除这条练习记录？"
                  description="删除后不可恢复。"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => remove(row)}
                >
                  <a style={{ color: 'var(--bp-orange)' }}>删除</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      )}
    </>
  );
}

/* ---------------------------------------------------------------- 学员：我的任务 */

interface ProjectTask {
  id: string;
  name?: string;
  mode?: string;
  status?: number;
  setting?: { submittedSetting?: { enableUpdate?: boolean } };
}

type TaskFilter = 'all' | 'exam' | 'survey' | 'unfinished';

const TASK_TYPE_LABEL: Record<string, string> = {
  exam: '考试',
  survey: '问卷',
};

const taskAnswerKey = (id: string) => `sk-answer-${id}`;
const taskDraftKey = (id: string) => `sk-draft-${id}`;

function taskState(id: string): 'done' | 'doing' | 'none' {
  try {
    if (localStorage.getItem(taskAnswerKey(id))) return 'done';
    if (localStorage.getItem(taskDraftKey(id))) return 'doing';
  } catch {
    // localStorage 不可用时按未开始处理
  }
  return 'none';
}

function taskAnswerId(id: string): string | undefined {
  try {
    return localStorage.getItem(taskAnswerKey(id)) ?? undefined;
  } catch {
    return undefined;
  }
}

/** 学员视角：展示被班级/个人授权的考试与问卷，而不是练习记录 */
function StudentTasks() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [scores, setScores] = useState<Record<string, number | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithPagination<ProjectTask>('/api/project/list', {
        current: 1,
        pageSize: 200,
      });
      const list = res.data.filter((item) => item.mode === 'exam' || item.mode === 'survey');
      setTasks(list);

      const done = list
        .map((task) => ({ task, answerId: taskAnswerId(task.id) }))
        .filter((item): item is { task: ProjectTask; answerId: string } => Boolean(item.answerId));
      const scorePairs = await Promise.all(
        done.map(async ({ task, answerId }) => {
          try {
            const result = await post<{ examScore?: number }>('/api/public/loadExamResult', {
              id: task.id,
              answerId,
            });
            return [task.id, result?.examScore] as const;
          } catch {
            return [task.id, undefined] as const;
          }
        }),
      );
      setScores(Object.fromEntries(scorePairs));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = tasks.filter((task) => {
    if (filter === 'exam' && task.mode !== 'exam') return false;
    if (filter === 'survey' && task.mode !== 'survey') return false;
    if (filter === 'unfinished' && taskState(task.id) === 'done') return false;
    return true;
  });
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const start = (task: ProjectTask) => navigate(`/s/${task.id}`);
  const viewScore = (task: ProjectTask) => {
    const answerId = taskAnswerId(task.id);
    if (!answerId) return;
    if (task.mode === 'exam') navigate(`/s/${task.id}/exam-result/${answerId}`);
    else navigate(`/s/${task.id}/${answerId}`);
  };

  const stateTag = (task: ProjectTask) => {
    const state = taskState(task.id);
    if (state === 'done') return <Tag color="blue">已完成</Tag>;
    if (state === 'doing') return <Tag color="orange">进行中</Tag>;
    return <Tag>未开始</Tag>;
  };

  const answerInfo = (task: ProjectTask) => {
    const state = taskState(task.id);
    if (state === 'done') {
      const score = scores[task.id];
      return score == null ? '已提交（成绩见成绩页）' : `已提交 · ${score} 分`;
    }
    return state === 'doing' ? '有未提交草稿' : '未作答';
  };

  const actions = (task: ProjectTask, mobile = false) => {
    const state = taskState(task.id);
    const retry = Boolean(task.setting?.submittedSetting?.enableUpdate);
    const btnStyle = mobile ? { flex: 1, height: 38, paddingInline: 0 } : undefined;
    if (state === 'done') {
      return (
        <Space size={4} wrap>
          <Button size={mobile ? 'middle' : 'small'} style={btnStyle} onClick={() => viewScore(task)}>
            查看成绩
          </Button>
          {retry && (
            <Button size={mobile ? 'middle' : 'small'} type="primary" style={btnStyle} onClick={() => start(task)}>
              再考一次
            </Button>
          )}
        </Space>
      );
    }
    return (
      <Button size={mobile ? 'middle' : 'small'} type="primary" style={btnStyle} onClick={() => start(task)}>
        开始答题
      </Button>
    );
  };

  const empty = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分配给你的考试或问卷" />;

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
          TASKS / 我的任务
        </div>
        <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
          我的任务
        </h2>
        <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
          这里是你被授权的考试与问卷；完成后可以查看成绩。
        </div>
      </div>

      <hr className="bp-dim" style={{ margin: '0 0 16px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {filtered.length} 项任务</span>
        <div style={{ flex: 1 }} />
        <Segmented<TaskFilter>
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          options={[
            { label: '全部', value: 'all' },
            { label: '考试', value: 'exam' },
            { label: '问卷', value: 'survey' },
            { label: '未完成', value: 'unfinished' },
          ]}
        />
      </div>

      {isMobile ? (
        <>
          <Spin spinning={loading}>
            {paged.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {paged.map((task) => (
                  <div key={task.id} className="bp-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a style={{ flex: 1, minWidth: 0, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => start(task)}>
                        {task.name || '(未命名)'}
                      </a>
                      <Tag color={task.mode === 'exam' ? 'orange' : 'blue'}>{TASK_TYPE_LABEL[task.mode || ''] ?? task.mode}</Tag>
                      {stateTag(task)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>{answerInfo(task)}</div>
                    <div style={{ display: 'flex', gap: 8 }}>{actions(task, true)}</div>
                  </div>
                ))}
              </div>
            ) : (
              empty
            )}
          </Spin>
          {filtered.length > pageSize && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Pagination simple current={page} pageSize={pageSize} total={filtered.length} onChange={(p, s) => { setPage(p); setPageSize(s); }} />
            </div>
          )}
        </>
      ) : (
        <Table<ProjectTask>
          rowKey="id"
          size="middle"
          components={TABLE_COMPONENTS}
          loading={loading}
          dataSource={paged}
          locale={{ emptyText: empty }}
          pagination={pager(page, pageSize, filtered.length, setPage, setPageSize, (n) => `共 ${n} 项任务`)}
          columns={[
            {
              title: '名称',
              dataIndex: 'name',
              render: (_: unknown, task) => <a onClick={() => start(task)}>{task.name || '(未命名)'}</a>,
            },
            {
              title: '类型',
              dataIndex: 'mode',
              width: 110,
              render: (mode) => <Tag color={mode === 'exam' ? 'orange' : 'blue'}>{TASK_TYPE_LABEL[mode] ?? mode ?? '—'}</Tag>,
            },
            { title: '状态', width: 110, render: (_: unknown, task) => stateTag(task) },
            { title: '答题情况', dataIndex: 'id', render: (_: unknown, task) => answerInfo(task) },
            {
              title: '操作',
              width: 210,
              render: (_: unknown, task) => actions(task),
            },
          ]}
        />
      )}
    </>
  );
}

export default function ExerciseList() {
  const [authorities, setAuthorities] = useState<string[]>();

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  if (!authorities) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  // 有 project:create = 老师/管理员，保留练习记录；否则是学员的「我的任务」
  return can(authorities, 'project:create') ? <PracticeRecords /> : <StudentTasks />;
}
