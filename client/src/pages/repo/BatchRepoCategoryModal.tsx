import { useEffect, useMemo, useState } from 'react';
import { App, Empty, Input, Modal, Spin, TreeSelect } from 'antd';
import { get, post } from '../../api';

interface RepoCategory {
  id?: string | null;
  name?: string;
  path?: string;
  parentPath?: string;
  count?: number;
}

interface CategoryOption {
  value: string;
  title: string;
  children?: CategoryOption[];
}

const ROOT_VALUE = '__repo_uncategorized__';

function normalizePath(value?: string) {
  return (value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

/** /api/repo/categories 是扁平 path 列表，这里按 "/" 建树 */
function buildCategoryOptions(list: RepoCategory[]): CategoryOption[] {
  const nodes = new Map<string, { path: string; title: string; parentPath: string }>();
  for (const item of list) {
    const path = normalizePath(item.path);
    if (!path) continue;
    const title = (item.name || path.split('/').pop() || path).trim();
    const parentPath = normalizePath(
      item.parentPath ?? (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''),
    );
    nodes.set(path, { path, title, parentPath });
  }
  const children = new Map<string, CategoryOption[]>();
  for (const node of nodes.values()) {
    const option: CategoryOption = { value: node.path, title: node.title };
    const bucket = children.get(node.parentPath) ?? [];
    if (!bucket.some((item) => item.value === node.path)) bucket.push(option);
    children.set(node.parentPath, bucket);
  }
  const build = (parentPath: string): CategoryOption[] =>
    (children.get(parentPath) ?? [])
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
      .map((option) => {
        const kids = children.get(option.value);
        return { ...option, children: kids && kids.length > 0 ? build(option.value) : undefined };
      });
  return build('');
}

/**
 * 题库批量移动到分类/文件夹。
 *
 * <p>树选择原有分类（根「未分类」= 清空分类），也可以直接输入一个新路径；
 * 新路径优先。确认后逐个 POST /api/repo/update {id, category}，最后按成功/失败计数。
 */
export default function BatchRepoCategoryModal({
  open,
  ids,
  onCancel,
  onDone,
}: {
  open: boolean;
  ids: string[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<RepoCategory[]>([]);
  const [selected, setSelected] = useState<string>();
  const [customPath, setCustomPath] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected(undefined);
    setCustomPath('');
    setLoading(true);
    get<RepoCategory[]>('/api/repo/categories')
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => {
        setCategories([]);
        message.warning('分类加载失败，可以直接输入新路径');
      })
      .finally(() => setLoading(false));
  }, [open, message]);

  const treeData = useMemo<CategoryOption[]>(
    () => [
      {
        value: ROOT_VALUE,
        title: '未分类（清空分类）',
        children: buildCategoryOptions(categories),
      },
    ],
    [categories],
  );

  // 根节点用 sentinel 显示，提交时映射为空字符串（后端=未分类）
  const targetValue = customPath.trim() || (selected === ROOT_VALUE ? '' : selected || '');

  const submit = async () => {
    if (ids.length === 0) return;
    setSaving(true);
    let ok = 0;
    const failed: string[] = [];
    try {
      for (const id of ids) {
        try {
          await post('/api/repo/update', { id, category: targetValue });
          ok += 1;
        } catch (e) {
          failed.push((e as Error).message);
        }
      }
      if (ok > 0) {
        message.success('已移动 ' + ok + ' 个题库' + (targetValue ? '到「' + targetValue + '」' : '到未分类'));
      }
      if (failed.length > 0) message.error(failed.length + ' 个题库移动失败：' + failed[0]);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  const title = '移动到分类' + (ids.length ? '（' + ids.length + ' 个题库）' : '');

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={() => void submit()}
      confirmLoading={saving}
      okText="移动"
      cancelText="取消"
      okButtonProps={{ disabled: ids.length === 0 }}
      destroyOnClose
    >
      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 10 }}>
        选择一个已有分类，或直接输入新路径（如「安全生产/基础」）；根节点「未分类」会清空分类。
      </div>
      {loading ? (
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : (
        <>
          <TreeSelect
            style={{ width: '100%' }}
            value={selected ?? undefined}
            onChange={(value) => {
              setSelected(value as string);
              setCustomPath('');
            }}
            treeData={treeData}
            placeholder="选择分类 / 文件夹"
            showSearch
            treeNodeFilterProp="title"
            treeDefaultExpandAll
            allowClear
            dropdownStyle={{ maxHeight: 360, overflow: 'auto' }}
          />
          <Input
            style={{ marginTop: 10 }}
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder="或输入新路径（优先于上面的选择）"
            maxLength={200}
            allowClear
          />
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--bp-text-soft)' }}>
            当前目标：{targetValue ? '「' + targetValue + '」' : '未分类'}
          </div>
        </>
      )}
      {!loading && categories.length === 0 && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="还没有分类，直接输入新路径即可"
          style={{ margin: '10px 0' }}
        />
      )}
    </Modal>
  );
}
