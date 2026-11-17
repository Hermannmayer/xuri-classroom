import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd';
import { getWithPagination } from '../../api';
import {
  COMPOSE_TYPES,
  TYPE_LABELS,
  getComposeStats,
  pickFromRepo,
  type ComposeStats,
  type ComposeType,
} from '../../api/compose';
import type { SurveySchema } from '../../schema/types';

interface RepoView {
  id: string;
  name?: string;
  total?: number;
}

interface TemplateRow {
  id: string;
  name?: string;
  questionType?: ComposeType;
  template?: SurveySchema;
  chapter?: string;
  difficulty?: string;
  tag?: string[];
}

const TYPE_FULL: Record<ComposeType, string> = {
  Radio: '单选题',
  Checkbox: '多选题',
  Judge: '判断题',
  FillBlank: '填空题',
  Textarea: '简答题',
};

const DEFAULT_COUNTS: Record<string, number> = { Radio: 5, Checkbox: 3, Judge: 3, FillBlank: 2, Textarea: 1 };
const DEFAULT_SCORES: Record<string, number> = { Radio: 2, Checkbox: 3, Judge: 2, FillBlank: 2, Textarea: 10 };

function toSchema(row: TemplateRow): SurveySchema {
  const source = row.template ?? { id: row.id, title: row.name || '', type: row.questionType ?? 'Radio', attribute: {} };
  const schema: SurveySchema = {
    ...source,
    id: row.id,
    type: (source.type ?? row.questionType ?? 'Radio') as SurveySchema['type'],
    title: source.title || row.name || '',
    attribute: {
      ...(source.attribute ?? {}),
      required: true,
      examScore: source.attribute?.examScore ?? 5,
    },
  };
  if (!schema.dataSource?.length && schema.children?.length) {
    schema.dataSource = schema.children
      .filter((child) => child.type === 'Option' || !child.type)
      .map((child) => ({ label: child.title ?? '', value: child.id }));
  }
  return schema;
}

interface Props {
  open: boolean;
  excludeIds: string[];
  onClose: () => void;
  onPick: (questions: SurveySchema[]) => void;
}

/** 从题库抽题：可以浏览题库勾选，也可以按题型题数随机/顺序抽 */
export default function BankPickModal({ open, excludeIds, onClose, onPick }: Props) {
  const [tab, setTab] = useState<'browse' | 'rule'>('browse');
  const [repos, setRepos] = useState<RepoView[]>([]);
  const [repoId, setRepoId] = useState<string>();
  const [stats, setStats] = useState<ComposeStats | null>(null);
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [questionType, setQuestionType] = useState<ComposeType | undefined>();
  const [chapter, setChapter] = useState<string | undefined>();
  const [difficulty, setDifficulty] = useState<string | undefined>();
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Map<string, SurveySchema>>(new Map());

  const [ruleMode, setRuleMode] = useState<'random' | 'sequential'>('random');
  const [ruleCounts, setRuleCounts] = useState<Record<string, number>>({ ...DEFAULT_COUNTS });
  const [ruleScores, setRuleScores] = useState<Record<string, number>>({ ...DEFAULT_SCORES });
  const [picked, setPicked] = useState<SurveySchema[]>([]);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!open) return;
    getWithPagination<RepoView>('/api/repo/list', { current: 1, pageSize: 200 })
      .then((res) => {
        setRepos(res.data);
        if (!repoId && res.data.length) setRepoId(res.data[0].id);
      })
      .catch((e: Error) => message.error(e.message));
  }, [open, repoId]);

  useEffect(() => {
    if (!open || !repoId) {
      setStats(null);
      return;
    }
    getComposeStats([repoId])
      .then(setStats)
      .catch(() => setStats(null));
  }, [open, repoId]);

  useEffect(() => {
    if (!open) {
      setSelected(new Map());
      setRows([]);
      setTotal(0);
      setPicked([]);
      setPage(1);
      setKeyword('');
      setKeywordInput('');
      setTab('browse');
    }
  }, [open]);

  const availableTypes = useMemo(
    () => COMPOSE_TYPES.filter((type) => (stats?.byType[TYPE_FULL[type]] ?? 0) > 0),
    [stats],
  );

  useEffect(() => {
    if (questionType && !availableTypes.includes(questionType)) setQuestionType(undefined);
  }, [availableTypes, questionType]);

  const load = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    try {
      const res = await getWithPagination<TemplateRow>('/api/template/list', {
        repoId,
        current: page,
        pageSize,
        questionType,
        chapter,
        difficulty,
        keyword,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [repoId, page, pageSize, questionType, chapter, difficulty, keyword]);

  useEffect(() => {
    if (open && repoId) void load();
  }, [open, repoId, load]);

  const chapterOptions = useMemo(
    () =>
      Object.keys(stats?.byChapter ?? {})
        .filter((key) => key !== '未设置')
        .map((key) => ({ label: key, value: key })),
    [stats],
  );
  const difficultyOptions = useMemo(
    () =>
      Object.keys(stats?.byDifficulty ?? {})
        .filter((key) => key !== '未设置')
        .map((key) => ({ label: key, value: key })),
    [stats],
  );

  const selectedList = Array.from(selected.values());
  const selectedScore = selectedList.reduce((sum, question) => sum + (question.attribute?.examScore ?? 0), 0);
  const pageAllSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  const addQuestions = (questions: SurveySchema[]) => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const question of questions) next.set(question.id, question);
      return next;
    });
  };

  const toggle = (row: TemplateRow, checked: boolean) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) next.set(row.id, toSchema(row));
      else next.delete(row.id);
      return next;
    });
  };

  const doRulePick = async () => {
    if (!repoId) {
      message.warning('请先选择题库');
      return;
    }
    const countSum = availableTypes.reduce((sum, type) => sum + Number(ruleCounts[type] ?? 0), 0);
    if (!countSum) {
      message.warning('请至少给一种题型配置题数');
      return;
    }
    setPicking(true);
    try {
      const questions = await pickFromRepo({
        repoIds: [repoId],
        types: availableTypes,
        chapters: chapter ? [chapter] : [],
        difficulties: difficulty ? [difficulty] : [],
        keyword: keyword || undefined,
        counts: ruleCounts,
        scores: ruleScores,
        mode: ruleMode,
        excludeIds,
        seed: Math.floor(Math.random() * 1_000_000_000),
      });
      setPicked(questions);
      addQuestions(questions);
      if (!questions.length) message.warning('没有抽到题目，请调整条件');
      else if (questions.length < countSum) message.warning('题量不足：需要 ' + countSum + ' 题，只抽到 ' + questions.length + ' 题');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setPicking(false);
    }
  };

  const browsePane = (
    <Space orientation="vertical" style={{ width: '100%' }} size={10}>
      <Space wrap>
        <Select
          allowClear
          style={{ width: 130 }}
          placeholder="全部题型"
          value={questionType}
          onChange={(value) => {
            setQuestionType(value);
            setPage(1);
          }}
          options={availableTypes.map((type) => ({ label: TYPE_LABELS[type], value: type }))}
        />
        <Select
          allowClear
          style={{ width: 180 }}
          placeholder="全部章节"
          value={chapter}
          onChange={(value) => {
            setChapter(value);
            setPage(1);
          }}
          options={chapterOptions}
        />
        <Select
          allowClear
          style={{ width: 120 }}
          placeholder="全部难度"
          value={difficulty}
          onChange={(value) => {
            setDifficulty(value);
            setPage(1);
          }}
          options={difficultyOptions}
        />
        <Input.Search
          allowClear
          style={{ width: 240 }}
          placeholder="搜索题干"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onSearch={(value) => {
            setKeyword(value.trim());
            setPage(1);
          }}
        />
      </Space>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Checkbox
          checked={pageAllSelected}
          indeterminate={rows.some((row) => selected.has(row.id)) && !pageAllSelected}
          onChange={(e) => {
            setSelected((prev) => {
              const next = new Map(prev);
              for (const row of rows) {
                if (e.target.checked) {
                  if (!excludeIds.includes(row.id)) next.set(row.id, toSchema(row));
                } else {
                  next.delete(row.id);
                }
              }
              return next;
            });
          }}
        >
          全选本页
        </Checkbox>
        <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>共 {total} 题</span>
      </div>

      <Table
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={rows}
        locale={{ emptyText: <Empty description="没有匹配的题目" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
          showTotal: (count) => '共 ' + count + ' 题',
        }}
        columns={[
          {
            title: '',
            width: 46,
            render: (_: unknown, row: TemplateRow) => {
              const disabled = excludeIds.includes(row.id);
              return (
                <Checkbox
                  checked={selected.has(row.id)}
                  disabled={disabled}
                  onChange={(e) => toggle(row, e.target.checked)}
                />
              );
            },
          },
          {
            title: '题型',
            width: 76,
            render: (_: unknown, row: TemplateRow) => (
              <Tag>{row.questionType ? TYPE_LABELS[row.questionType] : '—'}</Tag>
            ),
          },
          {
            title: '题干',
            render: (_: unknown, row: TemplateRow) => (
              <span style={{ whiteSpace: 'pre-wrap' }}>
                {(row.template?.title || row.name || '').replace(/<[^>]+>/g, '').slice(0, 120)}
              </span>
            ),
          },
          { title: '章节', width: 130, render: (_: unknown, row: TemplateRow) => row.chapter || '—' },
          { title: '难度', width: 70, render: (_: unknown, row: TemplateRow) => row.difficulty || '—' },
          {
            title: '分值',
            width: 70,
            render: (_: unknown, row: TemplateRow) => row.template?.attribute?.examScore ?? '—',
          },
          {
            title: '状态',
            width: 80,
            render: (_: unknown, row: TemplateRow) =>
              excludeIds.includes(row.id) ? (
                <Tag color="red">卷内已有</Tag>
              ) : selected.has(row.id) ? (
                <Tag color="green">已选</Tag>
              ) : null,
          },
        ]}
      />
    </Space>
  );

  const rulePane = (
    <Space orientation="vertical" style={{ width: '100%' }} size={10}>
      <Space wrap>
        <Radio.Group value={ruleMode} onChange={(e) => setRuleMode(e.target.value)}>
          <Radio.Button value="random">随机</Radio.Button>
          <Radio.Button value="sequential">顺序</Radio.Button>
        </Radio.Group>
        <Button type="primary" loading={picking} onClick={doRulePick}>
          抽题
        </Button>
        <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
          按题型配题数与分值，抽到的题会自动加入已选
        </span>
      </Space>

      <Table
        size="small"
        pagination={false}
        rowKey="type"
        dataSource={availableTypes.map((type) => ({ type }))}
        locale={{ emptyText: '该题库没有可用题型' }}
        columns={[
          { title: '题型', dataIndex: 'type', width: 90, render: (type: ComposeType) => TYPE_LABELS[type] },
          {
            title: '可用',
            width: 80,
            render: (_: unknown, row: { type: ComposeType }) => stats?.byType[TYPE_FULL[row.type]] ?? '-',
          },
          {
            title: '题数',
            render: (_: unknown, row: { type: ComposeType }) => (
              <InputNumber
                min={0}
                value={ruleCounts[row.type]}
                onChange={(value) => setRuleCounts({ ...ruleCounts, [row.type]: Number(value ?? 0) })}
              />
            ),
          },
          {
            title: '每题分值',
            render: (_: unknown, row: { type: ComposeType }) => (
              <InputNumber
                min={0}
                step={0.5}
                value={ruleScores[row.type]}
                onChange={(value) => setRuleScores({ ...ruleScores, [row.type]: Number(value ?? 0) })}
              />
            ),
          },
        ]}
      />

      {picked.length === 0 ? (
        <Empty description="配好题数与分值后点「抽题」" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          size="small"
          style={{ maxHeight: 260, overflow: 'auto' }}
          dataSource={picked}
          renderItem={(question) => (
            <List.Item>
              <Checkbox
                checked={selected.has(question.id)}
                onChange={(e) => {
                  setSelected((prev) => {
                    const next = new Map(prev);
                    if (e.target.checked) next.set(question.id, question);
                    else next.delete(question.id);
                    return next;
                  });
                }}
              >
                <Space wrap>
                  <Tag>{TYPE_LABELS[(question.type as ComposeType) ?? 'Radio'] ?? question.type}</Tag>
                  <span>{(question.title || '').replace(/<[^>]+>/g, '').slice(0, 70)}</span>
                  <span style={{ color: 'var(--bp-text-soft)' }}>{question.attribute?.examScore ?? '-'} 分</span>
                </Space>
              </Checkbox>
            </List.Item>
          )}
        />
      )}
    </Space>
  );

  return (
    <Modal
      title="从题库抽题"
      open={open}
      width="min(1100px, 96vw)"
      onCancel={onClose}
      onOk={() => {
        if (!selectedList.length) {
          message.warning('请先勾选题目');
          return;
        }
        onPick(selectedList);
        message.success('已添加 ' + selectedList.length + ' 题，共 ' + selectedScore + ' 分');
        onClose();
      }}
      okText={'添加到试卷（' + selectedList.length + ' 题 / ' + selectedScore + ' 分）'}
      cancelText="取消"
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: '100%' }} size={10}>
        <Space wrap>
          <Select
            style={{ width: 210 }}
            placeholder="选择题库"
            value={repoId}
            onChange={(value) => {
              setRepoId(value);
              setPage(1);
              setSelected(new Map());
              setPicked([]);
              setChapter(undefined);
              setDifficulty(undefined);
              setQuestionType(undefined);
            }}
            options={repos.map((repo) => ({ label: repo.name || '未命名题库', value: repo.id }))}
          />
          <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
            题库共 {stats?.total ?? 0} 题；卷内已有 {excludeIds.length} 题会自动拦截
          </span>
        </Space>

        <Tabs
          activeKey={tab}
          onChange={(key) => setTab(key as 'browse' | 'rule')}
          items={[
            { key: 'browse', label: '浏览选题', children: browsePane },
            { key: 'rule', label: '按规则抽题', children: rulePane },
          ]}
        />

        <Alert
          type="info"
          showIcon
          title={'已选 ' + selectedList.length + ' 题 / ' + selectedScore + ' 分'}
        />
      </Space>
    </Modal>
  );
}
