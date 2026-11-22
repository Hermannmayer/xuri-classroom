import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  ConfigProvider,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Upload,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import { TeamOutlined, UploadOutlined, UserAddOutlined } from '@ant-design/icons';
import LinkAction from '../../components/LinkAction';
import { getWithPagination, post } from '../../api';

interface Partner {
  id: string;
  userId?: string;
  userName?: string;
  groupId?: string;
  type?: number;
  status?: number;
}

interface SysUser {
  userId: string;
  name?: string;
  username?: string;
  deptName?: string;
}

const STATUS_TEXT: Record<number, string> = { 0: '未访问', 1: '已访问', 2: '已答题' };
const STATUS_COLOR: Record<number, string> = { 0: 'default', 1: 'blue', 2: 'green' };
const NAME_SEPARATOR = /[\n\r,，、;；\t]+/;
const HEADER_WORDS = /^(姓名|名单|名字|序号|手机号?|电话|name|phone)$/i;

/** 把粘贴文本或 CSV 内容拆成姓名去重；dropHeader 用于丢掉 Excel 另存 CSV 时带的表头 */
function parseNames(raw: string, dropHeader = false): string[] {
  const names = new Set<string>();
  for (const token of raw.split(NAME_SEPARATOR)) {
    const name = token.trim().replace(/^"|"$/g, '').trim();
    if (!name) continue;
    if (dropHeader && HEADER_WORDS.test(name)) continue;
    names.add(name);
  }
  return Array.from(names);
}

/** 读名单文件：先按 UTF-8 解，失败再按 GBK（Excel 默认另存的 CSV 是 GBK） */
async function readNameFileText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('gbk').decode(bytes);
  }
}

function statusTag(status?: number) {
  const value = status ?? 0;
  return <Tag color={STATUS_COLOR[value] ?? 'default'}>{STATUS_TEXT[value] ?? '未访问'}</Tag>;
}

/**
 * 答题白名单名单面板：维护 type=3（无 groupId，系统用户）与 type=4（导入用户）两种名单。
 * 只读人数、增删名单；名单操作只受 project:partner 控制，所以不受外层发布设置表单 disabled 的限制。
 */
export default function WhitelistPanel({
  projectId,
  type,
  savedType,
  canManage,
}: {
  projectId: string;
  /** 表单里当前选择的 whitelistType：0 不启用 / 3 系统用户 / 4 导入用户 */
  type: number;
  /** 已保存的 whitelistType，用来提示「改了还没保存」 */
  savedType: number;
  /** 是否有 project:partner；没有就只读 */
  canManage: boolean;
}) {
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string>();
  const [users, setUsers] = useState<SysUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [namesText, setNamesText] = useState('');

  const loadRows = useCallback(
    async (reportError = false) => {
      if (!projectId) return;
      setLoading(true);
      try {
        const res = await getWithPagination<Partner>('/api/project/partner/list', {
          projectId,
          current: 1,
          pageSize: -1,
        });
        const list = Array.isArray(res.data) ? res.data : [];
        setRows(list.filter((item) => item.type === 3 || item.type === 4));
        setLoadFailed(false);
      } catch (e) {
        setLoadFailed(true);
        if (reportError) message.error((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  /** type=3 里带 groupId 的是班级授权，不在白名单里显示，也不能在这里删 */
  const systemRows = useMemo(() => rows.filter((row) => row.type === 3 && !row.groupId), [rows]);
  const importRows = useMemo(() => rows.filter((row) => row.type === 4), [rows]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const list = await post<SysUser[]>('/api/project/selectUser', {});
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setUsersLoading(false);
    }
  };

  const openModal = () => {
    setSelectedUsers([]);
    setNamesText('');
    setOpen(true);
    void loadRows(true);
    if (type === 3) void loadUsers();
  };

  const removeRow = async (row: Partner) => {
    if (removingId) return;
    setRemovingId(row.id);
    try {
      await post('/api/project/partner/delete', { projectId, ids: [row.id] });
      message.success('已移出名单');
      await loadRows(true);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setRemovingId(undefined);
    }
  };

  const addUsers = async () => {
    const exists = new Set(systemRows.map((row) => row.userId));
    const userIds = selectedUsers.filter((id) => !exists.has(id));
    if (userIds.length === 0) {
      message.warning(selectedUsers.length ? '所选账号已经在名单里' : '先选要添加的账号');
      return;
    }
    setSaving(true);
    try {
      await post('/api/project/partner/create', { projectId, type: 3, userIds });
      message.success(`已添加 ${userIds.length} 人`);
      setSelectedUsers([]);
      await loadRows(true);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addNames = async () => {
    const names = parseNames(namesText);
    if (names.length === 0) {
      message.warning('先填写或粘贴姓名');
      return;
    }
    const exists = new Set(importRows.map((row) => row.userName));
    const fresh = names.filter((name) => !exists.has(name));
    if (fresh.length === 0) {
      message.warning('这些姓名已经在名单里');
      return;
    }
    setSaving(true);
    try {
      await post('/api/project/partner/create', { projectId, type: 4, userNames: fresh });
      message.success(`已添加 ${fresh.length} 条名单`);
      setNamesText('');
      await loadRows(true);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const readNameFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.txt')) {
      message.warning('浏览器里只能解析 CSV/TXT：Excel 请先「另存为 CSV」再上传，或直接把姓名粘贴到输入框');
      return;
    }
    try {
      const names = parseNames(await readNameFileText(file), true);
      if (names.length === 0) {
        message.warning('文件里没有读到姓名');
        return;
      }
      setNamesText((prev) => [prev.trim(), names.join('\n')].filter(Boolean).join('\n'));
      message.success(`已读入 ${names.length} 个姓名，确认后点「添加到名单」`);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const userOptions = users
    .filter((user) => !systemRows.some((row) => row.userId === user.userId))
    .map((user) => ({
      value: user.userId,
      label: `${user.name || user.username || user.userId}${user.deptName ? ` · ${user.deptName}` : ''}`,
    }));

  const activeRows = type === 3 ? systemRows : importRows;
  const activeLabel = type === 3 ? '系统用户' : '导入用户';
  const changed = type !== savedType;

  const columns: TableProps<Partner>['columns'] = [
    {
      title: type === 3 ? '系统用户' : '名单',
      key: 'name',
      render: (_, row) => row.userName || row.userId || '—',
    },
    { title: '状态', key: 'status', width: 96, render: (_, row) => statusTag(row.status) },
    {
      title: '操作',
      key: 'ops',
      width: 80,
      render: (_, row) => (
        <Popconfirm title="移出名单？" okText="移除" cancelText="取消" onConfirm={() => removeRow(row)}>
          <LinkAction
            style={{ color: removingId === row.id ? 'var(--bp-text-soft)' : 'var(--bp-orange)' }}
          >
            移除
          </LinkAction>
        </Popconfirm>
      ),
    },
  ];

  const table = (
    <Table<Partner>
      rowKey="id"
      size="small"
      loading={loading}
      dataSource={activeRows}
      pagination={false}
      scroll={{ x: 360 }}
      locale={{ emptyText: <Empty description="名单还是空的" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      columns={columns}
    />
  );

  if (type !== 3 && type !== 4) {
    return (
      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.9 }}>
        <div>未启用白名单：拿到链接的人都能作答。</div>
        {systemRows.length + importRows.length > 0 && (
          <div style={{ marginTop: 4 }}>
            项目里已有名单（系统用户 {systemRows.length} 人 / 导入 {importRows.length} 人），不会因为不启用而删除，重新启用后直接生效。
          </div>
        )}
        {loadFailed && <div style={{ marginTop: 4 }}>名单人数读取失败，可刷新页面重试。</div>}
      </div>
    );
  }

  return (
    <ConfigProvider componentDisabled={false}>
      {changed && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 10 }}
          title="白名单类型已改动，点右上角「保存」后生效"
          description="切换类型不会删除任何已有名单；换回原类型即可继续使用。"
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Tag color="blue">{activeLabel}</Tag>
        <span style={{ fontSize: 12 }}>
          当前名单 <b>{activeRows.length}</b> 人
        </span>
        <div style={{ flex: 1 }} />
        {canManage && (
          <Button size="small" icon={<TeamOutlined />} onClick={openModal}>
            管理名单
          </Button>
        )}
      </div>

      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--bp-text-soft)', lineHeight: 1.8 }}>
        {type === 3
          ? '名单里的系统账号才能答题：没登录会让先登录，登录了但不在名单里会被拒绝。'
          : '答题页会让填写名单里的姓名，不需要系统账号，适合临时名单。'}
        {!canManage && ' 当前没有「project:partner」权限，只能查看人数。'}
      </div>

      {activeRows.length === 0 && !loading && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--bp-orange)' }}>
          名单还是空的：启用后没人能通过校验，先点「管理名单」添加。
        </div>
      )}
      {loadFailed && (
        <div style={{ marginTop: 6, fontSize: 12 }}>名单读取失败，可刷新页面重试。</div>
      )}

      <Modal
        title={`${activeLabel}名单 · 当前 ${activeRows.length} 人`}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width="min(760px, 96vw)"
        destroyOnHidden
      >
        {type === 3 ? (
          <Space orientation="vertical" size={10} style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Select
                mode="multiple"
                style={{ flex: '1 1 260px', minWidth: 200 }}
                placeholder="选择系统用户（可多选）"
                value={selectedUsers}
                onChange={setSelectedUsers}
                loading={usersLoading}
                optionFilterProp="label"
                maxTagCount="responsive"
                allowClear
                options={userOptions}
              />
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                loading={saving}
                disabled={selectedUsers.length === 0}
                onClick={() => void addUsers()}
              >
                添加
              </Button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              已选 {selectedUsers.length} 人；已经在名单里的账号不会重复添加。只显示系统用户白名单，班级授权在「协作管理员」里管理。
            </div>
            {table}
          </Space>
        ) : (
          <Space orientation="vertical" size={10} style={{ width: '100%' }}>
            <Input.TextArea
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              autoSize={{ minRows: 4, maxRows: 8 }}
              placeholder="每行一个姓名；也可以从 Excel 里直接复制粘贴，逗号、顿号、Tab 都能识别"
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                loading={saving}
                disabled={!namesText.trim()}
                onClick={() => void addNames()}
                style={{ flex: '0 0 auto' }}
              >
                添加到名单
              </Button>
              <Upload
                accept=".csv,.txt"
                showUploadList={false}
                beforeUpload={(file) => {
                  void readNameFile(file);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />}>选择 CSV/TXT</Button>
              </Upload>
              <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
                浏览器里只解析 CSV/TXT，Excel 请先「另存为 CSV」或直接粘贴
              </span>
            </div>
            {table}
          </Space>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Button onClick={() => setOpen(false)}>关闭</Button>
        </div>
      </Modal>
    </ConfigProvider>
  );
}
