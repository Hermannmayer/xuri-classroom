/**
 * 数据页过滤条：班级 / 交卷时间 / 交卷状态 / 批改状态 / 分数段 / 姓名 / 匿名。
 *
 * <p>纯受控组件：状态都由 Data.tsx 持有（classId 还得跟 URL 同步），这里只负责把条件摆成一行
 * 并发回补丁。手机上每个条件各占一行——390px 下把六个控件挤一排，点哪个都点不准。
 */
import type { ReactNode } from 'react';
import { Button, DatePicker, Input, InputNumber, Segmented, Select } from 'antd';
import { ClearOutlined, SearchOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { ClassOption, FilterState, GradeStatus, SubmitStatus } from './filters';

const { RangePicker } = DatePicker;

export interface FilterBarProps {
  mobile: boolean;
  classOptions: ClassOption[];
  /** 当前班级（URL 里的 ?classId=）；空 = 整份试卷 */
  classId?: string;
  onClassChange: (classId?: string) => void;
  value: FilterState;
  /** 只带变化的字段，页面用一次 setState 合并 */
  onPatch: (patch: Partial<FilterState>) => void;
  /** 姓名关键字：即时输入、防抖后才下推，所以单独受控 */
  nameValue: string;
  onNameChange: (value: string) => void;
  /** 全部恢复默认（含清掉 URL 上的 classId） */
  onReset: () => void;
  /** 有没有非默认条件：没有就不渲染「清空筛选」，免得页面多个没用的按钮 */
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
      {/* 没有班级可选的账号（缺 class:list / 一个班都没有）不渲染这一项，别给一个点不开的空下拉 */}
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
