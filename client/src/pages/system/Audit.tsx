import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Empty, Select, Space, Table, Tag, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { get, getWithPagination } from '../../api';

interface AuditLog {
  id: string;
  action: string;
  /** 后端字典里的中文动作名；老数据/未收录时回退 action */
  actionName?: string;
  targetId?: string;
  targetName?: string;
  detail?: string;
  ip?: string;
  createBy?: string;
  operatorName?: string;
  createAt?: string;
}

interface ActionOption {
  code: string;
  name: string;
}

/** 后端字典没返回时的兜底：只保留最常见的几个，其余直接显示动作码 */
const FALLBACK_LABEL: Record<string, string> = {
  EXPORT_REPO: '导出题库',
  EXPORT_ANSWER: '导出答卷',
  IMPORT_REPO: '导入题库',
  AUTH_LOGIN: '登录成功',
  AUTH_LOGIN_FAILED: '登录失败',
};

const isFailed = (row: AuditLog) => (row.detail || '').includes('失败');

/**
 * 系统管理 → 操作日志。
 *
 * 后端 AuditLogView 已经补齐 actionName / targetName / operatorName：
 * - 动作：中文名，不再显示 SYSTEM_DEPT_DELETE 这类内部代码；
 * - 对象：可读名称，名称取不到时才回退 id；
 * - 操作人：用户姓名，取不到时回退 createBy。
 * 只有 system:log:list（默认仅管理员）能看到这个页面。
 */
export default function SystemAudit() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [action, setAction] = useState<string>();
  const [actions, setActions] = useState<ActionOption[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithPagination<AuditLog>('/api/system/audit/list', {
        current: page,
        pageSize,
        action,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, action, message]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    // 筛选下拉由后端给出「库里实际出现过的动作 + 中文名」，避免前端硬编码一份永远对不全的表
    get<ActionOption[]>('/api/system/audit/actions')
      .then((list) => setActions(Array.isArray(list) ? list : []))
      .catch(() => setActions([]));
  }, []);

  /** 下拉选项：后端列表 + 本页出现但字典没覆盖的动作（避免筛选器里缺项） */
  const actionOptions = useMemo(() => {
    const map = new Map<string, string>();
    actions.forEach((item) => map.set(item.code, item.name || item.code));
    rows.forEach((row) => {
      if (row.action && !map.has(row.action)) {
        map.set(row.action, row.actionName || FALLBACK_LABEL[row.action] || row.action);
      }
    });
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [actions, rows]);

  const actionText = (row: AuditLog) => row.actionName || FALLBACK_LABEL[row.action] || row.action;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>AUDIT / 操作日志</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            系统操作记录
          </div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
            记录谁在什么时候、对哪个对象做了什么，用于事后追查。
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="按动作筛选"
          style={{ width: 220 }}
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
          options={actionOptions}
        />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()} />
      </div>

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)' }}>
        <Table<AuditLog>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={rows}
          locale={{ emptyText: <Empty description="还没有操作记录" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          columns={[
            {
              title: '时间',
              dataIndex: 'createAt',
              width: 180,
              render: (v?: string) => <span style={{ fontSize: 12 }}>{v ?? '—'}</span>,
            },
            {
              title: '动作',
              dataIndex: 'action',
              width: 150,
              render: (_: unknown, row: AuditLog) => (
                <Tooltip title={row.action}>
                  <Tag color={isFailed(row) ? 'error' : 'blue'}>{actionText(row)}</Tag>
                </Tooltip>
              ),
            },
            {
              title: '对象',
              key: 'target',
              render: (_: unknown, row: AuditLog) => (
                <Space direction="vertical" size={0}>
                  <span style={{ fontSize: 13 }}>{row.targetName || row.targetId || '—'}</span>
                  {row.detail && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--bp-text-soft)',
                        maxWidth: 420,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={row.detail}
                    >
                      {row.detail}
                    </span>
                  )}
                </Space>
              ),
            },
            {
              title: '操作人',
              dataIndex: 'operatorName',
              width: 160,
              render: (_: unknown, row: AuditLog) => (
                <span style={{ fontSize: 12 }}>
                  {row.operatorName || row.createBy || '—'}
                </span>
              ),
            },
            {
              title: 'IP',
              dataIndex: 'ip',
              width: 150,
              render: (v?: string) => <span style={{ fontSize: 12 }}>{v || '—'}</span>,
            },
            {
              title: '结果',
              key: 'result',
              width: 90,
              render: (_: unknown, row: AuditLog) =>
                isFailed(row) ? <Tag color="error">失败</Tag> : <Tag color="success">成功</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
