import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, Input, message, Modal, Popconfirm, Select, Space, Table } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { get, post } from '../../api';

interface Dept {
  id: string;
  name: string;
  parentId?: string;
  children?: Dept[];
}

/**
 * 用户组（班级）管理：复用后端的组织机构表 t_dept。
 * 题库授权时按这里的分组批量把组员加入 t_repo_partner。
 */
function flattenDepts(list: Dept[], depth = 0): { id: string; name: string; depth: number }[] {
  return list.flatMap((d) => [{ id: d.id, name: d.name, depth }, ...flattenDepts(d.children ?? [], depth + 1)]);
}

export default function SystemGroup() {
  const [tree, setTree] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{ name: string; parentId?: string }>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTree(await get<Dept[]>('/api/system/dept/list'));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = (parent?: Dept) => {
    setEditing(null);
    form.resetFields();
    if (parent) form.setFieldsValue({ parentId: parent.id });
    setOpen(true);
  };

  const openEdit = (row: Dept) => {
    setEditing(row);
    form.setFieldsValue({ name: row.name, parentId: row.parentId });
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await post('/api/system/dept/update', { id: editing.id, ...values });
        message.success('已保存');
      } else {
        await post('/api/system/dept/create', values);
        message.success('已创建');
      }
      setOpen(false);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Dept) => {
    try {
      await post('/api/system/dept/delete', { id: row.id });
      message.success('已删除');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>GROUP / 用户组</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            班级与分组
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
          新建分组
        </Button>
      </div>

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)' }}>
        <Table<Dept>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={tree}
          pagination={false}
          defaultExpandAllRows
          columns={[
            { title: '名称', dataIndex: 'name', render: (v: string) => v || '—' },
            {
              title: '操作',
              key: 'ops',
              width: 200,
              render: (_, row) => (
                <Space size={12}>
                  <a onClick={() => openCreate(row)}>加子组</a>
                  <a onClick={() => openEdit(row)}>重命名</a>
                  <Popconfirm
                    title={`删除「${row.name}」？`}
                    okText="删除"
                    okButtonProps={{ danger: true }}
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
      </Card>

      <Modal
        title={editing ? '重命名分组' : '新建分组'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" requiredMark={false}>
          <Form.Item name="name" label="分组名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：育婴五级 2026 春季班" />
          </Form.Item>
<Form.Item name="parentId" label="上级分组" extra="留空表示顶层">
            <Select
              allowClear
              placeholder="顶层（不选）"
              options={flattenDepts(tree)
                .filter((d) => d.id !== editing?.id)
                .map((d) => ({ value: d.id, label: `${"　".repeat(d.depth)}${d.name}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
