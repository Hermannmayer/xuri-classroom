import zhCN from './locales/zh-CN.json';



const registry: Record<string, Record<string, string>> = {
  'zh-CN': zhCN as Record<string, string>,
};

const STORAGE_KEY = 'sk-locale';
let locale = localStorage.getItem(STORAGE_KEY) || 'zh-CN';

export function getLocale() {
  return locale;
}

export function setLocale(next: string) {
  locale = next;
  localStorage.setItem(STORAGE_KEY, next);
  document.documentElement.lang = next;
}

/** 文案取不到时返回 fallback（默认用 id 本身），保证不会显示空白 */
export function t(id: string, fallback?: string): string {
  return registry[locale]?.[id] ?? fallback ?? id;
}
