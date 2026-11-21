import { useParams } from 'react-router-dom';
import RichTextEditor from '../../components/RichTextEditor';
import { QuestionFrame } from './shared';
import type { QuestionComponentProps } from '../types';

/** 富文本题：答题者可以输入带格式的文字/图片/公式，答案按 HTML 字符串存 */
export default function RichTextQuestion({ schema, value, onChange, mode, number }: QuestionComponentProps) {
  const { id: projectId = '' } = useParams<{ id: string }>();
  const html = typeof value === 'string' ? value : '';

  return (
    <QuestionFrame schema={schema} number={number}>
      {mode === 'answer' ? (
        <RichTextEditor
          value={html}
          onChange={(next) => onChange(next)}
          placeholder={schema.attribute?.placeholder || '请输入答案，可插入图片和公式'}
          minHeight={160}
          mode="answer"
          projectId={projectId}
          questionId={schema.id}
        />
      ) : (
        <div
          style={{
            minHeight: 92,
            padding: '14px 12px',
            border: '1px dashed var(--bp-line)',
            color: 'var(--bp-text-soft)',
            fontSize: 12,
          }}
        >
          富文本答题区域：答题时会显示编辑器，支持字号、颜色、对齐、列表、链接、代码块、公式和图片。
        </div>
      )}
    </QuestionFrame>
  );
}
