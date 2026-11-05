import { EmptyOptions } from './shared';

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
  onPick: (value: string) => void;
}

/**
 * 单选/多选/判断共用的整行选项卡片（蓝图风格：直角、白线、选中描橙）。
 * 三个题型只是在「怎么把点击转成答案」上不同，渲染逻辑收敛在这里。
 */
export default function OptionList({ options, picked, locked, mark, onPick }: OptionListProps) {
  if (options.length === 0) return <EmptyOptions />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((o, i) => {
        const active = picked.includes(o.value);
        return (
          <button
            type="button"
            key={o.value}
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
