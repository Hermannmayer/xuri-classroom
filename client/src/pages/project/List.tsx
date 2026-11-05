import { useCallback, useEffect, useState } from 'react';
import {
  Breadcrumb,
  Button,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import { DeleteOutlined, FolderOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createProject, deleteProject, listProjects, updateProject } from '../../api';
import type { ProjectMode, ProjectView } from '../../api';
import { pager } from '../repo/table';

type Crumb = { id: string; name: string };

const MODE_LABEL: Record<ProjectMode, string> = {
  survey: '问卷',
  exam: '考试',
  folder: '文件夹',
};

const MODE_COLOR: Record<ProjectMode, string> = {
  survey: 'blue',
  exam: 'orange',
  folder: 'default',
};

/** 新建考试/问卷时给后端的初始 ProjectSetting，与旧前端一致 */
const DEFAULT_SETTING = {
  status: 0,
  answerSetting: { progressBar: true, autoSave: true },
  submittedSetting: {},
};

const MOBILE_QUERY = '(max-width: 767.98px)';

/** 与 BasicLayout 同款：matchMedia 监听，不做宽度轮询 */
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

export default function ProjectList() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [rows, setRows] = useState<ProjectView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const parentId = crumbs.length ? crumbs[crumbs.length - 1].id : undefined;

  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<ProjectView | null>(null);
  const [createForm] = Form.useForm<{ name: string; mode: 'survey' | 'exam' }>();
  const [renameForm] = Form.useForm<{ name: string }>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listProjects({ current: page, pageSize, name: keyword, parentId });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, parentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    createForm.setFieldsValue({ name: '', mode: 'exam' });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const v = await createForm.validateFields();
    try {
      const created = await createProject({
        name: v.name,
        mode: v.mode,
        parentId,
        setting: DEFAULT_SETTING,
        // 先给一份空表，设计器打开时不会拿到 null
        survey: { title: v.name, type: 'Survey', attribute: { mode: v.mode }, children: [] },
      });
      setCreateOpen(false);
      message.success('已创建');
      navigate(`/survey/${created.id}/edit`);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const submitRename = async () => {
    if (!renaming) return;
    const { name } = await renameForm.validateFields();
    try {
      await updateProject({ id: renaming.id, name });
      message.success('已重命名');
      setRenaming(null);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const toggleStatus = async (row: ProjectView) => {
    const next = row.status === 1 ? 0 : 1;
    try {
      await updateProject({ id: row.id, settingKey: 'status', settingValue: next });
      message.success(next === 1 ? '已发布' : '已停止');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const remove = async (row: ProjectView) => {
    try {
      await deleteProject(row.id);
      message.success('已移入回收站');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const enterFolder = (row: ProjectView) => {
    setCrumbs((prev) => [...prev, { id: row.id, name: row.name || '未命名文件夹' }]);
    setPage(1);
  };

  const emptyNode = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={keyword ? '没有匹配的结果' : '还没有考试，点右上角「新建」开始'}
    />
  );

  const openRename = (row: ProjectView) => {
    renameForm.setFieldsValue({ name: row.name || '' });
    setRenaming(row);
  };

  return (
    <>
      <div
        style={{
          marginBottom: 18,
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0, flex: isMobile ? '1 1 100%' : '1 1 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
            EXAMS / 考试管理
          </div>
          <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
            我的考试与问卷
          </h2>
          <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
            这里是你创建和参与协作的考试/问卷；题库在「题库中心」，不在此列表。
          </div>
        </div>
        <Button icon={<DeleteOutlined />} onClick={() => navigate('/project/trash')}>
          回收站
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建
        </Button>
      </div>

      <hr className="bp-dim" style={{ margin: '0 0 16px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Breadcrumb
          items={[
            {
              title: (
                <a onClick={() => {
                  setCrumbs([]);
                  setPage(1);
                }}>
                  全部
                </a>
              ),
            },
            ...crumbs.map((c, i) => ({
              title:
                i === crumbs.length - 1 ? (
                  c.name
                ) : (
                  <a onClick={() => {
                    setCrumbs(crumbs.slice(0, i + 1));
                    setPage(1);
                  }}>
                    {c.name}
                  </a>
                ),
            })),
          ]}
        />
        <div style={{ flex: 1 }} />
        <Input.Search
          allowClear
          placeholder="搜索名称"
          style={{ width: isMobile ? '100%' : 220 }}
          onSearch={(v) => {
            setKeyword(v.trim());
            setPage(1);
          }}
        />
      </div>

      {isMobile ? (
        <>
          <Spin spinning={loading}>
            {rows.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="bp-card"
                    style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 14,
                        }}
                        onClick={() =>
                          row.mode === 'folder' ? enterFolder(row) : navigate(`/survey/${row.id}/edit`)
                        }
                      >
                        {row.name || '(未命名)'}
                      </a>
                      <Tag color={row.mode ? MODE_COLOR[row.mode] ?? 'default' : 'default'}>
                        {row.mode ? MODE_LABEL[row.mode] ?? row.mode : '—'}
                      </Tag>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--bp-text-soft)',
                      }}
                    >
                      {row.mode === 'folder' ? (
                        <span>{row.total ?? 0} 项</span>
                      ) : (
                        <>
                          <Tag color={row.status === 1 ? 'success' : 'default'}>
                            {row.status === 1 ? '收集中' : '未发布'}
                          </Tag>
                          <span>{row.total ?? 0} 份答卷</span>
                        </>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {row.mode === 'folder' ? (
                        <>
                          <Button
                            style={{ flex: 1, height: 38, paddingInline: 0 }}
                            onClick={() => openRename(row)}
                          >
                            重命名
                          </Button>
                          <Popconfirm
                            title={`删除「${row.name || ''}」？`}
                            description="删除后可在回收站找回。"
                            okText="删除"
                            cancelText="取消"
                            onConfirm={() => remove(row)}
                          >
                            <Button danger style={{ flex: 1, height: 38, paddingInline: 0 }}>
                              删除
                            </Button>
                          </Popconfirm>
                        </>
                      ) : (
                        <>
                          <Button
                            style={{ flex: 1, height: 38, paddingInline: 0 }}
                            onClick={() => navigate(`/survey/${row.id}/edit`)}
                          >
                            编辑
                          </Button>
                          <Button
                            style={{ flex: 1, height: 38, paddingInline: 0 }}
                            onClick={() => navigate(`/survey/${row.id}/data`)}
                          >
                            数据
                          </Button>
                          <Button
                            style={{ flex: 1, height: 38, paddingInline: 0 }}
                            onClick={() => navigate(`/survey/${row.id}/report`)}
                          >
                            分析
                          </Button>
                          <Button
                            style={{ flex: 1, height: 38, paddingInline: 0 }}
                            onClick={() => navigate(`/survey/${row.id}/setting`)}
                          >
                            设置
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              emptyNode
            )}
          </Spin>
          {rows.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 12,
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>共 {total} 项</span>
              {total > pageSize && (
                <Pagination
                  simple
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={(p, s) => {
                    setPage(p);
                    setPageSize(s);
                  }}
                />
              )}
            </div>
          )}
        </>
      ) : (
      <Table<ProjectView>
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={rows}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={keyword ? '没有匹配的结果' : '还没有考试，点右上角「新建」开始'}
            />
          ),
        }}
        pagination={pager(page, pageSize, total, setPage, setPageSize, (n) => `共 ${n} 项`)}
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
            render: (_: unknown, row) =>
              row.mode === 'folder' ? (
                <Space style={{ cursor: 'pointer' }} onClick={() => enterFolder(row)}>
                  <FolderOutlined style={{ color: 'var(--bp-text-soft)' }} />
                  <span>{row.name}</span>
                </Space>
              ) : (
                <a onClick={() => navigate(`/survey/${row.id}/edit`)}>{row.name || '(未命名)'}</a>
              ),
          },
          {
            title: '类型',
            dataIndex: 'mode',
            width: 90,
            render: (mode: ProjectMode) => (
              <Tag color={MODE_COLOR[mode] ?? 'default'}>{MODE_LABEL[mode] ?? mode}</Tag>
            ),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (status: number, row) =>
              row.mode === 'folder' ? (
                <span style={{ color: 'var(--bp-text-soft)' }}>{row.total ?? 0} 项</span>
              ) : (
                <Tag color={status === 1 ? 'success' : 'default'}>{status === 1 ? '已发布' : '未发布'}</Tag>
              ),
          },
          {
            title: '答卷',
            dataIndex: 'total',
            width: 90,
            render: (v: number, row) => (row.mode === 'folder' ? '—' : `${v ?? 0} 份`),
          },
          {
            title: '创建时间',
            dataIndex: 'createAt',
            width: 170,
          },
          {
            title: '操作',
            width: 240,
            render: (_: unknown, row) => (
              <Space size={4}>
                {row.mode !== 'folder' && (
                  <>
                    <a onClick={() => navigate(`/survey/${row.id}`)}>打开</a>
                    <a onClick={() => toggleStatus(row)}>{row.status === 1 ? '停止' : '发布'}</a>
              <a onClick={() => navigate(`/survey/${row.id}/setting`)}>设置</a>
              <a onClick={() => navigate(`/survey/${row.id}/data`)}>数据</a>
              <a onClick={() => navigate(`/survey/${row.id}/report`)}>分析</a>
                  </>
                )}
                <a
                  onClick={() => {
                    renameForm.setFieldsValue({ name: row.name || '' });
                    setRenaming(row);
                  }}
                >
                  重命名
                </a>
                <Popconfirm
                  title={`删除「${row.name || ''}」？`}
                  description="删除后可在回收站找回（本页暂未接入回收站）。"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => remove(row)}
                >
                  <a style={{ color: 'var(--bp-orange)' }}>删除</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      )}

      <Modal
        title="新建"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={submitCreate}
        okText="创建"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" preserve={false}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请填写名称' }]}>
            <Input placeholder="例如：2026 年第一季度安全培训考试" maxLength={120} />
          </Form.Item>
          <Form.Item name="mode" label="类型" rules={[{ required: true }]}>
            <Segmented
              options={[
                { label: '考试', value: 'exam' },
                { label: '问卷', value: 'survey' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重命名"
        open={!!renaming}
        onCancel={() => setRenaming(null)}
        onOk={submitRename}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={renameForm} layout="vertical" preserve={false}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请填写名称' }]}>
            <Input maxLength={120} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
