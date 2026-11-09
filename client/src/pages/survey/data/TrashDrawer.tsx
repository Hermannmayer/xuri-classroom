/**
 * 答卷回收站：删除只是 is_deleted=1，这里能恢复或彻底删除。
 */
import { useCallback, useEffect, useState } from 'react';
import { App, Button, Drawer, Empty, message, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import LinkAction from '../../../components/LinkAction';
import TableScrollRegion from '../../../components/TableScrollRegion';
import { get, post } from '../../../api';
import { can, loadAuthorities } from '../../../auth/permissions';
import type { Answer } from '../../../schema/project';
import { TABLE_COMPONENTS } from '../../repo/table';
import { PERMISSION_CODES } from '../../../auth/permission-codes';

export interface TrashDrawerProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  /** 恢复/彻底删除后让主列表重新拉一遍 */
  onChanged: () => void;
}

export default function TrashDrawer({ open, projectId, onClose, onChanged }: TrashDrawerProps) {
  const { modal } = App.useApp();
  const [rows, setRows] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [authorities, setAuthorities] = useState<string[]>([]);

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  // 按钮级权限：恢复要 answer:restore，彻底删除要 answer:delete；没有权限的动作不渲染
  const canRestore = can(authorities, PERMISSION_CODES.answerRestore);
  const canDelete = can(authorities, PERMISSION_CODES.answerDelete);
  const canOperate = canRestore || canDelete;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await get<Answer[]>('/api/answer/trash', { projectId }));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    void load();
  }, [open, load]);

  const run = async (action: 'restore' | 'destroy', ids: string[]) => {
    if (ids.length === 0) {
      message.warning('先选择要处理的答卷');
      return;
    }
    try {
      await post(`/api/answer/${action}`, { ids });
      message.success(action === 'restore' ? `已恢复 ${ids.length} 份` : `已彻底删除 ${ids.length} 份`);
      setSelected([]);
      await load();
      onChanged();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  /** 彻底删除不可恢复，必须二次确认 */
  const confirmDestroy = (ids: string[]) => {
    if (ids.length === 0) {
      message.warning('先选择要处理的答卷');
      return;
    }
    modal.confirm({
      title: `彻底删除 ${ids.length} 份答卷？`,
      content: '彻底删除后无法恢复，附件也会一起清掉。',
      okText: '彻底删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => run('destroy', ids),
    });
  };

  const actionColumn: ColumnsType<Answer>[number] = {
    title: '',
    key: 'ops',
    width: 130,
    render: (_, row) => (
      <Space size={8}>
        {canRestore && <LinkAction onClick={() => void run('restore', [row.id])}>恢复</LinkAction>}
        {canDelete && (
          <LinkAction style={{ color: 'var(--bp-orange)' }} onClick={() => confirmDestroy([row.id])}>
            彻底删除
          </LinkAction>
        )}
      </Space>
    ),
  };

  return (
    <Drawer
      title={`回收站 · 共 ${rows.length} 份`}
      placement="right"
      width="min(560px, 100vw)"
      open={open}
      onClose={onClose}
    >
      {canOperate ? (
        <Space style={{ marginBottom: 12 }} wrap>
          {canRestore && (
            <Button disabled={selected.length === 0} onClick={() => void run('restore', selected)}>
              恢复选中
            </Button>
          )}
          {canDelete && (
            <Button danger disabled={selected.length === 0} onClick={() => confirmDestroy(selected)}>
              彻底删除选中
            </Button>
          )}
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>已选中 {selected.length} 条</span>
        </Space>
      ) : (
        <div style={{ marginBottom: 12, fontSize: 11, color: 'var(--bp-text-soft)' }}>
          你没有恢复答卷或彻底删除答卷的权限，只能查看回收站。
        </div>
      )}

      <TableScrollRegion label="回收站列表（可横向滚动）">
      <Table<Answer>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={rows}
        components={TABLE_COMPONENTS}
        locale={{ emptyText: <Empty description="回收站是空的" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        rowSelection={
          canOperate
            ? {
                selectedRowKeys: selected,
                onChange: (keys) => setSelected(keys as string[]),
              }
            : undefined
        }
        pagination={false}
        scroll={{ x: 460 }}
        columns={[
          {
            title: '提交时间',
            dataIndex: 'createAt',
            width: 160,
            render: (v: string) => <span style={{ fontSize: 12 }}>{v || '—'}</span>,
          },
          {
            title: '答卷人',
            dataIndex: 'createByName',
            width: 110,
            render: (v: string, row) => <span style={{ fontSize: 12 }}>{v || row.createBy?.slice(0, 8) || '匿名'}</span>,
          },
          ...(canOperate ? [actionColumn] : []),
        ]}
      />
      </TableScrollRegion>
    </Drawer>
  );
}
