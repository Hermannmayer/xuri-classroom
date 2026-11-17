import { useState } from 'react';
import { Button, Drawer } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import AiAssistantPanel from './AiAssistantPanel';
import { useAiAssistant } from './AiAssistantContext';

/**
 * 侧栏容器：只决定「面板放在哪」，面板本体与状态都在别处。
 *
 * - 桌面（>= md）：停靠在左侧菜单右边的一列，可折叠成 40px 窄条（状态记在 localStorage）；
 * - 手机：左下角一个浮动按钮 + 左侧抽屉，不占正文宽度（手机屏幕本来就窄）。
 *
 * 为什么不做成右侧抽屉：任务要求「左侧停靠」，而且右侧已经被批改抽屉（AiRewriteDrawer 等）占了，
 * 两个东西同时从右边滑出来会互相遮。
 */

/** 展开后的宽度：再宽会挤压编辑器画布，336 刚好放下一屏问答与四个快捷按钮 */
const PANEL_WIDTH = 336;

export default function AiAssistantSidebar({ isMobile }: { isMobile: boolean }) {
  const { docked, setDocked } = useAiAssistant();
  /** 手机上的抽屉状态：默认关（不能一进答题页就弹出半个屏幕） */
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        <Button
          type="primary"
          shape="circle"
          size="large"
          aria-label="打开 AI 助手"
          title="打开 AI 助手"
          icon={<RobotOutlined />}
          onClick={() => setDrawerOpen(true)}
          style={{
            position: 'fixed',
            left: 14,
            bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 14px)',
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.28)',
          }}
        />
        <Drawer
          open={drawerOpen}
          placement="left"
          size={320}
          closable={false}
          onClose={() => setDrawerOpen(false)}
          styles={{ body: { padding: 0, height: '100%' } }}
        >
          <AiAssistantPanel onCollapse={() => setDrawerOpen(false)} />
        </Drawer>
      </>
    );
  }

  if (!docked) {
    return (
      <div
        style={{
          flex: '0 0 40px',
          width: 40,
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          paddingTop: 10,
          background: 'var(--bp-panel-soft)',
          borderRight: '1px solid var(--bp-line-soft)',
        }}
      >
        <Button
          type="text"
          size="small"
          aria-label="展开 AI 助手"
          title="展开 AI 助手"
          icon={<RobotOutlined />}
          onClick={() => setDocked(true)}
        />
        <button
          type="button"
          onClick={() => setDocked(true)}
          title="展开 AI 助手"
          style={{
            writingMode: 'vertical-rl',
            letterSpacing: '0.2em',
            fontSize: 11,
            color: 'var(--bp-text-soft)',
            background: 'transparent',
            border: 0,
            padding: 0,
            cursor: 'pointer',
          }}
        >
          AI 助手
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: `0 0 ${PANEL_WIDTH}px`,
        width: PANEL_WIDTH,
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'var(--bp-panel)',
        borderRight: '1px solid var(--bp-line-soft)',
      }}
    >
      <AiAssistantPanel onCollapse={() => setDocked(false)} />
    </div>
  );
}
