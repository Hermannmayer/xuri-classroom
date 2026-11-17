import { EmptyOptions, useQuestionA11y } from './shared';

export interface OptionItem {
  value: string;
  label: string;
}

interface OptionListProps {
  options: OptionItem[];
  picked: string[];
  locked: boolean;
  /** 左侧标记：默认 A/B/C，判断题传 √/× */
  mark?: (index: number) => string;
  /**
   * 选项的 ARIA 角色：单选 / 判断传 radio，多选传 checkbox。
   * 不传时用题干上下文里的题型默认值，再兜底 radio —— 老调用方不用改就能用。
   */
  optionRole?: 'radio' | 'checkbox';
  onPick: (value: string) => void;
}

/**
 * 单选/多选/判断共用的整行选项卡片（蓝图风格：直角、白线、选中描橙）。
 * 三个题型只是在「怎么把点击转成答案」上不同，渲染逻辑收敛在这里。
 *
 * 无障碍：外层是 radiogroup（多选为 group），选项是 radio / checkbox 并带 aria-checked，
 * 读屏才会念「单选按钮，已选中」而不是「按钮」；组名指向题干 id。
 */
export default function OptionList({ options, picked, locked, mark, optionRole, onPick }: OptionListProps) {
  const a11y = useQuestionA11y();
  const role = optionRole ?? a11y?.optionRole ?? 'radio';
  if (options.length === 0) return <EmptyOptions />;
  return (
    <div
      role={role === 'checkbox' ? 'group' : 'radiogroup'}
      aria-labelledby={a11y?.labelId}
      aria-describedby={a11y?.descId}
      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      {options.map((o, i) => {
        const active = picked.includes(o.value);
        return (
          <button
            type="button"
            key={o.value}
            role={role}
            aria-checked={active}
            className={`sk-option${active ? ' selected' : ''}`}
            disabled={locked}
            onClick={() => onPick(o.value)}
          >
            <span className="sk-option-key">{mark ? mark(i) : String.fromCharCode(65 + i)}</span>
            <span className="sk-option-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
