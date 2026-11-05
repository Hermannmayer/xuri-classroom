import { useEffect, useState } from 'react';
import { Alert, message, Modal, Select, Table } from 'antd';
import { get, getWithPagination, post } from '../../api';

interface Dept {
  id: string;
  name: string;
  children?: Dept[];
}
interface User {
  userId: string;
  name?: string;
  username?: string;
}

/**
 * 题库授权：按用户组（班级）批量把组员加入 t_repo_partner。
 * 走现有接口，不需要后端新增能力；组员变动后重新授权一次即可。
 */
export default function GrantModal({
  repoId,
  repoName,
  open,
  onClose,
}: {
  repoId?: string;
  repoName?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [deptId, setDeptId] = useState<string>();
  const [members, setMembers] = useState<User[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    get<Dept[]>('/api/system/dept/list')
      .then((list) => setDepts(list ?? []))
      .catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!deptId) {
      setMembers([]);
      setSelected([]);
      return;
    }
    setLoading(true);
    getWithPagination<User>('/api/system/user/list', { deptId, current: 1, pageSize: -1 })
      .then((res) => {
        setMembers(res.data);
        setSelected(res.data.map((u) => u.userId));
      })
      .catch((e: Error) => message.error(e.message))
      .finally(() => setLoading(false));
  }, [deptId]);

  const grant = async () => {
    if (!repoId || selected.length === 0) {
      message.warning('先选一个分组');
      return;
    }
    setSaving(true);
    try {
      await post('/api/repo/partner/create', { repoId, userIds: selected });
      message.success(`已授权 ${selected.length} 人`);
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const flatten = (list: Dept[], depth = 0): { id: string; name: string; depth: number }[] =>
    list.flatMap((d) => [{ id: d.id, name: d.name, depth }, ...flatten(d.children ?? [], depth + 1)]);

  return (
    <Modal
      title={`授权题库${repoName ? `：${repoName}` : ''}`}
      open={open}
      onCancel={onClose}
      onOk={grant}
      confirmLoading={saving}
      okText="授权选中人员"
      cancelText="取消"
      width={560}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="按分组批量授权：选中分组后会把该组所有成员加入这个题库的可见名单。组员变动后重新授权一次即可。"
      />
      <Select
        style={{ width: '100%', marginBottom: 12 }}
        placeholder="选择用户组 / 班级"
        value={deptId}
        onChange={setDeptId}
        options={flatten(depts).map((d) => ({ value: d.id, label: `${'　'.repeat(d.depth)}${d.name}` }))}
      />
      <Table<User>
        rowKey="userId"
        size="small"
        loading={loading}
        dataSource={members}
        pagination={false}
        scroll={{ y: 240 }}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys as string[]),
        }}
        columns={[
          { title: '姓名', dataIndex: 'name', render: (v: string) => v || '—' },
          { title: '账号', dataIndex: 'username' },
        ]}
      />
    </Modal>
  );
}
