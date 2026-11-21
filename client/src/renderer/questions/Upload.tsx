/** 上传题：选文件 → POST /api/public/upload → 答案写回 { 空位id: [fileId, ...] }（与后端约定一致） */
import { useRef, useState } from 'react';
import { App, Button } from 'antd';
import { DeleteOutlined, FileOutlined, UploadOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { post } from '../../api';
import type { AnswerValue, QuestionComponentProps } from '../types';
import { blankId } from './answers';
import { QuestionFrame, questionA11yIds, useAnswerState } from './shared';
import '../../styles/upload.css';




const FILE_TYPE_ANSWER_ATTACHMENT = 4;


const DEFAULT_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';


const DEFAULT_MAX_SIZE_MB = 5;
const DEFAULT_MAX_COUNT = 1;


const FILE_CACHE_LIMIT = 50;


const IMAGE_EXT = /^(jpe?g|png|gif|bmp|webp|svg)$/i;




interface FileMeta {
  name: string;
  image: boolean;
}

interface UploadedFile {
  id: string;
  name: string;
  image: boolean;
}



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

/** 答案 → 文件 id 列表 */
function fileIdsOf(answer: AnswerValue, blank: string): string[] {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return [];
  const map = answer as Record<string, unknown>;
  const raw =
    map[blank] ?? Object.values(map).find((value) => Array.isArray(value) || typeof value === 'string');
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  const ids: string[] = [];
  for (const item of list) {

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

/** accept 规范化：设计器里填的是 'png,jpg' 这种裸扩展名，HTML accept 要 '.png,.jpg'； 带 '/' 的 MIME（image/*、application/pdf）原样保留 */
function normalizeAccept(raw?: string): string {
  const tokens = (raw ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  const normalized: string[] = [];
  for (const token of tokens) {

    const item = token.includes('/') ? token : '.' + token.replace(/^\*?\.?/, '');
    if (item !== '.' && !normalized.includes(item)) normalized.push(item);
  }
  return normalized.length ? normalized.join(',') : DEFAULT_ACCEPT;
}


function imageOnly(accept: string): boolean {
  return accept.split(',').every((token) => {
    const item = token.trim().toLowerCase();
    if (item.startsWith('image/')) return true;
    return IMAGE_EXT.test(item.replace(/^\./, ''));
  });
}

/** ------ 组件 ------ */

export default function Upload(props: QuestionComponentProps) {
  const { schema, mode, disabled, number } = props;
  const { message } = App.useApp();


  const params = useParams<{ id?: string }>();
  const projectId = params.id ?? '';
  const [answer, setAnswer] = useAnswerState(props);
  const blank = blankId(schema) ?? schema.id;
  const fileIds = fileIdsOf(answer, blank);
  const locked = mode !== 'answer' || Boolean(disabled);



  const blankAttr = schema.children?.[0]?.attribute;
  const maxCount = Math.max(
    1,
    Math.floor(firstPositive([schema.attribute?.maxFileCount, blankAttr?.maxFileCount], DEFAULT_MAX_COUNT)),
  );
  const maxSizeMb = firstPositive([schema.attribute?.maxFileSize, blankAttr?.maxFileSize], DEFAULT_MAX_SIZE_MB);
  const accept = normalizeAccept(schema.attribute?.fileAccept ?? blankAttr?.fileAccept);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const uploadingRef = useRef(false);

  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);

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

  /** 选完文件：先本地校验数量/大小，再逐个上传，每传成一个立刻写回答案 */
  const handlePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

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

    setAnswer(next.length ? { [blank]: next } : {});
  };

  const hint = locked
    ? mode === 'answer'
      ? '本题已设为不可作答'
      : '设计器中只读预览，答题时可上传文件'
    : full
      ? `已达上限，最多上传 ${maxCount} 个文件`
      : `单个文件不超过 ${maxSizeMb} MB，最多 ${maxCount} 个文件`;

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
