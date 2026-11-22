import { Button } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import AiAssistantPanel from './AiAssistantPanel';
import { useAiAssistant } from './AiAssistantContext';

/** 右下角悬浮入口：圆形按钮 + 浮层对话框 */
export default function AiAssistantFloat({ isMobile }: { isMobile: boolean }) {
  const { open, setOpen } = useAiAssistant();

  const button = (
    <Button
      type="primary"
      shape="circle"
      size="large"
      aria-label="打开 AI 助手"
      title="打开 AI 助手"
      icon={<RobotOutlined />}
      onClick={() => setOpen(true)}
      style={{
        position: 'fixed',
        right: isMobile ? 16 : 24,
        bottom: isMobile
          ? 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px + var(--sk-batch-bar-offset, 0px))'
          : 28,
        zIndex: 1000,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.28)',
      }}
    />
  );

  if (!open) {
    return button;
  }

  return (
    <div
      role="dialog"
      aria-label="AI 助手"
      style={
        isMobile
          ? {
              position: 'fixed',


              left: 12,
              right: 12,
              bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 12px)',
              height: 'min(520px, calc(100dvh - 160px))',

              zIndex: 1100,
              border: '1px solid var(--bp-line)',
              background: 'var(--bp-panel)',
              boxShadow: '0 10px 32px rgba(0, 0, 0, 0.34)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }
          : {
              position: 'fixed',
              right: 24,
              bottom: 24,
              width: 400,
              height: 'min(620px, calc(100vh - 96px))',
              zIndex: 1100,
              border: '1px solid var(--bp-line)',
              background: 'var(--bp-panel)',
              boxShadow: '0 10px 32px rgba(0, 0, 0, 0.34)',
              display: 'flex',
              flexDirection: 'column',
            }
      }
    >
      <AiAssistantPanel onClose={() => setOpen(false)} />
    </div>
  );
}
