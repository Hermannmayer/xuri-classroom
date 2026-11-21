import { useEffect, useState } from 'react';

/**
 * 量容器宽度（px）。
 *
 * 图表按「真实像素」绘制，而不是靠 viewBox 缩放：
 * viewBox 缩放会把字号、线宽一起放大缩小，宽屏上字会变得很大、窄屏上糊成一团。
 *

 * 1. 用**回调 ref**（而不是 useRef）把节点存进 state：图表在「读取中」时渲染的是占位块，
 *    真正的容器 div 要等数据回来后才有；用 useRef + 空依赖的 effect 会永远拿不到节点。
 * 2. 量不到（SSR / 测试环境 / 无 ResizeObserver）时退回 fallback，保证一定能画出东西。
 */
export function useWidth(fallback = 640): { ref: (element: HTMLDivElement | null) => void; width: number } {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    if (!element) return;
    const apply = (next: number) => {
      if (next > 0) setWidth(Math.round(next));
    };
    apply(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => apply(entries[0]?.contentRect?.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { ref: setElement, width };
}

/**
 * 系统是否要求「减少动效」（prefers-reduced-motion: reduce）。
 *
 * 图表里的 hover 过渡、环形进度补间都走这个开关；用户开了系统级减少动效，
 * 这里返回 true，组件就把 transition 关掉（不留动画，也不留延迟）。
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
