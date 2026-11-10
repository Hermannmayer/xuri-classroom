import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  DatePicker,
  Empty,
  Form,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { get, listProjects, post } from '../../api';
import type { ProjectMode, ProjectView } from '../../api';
import LinkAction from '../../components/LinkAction';
import TableScrollRegion from '../../components/TableScrollRegion';

/** 与后端 ClassResourceView 对齐 */
interface ClassResource {
  id: string;
  classId?: string;
  className?: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  resourceMode?: ProjectMode;
  /** 0 关闭 / 1 开放 */
  status?: number | null;
  startAt?: string;
  endAt?: string;
  globalStartAt?: string;
  globalEndAt?: string;
  assignedBy?: string;
  assignedByName?: string;
  answerCount?: number;
  /** 后端按全局窗口 + 本班窗口 + 开关算出的可见状态 */
  effectiveStatus?: 'CLOSED' | 'NOT_STARTED' | 'OPEN' | 'ENDED';
}

interface WindowValues {
  window?: [Dayjs | null, Dayjs | null] | null;
  status?: boolean;
}

interface AssignValues extends WindowValues {
  resourceIds?: string[];
}

const EFFECTIVE_META: Record<string, { label: string; color: string }> = {
  CLOSED: { label: '已关闭', color: 'default' },
  NOT_STARTED: { label: '未开始', color: 'blue' },
  OPEN: { label: '进行中', color: 'success' },
  ENDED: { label: '已结束', color: 'warning' },
};

const MODE_META: Partial<Record<ProjectMode, { label: string; color: string }>> = {
  exam: { label: '考试', color: 'orange' },
  survey: { label: '问卷', color: 'blue' },
};

function rangeText(start?: string, end?: string, emptyLabel = '不限') {
  if (!start && !end) {
    return <span style={{ color: 'var(--bp-text-soft)' }}>{emptyLabel}</span>;
  }
  const fmt = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '不限');
  return `${fmt(start)} ~ ${fmt(end)}`;
}

/**
 * 班级「考试与问卷」资源面板。
 *
 * <p>管理员/可管理的任课老师给本班分配考试/问卷，并设置本班开放窗口：
 * 全局窗口是硬上限，本班窗口留空表示继承全局，关闭开关后本班学员看不到。
 * 只读老师只能看列表（写操作按钮不渲染）。
 */
export default function ClassResourcesPanel({
  classId,
  manageable,
}: {
  classId: string;
  /** 当前用户对该班是否有写权限（后端 ClassNodeView.manageable） */
  manageable: boolean;
}) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ClassResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>();

  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [projectLoading, setProjectLoading] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignForm] = Form.useForm<AssignValues>();

  const [editing, setEditing] = useState<ClassResource | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm] = Form.useForm<WindowValues>();

  const load = useCallback(async () => {
    if (!classId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setLoadError(undefined);
    try {
      const list = await get<ClassResource[]>('/api/teaching/classes/resources', {
        deptId: classId,
        resourceType: 'project',
      });
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      const text = (e as Error).message || '读取班级考试/问卷失败';
      setLoadError(text);
      message.error(text);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [classId, message]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 已分配的项目：添加时禁用，避免重复分配 */
  const assignedIds = useMemo(
    () => new Set(rows.map((row) => row.resourceId).filter(Boolean) as string[]),
    [rows],
  );

  const projectOptions = useMemo(
    () =>
      projects
        .filter((project) => project.mode !== 'folder')
        .map((project) => {
          const meta = project.mode ? MODE_META[project.mode] : undefined;
          return {
            value: project.id,
            label: `${project.name || '(未命名)'}（${meta?.label ?? '项目'}）`,
            disabled: assignedIds.has(project.id),
          };
        }),
    [projects, assignedIds],
  );

  const loadProjects = useCallback(async () => {
    setProjectLoading(true);
    try {
      const res = await listProjects({ current: 1, pageSize: 200 });
      setProjects(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      message.error((e as Error).message);
      setProjects([]);
    } finally {
      setProjectLoading(false);
    }
  }, [message]);

  // 打开添加弹窗后再拉项目：避免每次进班级都请求一遍全量项目
  useEffect(() => {
    if (!assignOpen) return;
    assignForm.resetFields();
    assignForm.setFieldsValue({ status: true, resourceIds: [] });
    void loadProjects();
  }, [assignOpen, assignForm, loadProjects]);

  // 编辑弹窗：等表单挂载后再回填，避免 destroyOnClose 下 setFieldsValue 失效
  useEffect(() => {
    if (!editing) return;
    editForm.setFieldsValue({
      window:
        editing.startAt || editing.endAt
          ? [editing.startAt ? dayjs(editing.startAt) : null, editing.endAt ? dayjs(editing.endAt) : null]
          : undefined,
      status: editing.status !== 0,
    });
  }, [editing, editForm]);

  const submitAssign = async () => {
    if (!classId || assignSaving) return;
    let values: AssignValues;
    try {
      values = await assignForm.validateFields();
    } catch {
      return;
    }
    const ids = values.resourceIds ?? [];
    if (ids.length === 0) {
      message.warning('请选择要分配的考试或问卷');
      return;
    }
    const [from, to] = values.window ?? [];
    setAssignSaving(true);
    try {
      await post('/api/teaching/classes/resources/assign', {
        classId,
        resourceType: 'project',
        resourceIds: ids,
        // 留空=继承全局
        startAt: from ? from.toISOString() : null,
        endAt: to ? to.toISOString() : null,
        status: values.status === false ? 0 : 1,
      });
      message.success('已分配 ' + ids.length + ' 个考试/问卷');
      setAssignOpen(false);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setAssignSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editing || editSaving) return;
    let values: WindowValues;
    try {
      values = await editForm.validateFields();
    } catch {
      return;
    }
    const [from, to] = values.window ?? [];
    setEditSaving(true);
    try {
      await post('/api/teaching/classes/resources/update', {
        id: editing.id,
        startAt: from ? from.toISOString() : null,
        endAt: to ? to.toISOString() : null,
        status: values.status === false ? 0 : 1,
      });
      message.success('已更新开放窗口');
      setEditing(null);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setEditSaving(false);
    }
  };

  const remove = async (row: ClassResource) => {
    try {
      await post('/api/teaching/classes/resources/delete', { id: row.id });
      message.success('已移除「' + (row.resourceName || '该考试/问卷') + '」');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const columns: ColumnsType<ClassResource> = [
    {
      title: '名称',
      dataIndex: 'resourceName',
      ellipsis: true,
      render: (value?: string) => value || '—',
    },
    {
      title: '类型',
      dataIndex: 'resourceMode',
      width: 84,
      render: (mode?: ProjectMode) => {
        const meta = mode ? MODE_META[mode] : undefined;
        return <Tag color={meta?.color ?? 'default'}>{meta?.label ?? '—'}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'effectiveStatus',
      width: 96,
      render: (status?: string) => {
        const meta = status ? EFFECTIVE_META[status] : undefined;
        return <Tag color={meta?.color ?? 'default'}>{meta?.label ?? '—'}</Tag>;
      },
    },
    {
      title: '本班窗口',
      key: 'window',
      width: 210,
      render: (_: unknown, row: ClassResource) => rangeText(row.startAt, row.endAt, '继承全局'),
    },
    {
      title: '全局窗口',
      key: 'globalWindow',
      width: 210,
      render: (_: unknown, row: ClassResource) => rangeText(row.globalStartAt, row.globalEndAt, '不限'),
    },
    {
      title: '答卷数',
      dataIndex: 'answerCount',
      width: 90,
      render: (value?: number) => `${value ?? 0} 份`,
    },
    ...(manageable
      ? [
          {
            title: '操作',
            key: 'ops',
            width: 120,
            render: (_: unknown, row: ClassResource) => (
              <Space size={12}>
                <LinkAction onClick={() => setEditing(row)}>编辑</LinkAction>
                <Popconfirm
                  title={'移除「' + (row.resourceName || '该考试/问卷') + '」？'}
                  description="只解除本班的分配，不会删除考试/问卷本身。"
                  okText="移除"
                  okButtonProps={{ danger: true }}
                  cancelText="取消"
                  onConfirm={() => remove(row)}
                >
                  <LinkAction style={{ color: 'var(--bp-orange)' }}>删除</LinkAction>
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <span className="bp-title" style={{ fontSize: 13 }}>
          考试与问卷
        </span>
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
          给本班分配考试/问卷并设置开放窗口；全局窗口是硬上限
        </span>
        <div style={{ flex: 1 }} />
        {manageable && (
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setAssignOpen(true)}>
            添加考试/问卷
          </Button>
        )}
      </div>

      {loadError && (
        <Alert type="warning" showIcon style={{ marginBottom: 10 }} message={loadError} />
      )}

      <TableScrollRegion label="班级考试与问卷（可横向滚动）">
        <Table<ClassResource>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={rows}
          columns={columns}
          scroll={{ x: 960 }}
          pagination={{ pageSize: 8, hideOnSinglePage: true, size: 'small' }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="还没有给这个班分配考试/问卷"
              />
            ),
          }}
        />
      </TableScrollRegion>

      <Modal
        title="添加考试 / 问卷"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={() => void submitAssign()}
        confirmLoading={assignSaving}
        okText="分配"
        cancelText="取消"
        width="min(560px, 94vw)"
        destroyOnClose
      >
        <Form form={assignForm} layout="vertical" size="small" preserve={false} requiredMark={false}>
          <Form.Item
            name="resourceIds"
            label="考试 / 问卷"
            rules={[{ required: true, message: '请选择要分配的考试或问卷' }]}
          >
            <Select
              mode="multiple"
              showSearch
              allowClear
              optionFilterProp="label"
              placeholder="搜索并选择，可多选"
              loading={projectLoading}
              options={projectOptions}
              notFoundContent={projectLoading ? '加载中…' : '没有可分配的考试/问卷'}
            />
          </Form.Item>

          <Form.Item
            name="window"
            label="本班开放窗口"
            extra="全局窗口是硬上限，本班窗口必须落在其内；留空=继承全局"
          >
            <DatePicker.RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              allowEmpty={[true, true]}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
            extra="关闭后本班学员看不到这些考试/问卷"
          >
            <Switch checkedChildren="开放" unCheckedChildren="关闭" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={'编辑开放窗口' + (editing?.resourceName ? '：' + editing.resourceName : '')}
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        onOk={() => void submitEdit()}
        confirmLoading={editSaving}
        okText="保存"
        cancelText="取消"
        width="min(560px, 94vw)"
        destroyOnClose
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.9, marginBottom: 10 }}>
          全局窗口是硬上限，本班窗口必须落在其内；留空=继承全局。
        </div>
        <Form form={editForm} layout="vertical" size="small" preserve={false} requiredMark={false}>
          <Form.Item name="window" label="本班开放窗口">
            <DatePicker.RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              allowEmpty={[true, true]}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="开放" unCheckedChildren="关闭" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
