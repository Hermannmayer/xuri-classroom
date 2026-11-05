import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, Input, message, Modal, Popconfirm, Select, Space, Table, Tag, Upload } from 'antd';
import { DownloadOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { download, get, getWithPagination, post } from '../../api';

interface SysUser {
  userId: string;
  name?: string;
  username?: string;
  phone?: string;
  email?: string;
  status?: number;
  deptName?: string;
  roleNames?: string[];
  createAt?: string;
}

interface Role {
  id: string;
  name?: string;
  code?: string;
}

/**
 * 用户管理：列表 / 新建 / 编辑 / 删除。
 * 后端字段：UserRequest{ id, username, name, password, roles[], phone, email, status }
 */
export default function SystemUser() {
  const [rows, setRows] = useState<SysUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  const [editing, setEditing] = useState<SysUser | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithPagination<SysUser>('/api/system/user/list', {
        current: page,
        pageSize,
        name: keyword,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    get<{ list: Role[] }>('/api/system/role/list', { current: 1, pageSize: 100 })
      .then((res) => setRoles(res?.list ?? []))
      .catch(() => undefined);
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 1 });
    setOpen(true);
  };

  const openEdit = (row: SysUser) => {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue({
      name: row.name,
      username: row.username,
      phone: row.phone,
      email: row.email,
      status: row.status ?? 1,
    });
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await post('/api/system/user/update', { id: editing.userId, ...values });
        message.success('已保存');
      } else {
        await post('/api/system/user/create', values);
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

  const remove = async (row: SysUser) => {
    try {
      await post('/api/system/user/delete', { id: row.userId });
      message.success('已删除');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const downloadTemplate = async () => {
    try {
      await download('/api/file/downloadTemplate', { name: '卷王用户导入模板' }, '卷王用户导入模板.xlsx');
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const doImport = async (file: File) => {
    setImporting(true);
    try {
      const fd = new FormData();
      // UserRequest.file：后端 importUser(UserRequest request) 直接从 multipart 绑 file
      fd.append('file', file);
      await post('/api/importUser', fd);
      message.success('导入成功');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>SYSTEM / 用户</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            共 {total} 个账号
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Input.Search
          placeholder="搜索姓名"
          allowClear
          style={{ width: 200 }}
          onSearch={(v) => {
            setPage(1);
            setKeyword(v);
          }}
        />
        <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading} />
        <Upload
          accept=".xlsx"
          showUploadList={false}
          beforeUpload={(file) => {
            void doImport(file);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />} loading={importing}>
            批量导入
          </Button>
        </Upload>
        <Button icon={<DownloadOutlined />} onClick={() => void downloadTemplate()}>
          下载模板
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建用户
        </Button>
      </div>

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}>
        <Table<SysUser>
          rowKey="userId"
          size="small"
          loading={loading}
          dataSource={rows}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showTotal: (t) => `共 ${t} 条`,
          }}
          columns={[
            { title: '姓名', dataIndex: 'name', width: 140, render: (v) => v || '—' },
            { title: '账号', dataIndex: 'username', width: 160 },
            { title: '手机', dataIndex: 'phone', width: 140, render: (v) => v || '—' },
            { title: '邮箱', dataIndex: 'email', render: (v) => v || '—' },
            {
              title: '状态',
              dataIndex: 'status',
              width: 90,
              render: (v?: number) => (v === 0 ? <Tag>停用</Tag> : <Tag color="success">正常</Tag>),
            },
            {
              title: '操作',
              key: 'ops',
              width: 130,
              render: (_, row) => (
                <Space size={10}>
                  <a onClick={() => openEdit(row)}>编辑</a>
                  <Popconfirm
                    title={`删除「${row.name || row.username}」？`}
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
      </Card>

      <Modal
        title={editing ? '编辑用户' : '新建用户'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" requiredMark={false}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="真实姓名" />
          </Form.Item>
          <Form.Item
            name="username"
            label="账号"
            rules={[{ required: !editing, message: '请输入账号' }]}
          >
            <Input placeholder="登录账号" disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? '重置密码（留空不改）' : '密码'}
            rules={[{ required: !editing, message: '请输入密码' }]}
          >
            <Input.Password placeholder={editing ? '留空表示不修改' : '至少 6 位'} autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="roles" label="角色" extra="不分配角色等于没有后台权限；学员不需要分配">
            <Select
              mode="multiple"
              allowClear
              placeholder="默认不分配"
              options={roles.map((r) => ({ value: r.id, label: r.name || r.code }))}
            />
          </Form.Item>
          <Form.Item name="phone" label="手机">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="选填" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select
              options={[
                { value: 1, label: '正常' },
                { value: 0, label: '停用' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
