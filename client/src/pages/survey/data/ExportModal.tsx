/**
 * 答卷导出弹窗：Excel 明细（同步下载）+ 每人一份 PDF（异步任务，2 秒轮询进度）。
 *
 * <p>两个出口的令牌是分开的：Excel 走 /api/repo/export/token、PDF 走 /api/answer/export/token，
 * 都要带导出密码（系统没配密码时留空）。一次性 token 只能用一次，所以 PDF 建任务、下载 ZIP
 * 各自换一个新的——这和教学页的 ClassAnswersDrawer 是同一套实现，这里只是多了「仅勾选」范围。
 *
 * <p>范围默认「当前筛选结果」；表格里勾了卷子就多一个「仅勾选」并默认选中——老师从一大张表里
 * 挑了几份再点导出，意图几乎总是「就导这几份」。勾选范围只按 ids 取数，班级/时间/分数一律不再叠加，
 * 免得「我明明勾了 5 份，导出只有 3 份」。
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

interface ExportOptions {
  /** Excel 明细（.xlsx，同步下载） */
  excel: boolean;
  /** 每人一份 PDF 打包成 ZIP（异步任务） */
  pdf: boolean;
  /** 导出范围：当前筛选结果 / 仅勾选 */
  scope: ExportScope;
  /** 是否附答案解析：默认关 —— 考试没结束时放解析等于泄题 */
  includeAnalysis: boolean;
  /** 是否附签名/上传图片：默认开 —— 成绩单没有签名图没法核对 */
  includeImages: boolean;
}

const DEFAULT_OPTIONS: ExportOptions = {
  excel: true,
  pdf: true,
  scope: 'filtered',
  includeAnalysis: false,
  includeImages: true,
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
  return active;
}

export interface ExportModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  /** 当前筛选条件（不含 ids / exportToken）：「当前筛选结果」直接用它 */
  filters: AnswerFilterParams;
  /** 当前筛选命中的份数，只用于文案 */
  filteredCount: number;
  /** 表格里勾选的答卷 id */
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
  /** 提交时的密码：建任务/取文件都要重新换 token，闭包里读它避免拿到旧值 */
  const passwordRef = useRef('');

  const running = !!job && (job.status === 'queued' || job.status === 'running');
  const hasSelection = selectedIds.length > 0;

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

  /** 任务跑完：换新 token 下载 ZIP；一份都没成功就把后端的中文原因留在弹窗里 */
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
        const fallback = `${projectName || '答卷'}-答卷PDF.zip`;
        await downloadAnswerPdfJob(current.jobId, tokenRes?.exportToken, current.fileName || fallback);
        message.success(current.message ? `${current.message}，已开始下载` : 'PDF 已生成，开始下载');
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
      // 2 秒一轮：太密会把 4 核机器拖慢，太疏进度条看起来像卡住
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

  // 每次打开都回到默认：勾了卷子就默认「仅勾选」，并把上次的密码/进度清掉
  useEffect(() => {
    if (!open) return;
    setOptions({ ...DEFAULT_OPTIONS, scope: selectedIds.length > 0 ? 'selected' : 'filtered' });
    setPassword('');
    passwordRef.current = '';
    setJob(null);
    setJobError(null);
    setExporting(false);
  }, [open, selectedIds.length]);

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
    if (!options.excel && !options.pdf) {
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
              // 后端 DownloadQuery 默认 pageSize=20，只导当页；-1 才是全量
              pageSize: -1,
              // 仅勾选时只按 ids 取：班级/时间/分数再叠一层会让人「勾了却导不出」
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

      if (options.pdf) {
        const tokenRes = await issueToken('/api/answer/export/token');
        /**
         * 冻结契约里 pdf-job 只要班级 / ids / 时间，classId 可空；而 api 层的 AnswerPdfJobRequest
         * 还是「classId 必填、没有 ids」的旧形状（api 层由别人维护，本任务不改）。
         * 所以这里按契约拼 body，只在这一处断言，别处仍用原来的类型。
         */
        const body = {
          projectId,
          // 契约里就这几个字段：仅勾选只给 ids；否则给班级 + 交卷时间
          ...(byIds
            ? { ids }
            : { classId: filters.classId, startTime: filters.startTime, endTime: filters.endTime }),
          includeAnalysis: options.includeAnalysis,
          includeImages: options.includeImages,
        } as unknown as AnswerPdfJobRequest;
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
        // 只导 Excel：已经在下载了，直接收尾
        onClose();
      }

      if (excelFailed) {
        // Excel 失败但 PDF 已在跑：把原因留在弹窗里，别静默吞掉
        setJobError(`Excel 明细导出失败：${excelFailed}`);
      }
    } catch (e) {
      // 后端中文提示（导出密码错误 / 这个班没有答卷…）原样展示
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
            <Checkbox
              checked={options.pdf}
              disabled={running}
              onChange={(e) => setOptions((prev) => ({ ...prev, pdf: e.target.checked }))}
            >
              PDF 成绩单（.zip，每人一份）
            </Checkbox>
          </Space>
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

        {options.pdf && (
          <div>
            <div style={{ marginBottom: 6 }}>PDF 内容</div>
            <Space orientation="vertical" size={4}>
              <Checkbox
                checked={options.includeAnalysis}
                disabled={running}
                onChange={(e) => setOptions((prev) => ({ ...prev, includeAnalysis: e.target.checked }))}
              >
                附答案解析（考试未结束时请勿勾选）
              </Checkbox>
              <Checkbox
                checked={options.includeImages}
                disabled={running}
                onChange={(e) => setOptions((prev) => ({ ...prev, includeImages: e.target.checked }))}
              >
                附签名题 / 上传题图片
              </Checkbox>
            </Space>
            {!running && options.scope === 'filtered' && filterHints.length > 0 && (
              // 契约里 pdf-job 只收班级 + 交卷时间；批改状态/分数/姓名只有 Excel 明细认
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--bp-text-soft)' }}>
                PDF 成绩单按「班级 + 交卷时间」取数；批改状态 / 分数段 / 姓名只作用于 Excel 明细
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
              关掉弹窗会取消正在生成的 PDF 任务
            </div>
          </div>
        )}

        {!job && options.pdf && !running && (
          <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
            每人一份 PDF 是一份一份渲染的（几十份要等一会儿），生成期间可以关掉弹窗取消。
          </div>
        )}
      </div>
    </Modal>
  );
}
