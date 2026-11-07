/**
 * 全局界面缩放：一处控制，全站生效。
 *
 * 之前是两套：外壳（BasicLayout）一套 6 档 zoom，练习/答题页又各自维护 fontScale，
 * 于是首页和答题页的缩放比例、档位都不一样。现在统一成 4 档，写进 localStorage，
 * 启动时直接作用在 <html> 上（所以公开答题页也一致）。
 */
export const ZOOM_PRESETS = [0.9, 1, 1.15, 1.3] as const;
export const ZOOM_MIN = ZOOM_PRESETS[0];
export const ZOOM_MAX = ZOOM_PRESETS[ZOOM_PRESETS.length - 1];
export const ZOOM_KEY = 'sk-zoom';

/** 就近吸附到某个档位，避免历史值（如 1.1 / 1.5）落在档位之间 */
export function snapZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  let best: number = ZOOM_PRESETS[1];
  let bestDiff = Math.abs(value - best);
  for (const preset of ZOOM_PRESETS) {
    const diff = Math.abs(value - preset);
    if (diff < bestDiff) {
      best = preset;
      bestDiff = diff;
    }
  }
  return best;
}

export function readZoom(): number {
  try {
    return snapZoom(Number(localStorage.getItem(ZOOM_KEY)) || 1);
  } catch {
    return 1;
  }
}

/** 应用缩放（挂到 <html> 上，弹窗/抽屉/公开页都跟着缩放） */
export function applyZoom(value: number): number {
  const snapped = snapZoom(value);
  document.documentElement.style.zoom = String(snapped);
  try {
    localStorage.setItem(ZOOM_KEY, String(snapped));
  } catch {
    // 隐私模式下 localStorage 可能不可写，忽略即可
  }
  return snapped;
}

/** 启动时调用一次 */
export function applyStoredZoom(): void {
  applyZoom(readZoom());
}
