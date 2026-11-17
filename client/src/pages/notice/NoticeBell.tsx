import { useEffect, useState } from 'react';
import { Badge, Button } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { get } from '../../api';
import { can } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import { NOTICE_UNREAD_EVENT, notifyNoticeUnreadChanged } from './events';

/**
 * 轮询间隔：60 秒（实施计划 4.6）。
 *
 * <p>不用更短：一个学校几百人同时在站内，10 秒级轮询对 4 核小机器是纯浪费；
 * 切回标签页会立即补一次，所以体感不会慢。
 */
const POLL_MS = 60_000;

/** 自动检查更新的节流：沿用 UpdateBanner 原来的 localStorage 键与 12 小时间隔 */
const UPDATE_LAST_CHECK_KEY = 'sk-update-last-check';
const UPDATE_MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

/**
 * 顶栏「公告」铃铛 + 未读 badge。
 *
 * <p>挂在 BasicLayout 的 Header 里，所有登录用户可见（学员也有 notice:list，4.4）。
 * 未读数只认 /api/notice/unread-count；接口没上线或没权限时静默保持 0，
 * 不要在顶栏弹一串红色错误——公告是辅助信息，不该挡路。
 *
 * <p>刷新时机：
 * 1. 挂载时立刻查一次；
 * 2. 每 60 秒轮询（后台标签页会被浏览器降频，靠下面两条兜）；
 * 3. window focus / 标签页重新可见时立即查；
 * 4. 公告中心读掉公告后广播 NOTICE_UNREAD_EVENT，立即查。
 *
 * <p>另外这里接过了「登录后自动检查更新」的那一下（原 UpdateBanner 发起）：只触发检查，
 * 提示改由公告中心的系统更新公告承担（4.1 / 4.7）。
 */
export default function NoticeBell({ authorities }: { authorities: string[] }) {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  // 精确判定：只认 notice:list（路由守卫也是它），ROLE_admin 在 can() 里已经兜底
  const canSeeNotice = can(authorities, PERMISSION_CODES.noticeList);
  /** 自动检查更新沿用 system:setting:update（和「系统设置」页保存同一个权限） */
  const canCheckUpdate = can(authorities, PERMISSION_CODES.systemSettingUpdate);

  useEffect(() => {
    if (!canSeeNotice) {
      setUnread(0);
      return;
    }
    let alive = true;
    const load = () => {
      get<{ count?: number }>('/api/notice/unread-count')
        .then((res) => {
          if (!alive) return;
          const count = Number(res?.count ?? 0);
          setUnread(Number.isFinite(count) && count > 0 ? count : 0);
        })
        .catch(() => undefined);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };

    load();
    const timer = window.setInterval(load, POLL_MS);
    window.addEventListener('focus', load);
    window.addEventListener(NOTICE_UNREAD_EVENT, load);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
      window.removeEventListener(NOTICE_UNREAD_EVENT, load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [canSeeNotice]);

  /**
   * 登录后自动检查更新。
   *
   * <p>原来这一下由 UpdateBanner 的横幅发起，横幅按 4.1 撤掉之后「检查」本身还得有人触发：
   * 后端发现新版本会写成一条 type=system_update 的管理员公告（4.7，SystemApi#recordUpdateNotice），
   * 铃铛下一次轮询就能看到未读。这里只查、不渲染任何提示，节流键与间隔都沿用原来的值，
   * 所以同一个浏览器 12 小时内只会真的打一次后端。
   */
  useEffect(() => {
    if (!canCheckUpdate) return;
    let last = 0;
    try {
      last = Number(localStorage.getItem(UPDATE_LAST_CHECK_KEY) || '0');
    } catch {
      last = 0;
    }
    if (Number.isFinite(last) && last > 0 && Date.now() - last < UPDATE_MIN_INTERVAL_MS) return;
    void get<{ hasUpdate?: boolean }>('/api/system/update/check')
      .then(() => {
        try {
          localStorage.setItem(UPDATE_LAST_CHECK_KEY, String(Date.now()));
        } catch {
          // localStorage 不可用时只是不节流，下次进页面再查一遍
        }
        // 检查更新可能刚写进一条系统更新公告：让未读数立刻重算，不用等下一轮 60 秒
        notifyNoticeUnreadChanged();
      })
      .catch(() => undefined);
  }, [canCheckUpdate]);

  if (!canSeeNotice) return null;

  return (
    <Button
      type="text"
      size="small"
      aria-label={unread > 0 ? `公告中心，${unread} 条未读` : '公告中心'}
      title={unread > 0 ? `公告中心（${unread} 条未读）` : '公告中心'}
      onClick={() => navigate('/notice')}
    >
      <Badge count={unread} size="small" overflowCount={99} offset={[2, -4]}>
        <BellOutlined style={{ fontSize: 15 }} />
      </Badge>
    </Button>
  );
}
