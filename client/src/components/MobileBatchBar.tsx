/** 手机端批量操作栏：底部固定，全选当前筛选结果 + 已选计数 + 动作 */
import { Button, Checkbox } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useEffect, type ReactNode } from 'react';

export interface MobileBatchBarProps {
  allIds: string[];
  selected: string[];
  onChange: (ids: string[]) => void;
  unit?: string;
  actions?: ReactNode;
}

export default function MobileBatchBar({
  allIds,
  selected,
  onChange,
  unit = '条',
  actions,
}: MobileBatchBarProps) {
  const visible = selected.length > 0;
  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.style.setProperty('--sk-batch-bar-offset', '112px');
    else root.style.removeProperty('--sk-batch-bar-offset');
    return () => {
      root.style.removeProperty('--sk-batch-bar-offset');
    };
  }, [visible]);

  if (!visible) return null;
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));

  return (
    <>
      <div style={{ height: 120 }} />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          zIndex: 900,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '10px 12px',
          background: 'var(--bp-panel)',
          borderTop: '1px solid var(--bp-line)',
          boxShadow: '0 -6px 18px rgba(0, 0, 0, 0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && selected.length > 0}
            onChange={(e) => onChange(e.target.checked ? allIds : [])}
          >
            全选
          </Checkbox>
          <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
            已选 {selected.length} / {allIds.length} {unit}
          </span>
          <div style={{ flex: 1 }} />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            aria-label="取消选择"
            title="取消选择"
            onClick={() => onChange([])}
          />
        </div>
        {actions ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{actions}</div> : null}
      </div>
    </>
  );
}
