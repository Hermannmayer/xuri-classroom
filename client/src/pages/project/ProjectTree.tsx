import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Input, Modal, Spin, Tree, message } from 'antd';
import type { TreeDataNode } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { createProject, get } from '../../api';
import ProjectCategoryTree from './ProjectCategoryTree';


interface ProjectTreeNode {
  id: string;
  name?: string;
  parentId?: string;
  mode?: 'folder' | 'exam' | 'survey';
  count?: number;
  children?: ProjectTreeNode[];
}

interface Crumb {
  id: string;
  name: string;
}

const ALL_KEY = '__all__';

interface BuiltTree {
  data: TreeDataNode[];

  paths: Map<string, Crumb[]>;
}

/** 树里只展示文件夹：叶子考试/问卷在右侧列表里按 parentId 查看 */
function buildFolderNodes(nodes: ProjectTreeNode[], parentPath: Crumb[], paths: Map<string, Crumb[]>): TreeDataNode[] {
  const result: TreeDataNode[] = [];
  for (const node of nodes) {
    if (node.mode !== 'folder') continue;
    const name = node.name || '(未命名文件夹)';
    const path = [...parentPath, { id: node.id, name }];
    paths.set(node.id, path);
    result.push({
      key: node.id,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, maxWidth: '100%' }}>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          <span style={{ flex: '0 0 auto', fontSize: 11, color: 'var(--bp-text-soft)' }}>{node.count ?? 0}</span>
        </span>
      ),
      children:
        node.children && node.children.length > 0
          ? buildFolderNodes(node.children, path, paths)
          : undefined,
    });
  }
  return result;
}

/** 考试/问卷左侧分类树（根固定「全部」） */
export default function ProjectTree({
  selectedId,
  selectedCategory,
  onSelect,
  onSelectCategory,
  onFolderCreated,
  canCreate = false,
  refreshToken = 0,
}: {
  selectedId?: string;
  selectedCategory?: string;
  onSelect: (parentId: string | undefined, path: Crumb[]) => void;
  onSelectCategory: (category?: string) => void;

  onFolderCreated?: () => void;

  canCreate?: boolean;

  refreshToken?: number;
}) {
  const [nodes, setNodes] = useState<ProjectTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await get<ProjectTreeNode[]>('/api/project/tree');
      setNodes(Array.isArray(list) ? list : []);
    } catch (e) {
      message.error((e as Error).message || '读取分类树失败');
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const built = useMemo<BuiltTree>(() => {
    const paths = new Map<string, Crumb[]>();
    const data = buildFolderNodes(nodes, [], paths);
    return {
      data: [{ key: ALL_KEY, title: '全部' }, ...data],
      paths,
    };
  }, [nodes]);

  /** 新建文件夹的校验范围：当前选中文件夹的直接子级（根目录时就是顶层） */
  const siblingFolders = useMemo(() => {
    if (!selectedId) return nodes.filter((node) => node.mode === 'folder');
    const findNode = (list: ProjectTreeNode[]): ProjectTreeNode | undefined => {
      for (const node of list) {
        if (node.id === selectedId) return node;
        const hit = findNode(node.children ?? []);
        if (hit) return hit;
      }
      return undefined;
    };
    return (findNode(nodes)?.children ?? []).filter((node) => node.mode === 'folder');
  }, [nodes, selectedId]);

  const openCreateFolder = () => {
    setFolderName('');
    setCreateOpen(true);
  };

  const submitCreateFolder = async () => {
    if (creating) return;
    const name = folderName.trim();
    if (!name) {
      message.warning('请填写文件夹名称');
      return;
    }
    if (siblingFolders.some((node) => (node.name || '').trim() === name)) {
      message.error('同一位置已有同名文件夹');
      return;
    }
    setCreating(true);
    try {

      await createProject({ name, mode: 'folder', parentId: selectedId } as unknown as Parameters<
        typeof createProject
      >[0]);
      setCreateOpen(false);
      message.success('已创建文件夹');
      await load();
      onFolderCreated?.();

      if (selectedCategory) {
        onSelectCategory(undefined);
        onSelect(undefined, []);
      }
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = (keys: React.Key[]) => {
    if (keys.length === 0) return;
    const key = String(keys[0]);
    if (key === ALL_KEY) {

      onSelectCategory(undefined);
      onSelect(undefined, []);
      return;
    }
    const path = built.paths.get(key);
    if (path) {

      onSelectCategory(undefined);
      onSelect(key, path);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ProjectCategoryTree
        selectedCategory={selectedCategory}
        refreshToken={refreshToken}
        onSelect={(category) => {

          onSelectCategory(category);
          onSelect(undefined, []);
        }}
      />
      <Card
        className="bp-card bp-corners"
        size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="bp-title" style={{ fontSize: 13 }}>
              文件夹
            </span>
            <div style={{ flex: 1 }} />
            {canCreate && (
              <Button
                size="small"
                type="text"
                icon={<PlusOutlined />}
                onClick={openCreateFolder}
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
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : (
        <>
          <div style={{ maxHeight: 560, overflowY: 'auto' }}>
            <Tree
              key={refreshToken}
              blockNode
              defaultExpandAll
              treeData={built.data}
              selectedKeys={[selectedId ?? ALL_KEY]}
              onSelect={handleSelect}
              style={{ background: 'transparent', fontSize: 13 }}
            />
          </div>
          {built.data.length <= 1 && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>还没有文件夹</span>}
              style={{ margin: '8px 0' }}
            />
          )}
        </>
      )}
      </Card>

      <Modal
        title="新建文件夹"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void submitCreateFolder()}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
        destroyOnHidden
      >
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 8 }}>
          上级：{selectedId ? '当前选中的文件夹' : '根目录'}
        </div>
        <Input
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="文件夹名称"
          maxLength={60}
          onPressEnter={() => void submitCreateFolder()}
        />
      </Modal>
    </div>
  );
}
