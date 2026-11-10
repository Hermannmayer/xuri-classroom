import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Empty, Spin, Tree, message } from 'antd';
import type { TreeDataNode } from 'antd';
import { get } from '../../api';
import ProjectCategoryTree from './ProjectCategoryTree';

/** 与后端 ProjectTreeNode 对齐 */
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
  /** 节点 id -> 从根到该文件夹的路径（用于面包屑） */
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

/**
 * 考试/问卷左侧分类树（根固定「全部」）。
 *
 * <p>只负责拉 /api/project/tree 与选中回调；parentId 为空表示「全部」。
 * 选中文件夹时通过 path 回传从根到该节点的路径，右侧用它维护面包屑。
 */
export default function ProjectTree({
  selectedId,
  selectedCategory,
  onSelect,
  onSelectCategory,
  refreshToken = 0,
}: {
  selectedId?: string;
  selectedCategory?: string;
  onSelect: (parentId: string | undefined, path: Crumb[]) => void;
  onSelectCategory: (category?: string) => void;
  /** 父组件在新建/删除/重命名后递增，触发 counts 重新拉取 */
  refreshToken?: number;
}) {
  const [nodes, setNodes] = useState<ProjectTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleSelect = (keys: React.Key[]) => {
    if (keys.length === 0) return;
    const key = String(keys[0]);
    if (key === ALL_KEY) {
      // 根「全部」：文件夹与分类两个筛选都清空
      onSelectCategory(undefined);
      onSelect(undefined, []);
      return;
    }
    const path = built.paths.get(key);
    if (path) {
      // 选文件夹时清空分类，避免两个条件叠加导致空列表
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
          // 分类与文件夹互斥：选分类时清空文件夹路径（根「全部」例外，由子组件传 undefined）
          onSelectCategory(category);
          onSelect(undefined, []);
        }}
      />
      <Card
        className="bp-card bp-corners"
        size="small"
        title={
          <span className="bp-title" style={{ fontSize: 13 }}>
            文件夹
          </span>
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
    </div>
  );
}
