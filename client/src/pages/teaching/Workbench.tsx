import { useCallback, useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Empty, Space, Spin, Table, Tabs, Tag, Tree } from 'antd';
import type { TreeDataNode } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { get } from '../../api';
import LinkAction from '../../components/LinkAction';
import TableScrollRegion from '../../components/TableScrollRegion';
import ClassAnswersDrawer, { downloadClassAnswers } from './ClassAnswersDrawer';

/** 与后端 ClassNodeView 对齐（学情只用到 id/name/children） */
interface ClassNode {
  id: string;
  name?: string;
  /** false = 只是为了显示路径补出来的祖先节点，点它查成员/资源会 403 */
  accessible?: boolean;
  children?: ClassNode[];
}

/** 与后端 ClassResourceView 对齐（project 类型；avgScore 由后端补） */
interface ClassResource {
  id: string;
  classId?: string;
  resourceId?: string;
  resourceName?: string;
  resourceMode?: string;
  effectiveStatus?: string;
  startAt?: string | number;
  endAt?: string | number;
  answerCount?: number;
  avgScore?: number | null;
}

/** 与后端 ClassMemberView 对齐（学情只展示姓名/手机号/加入时间） */
interface ClassMember {
  id?: string;
  name?: string;
  phone?: string;
  createAt?: string | number;
}

interface AnswerTarget {
  projectId: string;
  deptId: string;
  deptName?: string;
  projectName?: string;
}

const MOBILE_QUERY = '(max-width: 767.98px)';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  CLOSED: { label: '已关闭', color: 'default' },
  NOT_STARTED: { label: '未开始', color: 'blue' },
  OPEN: { label: '进行中', color: 'success' },
  ENDED: { label: '已结束', color: 'warning' },
};

const MODE_META: Record<string, { label: string; color: string }> = {
  exam: { label: '考试', color: 'orange' },
  survey: { label: '问卷', color: 'blue' },
};

const scoreText = (value?: number | null) =>
  value === null || value === undefined || Number.isNaN(Number(value)) ? '—' : Number(value).toFixed(1);

function windowText(start?: string | number, end?: string | number) {
  if (!start && !end) {
    return <span style={{ color: 'var(--bp-text-soft)' }}>继承全局</span>;
  }
  const fmt = (value?: string | number) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '不限');
  return `${fmt(start)} ~ ${fmt(end)}`;
}

function collectIds(nodes: ClassNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...collectIds(node.children ?? [])]);
}

/** 默认选中第一个可打开的叶子班（和班级管理页的 firstSelectable 一致） */
function firstClassId(nodes: ClassNode[]): string | undefined {
  for (const node of nodes) {
    // 祖先节点可能只是路径（accessible=false），但它的子树里仍可能有可打开的班
    if ((!node.children || node.children.length === 0) && node.accessible !== false) return node.id;
    const hit = firstClassId(node.children ?? []);
    if (hit) return hit;
  }
  return nodes[0]?.id;
}

function findClass(nodes: ClassNode[], id?: string): ClassNode | undefined {
  if (!id) return undefined;
  for (const node of nodes) {
    if (node.id === id) return node;
    const hit = findClass(node.children ?? [], id);
    if (hit) return hit;
  }
  return undefined;
}

function toTreeData(nodes: ClassNode[]): TreeDataNode[] {
  return nodes.map((node) => ({
    key: node.id,
    // 只是路径的祖先节点不能选：查成员/资源会 403
    selectable: node.accessible !== false,
    title: (
      <span style={{ color: node.accessible === false ? 'var(--bp-text-soft)' : undefined }}>
        {node.name || '(未命名班级)'}
        {node.accessible === false ? '（上级）' : ''}
      </span>
    ),
    children: node.children && node.children.length > 0 ? toTreeData(node.children) : undefined,
  }));
}

/**
 * 班级学情（老师视角）。
 *
 * <p>左侧班级树（URL ?classId= 保持选中），右侧是选中班的「考试/问卷」与「学员」两个页签：
 * 考试/问卷显示分配状态、本班窗口、交卷与平均分，并复用答卷抽屉查看/导出；
 * 学员页签只做名单展示。不再以「选一场考试」为主入口。
 */
export default function TeachingWorkbench() {
  const { message } = App.useApp();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const classId = searchParams.get('classId') ?? undefined;

  const [tree, setTree] = useState<ClassNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [treeOpen, setTreeOpen] = useState(false);

  const [resources, setResources] = useState<ClassResource[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'exam' | 'member'>('exam');
  const [answerTarget, setAnswerTarget] = useState<AnswerTarget>();

  const loadTree = useCallback(async () => {
    setTreeLoading(true);
    try {
      const list = await get<ClassNode[]>('/api/teaching/classes/tree');
      const nodes = Array.isArray(list) ? list : [];
      setTree(nodes);
      setExpandedKeys(collectIds(nodes));
    } catch (e) {
      message.error((e as Error).message || '读取班级列表失败');
      setTree([]);
    } finally {
      setTreeLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  // URL 同步：没有有效 classId 时默认选中第一个班（replace，避免污染历史）
  useEffect(() => {
    if (treeLoading) return;
    const current = findClass(tree, classId);
    if (current && current.accessible !== false) return;
    const desired = firstClassId(tree);
    if ((desired ?? undefined) === (classId ?? undefined)) return;
    const next = new URLSearchParams(searchParams);
    if (desired) next.set('classId', desired);
    else next.delete('classId');
    setSearchParams(next, { replace: true });
  }, [tree, treeLoading, classId, searchParams, setSearchParams]);

  const loadResources = useCallback(
    async (deptId: string) => {
      setResourceLoading(true);
      try {
        const list = await get<ClassResource[]>('/api/teaching/classes/resources', {
          deptId,
          resourceType: 'project',
        });
        setResources(Array.isArray(list) ? list : []);
      } catch (e) {
        message.error((e as Error).message || '读取班级考试/问卷失败');
        setResources([]);
      } finally {
        setResourceLoading(false);
      }
    },
    [message],
  );

  const loadMembers = useCallback(
    async (deptId: string) => {
      setMemberLoading(true);
      try {
        const list = await get<ClassMember[]>('/api/teaching/classes/members', { deptId });
        setMembers(Array.isArray(list) ? list : []);
      } catch (e) {
        message.error((e as Error).message || '读取班级学员失败');
        setMembers([]);
      } finally {
        setMemberLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    if (!classId) {
      setResources([]);
      setMembers([]);
      return;
    }
    void loadResources(classId);
    void loadMembers(classId);
  }, [classId, loadResources, loadMembers]);

  const currentClass = findClass(tree, classId);
  const treeData = useMemo(() => toTreeData(tree), [tree]);

  const selectClass = (keys: React.Key[]) => {
    if (keys.length === 0) return;
    const next = new URLSearchParams(searchParams);
    next.set('classId', String(keys[0]));
    setSearchParams(next, { replace: true });
    if (isMobile) setTreeOpen(false);
  };

  const refresh = () => {
    void loadTree();
    if (classId) {
      void loadResources(classId);
      void loadMembers(classId);
    }
  };

  const openAnswers = (row: ClassResource) => {
    if (!classId) return;
    const projectId = row.resourceId || row.id;
    if (!projectId) return;
    setAnswerTarget({
      projectId,
      deptId: classId,
      deptName: currentClass?.name,
      projectName: row.resourceName,
    });
  };

  const exportAnswers = async (row: ClassResource) => {
    if (!classId) return;
    const projectId = row.resourceId || row.id;
    if (!projectId) return;
    try {
      await downloadClassAnswers({
        projectId,
        deptId: classId,
        projectName: row.resourceName,
        deptName: currentClass?.name,
      });
      message.success('导出已开始');
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const resourceColumns: ColumnsType<ClassResource> = [
    {
      title: '名称',
      dataIndex: 'resourceName',
      ellipsis: true,
      render: (value?: string) => value || '—',
    },
    {
      title: '类型',
      dataIndex: 'resourceMode',
      width: 80,
      render: (mode?: string) => {
        const meta = mode ? MODE_META[mode] : undefined;
        return <Tag color={meta?.color ?? 'default'}>{meta?.label ?? '—'}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'effectiveStatus',
      width: 96,
      render: (status?: string) => {
        const meta = status ? STATUS_META[status] : undefined;
        return <Tag color={meta?.color ?? 'default'}>{meta?.label ?? '—'}</Tag>;
      },
    },
    {
      title: '本班窗口',
      key: 'window',
      width: 200,
      render: (_: unknown, row: ClassResource) => windowText(row.startAt, row.endAt),
    },
    {
      title: '交卷',
      dataIndex: 'answerCount',
      width: 80,
      render: (value?: number) => value ?? 0,
    },
    {
      title: '平均分',
      dataIndex: 'avgScore',
      width: 90,
      render: (value?: number | null) => scoreText(value),
    },
    {
      title: '操作',
      key: 'ops',
      width: 150,
      render: (_: unknown, row: ClassResource) =>
        row.resourceId || row.id ? (
          <Space size={12}>
            <LinkAction onClick={() => openAnswers(row)}>查看答卷</LinkAction>
            <LinkAction onClick={() => void exportAnswers(row)}>导出</LinkAction>
          </Space>
        ) : (
          '—'
        ),
    },
  ];

  const memberColumns: ColumnsType<ClassMember> = [
    { title: '姓名', dataIndex: 'name', render: (value?: string) => value || '—' },
    { title: '手机号', dataIndex: 'phone', width: 150, render: (value?: string) => value || '—' },
    {
      title: '加入时间',
      dataIndex: 'createAt',
      width: 180,
      render: (value?: string | number) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'),
    },
  ];

  const treePanel = (
    <Card
      className="bp-card bp-corners"
      size="small"
      title={
        <span className="bp-title" style={{ fontSize: 13 }}>
          我的班级
        </span>
      }
      style={{ width: isMobile ? '100%' : 220, flex: isMobile ? '1 1 100%' : '0 0 220px' }}
      styles={{ body: { padding: '8px 6px' } }}
    >
      {treeLoading ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : tree.length === 0 ? (
        <div style={{ padding: '12px 4px' }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有可查看的班级" />
        </div>
      ) : (
        <div style={{ maxHeight: isMobile ? 260 : 560, overflowY: 'auto' }}>
          <Tree
            blockNode
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys.map(String))}
            selectedKeys={classId ? [classId] : []}
            onSelect={selectClass}
            style={{ background: 'transparent', fontSize: 13 }}
          />
        </div>
      )}
    </Card>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="bp-title" style={{ fontSize: 13 }}>
          学情
        </span>
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
          左侧选班级，查看该班的考试/问卷与学员
        </span>
        {isMobile && (
          <Button size="small" onClick={() => setTreeOpen((open) => !open)}>
            {treeOpen ? '收起班级' : '选择班级'}
          </Button>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        {(!isMobile || treeOpen) && treePanel}

        <Card
          className="bp-card bp-corners"
          size="small"
          style={{ flex: '1 1 auto', width: '100%', minWidth: 0 }}
          styles={{ body: { padding: 14 } }}
        >
          {!classId ? (
            <div style={{ padding: '40px 0' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                    {treeLoading ? '正在读取班级…' : '从左侧选择一个班级'}
                  </span>
                }
              />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <span className="bp-title" style={{ fontSize: 15 }}>
                  {currentClass?.name || '(未命名班级)'}
                </span>
                <div style={{ flex: 1 }} />
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={resourceLoading || memberLoading}
                  onClick={refresh}
                >
                  刷新
                </Button>
              </div>

              <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as 'exam' | 'member')}
                items={[
                  {
                    key: 'exam',
                    label: '考试/问卷',
                    children: (
                      <TableScrollRegion label="班级考试/问卷（可横向滚动）">
                        <Table<ClassResource>
                          rowKey="id"
                          size="small"
                          loading={resourceLoading}
                          dataSource={resources}
                          columns={resourceColumns}
                          pagination={false}
                          scroll={{ x: 880 }}
                          locale={{
                            emptyText: (
                              <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="这个班还没有分配考试/问卷"
                              />
                            ),
                          }}
                        />
                      </TableScrollRegion>
                    ),
                  },
                  {
                    key: 'member',
                    label: '学员',
                    children: (
                      <TableScrollRegion label="班级学员（可横向滚动）">
                        <Table<ClassMember>
                          rowKey={(row) => row.id || row.phone || row.name || ''}
                          size="small"
                          loading={memberLoading}
                          dataSource={members}
                          columns={memberColumns}
                          pagination={{ pageSize: 20, hideOnSinglePage: true, size: 'small' }}
                          scroll={{ x: 520 }}
                          locale={{
                            emptyText: (
                              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这个班还没有学员" />
                            ),
                          }}
                        />
                      </TableScrollRegion>
                    ),
                  },
                ]}
              />
            </>
          )}
        </Card>
      </div>

      {answerTarget && (
        <ClassAnswersDrawer
          key={answerTarget.projectId + ':' + answerTarget.deptId}
          open
          projectId={answerTarget.projectId}
          deptId={answerTarget.deptId}
          deptName={answerTarget.deptName}
          projectName={answerTarget.projectName}
          onClose={() => setAnswerTarget(undefined)}
        />
      )}
    </div>
  );
}
