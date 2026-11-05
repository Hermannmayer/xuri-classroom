import { useCallback, useEffect, useState } from 'react';
import { Button, Empty, message, Modal, Popconfirm, Select, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getWithPagination, post } from '../../api';

interface Partner {
  id: string;
  userId?: string;
  userName?: string;
  type?: number;
  status?: number;
}

interface SysUser {
  userId: string;
  name?: string;
  username?: string;
}

/**
 * 协作管理员：给一份考试/问卷加协作者（后端 type=2）。
 * 协作者可以编辑题目、看数据，但不能删除项目本身。
 */
export default function PartnerPanel({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<SysUser[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getWithPagination<Partner>('/api/project/partner/list', {
        projectId,
        current: 1,
        pageSize: 100,
      });
      // 只显示协作者（type=2），答卷人/白名单不在这里管
      setRows(res.data.filter((item) => item.type === 2 || item.type === undefined));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = async () => {
    setOpen(true);
    setSelected([]);
    try {
      const res = await getWithPagination<SysUser>('/api/system/user/list', { current: 1, pageSize: 200 });
      setUsers(res.data);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const add = async () => {
    if (selected.length === 0) {
      message.warning('先选要添加的人');
      return;
    }
    setSaving(true);
    try {
      await post('/api/project/partner/create', { projectId, type: 2, userIds: selected });
      message.success(`已添加 ${selected.length} 位协作者`);
      setOpen(false);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Partner) => {
    try {
      await post('/api/project/partner/delete', { ids: [row.id] });
      message.success('已移除');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
          协作者可以编辑题目、查看数据，不能删除项目
        </div>
        <div style={{ flex: 1 }} />
        <Button size="small" icon={<PlusOutlined />} onClick={openAdd}>
          添加协作者
        </Button>
      </div>

      <Table<Partner>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: <Empty description="还没有协作者" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        columns={[
          { title: '姓名', dataIndex: 'userName', render: (v: string) => v || '—' },
          {
            title: '角色',
            dataIndex: 'type',
            width: 100,
            render: () => <Tag color="blue">协作者</Tag>,
          },
          {
            title: '操作',
            key: 'ops',
            width: 80,
            render: (_, row) => (
              <Popconfirm title="移除这位协作者？" okText="移除" cancelText="取消" onConfirm={() => remove(row)}>
                <a style={{ color: 'var(--bp-orange)' }}>移除</a>
              </Popconfirm>
            ),
          },
        ]}
      />

      <Modal
        title="添加协作者"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={add}
        confirmLoading={saving}
        okText="添加"
        cancelText="取消"
        destroyOnClose
      >
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="选择用户（可多选）"
          value={selected}
          onChange={setSelected}
          optionFilterProp="label"
          options={users.map((u) => ({ value: u.userId, label: u.name || u.username || u.userId }))}
        />
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--bp-text-soft)' }}>
          只能选已有账号的用户；学员账号一般不需要加进来。
        </div>
      </Modal>
    </div>
  );
}
