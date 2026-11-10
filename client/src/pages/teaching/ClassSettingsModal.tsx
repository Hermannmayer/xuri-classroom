import { useEffect, useMemo, useState } from 'react';
import { App, DatePicker, Form, Input, Modal, TreeSelect } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { post } from '../../api';
import LinkAction from '../../components/LinkAction';
import DeleteDeptDialog from './DeleteDeptDialog';

/** 与后端 ClassNodeView 对齐（班级设置弹窗只用其中一部分） */
export interface DeptNode {
  id: string;
  name: string;
  parentId?: string;
  validFrom?: string;
  validTo?: string;
  children?: DeptNode[];
}

interface DeptFormValues {
  name: string;
  parentId?: string;
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
 * 班级设置：只维护班级本身（名称、上级、有效期）。
 *
 * <p>角色绑定属于「用户组（教职工）」，不在班级里做；学员与任课老师在班级管理页维护。
 * 新建/编辑走 teaching/classes/create|update；删除仍走 system/dept/delete（入口由班级管理页按权限控制）。
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
  const [saving, setSaving] = useState(false);
  /** 删除统一走 DeleteDeptDialog（预检子组/成员，成员二选一：移出或迁移） */
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeleteOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && node) {
      const parentInTree = findNode(tree, node.parentId);
      form.setFieldsValue({
        name: node.name || '',
        parentId: parentInTree ? node.parentId : undefined,
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
      validFrom: from ? from.startOf('day').toISOString() : null,
      validTo: to ? to.endOf('day').toISOString() : null,
    };
    setSaving(true);
    try {
      if (mode === 'edit' && node) {
        await post('/api/teaching/classes/update', { id: node.id, ...payload });
        message.success('已保存班级设置');
      } else {
        await post('/api/teaching/classes/create', payload);
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

  return (
    <Modal
      title={mode === 'edit' ? `班级设置：${node?.name || ''}` : '新建班级'}
      open={open}
      onCancel={() => {
        // 关掉设置弹窗时顺手收起删除弹窗，避免下次打开时它还开着
        setDeleteOpen(false);
        onClose();
      }}
      onOk={() => void submit()}
      confirmLoading={saving}
      okText={mode === 'edit' ? '保存' : '创建'}
      cancelText="取消"
      width="min(560px, 94vw)"
      destroyOnClose
    >
      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.9, marginBottom: 12 }}>
        {mode === 'edit'
          ? '这里维护班级名称、上级和有效期；学员与任课老师在班级管理页维护。'
          : '新建的班级会出现在左侧班级树里；建好后可以继续添加学员、分配任课老师。'}
      </div>

      <Form form={form} layout="vertical" size="small" preserve={false} requiredMark={false}>
        <Form.Item name="name" label="班级名称" rules={[{ required: true, whitespace: true, message: '请填写班级名称' }]}>
          <Input placeholder="例如：2025 级护理 1 班" maxLength={64} autoComplete="off" />
        </Form.Item>

        <Form.Item name="parentId" label="上级班级" extra="留空表示放在根级">
          <TreeSelect
            allowClear
            showSearch
            treeNodeFilterProp="title"
            treeDefaultExpandAll
            placeholder="选择上级班级（可留空）"
            treeData={parentTreeData}
            dropdownStyle={{ maxHeight: 360, overflow: 'auto' }}
          />
        </Form.Item>

        <Form.Item name="validity" label="班级有效期" extra="留空表示永久有效">
          <DatePicker.RangePicker style={{ width: '100%' }} allowEmpty={[true, true]} />
        </Form.Item>
      </Form>

      {mode === 'edit' && node && canDelete && (
        <div style={{ marginTop: 4 }}>
          <LinkAction style={{ color: 'var(--bp-orange)', fontSize: 12 }} onClick={() => setDeleteOpen(true)}>
            删除这个班级
          </LinkAction>
        </div>
      )}

      {node && (
        <DeleteDeptDialog
          open={deleteOpen}
          deptId={node.id}
          deptName={node.name}
          deptType="class"
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => {
            onSaved();
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
