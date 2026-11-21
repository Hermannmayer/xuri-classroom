import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Card, DatePicker, Empty, Input, Modal, Pagination, Radio, Select, Space, Table, Tag, Tooltip } from 'antd';
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { get, getWithPagination, post } from '../../api';
import { useIsMobile } from '../../hooks/useIsMobile';

interface AuditLog {
  id: string;
  action: string;
  actionName?: string;
  targetId?: string;
  targetName?: string;
  detail?: string;
  ip?: string;
  createBy?: string;
  operatorName?: string;
  createAt?: string;
}


interface AuditRetention {

  retentionDays: number;
  autoEnabled: boolean;

  minKeepDays: number;
}

interface ActionOption {
  code: string;
  name: string;
}

const FALLBACK_LABEL: Record<string, string> = {
  EXPORT_REPO: '导出题库',
  EXPORT_ANSWER: '导出答卷',
  IMPORT_REPO: '导入题库',
  AUTH_LOGIN: '登录成功',
  AUTH_LOGIN_FAILED: '登录失败',
};

const isFailed = (row: AuditLog) => (row.detail || '').includes('失败');

const RANGE_PRESETS: { label: string; value: [Dayjs, Dayjs] }[] = [
  { label: '今天', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
  { label: '近 7 天', value: [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')] },
  { label: '近 30 天', value: [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')] },
];

/** 系统管理 → 操作日志：筛选、时间范围、清理 */
export default function SystemAudit() {
  const { message } = App.useApp();
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [action, setAction] = useState<string>();
  const [actions, setActions] = useState<ActionOption[]>([]);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [operator, setOperator] = useState('');
  const [keyword, setKeyword] = useState('');
  const [resultStatus, setResultStatus] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [retention, setRetention] = useState<AuditRetention>();
  const [cleanOpen, setCleanOpen] = useState(false);
  const [cleanMode, setCleanMode] = useState<'30' | '90' | '180' | 'all'>('90');
  const [cleaning, setCleaning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithPagination<AuditLog>('/api/system/audit/list', {
        current: page,
        pageSize,
        action,
        startTime: range?.[0]?.format('YYYY-MM-DDTHH:mm:ss'),
        endTime: range?.[1]?.format('YYYY-MM-DDTHH:mm:ss'),
        operator: operator.trim() || undefined,
        keyword: keyword.trim() || undefined,
        result: resultStatus,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, action, range, operator, keyword, resultStatus, message]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    get<ActionOption[]>('/api/system/audit/actions')
      .then((list) => setActions(Array.isArray(list) ? list : []))
      .catch(() => setActions([]));

    get<AuditRetention>('/api/system/audit/retention')
      .then((data) => setRetention(data))
      .catch(() => setRetention(undefined));
  }, []);

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

  const resetFilters = () => {
    setAction(undefined);
    setRange(null);
    setOperator('');
    setKeyword('');
    setResultStatus(undefined);
    setPage(1);
  };

  const cleanLogs = async () => {
    setCleaning(true);
    try {
      const all = cleanMode === 'all';
      const removed = await post<number>('/api/system/audit/clean', {
        all,
        beforeDays: all ? undefined : Number(cleanMode),
      });
      message.success(all ? '已清空全部日志' : '已清理 ' + String(removed ?? 0) + ' 条日志');
      setCleanOpen(false);
      setPage(1);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>AUDIT / 操作日志</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            系统操作记录
          </div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
            记录谁在什么时候、对哪个对象做了什么；可按时间、动作、操作人、结果筛选。
            {retention ? (
              <span style={{ marginLeft: 8, color: 'var(--bp-text-soft)' }}>
                {retention.autoEnabled
                  ? `自动保留 ${retention.retentionDays} 天（每天 04:12 清理更早的记录）`
                  : '自动清理已关闭（仍可手动清理）'}
                ，最少保留 {retention.minKeepDays} 天。
              </span>
            ) : null}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
        <Button danger icon={<DeleteOutlined />} onClick={() => setCleanOpen(true)}>
          清理日志
        </Button>
      </div>

      <Card
        className="bp-corners sk-audit-filters"
        style={{ border: '1px solid var(--bp-line)', marginBottom: 12 }}
        styles={{ body: { padding: 14 } }}
      >
        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', marginBottom: 10 }}>
          FILTER / 筛选
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, marginBottom: 4 }}>时间范围</div>
            <DatePicker.RangePicker
              showTime
              allowClear
              presets={RANGE_PRESETS}
              format="YYYY-MM-DD HH:mm"
              value={range}
              onChange={(values) => {
                setRange((values as [Dayjs, Dayjs] | null) ?? null);
                setPage(1);
              }}
              style={{ width: 360 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, marginBottom: 4 }}>动作</div>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="全部动作"
              style={{ width: 220 }}
              value={action}
              onChange={(value) => {
                setAction(value);
                setPage(1);
              }}
              options={actionOptions}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, marginBottom: 4 }}>结果</div>
            <Select
              allowClear
              placeholder="全部结果"
              style={{ width: 120 }}
              value={resultStatus}
              onChange={(value) => {
                setResultStatus(value);
                setPage(1);
              }}
              options={[
                { value: 'success', label: '成功' },
                { value: 'fail', label: '失败' },
              ]}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, marginBottom: 4 }}>操作人</div>
            <Input
              allowClear
              placeholder="按姓名搜索"
              style={{ width: 180 }}
              value={operator}
              onChange={(e) => {
                setOperator(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, marginBottom: 4 }}>关键词</div>
            <Input
              allowClear
              placeholder="对象名称 / 说明"
              style={{ width: 240 }}
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div style={{ alignSelf: 'flex-end', paddingBottom: 1 }}>
            <Button onClick={resetFilters}>重置筛选</Button>
          </div>
        </div>
      </Card>

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)' }}>
        {isMobile ? (
          <div className="sk-audit-list">
            {rows.length === 0 ? (
              <Empty description="还没有操作记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              rows.map((row) => (
                <div className="sk-audit-card" key={row.id}>
                  <div className="sk-audit-card-head">
                    <Tag color={isFailed(row) ? 'error' : 'blue'}>{actionText(row)}</Tag>
                    <span>{row.createAt || '—'}</span>
                  </div>
                  <div className="sk-audit-card-target">{row.targetName || row.targetId || '—'}</div>
                  {row.detail ? <div className="sk-audit-card-detail">{row.detail}</div> : null}
                  <div className="sk-audit-card-meta">
                    <span>{row.operatorName || row.createBy || '—'}</span>
                    <span>{row.ip || '—'}</span>
                    <Tag color={isFailed(row) ? 'error' : 'success'}>{isFailed(row) ? '失败' : '成功'}</Tag>
                  </div>
                </div>
              ))
            )}
            {total > 0 ? (
              <Pagination
                simple
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                }}
                style={{ marginTop: 12, textAlign: 'right' }}
              />
            ) : null}
          </div>
        ) : (
        <Table<AuditLog>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={rows}

          scroll={{ x: 740 }}
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
                <Space orientation="vertical" size={0}>
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
                <span style={{ fontSize: 12 }}>{row.operatorName || row.createBy || '—'}</span>
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
        )}
      </Card>

      <Modal
        title="清理操作日志"
        open={cleanOpen}
        onCancel={() => setCleanOpen(false)}
        onOk={() => void cleanLogs()}
        confirmLoading={cleaning}
        okText="确认清理"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 12 }}>
          清理后不可恢复；建议先保留最近 90/180 天用于追溯。
        </div>
        <Radio.Group value={cleanMode} onChange={(e) => setCleanMode(e.target.value)}>
          <Space orientation="vertical">
            <Radio value="30">只保留最近 30 天，清理更早日志</Radio>
            <Radio value="90">只保留最近 90 天，清理更早日志</Radio>
            <Radio value="180">只保留最近 180 天，清理更早日志</Radio>
            <Radio value="all">清空全部日志</Radio>
          </Space>
        </Radio.Group>
      </Modal>
    </div>
  );
}
