import { useCallback, useEffect, useState } from 'react';
import { App, Button, Drawer, Empty, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { download, getWithPagination, post } from '../../api';

/** 与后端班级答卷列表项对齐 */
interface ClassAnswerRow {
  id: string;
  projectId?: string;
  createBy?: string;
  createByName?: string;
  examScore?: number | null;
  /** 后端 Date 序列化：字符串或 epoch 毫秒 */
  createAt?: string | number;
  tempSave?: number;
}

/**
 * 导出本班答卷：先用 POST /api/answer/export/token 换一次性 token，
 * 再走带 cookie 的 download 下载 xlsx（后端错误会以 JSON 返回并转成中文提示）。
 */
export async function downloadClassAnswers(params: {
  projectId: string;
  deptId: string;
  projectName?: string;
  deptName?: string;
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
    },
    fileName,
  );
}

const scoreText = (value?: number | null) =>
  value === null || value === undefined || Number.isNaN(Number(value)) ? '—' : Number(value).toFixed(1);

/**
 * 某个班的答卷抽屉：按 projectId + deptId 分页拉取学员答卷，并支持导出本班 xlsx。
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

  const doExport = async () => {
    if (exporting || !projectId || !deptId) return;
    setExporting(true);
    try {
      await downloadClassAnswers({ projectId, deptId, projectName, deptName });
      message.success('导出已开始');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<ClassAnswerRow> = [
    {
      title: '学员',
      dataIndex: 'createByName',
      width: 160,
      render: (_: unknown, row) => row.createByName || row.createBy || '—',
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
      render: (value?: number) =>
        value === 1 ? <Tag color="success">已交卷</Tag> : <Tag>暂存</Tag>,
    },
  ];

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
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={() => void doExport()}>
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
    </Drawer>
  );
}
