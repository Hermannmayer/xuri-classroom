/** 界面缩放档位控件 */
import { ZOOM_PRESETS, snapZoom } from '../utils/uiZoom';

export { ZOOM_PRESETS, ZOOM_MIN, ZOOM_MAX, snapZoom } from '../utils/uiZoom';

export interface ZoomControlProps {
  value: number;
  onChange: (value: number) => void;

  hideLabel?: boolean;

  label?: string;
}

/** 档位平铺的缩放控件：4 档直接可见，点哪个高亮哪个 */
export default function ZoomControl({ value, onChange, hideLabel, label = '界面缩放' }: ZoomControlProps) {
  const active = snapZoom(value);
  return (
    <div className="sk-zoom" role="group" aria-label={label}>
      {!hideLabel && <span className="sk-zoom-label">缩放</span>}
      <div className="sk-zoom-track">
        {ZOOM_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`sk-zoom-step${preset === active ? ' is-active' : ''}`}
            aria-pressed={preset === active}
            title={`缩放到 ${Math.round(preset * 100)}%`}
            onClick={() => onChange(preset)}
          >
            {Math.round(preset * 100)}%
          </button>
        ))}
      </div>
    </div>
  );
}
