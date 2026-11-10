import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Upload,
} from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import LinkAction from '../../components/LinkAction';
import TableScrollRegion from '../../components/TableScrollRegion';
import { download, get, getWithPagination, post } from '../../api';
import { can, loadAuthorities } from '../../auth/permissions';
import type { QuestionType, SurveySchema } from '../../schema/types';
import { pager, TABLE_COMPONENTS } from './table';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import RepoExportModal, { type RepoExportTarget } from './RepoExportModal';

/** 与后端 TemplateView 对齐（题库题目列表走 /api/template/list?repoId=） */
interface TemplateView {
  id: string;
  name?: string;
  questionType?: string;
  template?: SurveySchema;
  tag?: string[];
  category?: string;
  mode?: string;
  repoId?: string;
  previewUrl?: string;
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

interface OptionDraft {
  id: string;
  text: string;
}

const CHOICE_TYPES = new Set(['Radio', 'Checkbox', 'Judge']);

let optionSeq = 0;
function newOptionId() {
  optionSeq += 1;
  return `opt_${Date.now().toString(36)}_${optionSeq.toString(36)}`;
}

/** 从模板 children/dataSource 提取选项，保留原 option id */
function templateOptions(template?: SurveySchema): OptionDraft[] {
  const fromChildren = (template?.children ?? [])
    .filter((child) => child.type === 'Option' || !child.type)
    .map((child) => ({ id: child.id, text: child.title ?? '' }));
  if (fromChildren.length) return fromChildren;
  return (template?.dataSource ?? []).map((item) => ({ id: item.value, text: item.label ?? '' }));
}

/** 正确答案：选择题存 option.attribute.examCorrectAnswer，填空/简答存第一个空位 */
function templateCorrect(template: SurveySchema | undefined, type: string, options: OptionDraft[]): string | string[] {
  if (type === 'Checkbox') {
    return options
      .filter((opt) => Boolean(template?.children?.find((child) => child.id === opt.id)?.attribute?.examCorrectAnswer))
      .map((opt) => opt.id);
  }
  if (CHOICE_TYPES.has(type)) {
    return (
      options.find((opt) => Boolean(template?.children?.find((child) => child.id === opt.id)?.attribute?.examCorrectAnswer))
        ?.id ?? ''
    );
  }
  return template?.children?.[0]?.attribute?.examCorrectAnswer ?? template?.attribute?.examCorrectAnswer ?? '';
}

export default function RepoQuestions() {
  const { repoId = '', mode = 'normal' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // 题库名称的取法（刷新后 location.state 会丢）：
  // 1) 列表页跳转时的 state；2) URL 上的 ?repoName=（可分享/可刷新）；
  // 3) GET /api/repo/detail?id= 兜底（需要 repo:detail）；4) 都没有就显示「题库题目」。
  const stateRepoName = (location.state as { repoName?: string } | null)?.repoName;
  const queryRepoName = new URLSearchParams(location.search).get('repoName') || undefined;
  const [repoDetail, setRepoDetail] = useState<{ id?: string; name?: string }>({});
  const repoName = stateRepoName || queryRepoName || (repoDetail.id === repoId ? repoDetail.name : undefined);

  useEffect(() => {
    if (!repoId || stateRepoName || queryRepoName) return;
    let alive = true;
    get<{ name?: string }>('/api/repo/detail', { id: repoId })
      .then((repo) => {
        if (alive && repo?.name) setRepoDetail({ id: repoId, name: repo.name });
      })
      // 没有 repo:detail 时静默降级成「题库题目」，不打扰只读浏览的人
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [repoId, stateRepoName, queryRepoName]);

  const [rows, setRows] = useState<TemplateView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [questionType, setQuestionType] = useState<string>();
  // 默认给任务要求的 5 种题型；加载后把当前页出现的新题型并进来
  const [typeOptions, setTypeOptions] = useState<string[]>([
    'Radio',
    'Checkbox',
    'Judge',
    'FillBlank',
    'Textarea',
  ]);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // 接口失败/无权限 ≠ 题库没题目：失败时单独展示错误说明，不再显示误导性的「题库还没有题目」
  const [loadError, setLoadError] = useState<string>();
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [authorities, setAuthorities] = useState<string[]>([]);
  // 导出：列表页与题目页共用 RepoExportModal
  const [exportTarget, setExportTarget] = useState<RepoExportTarget | null>(null);

  useEffect(() => {
    void loadAuthorities().then((a) => setAuthorities(a));
  }, []);

  // 权限细分：导入统一用 template:import（原 repo:import 已合并），导出要 repo:export
  const canImport = can(authorities, PERMISSION_CODES.templateImport);
  const canExport = can(authorities, PERMISSION_CODES.repoExport);
  const canEdit = can(authorities, PERMISSION_CODES.templateUpdate);
  const canDelete = can(authorities, PERMISSION_CODES.templateDelete);
  const [editing, setEditing] = useState<TemplateView | null>(null);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [correct, setCorrect] = useState<string | string[]>('');
  // 多空填空逐空答案，下标与 schema.children 一一对应
  const [blanks, setBlanks] = useState<string[]>([]);
  const [editForm] = Form.useForm<{
    title: string;
    score?: number;
    analysis?: string;
    tags?: string[];
  }>();

  const load = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    setLoadError(undefined);
    try {
      const res = await getWithPagination<TemplateView>('/api/template/list', {
        repoId,
        current: page,
        pageSize,
        name: keyword,
        questionType: questionType || undefined,
      });
      setRows(res.data);
      setTotal(res.total);
      // 下拉选项从当前/已加载数据里累积，避免筛选后选项消失
      const nextTypes = res.data.map((row) => row.questionType).filter((t): t is string => Boolean(t));
      const nextTags = res.data.flatMap((row) => row.tag ?? row.template?.tags ?? []);
      setTypeOptions((prev) => Array.from(new Set([...prev, ...nextTypes])));
      setTagOptions((prev) => Array.from(new Set([...prev, ...nextTags])));
    } catch (e) {
      // 403/网络失败都落到这里：单独记状态，让页面显示「加载失败 + 返回题库」而不是空题库。
      // 顺便带上错误码，403 时给一句贴合本页的说明（通用 403 文案会误导成导出密码问题）。
      const err = e as Error & { code?: number };
      const base = err.code === 403 ? '没有权限查看这个题库的题目' : err.message || '读取题目列表失败';
      setLoadError(err.code ? `${base}（错误码 ${err.code}）` : base);
      message.error(base);
    } finally {
      setLoading(false);
    }
  }, [repoId, page, pageSize, keyword, questionType]);

  useEffect(() => {
    void load();
  }, [load]);

  // 翻页/筛选后旧选中项可能已不在当前列表，直接清空避免误删
  useEffect(() => {
    setSelectedKeys([]);
  }, [repoId, page, pageSize, keyword, questionType]);

  const hasFilter = Boolean(keyword || questionType);

  const editType = editing?.questionType ?? editing?.template?.type ?? '';
  const isChoice = CHOICE_TYPES.has(editType);
  const isJudge = editType === 'Judge';
  const isMulti = editType === 'Checkbox';
  const isMultipleBlank = editType === 'MultipleBlank';
  // 多空填空的空位就是 children，title 是给用户看的提示
  const editChildren = editing?.template?.children ?? [];

  // Modal 关闭时会销毁 Form，等它挂载后再回填
  useEffect(() => {
    if (!editing) return;
    const template = editing.template;
    const type = editing.questionType ?? template?.type ?? '';
    let opts = templateOptions(template);
    if (CHOICE_TYPES.has(type)) {
      if (type === 'Judge') {
        opts = opts.slice(0, 2);
        while (opts.length < 2) {
          opts.push({ id: newOptionId(), text: opts.length === 0 ? '正确' : '错误' });
        }
        opts = opts.map((opt, index) => ({ ...opt, text: opt.text || (index === 0 ? '正确' : '错误') }));
      } else if (opts.length === 0) {
        opts = [
          { id: newOptionId(), text: '' },
          { id: newOptionId(), text: '' },
        ];
      } else {
        opts = opts.slice(0, 8);
      }
    }
    setOptions(opts);
    setCorrect(templateCorrect(template, type, opts));
    // 多空填空逐空回填；没有空位时留一个空输入框，保存时再补 children
    setBlanks(
      type === 'MultipleBlank'
        ? (template?.children ?? []).length
          ? (template?.children ?? []).map((child) => child.attribute?.examCorrectAnswer ?? '')
          : ['']
        : [],
    );
    editForm.setFieldsValue({
      title: template?.title || editing.name || '',
      score: template?.attribute?.examScore,
      analysis: template?.attribute?.examAnalysis,
      tags: editing.tag ?? template?.tags ?? [],
    });
  }, [editing, editForm]);

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

  /** 导出题目：先挡掉空题库/加载失败，再打开共用导出弹窗 */
  const openExport = () => {
    if (!loading && total === 0 && !hasFilter) {
      message.warning(loadError ? '题目列表没有加载成功，先点「重新加载」' : '题库还没有题目，先导入再操作');
      return;
    }
    setExportTarget({ id: repoId, name: repoName, total });
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

  const removeOne = async (row: TemplateView) => {
    try {
      await post<void>('/api/template/delete', { ids: [row.id] });
      message.success('已删除');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const changeOption = (id: string, text: string) => {
    setOptions((prev) => prev.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  };

  const addOption = () => {
    setOptions((prev) => (prev.length >= 8 ? prev : [...prev, { id: newOptionId(), text: '' }]));
  };

  const removeOption = (id: string) => {
    if (options.length <= 1) return;
    setOptions((prev) => prev.filter((opt) => opt.id !== id));
    setCorrect((prev) =>
      Array.isArray(prev) ? prev.filter((item) => item !== id) : prev === id ? '' : prev,
    );
  };

  const saveEdit = async () => {
    if (!editing) return;
    const values = await editForm.validateFields();
    setSaving(true);
    try {
      const base = editing.template;
      const type = (editing.questionType ?? base?.type ?? 'FillBlank') as QuestionType;
      const judge = type === 'Judge';
      const multi = type === 'Checkbox';
      const correctIds = multi
        ? Array.isArray(correct)
          ? correct
          : []
        : typeof correct === 'string' && correct
          ? [correct]
          : [];
      const oldChildren = base?.children ?? [];
      let children: SurveySchema[] = oldChildren;
      let dataSource = base?.dataSource;

      if (CHOICE_TYPES.has(type)) {
        children = options.map((opt, index): SurveySchema => {
          const previous = oldChildren.find((child) => child.id === opt.id);
          const text = judge ? opt.text || (index === 0 ? '正确' : '错误') : opt.text;
          return {
            id: opt.id,
            title: text,
            type: 'Option',
            attribute: {
              ...(previous?.attribute ?? {}),
              ...(correctIds.includes(opt.id)
                ? { examCorrectAnswer: opt.id }
                : { examCorrectAnswer: undefined }),
            },
          };
        });
        dataSource = options.map((opt, index) => ({
          label: judge ? opt.text || (index === 0 ? '正确' : '错误') : opt.text,
          value: opt.id,
        }));
      } else if (type === 'MultipleBlank') {
        // 多空填空：逐空写回对应 child 的 examCorrectAnswer；空值置 undefined，避免残留旧答案
        const answers = blanks.map((value) => value.trim());
        if (children.length) {
          children = children.map((child, index) => ({
            ...child,
            attribute: { ...(child.attribute ?? {}), examCorrectAnswer: answers[index] || undefined },
          }));
        } else {
          children = answers.map((answer) => ({
            id: newOptionId(),
            title: '',
            type: 'Option',
            attribute: { examCorrectAnswer: answer || undefined },
          }));
        }
      } else {
        // 单空填空/简答：正确答案写第一个空位；其余 children 原样保留
        const correctText = typeof correct === 'string' ? correct.trim() : '';
        if (children.length) {
          children = children.map((child, index) =>
            index === 0
              ? {
                  ...child,
                  attribute: { ...(child.attribute ?? {}), examCorrectAnswer: correctText || undefined },
                }
              : child,
          );
        } else {
          children = [
            {
              id: newOptionId(),
              title: '',
              type: 'Option',
              attribute: { examCorrectAnswer: correctText || undefined },
            },
          ];
        }
      }

      const nextTemplate: SurveySchema = {
        ...(base ?? { id: editing.id, title: values.title.trim(), type, attribute: {} }),
        title: values.title.trim(),
        type,
        attribute: {
          ...(base?.attribute ?? {}),
          examScore: values.score,
          examAnalysis: values.analysis?.trim() || undefined,
        },
        tags: values.tags ?? [],
        children,
        dataSource,
      };

      // 回传完整 TemplateRequest：后端 updateById 忽略 null，但 template 是整包 JSON，必须带全
      await post<void>('/api/template/update', {
        id: editing.id,
        name: values.title.trim(),
        questionType: type,
        template: nextTemplate,
        mode: editing.mode,
        tag: values.tags ?? [],
        category: editing.category,
        repoId: editing.repoId ?? repoId,
        previewUrl: editing.previewUrl,
      });
      message.success('已保存');
      setEditing(null);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // 没有 repoId（路由参数丢失/链接不完整）时直接给提示：不发请求，也不显示「题库还没有题目」
  if (!repoId) {
    return (
      <div className="bp-card" style={{ padding: 32 }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ lineHeight: 1.9 }}>
              没有取到题库 ID，链接可能不完整。
              <br />
              请回到题库列表重新进入这个题库。
            </div>
          }
        >
          <Button type="primary" onClick={() => navigate('/repo/index')}>
            返回题库列表
          </Button>
        </Empty>
      </div>
    );
  }

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
              {loadError
                ? '题目列表没有加载成功，详见下方说明'
                : `共 ${total} 道题${
                    canImport ? ' · Excel 导入按题型分 sheet 解析，导出同样分 sheet' : ' · 只读浏览'
                  }`}
            </div>
          </div>
        </div>
        <Space wrap>
          {canImport && (
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
          )}
          {canImport && (
            <Button
              icon={<DownloadOutlined />}
              onClick={() =>
                void download('/api/file/downloadTemplate', { name: '卷王题库导入模板' }, '题库导入模板.xlsx').catch(
                  (e) => message.error((e as Error).message),
                )
              }
            >
              下载模板
            </Button>
          )}
          {canExport && (
            <Button icon={<DownloadOutlined />} onClick={openExport}>
              导出
            </Button>
          )}
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
        {/* TODO 标签筛选暂时隐藏：/api/template/list 的 tag 过滤走 t_tag 表
            （TemplateServiceImpl#getTaggedTemplateIds），但本页编辑标签只写 t_template.tag，t_tag 不落库；
            /api/template/listTag 又硬编码 question_type=Survey，题库题型（Radio/FillBlank…）永远查不到。
            等后端把过滤改成 t_template.tag（或在保存模板时同步 t_tag）再恢复这个下拉。 */}
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

      {canDelete && selectedKeys.length > 0 && (
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

      {loadError ? (
        <div className="bp-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Alert
            type="error"
            showIcon
            message="题目列表加载失败"
            description={
              <div style={{ lineHeight: 1.9 }}>
                {loadError}
                <br />
                可能是没有查看该题库的权限（需要 repo:detail / template:list），也可能是后端接口暂时不可用。
              </div>
            }
          />
          <Space wrap>
            <Button type="primary" onClick={() => void load()}>
              重新加载
            </Button>
            <Button onClick={() => navigate('/repo/index')}>返回题库</Button>
          </Space>
        </div>
      ) : (
      <TableScrollRegion label="题目列表（可横向滚动）">
      <Table<TemplateView>
        rowKey="id"
        size="middle"
        components={TABLE_COMPONENTS}
        loading={loading}
        dataSource={rows}
        scroll={{ x: 900 }}
        rowSelection={
          canDelete
            ? {
                selectedRowKeys: selectedKeys,
                onChange: (keys) => setSelectedKeys(keys.map(String)),
              }
            : undefined
        }
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                hasFilter
                  ? '没有匹配的题目'
                  : canImport
                    ? '题库还没有题目，点右上角「导入 Excel」批量添加'
                    : '题库还没有题目'
              }
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
          ...(canEdit || canDelete
            ? [
                {
                  title: '操作',
                  width: 140,
                  render: (_: unknown, row: TemplateView) => (
                    <Space size={10}>
                      {canEdit && <LinkAction onClick={() => setEditing(row)}>编辑</LinkAction>}
                      {canDelete && (
                        <Popconfirm
                          title="删除这道题？"
                          description="删除后不可恢复。"
                          okText="删除"
                          cancelText="取消"
                          onConfirm={() => removeOne(row)}
                        >
                          <LinkAction style={{ color: 'var(--bp-orange)' }}>删除</LinkAction>
                        </Popconfirm>
                      )}
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />
      </TableScrollRegion>
      )}

      <Modal
        title="编辑题目"
        open={!!editing}
        width="min(720px, 94vw)"
        onCancel={() => setEditing(null)}
        onOk={saveEdit}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={editForm} layout="vertical" size="small" preserve={false}>
          <Form.Item
            name="title"
            label="题干"
            rules={[{ required: true, whitespace: true, message: '请输入题干' }]}
          >
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} placeholder="请输入题干" />
          </Form.Item>

          {isChoice && (
            <Form.Item label={isJudge ? '选项（正确/错误）' : '选项（最多 8 个）'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {options.map((opt, index) => (
                  <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 18, color: 'var(--bp-text-soft)' }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <Input
                      value={opt.text}
                      placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                      onChange={(e) => changeOption(opt.id, e.target.value)}
                    />
                    {!isJudge && (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={options.length <= 1}
                        onClick={() => removeOption(opt.id)}
                      />
                    )}
                  </div>
                ))}
                {!isJudge && (
                  <Button icon={<PlusOutlined />} disabled={options.length >= 8} onClick={addOption}>
                    添加选项
                  </Button>
                )}
              </div>
            </Form.Item>
          )}

          <Form.Item label={isMultipleBlank ? '正确答案（逐空填写）' : '正确答案'}>
            {isChoice ? (
              isMulti ? (
                <Select
                  mode="multiple"
                  allowClear
                  value={Array.isArray(correct) ? correct : []}
                  placeholder="选择正确选项（可多选）"
                  onChange={(v) => setCorrect(v)}
                  options={options.map((opt, index) => ({
                    value: opt.id,
                    label: `${String.fromCharCode(65 + index)}. ${opt.text || '(未填写)'}`,
                  }))}
                />
              ) : (
                <Select
                  allowClear
                  value={typeof correct === 'string' && correct ? correct : undefined}
                  placeholder={isJudge ? '选择正确/错误' : '选择正确选项'}
                  onChange={(v) => setCorrect(v ?? '')}
                  options={options.map((opt, index) => ({
                    value: opt.id,
                    label: isJudge
                      ? opt.text || (index === 0 ? '正确' : '错误')
                      : `${String.fromCharCode(65 + index)}. ${opt.text || '(未填写)'}`,
                  }))}
                />
              )
            ) : isMultipleBlank ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {blanks.map((value, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 48, flexShrink: 0, fontSize: 11, color: 'var(--bp-text-soft)' }}>
                      空 {index + 1}
                    </span>
                    <Input
                      value={value}
                      placeholder={editChildren[index]?.title || `第 ${index + 1} 空的正确答案`}
                      onChange={(e) =>
                        setBlanks((prev) => prev.map((item, i) => (i === index ? e.target.value : item)))
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 4 }}
                value={typeof correct === 'string' ? correct : ''}
                placeholder="填写正确答案"
                onChange={(e) => setCorrect(e.target.value)}
              />
            )}
          </Form.Item>

          <Form.Item name="score" label="分值">
            <InputNumber min={0} step={0.5} style={{ width: 160 }} placeholder="选填" />
          </Form.Item>
          <Form.Item name="analysis" label="解析">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="选填" />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select
              mode="tags"
              allowClear
              placeholder="输入后回车添加标签"
              options={tagOptions.map((t) => ({ value: t, label: t }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <RepoExportModal target={exportTarget} onClose={() => setExportTarget(null)} />
    </>
  );
}
