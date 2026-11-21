/** 全站平铺水印：内容可在「系统设置 → 内容与隐私保护」里配置 */
import { useEffect, useMemo, useState } from 'react';
import { getCurrentUser, getSystem } from '../api';
import type { UserInfo } from '../api';


export type WatermarkMode = 'name_phone' | 'name' | 'phone';


export const WATERMARK_EVENT = 'sk:watermark-changed';


const AUTH_PREFIXES = ['/home', '/project', '/teaching', '/survey', '/repo', '/exercise', '/system', '/account'];


const MASK_PHONE = true;


const WITH_DATE = false;


const TILE_WIDTH = 300;
const TILE_HEIGHT = 170;
const ROTATE_DEG = -25;
const OPACITY = 0.06;


const WATERMARK_Z_INDEX = 900;

const FONT = "12px 'Cascadia Mono', 'JetBrains Mono', Consolas, 'Microsoft YaHei', monospace";

function isAuthedPath(pathname: string) {
  return AUTH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** 后端字段是 string；老数据 / 脏值（含 null）一律当成默认的 name_phone */
function normalizeMode(value?: string | null): WatermarkMode {
  return value === 'name' || value === 'phone' ? value : 'name_phone';
}

function maskPhone(phone: string) {
  if (!MASK_PHONE) return phone;

  return phone.length >= 11 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone;
}

/** 水印内容按模式拼：姓名、手机号、或两者；某一部分缺失时用另一部分兜底，别留空白砖 */
function watermarkText(user: UserInfo, mode: WatermarkMode) {
  const name = (user.name || user.userId || '').trim();
  const phone = (user.phone || '').trim();
  const maskedPhone = phone ? maskPhone(phone) : '';
  const core =
    mode === 'name'
      ? [name || maskedPhone]
      : mode === 'phone'
        ? [maskedPhone || name]
        : [name, maskedPhone];
  const date = WITH_DATE ? new Date().toISOString().slice(0, 10) : '';
  return [...core, date].filter(Boolean).join(' ');
}

/** 当前主题的文字色：canvas 不支持 CSS 变量，只能读 --bp-text 的计算值 */
function themeTextColor() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--bp-text').trim();
  return value || '#ffffff';
}

/** 画一块倾斜文字砖并转成 dataURL；作为背景 repeat 后就是满屏水印 */
function buildTile(text: string, color: string) {

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(TILE_WIDTH * dpr);
  canvas.height = Math.round(TILE_HEIGHT * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.scale(dpr, dpr);
  ctx.globalAlpha = OPACITY;
  ctx.fillStyle = color;
  ctx.font = FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(TILE_WIDTH / 2, TILE_HEIGHT / 2);
  ctx.rotate((ROTATE_DEG * Math.PI) / 180);
  ctx.fillText(text, 0, 0);
  return canvas.toDataURL('image/png');
}

/** 路由变化感知：本组件在 RouterProvider 之外，用不了 useLocation， */
function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    const { pushState, replaceState } = window.history;

    const patchedPush: History['pushState'] = (...args) => {
      pushState.apply(window.history, args);
      sync();
    };
    const patchedReplace: History['replaceState'] = (...args) => {
      replaceState.apply(window.history, args);
      sync();
    };

    window.history.pushState = patchedPush;
    window.history.replaceState = patchedReplace;
    window.addEventListener('popstate', sync);
    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
      window.removeEventListener('popstate', sync);
    };
  }, []);

  return pathname;
}

export default function Watermark() {
  const pathname = usePathname();
  const authed = isAuthedPath(pathname);
  const [user, setUser] = useState<UserInfo>();
  const [color, setColor] = useState(themeTextColor);

  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<WatermarkMode>('name_phone');


  useEffect(() => {
    const observer = new MutationObserver(() => setColor(themeTextColor()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);


  useEffect(() => {
    let alive = true;
    getSystem()
      .then((system) => {
        if (!alive) return;
        setEnabled(system?.setting?.watermarkEnabled !== false);
        setMode(normalizeMode(system?.setting?.watermarkMode));
      })
      .catch(() => undefined);

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ watermarkEnabled?: boolean; watermarkMode?: string }>).detail;
      if (typeof detail?.watermarkEnabled === 'boolean') setEnabled(detail.watermarkEnabled);
      if (detail?.watermarkMode) setMode(normalizeMode(detail.watermarkMode));
    };
    window.addEventListener(WATERMARK_EVENT, onChanged);
    return () => {
      alive = false;
      window.removeEventListener(WATERMARK_EVENT, onChanged);
    };
  }, []);


  useEffect(() => {
    if (!authed) {
      setUser(undefined);
      return;
    }
    if (user) return;
    let alive = true;
    getCurrentUser()
      .then((info) => {
        if (alive) setUser(info);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [authed, user]);

  const text = user && enabled ? watermarkText(user, mode) : '';
  const tile = useMemo(() => (text ? buildTile(text, color) : ''), [text, color]);

  if (!text || !tile) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: WATERMARK_Z_INDEX,
        pointerEvents: 'none',
        backgroundImage: `url("${tile}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: `${TILE_WIDTH}px ${TILE_HEIGHT}px`,
        userSelect: 'none',
      }}
    />
  );
}
