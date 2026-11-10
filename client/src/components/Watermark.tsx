/**
 * 全站平铺水印：内容可在「系统设置 → 内容与隐私保护」里配置
 *
 * 挂载点是 main.tsx 里 RouterProvider 的兄弟节点（路由之外），所以这里只做纯 DOM 覆盖层：
 * 1. 只在登录后的页面（AUTH_PREFIXES 白名单）拉 /api/currentUser；匿名页（登录 / 注册 / 公开答题）
 *    不拉也不渲染——公开答题页去拉 currentUser 必然 401，会被全局 401 处理踢回登录页。
 * 2. 用 canvas 画一块倾斜 -25° 的文字砖，转 dataURL 当 repeat 背景，不引任何第三方依赖。
 * 3. 颜色取当前主题的 --bp-text（canvas 不认 CSS 变量，只能读计算值），透明度 0.06，
 *    两套主题都「看得见但不刺眼」；切主题时用 MutationObserver 重新画。
 * 4. 覆盖层 pointer-events: none，不挡点击、滚动、拖拽；z-index 900 低于 antd Modal/Drawer 的 1000。
 *
 * 设置项（GET /api/system 的 system.setting，缺省都按「开启 + name_phone」处理）：
 * - watermarkEnabled：false 时不渲染；
 * - watermarkMode：'name_phone'（默认）| 'name' | 'phone'。
 * 改设置后系统设置页会广播 WATERMARK_EVENT，这里即时生效，不用刷新页面。
 */
import { useEffect, useMemo, useState } from 'react';
import { getCurrentUser, getSystem } from '../api';
import type { UserInfo } from '../api';

/** 水印内容模式：姓名 + 手机号 / 仅姓名 / 仅手机号 */
export type WatermarkMode = 'name_phone' | 'name' | 'phone';

/** 系统设置页保存水印开关/内容后广播的窗口事件名 */
export const WATERMARK_EVENT = 'sk:watermark-changed';

/** 需要水印的登录后路由前缀；不在白名单里的（/user/login、/s/*、/setup、未知路径）一律不渲染 */
const AUTH_PREFIXES = ['/home', '/project', '/teaching', '/survey', '/repo', '/exercise', '/system', '/account'];

/** 手机号中间四位打码：改成 false 就显示完整号码（便于截图外流后精确定位到人） */
const MASK_PHONE = true;

/** 是否在水印里带日期：带日期能推断截图时间，代价是水印每天变一次 */
const WITH_DATE = false;

/** 水印砖尺寸（CSS px）：砖小了太密会压住正文，大了又容易漏出大片空白 */
const TILE_WIDTH = 300;
const TILE_HEIGHT = 170;
const ROTATE_DEG = -25;
const OPACITY = 0.06;

/** antd Modal / Drawer / 手机底栏都是 1000，水印必须压在它们下面 */
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
  // 只打码中间四位：姓名 + 后四位足够定位，又不至于把完整号码留在截图里
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
  // 高分屏按 dpr 放大画布，再按 CSS 尺寸铺，文字才不糊
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

/**
 * 路由变化感知：本组件在 RouterProvider 之外，用不了 useLocation，
 * 所以包一层 history.pushState/replaceState 并监听 popstate，卸载时还原原函数。
 */
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
  // 缺省：开启 + 姓名+手机号（与后端契约一致）；拉取失败也按缺省渲染
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<WatermarkMode>('name_phone');

  // 切主题（html[data-theme]）时重画：白字水印铺在米白纸上等于没有
  useEffect(() => {
    const observer = new MutationObserver(() => setColor(themeTextColor()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // 读水印设置，并监听系统设置页的广播（改完即时生效）
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

  // 只在登录后的页面拉用户信息；退出登录或走到匿名页时清空
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
