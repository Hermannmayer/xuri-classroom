import { useEffect, useState } from 'react';
import { Checkbox, message, Modal, Segmented, Switch } from 'antd';
import { get, post } from '../../api';
import type {
  AnswerSetting,
  ExamSetting,
  ProjectSetting,
  SubmittedSetting,
} from '../../schema/project';

export interface BatchProject {
  id: string;
  name?: string;
  mode?: string;
  setting?: ProjectSetting;
}

type AnswerField = keyof Pick<
  AnswerSetting,
  'onePageOneQuestion' | 'progressBar' | 'answerSheetVisible' | 'autoSave'
>;
type SubmittedField = keyof Pick<
  SubmittedSetting,
  'enableUpdate' | 'transcriptVisible' | 'rankVisible' | 'answerAnalysis'
>;
type ExamField = keyof Pick<ExamSetting, 'rankingEnabled' | 'randomOrder'>;
type BoolField = AnswerField | SubmittedField | ExamField;

interface FieldDef<K extends string> {
  key: K;
  label: string;
}

const ANSWER_FIELDS: FieldDef<AnswerField>[] = [
  { key: 'onePageOneQuestion', label: '一页一题' },
  { key: 'progressBar', label: '显示进度条' },
  { key: 'answerSheetVisible', label: '显示答题卡' },
  { key: 'autoSave', label: '自动暂存' },
];

const SUBMITTED_FIELDS: FieldDef<SubmittedField>[] = [
  { key: 'enableUpdate', label: '允许修改答案' },
  { key: 'transcriptVisible', label: '显示成绩单' },
  { key: 'rankVisible', label: '显示排名' },
  { key: 'answerAnalysis', label: '显示答案解析' },
];

const EXAM_FIELDS: FieldDef<ExamField>[] = [
  { key: 'rankingEnabled', label: '显示排名（考试）' },
  { key: 'randomOrder', label: '随机题目顺序' },
];

const ALL_BOOL_FIELDS: BoolField[] = [
  ...ANSWER_FIELDS.map((f) => f.key),
  ...SUBMITTED_FIELDS.map((f) => f.key),
  ...EXAM_FIELDS.map((f) => f.key),
];

interface FlagState {
  enabled: boolean;
  value: boolean;
}

function initialFlags(): Record<BoolField, FlagState> {
  return Object.fromEntries(ALL_BOOL_FIELDS.map((key) => [key, { enabled: false, value: true }])) as Record<
    BoolField,
    FlagState
  >;
}

function ToggleRow({
  label,
  enabled,
  value,
  onEnabled,
  onValue,
}: {
  label: string;
  enabled: boolean;
  value: boolean;
  onEnabled: (checked: boolean) => void;
  onValue: (checked: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 0',
        borderBottom: '1px dashed var(--bp-line-soft)',
      }}
    >
      <Checkbox checked={enabled} onChange={(e) => onEnabled(e.target.checked)}>
        {label}
      </Checkbox>
      <div style={{ flex: 1 }} />
      <Switch
        checked={value}
        disabled={!enabled}
        checkedChildren="开"
        unCheckedChildren="关"
        onChange={onValue}
      />
    </div>
  );
}

interface BatchSettingModalProps {
  open: boolean;
  projects: BatchProject[];
  onCancel: () => void;
  onUpdated: () => void;
}

/** 批量设置：未勾选的字段保持原值，勾选后按设置值合并到每个项目 */
export default function BatchSettingModal({
  open,
  projects,
  onCancel,
  onUpdated,
}: BatchSettingModalProps) {
  const [statusEnabled, setStatusEnabled] = useState(false);
  const [statusValue, setStatusValue] = useState<number>(1);
  const [flags, setFlags] = useState<Record<BoolField, FlagState>>(initialFlags);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatusEnabled(false);
    setStatusValue(1);
    setFlags(initialFlags());
  }, [open]);

  const setFlagEnabled = (key: BoolField, enabled: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: { ...prev[key], enabled } }));
  };

  const setFlagValue = (key: BoolField, value: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: { ...prev[key], value } }));
  };

  const hasExam = projects.some((project) => project.mode === 'exam');
  const hasAny = statusEnabled || ALL_BOOL_FIELDS.some((key) => flags[key].enabled);

  const apply = async () => {
    if (!projects.length) {
      message.error('请选择要设置的项目');
      return;
    }
    if (!hasAny) {
      message.error('请至少勾选一项要修改的设置');
      return;
    }

    const answerPatch: Partial<AnswerSetting> = {};
    const submittedPatch: Partial<SubmittedSetting> = {};
    const examPatch: Partial<ExamSetting> = {};
    for (const field of ANSWER_FIELDS) {
      if (flags[field.key].enabled) answerPatch[field.key] = flags[field.key].value;
    }
    for (const field of SUBMITTED_FIELDS) {
      if (flags[field.key].enabled) submittedPatch[field.key] = flags[field.key].value;
    }
    for (const field of EXAM_FIELDS) {
      if (flags[field.key].enabled) examPatch[field.key] = flags[field.key].value;
    }

    setSaving(true);
    let updated = 0;
    try {
      for (const project of projects) {
        let setting: ProjectSetting = project.setting ?? {};
        try {
          // 后端当前 getSetting 可能返回 null，列表里的 setting 用来兜底
          const remote = await get<ProjectSetting | null>('/api/project/setting', { id: project.id });
          if (remote) setting = remote;
        } catch {
          // 拿不到就使用列表里已有的 setting，避免把未改字段清空
        }

        const next: ProjectSetting = {
          ...setting,
          ...(statusEnabled ? { status: statusValue } : {}),
          answerSetting: { ...(setting.answerSetting ?? {}), ...answerPatch },
          submittedSetting: { ...(setting.submittedSetting ?? {}), ...submittedPatch },
          examSetting:
            project.mode === 'exam'
              ? { ...(setting.examSetting ?? {}), ...examPatch }
              : setting.examSetting,
        };

        await post('/api/project/update', {
          id: project.id,
          setting: next,
          ...(statusEnabled ? { status: statusValue } : {}),
        });
        updated += 1;
      }
      message.success(`已更新 ${updated} 项`);
      onUpdated();
    } catch (e) {
      message.error((e as Error).message);
      if (updated > 0) onUpdated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`批量设置${projects.length ? `（已选中 ${projects.length} 项）` : ''}`}
      open={open}
      width="min(640px, 94vw)"
      onCancel={onCancel}
      onOk={apply}
      confirmLoading={saving}
      okText="应用"
      cancelText="取消"
      okButtonProps={{ disabled: !hasAny }}
      destroyOnClose
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 10 }}>
        只应用勾选的设置，未勾选的字段保持原值。
      </div>

      <div className="bp-card" style={{ padding: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 0',
            borderBottom: '1px dashed var(--bp-line-soft)',
          }}
        >
          <Checkbox checked={statusEnabled} onChange={(e) => setStatusEnabled(e.target.checked)}>
            发布状态
          </Checkbox>
          <div style={{ flex: 1 }} />
          <Segmented
            value={statusValue}
            disabled={!statusEnabled}
            onChange={(value) => setStatusValue(Number(value))}
            options={[
              { label: '发布', value: 1 },
              { label: '停止收集', value: 0 },
            ]}
          />
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', marginTop: 12 }}>
          ANSWER / 答题设置
        </div>
        {ANSWER_FIELDS.map((field) => (
          <ToggleRow
            key={field.key}
            label={field.label}
            enabled={flags[field.key].enabled}
            value={flags[field.key].value}
            onEnabled={(checked) => setFlagEnabled(field.key, checked)}
            onValue={(checked) => setFlagValue(field.key, checked)}
          />
        ))}

        <div style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', marginTop: 12 }}>
          SUBMITTED / 提交之后
        </div>
        {SUBMITTED_FIELDS.map((field) => (
          <ToggleRow
            key={field.key}
            label={field.label}
            enabled={flags[field.key].enabled}
            value={flags[field.key].value}
            onEnabled={(checked) => setFlagEnabled(field.key, checked)}
            onValue={(checked) => setFlagValue(field.key, checked)}
          />
        ))}

        {hasExam && (
          <>
            <div
              style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--bp-text-soft)', marginTop: 12 }}
            >
              EXAM / 考试设置
            </div>
            {EXAM_FIELDS.map((field) => (
              <ToggleRow
                key={field.key}
                label={field.label}
                enabled={flags[field.key].enabled}
                value={flags[field.key].value}
                onEnabled={(checked) => setFlagEnabled(field.key, checked)}
                onValue={(checked) => setFlagValue(field.key, checked)}
              />
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}
