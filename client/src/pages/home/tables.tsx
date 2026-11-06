import { Empty, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import type { ProjectView } from '../../api';

/** 后端 MyTaskView：答题记录。时间是毫秒时间戳，空值 Jackson 不返回 */
export interface MyTask {
  id: string;
  projectId?: string;
  answerId?: string;
  name?: string;
  startTime?: number;
  endTime?: number;
  examScore?: number;
  examTotal?: number;
}

const SOFT = { color: 'var(--bp-text-soft)' } as const;

/** 项目列表的 createAt 是 'yyyy-MM-dd HH:mm:ss' 字符串，答题记录是毫秒时间戳 */
function fmtTime(v?: string | number) {
  if (v === undefined || v === null || v === '') return '—';
  return typeof v === 'number' ? dayjs(v).format('YYYY-MM-DD HH:mm') : String(v);
}

const smallPager = (rows: unknown[]) =>
  rows.length > 10 ? { pageSize: 10, size: 'small' as const, showSizeChanger: false } : false;

/** 「我的考试 / 我的问卷」：我有权限的项目 */
export function ProjectTable({
  rows,
  loading,
  label,
  canManage = true,
}: {
  rows: ProjectView[];
  loading: boolean;
  label: '考试' | '问卷';
  /** 有 project:create 的是管理视角（编辑/数据），否则是学员视角（去答题） */
  canManage?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <Table<ProjectView>
      rowKey="id"
      size="middle"
      loading={loading}
      dataSource={rows}
      scroll={{ x: 640 }}
      pagination={smallPager(rows)}
      locale={{
        emptyText: (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`还没有${label}，去「我的项目」新建`} />
        ),
      }}
      columns={[
        {
          title: `${label}名称`,
          dataIndex: 'name',
          render: (_: unknown, row) => (
            <>
              <a onClick={() => navigate(`/survey/${row.id}`)}>{row.name || '(未命名)'}</a>
              <span style={{ ...SOFT, fontSize: 11, marginLeft: 8 }}>{row.total ?? 0} 份答卷</span>
            </>
          ),
        },
        { title: '创建时间', dataIndex: 'createAt', width: 170, render: (v?: string) => fmtTime(v) },
        {
          title: '状态',
          dataIndex: 'status',
          width: 100,
          render: (v?: number) => (
            <Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '已发布' : '未发布'}</Tag>
          ),
        },
        {
          title: '操作',
          width: 140,
          render: (_: unknown, row) =>
            canManage ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <a onClick={() => navigate(`/survey/${row.id}/edit`)}>编辑</a>
                <a onClick={() => navigate(`/survey/${row.id}/data`)}>数据</a>
              </div>
            ) : (
              <a onClick={() => navigate(`/s/${row.id}`)}>去答题</a>
            ),
        },
      ]}
    />
  );
}

/** 「问卷记录 / 考试记录」：自己交过的答卷，考试多显示得分 */
export function RecordTable({
  rows,
  loading,
  exam,
}: {
  rows: MyTask[];
  loading: boolean;
  exam?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <Table<MyTask>
      rowKey="id"
      size="middle"
      loading={loading}
      dataSource={rows}
      scroll={{ x: 640 }}
      pagination={smallPager(rows)}
      locale={{
        emptyText: (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`还没有作答过${exam ? '考试' : '问卷'}`} />
        ),
      }}
      columns={[
        {
          title: exam ? '考试名称' : '问卷名称',
          dataIndex: 'name',
          render: (name?: string) => name || '(未命名)',
        },
        { title: '开始时间', dataIndex: 'startTime', width: 170, render: (v?: number) => fmtTime(v) },
        {
          title: '完成状态',
          width: exam ? 190 : 110,
          render: (_: unknown, row) => (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <Tag color="success">已完成</Tag>
              {exam && (
                <span style={{ color: 'var(--bp-orange)', fontSize: 13 }}>
                  {row.examScore ?? '—'}
                  {row.examTotal != null ? ` / ${row.examTotal}` : ''} 分
                </span>
              )}
            </div>
          ),
        },
        {
          title: '操作',
          width: 110,
          render: (_: unknown, row) => (
            <a
              onClick={() =>
                navigate(
                  exam
                    ? `/s/${row.projectId}/exam-result/${row.answerId}`
                    : `/s/${row.projectId}/${row.answerId}`,
                )
              }
            >
              {exam ? '查看结果' : '查看答案'}
            </a>
          ),
        },
      ]}
    />
  );
}
