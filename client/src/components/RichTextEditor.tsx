import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { App, Spin } from 'antd';
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  ClearOutlined,
  CodeOutlined,
  FontColorsOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Extension, mergeAttributes, Node } from '@tiptap/core';
import DOMPurify from 'dompurify';
import { post } from '../api';
import 'katex/dist/katex.min.css';

export interface RichTextEditorProps {
  value?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;

  mode?: 'editor' | 'answer';
  projectId?: string;

  ownerType?: 'project' | 'repo';
  ownerId?: string;
  questionId?: string;
}

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li', 'a', 'img',
  'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'hr', 'span', 'div', 'table',
  'thead', 'tbody', 'tr', 'th', 'td',
];
const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'style',
  'data-formula', 'data-question-ref',
];

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'form', 'input', 'video'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
}

function normalizeLink(raw: string): string | null {
  const url = raw.trim();
  if (!url) return '';
  if (/^(https?:|mailto:)/i.test(url)) return url;
  return null;
}

/** 字号：TextStyle mark 上的 fontSize 属性，存成 16px 这种值。 */
const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => (attributes.fontSize ? { style: 'font-size: ' + attributes.fontSize } : {}),
          },
        },
      },
    ];
  },
});


const Formula = Node.create({
  name: 'formula',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { latex: { default: '' } };
  },
  parseHTML() {
    return [{ tag: 'span[data-formula]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'rt-formula',
        'data-formula': HTMLAttributes.latex || '',
      }),
      HTMLAttributes.latex || '公式',
    ];
  },
});


const QuestionRef = Node.create({
  name: 'questionRef',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      questionId: { default: '' },
      label: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-question-ref]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'rt-question-ref',
        'data-question-ref': HTMLAttributes.questionId || '',
      }),
      HTMLAttributes.label || '题目引用',
    ];
  },
});

/**
 * 题库/试卷题目描述用富文本编辑器。
 *
 * <p>编辑态图片按 ownerType/ownerId 登记引用；答题态走 /api/public/upload，
 * 由后端校验项目/题目并把图片挂到本次答卷上下文。
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = '输入题目描述，可插入图片',
  disabled = false,
  minHeight = 110,
  mode = 'editor',
  projectId,
  ownerType,
  ownerId,
  questionId,
}: RichTextEditorProps) {
  const { message } = App.useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const editor = useEditor({


    shouldRerenderOnTransaction: true,
    extensions: [


      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false, underline: false }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      FontSize,
      Formula,
      QuestionRef,
    ],
    content: value ?? '',
    editable: !disabled,
    editorProps: {
      attributes: { class: 'rich-text-content' },
      transformPastedHTML: (html) => sanitizeHtml(html),
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && !editor.isFocused) {

      editor.commands.setContent(value ?? '', { emitUpdate: false });
    }
  }, [editor, value]);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      if (mode === 'answer') {
        if (!projectId || !questionId) throw new Error('缺少试卷或题目信息，无法上传图片');
        form.append('projectId', projectId);
        form.append('questionId', questionId);
      } else {
        form.append('publicRead', 'true');
        if (ownerType) form.append('ownerType', ownerType);
        if (ownerId) form.append('ownerId', ownerId);
        if (questionId) form.append('questionId', questionId);
      }
      const uploaded = await post<{ id: string }>(mode === 'answer' ? '/api/public/upload' : '/api/file/create', form);
      if (!uploaded?.id) throw new Error('上传返回缺少文件 id');
      editor?.chain().focus().setImage({
        src: '/api/public/preview/' + uploaded.id,
        alt: file.name,
      }).run();
      message.success('图片已插入');
    } catch (e) {
      message.error((e as Error).message || '图片上传失败');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const raw = window.prompt('链接地址（http/https/mailto）', previous || 'https://');
    if (raw === null) return;
    const url = normalizeLink(raw);
    if (url === null) {
      message.warning('只支持 http / https / mailto 链接');
      return;
    }
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertFormula = () => {
    if (!editor) return;
    const latex = window.prompt('输入 LaTeX 公式，例如 \\frac{1}{2}', '');
    if (!latex || !latex.trim()) return;
    editor.chain().focus().insertContent({ type: 'formula', attrs: { latex: latex.trim() } }).run();
  };

  const insertQuestionRef = () => {
    if (!editor) return;
    const raw = window.prompt('输入要引用的题目编号或题目 id', '');
    if (!raw || !raw.trim()) return;
    const value = raw.trim();
    editor.chain().focus().insertContent({
      type: 'questionRef',
      attrs: { questionId: value, label: '题目 ' + value },
    }).run();
  };

  const tool = (
    key: string,
    title: string,
    icon: JSX.Element,
    action: () => void,
    active = false,
    isDisabled = false,
  ) => (
    <button
      key={key}
      type="button"
      title={title}
      aria-label={title}
      className={'rt-btn' + (active ? ' active' : '')}
      disabled={disabled || isDisabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
    >
      {icon}
    </button>
  );

  if (!editor) {
    return <div style={{ minHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="small" /></div>;
  }

  const fontSizes = [12, 14, 16, 18, 20, 24];
  const currentSize = String(editor.getAttributes('textStyle').fontSize || '14px').replace('px', '');

  return (
    <div className="rich-text-editor" style={{ opacity: disabled ? 0.7 : 1 }}>
      <div className="rt-toolbar" role="toolbar" aria-label="富文本工具栏">
        <select
          className="rt-select"
          value={fontSizes.includes(Number(currentSize)) ? currentSize : '14'}
          onChange={(event) => {
            editor.chain().focus().setMark('textStyle', { fontSize: event.target.value + 'px' }).run();
          }}
          title="字号"
        >
          {fontSizes.map((size) => <option key={size} value={size}>{size}px</option>)}
        </select>
        <button
          type="button"
          className="rt-btn"
          title="文字颜色"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => colorRef.current?.click()}
        >
          <FontColorsOutlined />
        </button>
        <span className="rt-sep" />
        {tool('bold', '加粗', <BoldOutlined />, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
        {tool('italic', '斜体', <ItalicOutlined />, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
        {tool('underline', '下划线', <UnderlineOutlined />, () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}
        {tool('strike', '删除线', <StrikethroughOutlined />, () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'))}
        {tool('clear', '清除格式', <ClearOutlined />, () => editor.chain().focus().clearNodes().unsetAllMarks().run())}
        <span className="rt-sep" />
        {tool('left', '左对齐', <AlignLeftOutlined />, () => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }))}
        {tool('center', '居中', <AlignCenterOutlined />, () => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }))}
        {tool('right', '右对齐', <AlignRightOutlined />, () => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' }))}
        <span className="rt-sep" />
        {tool('ul', '无序列表', <UnorderedListOutlined />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
        {tool('ol', '有序列表', <OrderedListOutlined />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
        {tool('indent', '增加缩进', <span style={{ fontWeight: 700 }}>→</span>, () => editor.chain().focus().sinkListItem('listItem').run(), false, !editor.can().sinkListItem('listItem'))}
        {tool('outdent', '减少缩进', <span style={{ fontWeight: 700 }}>←</span>, () => editor.chain().focus().liftListItem('listItem').run(), false, !editor.can().liftListItem('listItem'))}
        <span className="rt-sep" />
        {tool('link', '插入链接', <LinkOutlined />, setLink, editor.isActive('link'))}
        {tool('image', uploading ? '图片上传中' : '插入图片', <PictureOutlined />, () => fileRef.current?.click(), false, uploading)}
        {tool('code', '代码块', <CodeOutlined />, () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock'))}
        <button type="button" className="rt-btn rt-text-btn" title="插入公式" onMouseDown={(event) => event.preventDefault()} onClick={insertFormula}>fx</button>
        <button type="button" className="rt-btn rt-text-btn" title="题目引用" onMouseDown={(event) => event.preventDefault()} onClick={insertQuestionRef}>题</button>
        <span className="rt-sep" />
        {tool('undo', '撤销', <UndoOutlined />, () => editor.chain().focus().undo().run(), false, !editor.can().undo())}
        {tool('redo', '重做', <RedoOutlined />, () => editor.chain().focus().redo().run(), false, !editor.can().redo())}
        {uploading && <Spin size="small" style={{ marginLeft: 6 }} />}
      </div>
      <EditorContent editor={editor} />
      <div className="rt-hint">支持字号、颜色、对齐、列表、链接、代码块、公式和图片；图片会跟随所在题库/试卷清理。</div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadImage(file);
        }}
      />
      <input
        ref={colorRef}
        type="color"
        style={{ display: 'none' }}
        onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
      />
    </div>
  );
}
