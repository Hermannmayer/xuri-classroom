import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, message, Spin, Switch, Tag } from 'antd';
import { CopyOutlined, DownloadOutlined, EditOutlined, ExportOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { get, getWithPagination, post, updateProject } from '../../api';
import type { Project } from '../../schema/project';
import type { Answer } from '../../schema/project';

interface ReportStat {
  min?: number;
  max?: number;
  average?: number;
  sum?: number;
  total?: number;
}
interface ReportData {
  total?: number;
  statistics?: Record<string, ReportStat>;
  dailyCountStat?: Record<string, number>;
}

/** 项目详情（概述）：分享 + 开关 + 收集趋势，对应旧版 /survey/:id 的仪表盘 */
export default function SurveyOverview() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project>();
  const [report, setReport] = useState<ReportData>();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [qr, setQr] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const shareUrl = useMemo(() => `${location.origin}/s/${id}`, [id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r, list] = await Promise.all([
        get<Project>('/api/project', { id }),
        get<ReportData>(`/api/report/${id}`).catch(() => undefined),
        getWithPagination<Answer>('/api/answer/list', { projectId: id, current: 1, pageSize: 5 }).catch(
          () => ({ current: 1, pageSize: 5, total: 0, data: [] as Answer[] }),
        ),
      ]);
      setProject(p);
      setReport(r);
      setAnswers(list.data);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    QRCode.toDataURL(shareUrl, { width: 320, margin: 1, color: { dark: '#ffffff', light: '#1e3a5f' } })
      .then(setQr)
      .catch(() => undefined);
  }, [shareUrl]);

  const togglePublish = async (checked: boolean) => {
    setSaving(true);
    try {
      await updateProject({ id, settingKey: 'status', settingValue: checked ? 1 : 0 });
      message.success(checked ? '已发布' : '已停止收集');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const daily = useMemo(() => {
    const entries = Object.entries(report?.dailyCountStat ?? {}).sort(([a], [b]) => a.localeCompare(b));
    return { entries, max: Math.max(1, ...entries.map(([, v]) => v)) };
  }, [report]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  const published = project?.setting?.status === 1 || project?.status === 1;
  const answerTotal = report?.total ?? 0;

  return (
    <div>
      {/* 子页面导航：概述 / 编辑 / 设置 / 数据 / 报表 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>OVERVIEW / 概述</div>
          <div className="bp-title" style={{ fontSize: 17, marginTop: 4 }}>
            {project?.name || '未命名'}
          </div>
        </div>
        <Tag color={published ? 'success' : 'default'} style={{ marginLeft: 4 }}>
          {published ? '收集中' : '未发布'}
        </Tag>
        <Tag>{project?.mode === 'exam' ? '考试' : '问卷'}</Tag>
        <div style={{ flex: 1 }} />
        <Link to={`/survey/${id}/edit`}>
          <Button icon={<EditOutlined />}>编辑</Button>
        </Link>
        <Link to={`/survey/${id}/setting`}>
          <Button>设置</Button>
        </Link>
        <Link to={`/survey/${id}/data`}>
          <Button>数据</Button>
        </Link>
        <Button type="primary" onClick={() => navigate('/project')}>
          项目列表
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 收集趋势 */}
        <Card
          className="bp-corners bp-card"
          title={<span className="bp-title" style={{ fontSize: 12 }}>DAILY / 每日收集</span>}
        >
          {daily.entries.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>还没有答卷数据</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {daily.entries.map(([day, count]) => (
                <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                  <span style={{ width: 90, color: 'var(--bp-text-soft)' }}>{day}</span>
                  <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)' }}>
                    <div style={{ width: `${(count / daily.max) * 100}%`, height: 8, background: 'var(--bp-blue)' }} />
                  </div>
                  <span style={{ width: 40, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--bp-text-soft)' }}>
            共 <span style={{ color: 'var(--bp-orange)' }}>{answerTotal}</span> 份答卷 · 最近 5 份
            {answers.length > 0 ? `（最新 ${answers[0].createAt || ''}）` : ''}
          </div>
        </Card>

        {/* 分享 */}
        <Card
          className="bp-card"
          title={<span className="bp-title" style={{ fontSize: 12 }}>SHARE / 分享</span>}
        >
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>答题链接</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    border: '1px solid var(--bp-line)',
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {shareUrl}
                </span>
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard?.writeText(shareUrl);
                    message.success('已复制');
                  }}
                >
                  复制
                </Button>
                <Button icon={<ExportOutlined />} href={shareUrl} target="_blank">
                  打开
                </Button>
              </div>

              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12 }}>开启收集</span>
                  <Switch checked={published} loading={saving} onChange={togglePublish} />
                  <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
                    {published ? '任何人可通过链接作答' : '关闭后答题链接打不开'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12 }}>自动保存</span>
                  <Switch
                    checked={Boolean(project?.setting?.answerSetting?.autoSave)}
                    onChange={async (checked) => {
                      try {
                        await post('/api/project/update', {
                          id,
                          settingKey: 'answerSetting.autoSave',
                          settingValue: checked,
                        });
                        message.success('已保存');
                        await load();
                      } catch (e) {
                        message.error((e as Error).message);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {qr && (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={qr}
                  alt="答题二维码"
                  style={{ width: 168, height: 168, border: '1px solid var(--bp-line)' }}
                />
                <div style={{ marginTop: 8 }}>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    href={qr}
                    download={`${project?.name || id}-二维码.png`}
                  >
                    下载二维码
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
