import { useEffect, useState } from 'react';
import { Alert, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { get } from '../api';
import { can } from '../auth/permissions';
import { PERMISSION_CODES } from '../auth/permission-codes';

interface UpdateInfo {
  currentVersion?: string;
  latestVersion?: string;
  hasUpdate?: boolean;
  enabled?: boolean;
  notes?: string;
  downloadUrl?: string;
  publishedAt?: string;
  error?: string;
}

/** 管理员登录后自动检查更新；只提示，不执行升级。 */
export default function UpdateBanner({ authorities }: { authorities: string[] }) {
  const navigate = useNavigate();
  const [info, setInfo] = useState<UpdateInfo>();

  useEffect(() => {
    if (!can(authorities, PERMISSION_CODES.systemSettingUpdate)) return;
    let alive = true;
    const check = () => {
      void get<UpdateInfo>('/api/system/update/check')
        .then((res) => {
          if (alive) setInfo(res);
        })
        .catch(() => undefined);
    };
    check();
    // 不轮询：管理员打开页面、或从后台切回来时检查一次即可
    window.addEventListener('focus', check);
    return () => {
      alive = false;
      window.removeEventListener('focus', check);
    };
  }, [authorities]);

  if (!info?.enabled || !info.hasUpdate || !info.latestVersion) return null;
  const dismissedKey = 'sk-update-dismissed:' + info.latestVersion;
  if (localStorage.getItem(dismissedKey) === '1') return null;

  return (
    <Alert
      type="info"
      showIcon
      closable
      style={{ marginBottom: 12 }}
      message={'发现新版本 v' + info.latestVersion + '（当前 v' + (info.currentVersion || '—') + '）'}
      description={
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 220, whiteSpace: 'pre-wrap' }}>
            {info.notes || '有新版本可用，请管理员查看更新说明。'}
          </span>
          <Button size="small" onClick={() => navigate('/system/setting')}>
            查看更新说明
          </Button>
        </div>
      }
      onClose={() => {
        try {
          localStorage.setItem(dismissedKey, '1');
        } catch {
          // localStorage 不可用时只关闭本次
        }
        setInfo(undefined);
      }}
    />
  );
}
