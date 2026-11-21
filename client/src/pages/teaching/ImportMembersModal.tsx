import { useEffect, useState } from 'react';
import { Alert, App, Button, Modal, Upload } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { download, post } from '../../api';


interface ImportResult {
  imported?: number;
}

/** 班级学员批量导入 */
export default function ImportMembersModal({
  open,
  deptId,
  deptName,
  onClose,
  onImported,
}: {
  open: boolean;
  deptId: string;
  deptName?: string;
  onClose: () => void;

  onImported: () => void;
}) {
  const { message } = App.useApp();
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string>();
  const [result, setResult] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setFileName(undefined);
    setResult(undefined);
    setError(undefined);
    setImporting(false);
  }, [open]);

  const downloadTemplate = async () => {
    try {

      await download('/api/teaching/classes/member/template', undefined, '学员导入模板.xlsx');
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const doImport = async (file: File) => {
    if (importing || !deptId) return;
    setImporting(true);
    setFileName(file.name);
    setResult(undefined);
    setError(undefined);
    try {
      const fd = new FormData();
      fd.append('deptId', deptId);
      fd.append('file', file);
      const res = await post<ImportResult>('/api/teaching/classes/member/import', fd);
      const count = res?.imported ?? 0;
      setResult('成功导入 ' + count + ' 名学员');
      message.success('成功导入 ' + count + ' 名学员');
      onImported();
    } catch (e) {
      const text = (e as Error).message || '导入失败';
      setError(text);
      message.error(text);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      title={'批量导入学员' + (deptName ? '：' + deptName : '')}
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(560px, 94vw)"
      destroyOnHidden
    >
      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.9, marginBottom: 12 }}>
        先下载模板，按列填好后上传；一行一个学员。手机号即登录账号，已被占用的手机号会导入失败。
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <Button icon={<DownloadOutlined />} onClick={() => void downloadTemplate()}>
          下载模板
        </Button>
        <Upload
          accept=".xlsx"
          showUploadList={false}
          disabled={importing || !deptId}
          beforeUpload={(file) => {
            void doImport(file);

            return false;
          }}
        >
          <Button type="primary" icon={<UploadOutlined />} loading={importing} disabled={!deptId}>
            选择 .xlsx 导入
          </Button>
        </Upload>
      </div>

      <div
        style={{
          borderTop: '1px dashed var(--bp-line)',
          paddingTop: 10,
          marginBottom: 12,
          fontSize: 12,
          color: 'var(--bp-text-soft)',
          lineHeight: 1.9,
        }}
      >
        <div>模板列：</div>
        <div>· 姓名（必填）</div>
        <div>· 手机号（必填，11 位，作为登录账号）</div>
        <div>· 初始密码（选填，留空默认 12345678）</div>
        <div>· 邮箱（选填）</div>
        <div>· 登录账号无需单列：手机号即登录账号</div>
      </div>

      {fileName && (
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 8 }}>
          本次文件：{fileName}
        </div>
      )}

      {result && <Alert type="success" showIcon title={result} style={{ marginBottom: 8 }} />}
      {error && (
        <Alert type="error" showIcon title="导入失败" description={error} style={{ marginBottom: 8 }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Button onClick={onClose}>关闭</Button>
      </div>
    </Modal>
  );
}
