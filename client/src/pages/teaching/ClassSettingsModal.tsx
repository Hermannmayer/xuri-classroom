import { useEffect, useMemo, useState } from 'react';
import { Alert, App, DatePicker, Form, Input, Modal, Popconfirm, Select, TreeSelect } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { get, post } from '../../api';

/** 与后端 ClassNodeView 对齐（班级设置弹窗只用其中一部分） */
export interface DeptNode {
  id: string;
  name: string;
  parentId?: string;
  managerId?: string;
  managerName?: string;
  memberCount?: number;
  roleIds?: string[];
  validFrom?: string;
  validTo?: string;
  children?: DeptNode[];
}

interface Role {
  id: string;
  name?: string;
  code?: string;
}

interface DeptFormValues {
  name: string;
  parentId?: string;
  roleIds?: string[];
  validity?: [Dayjs, Dayjs] | undefined;
}

function findNode(nodes: DeptNode[], id?: string): DeptNode | undefined {
  if (!id) return undefined;
  for (const node of nodes) {
    if (node.id === id) return node;
    const hit = findNode(node.children ?? [], id);
    if (hit) return hit;
  }
  return undefined;
}

function collectSubtreeIds(node: DeptNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(collectSubtreeIds)];
}

/** 编辑时上级不能选自己或自己的子孙，否则后端会以「成环」拒绝 */
function toParentTree(nodes: DeptNode[], exclude: Set<string>): { value: string; title: string; children?: any[] }[] {
  return nodes
    .filter((node) => !exclude.has(node.id))
    .map((node) => ({
      value: node.id,
      title: node.name || '(未命名)',
      children: node.children && node.children.length ? toParentTree(node.children, exclude) : undefined,
    }));
}

/**
 * 班级设置：把原「用户组」页的建组 / 改名 / 上级 / 角色 / 有效期搬进班级管理，
 * 避免管理员在两棵树上重复操作。
 *
 * <p>仅由班级管理页在拥有 system:dept:create/update/delete 时渲染；老师不会看到这个入口。
 */
export default function ClassSettingsModal({
  open,
  mode,
  node,
  defaultParentId,
  tree,
  canDelete,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  node?: DeptNode | null;
  /** 新建子班时的默认上级 */
  defaultParentId?: string;
  tree: DeptNode[];
  canDelete: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<DeptFormValues>();
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleError, setRoleError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRoleError(undefined);
    get<{ list?: Role[] }>('/api/system/role/list', { current: 1, pageSize: 100 })
      .then((res) => setRoles(res?.list ?? []))
      .catch((e: Error) => {
        // 没有 system:role:list 的角色仍可改名称/上级，只是不能改绑定角色
        setRoles([]);
        setRoleError(e.message || '没有权限读取角色列表');
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && node) {
      const parentInTree = findNode(tree, node.parentId);
      form.setFieldsValue({
        name: node.name || '',
        parentId: parentInTree ? node.parentId : undefined,
        roleIds: node.roleIds ?? [],
        validity:
          node.validFrom || node.validTo
            ? [
                node.validFrom ? dayjs(node.validFrom) : dayjs(0),
                node.validTo ? dayjs(node.validTo) : dayjs('2099-12-31'),
              ]
            : undefined,
      });
    } else {
      form.setFieldsValue({
        name: '',
        parentId: defaultParentId,
        roleIds: [],
        validity: undefined,
      });
    }
  }, [open, mode, node, defaultParentId, tree, form]);

  const parentTreeData = useMemo(() => {
    if (mode !== 'edit' || !node) return toParentTree(tree, new Set());
    return toParentTree(tree, new Set(collectSubtreeIds(node)));
  }, [tree, mode, node]);

  const submit = async () => {
    if (saving) return;
    let values: DeptFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const [from, to] = values.validity ?? [];
    const payload = {
      name: values.name.trim(),
      parentId: values.parentId || undefined,
      roleIds: values.roleIds ?? [],
      validFrom: from ? from.startOf('day').toISOString() : null,
      validTo: to ? to.endOf('day').toISOString() : null,
    };
    setSaving(true);
    try {
      if (mode === 'edit' && node) {
        await post('/api/system/dept/update', { id: node.id, ...payload });
        message.success('已保存班级设置');
      } else {
        await post('/api/system/dept/create', payload);
        message.success('已创建班级');
      }
      onSaved();
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!node || deleting) return;
    setDeleting(true);
    try {
      await post('/api/system/dept/delete', { id: node.id });
      message.success('已删除班级');
      onSaved();
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      title={mode === 'edit' ? `班级设置：${node?.name || ''}` : '新建班级'}
      open={open}
      onCancel={onClose}
      onOk={() => void submit()}
      confirmLoading={saving}
      okText={mode === 'edit' ? '保存' : '创建'}
      cancelText="取消"
      width="min(560px, 94vw)"
      destroyOnClose
    >
      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.9, marginBottom: 12 }}>
        {mode === 'edit'
          ? '这里的名称、上级、角色和有效期就是原「用户组」页的设置；成员和任课老师在班级管理页维护。'
          : '新建的班级会出现在左侧班级树里；建好后可以继续分配老师和添加学员。'}
      </div>

      <Form form={form} layout="vertical" size="small" preserve={false} requiredMark={false}>
        <Form.Item name="name" label="班级名称" rules={[{ required: true, whitespace: true, message: '请填写班级名称' }]}>
          <Input placeholder="例如：2025 级护理 1 班" maxLength={64} autoComplete="off" />
        </Form.Item>

        <Form.Item name="parentId" label="上级班级 / 用户组" extra="留空表示放在根级">
          <TreeSelect
            allowClear
            showSearch
            treeNodeFilterProp="title"
            treeDefaultExpandAll
            placeholder="选择上级（可留空）"
            treeData={parentTreeData}
            dropdownStyle={{ maxHeight: 360, overflow: 'auto' }}
          />
        </Form.Item>

        <Form.Item
          name="roleIds"
          label="绑定角色"
          extra={
            roleError
              ? undefined
              : '组内成员会继承这里的角色；只影响权限，不影响班级成员名单'
          }
        >
          <Select
            mode="multiple"
            allowClear
            placeholder={roleError ? '读不到角色列表' : '选择角色（可留空）'}
            options={roles.map((role) => ({
              value: role.id,
              label: role.name || role.code || role.id,
            }))}
            disabled={Boolean(roleError)}
          />
        </Form.Item>

        {roleError && (
          <Alert
            style={{ marginBottom: 12 }}
            type="warning"
            showIcon
            message="读不到角色列表"
            description={`${roleError}；本次仍可修改名称/上级/有效期，角色绑定请让管理员处理。`}
          />
        )}

        <Form.Item name="validity" label="组有效期" extra="留空表示永久有效">
          <DatePicker.RangePicker style={{ width: '100%' }} allowEmpty={[true, true]} />
        </Form.Item>
      </Form>

      {mode === 'edit' && node && canDelete && (
        <div style={{ marginTop: 4 }}>
          <Popconfirm
            title={`删除「${node.name || '该班级'}」？`}
            description="班级下的子班与成员关系会一起受影响，删除前请确认。"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => void remove()}
          >
            <a style={{ color: 'var(--bp-orange)', fontSize: 12 }}>{deleting ? '删除中…' : '删除这个班级'}</a>
          </Popconfirm>
        </div>
      )}
    </Modal>
  );
}
