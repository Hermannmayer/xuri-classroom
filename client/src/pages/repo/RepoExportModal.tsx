import { useEffect, useRef, useState } from 'react';
import { App, Input, Modal, Spin } from 'antd';
import { download, get, post } from '../../api';
import type { SystemInfo } from '../../api';

export interface RepoExportTarget {
  id: string;
  name?: string;
  total?: number;
}

/**
 * 题库导出弹窗：列表页与题目页共用。
 *
 * 关键点：
 * - 系统没设置导出密码时，不再让用户白填密码：打开后直接开始下载；
 * - 设置了密码才显示输入框，密码只走 POST body 换一次性 token，下载 URL 里只出现 token；
 * - 没有配置密码时后端会忽略输入的任何密码（旧实现会让人误以为"密码错误但没提示"）；
 * - 导出成功后给一条明确提示，避免浏览器静默下载被当成"没反应"。
 */
export default function RepoExportModal({
  target,
  onClose,
}: {
  target: RepoExportTarget | null;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  /** null=正在读系统设置；false=未启用导出密码；true=需要密码 */
  const [pwdRequired, setPwdRequired] = useState<boolean | null>(null);
  const autoTried = useRef(false);

  const submit = async (passwordOverride?: string) => {
    if (!target || busy) return;
    setBusy(true);
    try {
      const password = passwordOverride !== undefined ? passwordOverride : pwd;
      const tokenRes = await post<{ exportToken?: string }>('/api/repo/export/token', {
        exportPassword: password.trim() || undefined,
      });
      const fileName = `${target.name || '题库'}题目.xlsx`;
      await download('/api/repo/export', { id: target.id, exportToken: tokenRes?.exportToken }, fileName);
      message.success(`已开始下载「${fileName}」，请查看浏览器下载`);
      onClose();
    } catch (e) {
      message.error((e as Error).message);
      // 系统设置读的是 false、但后端实际要密码（设置刚被改过）时，退回密码输入
      if (pwdRequired === false) setPwdRequired(true);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!target) {
      setPwd('');
      setBusy(false);
      setPwdRequired(null);
      autoTried.current = false;
      return;
    }
    let alive = true;
    setPwd('');
    setBusy(false);
    setPwdRequired(null);
    autoTried.current = false;
    get<SystemInfo>('/api/system')
      .then((sys) => {
        if (!alive) return;
        const required = Boolean(sys?.setting?.exportPasswordEnabled);
        setPwdRequired(required);
        if (!required) {
          autoTried.current = true;
          // 没设密码就直接下载，避免用户对着一个空密码框猜
          void submit('');
        }
      })
      .catch(() => {
        if (alive) setPwdRequired(true);
      });
    return () => {
      alive = false;
    };
    // 只在 target 变化时重新检查；submit 用到的最新 pwd 由输入框直接传入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <Modal
      title={`导出题目${target?.name ? `：${target.name}` : ''}`}
      open={Boolean(target)}
      onCancel={onClose}
      onOk={() => void submit()}
      okText="导出"
      cancelText="取消"
      confirmLoading={busy}
      okButtonProps={{ disabled: pwdRequired !== true }}
      destroyOnClose
    >
      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.8, marginBottom: 12 }}>
        未设置导出密码时会直接开始下载。要设置或清除导出密码，请到「系统设置 → 内容与隐私」。
        <br />
        如果点击后没有看到下载窗口，请检查浏览器下载列表或下载权限设置。
      </div>
      {pwdRequired === null ? (
        <div style={{ padding: '8px 0', textAlign: 'center' }}>
          <Spin size="small" /> 正在检查导出设置…
        </div>
      ) : pwdRequired ? (
        <Input.Password
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onPressEnter={() => void submit()}
          placeholder="导出密码"
          autoComplete="off"
        />
      ) : (
        <div style={{ padding: '4px 0', fontSize: 12, color: 'var(--bp-text-soft)' }}>
          系统未设置导出密码，正在开始下载…
        </div>
      )}
    </Modal>
  );
}
