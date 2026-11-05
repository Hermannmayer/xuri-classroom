import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tree,
  Upload,
} from 'antd';
import { DownloadOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { download, get, getWithPagination, post } from '../../api';
import { pager } from '../repo/table';

interface SysUser {
  id?: string;
  userId?: string;
  name?: string;
  username?: string;
  phone?: string;
  email?: string;
  status?: number;
  deptId?: string;
  deptName?: string;
  roleNames?: string[];
  createAt?: string;
}

interface Role {
  id: string;
  name?: string;
  code?: string;
}

interface Dept {
  id: string;
  parentId?: string;
  name?: string;
  children?: Dept[];
}

interface TreeNode {
  title: string;
  key: string;
  children?: TreeNode[];
}

const ALL_DEPT = 'all';
const NO_DEPT = 'none';

/** 后端 UserView 返回主键字段是 id（旧代码用了 userId，这里兼容两者） */
const userKey = (row: SysUser) => row.id ?? row.userId ?? '';

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

/**
 * 用户管理：列表 / 新建 / 编辑 / 删除。
 * 后端字段：UserRequest{ id, username, name, password, roles[], phone, email, status }
 */
export default function SystemUser() {
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<SysUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [deptFlat, setDeptFlat] = useState<Dept[]>([]);
  const [deptTree, setDeptTree] = useState<Dept[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [deptFilter, setDeptFilter] = useState<string | undefined>(undefined);

  const [editing, setEditing] = useState<SysUser | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (deptFilter === NO_DEPT) {
        // 后端 deptId 为空时不做分组过滤，也没有「未分组」参数；这里一次取全量再前端过滤/分页
        const res = await getWithPagination<SysUser>('/api/system/user/list', {
          current: 1,
          pageSize: 1000,
          name: keyword,
        });
        const ungrouped = res.data.filter((user) => !user.deptId);
        setRows(ungrouped.slice((page - 1) * pageSize, page * pageSize));
        setTotal(ungrouped.length);
      } else {
        const res = await getWithPagination<SysUser>('/api/system/user/list', {
          current: page,
          pageSize,
          name: keyword,
          deptId: deptFilter,
        });
        setRows(res.data);
        setTotal(res.total);
      }
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, deptFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    get<Dept[]>('/api/system/dept/list')
      .then((list) => {
        const flat = Array.isArray(list) ? list : [];
        setDeptFlat(flat);
        // 后端 /dept/list 实际返回扁平列表（靠 parentId 关联），这里组装成 Tree 需要的 children 结构
        const map = new Map<string, Dept>();
        flat.forEach((dept) => map.set(dept.id, { ...dept, children: [] }));
        const roots: Dept[] = [];
        map.forEach((dept) => {
          const parent = dept.parentId ? map.get(dept.parentId) : undefined;
          if (parent) parent.children!.push(dept);
          else roots.push(dept);
        });
        setDeptTree(roots);
        setExpandedKeys(flat.map((dept) => dept.id));
      })
      .catch(() => undefined);
    get<{ list: Role[] }>('/api/system/role/list', { current: 1, pageSize: 100 })
      .then((res) => setRoles(res?.list ?? []))
      .catch(() => undefined);
  }, []);

  const toTreeNodes = (nodes: Dept[]): TreeNode[] =>
    nodes.map((dept) => ({
      title: dept.name || dept.id,
      key: dept.id,
      children: dept.children?.length ? toTreeNodes(dept.children) : undefined,
    }));

  const treeData: TreeNode[] = [
    { title: '全部', key: ALL_DEPT },
    ...toTreeNodes(deptTree),
    { title: '未分组', key: NO_DEPT },
  ];

  const deptOptions = [
    { value: ALL_DEPT, label: '全部用户组' },
    ...deptFlat.map((dept) => ({ value: dept.id, label: dept.name || dept.id })),
    { value: NO_DEPT, label: '未分组' },
  ];

  const changeDept = (value: string) => {
    setPage(1);
    setDeptFilter(value === ALL_DEPT ? undefined : value);
  };

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
      deptId: row.deptId,
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
        await post('/api/system/user/update', { id: userKey(editing), ...values });
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
      await post('/api/system/user/delete', { id: userKey(row) });
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

  const mobileEmpty = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={keyword ? '没有匹配的用户' : '还没有用户'}
    />
  );

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
        {isMobile && (
          <Select
            value={deptFilter ?? ALL_DEPT}
            style={{ width: '100%' }}
            onChange={changeDept}
            options={deptOptions}
          />
        )}
        <Input.Search
          placeholder="搜索姓名"
          allowClear
          style={{ width: isMobile ? '100%' : 200 }}
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

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {!isMobile && (
          <Card
            className="bp-card bp-corners"
            size="small"
            title="用户组"
            style={{ width: 200, flex: '0 0 200px', alignSelf: 'flex-start' }}
            styles={{ body: { padding: '8px 4px' } }}
          >
            <Tree
              blockNode
              treeData={treeData}
              expandedKeys={expandedKeys}
              selectedKeys={[deptFilter ?? ALL_DEPT]}
              onExpand={(keys) => setExpandedKeys(keys.map(String))}
              onSelect={(keys) => {
                if (keys.length) changeDept(String(keys[0]));
              }}
            />
          </Card>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {isMobile ? (
        <>
          <Spin spinning={loading}>
            {rows.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {rows.map((row) => (
                  <div
                    key={userKey(row)}
                    className="bp-card"
                    style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 14,
                        }}
                      >
                        {row.name || '—'}
                      </span>
                      <Tag color={row.status === 0 ? 'warning' : 'success'}>
                        {row.status === 0 ? '待审核' : '正常'}
                      </Tag>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                        fontSize: 12,
                        color: 'var(--bp-text-soft)',
                      }}
                    >
                      <span>账号：{row.username || '—'}</span>
                      <span>手机：{row.phone || '—'}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        style={{ flex: 1, height: 38, paddingInline: 0 }}
                        onClick={() => openEdit(row)}
                      >
                        编辑
                      </Button>
                      <Popconfirm
                        title={`删除「${row.name || row.username}」？`}
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
              mobileEmpty
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
              <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {total} 个账号</span>
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
      <Card className="bp-corners bp-card">
        <Table<SysUser>
          rowKey={(row) => userKey(row)}
          size="small"
          loading={loading}
          dataSource={rows}
          pagination={pager(page, pageSize, total, setPage, setPageSize)}
          columns={[
            { title: '姓名', dataIndex: 'name', width: 140, render: (v) => v || '—' },
            { title: '账号', dataIndex: 'username', width: 160 },
            { title: '用户组', dataIndex: 'deptName', width: 140, render: (v) => v || '—' },
            { title: '手机', dataIndex: 'phone', width: 140, render: (v) => v || '—' },
            { title: '邮箱', dataIndex: 'email', render: (v) => v || '—' },
            {
              title: '状态',
              dataIndex: 'status',
              width: 90,
              render: (v?: number) => (v === 0 ? <Tag color="warning">待审核</Tag> : <Tag color="success">正常</Tag>),
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
          )}
        </div>
      </div>

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
          <Form.Item name="deptId" label="用户组 / 班级" extra="决定能看到哪些题库和考试">
            <Select
              allowClear
              placeholder="不选则不属于任何组"
              options={deptFlat.map((d) => ({ value: d.id, label: d.name || d.id }))}
            />
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
