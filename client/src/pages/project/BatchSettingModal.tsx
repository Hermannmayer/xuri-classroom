import { useEffect, useState } from 'react';
import {
  AutoComplete,
  Checkbox,
  DatePicker,
  InputNumber,
  message,
  Modal,
  Segmented,
  Select,
  Switch,
  Tabs,
  TreeSelect,
} from 'antd';
import type { Dayjs } from 'dayjs';
import { get, post } from '../../api';
import type {
  AnswerFreqEnum,
  AnswerSetting,
  ExamSetting,
  ProjectSetting,
  SubmittedSetting,
  UniqueLimitSetting,
} from '../../schema/project';

export interface BatchProject {
  id: string;
  name?: string;
  mode?: string;
  setting?: ProjectSetting;
}

interface Dept {
  id: string;
  name?: string;
}

interface ProjectTreeNode {
  id: string;
  name?: string;
  mode?: string;
  children?: ProjectTreeNode[];
}

interface FolderOption {
  value: string;
  title: string;
  children?: FolderOption[];
}

/** /api/project/tree 同时返回文件夹和考试/问卷，这里只保留文件夹 */
function buildFolderOptions(nodes: ProjectTreeNode[]): FolderOption[] {
  return nodes
    .filter((node) => node.mode === 'folder')
    .map((node) => ({
      value: node.id,
      title: node.name || '(未命名文件夹)',
      children: node.children?.length ? buildFolderOptions(node.children) : undefined,
    }));
}

type AnswerBool =
  | 'onePageOneQuestion'
  | 'progressBar'
  | 'answerSheetVisible'
  | 'autoSave'
  | 'questionNumber'
  | 'copyEnabled'
  | 'loginRequired';
type SubmittedBool = 'enableUpdate' | 'transcriptVisible' | 'rankVisible' | 'answerAnalysis';
type ExamBool = 'rankingEnabled' | 'randomOrder' | 'exerciseMode' | 'randomSurveyWrong' | 'passMode';
type BoolField = AnswerBool | SubmittedBool | ExamBool;

interface FieldDef<K extends string> {
  key: K;
  label: string;
}

const ANSWER_FIELDS: FieldDef<AnswerBool>[] = [
  { key: 'onePageOneQuestion', label: '一页一题' },
  { key: 'progressBar', label: '显示进度条' },
  { key: 'answerSheetVisible', label: '显示答题卡' },
  { key: 'autoSave', label: '自动暂存' },
  { key: 'questionNumber', label: '显示题目序号' },
  { key: 'copyEnabled', label: '允许复制题目' },
];

const COLLECT_FIELDS: FieldDef<AnswerBool>[] = [{ key: 'loginRequired', label: '需要登录' }];

const SUBMITTED_FIELDS: FieldDef<SubmittedBool>[] = [
  { key: 'enableUpdate', label: '允许修改答案' },
  { key: 'transcriptVisible', label: '显示成绩单' },
  { key: 'rankVisible', label: '显示排名' },
  { key: 'answerAnalysis', label: '显示答案解析' },
];

const EXAM_FIELDS: FieldDef<ExamBool>[] = [
  { key: 'rankingEnabled', label: '显示排名（考试）' },
  { key: 'randomOrder', label: '随机题目顺序' },
  { key: 'exerciseMode', label: '练习模式' },
  { key: 'randomSurveyWrong', label: '错题练习' },
  { key: 'passMode', label: '闯关模式' },
];

const ALL_BOOL_FIELDS: BoolField[] = [
  ...ANSWER_FIELDS.map((f) => f.key),
  ...COLLECT_FIELDS.map((f) => f.key),
  ...SUBMITTED_FIELDS.map((f) => f.key),
  ...EXAM_FIELDS.map((f) => f.key),
];

interface FlagState {
  enabled: boolean;
  value: boolean;
}

interface ValueState<T> {
  enabled: boolean;
  value: T;
}

type Freq = 'only' | 'hour' | 'day' | 'week' | 'month';

interface LimitState {
  enabled: boolean;
  num: number | null;
  freq: Freq;
}

function initialFlags(): Record<BoolField, FlagState> {
  return Object.fromEntries(ALL_BOOL_FIELDS.map((key) => [key, { enabled: false, value: true }])) as Record<
    BoolField,
    FlagState
  >;
}

function valueState<T>(value: T): ValueState<T> {
  return { enabled: false, value };
}

function initialLimit(): LimitState {
  return { enabled: false, num: null, freq: 'day' };
}

const FREQ_OPTIONS: { value: Freq; label: string }[] = [
  { value: 'only', label: '仅一次' },
  { value: 'hour', label: '每小时' },
  { value: 'day', label: '每天' },
  { value: 'week', label: '每周' },
  { value: 'month', label: '每月' },
];

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

function NumberRow({
  label,
  state,
  onChange,
  min = 0,
  step = 1,
  placeholder,
}: {
  label: string;
  state: ValueState<number | null>;
  onChange: (next: ValueState<number | null>) => void;
  min?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px dashed var(--bp-line-soft)' }}>
      <Checkbox
        checked={state.enabled}
        onChange={(e) => onChange({ ...state, enabled: e.target.checked })}
      >
        {label}
      </Checkbox>
      <div style={{ flex: 1 }} />
      <InputNumber
        min={min}
        step={step}
        value={state.value ?? null}
        disabled={!state.enabled}
        placeholder={placeholder}
        style={{ width: 160 }}
        onChange={(value) => onChange({ ...state, value })}
      />
    </div>
  );
}

function DateRow({
  label,
  state,
  onChange,
}: {
  label: string;
  state: ValueState<Dayjs | null>;
  onChange: (next: ValueState<Dayjs | null>) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px dashed var(--bp-line-soft)' }}>
      <Checkbox
        checked={state.enabled}
        onChange={(e) => onChange({ ...state, enabled: e.target.checked })}
      >
        {label}
      </Checkbox>
      <div style={{ flex: 1 }} />
      <DatePicker
        showTime
        value={state.value}
        disabled={!state.enabled}
        style={{ width: 220 }}
        onChange={(value) => onChange({ ...state, value })}
      />
    </div>
  );
}

function LimitRow({
  label,
  state,
  onChange,
}: {
  label: string;
  state: LimitState;
  onChange: (next: LimitState) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px dashed var(--bp-line-soft)', flexWrap: 'wrap' }}>
      <Checkbox
        checked={state.enabled}
        onChange={(e) => onChange({ ...state, enabled: e.target.checked })}
      >
        {label}
      </Checkbox>
      <div style={{ flex: 1 }} />
      <InputNumber
        min={1}
        precision={0}
        value={state.num ?? null}
        disabled={!state.enabled}
        placeholder="限次数量"
        style={{ width: 110 }}
        onChange={(value) => onChange({ ...state, num: value })}
      />
      <Select
        value={state.freq}
        disabled={!state.enabled}
        options={FREQ_OPTIONS}
        style={{ width: 100 }}
        onChange={(value: Freq) => onChange({ ...state, freq: value })}
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
  const [tab, setTab] = useState('display');
  const [flags, setFlags] = useState<Record<BoolField, FlagState>>(initialFlags);
  const [statusEnabled, setStatusEnabled] = useState(false);
  const [statusValue, setStatusValue] = useState<number>(1);

  const [maxAnswers, setMaxAnswers] = useState<ValueState<number | null>>(valueState(null));
  const [answerEndTime, setAnswerEndTime] = useState<ValueState<Dayjs | null>>(valueState(null));
  const [ipLimit, setIpLimit] = useState<LimitState>(initialLimit);
  const [cookieLimit, setCookieLimit] = useState<LimitState>(initialLimit);

  const [examStartTime, setExamStartTime] = useState<ValueState<Dayjs | null>>(valueState(null));
  const [examEndTime, setExamEndTime] = useState<ValueState<Dayjs | null>>(valueState(null));
  const [minSubmitMinutes, setMinSubmitMinutes] = useState<ValueState<number | null>>(valueState(null));
  const [maxSubmitMinutes, setMaxSubmitMinutes] = useState<ValueState<number | null>>(valueState(null));
  const [maxSwitchScreenTimes, setMaxSwitchScreenTimes] = useState<ValueState<number | null>>(valueState(null));
  const [passModePerSeconds, setPassModePerSeconds] = useState<ValueState<number | null>>(valueState(null));

  const [depts, setDepts] = useState<Dept[]>([]);
  const [authDeptIds, setAuthDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  /** 批量改分类：勾选后对所有选中项目写入同一个分类（空=未分类） */
  const [categoryEnabled, setCategoryEnabled] = useState(false);
  const [categoryValue, setCategoryValue] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  /** 批量移动文件夹：勾选后把所有选中项目挂到同一文件夹（'0'=根目录） */
  const [folderEnabled, setFolderEnabled] = useState(false);
  const [folderValue, setFolderValue] = useState('0');
  const [folderOptions, setFolderOptions] = useState<FolderOption[]>([]);

  useEffect(() => {
    if (!open) return;
    setTab('display');
    setFlags(initialFlags());
    setStatusEnabled(false);
    setStatusValue(1);
    setMaxAnswers(valueState(null));
    setAnswerEndTime(valueState(null));
    setIpLimit(initialLimit());
    setCookieLimit(initialLimit());
    setExamStartTime(valueState(null));
    setExamEndTime(valueState(null));
    setMinSubmitMinutes(valueState(null));
    setMaxSubmitMinutes(valueState(null));
    setMaxSwitchScreenTimes(valueState(null));
    setPassModePerSeconds(valueState(null));
    setAuthDeptIds([]);
    setCategoryEnabled(false);
    setCategoryValue('');
    setFolderEnabled(false);
    setFolderValue('0');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    get<Dept[]>('/api/system/dept/list')
      .then((list) => setDepts(Array.isArray(list) ? list : []))
      .catch((e: Error) => message.error(e.message));
    // 分类候选：可自由输入，所以拿不到选项也不影响提交
    get<{ name?: string }[]>('/api/project/categories')
      .then((list) =>
        setCategoryOptions(
          (Array.isArray(list) ? list : [])
            .map((item) => (item.name || '').trim())
            .filter((name) => name && name !== '__UNCATEGORIZED__' && name !== '未分类'),
        ),
      )
      .catch(() => setCategoryOptions([]));
    // 文件夹候选：失败不影响其它批量设置
    get<ProjectTreeNode[]>('/api/project/tree')
      .then((list) => setFolderOptions(buildFolderOptions(Array.isArray(list) ? list : [])))
      .catch(() => setFolderOptions([]));
  }, [open]);

  const setFlagEnabled = (key: BoolField, enabled: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: { ...prev[key], enabled } }));
  };

  const setFlagValue = (key: BoolField, value: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: { ...prev[key], value } }));
  };

  const hasExam = projects.some((project) => project.mode === 'exam');
  const hasValueFields =
    maxAnswers.enabled ||
    answerEndTime.enabled ||
    ipLimit.enabled ||
    cookieLimit.enabled ||
    examStartTime.enabled ||
    examEndTime.enabled ||
    minSubmitMinutes.enabled ||
    maxSubmitMinutes.enabled ||
    maxSwitchScreenTimes.enabled ||
    passModePerSeconds.enabled;
  const hasAny =
    statusEnabled ||
    hasValueFields ||
    categoryEnabled ||
    folderEnabled ||
    authDeptIds.length > 0 ||
    ALL_BOOL_FIELDS.some((key) => flags[key].enabled);
  const hasSettingChanges =
    statusEnabled || hasValueFields || ALL_BOOL_FIELDS.some((key) => flags[key].enabled);

  const apply = async () => {
    if (!projects.length) {
      message.error('请选择要设置的项目');
      return;
    }
    if (!hasAny) {
      message.error('请至少勾选一项要修改的设置');
      return;
    }
    if (ipLimit.enabled && (!ipLimit.num || ipLimit.num <= 0)) {
      message.error('请填写每 IP 限次数量');
      return;
    }
    if (cookieLimit.enabled && (!cookieLimit.num || cookieLimit.num <= 0)) {
      message.error('请填写每设备限次数量');
      return;
    }

    const answerPatch: Partial<AnswerSetting> = {};
    for (const field of [...ANSWER_FIELDS, ...COLLECT_FIELDS]) {
      if (flags[field.key].enabled) answerPatch[field.key] = flags[field.key].value;
    }
    if (maxAnswers.enabled) answerPatch.maxAnswers = maxAnswers.value ?? undefined;
    if (answerEndTime.enabled) answerPatch.endTime = answerEndTime.value?.valueOf();
    if (ipLimit.enabled) {
      answerPatch.ipLimit = {
        limitNum: ipLimit.num ?? undefined,
        limitFreq: ipLimit.freq as AnswerFreqEnum,
      } satisfies UniqueLimitSetting;
    }
    if (cookieLimit.enabled) {
      answerPatch.cookieLimit = {
        limitNum: cookieLimit.num ?? undefined,
        limitFreq: cookieLimit.freq as AnswerFreqEnum,
      } satisfies UniqueLimitSetting;
    }

    const submittedPatch: Partial<SubmittedSetting> = {};
    for (const field of SUBMITTED_FIELDS) {
      if (flags[field.key].enabled) submittedPatch[field.key] = flags[field.key].value;
    }

    const examPatch: Partial<ExamSetting> = {};
    for (const field of EXAM_FIELDS) {
      if (flags[field.key].enabled) examPatch[field.key] = flags[field.key].value;
    }
    if (examStartTime.enabled) examPatch.startTime = examStartTime.value?.valueOf();
    if (examEndTime.enabled) examPatch.endTime = examEndTime.value?.valueOf();
    if (minSubmitMinutes.enabled) examPatch.minSubmitMinutes = minSubmitMinutes.value ?? undefined;
    if (maxSubmitMinutes.enabled) examPatch.maxSubmitMinutes = maxSubmitMinutes.value ?? undefined;
    if (maxSwitchScreenTimes.enabled) examPatch.maxSwitchScreenTimes = maxSwitchScreenTimes.value ?? undefined;
    if (passModePerSeconds.enabled) examPatch.passModePerSeconds = passModePerSeconds.value ?? undefined;

    setSaving(true);
    // 按「项目」去重计数：同一项目既改 setting 又改 category 时只算一次
    const updatedIds = new Set<string>();
    let authDone = 0;
    try {
      if (hasSettingChanges) {
        for (const project of projects) {
          let setting: ProjectSetting = project.setting ?? {};
          try {
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
          updatedIds.add(project.id);
        }
      }

      // 文件夹更新放在 setting 之后、分类之前；空值/根目录统一传 '0'
      if (folderEnabled) {
        const nextParentId = (folderValue || '0').trim() || '0';
        for (const project of projects) {
          await post('/api/project/update', { id: project.id, parentId: nextParentId });
          updatedIds.add(project.id);
        }
      }

      // 分类更新放在文件夹之后、授权之前；空串=未分类
      if (categoryEnabled) {
        const nextCategory = categoryValue.trim();
        for (const project of projects) {
          await post('/api/project/update', { id: project.id, category: nextCategory });
          updatedIds.add(project.id);
        }
      }

      if (authDeptIds.length > 0) {
        for (const project of projects) {
          for (const groupId of authDeptIds) {
            await post('/api/project/partner/create', {
              projectId: project.id,
              type: 3,
              groupId,
            });
            authDone += 1;
          }
        }
      }

      const parts: string[] = [];
      if (authDeptIds.length > 0) {
        parts.push(`已更新 ${updatedIds.size} 项`);
        parts.push(`${authDeptIds.length} 个班级授权`);
      } else {
        parts.push(`已更新 ${updatedIds.size} 项`);
      }
      message.success(parts.join('，'));
      onUpdated();
    } catch (e) {
      message.error((e as Error).message);
      if (updatedIds.size > 0 || authDone > 0) onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const displayTab = (
    <div>
      <div className="bp-dim" style={{ fontSize: 11, marginBottom: 4 }}>
        勾选后才会修改；未勾选保持原值。
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
    </div>
  );

  const examTab = (
    <div>
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
      <DateRow label="考试开始时间" state={examStartTime} onChange={setExamStartTime} />
      <DateRow label="考试结束时间" state={examEndTime} onChange={setExamEndTime} />
      <NumberRow
        label="最短交卷（分钟）"
        state={minSubmitMinutes}
        onChange={setMinSubmitMinutes}
        placeholder="不限"
      />
      <NumberRow
        label="最长交卷（分钟）"
        state={maxSubmitMinutes}
        onChange={setMaxSubmitMinutes}
        placeholder="不限"
      />
      <NumberRow
        label="最大切屏次数"
        state={maxSwitchScreenTimes}
        onChange={setMaxSwitchScreenTimes}
        placeholder="不限"
      />
      <NumberRow
        label="闯关限时（秒）"
        state={passModePerSeconds}
        onChange={setPassModePerSeconds}
        placeholder="不限"
      />
    </div>
  );

  const collectTab = (
    <div>
      {COLLECT_FIELDS.map((field) => (
        <ToggleRow
          key={field.key}
          label={field.label}
          enabled={flags[field.key].enabled}
          value={flags[field.key].value}
          onEnabled={(checked) => setFlagEnabled(field.key, checked)}
          onValue={(checked) => setFlagValue(field.key, checked)}
        />
      ))}
      <NumberRow
        label="回收上限"
        state={maxAnswers}
        onChange={setMaxAnswers}
        min={1}
        placeholder="不限"
      />
      <DateRow label="回收截止时间" state={answerEndTime} onChange={setAnswerEndTime} />
      <LimitRow label="每 IP 限次" state={ipLimit} onChange={setIpLimit} />
      <LimitRow label="每设备限次" state={cookieLimit} onChange={setCookieLimit} />
    </div>
  );

  const publishTab = (
    <div>
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
    </div>
  );

  const authTab = (
    <div>
      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 10, lineHeight: 1.7 }}>
        追加授权：只会在现有授权上增加，不会撤销已有授权。授权后该班学员可在「我的考试」看到这些项目。
      </div>
      <Select
        mode="multiple"
        allowClear
        showSearch
        optionFilterProp="label"
        value={authDeptIds}
        onChange={setAuthDeptIds}
        placeholder="选择要授权的班级/用户组"
        style={{ width: '100%' }}
        options={depts.map((dept) => ({ value: dept.id, label: dept.name || dept.id }))}
      />
      <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 8 }}>
        已选 {authDeptIds.length} 个班级 · 未选择则不执行授权
      </div>
    </div>
  );

  const tabItems = [
    { key: 'display', label: '答题显示', children: displayTab },
    ...(hasExam ? [{ key: 'exam', label: '考试控制', children: examTab }] : []),
    { key: 'collect', label: '回收限制', children: collectTab },
    { key: 'publish', label: '提交与分享', children: publishTab },
    { key: 'auth', label: '授权给班级', children: authTab },
  ];

  return (
    <Modal
      title={`批量设置${projects.length ? `（已选中 ${projects.length} 项）` : ''}`}
      open={open}
      width="min(760px, 94vw)"
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

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 0',
          borderBottom: '1px dashed var(--bp-line-soft)',
          flexWrap: 'wrap',
        }}
      >
        <Checkbox checked={categoryEnabled} onChange={(e) => setCategoryEnabled(e.target.checked)}>
          分类
        </Checkbox>
        <div style={{ flex: 1 }} />
        <AutoComplete
          value={categoryValue}
          disabled={!categoryEnabled}
          allowClear
          options={categoryOptions.map((name) => ({ value: name }))}
          onChange={(value) => setCategoryValue(value)}
          placeholder="留空=未分类，可自由输入"
          style={{ width: 260, maxWidth: '100%' }}
        />
      </div>
      <div className="bp-dim" style={{ fontSize: 11, margin: '6px 0 10px' }}>
        只改分类，不影响其他设置。
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 0',
          borderBottom: '1px dashed var(--bp-line-soft)',
          flexWrap: 'wrap',
        }}
      >
        <Checkbox checked={folderEnabled} onChange={(e) => setFolderEnabled(e.target.checked)}>
          文件夹
        </Checkbox>
        <div style={{ flex: 1 }} />
        <TreeSelect
          value={folderValue}
          disabled={!folderEnabled}
          treeData={[{ value: '0', title: '根目录', children: folderOptions }]}
          onChange={(value) => setFolderValue(value || '0')}
          placeholder="根目录"
          showSearch
          treeNodeFilterProp="title"
          treeDefaultExpandAll
          allowClear
          style={{ width: 260, maxWidth: '100%' }}
        />
      </div>
      <div className="bp-dim" style={{ fontSize: 11, margin: '6px 0 10px' }}>
        只移动所属文件夹；不选或选「根目录」表示移到最外层，不影响其他设置。
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={tabItems} />
    </Modal>
  );
}
