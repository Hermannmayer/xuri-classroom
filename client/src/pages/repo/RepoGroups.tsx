import { useMemo, useState } from 'react';
import { Button, Collapse, Drawer, Empty, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';

export interface RepoRow {
  id: string;
  name?: string;
  category?: string;
  mode?: string;
  total?: number;
}

/**
 * 按分类分组浏览题库（折叠面板）。
 * 做成独立抽屉而不是替换列表，避免动现有的表格/筛选/分页逻辑。
 */
export default function RepoGroups({
  open,
  repos,
  onClose,
  onEdit,
}: {
  open: boolean;
  repos: RepoRow[];
  onClose: () => void;
  onEdit: (repo: RepoRow) => void;
}) {
  const navigate = useNavigate();
  const [active, setActive] = useState<string[]>([]);

  const groups = useMemo(() => {
    const map = new Map<string, RepoRow[]>();
    for (const repo of repos) {
      const key = repo.category || '未分类';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(repo);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'));
  }, [repos]);

  const keys = active.length ? active : groups.map(([category]) => category);

  return (
    <Drawer title="按分类浏览题库" open={open} onClose={onClose} width="min(640px, 100vw)">
      {groups.length === 0 ? (
        <Empty description="还没有题库" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Collapse
          activeKey={keys}
          onChange={(next) => setActive(Array.isArray(next) ? next : [next])}
          items={groups.map(([category, list]) => ({
            key: category,
            label: (
              <span style={{ fontSize: 13 }}>
                {category}
                <span style={{ marginLeft: 8, color: 'var(--bp-text-soft)', fontSize: 11 }}>
                  {list.length} 个题库 · {list.reduce((sum, r) => sum + (r.total ?? 0), 0)} 题
                </span>
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map((repo) => (
                  <div
                    key={repo.id}
                    className="bp-card"
                    style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <a style={{ fontSize: 13 }} onClick={() => navigate(`/repo/${repo.id}/questions/normal`)}>
                        {repo.name || '(未命名题库)'}
                      </a>
                      <Tag>{repo.mode === 'survey' ? '问卷' : '考试'}</Tag>
                      <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>{repo.total ?? 0} 题</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                      <a onClick={() => navigate(`/repo/${repo.id}/questions/normal`)}>题目</a>
                      <a onClick={() => onEdit(repo)}>编辑</a>
                    </div>
                  </div>
                ))}
              </div>
            ),
          }))}
        />
      )}
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <Button onClick={onClose}>关闭</Button>
      </div>
    </Drawer>
  );
}
