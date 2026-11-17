import type { ReactNode } from 'react';

/** 章节标题：编号 + 标题 + 一句说明，页面与 MCP 子组件共用，保证字号/间距一致 */
export default function SectionHead({
  index,
  title,
  desc,
}: {
  index: string;
  title: string;
  desc: ReactNode;
}) {
  return (
    <div className="ai-section-head">
      <span className="bp-tag ai-section-index">{index}</span>
      <div className="ai-section-headings">
        <h2 className="ai-section-title">{title}</h2>
        <p className="ai-section-desc">{desc}</p>
      </div>
    </div>
  );
}
