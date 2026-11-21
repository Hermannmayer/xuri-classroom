import { useEffect, useRef, type CSSProperties } from 'react';
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li', 'a', 'img',
  'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'hr', 'span', 'div', 'table',
  'thead', 'tbody', 'tr', 'th', 'td',
];
const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'style',
  'data-formula', 'data-question-ref',
];

export interface RichTextContentProps {
  html?: string;
  style?: CSSProperties;
  className?: string;
}

/**
 * 只读富文本：消毒后渲染，并把 [data-formula] 用 KaTeX 渲染。
 * KaTeX 按需动态加载，避免所有答题页首屏都背上公式引擎。
 */
export default function RichTextContent({ html, style, className }: RichTextContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const clean = DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'form', 'input', 'video'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const formulas = Array.from(root.querySelectorAll<HTMLElement>('[data-formula]'));
    if (!formulas.length) return;
    let alive = true;
    void import('katex').then(({ default: katex }) => {
      if (!alive) return;
      formulas.forEach((element) => {
        const latex = element.getAttribute('data-formula') || '';
        if (!latex.trim()) return;
        try {
          katex.render(latex, element, { throwOnError: false, displayMode: false });
        } catch {

          element.textContent = latex;
        }
      });
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [clean]);

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
