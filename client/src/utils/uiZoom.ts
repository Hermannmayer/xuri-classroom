/** 全局界面缩放：一处控制，全站生效 */
export const ZOOM_PRESETS = [0.9, 1, 1.15, 1.3] as const;
export const ZOOM_MIN = ZOOM_PRESETS[0];
export const ZOOM_MAX = ZOOM_PRESETS[ZOOM_PRESETS.length - 1];
export const ZOOM_KEY = 'sk-zoom';


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

/** 应用缩放（挂到  上，弹窗/抽屉/公开页都跟着缩放） */
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
