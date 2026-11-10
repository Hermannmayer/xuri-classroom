import { useCallback, useEffect, useState } from 'react';
import { App, Button, Drawer, Empty, List, Spin } from 'antd';
import dayjs from 'dayjs';
import { get, post } from '../../api';

/** 与后端 PublicAttemptView 对齐 */
interface PublicAttempt {
  answerId: string;
  examScore?: number | null;
  createAt?: string | number;
}

const scoreText = (value?: number | null) =>
  value === null || value === undefined || Number.isNaN(Number(value)) ? '—' : `${Number(value).toFixed(1)} 分`;

/**
 * 「我的答卷」抽屉：列出当前身份（登录用户按 create_by，未登录按 sk-anon cookie）
 * 在这份卷子上的答卷；登录后可以把匿名答卷绑定到账号。
 */
export default function AnonymousAnswersDrawer({
  open,
  projectId,
  projectName,
  loggedIn,
  onClose,
  onPick,
}: {
  open: boolean;
  projectId: string;
  projectName?: string;
  /** 登录态（由 PublicAnswer 现有的探测结果传入） */
  loggedIn: boolean;
  onClose: () => void;
  onPick: (answerId: string) => void;
}) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<PublicAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const list = await get<PublicAttempt[]>('/api/public/anonymous/answers', { projectId });
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      message.error((e as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, message]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const claim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      // 后端当前返回裸数字；契约写的是 { count }，两种都兼容
      const res = await post<{ count?: number } | number>('/api/public/anonymous/claim');
      const count = typeof res === 'number' ? res : (res?.count ?? 0);
      message.success('已绑定 ' + count + ' 份答卷');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Drawer
      title={'我的答卷' + (projectName ? '：' + projectName : '')}
      open={open}
      onClose={onClose}
      width="min(520px, 94vw)"
      destroyOnClose
    >
      {loggedIn && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: '1px dashed var(--bp-line)',
          }}
        >
          <Button type="primary" size="small" loading={claiming} onClick={() => void claim()}>
            绑定到我的账号
          </Button>
          <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
            把本设备未登录时答过的卷子挂到当前账号
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <Spin />
        </div>
      ) : rows.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有答过这份卷子" />
      ) : (
        <List
          dataSource={rows}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="view" size="small" type="link" onClick={() => onPick(item.answerId)}>
                  查看
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={`交卷时间：${item.createAt ? dayjs(item.createAt).format('YYYY-MM-DD HH:mm') : '—'}`}
                description={'分数：' + scoreText(item.examScore)}
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
}
