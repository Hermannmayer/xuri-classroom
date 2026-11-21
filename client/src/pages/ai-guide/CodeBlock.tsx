import { useEffect, useRef, useState } from 'react';
import { App, Button } from 'antd';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';

/**
 * 可复制的代码块：MCP 配置片段、curl 验证、示例需求共用。
 *
 * 复制逻辑与 ApiTokenPanel 保持一致：优先 Clipboard API（只有 https / localhost 可用），
 * 非安全上下文或用户拒权时退回 window.prompt，避免「点了复制没反应」。
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 落到下面的人工复制
  }
  window.prompt('浏览器不允许自动复制，请手动复制下面的内容', text);
  return false;
}

export default function CodeBlock({
  code,
  label,
  language,
}: {
  code: string;

  label: string;

  language?: string;
}) {
  const { message } = App.useApp();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const onCopy = async () => {
    const ok = await copyText(code);
    if (!ok) return;
    message.success('已复制到剪贴板');
    setCopied(true);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ai-code">
      <div className="ai-code-head">
        <span className="ai-code-label">
          {label}
          {language ? <span className="ai-code-lang">{language}</span> : null}
        </span>
        <Button
          size="small"
          type="text"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={() => void onCopy()}
        >
          {copied ? '已复制' : '复制'}
        </Button>
      </div>
      <pre className="ai-code-body">
        <code>{code}</code>
      </pre>
    </div>
  );
}
