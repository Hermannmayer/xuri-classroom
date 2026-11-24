/** 签名题：Canvas 手写 → PNG → 上传，答案按后端约定存 { 空位id: fileId } */
import { useEffect, useRef, useState } from 'react';
import { App, Button, Segmented } from 'antd';
import { CheckOutlined, ClearOutlined, EditOutlined, UndoOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { post } from '../../api';
import type { AnswerValue, QuestionComponentProps } from '../types';
import { blankId } from './answers';
import { QuestionFrame, useAnswerState } from './shared';
import '../../styles/signature.css';




const PEN_SIZES = [
  { label: '细', value: 2 },
  { label: '中', value: 3.5 },
  { label: '粗', value: 5 },
];


const THIN_RATIO = 0.45;


const FAST_SPEED = 2.2;


const INK_FALLBACK = '#111111';
const PAPER_FALLBACK = '#ffffff';

function themeColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function inkColor(): string {
  return themeColor('--bp-paper-ink', INK_FALLBACK);
}

function paperColor(): string {
  return themeColor('--bp-paper', PAPER_FALLBACK);
}


const PREVIEW_CACHE_LIMIT = 20;


const FILE_TYPE_ANSWER_ATTACHMENT = 4;




interface InkPoint {
  x: number;
  y: number;
  w: number;
}

interface InkStroke {
  points: InkPoint[];
}



const previewCache = new Map<string, string>();

function rememberPreview(fileId: string, dataUrl: string) {
  if (previewCache.size >= PREVIEW_CACHE_LIMIT) previewCache.clear();
  previewCache.set(fileId, dataUrl);
}

/** ------ 取值 / 坐标 ------ */

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** 从答案里取签名文件 id：优先空位 id，兜底取第一个字符串值 */
function signatureFileId(answer: AnswerValue, blank: string): string {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return '';
  const map = answer as Record<string, unknown>;
  const hit = map[blank];
  if (typeof hit === 'string' && hit) return hit;
  for (const value of Object.values(map)) {
    if (typeof value === 'string' && value) return value;
  }
  return '';
}

/* ------ 画布 ------ */

/** 按设备像素比重设后备缓冲（不放大在高分屏上笔迹会发虚），返回 CSS 像素坐标系的上下文 */
function canvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = inkColor();
  return ctx;
}

/** 画一条笔画 */
function traceStroke(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  width: number,
  height: number,
  from = 0,
) {
  const points = stroke.points.map((point) => ({
    x: point.x * width,
    y: point.y * height,
    w: Math.max(1, point.w * height),
  }));
  if (points.length === 0) return;
  if (points.length === 1) {

    const only = points[0];
    ctx.beginPath();
    ctx.fillStyle = inkColor();
    ctx.arc(only.x, only.y, only.w / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = Math.max(1, from); i < points.length; i += 1) {
    const prev = points[i - 1];
    const current = points[i];
    const before = points[i - 2] ?? prev;
    const startX = (before.x + prev.x) / 2;
    const startY = (before.y + prev.y) / 2;
    const endX = (prev.x + current.x) / 2;
    const endY = (prev.y + current.y) / 2;
    ctx.beginPath();
    ctx.lineWidth = current.w;
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(prev.x, prev.y, endX, endY);
    ctx.stroke();

    if (i === points.length - 1) {
      ctx.beginPath();
      ctx.lineWidth = current.w;
      ctx.moveTo(endX, endY);
      ctx.lineTo(current.x, current.y);
      ctx.stroke();
    }
  }
}

/** 重绘整块画布（撤销、清空、尺寸变化都走这里） */
function repaint(canvas: HTMLCanvasElement, strokes: InkStroke[], extra?: InkStroke | null) {
  const ctx = canvasContext(canvas);
  if (!ctx) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  for (const stroke of strokes) traceStroke(ctx, stroke, width, height);
  if (extra) traceStroke(ctx, extra, width, height);
}

/** 导出用的是画布的 2 倍分辨率，缩略图和打印都够清晰 */
function exportSignature(canvas: HTMLCanvasElement, strokes: InkStroke[]): string {
  const width = Math.max(320, Math.round((canvas.clientWidth || 640) * 2));
  const height = Math.max(120, Math.round((canvas.clientHeight || 200) * 2));
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持 canvas，无法导出签名');
  ctx.fillStyle = paperColor();
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = inkColor();
  for (const stroke of strokes) traceStroke(ctx, stroke, width, height);
  return out.toDataURL('image/png');
}

/** dataURL → Blob：上传要的是二进制 */
function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const head = comma >= 0 ? dataUrl.slice(0, comma) : '';
  const mime = /:(.*?);/.exec(head)?.[1] || 'image/png';
  const binary = atob(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** ------ 组件 ------ */

export default function Signature(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const { message } = App.useApp();


  const params = useParams<{ id?: string }>();
  const projectId = params.id ?? '';
  const [answer, setAnswer] = useAnswerState(props);
  const blank = blankId(schema) ?? schema.id;
  const fileId = signatureFileId(answer, blank);
  const locked = mode !== 'answer' || Boolean(disabled);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<InkStroke[]>([]);
  const draftRef = useRef<InkStroke | null>(null);
  const pointerRef = useRef<number | null>(null);
  const lastRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const [pen, setPen] = useState(PEN_SIZES[1].value);

  const [inkCount, setInkCount] = useState(0);

  const [touched, setTouched] = useState(false);

  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [brokenPreview, setBrokenPreview] = useState(false);


  const showPad = locked || editing || !fileId;
  const cachedPreview = fileId ? previewCache.get(fileId) : undefined;

  const imageSrc = cachedPreview ?? (fileId ? '/api/public/preview/' + fileId : '');
  const showImage = Boolean(cachedPreview) || (Boolean(imageSrc) && !brokenPreview);


  useEffect(() => {
    setEditing(false);
  }, [schema.id]);

  useEffect(() => {
    setBrokenPreview(false);
  }, [fileId]);


  useEffect(() => {
    if (!showPad) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    repaint(canvas, strokesRef.current, draftRef.current);
    const observer = new ResizeObserver(() => repaint(canvas, strokesRef.current, draftRef.current));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [showPad]);

  /** 速度 → 线宽：运笔越快越细；压感只认手写笔（鼠标恒为 0.5、触摸恒为 1，用了反而失真） */
  const widthUnit = (canvas: HTMLCanvasElement, speed: number, pressure: number) => {
    const swift = Math.min(1, speed / FAST_SPEED);
    const base = pen * (1 - swift * (1 - THIN_RATIO));
    const weight = pressure > 0 ? 0.65 + pressure * 0.7 : 1;
    return Math.max(1, base * weight) / Math.max(1, canvas.clientHeight);
  };

  const pointOf = (event: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp01(rect.width ? (event.clientX - rect.left) / rect.width : 0),
      y: clamp01(rect.height ? (event.clientY - rect.top) / rect.height : 0),
    };
  };

  const handleDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (locked || event.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = pointOf(event, canvas);

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // 合成事件或指针已失效时浏览器会抛 NotFoundError，忽略即可，画布照样能画
    }
    pointerRef.current = event.pointerId;
    lastRef.current = { x: point.x, y: point.y, t: event.timeStamp };
    const pressure = event.pointerType === 'pen' ? event.pressure : 0;
    const width = widthUnit(canvas, 0, pressure);
    draftRef.current = { points: [{ x: point.x, y: point.y, w: width }] };
    setTouched(true);

    const ctx = canvasContext(canvas);
    if (ctx) {
      ctx.beginPath();
      ctx.fillStyle = inkColor();
      ctx.arc(
        point.x * canvas.clientWidth,
        point.y * canvas.clientHeight,
        (width * canvas.clientHeight) / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  };

  const handleMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const draft = draftRef.current;
    const canvas = canvasRef.current;
    const last = lastRef.current;
    if (locked || !draft || !canvas || !last || pointerRef.current !== event.pointerId) return;
    const point = pointOf(event, canvas);

    const distance = Math.hypot(
      (point.x - last.x) * canvas.clientWidth,
      (point.y - last.y) * canvas.clientHeight,
    );
    const speed = distance / Math.max(1, event.timeStamp - last.t);
    const pressure = event.pointerType === 'pen' ? event.pressure : 0;
    draft.points.push({ x: point.x, y: point.y, w: widthUnit(canvas, speed, pressure) });
    lastRef.current = { x: point.x, y: point.y, t: event.timeStamp };
    const ctx = canvasContext(canvas);
    if (ctx) {
      traceStroke(ctx, draft, canvas.clientWidth, canvas.clientHeight, draft.points.length - 1);
    }
  };

  const handleUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerRef.current !== event.pointerId) return;
    const canvas = canvasRef.current;
    const draft = draftRef.current;
    pointerRef.current = null;
    draftRef.current = null;
    lastRef.current = null;
    if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!canvas || !draft || draft.points.length === 0) return;
    strokesRef.current = [...strokesRef.current, draft];
    setInkCount(strokesRef.current.length);

    repaint(canvas, strokesRef.current);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setInkCount(strokesRef.current.length);
    setTouched(strokesRef.current.length > 0);
    repaint(canvas, strokesRef.current);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    strokesRef.current = [];
    draftRef.current = null;
    pointerRef.current = null;
    setInkCount(0);
    setTouched(false);
    if (canvas) repaint(canvas, []);
  };

  const startResign = () => {
    clear();
    setBrokenPreview(false);
    setEditing(true);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) {
      message.warning('请先手写签名');
      return;
    }
    if (!projectId) {
      message.error('当前页面缺少试卷信息，无法保存签名');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = exportSignature(canvas, strokesRef.current);
      const form = new FormData();
      form.append('file', dataUrlToBlob(dataUrl), 'signature.png');
      form.append('projectId', projectId);
      form.append('questionId', schema.id);
      form.append('fileType', String(FILE_TYPE_ANSWER_ATTACHMENT));
      form.append('publicUpload', 'true');
      const uploaded = await post<{ id?: string }>('/api/public/upload', form);
      if (!uploaded?.id) throw new Error('上传失败：接口没有返回文件 id');
      rememberPreview(uploaded.id, dataUrl);
      setAnswer({ [blank]: uploaded.id });
      strokesRef.current = [];
      setInkCount(0);
      setTouched(false);
      setEditing(false);
      message.success('签名已保存');
    } catch (error) {
      message.error((error as Error).message || '签名上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const hint = locked
    ? mode === 'answer'
      ? '本题已设为不可作答'
      : '设计器中只读预览，答题时可手写签名'
    : schema.attribute?.placeholder || '请在此手写签名';

  return (
    <QuestionFrame schema={schema} number={number}>
      <div className="sk-sign">
        {showPad ? (
          <>
            <div className={locked ? 'sk-sign-pad locked' : 'sk-sign-pad'}>
              <canvas
                ref={canvasRef}
                className="sk-sign-canvas"
                role="img"
                aria-label="手写签名区域"
                onPointerDown={handleDown}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={handleUp}
              />
              {!touched && <span className="sk-sign-hint">{hint}</span>}
            </div>
            {!locked && (
              <div className="sk-sign-tools">
                <span className="sk-sign-tools-label">笔粗</span>
                <Segmented
                  size="small"
                  value={pen}
                  options={PEN_SIZES}
                  onChange={(value) => setPen(Number(value))}
                />
                <Button size="small" icon={<UndoOutlined />} disabled={inkCount === 0} onClick={undo}>
                  撤销
                </Button>
                <Button size="small" icon={<ClearOutlined />} disabled={inkCount === 0} onClick={clear}>
                  清空
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={uploading}
                  disabled={inkCount === 0}
                  onClick={() => void save()}
                >
                  保存签名
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="sk-sign-thumb-wrap">
            {showImage ? (
              <img
                className="sk-sign-thumb"
                src={imageSrc}
                alt="已上传的手写签名"
                onError={() => setBrokenPreview(true)}
              />
            ) : (
              <div className="sk-sign-broken">签名已保存，当前环境无法预览原图</div>
            )}
            {!locked && (
              <Button size="small" icon={<EditOutlined />} onClick={startResign}>
                重签
              </Button>
            )}
          </div>
        )}
      </div>
    </QuestionFrame>
  );
}
