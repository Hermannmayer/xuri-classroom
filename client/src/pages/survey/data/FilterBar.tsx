/** 数据页过滤条：班级 / 交卷时间 / 交卷状态 / 批改状态 / 分数段 / 姓名 / 匿名 */
import type { ReactNode } from 'react';
import { Button, DatePicker, Input, InputNumber, Segmented, Select } from 'antd';
import { ClearOutlined, SearchOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { ClassOption, FilterState, GradeStatus, SubmitStatus } from './filters';

const { RangePicker } = DatePicker;

export interface FilterBarProps {
  mobile: boolean;
  classOptions: ClassOption[];

  classId?: string;
  onClassChange: (classId?: string) => void;
  value: FilterState;

  onPatch: (patch: Partial<FilterState>) => void;

  nameValue: string;
  onNameChange: (value: string) => void;

  onReset: () => void;

  resetVisible: boolean;
}

const SUBMIT_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '已交', value: 'submitted' },
  { label: '未交', value: 'unsubmitted' },
];

const GRADE_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '待批改', value: 'pending' },
  { label: '已批改', value: 'graded' },
            { label: 'AI 待复核', value: 'ai' },
];

const ANON_OPTIONS = [
  { label: '含匿名', value: 'all' },
  { label: '仅实名', value: 'real' },
];

/** 带小标题的一段条件；手机上整段占一行，控件撑满剩余宽度 */
function Field({ label, children, mobile }: { label?: string; children: ReactNode; mobile: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, width: mobile ? '100%' : undefined }}>
      {label ? (
        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)', whiteSpace: 'nowrap' }}>{label}</span>
      ) : null}
      <div style={{ minWidth: 0, flex: mobile ? 1 : undefined }}>{children}</div>
    </div>
  );
}

export default function FilterBar({
  mobile,
  classOptions,
  classId,
  onClassChange,
  value,
  onPatch,
  nameValue,
  onNameChange,
  onReset,
  resetVisible,
}: FilterBarProps) {
  /** 输入框里的分数：清空要能回到 undefined（InputNumber 给的是 null） */
  const numberOrUndefined = (next: number | null) => (typeof next === 'number' ? next : undefined);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 12,
      }}
    >

      {classOptions.length > 0 && (
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="全部班级"
          value={classId}
          options={classOptions}
          onChange={(next?: string) => onClassChange(next || undefined)}
          style={{ width: mobile ? '100%' : 190 }}
        />
      )}

      <RangePicker
        allowClear
        value={value.range}
        placeholder={['开始日期', '结束日期']}
        style={{ width: mobile ? '100%' : 236 }}
        onChange={(dates) =>
          onPatch({ range: (dates ?? null) as [Dayjs | null, Dayjs | null] | null })
        }
      />

      <Field label="交卷" mobile={mobile}>
        <Segmented
          block={mobile}
          value={value.submitStatus}
          options={SUBMIT_OPTIONS}
          onChange={(next) => onPatch({ submitStatus: next as SubmitStatus })}
        />
      </Field>

      <Field label="批改" mobile={mobile}>
        <Segmented
          block={mobile}
          value={value.gradeStatus}
          options={GRADE_OPTIONS}
          onChange={(next) => onPatch({ gradeStatus: next as GradeStatus })}
        />
      </Field>

      <Field label="分数" mobile={mobile}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: mobile ? '100%' : undefined }}>
          <InputNumber
            min={0}
            placeholder="最低分"
            value={value.minScore ?? null}
            onChange={(next) => onPatch({ minScore: numberOrUndefined(next) })}
            style={{ width: mobile ? '100%' : 84, flex: mobile ? 1 : undefined }}
          />
          <span style={{ color: 'var(--bp-text-soft)', fontSize: 11 }}>~</span>
          <InputNumber
            min={0}
            placeholder="最高分"
            value={value.maxScore ?? null}
            onChange={(next) => onPatch({ maxScore: numberOrUndefined(next) })}
            style={{ width: mobile ? '100%' : 84, flex: mobile ? 1 : undefined }}
          />
        </div>
      </Field>

      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="姓名（模糊）"
        value={nameValue}
        onChange={(e) => onNameChange(e.target.value)}
        style={{ width: mobile ? '100%' : 150 }}
      />

      <Segmented
        block={mobile}
        value={value.includeAnonymous ? 'all' : 'real'}
        options={ANON_OPTIONS}
        onChange={(next) => onPatch({ includeAnonymous: next === 'all' })}
      />

      {resetVisible && (
        <Button type="link" size="small" icon={<ClearOutlined />} onClick={onReset} style={{ paddingInline: 4 }}>
          清空筛选
        </Button>
      )}
    </div>
  );
}
