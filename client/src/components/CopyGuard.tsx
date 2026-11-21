/**
 * 前端防复制（内容保护）
 *
 * 系统设置 →「内容保护」开关决定是否生效（缺省开启，见 GET /api/system 的 setting.copyProtected）：
 * - 拦截：右键菜单、copy、cut、拖拽选中、F12 / Ctrl+Shift+I·J·C·K / Ctrl+U / Ctrl+S / Ctrl+P；
 * - **粘贴（paste）一律不拦**：学员要往输入框里粘答案，右键菜单和 Ctrl+V 都必须能用，

 * - 输入框 / 文本域 / contenteditable 里的 copy、cut、右键同样放行——那是正常编辑行为，
 *   只有页面正文的复制剪切才拦；

 *
 * 开关变化走 window 事件 COPY_PROTECT_EVENT（系统设置页保存后广播），不用刷新整页。
 */
import { useEffect, useState } from 'react';
import { App } from 'antd';
import { getSystem } from '../api';


export const COPY_PROTECT_EVENT = 'sk:copy-protect-changed';


const EDITABLE_SELECTOR =
  'input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"])';


const HINT_INTERVAL = 1200;

function isEditable(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return el.isContentEditable || Boolean(el.closest(EDITABLE_SELECTOR));
}

/** 原生 HTML5 拖拽源（设计器题目、上传区）：拦了会把手自己的拖拽功能弄坏 */
function isNativeDragSource(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return Boolean(el.closest('[draggable="true"]'));
}


function isForbiddenKey(event: KeyboardEvent) {
  if (event.key === 'F12') return true;
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return false;
  const key = event.key.toLowerCase();
  if (event.shiftKey) return key === 'i' || key === 'j' || key === 'c' || key === 'k';
  return key === 'u' || key === 's' || key === 'p';
}

export default function CopyGuard() {
  const { message } = App.useApp();

  const [enabled, setEnabled] = useState(true);


  useEffect(() => {
    let alive = true;
    getSystem()
      .then((system) => {
        if (alive) setEnabled(system?.setting?.copyProtected !== false);
      })
      .catch(() => undefined);

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ copyProtected?: boolean }>).detail;
      if (typeof detail?.copyProtected === 'boolean') setEnabled(detail.copyProtected);
    };
    window.addEventListener(COPY_PROTECT_EVENT, onChanged);
    return () => {
      alive = false;
      window.removeEventListener(COPY_PROTECT_EVENT, onChanged);
    };
  }, []);


  useEffect(() => {
    if (!enabled) return;

    let lastHint = 0;
    const hint = () => {
      const now = Date.now();
      if (now - lastHint < HINT_INTERVAL) return;
      lastHint = now;
      message.warning('本页内容受保护，禁止复制');
    };

    const onContextMenu = (event: MouseEvent) => {

      if (isEditable(event.target)) return;
      event.preventDefault();
      hint();
    };

    const onCopyOrCut = (event: ClipboardEvent) => {

      if (isEditable(event.target)) return;
      event.preventDefault();
      hint();
    };

    const onDragStart = (event: DragEvent) => {
      if (isEditable(event.target) || isNativeDragSource(event.target)) return;
      event.preventDefault();
      hint();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isForbiddenKey(event)) return;
      event.preventDefault();
      hint();
    };

    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('copy', onCopyOrCut, true);
    document.addEventListener('cut', onCopyOrCut, true);
    document.addEventListener('dragstart', onDragStart, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('copy', onCopyOrCut, true);
      document.removeEventListener('cut', onCopyOrCut, true);
      document.removeEventListener('dragstart', onDragStart, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [enabled, message]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        right: 12,

        bottom: 64,
        zIndex: 901,
        pointerEvents: 'none',
        padding: '3px 8px',
        fontSize: 10,
        letterSpacing: '0.12em',
        color: 'var(--bp-text-soft)',
        border: '1px dashed var(--bp-line-soft)',
        background: 'var(--bp-panel)',
        userSelect: 'none',
      }}
    >
      本页内容受保护
    </div>
  );
}
