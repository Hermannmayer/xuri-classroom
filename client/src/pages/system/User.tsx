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
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import LinkAction from '../../components/LinkAction';
import { download, get, getWithPagination, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import { pager } from '../repo/table';

interface SysUser {
  id?: string;
  userId?: string;
  name?: string;
  username?: string;
  phone?: string;
  email?: string;
  status?: number;
  /** staff / student：用户管理只列 staff */
  userType?: string;
  deptId?: string;
  deptName?: string;
  /** 附加组：一人多组，主组仍用 deptId */
  deptIds?: string[];
  deptNames?: string[];
  roleNames?: string[];
  roles?: { id: string; name?: string; code?: string }[];
  createAt?: string;
}

interface Role {
  id: string;
  name?: string;
  code?: string;
  /** 后端 RoleView.authorities：角色绑定的权限串（t_role.authority 按逗号拆开） */
  authorities?: string[];
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
  const navigate = useNavigate();

  const [editing, setEditing] = useState<SysUser | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form] = Form.useForm();
  /** 主组不能同时出现在附加组里，选项里直接把它过滤掉 */
  const mainDeptId = Form.useWatch<string | undefined>('deptId', form);

  /**
   * 按钮级权限：列表本身由路由/后端 system:user:list 守卫，这里只管写操作。
   * 没权限的按钮直接不渲染，避免「看得见、点了 403」。
   */
  const [authorities, setAuthorities] = useState<string[]>([]);
  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  const canCreate = can(authorities, 'system:user:create');
  const canUpdate = can(authorities, 'system:user:update');
  const canDelete = can(authorities, 'system:user:delete');

  /**
   * 角色下拉按「建用户分权」过滤（与后端 UserServiceImpl.assertRoleGrantScope 同一规则）：
   * - 目标角色含任一 system:* 权限 = 能进系统管理 → 必须持 system:user:create:teacher（admin 由 can() 直接放行）；
   * - 没有 teacher 档能力的人只能看到「不含任何 system:*」的角色（学员类）。
   * code=admin 的角色由后端 toAuthorityNames 注入全部权限目录，即便库里没存 system:* 也按 teacher 档算。
   */
  const canGrantSystemRole = can(authorities, 'system:user:create:teacher');
  const roleTouchesSystem = (role: Role) =>
    role.code === 'admin' || (role.authorities ?? []).some((a) => typeof a === 'string' && a.startsWith('system:'));
  const assignableRoles = canGrantSystemRole ? roles : roles.filter((role) => !roleTouchesSystem(role));
  // 用户管理只维护教职工：学员类角色（student/xueyuan、只有 portal:student 的角色）不在下拉里出现
  const isStudentRole = (role: Role) => {
    if (role.code === 'student' || role.code === 'xueyuan') return true;
    const auth = role.authorities ?? [];
    return auth.includes('portal:student') && !auth.includes('portal:teacher');
  };
  const staffRoles = assignableRoles.filter((role) => !isStudentRole(role));
  // 批量导入：注解是 hasAnyAuthority('user:import','system:user:create')（UserApi.java:126）
  const canImportUser = can(authorities, 'user:import') || can(authorities, 'system:user:create');
  // 下载导入模板：后端要 file:import（FileApi.java:75）
  const canDownloadTemplate = can(authorities, 'file:import');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (deptFilter === NO_DEPT) {
        // 后端 deptId 为空时不做分组过滤，也没有「未分组」参数；这里一次取全量再前端过滤/分页
        const res = await getWithPagination<SysUser>('/api/system/user/list', {
          current: 1,
          pageSize: 1000,
          name: keyword,
          userType: 'staff',
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
          userType: 'staff',
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
      deptIds: row.deptIds ?? [],
      roles: (row.roles ?? []).map((r) => r.id),
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
      await download('/api/file/downloadTemplate', { name: '用户导入模板' }, '用户导入模板.xlsx');
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

  /** 桌面端「操作」列：编辑/删除都没权限时整列不渲染，避免留一列空白 */
  const opsColumn: ColumnsType<SysUser>[number] = {
    title: '操作',
    key: 'ops',
    width: 130,
    render: (_, row) => (
      <Space size={10}>
        {canUpdate && <LinkAction onClick={() => openEdit(row)}>编辑</LinkAction>}
        {canDelete && (
          <Popconfirm
            title={`删除「${row.name || row.username}」？`}
            okText="删除"
            cancelText="取消"
            onConfirm={() => remove(row)}
          >
            <LinkAction style={{ color: 'var(--bp-orange)' }}>删除</LinkAction>
          </Popconfirm>
        )}
      </Space>
    ),
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
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>SYSTEM / 教职工</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            共 {total} 个教职工账号
          </div>
          <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
            只显示老师 / 管理员 / 职工；学员请到「班级管理」里按班维护
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
        {canImportUser && (
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
        )}
        {canDownloadTemplate && (
          <Button icon={<DownloadOutlined />} onClick={() => void downloadTemplate()}>
            下载模板
          </Button>
        )}
        {can(authorities, 'class:list') && (
          <Button onClick={() => navigate('/teaching/classes')}>去班级管理</Button>
        )}
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建教职工
          </Button>
        )}
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
                      <span>
                        组：{row.deptName || '—'}
                        {row.deptNames?.length ? `（+${row.deptNames.length}）` : ''}
                      </span>
                    </div>

                    {(canUpdate || canDelete) && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {canUpdate && (
                          <Button
                            style={{ flex: 1, height: 38, paddingInline: 0 }}
                            onClick={() => openEdit(row)}
                          >
                            编辑
                          </Button>
                        )}
                        {canDelete && (
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
                        )}
                      </div>
                    )}
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
              <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {total} 个教职工账号</span>
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
            {
              title: '用户组',
              dataIndex: 'deptName',
              width: 200,
              render: (v: string | undefined, row) => (
                <span>
                  {v || '—'}
                  {row.deptNames?.length ? (
                    <Tag
                      color="blue"
                      style={{ marginLeft: 6 }}
                      title={`附加组：${row.deptNames.join('、')}`}
                    >
                      +{row.deptNames.length} 组
                    </Tag>
                  ) : null}
                </span>
              ),
            },
            { title: '手机', dataIndex: 'phone', width: 140, render: (v) => v || '—' },
            { title: '邮箱', dataIndex: 'email', render: (v) => v || '—' },
            {
              title: '状态',
              dataIndex: 'status',
              width: 90,
              render: (v?: number) => (v === 0 ? <Tag color="warning">待审核</Tag> : <Tag color="success">正常</Tag>),
            },
            ...(canUpdate || canDelete ? [opsColumn] : []),
          ]}
        />
      </Card>
          )}
        </div>
      </div>

      <Modal
        title={editing ? '编辑教职工' : '新建教职工'}
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
            <Input placeholder="登录账号（建议直接填手机号）" disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? '重置密码（留空不改）' : '密码'}
            rules={[{ required: !editing, message: '请输入密码' }]}
          >
            <Input.Password placeholder={editing ? '留空表示不修改' : '默认 12345678'} autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="deptId"
            label="主组 / 班级"
            extra="决定能看到哪些题库和考试（数据可见范围按主组算）"
          >
            <Select
              allowClear
              placeholder="不选则不属于任何组"
              options={deptFlat.map((d) => ({ value: d.id, label: d.name || d.id }))}
            />
          </Form.Item>
          <Form.Item
            name="deptIds"
            label="附加组"
            extra="用于权限/角色继承与组有效期校验，可多选；主组不用再选一次"
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="可多选（不选表示只有主组）"
              optionFilterProp="label"
              options={deptFlat
                .filter((d) => d.id !== mainDeptId)
                .map((d) => ({ value: d.id, label: d.name || d.id }))}
            />
          </Form.Item>
          <Form.Item
            name="roles"
            label="角色"
            extra={
              canGrantSystemRole
                ? '教职工需要分配角色；学员不在这里建，请到「班级管理」里按班添加'
                : '只能分配不含系统管理权限的角色；带 system:* 的角色需要「新建老师」权限'
            }
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="默认不分配"
              options={staffRoles.map((r) => ({ value: r.id, label: r.name || r.code }))}
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
