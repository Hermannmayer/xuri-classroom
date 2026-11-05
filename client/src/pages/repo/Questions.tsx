import { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Input, message, Space, Table, Tag, Upload } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
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
  Textarea: '多行文本',
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
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    try {
      const res = await getWithPagination<TemplateView>('/api/template/list', {
        repoId,
        current: page,
        pageSize,
        name: keyword,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [repoId, page, pageSize, keyword]);

  useEffect(() => {
    void load();
  }, [load]);

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
    if (!loading && total === 0 && !keyword) {
      message.warning('题库还没有题目，先导入再导出');
      return;
    }
    try {
      await download('/api/repo/export', { id: repoId }, `${repoName || '题库'}题目.xlsx`);
    } catch (e) {
      message.error((e as Error).message);
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Input.Search
          allowClear
          placeholder="搜索题目名称"
          style={{ width: 220 }}
          onSearch={(v) => {
            setKeyword(v.trim());
            setPage(1);
          }}
        />
      </div>

      <Table<TemplateView>
        rowKey="id"
        size="middle"
        components={TABLE_COMPONENTS}
        loading={loading}
        dataSource={rows}
        scroll={{ x: 900 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={keyword ? '没有匹配的题目' : '题库还没有题目，点右上角「导入 Excel」批量添加'}
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
