import { useEffect, useMemo, useState } from 'react';
import { Alert, App, Modal, Radio, Space, Spin, TreeSelect } from 'antd';
import { get, post } from '../../api';

/** 与后端 delete-check 响应对齐 */
interface DeleteCheck {
  id: string;
  name?: string;
  childCount?: number;
  childNames?: string[];
  primaryMemberCount?: number;
  extraMemberCount?: number;
  memberNames?: string[];
  /** 是不是最后一个用户组：只提示，不阻止删除 */
  lastDept?: boolean;
}

/** /api/system/dept/list 的节点：后端可能返回扁平表（只有 parentId），也可能已经嵌套 */
interface DeptNode {
  id: string;
  name?: string;
  parentId?: string;
  children?: DeptNode[];
}

interface TreeOption {
  value: string;
  title: string;
  children?: TreeOption[];
}

type MemberAction = 'UNASSIGN' | 'MOVE';

function buildTree(list: DeptNode[]): DeptNode[] {
  // 已经带 children 的按嵌套树处理，否则按 parentId 组装（父节点不在结果里时当根）
  if (list.some((node) => (node.children?.length ?? 0) > 0)) return list;
  const map = new Map<string, DeptNode & { children: DeptNode[] }>();
  list.forEach((node) => map.set(node.id, { ...node, children: [] }));
  const roots: DeptNode[] = [];
  map.forEach((node) => {
    const parent = node.parentId ? map.get(node.parentId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

function findNode(nodes: DeptNode[], id: string): DeptNode | undefined {
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

/** 迁移目标不能是本组或它的子组，否则等于没迁移或成环 */
function toTreeOptions(nodes: DeptNode[], exclude: Set<string>): TreeOption[] {
  return nodes
    .filter((node) => !exclude.has(node.id))
    .map((node) => ({
      value: node.id,
      title: node.name || '(未命名用户组)',
      children:
        node.children && node.children.length > 0 ? toTreeOptions(node.children, exclude) : undefined,
    }));
}

/**
 * 删除用户组 / 班级的统一弹窗。
 *
 * 打开时先调 delete-check 拿到子组与成员情况，再让用户决定成员去向：
 * - 有子组：后端会拒绝，这里直接禁用提交并说明原因；
 * - 有成员：必须二选一（移出分组 UNASSIGN / 迁移到其他组 MOVE），默认移出；
 * - 最后一个组：只提示「删除后大家会变成未分组」，不阻止。
 *
 * 三个入口共用：班级管理页、班级设置弹窗、用户组页。
 */
export default function DeleteDeptDialog({
  open,
  deptId,
  deptName,
  /** 迁移目标只列同类型节点：用户组页传 org，班级页传 class；不传则列全部（兼容旧调用） */
  deptType,
  onClose,
  onDeleted,
}: {
  open: boolean;
  deptId: string;
  deptName?: string;
  deptType?: 'org' | 'class';
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { message } = App.useApp();
  const [check, setCheck] = useState<DeleteCheck>();
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkError, setCheckError] = useState<string>();
  const [deptTree, setDeptTree] = useState<DeptNode[]>([]);
  const [deptError, setDeptError] = useState<string>();
  const [action, setAction] = useState<MemberAction>('UNASSIGN');
  const [moveToDeptId, setMoveToDeptId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !deptId) return;
    // 每次打开都重置：避免上一次删除的成员去向/目标组残留
    let alive = true;
    setCheck(undefined);
    setCheckError(undefined);
    setCheckLoading(true);
    setDeptTree([]);
    setDeptError(undefined);
    setAction('UNASSIGN');
    setMoveToDeptId(undefined);
    setSubmitting(false);

    get<DeleteCheck>('/api/system/dept/delete-check', { id: deptId })
      .then((res) => {
        if (alive) setCheck(res);
      })
      .catch((e: Error) => {
        if (!alive) return;
        const text = e.message || '读取删除预检信息失败';
        setCheckError(text);
        message.error(text);
      })
      .finally(() => {
        if (alive) setCheckLoading(false);
      });

    get<DeptNode[]>('/api/system/dept/list', deptType ? { deptType } : undefined)
      .then((list) => {
        if (alive) setDeptTree(buildTree(Array.isArray(list) ? list : []));
      })
      .catch((e: Error) => {
        if (!alive) return;
        const text = e.message || '读取用户组失败';
        setDeptError(text);
        message.error(text);
      });

    return () => {
      alive = false;
    };
  }, [open, deptId, deptType, message]);

  const childCount = check?.childCount ?? 0;
  const memberCount = (check?.primaryMemberCount ?? 0) + (check?.extraMemberCount ?? 0);
  const childNames = check?.childNames ?? [];
  const memberNames = check?.memberNames ?? [];
  const blockedByChildren = childCount > 0;
  const ready = Boolean(check) && !checkLoading && !checkError && !blockedByChildren;

  const moveTree = useMemo(() => {
    if (deptTree.length === 0) return [];
    const self = findNode(deptTree, deptId);
    const exclude = new Set(self ? collectSubtreeIds(self) : [deptId]);
    return toTreeOptions(deptTree, exclude);
  }, [deptTree, deptId]);

  const submit = async () => {
    if (!check || !ready || submitting) return;
    if (memberCount > 0 && action === 'MOVE' && !moveToDeptId) {
      message.warning('请选择要迁移到的目标组');
      return;
    }
    setSubmitting(true);
    try {
      await post('/api/system/dept/delete', {
        id: deptId,
        // 没有成员时按约定不传也行，这里统一带 UNASSIGN，语义等价且更稳
        memberAction: memberCount > 0 ? action : 'UNASSIGN',
        moveToDeptId: memberCount > 0 && action === 'MOVE' ? moveToDeptId : undefined,
      });
      message.success('已删除「' + (check.name || deptName || '该用户组') + '」');
      onDeleted();
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={'删除用户组：' + (deptName || check?.name || '')}
      open={open}
      onCancel={onClose}
      onOk={() => void submit()}
      okText="删除"
      okButtonProps={{ danger: true, disabled: !ready }}
      confirmLoading={submitting}
      cancelText="取消"
      width="min(560px, 94vw)"
      destroyOnClose
    >
      {checkLoading ? (
        <div style={{ padding: '30px 0', textAlign: 'center' }}>
          <Spin />
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--bp-text-soft)' }}>
            正在检查子组与成员…
          </div>
        </div>
      ) : checkError ? (
        <Alert type="error" showIcon message="无法删除：预检失败" description={checkError} />
      ) : check ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {blockedByChildren && (
            <Alert
              type="error"
              showIcon
              message={'「' + (check.name || deptName || '该组') + '」下面还有 ' + childCount + ' 个子分组'}
              description={
                childNames.slice(0, 8).join('、') +
                (childNames.length > 8 ? ' 等' : '') +
                '；请先把子分组迁移或删除，再删本组。'
              }
            />
          )}

          <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.9 }}>
            <div>子组：{childCount} 个</div>
            <div>
              成员：主组 {check.primaryMemberCount ?? 0} 人 · 附加组 {check.extraMemberCount ?? 0} 人
            </div>
            {memberCount > 0 ? (
              <div>
                成员名单：{memberNames.slice(0, 8).join('、')}
                {memberNames.length > 8 ? ' 等 ' + memberNames.length + ' 人' : ''}
              </div>
            ) : (
              <div>这个组里没有成员，删除不会影响任何账号。</div>
            )}
          </div>

          {check.lastDept && (
            <Alert
              type="warning"
              showIcon
              message="这是最后一个用户组，删除后大家会变成未分组"
              description="仍可继续删除；建议先新建一个用户组，再把成员迁移过去。"
            />
          )}

          {memberCount > 0 && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 6 }}>
                这些成员怎么处理？
              </div>
              <Radio.Group
                value={action}
                onChange={(event) => {
                  const next = event.target.value as MemberAction;
                  setAction(next);
                  if (next !== 'MOVE') setMoveToDeptId(undefined);
                }}
              >
                <Space direction="vertical">
                  <Radio value="UNASSIGN">移出分组（变成未分组，账号仍可登录）</Radio>
                  <Radio value="MOVE" disabled={Boolean(deptError)}>
                    迁移到其他组（主组改成目标组）
                  </Radio>
                </Space>
              </Radio.Group>

              {action === 'MOVE' && (
                <div style={{ marginTop: 8 }}>
                  {deptError ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="读取用户组失败，暂时不能迁移"
                      description={deptError}
                    />
                  ) : (
                    <TreeSelect
                      style={{ width: '100%' }}
                      value={moveToDeptId}
                      onChange={(value) =>
                        setMoveToDeptId(typeof value === 'string' ? value : undefined)
                      }
                      treeData={moveTree}
                      treeDefaultExpandAll
                      showSearch
                      treeNodeFilterProp="title"
                      allowClear
                      placeholder="选择要迁移到的目标组（不能是本组或子组）"
                      notFoundContent="没有可迁移的目标组"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
