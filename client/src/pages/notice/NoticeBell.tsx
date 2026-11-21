import { useEffect, useState } from 'react';
import { Badge, Button } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { get } from '../../api';
import { can } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import { NOTICE_UNREAD_EVENT, notifyNoticeUnreadChanged } from './events';







const POLL_MS = 60_000;


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

  const canSeeNotice = can(authorities, PERMISSION_CODES.noticeList);

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
