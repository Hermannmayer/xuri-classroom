import { useEffect, useMemo, useState } from 'react';
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

const TYPE_FULL: Record<ComposeType, string> = {
  Radio: '单选题',
  Checkbox: '多选题',
  Judge: '判断题',
  FillBlank: '填空题',
  Textarea: '简答题',
};

const DEFAULT_COUNTS: Record<string, number> = { Radio: 5, Checkbox: 3, Judge: 3, FillBlank: 2, Textarea: 1 };
const DEFAULT_SCORES: Record<string, number> = { Radio: 2, Checkbox: 3, Judge: 2, FillBlank: 2, Textarea: 10 };

interface Props {
  open: boolean;
  excludeIds: string[];
  onClose: () => void;
  onPick: (questions: SurveySchema[]) => void;
}

/** 从题库抽题：按题型配题数与分值，随机或按顺序抽一批，勾选后插入当前试卷 */
export default function BankPickModal({ open, excludeIds, onClose, onPick }: Props) {
  const [repos, setRepos] = useState<RepoView[]>([]);
  const [repoId, setRepoId] = useState<string>();
  const [stats, setStats] = useState<ComposeStats | null>(null);
  const [chapter, setChapter] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [keyword, setKeyword] = useState('');
  const [mode, setMode] = useState<'random' | 'sequential'>('random');
  const [counts, setCounts] = useState<Record<string, number>>({ ...DEFAULT_COUNTS });
  const [scores, setScores] = useState<Record<string, number>>({ ...DEFAULT_SCORES });
  const [candidates, setCandidates] = useState<SurveySchema[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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
    let alive = true;
    getComposeStats([repoId])
      .then((res) => {
        if (alive) setStats(res);
      })
      .catch((e: Error) => message.error(e.message));
    return () => {
      alive = false;
    };
  }, [open, repoId]);

  useEffect(() => {
    if (!open) {
      setCandidates([]);
      setSelected([]);
    }
  }, [open]);

  const availableTypes = useMemo(
    () => COMPOSE_TYPES.filter((type) => (stats?.byType[TYPE_FULL[type]] ?? 0) > 0),
    [stats],
  );

  const totalQuestions = availableTypes.reduce((sum, type) => sum + Number(counts[type] ?? 0), 0);
  const totalScore = availableTypes.reduce(
    (sum, type) => sum + Number(counts[type] ?? 0) * Number(scores[type] ?? 0),
    0,
  );

  const doPick = async () => {
    if (!repoId) {
      message.warning('请先选择题库');
      return;
    }
    if (!totalQuestions) {
      message.warning('请至少给一种题型配置题数');
      return;
    }
    setLoading(true);
    try {
      const questions = await pickFromRepo({
        repoIds: [repoId],
        types: availableTypes,
        chapters: chapter.trim() ? [chapter.trim()] : [],
        difficulties: difficulty.trim() ? [difficulty.trim()] : [],
        keyword: keyword.trim() || undefined,
        counts,
        scores,
        mode,
        excludeIds,
        seed: Math.floor(Math.random() * 1_000_000_000),
      });
      setCandidates(questions);
      setSelected(questions.map((question) => question.id));
      if (!questions.length) message.warning('没有符合条件的题目');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const selectedQuestions = useMemo(
    () => candidates.filter((question) => selected.includes(question.id)),
    [candidates, selected],
  );

  return (
    <Modal
      title="从题库抽题"
      open={open}
      width="min(960px, 96vw)"
      onCancel={onClose}
      onOk={() => {
        if (!selectedQuestions.length) {
          message.warning('请先勾选题目');
          return;
        }
        const scoreSum = selectedQuestions.reduce((sum, q) => sum + (q.attribute?.examScore ?? 0), 0);
        onPick(selectedQuestions);
        message.success('已抽取 ' + selectedQuestions.length + ' 题，共 ' + scoreSum + ' 分');
        onClose();
      }}
      okText={'导入 ' + selectedQuestions.length + ' 题'}
      cancelText="取消"
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Space wrap>
          <Select
            style={{ width: 220 }}
            placeholder="选择题库"
            value={repoId}
            onChange={setRepoId}
            options={repos.map((repo) => ({ label: repo.name || '未命名题库', value: repo.id }))}
          />
          <Input style={{ width: 140 }} placeholder="章节（可不填）" value={chapter} onChange={(e) => setChapter(e.target.value)} />
          <Input style={{ width: 120 }} placeholder="难度（可不填）" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
          <Input style={{ width: 150 }} placeholder="题干关键词" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
            <Radio.Button value="random">随机</Radio.Button>
            <Radio.Button value="sequential">顺序</Radio.Button>
          </Radio.Group>
          <Button type="primary" loading={loading} onClick={doPick}>
            抽题
          </Button>
        </Space>

        <Table
          size="small"
          pagination={false}
          rowKey="type"
          dataSource={availableTypes.map((type) => ({ type }))}
          locale={{ emptyText: repoId ? '该题库没有可用题型' : '先选择题库' }}
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
                  value={counts[row.type]}
                  onChange={(value) => setCounts({ ...counts, [row.type]: Number(value ?? 0) })}
                />
              ),
            },
            {
              title: '每题分值',
              render: (_: unknown, row: { type: ComposeType }) => (
                <InputNumber
                  min={0}
                  step={0.5}
                  value={scores[row.type]}
                  onChange={(value) => setScores({ ...scores, [row.type]: Number(value ?? 0) })}
                />
              ),
            },
          ]}
        />

        <Alert
          type="info"
          showIcon
          message={'本次抽取 ' + totalQuestions + ' 题，共 ' + totalScore + ' 分；已在试卷中的 ' + excludeIds.length + ' 题会自动排除'}
        />

        {candidates.length === 0 ? (
          <Empty description="配好题数与分值后点「抽题」" />
        ) : (
          <List
            size="small"
            style={{ maxHeight: 320, overflow: 'auto' }}
            dataSource={candidates}
            renderItem={(question) => (
              <List.Item>
                <Checkbox
                  checked={selected.includes(question.id)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked ? [...prev, question.id] : prev.filter((value) => value !== question.id),
                    )
                  }
                >
                  <Space wrap>
                    <Tag>{TYPE_LABELS[(question.type as ComposeType) ?? 'Radio'] ?? question.type}</Tag>
                    <span>{(question.title || '').replace(/<[^>]+>/g, '').slice(0, 70)}</span>
                    {question.chapter && <Tag>{question.chapter}</Tag>}
                    {question.difficulty && <Tag color="orange">{question.difficulty}</Tag>}
                    <span style={{ color: 'var(--bp-text-soft)' }}>{question.attribute?.examScore ?? '-'} 分</span>
                  </Space>
                </Checkbox>
              </List.Item>
            )}
          />
        )}
      </Space>
    </Modal>
  );
}
