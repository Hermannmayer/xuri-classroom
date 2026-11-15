import { useEffect, useRef, useState } from 'react';
import { App, Spin } from 'antd';
import {
  BoldOutlined,
  ClearOutlined,
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
import DOMPurify from 'dompurify';
import { post } from '../api';

export interface RichTextEditorProps {
  value?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
  /** 图片归属：project / repo；不传则图片只上传不登记引用 */
  ownerType?: 'project' | 'repo';
  ownerId?: string;
  questionId?: string;
}

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li', 'a', 'img',
  'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'hr', 'span', 'div', 'table',
  'thead', 'tbody', 'tr', 'th', 'td',
];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class'];

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
  });
}

function normalizeLink(raw: string): string | null {
  const url = raw.trim();
  if (!url) return '';
  if (/^(https?:|mailto:)/i.test(url)) return url;
  return null;
}

/**
 * 题库/试卷题目描述用的轻量富文本编辑器。
 *
 * <p>一期只做基础格式 + 图片，不接视频；图片上传后插入站内预览地址，并按
 * ownerType/ownerId 登记 t_file_ref，删除题库/试卷时才能安全清理。
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = '输入题目描述，可插入图片',
  disabled = false,
  minHeight = 110,
  ownerType,
  ownerId,
  questionId,
}: RichTextEditorProps) {
  const { message } = App.useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
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
    if (disabled) editor.setEditable(false);
    else editor.setEditable(true);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && !editor.isFocused) {
      editor.commands.setContent(value ?? '', false);
    }
  }, [editor, value]);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('publicRead', 'true');
      if (ownerType) form.append('ownerType', ownerType);
      if (ownerId) form.append('ownerId', ownerId);
      if (questionId) form.append('questionId', questionId);
      const uploaded = await post<{ id: string }>('/api/file/create', form);
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

  return (
    <div className="rich-text-editor" style={{ opacity: disabled ? 0.7 : 1 }}>
      <div className="rt-toolbar" role="toolbar" aria-label="富文本工具栏">
        {tool('bold', '加粗', <BoldOutlined />, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
        {tool('italic', '斜体', <ItalicOutlined />, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
        {tool('underline', '下划线', <UnderlineOutlined />, () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}
        {tool('strike', '删除线', <StrikethroughOutlined />, () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'))}
        <span className="rt-sep" />
        {tool('ul', '无序列表', <UnorderedListOutlined />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
        {tool('ol', '有序列表', <OrderedListOutlined />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
        {tool('quote', '引用', <span style={{ fontWeight: 700 }}>“</span>, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}
        <span className="rt-sep" />
        {tool('link', '插入链接', <LinkOutlined />, setLink, editor.isActive('link'))}
        {tool('image', uploading ? '图片上传中' : '插入图片', <PictureOutlined />, () => fileRef.current?.click(), false, uploading)}
        <span className="rt-sep" />
        {tool('undo', '撤销', <UndoOutlined />, () => editor.chain().focus().undo().run(), false, !editor.can().undo())}
        {tool('redo', '重做', <RedoOutlined />, () => editor.chain().focus().redo().run(), false, !editor.can().redo())}
        {tool('clear', '清除格式', <ClearOutlined />, () => editor.chain().focus().clearNodes().unsetAllMarks().run())}
        {uploading && <Spin size="small" style={{ marginLeft: 6 }} />}
      </div>
      <EditorContent editor={editor} />
      <div className="rt-hint">支持加粗、列表、链接和图片；图片会跟随所在题库/试卷清理。</div>
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
    </div>
  );
}
