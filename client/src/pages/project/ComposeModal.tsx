import { useEffect, useMemo, useState } from 'react';
import { Input, InputNumber, message, Modal, Select } from 'antd';
import { createProject, deleteProject, getWithPagination, post, updateProject } from '../../api';
import type { SurveySchema } from '../../schema/types';

interface RepoView {
  id: string;
  name?: string;
  total?: number;
  category?: string;
}

type ComposeType = 'Radio' | 'Checkbox' | 'Judge' | 'FillBlank' | 'Textarea';
type ConfigKey = 'count' | 'score';

interface TypeConfig {
  count?: number | null;
  score?: number | null;
}

interface ComposeModalProps {
  open: boolean;
  initialName?: string;
  onCancel: () => void;
  onCreated: (id: string) => void;
}

const COMPOSE_TYPES: ComposeType[] = ['Radio', 'Checkbox', 'Judge', 'FillBlank', 'Textarea'];

const TYPE_LABEL: Record<ComposeType, string> = {
  Radio: '单选',
  Checkbox: '多选',
  Judge: '判断',
  FillBlank: '填空',
  Textarea: '简答',
};

/** 新建考试时给后端的初始 ProjectSetting，与 project/List 保持一致 */
const DEFAULT_SETTING = {
  status: 0,
  answerSetting: { progressBar: true, autoSave: true },
  submittedSetting: {},
};

function rootId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `survey_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** 从题库组卷：选多个题库、每题型配题数/分值，生成一份考试 */
export default function ComposeModal({ open, initialName, onCancel, onCreated }: ComposeModalProps) {
  const [name, setName] = useState('');
  const [repos, setRepos] = useState<RepoView[]>([]);
  const [repoLoading, setRepoLoading] = useState(false);
  const [selectedRepoIds, setSelectedRepoIds] = useState<string[]>([]);
  const [configs, setConfigs] = useState<
    Record<string, Partial<Record<ComposeType, TypeConfig>>>
  >({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialName?.trim() || '');
    setSelectedRepoIds([]);
    setConfigs({});
  }, [open, initialName]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setRepoLoading(true);
    getWithPagination<RepoView>('/api/repo/list', { current: 1, pageSize: 200 })
      .then((res) => {
        if (alive) setRepos(res.data);
      })
      .catch((e: Error) => {
        if (alive) message.error(e.message);
      })
      .finally(() => {
        if (alive) setRepoLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  const updateConfig = (repoId: string, type: ComposeType, key: ConfigKey, value: number | null) => {
    setConfigs((prev) => ({
      ...prev,
      [repoId]: {
        ...(prev[repoId] ?? {}),
        [type]: { ...(prev[repoId]?.[type] ?? {}), [key]: value },
      },
    }));
  };

  const totals = useMemo(() => {
    let questions = 0;
    let score = 0;
    for (const repoId of selectedRepoIds) {
      for (const type of COMPOSE_TYPES) {
        const config = configs[repoId]?.[type];
        const count = Number(config?.count ?? 0);
        if (!Number.isFinite(count) || count <= 0) continue;
        questions += count;
        score += count * Number(config?.score ?? 0);
      }
    }
    return { questions, score };
  }, [selectedRepoIds, configs]);

  const generate = async () => {
    const title = name.trim();
    if (!title) {
      message.error('请填写考试名称');
      return;
    }
    if (!selectedRepoIds.length) {
      message.error('请至少选择一个题库');
      return;
    }

    const conditions: {
      repoId: string;
      types: ComposeType[];
      questionsNum: number;
      examScore: number;
    }[] = [];
    for (const repoId of selectedRepoIds) {
      for (const type of COMPOSE_TYPES) {
        const config = configs[repoId]?.[type];
        const count = Number(config?.count ?? 0);
        if (!Number.isFinite(count) || count <= 0) continue;
        const score = Number(config?.score ?? 0);
        if (!Number.isFinite(score) || score <= 0) {
          message.error(`请填写「${TYPE_LABEL[type]}」的每题分值`);
          return;
        }
        conditions.push({ repoId, types: [type], questionsNum: count, examScore: score });
      }
    }
    if (!conditions.length) {
      message.error('请至少配置一种题型和题数');
      return;
    }

    setGenerating(true);
    let projectId: string | undefined;
    try {
      const created = await createProject({ name: title, mode: 'exam', setting: DEFAULT_SETTING });
      projectId = created.id;

      const picked = await post<SurveySchema[]>('/api/repo/pick', conditions);
      if (!picked?.length) {
        await deleteProject(projectId).catch(() => undefined);
        projectId = undefined;
        message.error('没有抽到题目，请检查题库题量或题型配置');
        return;
      }

      const survey: SurveySchema = {
        id: rootId(),
        title,
        type: 'Survey',
        attribute: {},
        children: picked,
      };
      await updateProject({ id: projectId, survey });

      const actualScore = picked.reduce((sum, question) => sum + (question.attribute?.examScore ?? 0), 0);
      message.success(`已生成 ${picked.length} 道题，总分 ${actualScore}`);
      onCreated(projectId);
    } catch (e) {
      if (projectId) {
        await deleteProject(projectId).catch(() => undefined);
      }
      message.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const repoOptions = repos.map((repo) => ({
    value: repo.id,
    label: `${repo.name || '(未命名题库)'}（${repo.total ?? 0} 题）`,
  }));

  return (
    <Modal
      title="从题库组卷"
      open={open}
      width="min(760px, 94vw)"
      onCancel={onCancel}
      onOk={generate}
      confirmLoading={generating}
      okText="生成试卷"
      cancelText="取消"
      destroyOnClose
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>考试名称</div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：育婴员三级模拟考试"
            maxLength={120}
          />
        </div>

        <div>
          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>题库</div>
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={repoLoading}
            value={selectedRepoIds}
            onChange={(value) => setSelectedRepoIds(value)}
            options={repoOptions}
            placeholder="选择一个或多个题库"
            style={{ width: '100%' }}
          />
        </div>

        {selectedRepoIds.length === 0 ? (
          <div style={{ fontSize: 12, color: 'rgba(160,196,232,0.65)', padding: '8px 0' }}>
            选择题库后，为每个题库配置题型、题数和每题分值；题数为 0 或空的题型不会提交。
          </div>
        ) : (
          selectedRepoIds.map((repoId) => {
            const repo = repos.find((item) => item.id === repoId);
            return (
              <div key={repoId} className="bp-card" style={{ padding: 12 }}>
                <div style={{ fontSize: 13, marginBottom: 8 }}>{repo?.name || repoId}</div>
                {COMPOSE_TYPES.map((type) => {
                  const config = configs[repoId]?.[type];
                  const count = Number(config?.count ?? 0);
                  const score = Number(config?.score ?? 0);
                  const subtotal = count > 0 ? count * score : 0;
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ width: 48, fontSize: 12, color: 'var(--bp-text-soft)' }}>
                        {TYPE_LABEL[type]}
                      </span>
                      <InputNumber
                        min={0}
                        precision={0}
                        value={config?.count ?? null}
                        placeholder="题数"
                        style={{ flex: 1, minWidth: 0 }}
                        onChange={(value) => updateConfig(repoId, type, 'count', value)}
                      />
                      <InputNumber
                        min={0}
                        step={0.5}
                        value={config?.score ?? null}
                        placeholder="每题分值"
                        style={{ flex: 1, minWidth: 0 }}
                        onChange={(value) => updateConfig(repoId, type, 'score', value)}
                      />
                      <span
                        style={{
                          width: 64,
                          textAlign: 'right',
                          fontSize: 11,
                          color: subtotal > 0 ? 'var(--bp-orange)' : 'var(--bp-text-soft)',
                        }}
                      >
                        {subtotal} 分
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 18,
            paddingTop: 8,
            borderTop: '1px dashed var(--bp-line)',
            fontSize: 13,
          }}
        >
          <span>
            总题数 <b style={{ color: 'var(--bp-orange)' }}>{totals.questions}</b>
          </span>
          <span>
            总分 <b style={{ color: 'var(--bp-orange)' }}>{totals.score}</b>
          </span>
        </div>
      </div>
    </Modal>
  );
}
