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


const LAST_CHECK_KEY = 'sk-update-last-check';




const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

/**
 * 管理员登录后检查更新；只提示，不执行升级。
 *
 * 检查策略（按"不打扰"设计）：
 *  - 只在挂载时查一次，**不再监听 window focus**（切窗口就查是最烦人的）；
 *  - 12 小时内查过就直接跳过；
 *  - 同一个版本点过"关闭"后按版本记 localStorage，不再出现；
 *  - 后端连不上 GitHub 时返回 error、hasUpdate=false，这里什么都不显示。
 */
export default function UpdateBanner({ authorities }: { authorities: string[] }) {
  const navigate = useNavigate();
  const [info, setInfo] = useState<UpdateInfo>();

  useEffect(() => {
    if (!can(authorities, PERMISSION_CODES.systemSettingUpdate)) return;
    let alive = true;

    let last = 0;
    try {
      last = Number(localStorage.getItem(LAST_CHECK_KEY) || '0');
    } catch {
      last = 0;
    }
    if (Number.isFinite(last) && last > 0 && Date.now() - last < MIN_INTERVAL_MS) {
      return;
    }

    void get<UpdateInfo>('/api/system/update/check')
      .then((res) => {
        try {
          localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        } catch {
          // localStorage 不可用时只是不节流，不影响展示
        }
        if (alive) setInfo(res);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [authorities]);

  if (!info?.enabled || !info.hasUpdate || !info.latestVersion) return null;
  const dismissedKey = 'sk-update-dismissed:' + info.latestVersion;
  if (localStorage.getItem(dismissedKey) === '1') return null;

  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 12 }}
      title={'发现新版本 v' + info.latestVersion + '（当前 v' + (info.currentVersion || '—') + '）'}
      description={
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 220, whiteSpace: 'pre-wrap' }}>
            {info.notes || '有新版本可用，请管理员查看更新说明。'}
          </span>
          {info.downloadUrl ? (
            <Button size="small" type="primary" onClick={() => window.open(info.downloadUrl, '_blank', 'noopener')}>
              打开下载页
            </Button>
          ) : null}
          <Button size="small" onClick={() => navigate('/system/setting')}>
            查看更新说明
          </Button>
        </div>
      }
      closable={{
        onClose: () => {
          try {
            localStorage.setItem(dismissedKey, '1');
          } catch {
            // localStorage 不可用时只关闭本次
          }
          setInfo(undefined);
        },
      }}
    />
  );
}
