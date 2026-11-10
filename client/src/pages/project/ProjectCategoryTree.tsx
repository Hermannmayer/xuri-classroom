import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Empty, Spin, Tree, message } from 'antd';
import type { TreeDataNode } from 'antd';
import { get } from '../../api';

/** 与后端 /api/project/categories 对齐 */
interface CategoryCount {
  name?: string;
  count?: number;
}

const ALL_KEY = '__all_categories__';

/** 列表接口用这个哨兵表示「未分类」 */
export const UNCATEGORIZED = '__UNCATEGORIZED__';

/** 后端可能直接返回「未分类」/空串，统一归一成哨兵值，保证筛选参数正确 */
function categoryValue(name?: string): string {
  const raw = (name ?? '').trim();
  if (!raw || raw === UNCATEGORIZED || raw === '未分类') return UNCATEGORIZED;
  return raw;
}

function categoryLabel(value: string): string {
  return value === UNCATEGORIZED ? '未分类' : value;
}

/**
 * 考试/问卷的「分类」树（和文件夹树是两个维度，互斥筛选）。
 *
 * <p>根固定「全部分类」；选中回调 分类名 / undefined（全部）/ __UNCATEGORIZED__（未分类）。
 * 数据来自 /api/project/categories（已包含未分类）。
 */
export default function ProjectCategoryTree({
  selectedCategory,
  onSelect,
  refreshToken = 0,
}: {
  selectedCategory?: string;
  onSelect: (category?: string) => void;
  /** 新建/删除/重命名后递增，触发 counts 重新拉取 */
  refreshToken?: number;
}) {
  const [rows, setRows] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await get<CategoryCount[]>('/api/project/categories');
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      message.error((e as Error).message || '读取分类失败');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const treeData = useMemo<TreeDataNode[]>(
    () => [
      { key: ALL_KEY, title: '全部分类' },
      ...rows.map((item) => {
        const value = categoryValue(item.name);
        return {
          key: value,
          title: (
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, maxWidth: '100%' }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {categoryLabel(value)}
              </span>
              <span style={{ flex: '0 0 auto', fontSize: 11, color: 'var(--bp-text-soft)' }}>
                {item.count ?? 0}
              </span>
            </span>
          ),
        };
      }),
    ],
    [rows],
  );

  const handleSelect = (keys: React.Key[]) => {
    if (keys.length === 0) return;
    const key = String(keys[0]);
    if (key === ALL_KEY) {
      onSelect(undefined);
      return;
    }
    onSelect(key);
  };

  return (
    <Card
      className="bp-card bp-corners"
      size="small"
      title={
        <span className="bp-title" style={{ fontSize: 13 }}>
          分类
        </span>
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
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            <Tree
              key={refreshToken}
              blockNode
              defaultExpandAll
              treeData={treeData}
              selectedKeys={[selectedCategory ?? ALL_KEY]}
              onSelect={handleSelect}
              style={{ background: 'transparent', fontSize: 13 }}
            />
          </div>
          {rows.length === 0 && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>还没有分类</span>}
              style={{ margin: '8px 0' }}
            />
          )}
        </>
      )}
    </Card>
  );
}
