import { useEffect, useRef, useState, type CSSProperties, type Ref } from 'react';
import { Image } from 'antd';
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';

const BLANK_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

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
  /** 行内渲染（选项标签等）：根节点用 span，避免在 button 里生成 div */
  inline?: boolean;
  /** 是否挂点击放大；选项内部关闭，避免点击图片时误触选项 */
  zoomable?: boolean;
  /** 自定义图片点击（选项内使用），优先于内置 lightbox */
  onImageClick?: (src: string) => void;
}

/** 只读富文本：消毒后渲染，并把 [data-formula] 用 KaTeX 渲染 */
export default function RichTextContent({
  html,
  style,
  className,
  inline = false,
  zoomable = true,
  onImageClick,
}: RichTextContentProps) {
  const ref = useRef<HTMLElement>(null);
  const [previewSrc, setPreviewSrc] = useState<string>();
  const clean = DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'form', 'input', 'video'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });

  useEffect(() => {
    if (!zoomable && !onImageClick) return;
    const root = ref.current;
    if (!root) return;
    const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
    for (const image of images) {
      image.title = '点击放大查看';
      image.style.cursor = 'zoom-in';
    }
    const openImage = (target: EventTarget | null) => {
      if (!(target instanceof HTMLImageElement)) return false;
      const src = target.currentSrc || target.src;
      if (!src) return false;
      if (onImageClick) onImageClick(src);
      else setPreviewSrc(src);
      return true;
    };
    const onClick = (event: MouseEvent) => {
      if (openImage(event.target)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (openImage(event.target)) event.preventDefault();
    };
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeyDown);
    };
  }, [clean, zoomable, onImageClick]);

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

  const content = {
    className,
    style: { color: 'var(--bp-text)', ...style },
    dangerouslySetInnerHTML: { __html: clean },
  };

  return (
    <>
      {inline ? (
        <span ref={ref as unknown as Ref<HTMLSpanElement>} {...content} />
      ) : (
        <div ref={ref as unknown as Ref<HTMLDivElement>} {...content} />
      )}
      {zoomable && !onImageClick && (
        <Image
          src={previewSrc ?? BLANK_IMAGE}
          alt=""
          style={{ display: 'none' }}
          preview={{
            visible: Boolean(previewSrc),
            onVisibleChange: (visible) => {
              if (!visible) setPreviewSrc(undefined);
            },
          }}
        />
      )}
    </>
  );
}
