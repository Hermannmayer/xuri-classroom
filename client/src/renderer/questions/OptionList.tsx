import { useState } from 'react';
import { Image } from 'antd';
import RichTextContent from '../../components/RichTextContent';
import { EmptyOptions, useQuestionA11y } from './shared';

const BLANK_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

export interface OptionItem {
  value: string;
  label: string;
  rich?: boolean;
}

interface OptionListProps {
  options: OptionItem[];
  picked: string[];
  locked: boolean;

  mark?: (index: number) => string;




  optionRole?: 'radio' | 'checkbox';
  onPick: (value: string) => void;
}

/** 单选/多选/判断共用的整行选项卡片（蓝图风格：直角、白线、选中描橙） */
export default function OptionList({ options, picked, locked, mark, optionRole, onPick }: OptionListProps) {
  const a11y = useQuestionA11y();
  const [previewSrc, setPreviewSrc] = useState<string>();
  const role = optionRole ?? a11y?.optionRole ?? 'radio';
  if (options.length === 0) return <EmptyOptions />;
  return (
    <>
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
            {o.rich ? (
              <RichTextContent
                inline
                zoomable={false}
                onImageClick={setPreviewSrc}
                className="sk-option-label sk-option-rich"
                html={o.label}
              />
            ) : (
              <span className="sk-option-label">{o.label}</span>
            )}
          </button>
        );
      })}
      </div>
      <Image
        src={previewSrc ?? BLANK_IMAGE}
        alt=""
        style={{ display: 'none' }}
        preview={{
          visible: Boolean(previewSrc),
          onVisibleChange: (visible) => {
            if (!visible) setPreviewSrc(undefined);
          },
        }}
      />
    </>
  );
}
