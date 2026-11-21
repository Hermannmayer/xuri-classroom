import { useEffect, useMemo, useState } from 'react';
import { Alert, App, DatePicker, Form, Input, Modal, Select, Switch, TreeSelect } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { getSystem, post } from '../../api';
import LinkAction from '../../components/LinkAction';
import DeleteDeptDialog from './DeleteDeptDialog';


export interface DeptNode {
  id: string;
  name: string;
  parentId?: string;
  classKind?: 'group' | 'teaching';
  allowRegister?: boolean;
  validFrom?: string;
  validTo?: string;
  children?: DeptNode[];
}

interface DeptFormValues {
  name: string;
  parentId?: string;

  classKind?: 'group' | 'teaching';

  allowRegister?: boolean;
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


function toParentTree(nodes: DeptNode[], exclude: Set<string>): { value: string; title: string; children?: any[] }[] {
  return nodes
    .filter((node) => !exclude.has(node.id) && node.classKind === 'group')
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

  defaultParentId?: string;
  tree: DeptNode[];
  canDelete: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<DeptFormValues>();
  const classKind = Form.useWatch<string>('classKind', form);
  const [saving, setSaving] = useState(false);

  const [globalRegisterEnabled, setGlobalRegisterEnabled] = useState(true);

  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeleteOpen(false);
    getSystem()
      .then((sys) => setGlobalRegisterEnabled(sys?.registerInfo?.registerEnabled !== false))
      .catch(() => setGlobalRegisterEnabled(true));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && node) {
      const parentInTree = findNode(tree, node.parentId);
      form.setFieldsValue({
        name: node.name || '',
        parentId: parentInTree ? node.parentId : undefined,
        classKind: node.classKind || 'teaching',
        allowRegister: Boolean(node.allowRegister),
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
        classKind: 'teaching',
        allowRegister: false,
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
      classKind: values.classKind || 'teaching',
      allowRegister: values.classKind === 'group' ? false : Boolean(values.allowRegister),
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

        setDeleteOpen(false);
        onClose();
      }}
      onOk={() => void submit()}
      confirmLoading={saving}
      okText={mode === 'edit' ? '保存' : '创建'}
      cancelText="取消"
      width="min(560px, 94vw)"
      destroyOnHidden
    >
      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.9, marginBottom: 12 }}>
        {mode === 'edit'
          ? '这里维护班级名称、上级、开放注册和有效期；学员与任课老师在班级管理页维护。'
          : '新建的班级会出现在左侧班级树里；建好后可以继续添加学员、分配任课老师。'}
      </div>

      <Form form={form} layout="vertical" size="small" preserve={false} requiredMark={false}>
        <Form.Item name="name" label="班级名称" rules={[{ required: true, whitespace: true, message: '请填写班级名称' }]}>
          <Input placeholder="例如：2025 级护理 1 班" maxLength={64} autoComplete="off" />
        </Form.Item>

        <Form.Item
          name="classKind"
          label="节点类型"
          extra="容器班只做层级；教学班才能收学员、开放注册、分配考试/题库"
          rules={[{ required: true, message: '请选择节点类型' }]}
        >
          <Select
            options={[
              { value: 'teaching', label: '教学班（真实班级，可收学员）' },
              { value: 'group', label: '容器班（只做层级，不收学员）' },
            ]}
            onChange={(value: string) => {
              if (value === 'group') form.setFieldValue('allowRegister', false);
            }}
          />
        </Form.Item>

        <Form.Item name="parentId" label="上级班级" extra="只能选择容器班；教学班是叶子，不能再挂子班">
          <TreeSelect
            allowClear
            showSearch
            treeNodeFilterProp="title"
            treeDefaultExpandAll
            placeholder="选择上级班级（可留空）"
            treeData={parentTreeData}
            styles={{ popup: { root: { maxHeight: 360, overflow: 'auto' } } }}
          />
        </Form.Item>

        <Form.Item
          name="allowRegister"
          label="开放注册"
          valuePropName="checked"
          extra={
            !globalRegisterEnabled
              ? '管理员未开启全局注册，暂时不能开放；请先在系统设置里打开'
              : classKind === 'group'
                ? '容器班只做层级，不能开放注册；请到具体教学班开放'
                : '开启后，学员注册页会出现这个班级；注册学员需要审核通过后才能登录'
          }
        >
          <Switch
            checkedChildren="开放"
            unCheckedChildren="关闭"
            disabled={!globalRegisterEnabled || classKind === 'group'}
          />
        </Form.Item>

        {!globalRegisterEnabled && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 14 }}
            title="全局注册已关闭"
            description="班级的「开放注册」不会生效，登录页也不会显示注册入口。请联系管理员在「系统设置 → 登录与注册」里打开。"
          />
        )}

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
