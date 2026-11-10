import { Modal } from 'antd';
import PartnerPanel from '../survey/PartnerPanel';

/**
 * 文件夹授权弹窗：文件夹本身不是考试，不能跳 /survey/:id 的设置页。
 * 直接复用考试协作面板，projectId 传文件夹 id。
 */
export default function FolderAuthModal({
  open,
  folderId,
  folderName,
  canManage,
  onClose,
}: {
  open: boolean;
  folderId?: string;
  folderName?: string;
  canManage: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      title={`文件夹授权${folderName ? ` · ${folderName}` : ''}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(760px, 94vw)"
      destroyOnClose
    >
      {folderId ? <PartnerPanel projectId={folderId} canManage={canManage} /> : null}
    </Modal>
  );
}
