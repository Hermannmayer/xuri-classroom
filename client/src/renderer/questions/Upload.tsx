/**
 * 上传题：选文件 → POST /api/public/upload → 答案写回 { 空位id: [fileId, ...] }（与后端约定一致）。
 *
 * 三态（和签名题同一套）：
 * - answer：可上传、可删除。已传文件按 fileId 回显：图片出缩略图，其余出文件名 + 下载链接。
 * - preview / edit：只读。设计器里没有答卷上下文（没有 projectId），禁止上传，
 *   只让设计者看到这块区域长什么样。
 *
 * 文件名回显：答案里只有 fileId，后端没有「按 id 列表给匿名用户查文件名」的接口，
 * 所以本次会话刚上传的文件名 / 是否图片记在内存缓存里（同 Signature 的 previewCache 思路）；
 * 刷新页面后认不出的文件先按图片试一次，加载失败再退回「附件 N + 下载链接」，不留破图。
 */
import { useRef, useState } from 'react';
import { App, Button } from 'antd';
import { DeleteOutlined, FileOutlined, UploadOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { post } from '../../api';
import type { AnswerValue, QuestionComponentProps } from '../types';
import { blankId } from './answers';
import { QuestionFrame, questionA11yIds, useAnswerState } from './shared';
import '../../styles/upload.css';

/* ------ 常量 ------ */

/** 后端 AppConsts.FileType.ANSWER_ATTACHMENT */
const FILE_TYPE_ANSWER_ATTACHMENT = 4;

/** 默认允许的类型：图片 + 常见办公文档。accept 只是浏览器的筛选提示，真正的白名单在服务端 */
const DEFAULT_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';

/** 题目没配 maxFileSize / maxFileCount 时的兜底（与设计器建题的默认值一致） */
const DEFAULT_MAX_SIZE_MB = 5;
const DEFAULT_MAX_COUNT = 1;

/** 回显缓存上限：只缓存本次会话刚上传的文件，够用又不会一直涨 */
const FILE_CACHE_LIMIT = 50;

/** 图片扩展名：按钮文案（选择图片/选择文件）和「拿不到 MIME 时按扩展名判断」都用它 */
const IMAGE_EXT = /^(jpe?g|png|gif|bmp|webp|svg)$/i;

/* ------ 类型 ------ */

/** 上传成功后缓存的展示信息：答案里只有 fileId，名字和是否图片只能记在内存里 */
interface FileMeta {
  name: string;
  image: boolean;
}

interface UploadedFile {
  id: string;
  name: string;
  image: boolean;
}

/* ------ 回显缓存 ------ */

const fileCache = new Map<string, FileMeta>();

function rememberFile(fileId: string, meta: FileMeta) {
  if (fileCache.size >= FILE_CACHE_LIMIT) fileCache.clear();
  fileCache.set(fileId, meta);
}

/* ------ 取值 / 规范化 ------ */

/** 公开预览地址：答卷附件类型后端已放开（FileServiceImpl#isAnswerAttachment），匿名也能取 */
function previewUrl(fileId: string): string {
  return '/api/public/preview/' + fileId;
}

/**
 * 答案 → 文件 id 列表。
 * 正式格式是 { 空位id: [fileId, ...] }；同时兼容签名那样的单值 { 空位id: fileId }，
 * 以及早期/手写数据用题目 id 当 key 的情况（不能因为 key 不同就当成没答）。
 */
function fileIdsOf(answer: AnswerValue, blank: string): string[] {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return [];
  const map = answer as Record<string, unknown>;
  const raw =
    map[blank] ?? Object.values(map).find((value) => Array.isArray(value) || typeof value === 'string');
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  const ids: string[] = [];
  for (const item of list) {
    // 去空、去重：后端按 id 列表取附件，重复 id 会在回显里出现两张一样的卡片
    if (typeof item === 'string' && item && !ids.includes(item)) ids.push(item);
  }
  return ids;
}

/** 取第一个有效的正数配置；空值 / 0 / 负数一律当作「没配」，与后端 toBytes 的口径一致 */
function firstPositive(values: Array<number | undefined>, fallback: number): number {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return fallback;
}

/**
 * accept 规范化：设计器里填的是 'png,jpg' 这种裸扩展名，HTML accept 要 '.png,.jpg'；
 * 带 '/' 的 MIME（image/*、application/pdf）原样保留。留空或解析不出东西时回退默认值。
 */
function normalizeAccept(raw?: string): string {
  const tokens = (raw ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  const normalized: string[] = [];
  for (const token of tokens) {
    // '*.png' / 'png' / '.png' 都归一成 '.png'
    const item = token.includes('/') ? token : '.' + token.replace(/^\*?\.?/, '');
    if (item !== '.' && !normalized.includes(item)) normalized.push(item);
  }
  return normalized.length ? normalized.join(',') : DEFAULT_ACCEPT;
}

/** accept 只含图片时按钮说「选择图片」，否则说「选择文件」 */
function imageOnly(accept: string): boolean {
  return accept.split(',').every((token) => {
    const item = token.trim().toLowerCase();
    if (item.startsWith('image/')) return true;
    return IMAGE_EXT.test(item.replace(/^\./, ''));
  });
}

/* ------ 组件 ------ */

export default function Upload(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const { message } = App.useApp();
  // 答题页和后端补录都把项目 id 放在路由参数 id 上（/s/:id、/survey/:id/data），
  // 上传接口需要它来定位项目；设计器里没有，这里只能是空串。
  const params = useParams<{ id?: string }>();
  const projectId = params.id ?? '';
  const [answer, setAnswer] = useAnswerState(props);
  const blank = blankId(schema) ?? schema.id;
  const fileIds = fileIdsOf(answer, blank);
  const locked = mode !== 'answer' || Boolean(disabled);

  // 上限优先取题目自身属性（设计器把这个写在 attribute 上）；空位节点上的属性是后端
  // getUploadAttribute 的首选，老数据/导入数据可能只有它，作为兜底 —— 都没配就用默认的 5MB / 1 个
  const blankAttr = schema.children?.[0]?.attribute;
  const maxCount = Math.max(
    1,
    Math.floor(firstPositive([schema.attribute?.maxFileCount, blankAttr?.maxFileCount], DEFAULT_MAX_COUNT)),
  );
  const maxSizeMb = firstPositive([schema.attribute?.maxFileSize, blankAttr?.maxFileSize], DEFAULT_MAX_SIZE_MB);
  const accept = normalizeAccept(schema.attribute?.fileAccept ?? blankAttr?.fileAccept);

  const inputRef = useRef<HTMLInputElement | null>(null);
  /** 上传中的同步闸门：state 要等下一次渲染才更新，同一帧里来第二个 change 会并发写答案 */
  const uploadingRef = useRef(false);
  /** 上传进度：一次可能选好几个文件，按钮上显示「已完成/总数」 */
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  /** 预览失败的文件（被删 / 无权限 / 根本不是能直接渲染的图片）：退回文件行，不留破图 */
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const full = fileIds.length >= maxCount;

  const markBroken = (fileId: string) =>
    setBroken((prev) => (prev[fileId] ? prev : { ...prev, [fileId]: true }));

  /** 上传单个文件；失败时把后端 message 原样抛出去（request.ts 已经 humanize 过） */
  const uploadOne = async (file: File): Promise<UploadedFile> => {
    const form = new FormData();
    form.append('file', file);
    form.append('projectId', projectId);
    form.append('questionId', schema.id);
    form.append('fileType', String(FILE_TYPE_ANSWER_ATTACHMENT));
    form.append('publicUpload', 'true');
    const uploaded = await post<{ id?: string; originalName?: string }>('/api/public/upload', form);
    if (!uploaded?.id) throw new Error('上传失败：接口没有返回文件 id');
    const extension = /\.([^.]+)$/.exec(file.name)?.[1] ?? '';
    return {
      id: uploaded.id,
      name: uploaded.originalName || file.name,
      // 上传时能拿到 MIME：比按扩展名猜准，也避免把 PDF/表格塞进 <img>；
      // 个别环境拿不到 MIME（type 为空）时退回看扩展名，否则照片会显示成普通附件
      image: file.type ? file.type.startsWith('image/') : IMAGE_EXT.test(extension),
    };
  };

  const openPicker = () => {
    if (locked || uploading) return;
    if (!projectId) {
      message.error('当前页面缺少试卷信息，无法上传文件');
      return;
    }
    if (full) {
      message.warning(`最多上传 ${maxCount} 个文件`);
      return;
    }
    inputRef.current?.click();
  };

  /**
   * 选完文件：先本地校验数量/大小，再逐个上传，每传成一个立刻写回答案。
   * 局部 next 数组是必要的：一次选多个文件时 props 里的答案还没回写，
   * 直接拿 fileIds 当基准会让后一个文件覆盖前一个。
   */
  const handlePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    // 同一个文件重选也要能触发 onChange：立刻清空，不依赖浏览器下次自动重置
    event.target.value = '';
    if (!files.length || locked || uploadingRef.current) return;
    if (!projectId) {
      message.error('当前页面缺少试卷信息，无法上传文件');
      return;
    }

    const limitBytes = maxSizeMb * 1024 * 1024;
    const next = [...fileIds];
    uploadingRef.current = true;
    setUploading({ done: 0, total: files.length });
    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (next.length >= maxCount) {
          message.warning(`最多上传 ${maxCount} 个文件`);
          break;
        }
        if (file.size > limitBytes) {
          message.error(`单个文件不能超过 ${maxSizeMb} MB：${file.name}`);
          continue;
        }
        let uploaded: UploadedFile;
        try {
          uploaded = await uploadOne(file);
        } catch (error) {
          // 已成功的文件不回滚；这一份失败就停下（继续试多半是撞限流/项目状态，只会连累后面的）
          message.error(`${file.name}：${(error as Error).message || '上传失败，请重试'}`);
          break;
        }
        next.push(uploaded.id);
        rememberFile(uploaded.id, { name: uploaded.name, image: uploaded.image });
        setAnswer({ [blank]: [...next] });
        setUploading({ done: i + 1, total: files.length });
      }
    } finally {
      uploadingRef.current = false;
      setUploading(null);
    }
  };

  const removeFile = (fileId: string) => {
    if (locked || uploading) return;
    const next = fileIds.filter((id) => id !== fileId);
    // 一个都不剩时写空对象：答题页的必填校验走 isEmptyAnswer，{ 空位id: [] } 会被当成「已答」
    setAnswer(next.length ? { [blank]: next } : {});
  };

  const hint = locked
    ? mode === 'answer'
      ? '本题已设为不可作答'
      : '设计器中只读预览，答题时可上传文件'
    : full
      ? `已达上限，最多上传 ${maxCount} 个文件`
      : `单个文件不超过 ${maxSizeMb} MB，最多 ${maxCount} 个文件`;
  // 数量上限只有一个时不给 input 开 multiple，选文件面板里就不会出现多选
  const multiple = maxCount > 1;
  const { labelId, descId } = questionA11yIds(schema);

  return (
    <QuestionFrame schema={schema} number={number}>
      <div className="sk-upload" aria-labelledby={labelId} aria-describedby={descId}>
        {fileIds.length > 0 && (
          <ul className="sk-upload-list">
            {fileIds.map((fileId, index) => {
              const meta = fileCache.get(fileId);
              const name = meta?.name || `附件 ${index + 1}`;
              // 有元信息就按元信息渲染；刷新后认不出的先当图片试一次，onError 再退回文件行
              const asImage = !broken[fileId] && (meta ? meta.image : true);
              return (
                <li className="sk-upload-item" key={fileId}>
                  {asImage ? (
                    <img
                      className="sk-upload-image"
                      src={previewUrl(fileId)}
                      alt={name}
                      loading="lazy"
                      onError={() => markBroken(fileId)}
                    />
                  ) : (
                    <div className="sk-upload-file">
                      <FileOutlined className="sk-upload-file-icon" aria-hidden="true" />
                      <a
                        className="sk-upload-file-name"
                        href={previewUrl(fileId)}
                        target="_blank"
                        rel="noreferrer noopener"
                        title="在新标签页打开或下载"
                      >
                        {name}
                      </a>
                    </div>
                  )}
                  {(asImage || !locked) && (
                    <div className="sk-upload-foot">
                      {asImage && (
                        <span className="sk-upload-caption" title={name}>
                          {name}
                        </span>
                      )}
                      {!locked && (
                        <button
                          type="button"
                          className="sk-upload-remove"
                          onClick={() => removeFile(fileId)}
                          disabled={Boolean(uploading)}
                          aria-label={`删除 ${name}`}
                          title="删除"
                        >
                          <DeleteOutlined />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!locked && (
          <div className="sk-upload-tools">
            <Button
              size="small"
              icon={<UploadOutlined />}
              loading={Boolean(uploading)}
              disabled={Boolean(uploading) || full}
              onClick={openPicker}
            >
              {uploading
                ? uploading.done
                  ? `上传中 ${uploading.done}/${uploading.total}`
                  : '上传中…'
                : imageOnly(accept)
                  ? '选择图片'
                  : '选择文件'}
            </Button>
          </div>
        )}

        {uploading && (
          <div className="sk-upload-hint" role="status" aria-live="polite">
            正在上传 {uploading.done}/{uploading.total}，请稍候…
          </div>
        )}
        <div className="sk-upload-hint">{hint}</div>

        <input
          ref={inputRef}
          className="sk-upload-input"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(event) => void handlePicked(event)}
        />
      </div>
    </QuestionFrame>
  );
}
