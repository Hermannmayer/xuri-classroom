import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider } from 'antd';
import type { ReactNode } from 'react';
import { buildTheme } from '../theme';
import type { ThemeMode } from '../theme';

const STORAGE_KEY = 'sk-theme';

function readMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'light' ? 'light' : 'dark';
}

/** 把主题落到 <html data-theme>，global.css 的 :root[data-theme='light'] 靠它生效 */
function applyMode(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
}

// 首屏渲染前先落属性，避免亮色用户先看到一帧暗色
applyMode(readMode());

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  setMode: () => undefined,
  toggle: () => undefined,
});

export function useThemeMode() {
  return useContext(ThemeContext);
}

/** 主题开关：localStorage 记忆选择，同时驱动 antd token 与 CSS 变量 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    applyMode(next);
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const value = useMemo(() => ({ mode, setMode, toggle }), [mode, setMode, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider theme={buildTheme(mode)}>{children}</ConfigProvider>
    </ThemeContext.Provider>
  );
}
