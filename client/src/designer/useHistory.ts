import { useCallback, useState } from 'react';

const LIMIT = 50;

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

/** 轻量撤销/重做：只存整棵树快照，设计器对象量级不大，够用 */
export function useHistoryState<T>(initial: T) {
  const [history, setHistory] = useState<HistoryState<T>>({ past: [], present: initial, future: [] });

  const set = useCallback((updater: T | ((prev: T) => T)) => {
    setHistory((h) => {
      const next = typeof updater === 'function' ? (updater as (prev: T) => T)(h.present) : updater;
      if (next === h.present) return h;
      return { past: [...h.past.slice(-(LIMIT - 1)), h.present], present: next, future: [] };
    });
  }, []);

  const reset = useCallback((value: T) => {
    setHistory({ past: [], present: value, future: [] });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.past.length) return h;
      const previous = h.past[h.past.length - 1];
      return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (!h.future.length) return h;
      const [next, ...rest] = h.future;
      return { past: [...h.past, h.present], present: next, future: rest };
    });
  }, []);

  return {
    state: history.present,
    set,
    reset,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
