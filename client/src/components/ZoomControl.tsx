/**
 * 界面缩放档位控件
 *
 * 旧做法是下拉框（90%/100%/…），老师根本找不到入口；改成档位平铺后一眼可见，
 * 点一下就切换，不需要展开菜单。主界面、答题页、练习页共用同一个组件和同一套档位。
 */

/** 档位值（CSS zoom 倍数），顺序即界面上的排列顺序 */
export const ZOOM_PRESETS = [0.9, 1, 1.1, 1.25, 1.5, 1.75] as const;

export const ZOOM_MIN = ZOOM_PRESETS[0];
export const ZOOM_MAX = ZOOM_PRESETS[ZOOM_PRESETS.length - 1];

/** 把任意倍数吸附到最接近的档位，保证界面上总有一个档位是高亮的 */
export function snapZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  let best: number = ZOOM_PRESETS[1];
  let min = Number.POSITIVE_INFINITY;
  for (const preset of ZOOM_PRESETS) {
    const diff = Math.abs(preset - value);
    if (diff < min) {
      min = diff;
      best = preset;
    }
  }
  return best;
}

export interface ZoomControlProps {
  value: number;
  onChange: (value: number) => void;
  /** 小屏/窄容器下隐藏「缩放」文字，只留档位 */
  hideLabel?: boolean;
  /** 无障碍名称，默认「界面缩放」 */
  label?: string;
}

/** 档位平铺的缩放控件：所有档位直接可见，点哪个高亮哪个 */
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
