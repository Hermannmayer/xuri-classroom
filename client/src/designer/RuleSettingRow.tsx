/** 规则配置行：一行摘要 + 「点击设置」弹窗，确认后才写回 attribute。 */
import type { ReactNode } from 'react';
import { Button, Modal } from 'antd';

export interface RuleSettingRowProps {
  title: string;
  summary: string;
  modalTitle: string;
  open: boolean;
  disabled?: boolean;
  last?: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  children: ReactNode;
}

/** 行内不持有草稿，弹窗开关与确认由调用方管理，取消即丢弃草稿 */
export default function RuleSettingRow({
  title,
  summary,
  modalTitle,
  open,
  disabled = false,
  last = false,
  onOpen,
  onCancel,
  onConfirm,
  children,
}: RuleSettingRowProps) {
  return (
    <>
      <div className="bp-rule-row" style={last ? { borderBottom: 'none' } : undefined}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bp-rule-row-title">{title}</div>
          <div className="bp-rule-row-summary" title={summary}>
            {summary}
          </div>
        </div>
        {!disabled && (
          <Button type="text" size="small" className="bp-rule-row-action" onClick={onOpen}>
            点击设置
          </Button>
        )}
      </div>
      <Modal
        className="bp-rule-modal"
        title={modalTitle}
        open={open}
        width={640}
        destroyOnHidden
        okText="确定"
        cancelText="取消"
        onCancel={onCancel}
        onOk={onConfirm}
      >
        <div className="bp-rule-modal-body">{children}</div>
      </Modal>
    </>
  );
}
