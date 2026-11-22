import { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, Modal, Segmented, Tag } from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { can } from '../auth/permissions';
import { HELP_TOPICS, type HelpTopic } from '../help/helpContent';
import '../styles/help.css';

interface HelpCenterProps {
  open: boolean;
  onClose: () => void;
  roles: string[];
  authorities: string[];
}

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员视角',
  teacher: '老师视角',
  student: '学员视角',
};

function topicText(topic: HelpTopic): string {
  const parts = [topic.title, topic.summary, ...topic.keywords];
  for (const section of topic.sections) {
    if (section.heading) parts.push(section.heading);
    if (section.paragraphs) parts.push(...section.paragraphs);
    if (section.bullets) parts.push(...section.bullets);
  }
  return parts.join(' ').toLowerCase();
}

/** 右上角帮助中心：按角色/权限过滤文档，支持全文搜索 */
export default function HelpCenter({ open, onClose, roles, authorities }: HelpCenterProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [selected, setSelected] = useState<HelpTopic>();
  const canPreviewRoles = roles.includes('admin');
  const [activeRole, setActiveRole] = useState<'admin' | 'teacher' | 'student'>('admin');

  const visibleTopics = useMemo(() => {
    const allowedRoles = canPreviewRoles ? [activeRole] : roles;
    return HELP_TOPICS.filter((topic) => {
      if (!allowedRoles.length) return topic.audience.length === 3;
      if (!topic.audience.some((audience) => allowedRoles.includes(audience))) return false;
      if (!topic.permission) return true;
      return authorities.includes('ROLE_admin') || can(authorities, topic.permission);
    });
  }, [roles, authorities, canPreviewRoles, activeRole]);

  const categories = useMemo(
    () => ['全部', ...Array.from(new Set(visibleTopics.map((topic) => topic.category)))],
    [visibleTopics],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return visibleTopics.filter((topic) => {
      if (category !== '全部' && topic.category !== category) return false;
      return !keyword || topicText(topic).includes(keyword);
    });
  }, [visibleTopics, category, query]);

  useEffect(() => {
    if (open) {
      setSelected(undefined);
      setQuery('');
      setCategory('全部');
      setActiveRole('admin');
    }
  }, [open]);

  const roleLabel = canPreviewRoles
    ? ROLE_LABEL[activeRole]
    : roles.includes('teacher')
      ? ROLE_LABEL.teacher
      : roles.length
        ? ROLE_LABEL.student
        : '通用视角';

  const intro =
    roleLabel === '管理员视角'
      ? '先看系统设置、用户权限和公告；老师侧功能也可以在这里查。'
      : roleLabel === '老师视角'
        ? '从新建考试、导入题目、发布分享到批改统计，按关键词搜索最快。'
        : roleLabel === '学员视角'
          ? '查看待完成任务、答题保存、交卷和成绩/错题的说明。'
          : '这里收录系统通用说明和常见问题。';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1040}
      centered
      destroyOnHidden
      className="bp-help-modal"
      title={
        <span className="bp-help-title">
          帮助与文档 <Tag>{roleLabel}</Tag>
        </span>
      }
      styles={{ body: { padding: 0 } }}
    >
      <div className="bp-help">
        <div className="bp-help-top">
          {canPreviewRoles && (
            <div className="bp-help-role-tabs">
              <Segmented
                size="small"
                value={activeRole}
                onChange={(value) => {
                  setActiveRole(value as 'admin' | 'teacher' | 'student');
                  setSelected(undefined);
                  setQuery('');
                  setCategory('全部');
                }}
                options={[
                  { label: '管理员文档', value: 'admin' },
                  { label: '老师文档', value: 'teacher' },
                  { label: '学员文档', value: 'student' },
                ]}
              />
              <span>管理员可切换三种视角检查帮助；老师/学员只看到自己的文档。</span>
            </div>
          )}
          <Input
            allowClear
            autoFocus
            prefix={<SearchOutlined />}
            placeholder="搜索功能，如：导出、批改、图片、权限…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(undefined);
            }}
          />
          <div className="bp-help-meta">{intro} 当前显示 {filtered.length} 条。</div>
        </div>

        <div className="bp-help-body">
          <aside className="bp-help-side">
            <div className="bp-help-side-title">文档分类</div>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={'bp-help-cat' + (category === item ? ' active' : '')}
                onClick={() => {
                  setCategory(item);
                  setSelected(undefined);
                }}
              >
                {item}
              </button>
            ))}
            <div className="bp-help-side-tip">只展示当前角色有权限查看的内容。</div>
          </aside>

          <main className="bp-help-main">
            {selected ? (
              <div className="bp-help-detail">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowLeftOutlined />}
                  className="bp-help-back"
                  onClick={() => setSelected(undefined)}
                >
                  返回列表
                </Button>
                <div className="bp-help-detail-head">
                  <h2>{selected.title}</h2>
                  <Tag>{selected.category}</Tag>
                </div>
                <p className="bp-help-summary">{selected.summary}</p>
                {selected.sections.map((section, index) => (
                  <section key={index} className="bp-help-section">
                    {section.heading && <h3>{section.heading}</h3>}
                    {section.paragraphs?.map((text, i) => (
                      <p key={'p' + i}>{text}</p>
                    ))}
                    {section.bullets && (
                      <ul>
                        {section.bullets.map((text, i) => (
                          <li key={'b' + i}>{text}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            ) : filtered.length ? (
              <div className="bp-help-grid">
                {filtered.map((topic) => (
                  <button
                    type="button"
                    key={topic.id}
                    className="bp-help-card"
                    onClick={() => setSelected(topic)}
                  >
                    <div className="bp-help-card-head">
                      <strong>{topic.title}</strong>
                      <Tag>{topic.category}</Tag>
                    </div>
                    <div className="bp-help-card-summary">{topic.summary}</div>
                  </button>
                ))}
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    没有找到相关帮助
                    <br />
                    试试“导出”“批改”“图片”或联系管理员
                  </span>
                }
              />
            )}
          </main>
        </div>
      </div>
    </Modal>
  );
}
