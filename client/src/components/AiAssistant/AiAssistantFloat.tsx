import { Button, Drawer } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import AiAssistantPanel from './AiAssistantPanel';
import { useAiAssistant } from './AiAssistantContext';

/**
 * 右下角悬浮入口：圆形按钮 + 浮层对话框（手机上是全屏抽屉）。
 *
 * <p>为什么不再做左侧停靠栏：停靠栏常驻要吃掉 336px 正文宽度，而老师 90% 的时间在改卷/看报表，
 * 那 336px 恰好是画布与表格最需要的地方；悬浮按钮只在需要时才占地方。
 *
 * <p>显示条件由 {@code BasicLayout} 决定（账号有 ai:use 且系统设置里 AI 总开关是开的），
 * 组件本身不判权限——避免「组件里判一次、菜单里判一次」两套口径。
 */
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
        bottom: isMobile ? 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)' : 28,
        zIndex: 1000,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.28)',
      }}
    />
  );

  if (isMobile) {
    return (
      <>
        {!open && button}
        <Drawer
          open={open}
          placement="right"
          width="100%"
          closable={false}
          onClose={() => setOpen(false)}
          styles={{ body: { padding: 0, height: '100%' } }}
        >
          <AiAssistantPanel onClose={() => setOpen(false)} />
        </Drawer>
      </>
    );
  }

  return (
    <>
      {!open && button}
      {open && (
        <div
          role="dialog"
          aria-label="AI 助手"
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            width: 400,
            height: 'min(620px, calc(100vh - 96px))',
            zIndex: 1000,
            border: '1px solid var(--bp-line)',
            background: 'var(--bp-panel)',
            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.34)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <AiAssistantPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
