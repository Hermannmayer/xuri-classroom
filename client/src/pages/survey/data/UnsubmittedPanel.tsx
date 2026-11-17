/**
 * 未交名单：数据页把「交卷状态」切成「未交」时，列表位置换成这块。
 *
 * <p>数据来自 /api/teaching/classes/unsubmitted（班级在册学员 减 本卷已交答卷），
 * 跟答卷列表不是同一份数据，所以这里单独取数：没有班级就无从统计，直接给提示而不是发一个必然失败的请求。
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Empty, Space, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { get } from '../../../api';
import { EMPTY } from './format';

/** 与后端 UnsubmittedMemberView 对齐 */
interface UnsubmittedMember {
  id: string;
  name?: string;
  phone?: string;
}

/**
 * 与后端 UnsubmittedStudentView 对齐。
 *
 * <p>total / submitted 都是**班级全体**口径，list 只放没交的人（后端最多回 500 条，
 * 所以 list.length 不一定是全部未交人数，展示时以 total - submitted 为准）。
 */
interface UnsubmittedResult {
  /** 班级学员总数（主组 + 兼报组） */
  total?: number;
  /** 其中已在项目里正式交卷的人数 */
  submitted?: number;
  list?: UnsubmittedMember[];
}

/** 复制到剪贴板的文本：制表符分隔，粘进 Excel / 微信都能直接用 */
function toClipboardText(list: UnsubmittedMember[]): string {
  return ['姓名\t手机号', ...list.map((item) => `${item.name || ''}\t${item.phone || ''}`)].join('\n');
}

export default function UnsubmittedPanel({
  projectId,
  classId,
  mobile,
}: {
  projectId: string;
  /** 空 = 没选班级，无从统计 */
  classId?: string;
  mobile: boolean;
}) {
  const { message } = App.useApp();
  const [list, setList] = useState<UnsubmittedMember[]>([]);
  const [submitted, setSubmitted] = useState(0);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!projectId || !classId) {
      setList([]);
      setSubmitted(0);
      setTotal(undefined);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const res = await get<UnsubmittedResult>('/api/teaching/classes/unsubmitted', {
        projectId,
        deptId: classId,
      });
      const rows = Array.isArray(res?.list) ? res.list : [];
      setList(rows);
      setSubmitted(res?.submitted ?? 0);
      setTotal(typeof res?.total === 'number' ? res.total : undefined);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      setList([]);
      setSubmitted(0);
      setTotal(undefined);
    } finally {
      setLoading(false);
    }
  }, [projectId, classId]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async () => {
    const text = toClipboardText(list);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('浏览器不支持剪贴板');
      await navigator.clipboard.writeText(text);
      message.success(`已复制 ${list.length} 人的名单`);
    } catch {
      // 非 https / 旧浏览器拿不到剪贴板权限：给一条可自己选的提示，别假装复制成功
      message.warning('当前环境不能自动复制，请手动选择表格内容');
    }
  };

  const columns: ColumnsType<UnsubmittedMember> = [
    {
      title: '#',
      key: 'index',
      width: 52,
      align: 'center',
      render: (_: unknown, __: UnsubmittedMember, index: number) => (
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>{index + 1}</span>
      ),
    },
    {
      title: '姓名',
      dataIndex: 'name',
      render: (value?: string) => <span style={{ fontSize: 12 }}>{value || EMPTY}</span>,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 150,
      render: (value?: string) => <span style={{ fontSize: 12 }}>{value || EMPTY}</span>,
    },
  ];

  /**
   * 未交人数：班级全体口径（total - submitted）。名单被后端截断（>500 人）时 list.length 偏小，
   * 用 max 兜一下，至少不会比实际列出的人还少。
   */
  const unsubmittedCount = total === undefined ? list.length : Math.max(total - submitted, list.length);

  if (!classId) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="先在上面选一个班级，才能看到谁还没交"
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <Space size={6} wrap>
          <Tag color="warning" style={{ marginInlineEnd: 0 }}>
            共 {unsubmittedCount} 人未交
          </Tag>
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
            {total !== undefined ? `班级 ${total} 人 · ` : ''}已交 {submitted} 人
            {list.length < unsubmittedCount ? ` · 只列出前 ${list.length} 条` : ''}
          </span>
        </Space>
        <div style={{ flex: 1 }} />
        <Button size={mobile ? 'middle' : 'small'} icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
        <Button
          size={mobile ? 'middle' : 'small'}
          icon={<CopyOutlined />}
          disabled={list.length === 0}
          onClick={() => void copy()}
        >
          复制名单
        </Button>
      </div>

      {error ? (
        <Alert type="error" showIcon title={error} />
      ) : (
        <Spin spinning={loading}>
          <Table<UnsubmittedMember>
            rowKey="id"
            size="small"
            dataSource={list}
            columns={columns}
            pagination={list.length > 20 ? { pageSize: 20, size: 'small', showSizeChanger: false } : false}
            scroll={{ x: 320 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="这个班的人都交了"
                />
              ),
            }}
          />
        </Spin>
      )}
    </div>
  );
}
