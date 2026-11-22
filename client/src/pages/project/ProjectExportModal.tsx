import { useEffect, useState } from 'react';
import { App, Input, Modal, Radio, Spin } from 'antd';
import { download, get, post } from '../../api';
import type { SystemInfo } from '../../api';

export interface ProjectExportTarget {
  id: string;
  name?: string;
  mode?: 'exam' | 'survey' | 'folder';
}

type ExportFormat = 'json' | 'docx';

/** 试卷/问卷本体导出弹窗：JSON 完整备份或 Word 文档，沿用系统导出密码 */
export default function ProjectExportModal({
  target,
  onClose,
}: {
  target: ProjectExportTarget | null;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [format, setFormat] = useState<ExportFormat>('json');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [pwdRequired, setPwdRequired] = useState<boolean | null>(null);

  useEffect(() => {
    if (!target) {
      setPwd('');
      setBusy(false);
      setPwdRequired(null);
      setFormat('json');
      return;
    }
    let alive = true;
    setPwd('');
    setBusy(false);
    setPwdRequired(null);
    setFormat('json');
    get<SystemInfo>('/api/system')
      .then((sys) => {
        if (alive) setPwdRequired(Boolean(sys?.setting?.exportPasswordEnabled));
      })
      .catch(() => {
        if (alive) setPwdRequired(true);
      });
    return () => {
      alive = false;
    };
  }, [target]);

  const submit = async () => {
    if (!target || busy) return;
    if (pwdRequired && !pwd.trim()) {
      message.warning('请输入导出密码');
      return;
    }
    setBusy(true);
    try {
      const tokenRes = await post<{ exportToken?: string }>('/api/project/export/token', {
        exportPassword: pwd.trim() || undefined,
      });
      const isJson = format === 'json';
      const fallback = (target.name || '试卷') + (isJson ? '-备份.json' : '.docx');
      const url = isJson
        ? '/api/project/' + target.id + '/export/json'
        : '/api/project/' + target.id + '/export/docx';
      await download(url, { exportToken: tokenRes?.exportToken }, fallback);
      message.success('已开始下载「' + fallback + '」，请查看浏览器下载');
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isSurvey = target?.mode === 'survey';

  return (
    <Modal
      title={'导出' + (isSurvey ? '问卷' : '试卷') + (target?.name ? '：' + target.name : '')}
      open={Boolean(target)}
      onCancel={onClose}
      onOk={() => void submit()}
      okText="导出"
      cancelText="取消"
      confirmLoading={busy}
      okButtonProps={{ disabled: pwdRequired === null || (Boolean(pwdRequired) && !pwd.trim()) }}
      destroyOnHidden
      width={540}
    >
      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.8, marginBottom: 12 }}>
        导出的是{isSurvey ? '问卷' : '试卷'}本体，不包含学员答卷。JSON 备份包含名称、模式、完整设置和题目树；
        Word 文档用于打印或分享。
      </div>
      <Radio.Group
        value={format}
        onChange={(e) => setFormat(e.target.value as ExportFormat)}
        style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}
      >
        <Radio value="json">
          <span style={{ fontWeight: 700 }}>JSON 备份（推荐）</span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 2 }}>
            完整保留名称、考试/问卷模式、设置和题目树，适合留档与迁移。
          </span>
        </Radio>
        <Radio value="docx">
          <span style={{ fontWeight: 700 }}>Word 文档</span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 2 }}>
            按当前题目生成 .docx，适合打印、发给同事或线下审阅。
          </span>
        </Radio>
      </Radio.Group>

      {pwdRequired === null ? (
        <div style={{ padding: '12px 0', textAlign: 'center' }}>
          <Spin size="small" /> 正在检查导出设置…
        </div>
      ) : pwdRequired ? (
        <Input.Password
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onPressEnter={() => void submit()}
          placeholder="导出密码"
          autoComplete="off"
          style={{ marginTop: 14 }}
        />
      ) : (
        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--bp-text-soft)' }}>
          系统未设置导出密码，点「导出」即可下载。
        </div>
      )}
    </Modal>
  );
}
