import { useEffect, useRef, useState } from 'react';
import { App, Input, Modal, Spin } from 'antd';
import { download, get, post } from '../../api';
import type { SystemInfo } from '../../api';

export interface RepoExportTarget {
  id: string;
  name?: string;
  total?: number;
}

/** 题库导出弹窗：列表页与题目页共用 */
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
      destroyOnHidden
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
