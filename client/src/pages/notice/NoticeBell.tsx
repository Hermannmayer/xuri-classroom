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

/** 顶栏「公告」铃铛 + 未读 badge */
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
