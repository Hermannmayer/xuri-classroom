import { useEffect, useState } from 'react';
import { Alert, message, Modal, Select } from 'antd';
import { get, post } from '../../api';

interface Dept {
  id: string;
  name: string;
  children?: Dept[];
}

/**
 * 题库授权：按用户组（班级）授权，只写一条 dept 记录，组员靠 t_user.dept_id 自动继承。
 * 后端 t_repo_partner.dept_id + listRepo/assertReadableRepo 的组匹配负责可见性。
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeptId(undefined);
    get<Dept[]>('/api/system/dept/list')
      .then((list) => setDepts(list ?? []))
      .catch((e: Error) => message.error(e.message));
  }, [open]);

  const grant = async () => {
    if (!repoId || !deptId) {
      message.warning('先选一个用户组');
      return;
    }
    setSaving(true);
    try {
      await post('/api/repo/partner/create', { repoId, deptId });
      message.success('已授权该用户组，组内成员自动可见');
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
      okText="授权该用户组"
      cancelText="取消"
      width={480}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="按用户组授权后，组内成员自动可见；以后新加入该组的学员无需重新授权。"
      />
      <Select
        style={{ width: '100%' }}
        placeholder="选择用户组 / 班级"
        value={deptId}
        onChange={setDeptId}
        options={flatten(depts).map((d) => ({ value: d.id, label: `${'　'.repeat(d.depth)}${d.name}` }))}
      />
    </Modal>
  );
}
