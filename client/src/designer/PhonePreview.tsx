import SchemaRenderer from '../renderer/SchemaRenderer';
import type { AnswerValue } from '../renderer/types';
import type { SurveySchema } from '../schema/types';

/** iPhone 8 的逻辑分辨率 */
export const DEVICE_W = 375;
export const DEVICE_H = 667;

/**
 * 手机比例预览：内容是真实 DOM（同一套渲染器），用 transform 缩放，
 * 所以排版、换行、间距和真机一致，只是像素被等比压小。
 */
export default function PhonePreview({
  schema,
  values,
  onChange,
  displays,
  width = 308,
  height = 440,
}: {
  schema: SurveySchema;
  values: Record<string, AnswerValue>;
  onChange: (qId: string, value: AnswerValue) => void;
  /** 规则求值结果：false 的题不渲染 */
  displays?: Record<string, boolean>;
  width?: number;
  height?: number;
}) {
  const scale = width / DEVICE_W;
  const innerHeight = Math.round(height / scale);

  return (
    <div className="bp-phone" style={{ width: width + 12 }}>
      <div style={{ width, height, overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            width: DEVICE_W,
            height: innerHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            overflow: 'auto',
          }}
        >
          <div style={{ padding: 16 }}>
            <SchemaRenderer schema={schema} values={values} onChange={onChange} mode="preview" displays={displays} />
          </div>
        </div>
      </div>
    </div>
  );
}
