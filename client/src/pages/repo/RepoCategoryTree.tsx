import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Input, Modal, Spin, Tree, message } from 'antd';
import type { TreeDataNode } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { get, post } from '../../api';

/** 与后端 RepoCategoryView 对齐：扁平结构，按 path 拆 "/" 建树 */
interface RepoCategory {
  /** 目录登记表 id；由 t_repo.category 推导出来的层级可能为 null */
  id?: string | null;
  name?: string;
  parentId?: string | null;
  /** 全路径（"/" 连接）；「未分类」为空串 */
  path?: string;
  parentPath?: string;
  count?: number;
}

const ALL_KEY = '__all_repo_categories__';
const UNCATEGORIZED_KEY = '__uncategorized__';
const UNCATEGORIZED_LABEL = '未分类';

interface CategoryMeta {
  node: RepoCategory;
  path: string;
  parentPath: string;
}

interface BuiltTree {
  data: TreeDataNode[];
  meta: Map<string, CategoryMeta>;
  /** 是否存在「未分类」（path 为空）的题库 */
  uncategorizedCount: number;
}

function normalizePath(value?: string) {
  return (value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function buildTree(list: RepoCategory[]): BuiltTree {
  const meta = new Map<string, CategoryMeta>();
  const children = new Map<string, RepoCategory[]>();
  let uncategorizedCount = 0;

  for (const item of list) {
    const path = normalizePath(item.path ?? item.name);
    if (!path) {
      // 「未分类」：后端用空 path 表示；不能按 category 精确过滤，树里只做展示
      uncategorizedCount = item.count ?? 0;
      continue;
    }
    const name = (item.name || path.split('/').pop() || '').trim();
    const parentPath = normalizePath(
      item.parentPath ?? (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''),
    );
    meta.set(path, { node: { ...item, name, path, parentPath }, path, parentPath });
    const bucket = children.get(parentPath) ?? [];
    if (!bucket.some((node) => normalizePath(node.path) === path)) {
      bucket.push({ ...item, name, path, parentPath });
    }
    children.set(parentPath, bucket);
  }

  const toTree = (parentPath: string): TreeDataNode[] =>
    (children.get(parentPath) ?? [])
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'))
      .map((item) => {
        const path = normalizePath(item.path);
        return {
          key: path,
          title: (
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, maxWidth: '100%' }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name || '(未命名分类)'}
              </span>
              <span style={{ flex: '0 0 auto', fontSize: 11, color: 'var(--bp-text-soft)' }}>
                {item.count ?? 0}
              </span>
            </span>
          ),
          children: children.has(path) ? toTree(path) : undefined,
        };
      });

  const data = toTree('');
  if (uncategorizedCount > 0) {
    data.push({
      key: UNCATEGORIZED_KEY,
      // 未分类的 category 为空，后端 listRepo 没有可用的精确过滤值；这里只展示数量
      selectable: false,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, color: 'var(--bp-text-soft)' }}>
          <span>{UNCATEGORIZED_LABEL}</span>
          <span style={{ fontSize: 11 }}>{uncategorizedCount}</span>
        </span>
      ),
    });
  }

  return { data, meta, uncategorizedCount };
}

/**
 * 题库左侧分类树：根「全部分类」，节点显示 name + count。
 *
 * <p>后端 /api/repo/categories 是扁平列表（按 path 拆层级），选中回传 (path, id)：
 * path 用于 /api/repo/list?category= 精确过滤；「新建文件夹」优先传 parentId，
 * 推导出来的层级没有 id 时改传 parentPath。
 */
export default function RepoCategoryTree({
  selectedPath,
  onSelect,
  onCreated,
  canCreate = false,
  refreshToken = 0,
}: {
  selectedPath?: string;
  onSelect: (path?: string, id?: string) => void;
  /** 新建文件夹成功后的回调，父级用它刷新分类候选/列表 */
  onCreated?: () => void;
  /** 是否有 repo:create（没有就不显示「新建文件夹」） */
  canCreate?: boolean;
  refreshToken?: number;
}) {
  const [list, setList] = useState<RepoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (): Promise<RepoCategory[]> => {
    setLoading(true);
    try {
      const data = await get<RepoCategory[]>('/api/repo/categories');
      const nodes = Array.isArray(data) ? data : [];
      setList(nodes);
      return nodes;
    } catch (e) {
      message.error((e as Error).message || '读取题库分类失败');
      setList([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const built = useMemo(() => buildTree(list), [list]);
  const selectedMeta = selectedPath ? built.meta.get(normalizePath(selectedPath)) : undefined;

  const openCreate = () => {
    setName('');
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (creating) return;
    const trimmed = name.trim();
    if (!trimmed) {
      message.warning('请填写文件夹名称');
      return;
    }
    if (trimmed.includes('/')) {
      message.warning('分类名不能包含 /');
      return;
    }
    const parentId = selectedMeta?.node.id ?? undefined;
    const parentPath = selectedMeta?.path;
    const nextPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
    if (list.some((item) => normalizePath(item.path) === nextPath)) {
      message.error('同一位置已有同名文件夹');
      return;
    }
    setCreating(true);
    try {
      await post('/api/repo/categories/create', {
        name: trimmed,
        ...(parentId ? { parentId } : parentPath ? { parentPath } : {}),
      });
      const nodes = await load();
      // 后端 create 返回 void：刷新后按 path 找新目录，找到就选中
      const created = nodes.find((item) => normalizePath(item.path) === nextPath);
      if (created) onSelect(normalizePath(created.path) || nextPath, created.id ?? undefined);
      setCreateOpen(false);
      message.success('已创建文件夹');
      onCreated?.();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card
      className="bp-card bp-corners"
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="bp-title" style={{ fontSize: 13 }}>
            分类
          </span>
          <div style={{ flex: 1 }} />
          {canCreate && (
            <Button
              size="small"
              type="text"
              icon={<PlusOutlined />}
              onClick={openCreate}
              title="新建文件夹"
              aria-label="新建文件夹"
            />
          )}
        </div>
      }
      style={{ width: '100%' }}
      styles={{ body: { padding: '8px 6px' } }}
    >
      {loading ? (
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : (
        <>
          <div style={{ maxHeight: 560, overflowY: 'auto' }}>
            <Tree
              key={refreshToken}
              blockNode
              defaultExpandAll
              treeData={[{ key: ALL_KEY, title: '全部分类' }, ...built.data]}
              selectedKeys={[selectedPath ? normalizePath(selectedPath) : ALL_KEY]}
              onSelect={(keys) => {
                if (keys.length === 0) return;
                const key = String(keys[0]);
                if (key === ALL_KEY) {
                  onSelect(undefined);
                  return;
                }
                if (key === UNCATEGORIZED_KEY) return;
                const hit = built.meta.get(key);
                onSelect(key, hit?.node.id ?? undefined);
              }}
              style={{ background: 'transparent', fontSize: 13 }}
            />
          </div>
          {built.data.length === 0 && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>还没有分类</span>}
              style={{ margin: '8px 0' }}
            />
          )}
        </>
      )}

      <Modal
        title="新建分类文件夹"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void submitCreate()}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 8 }}>
          上级：{selectedMeta?.path || '根目录'}
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：安全生产"
          maxLength={60}
          onPressEnter={() => void submitCreate()}
        />
      </Modal>
    </Card>
  );
}
