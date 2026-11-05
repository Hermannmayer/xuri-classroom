/**
 * 手工补录 / 编辑一份答卷：直接复用答题态的 SchemaRenderer，
 * 保存时把 values 原样交给 /api/answer/create | update，格式与公开答题一致。
 */
import { useEffect, useState } from 'react';
import { Alert, Modal } from 'antd';
import SchemaRenderer from '../../../renderer/SchemaRenderer';
import type { AnswerValue } from '../../../renderer/types';
import type { SurveySchema } from '../../../schema/types';

export interface AnswerEditorProps {
  open: boolean;
  mode: 'create' | 'edit';
  /** 当前问卷结构；没加载到时给 null */
  survey?: SurveySchema;
  /** 编辑时回填的旧答案 */
  initial?: Record<string, unknown>;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, AnswerValue>) => void;
}

export default function AnswerEditorModal({
  open,
  mode,
  survey,
  initial,
  submitting,
  onCancel,
  onSubmit,
}: AnswerEditorProps) {
  const [values, setValues] = useState<Record<string, AnswerValue>>({});

  // 每次打开都从旧答案重新开始，避免上一份的残留串到下一份
  useEffect(() => {
    if (open) setValues((initial ?? {}) as Record<string, AnswerValue>);
  }, [open, initial]);

  return (
    <Modal
      open={open}
      title={mode === 'edit' ? '编辑答卷' : '添加数据'}
      width="min(760px, 94vw)"
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => onSubmit(values)}
      onCancel={onCancel}
      styles={{ body: { maxHeight: '64vh', overflowY: 'auto', paddingRight: 10 } }}
    >
      {survey ? (
        <SchemaRenderer
          schema={survey}
          values={values}
          onChange={(qId, value) => setValues((prev) => ({ ...prev, [qId]: value }))}
          mode="answer"
        />
      ) : (
        <Alert type="warning" showIcon message="问卷结构还没加载到，无法录入" />
      )}
    </Modal>
  );
}
