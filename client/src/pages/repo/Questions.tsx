import { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Input, message, Popconfirm, Select, Space, Table, Tag, Upload } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { download, getWithPagination, post } from '../../api';
import { pager, TABLE_COMPONENTS } from './table';

/** 与后端 TemplateView 对齐（题库题目列表走 /api/template/list?repoId=） */
interface TemplateView {
  id: string;
  name?: string;
  questionType?: string;
  template?: {
    title?: string;
    type?: string;
    tags?: string[];
    attribute?: {
      examScore?: number;
    };
  };
  tag?: string[];
  category?: string;
  createAt?: string;
}

const TYPE_LABEL: Record<string, string> = {
  Radio: '单选',
  Checkbox: '多选',
  Judge: '判断',
  FillBlank: '填空',
  Textarea: '简答',
  Select: '下拉',
  Score: '评分',
  MultipleBlank: '多空',
  MatrixRadio: '矩阵单选',
  MatrixCheckbox: '矩阵多选',
  MatrixFillBlank: '矩阵填空',
  Nps: 'NPS',
  Upload: '上传',
  RichText: '富文本',
};

const TYPE_COLOR: Record<string, string> = {
  Radio: 'blue',
  Checkbox: 'cyan',
  Judge: 'orange',
  FillBlank: 'purple',
  Textarea: 'green',
};

export default function RepoQuestions() {
  const { repoId = '', mode = 'normal' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // 题库详情接口缺失（RepoApi#getRpo 没有 @GetMapping），名称从列表页跳转时带过来
  const repoName = (location.state as { repoName?: string } | null)?.repoName;

  const [rows, setRows] = useState<TemplateView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [questionType, setQuestionType] = useState<string>();
  const [tagFilter, setTagFilter] = useState<string>();
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    try {
      const res = await getWithPagination<TemplateView>('/api/template/list', {
        repoId,
        current: page,
        pageSize,
        name: keyword,
        questionType: questionType || undefined,
        tag: tagFilter || undefined,
      });
      setRows(res.data);
      setTotal(res.total);
      // 下拉选项从当前/已加载数据里累积，避免筛选后选项消失
      const nextTypes = res.data.map((row) => row.questionType).filter((t): t is string => Boolean(t));
      const nextTags = res.data.flatMap((row) => row.tag ?? row.template?.tags ?? []);
      setTypeOptions((prev) => Array.from(new Set([...prev, ...nextTypes])));
      setTagOptions((prev) => Array.from(new Set([...prev, ...nextTags])));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [repoId, page, pageSize, keyword, questionType, tagFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // 翻页/筛选后旧选中项可能已不在当前列表，直接清空避免误删
  useEffect(() => {
    setSelectedKeys([]);
  }, [repoId, page, pageSize, keyword, questionType, tagFilter]);

  const hasFilter = Boolean(keyword || questionType || tagFilter);

  const doImport = async (file: File) => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('repoId', repoId);
      fd.append('file', file);
      await post<void>('/api/repo/import', fd);
      message.success('导入成功');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const onExport = async () => {
    // ponytail: 空题库导出后端会 500（fastexcel 不允许 0 个 sheet），先在前端挡掉
    if (!loading && total === 0 && !hasFilter) {
      message.warning('题库还没有题目，先导入再导出');
      return;
    }
    try {
      await download('/api/repo/export', { id: repoId }, `${repoName || '题库'}题目.xlsx`);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const batchDelete = async () => {
    if (!selectedKeys.length) return;
    const count = selectedKeys.length;
    setDeleting(true);
    try {
      // TemplateApi#deleteTemplate(TemplateRequest)，批量 id 走 ids
      await post<void>('/api/template/delete', { ids: selectedKeys });
      message.success(`已删除 ${count} 道题`);
      setSelectedKeys([]);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/repo/index')} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>
              QUESTIONS / 题目管理 · {mode.toUpperCase()}
            </div>
            <h2
              className="bp-title"
              style={{
                fontSize: 18,
                margin: '6px 0 0',
                letterSpacing: '0.06em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {repoName || '题库题目'}
            </h2>
            <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
              共 {total} 道题 · Excel 导入按题型分 sheet 解析，导出同样分 sheet
            </div>
          </div>
        </div>
        <Space wrap>
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={(file) => {
              void doImport(file);
              return false;
            }}
          >
            <Button icon={<UploadOutlined />} loading={importing}>
              导入 Excel
            </Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={() => void onExport()}>
            导出
          </Button>
        </Space>
      </div>

      <hr className="bp-dim" style={{ margin: '0 0 16px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <Select
          allowClear
          value={questionType}
          placeholder="全部题型"
          style={{ width: 140, flexShrink: 0 }}
          onChange={(v) => {
            setQuestionType(v);
            setPage(1);
          }}
          options={typeOptions.map((t) => ({ value: t, label: TYPE_LABEL[t] ?? t }))}
        />
        <Select
          allowClear
          showSearch
          value={tagFilter}
          placeholder="全部标签"
          style={{ width: 160, flexShrink: 0 }}
          onChange={(v) => {
            setTagFilter(v);
            setPage(1);
          }}
          options={tagOptions.map((t) => ({ value: t, label: t }))}
        />
        <Input.Search
          allowClear
          placeholder="搜索题干"
          style={{ width: 220, flexShrink: 0 }}
          onSearch={(v) => {
            setKeyword(v.trim());
            setPage(1);
          }}
        />
      </div>

      {selectedKeys.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 10,
            padding: '8px 10px',
            border: '1px dashed var(--bp-line)',
          }}
        >
          <span style={{ fontSize: 12 }}>已选中 {selectedKeys.length} 道</span>
          <div style={{ flex: 1 }} />
          <Popconfirm
            title={`删除选中的 ${selectedKeys.length} 道题？`}
            description="删除后不可恢复。"
            okText="删除"
            cancelText="取消"
            onConfirm={() => batchDelete()}
          >
            <Button danger size="small" icon={<DeleteOutlined />} loading={deleting}>
              批量删除
            </Button>
          </Popconfirm>
          <Button size="small" onClick={() => setSelectedKeys([])}>
            取消选择
          </Button>
        </div>
      )}

      <Table<TemplateView>
        rowKey="id"
        size="middle"
        components={TABLE_COMPONENTS}
        loading={loading}
        dataSource={rows}
        scroll={{ x: 900 }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => setSelectedKeys(keys.map(String)),
        }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={hasFilter ? '没有匹配的题目' : '题库还没有题目，点右上角「导入 Excel」批量添加'}
            />
          ),
        }}
        pagination={pager(page, pageSize, total, setPage, setPageSize, (n) => `共 ${n} 道题`)}
        columns={[
          {
            title: '序号',
            width: 70,
            render: (_: unknown, __, index) => (page - 1) * pageSize + index + 1,
          },
          {
            title: '题型',
            dataIndex: 'questionType',
            width: 110,
            render: (t) => <Tag color={TYPE_COLOR[t] ?? 'default'}>{TYPE_LABEL[t] ?? t ?? '—'}</Tag>,
          },
          {
            title: '题干',
            dataIndex: 'name',
            render: (_: unknown, row) => (
              <span style={{ whiteSpace: 'pre-wrap' }}>{row.template?.title || row.name || '(无题干)'}</span>
            ),
          },
          {
            title: '分值',
            width: 90,
            render: (_: unknown, row) => {
              const score = row.template?.attribute?.examScore;
              return score == null ? '—' : `${score} 分`;
            },
          },
          {
            title: '标签',
            width: 180,
            render: (_: unknown, row) => {
              const tags = row.tag?.length ? row.tag : row.template?.tags;
              return tags?.length ? (
                <Space size={4} wrap>
                  {tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </Space>
              ) : (
                '—'
              );
            },
          },
          {
            title: '创建时间',
            dataIndex: 'createAt',
            width: 170,
            render: (v) => v || '—',
          },
        ]}
      />
    </>
  );
}
