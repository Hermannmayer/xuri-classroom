/**
 * 答卷导出弹窗：Excel 明细（同步下载）+ 多种「每人一份」产物（异步任务，2 秒轮询进度）。
 *
 * <p>两个出口的令牌是分开的：Excel 走 /api/repo/export/token、异步任务走 /api/answer/export/token，

 * 各自换一个新的——这和教学页的 ClassAnswersDrawer 是同一套实现，这里只是多了「仅勾选」范围。
 *
 * <p>范围默认「当前筛选结果」；表格里勾了卷子就多一个「仅勾选」并默认选中——老师从一大张表里
 * 挑了几份再点导出，意图几乎总是「就导这几份」。勾选范围只按 ids 取数，班级/时间/分数一律不再叠加，
 * 免得「我明明勾了 5 份，导出只有 3 份」。
 *
 * <p>异步产物现在有四种（成绩单 / 答题卷还原 / 长图 PNG / 成绩确认单），但只建一个任务：
 * 后端按 outputs 一次渲染完，统一打进一个 ZIP 并分子目录。拆成四次导出只是在 4 核机器上
 * 把同一批答卷多渲染三遍、多等三倍，没有任何收益。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App, Checkbox, Input, Modal, Progress, Radio, Space } from 'antd';
import {
  cancelAnswerPdfJob,
  createAnswerPdfJob,
  download,
  downloadAnswerPdfJob,
  getAnswerPdfJob,
  post,
} from '../../../api';
import type { AnswerPdfJobRequest, AnswerPdfJobView } from '../../../api';
import type { AnswerFilterParams } from './filters';

type ExportScope = 'filtered' | 'selected';





type PdfOutput = 'answerPdf' | 'answerSheetPdf' | 'answerImage' | 'confirmSheetPdf';









const PDF_FORMATS: { key: PdfOutput; label: string; dir: string }[] = [
  { key: 'answerPdf', label: '成绩单 PDF（每人一份，含得分与批改结果）', dir: '成绩单' },
  { key: 'answerSheetPdf', label: '答题卷 PDF（和学员答题时一样）', dir: '答题卷' },
  { key: 'answerImage', label: '答卷长图（PNG，每人一张，省纸）', dir: '长图' },
  { key: 'confirmSheetPdf', label: '成绩确认单（整班一张表，每人一行，签名列留空手写）', dir: '确认单' },
];

interface ExportOptions {

  excel: boolean;

  answerPdf: boolean;
  answerSheetPdf: boolean;
  answerImage: boolean;
  confirmSheetPdf: boolean;

  scope: ExportScope;

  includeAnalysis: boolean;
}

const DEFAULT_OPTIONS: ExportOptions = {

  excel: true,
  answerPdf: true,
  answerSheetPdf: false,
  answerImage: false,
  confirmSheetPdf: false,
  scope: 'filtered',
  includeAnalysis: false,
};

const jobStatusText = (status: AnswerPdfJobView['status']): string => {
  switch (status) {
    case 'queued':
      return '排队中';
    case 'running':
      return '生成中';
    case 'done':
      return '已完成';
    case 'failed':
      return '失败';
    case 'canceled':
      return '已取消';
    default:
      return status;
  }
};

/** 当前筛选用到了哪些维度：弹窗里用一句话讲清楚「导出的是哪一批」 */
function describeFilters(filters: AnswerFilterParams): string[] {
  const active: string[] = [];
  if (filters.classId) active.push('班级');
  if (filters.startTime || filters.endTime) active.push('交卷时间');
  if (filters.gradeStatus) active.push('批改状态');
  if (filters.createByName) active.push('姓名');
  if (filters.minScore !== undefined || filters.maxScore !== undefined) active.push('分数段');

  if (!filters.includeAnonymous) active.push('仅实名');
  return active;
}

export interface ExportModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;

  filters: AnswerFilterParams;

  filteredCount: number;

  selectedIds: string[];
  onClose: () => void;
}

export default function ExportModal({
  open,
  projectId,
  projectName,
  filters,
  filteredCount,
  selectedIds,
  onClose,
}: ExportModalProps) {
  const { message } = App.useApp();
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);
  const [password, setPassword] = useState('');
  const [exporting, setExporting] = useState(false);
  const [job, setJob] = useState<AnswerPdfJobView | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  const pollTimer = useRef<number | null>(null);
  const polling = useRef(false);
  const jobRef = useRef<AnswerPdfJobView | null>(null);

  const passwordRef = useRef('');

  const running = !!job && (job.status === 'queued' || job.status === 'running');
  const hasSelection = selectedIds.length > 0;
  /** 勾了哪几种异步产物：顺序按 PDF_FORMATS，正好也是 ZIP 子目录的顺序 */
  const outputs = PDF_FORMATS.filter((format) => options[format.key]).map((format) => format.key);
  /** ZIP 里会出现哪些子目录：提示照着勾选动态变，别让人猜里面有没有「长图」 */
  const zipDirs = PDF_FORMATS.filter((format) => options[format.key]).map(
    (format) => `${format.dir}/`,
  );

  useEffect(() => {
    jobRef.current = job;
  }, [job]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    polling.current = false;
  }, []);

  /** 换一次性导出令牌：没配导出密码时后端直接发，配了就必须带对密码 */
  const issueToken = useCallback(
    (path: '/api/repo/export/token' | '/api/answer/export/token') =>
      post<{ exportToken?: string }>(path, { exportPassword: passwordRef.current.trim() || undefined }),
    [],
  );


  const finishJob = useCallback(
    async (current: AnswerPdfJobView) => {
      stopPolling();
      if (current.done <= 0) {
        setJobError(current.error || current.message || '这个范围里没有可导出的答卷');
        setJob(null);
        return;
      }
      try {
        const tokenRes = await issueToken('/api/answer/export/token');

        const fallback = `${projectName || '答卷'}-答卷导出.zip`;
        await downloadAnswerPdfJob(current.jobId, tokenRes?.exportToken, current.fileName || fallback);
        message.success(current.message ? `${current.message}，已开始下载` : '导出包已生成，开始下载');
        setJob(null);
        onClose();
      } catch (e) {
        setJobError((e as Error).message);
        setJob(null);
      }
      if (current.failed > 0) {
        message.warning(current.message || '部分答卷生成失败，已跳过');
      }
    },
    [issueToken, message, onClose, projectName, stopPolling],
  );

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();

      pollTimer.current = window.setInterval(() => {
        if (polling.current) return;
        polling.current = true;
        void (async () => {
          try {
            const view = await getAnswerPdfJob(jobId);
            setJob(view);
            if (view.status === 'done') {
              await finishJob(view);
            } else if (view.status === 'failed' || view.status === 'canceled') {
              stopPolling();
              setJobError(view.error || view.message || (view.status === 'canceled' ? '导出已取消' : '导出失败'));
              setJob(null);
            }
          } catch (e) {
            stopPolling();
            setJobError((e as Error).message);
            setJob(null);
          } finally {
            polling.current = false;
          }
        })();
      }, 2000);
    },
    [finishJob, stopPolling],
  );

  /** 关弹窗时取消还在跑的渲染任务：4 核机器上白烧几分钟 CPU 不是小事 */
  const abortRunningJob = useCallback(() => {
    const current = jobRef.current;
    stopPolling();
    setJob(null);
    if (current && (current.status === 'queued' || current.status === 'running')) {
      void cancelAnswerPdfJob(current.jobId).catch(() => undefined);
    }
  }, [stopPolling]);

  useEffect(() => {
    if (!open) abortRunningJob();
  }, [open, abortRunningJob]);

  useEffect(() => () => stopPolling(), [stopPolling]);


  useEffect(() => {
    if (!open) return;
    setOptions({ ...DEFAULT_OPTIONS, scope: selectedIds.length > 0 ? 'selected' : 'filtered' });
    setPassword('');
    passwordRef.current = '';
    setJob(null);
    setJobError(null);
    setExporting(false);
  }, [open, selectedIds.length]);

  /**
   * 勾/取消一种异步产物。
   *
   * <p>写成「先拷贝再按键赋值」而不是物化计算属性：四种产物都是 boolean，这样 TS 能确认
   * next[key] 的赋值类型对得上，不会把整个 options 摊成索引签名（那样其它字段就悄悄失去类型了）。
   */
  const toggleFormat = (key: PdfOutput, checked: boolean) =>
    setOptions((prev) => {
      const next: ExportOptions = { ...prev };
      next[key] = checked;
      return next;
    });

  const closeModal = () => {
    if (exporting) return;
    abortRunningJob();
    setJobError(null);
    setPassword('');
    passwordRef.current = '';
    onClose();
  };

  const submit = async () => {
    if (exporting || running) return;
    if (!options.excel && outputs.length === 0) {
      setJobError('请至少选择一种导出格式');
      return;
    }
    const byIds = options.scope === 'selected' && hasSelection;
    const ids = byIds ? selectedIds : undefined;
    setJobError(null);
    setExporting(true);
    passwordRef.current = password;
    let excelFailed: string | null = null;
    try {
      if (options.excel) {
        try {
          const tokenRes = await issueToken('/api/repo/export/token');
          await download(
            '/api/answer/download',
            {
              projectId,
              type: 'answer',

              pageSize: -1,

              ...(byIds ? {} : filters),
              ids: ids ? ids.join(',') : undefined,
              exportToken: tokenRes?.exportToken,
            },
            `${projectName || '答卷'}.xlsx`,
          );
          message.success('Excel 明细已开始下载');
        } catch (e) {
          excelFailed = (e as Error).message;
        }
      }

      if (outputs.length > 0) {
        const tokenRes = await issueToken('/api/answer/export/token');



        const body: AnswerPdfJobRequest = {
          projectId,
          ...(byIds
            ? { ids }
            : {
                classId: filters.classId,
                startTime: filters.startTime,
                endTime: filters.endTime,
                gradeStatus: filters.gradeStatus,
                createByName: filters.createByName,
                minScore: filters.minScore,
                maxScore: filters.maxScore,
                includeAnonymous: filters.includeAnonymous,
              }),
          includeAnalysis: options.includeAnalysis,

          outputs,
        };
        const created = await createAnswerPdfJob(body, tokenRes?.exportToken);
        const initial: AnswerPdfJobView = {
          jobId: created.jobId,
          status: 'queued',
          total: 0,
          done: 0,
          failed: 0,
          progress: 0,
        };
        setJob(initial);
        jobRef.current = initial;
        startPolling(created.jobId);
      } else {

        onClose();
      }

      if (excelFailed) {

        setJobError(`Excel 明细导出失败：${excelFailed}`);
      }
    } catch (e) {

      setJobError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const percent = job ? (job.progress ?? (job.total > 0 ? Math.round((job.done * 100) / job.total) : 0)) : 0;
  const filterHints = describeFilters(filters);

  return (
    <Modal
      title="导出答卷"
      open={open}
      onCancel={closeModal}
      onOk={() => void submit()}
      okText={running ? '生成中…' : '开始导出'}
      cancelText={running ? '取消导出' : '关闭'}
      confirmLoading={exporting}
      okButtonProps={{ disabled: running }}
      mask={{ closable: false }}
      destroyOnHidden
      width={520}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ marginBottom: 6 }}>导出格式</div>
          <Space orientation="vertical" size={4}>
            <Checkbox
              checked={options.excel}
              disabled={running}
              onChange={(e) => setOptions((prev) => ({ ...prev, excel: e.target.checked }))}
            >
              Excel 明细（.xlsx，每题一列，含分数与提交信息）
            </Checkbox>
            {PDF_FORMATS.map((format) => (
              <Checkbox
                key={format.key}
                checked={options[format.key]}
                disabled={running}
                onChange={(e) => toggleFormat(format.key, e.target.checked)}
              >
                {format.label}
              </Checkbox>
            ))}
          </Space>

          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--bp-text-soft)' }}>
            长图适合直接发微信（手机上看不用缩放）；确认单是整班一张表，每人一行，签名列留空手写。
          </div>
          {zipDirs.length > 0 && (
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--bp-text-soft)' }}>
              PDF / 长图会打包成一个 ZIP，内部按格式分子目录：{zipDirs.join('、')}
            </div>
          )}
        </div>

        <div>
          <div style={{ marginBottom: 6 }}>导出范围</div>
          <Radio.Group
            value={options.scope}
            disabled={running}
            onChange={(e) => setOptions((prev) => ({ ...prev, scope: e.target.value as ExportScope }))}
          >
            <Space orientation="vertical" size={6}>
              <Radio value="filtered">
                当前筛选结果
                <span style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginInlineStart: 6 }}>
                  {filterHints.length > 0 ? `（${filterHints.join(' / ')}）` : '（整份试卷）'} 共 {filteredCount} 份
                </span>
              </Radio>
              {hasSelection && (
                <Radio value="selected">
                  仅勾选的 {selectedIds.length} 份
                  <span style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginInlineStart: 6 }}>
                    只按勾选的答卷 id 取数
                  </span>
                </Radio>
              )}
            </Space>
          </Radio.Group>
        </div>

        {outputs.length > 0 && (
          <div>
            <div style={{ marginBottom: 6 }}>PDF / 长图内容</div>
            <Space orientation="vertical" size={4}>
              <Checkbox
                checked={options.includeAnalysis}
                disabled={running}
                onChange={(e) => setOptions((prev) => ({ ...prev, includeAnalysis: e.target.checked }))}
              >
                附答案解析（考试未结束时请勿勾选）
              </Checkbox>
            </Space>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--bp-text-soft)' }}>
              签名题 / 上传题的图片始终包含，不用再选；勾了「附解析」，上面每种格式都会带上解析。
            </div>
            {!running && (

              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--bp-text-soft)' }}>
                {options.scope === 'selected'
                  ? '仅勾选：只按勾选的答卷 id 导出，不再叠加批改状态 / 姓名 / 分数段 / 交卷时间等筛选。'
                  : filterHints.length > 0
                    ? `PDF / 长图与 Excel 同口径：${filterHints.join(' / ')}都会带进导出文件。`
                    : 'PDF / 长图与 Excel 同口径：没有筛选条件，导出的就是这份试卷的全部答卷。'}
              </div>
            )}
          </div>
        )}

        <div>
          <div style={{ marginBottom: 6 }}>导出密码</div>
          <Input.Password
            value={password}
            disabled={running}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={() => void submit()}
            placeholder="导出密码（系统未设置时留空）"
            autoComplete="off"
          />
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--bp-text-soft)' }}>
            管理员可在「系统设置 → 内容与隐私」里设置导出密码；未设置密码时直接留空导出即可。
          </div>
        </div>

        {jobError && <Alert type="error" showIcon title={jobError} />}

        {job && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>{jobStatusText(job.status)}</span>
              <span>
                {job.total > 0 ? `已生成 ${job.done}/${job.total}` : '正在统计份数…'}
                {job.failed > 0 ? `，失败 ${job.failed}` : ''}
              </span>
            </div>
            <Progress percent={percent} size="small" status={job.status === 'failed' ? 'exception' : undefined} />
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--bp-text-soft)' }}>
              关掉弹窗会取消正在生成的任务
            </div>
          </div>
        )}

        {!job && outputs.length > 0 && !running && (
          <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
            每份答卷是逐份渲染的（几十份 × 几种格式要等一会儿），生成期间可以关掉弹窗取消。
          </div>
        )}
      </div>
    </Modal>
  );
}
