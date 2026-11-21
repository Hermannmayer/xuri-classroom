import { useEffect, useState } from 'react';

/** 量容器宽度（px） */
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

/** 系统是否要求「减少动效」（prefers-reduced-motion: reduce） */
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
