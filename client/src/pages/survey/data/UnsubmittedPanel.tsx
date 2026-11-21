/**
 * 未交名单：数据页把「交卷状态」切成「未交」时，列表位置换成这块。
 *
 * <p>数据来自 /api/teaching/classes/unsubmitted（班级在册学员 减 本卷已交答卷），

 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Empty, Space, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { get } from '../../../api';
import { EMPTY } from './format';


interface UnsubmittedMember {
  id: string;
  name?: string;
  phone?: string;
}







interface UnsubmittedResult {

  total?: number;

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
