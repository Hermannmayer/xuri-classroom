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
  Select,
  Space,
  Tag,
} from 'antd';
import { getWithPagination } from '../../api';
import { COMPOSE_TYPES, TYPE_LABELS, pickFromRepo, type ComposeType } from '../../api/compose';
import type { SurveySchema } from '../../schema/types';

interface RepoView {
  id: string;
  name?: string;
  total?: number;
}

interface Props {
  open: boolean;
  excludeIds: string[];
  onClose: () => void;
  onPick: (questions: SurveySchema[]) => void;
}

/** 从题库添加：按范围随机抽一批，勾选后插入当前试卷 */
export default function BankPickModal({ open, excludeIds, onClose, onPick }: Props) {
  const [repos, setRepos] = useState<RepoView[]>([]);
  const [repoId, setRepoId] = useState<string>();
  const [types, setTypes] = useState<ComposeType[]>([...COMPOSE_TYPES]);
  const [chapter, setChapter] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [keyword, setKeyword] = useState('');
  const [count, setCount] = useState(10);
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
    if (!open) {
      setCandidates([]);
      setSelected([]);
    }
  }, [open]);

  const doPick = async () => {
    if (!repoId) {
      message.warning('请先选择题库');
      return;
    }
    setLoading(true);
    try {
      const questions = await pickFromRepo({
        repoIds: [repoId],
        types,
        chapters: chapter.trim() ? [chapter.trim()] : [],
        difficulties: difficulty.trim() ? [difficulty.trim()] : [],
        keyword: keyword.trim() || undefined,
        count,
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
      title="从题库添加"
      open={open}
      width="min(900px, 94vw)"
      onCancel={onClose}
      onOk={() => {
        if (!selectedQuestions.length) {
          message.warning('请先勾选题目');
          return;
        }
        onPick(selectedQuestions);
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
          <Select
            mode="multiple"
            style={{ minWidth: 220 }}
            value={types}
            onChange={(values) => setTypes(values as ComposeType[])}
            options={COMPOSE_TYPES.map((type) => ({ label: TYPE_LABELS[type], value: type }))}
          />
          <Input style={{ width: 140 }} placeholder="章节（可不填）" value={chapter} onChange={(e) => setChapter(e.target.value)} />
          <Input style={{ width: 120 }} placeholder="难度（可不填）" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
          <Input style={{ width: 160 }} placeholder="题干关键词" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <InputNumber min={1} max={100} value={count} onChange={(value) => setCount(Number(value ?? 10))} />
          <Button type="primary" loading={loading} onClick={doPick}>
            抽题
          </Button>
        </Space>

        <Alert
          type="info"
          showIcon
          message={'已在试卷中的题会自动排除（' + excludeIds.length + ' 题）'}
        />

        {candidates.length === 0 ? (
          <Empty description="点「抽题」按条件随机抽一批" />
        ) : (
          <List
            size="small"
            style={{ maxHeight: 380, overflow: 'auto' }}
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
                    <span>{(question.title || '').replace(/<[^>]+>/g, '').slice(0, 80)}</span>
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
