import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Checkbox, DatePicker, Drawer, Empty, Modal, Progress, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  cancelAnswerPdfJob,
  createAnswerPdfJob,
  download,
  downloadAnswerPdfJob,
  getAnswerPdfJob,
  getWithPagination,
  post,
} from '../../api';
import type { AnswerPdfJobView } from '../../api';

/** 与后端班级答卷列表项对齐 */
interface ClassAnswerRow {
  id: string;
  projectId?: string;
  createBy?: string;
  createByName?: string;
  answererName?: string;
  isAnonymous?: boolean;
  examScore?: number | null;
  /** 后端 Date 序列化：字符串或 epoch 毫秒 */
  createAt?: string | number;
  tempSave?: number;
  gradeStatus?: string;
}

/** 导出设置：弹窗里的选择 */
interface ExportOptions {
  /** 第几次作答（从 0 开始）；undefined = 全部轮次 */
  attemptNo?: number;
  range?: [Dayjs, Dayjs] | null;
  includeAnalysis: boolean;
  includeImages: boolean;
  excel: boolean;
  pdf: boolean;
}

const DEFAULT_OPTIONS: ExportOptions = {
  attemptNo: undefined,
  range: null,
  // 解析默认关：考试没结束时放解析等于泄题，老师要显式勾
  includeAnalysis: false,
  // 签名/上传图片默认带上：成绩单没有签名图就没法核对
  includeImages: true,
  excel: true,
  pdf: true,
};

/**
 * 导出本班答卷：先用 POST /api/answer/export/token 换一次性 token，
 * 再走带 cookie 的 download 下载 xlsx（后端错误会以 JSON 返回并转成中文提示）。
 *
 * 新增的 startTime / endTime 是可选参数：老调用方（工作台一行一个导出按钮）不传就保持
 * 原来的「整班、全部轮次」语义。
 */
export async function downloadClassAnswers(params: {
  projectId: string;
  deptId: string;
  projectName?: string;
  deptName?: string;
  startTime?: string;
  endTime?: string;
}) {
  const tokenRes = await post<{ exportToken?: string; expiresIn?: number }>('/api/answer/export/token', {});
  const fileName = `${params.projectName || '考试'}-${params.deptName || '班级'}-答卷.xlsx`;
  await download(
    '/api/answer/download',
    {
      projectId: params.projectId,
      classId: params.deptId,
      type: 'answer',
      exportToken: tokenRes?.exportToken,
      startTime: params.startTime,
      endTime: params.endTime,
    },
    fileName,
  );
}

const scoreText = (value?: number | null) =>
  value === null || value === undefined || Number.isNaN(Number(value)) ? '—' : Number(value).toFixed(1);

const ATTEMPT_OPTIONS = [1, 2, 3, 4, 5].map((ordinal) => ({ value: ordinal - 1, label: `第 ${ordinal} 次作答` }));

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

/**
 * 某个班的答卷抽屉：按 projectId + deptId 分页拉取学员答卷，并支持导出本班答卷
 * （Excel 明细走原来的同步下载；PDF 成绩单走异步任务 + 进度轮询）。
 */
export default function ClassAnswersDrawer({
  open,
  projectId,
  deptId,
  deptName,
  projectName,
  onClose,
}: {
  open: boolean;
  projectId: string;
  deptId: string;
  deptName?: string;
  projectName?: string;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ClassAnswerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);
  const [job, setJob] = useState<AnswerPdfJobView | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);
  const polling = useRef(false);
  const jobRef = useRef<AnswerPdfJobView | null>(null);
  const running = !!job && (job.status === 'queued' || job.status === 'running');

  const load = useCallback(async () => {
    if (!open || !projectId || !deptId) return;
    setLoading(true);
    try {
      const res = await getWithPagination<ClassAnswerRow>('/api/teaching/classes/answers', {
        projectId,
        deptId,
        current: page,
        pageSize,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setTotal(res?.total ?? 0);
    } catch (e) {
      message.error((e as Error).message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [open, projectId, deptId, page, pageSize, message]);

  useEffect(() => {
    void load();
  }, [load]);

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

  /** 下载 ZIP：token 是一次性的，下载前重新换一个 */
  const downloadJob = useCallback(
    async (current: AnswerPdfJobView) => {
      const tokenRes = await post<{ exportToken?: string }>('/api/answer/export/token', {});
      const fallbackName = `${projectName || '考试'}-${deptName || '班级'}-答卷PDF.zip`;
      await downloadAnswerPdfJob(current.jobId, tokenRes?.exportToken, current.fileName || fallbackName);
    },
    [deptName, projectName],
  );

  /** 任务跑完：自动下载；失败：把后端的中文原因留在弹窗里 */
  const finishJob = useCallback(
    async (current: AnswerPdfJobView) => {
      stopPolling();
      if (current.done <= 0) {
        setJobError(current.error || current.message || '这个班还没有可导出的答卷');
        setJob(null);
        return;
      }
      try {
        await downloadJob(current);
        message.success(current.message ? `${current.message}，已开始下载` : '导出完成，已开始下载');
        setJob(null);
        setExportOpen(false);
      } catch (e) {
        setJobError((e as Error).message);
        setJob(null);
      }
      if (current.failed > 0) {
        message.warning(current.message || '部分答卷生成失败，已跳过');
      }
    },
    [downloadJob, message, stopPolling],
  );

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      // 2 秒一轮：太密会把 4 核机器拖慢，太疏进度条看起来像卡住
      pollTimer.current = window.setInterval(
        () => {
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
        },
        2000,
      );
    },
    [finishJob, stopPolling],
  );

  /** 关弹窗/关抽屉时清理：还在跑的先把任务取消，别让它在后台白烧 CPU */
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

  const openExportModal = () => {
    setJobError(null);
    setJob(null);
    setOptions(DEFAULT_OPTIONS);
    setExportOpen(true);
  };

  const closeExportModal = () => {
    if (exporting) return;
    abortRunningJob();
    setJobError(null);
    setExportOpen(false);
  };

  const submitExport = async () => {
    if (exporting || running) return;
    if (!options.excel && !options.pdf) {
      setJobError('请至少选择一种导出格式');
      return;
    }
    if (!projectId || !deptId) return;
    setJobError(null);
    setExporting(true);
    const startTime = options.range?.[0]?.format('YYYY-MM-DD HH:mm:ss');
    const endTime = options.range?.[1]?.format('YYYY-MM-DD HH:mm:ss');
    let excelFailed: string | null = null;
    try {
      if (options.excel) {
        try {
          await downloadClassAnswers({ projectId, deptId, projectName, deptName, startTime, endTime });
          message.success('Excel 明细已开始下载');
        } catch (e) {
          excelFailed = (e as Error).message;
        }
      }
      if (options.pdf) {
        const tokenRes = await post<{ exportToken?: string }>('/api/answer/export/token', {});
        const created = await createAnswerPdfJob(
          {
            projectId,
            classId: deptId,
            attemptNo: options.attemptNo,
            startTime,
            endTime,
            includeAnalysis: options.includeAnalysis,
            includeImages: options.includeImages,
          },
          tokenRes?.exportToken,
        );
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
        setExportOpen(false);
      }
      if (excelFailed) {
        // Excel 失败但 PDF 已经在跑：把原因留在弹窗里，不要直接吞掉
        setJobError(`Excel 明细导出失败：${excelFailed}`);
      }
    } catch (e) {
      // 后端的中文提示（例如「当前有考试进行中，答卷 PDF 导出已暂停…」）原样展示
      setJobError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<ClassAnswerRow> = [
    {
      title: '学员',
      dataIndex: 'createByName',
      width: 160,
      render: (_: unknown, row) => {
        if (row.isAnonymous && !row.answererName) return <Tag>匿名</Tag>;
        return row.answererName || row.createByName || row.createBy || '—';
      },
    },
    {
      title: '交卷时间',
      dataIndex: 'createAt',
      width: 180,
      render: (value?: string | number) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'),
    },
    {
      title: '分数',
      dataIndex: 'examScore',
      width: 100,
      render: (value?: number | null) => scoreText(value),
    },
    {
      title: '状态',
      dataIndex: 'tempSave',
      width: 100,
      render: (value?: number) => (value === 1 ? <Tag color="success">已交卷</Tag> : <Tag>暂存</Tag>),
    },
  ];

  const percent = job && job.total > 0 ? Math.min(100, Math.round((job.done * 100) / job.total)) : 0;

  return (
    <Drawer
      title={`答卷：${projectName || '考试'} / ${deptName || '班级'}`}
      open={open}
      onClose={onClose}
      width="min(720px, 94vw)"
      destroyOnClose
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>共 {total} 份</span>
        <div style={{ flex: 1 }} />
        <Button icon={<DownloadOutlined />} onClick={openExportModal}>
          导出本班答卷
        </Button>
      </div>

      <Table<ClassAnswerRow>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 560 }}
        pagination={{
          current: page,
          pageSize,
          total,
          size: 'small',
          showSizeChanger: false,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            if (nextSize && nextSize !== pageSize) setPageSize(nextSize);
          },
        }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这个班还没有答卷" /> }}
      />

      <Modal
        title="导出本班答卷"
        open={exportOpen}
        onCancel={closeExportModal}
        onOk={() => void submitExport()}
        okText={running ? '生成中…' : '开始导出'}
        cancelText={running ? '取消导出' : '关闭'}
        confirmLoading={exporting}
        okButtonProps={{ disabled: running }}
        maskClosable={false}
        destroyOnClose
        width={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 6 }}>作答轮次</div>
            <Select
              style={{ width: '100%' }}
              allowClear
              placeholder="全部轮次"
              value={options.attemptNo}
              onChange={(value?: number) => setOptions((prev) => ({ ...prev, attemptNo: value }))}
              options={ATTEMPT_OPTIONS}
              disabled={running}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--bp-text-soft)' }}>
              补考才有第 2 次及以后；轮次与时间范围目前只对 PDF 成绩单生效，Excel 明细保持整班导出
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 6 }}>交卷时间范围</div>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              showTime
              value={options.range ?? undefined}
              onChange={(value) =>
                setOptions((prev) => ({
                  ...prev,
                  range: value && value[0] && value[1] ? [value[0], value[1]] : null,
                }))
              }
              disabled={running}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6 }}>PDF 内容</div>
            <Space direction="vertical" size={4}>
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
          </div>
          <div>
            <div style={{ marginBottom: 6 }}>导出格式</div>
            <Space direction="vertical" size={4}>
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
                PDF 成绩单（.zip，每人一份，含答题解析）
              </Checkbox>
            </Space>
          </div>

          {jobError && <Alert type="error" showIcon message={jobError} />}

          {job && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>{jobStatusText(job.status)}</span>
                <span>
                  {job.total > 0 ? `已生成 ${job.done}/${job.total}` : '正在统计份数…'}
                  {job.failed > 0 ? `，失败 ${job.failed}` : ''}
                </span>
              </div>
              <Progress percent={percent} status={job.status === 'failed' ? 'exception' : undefined} size="small" />
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--bp-text-soft)' }}>
                关闭弹窗会取消正在生成的 PDF 任务
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Drawer>
  );
}
