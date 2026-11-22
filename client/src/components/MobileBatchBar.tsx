/** 手机端批量操作栏：底部固定，全选当前筛选结果 + 已选计数 + 动作 */
import { Button, Checkbox } from 'antd';
import type { ReactNode } from 'react';

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
  if (selected.length === 0) return null;
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));
  const partial = !allSelected && selected.length > 0;
  return (
    <>
      <div style={{ height: 96 }} />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          padding: '8px 12px',
          background: 'var(--bp-panel-strong)',
          borderTop: '1px solid var(--bp-line)',
        }}
      >
        <Checkbox
          checked={allSelected}
          indeterminate={partial}
          onChange={(e) => onChange(e.target.checked ? allIds : [])}
        >
          全选
        </Checkbox>
        <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
          已选 {selected.length} / 共 {allIds.length} {unit}
        </span>
        <div style={{ flex: 1 }} />
        {actions}
        <Button size="small" onClick={() => onChange([])}>
          取消
        </Button>
      </div>
    </>
  );
}
