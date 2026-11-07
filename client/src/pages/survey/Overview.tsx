import BackButton from '../../components/BackButton';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
} from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  EditOutlined,
  ExportOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import QRCode from 'qrcode';
import { get, getWithPagination, updateProject, updateProjectStatus } from '../../api';
import type {
  Answer,
  AnswerSetting,
  ExamSetting,
  Project,
  ProjectSetting,
  SubmittedSetting,
} from '../../schema/project';
import PartnerPanel from './PartnerPanel';

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

/**
 * 项目详情（概述）：概览 + 全部发布设置，一页搞定。
 *
 * 原「/survey/:id」(概述) 与「/survey/:id/setting」(发布设置) 已合并：
 * 设置页的所有字段都在这里，保存一次走 POST /api/project/update（整包 setting，
 * 未改字段从已加载 setting 合并保留，不会丢字段）。合并时去掉了三处重复：
 * 1. 「开启收集」(旧概述) 与「发布状态」(旧设置) 是同一个 status → 只留投放与分享里的「发布状态」；
 * 2. 「自动保存」(旧概述) 与「自动暂存」(旧设置) 都是 answerSetting.autoSave → 只留答题显示里的「自动暂存」；
 * 3. 「显示排名」(submittedSetting.rankVisible) 与「交卷后显示排名」(examSetting.rankingEnabled)
 *    是同一件事 → 只留考试控制里的「交卷后显示排名」，保存时两个字段一起写，后端行为不变。
 */
export default function SurveyOverview() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [project, setProject] = useState<Project>();
  const [report, setReport] = useState<ReportData>();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [qr, setQr] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** 已加载的 setting：保存时用它与表单合并，避免丢掉本页没展示的字段 */
  const [current, setCurrent] = useState<ProjectSetting>({});

  const shareUrl = useMemo(() => `${location.origin}/s/${id}`, [id]);

  /** 把后端 setting 铺进表单；「交卷后显示排名」兼容旧数据里只写了 rankVisible 的情况 */
  const applySetting = useCallback(
    (value: ProjectSetting) => {
      setCurrent(value);
      form.setFieldsValue({
        status: value.status === 1,
        password: value.answerSetting?.password,
        loginRequired: value.answerSetting?.loginRequired,
        progressBar: value.answerSetting?.progressBar,
        autoSave: value.answerSetting?.autoSave ?? true,
        onePageOneQuestion: value.answerSetting?.onePageOneQuestion,
        answerSheetVisible: value.answerSetting?.answerSheetVisible,
        questionNumber: value.answerSetting?.questionNumber ?? true,
        copyEnabled: value.answerSetting?.copyEnabled ?? true,
        maxAnswers: value.answerSetting?.maxAnswers,
        ipLimitEnabled: Boolean(value.answerSetting?.ipLimit),
        ipLimitNum: value.answerSetting?.ipLimit?.limitNum,
        ipLimitFreq: value.answerSetting?.ipLimit?.limitFreq,
        deviceLimitEnabled: Boolean(value.answerSetting?.cookieLimit),
        deviceLimitNum: value.answerSetting?.cookieLimit?.limitNum,
        deviceLimitFreq: value.answerSetting?.cookieLimit?.limitFreq,
        endTime: value.answerSetting?.endTime ? dayjs(value.answerSetting.endTime) : undefined,
        enableUpdate: value.submittedSetting?.enableUpdate,
        redirectUrl: value.submittedSetting?.redirectUrl,
        contentHtml: value.submittedSetting?.contentHtml,
        transcriptVisible: value.submittedSetting?.transcriptVisible,
        answerAnalysis: value.submittedSetting?.answerAnalysis,
        examStartTime: value.examSetting?.startTime ? dayjs(value.examSetting.startTime) : undefined,
        examEndTime: value.examSetting?.endTime ? dayjs(value.examSetting.endTime) : undefined,
        minSubmitMinutes: value.examSetting?.minSubmitMinutes,
        maxSubmitMinutes: value.examSetting?.maxSubmitMinutes,
        rankingEnabled: value.examSetting?.rankingEnabled ?? value.submittedSetting?.rankVisible,
        exerciseMode: value.examSetting?.exerciseMode,
        passMode: value.examSetting?.passMode,
        passModePerSeconds: value.examSetting?.passModePerSeconds,
        randomOrder: value.examSetting?.randomOrder,
        randomSurveyWrong: value.examSetting?.randomSurveyWrong,
        maxSwitchScreenTimes: value.examSetting?.maxSwitchScreenTimes,
      });
    },
    [form],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, setting, r, list] = await Promise.all([
        get<Project>('/api/project', { id }),
        get<ProjectSetting>('/api/project/setting', { id }).catch(() => ({}) as ProjectSetting),
        get<ReportData>(`/api/report/${id}`).catch(() => undefined),
        getWithPagination<Answer>('/api/answer/list', { projectId: id, current: 1, pageSize: 5 }).catch(
          () => ({ current: 1, pageSize: 5, total: 0, data: [] as Answer[] }),
        ),
      ]);
      setProject(p);
      setReport(r);
      setAnswers(list.data);
      applySetting(setting ?? {});
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, applySetting]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    QRCode.toDataURL(shareUrl, { width: 320, margin: 1, color: { dark: '#ffffff', light: '#1e3a5f' } })
      .then(setQr)
      .catch(() => undefined);
  }, [shareUrl]);

  /** 保存后只刷新概览数据（不复位表单，避免把用户刚填的内容刷掉） */
  const refreshSummary = async () => {
    const [p, r, list] = await Promise.all([
      get<Project>('/api/project', { id }).catch(() => undefined),
      get<ReportData>(`/api/report/${id}`).catch(() => undefined),
      getWithPagination<Answer>('/api/answer/list', { projectId: id, current: 1, pageSize: 5 }).catch(
        () => ({ current: 1, pageSize: 5, total: 0, data: [] as Answer[] }),
      ),
    ]);
    if (p) setProject(p);
    setReport(r);
    setAnswers(list.data);
  };

  const onSave = async () => {
    let v: Record<string, unknown>;
    try {
      v = await form.validateFields();
    } catch {
      return; // 校验提示已经在字段上
    }

    const answerSetting: AnswerSetting = {
      ...(current.answerSetting ?? {}),
      password: (v.password as string) || undefined,
      loginRequired: Boolean(v.loginRequired),
      progressBar: Boolean(v.progressBar),
      autoSave: Boolean(v.autoSave),
      onePageOneQuestion: Boolean(v.onePageOneQuestion),
      answerSheetVisible: Boolean(v.answerSheetVisible),
      questionNumber: Boolean(v.questionNumber),
      copyEnabled: Boolean(v.copyEnabled),
      maxAnswers: (v.maxAnswers as number | undefined) ?? undefined,
      // schema 里的 AnswerFreqEnum 只覆盖了部分频率，后端实际存字符串（only/hour/day/week/month）
      ipLimit: v.ipLimitEnabled
        ? {
            limitNum: Number(v.ipLimitNum ?? 1),
            limitFreq: ((v.ipLimitFreq as string | undefined) ?? 'only') as NonNullable<
              AnswerSetting['ipLimit']
            >['limitFreq'],
          }
        : undefined,
      cookieLimit: v.deviceLimitEnabled
        ? {
            limitNum: Number(v.deviceLimitNum ?? 1),
            limitFreq: ((v.deviceLimitFreq as string | undefined) ?? 'only') as NonNullable<
              AnswerSetting['cookieLimit']
            >['limitFreq'],
          }
        : undefined,
      endTime: v.endTime ? (v.endTime as Dayjs).valueOf() : undefined,
    };

    const submittedSetting: SubmittedSetting = {
      ...(current.submittedSetting ?? {}),
      enableUpdate: Boolean(v.enableUpdate),
      redirectUrl: (v.redirectUrl as string) || undefined,
      contentHtml: (v.contentHtml as string) || undefined,
      transcriptVisible: Boolean(v.transcriptVisible),
      // 去重：与「交卷后显示排名」共用同一个开关，两个字段一起写，后端行为不变
      rankVisible: Boolean(v.rankingEnabled),
      answerAnalysis: Boolean(v.answerAnalysis),
    };

    const examSetting: ExamSetting = {
      ...(current.examSetting ?? {}),
      startTime: v.examStartTime ? (v.examStartTime as Dayjs).valueOf() : undefined,
      endTime: v.examEndTime ? (v.examEndTime as Dayjs).valueOf() : undefined,
      minSubmitMinutes: (v.minSubmitMinutes as number) ?? undefined,
      maxSubmitMinutes: (v.maxSubmitMinutes as number) ?? undefined,
      rankingEnabled: Boolean(v.rankingEnabled),
      exerciseMode: Boolean(v.exerciseMode),
      passMode: Boolean(v.passMode),
      passModePerSeconds: (v.passModePerSeconds as number) ?? undefined,
      randomOrder: Boolean(v.randomOrder),
      randomSurveyWrong: Boolean(v.randomSurveyWrong),
      maxSwitchScreenTimes: (v.maxSwitchScreenTimes as number) ?? undefined,
    };

    const setting: ProjectSetting = {
      ...current,
      status: v.status ? 1 : 0,
      answerSetting,
      submittedSetting,
      examSetting,
    };

    setSaving(true);
    try {
      await updateProject({ id, setting });
      // 整包 setting 更新只写 setting JSON，不会同步 t_project.status 列（后端只在
      // settingKey='status' 时改 status），所以发布状态变了就再补一次单项更新，
      // 否则页头标签与项目列表里的状态会一直显示旧值。
      const nextStatus = v.status ? 1 : 0;
      if ((current.status ?? 0) !== nextStatus) {
        await updateProjectStatus({ id, status: nextStatus });
      }
      setCurrent(setting);
      message.success('已保存');
      await refreshSummary();
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

  const cardTitle = (en: string, cn: string) => (
    <span className="bp-title" style={{ fontSize: 12 }}>
      {en} / {cn}
    </span>
  );

  const switchItem = (name: string, label: string, extra?: string) => (
    <Col xs={24} md={12} key={name}>
      <Form.Item name={name} label={label} valuePropName="checked" extra={extra}>
        <Switch />
      </Form.Item>
    </Col>
  );

  const limitFreqOptions = [
    { value: 'only', label: '仅一次' },
    { value: 'hour', label: '每小时' },
    { value: 'day', label: '每天' },
    { value: 'week', label: '每周' },
    { value: 'month', label: '每月' },
  ];

  return (
    <div style={{ maxWidth: 1200 }}>
      <BackButton to="/tasks" label="返回我的任务" style={{ marginBottom: 4 }} />
      {/* 页头：编辑 / 数据 / 项目列表 + 保存（发布设置已并入本页，不再有第二个「设置」入口） */}
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
        <Link to={`/survey/${id}/data`}>
          <Button>数据</Button>
        </Link>
        <Button onClick={() => navigate('/project')}>项目列表</Button>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void onSave()}>
          保存
        </Button>
      </div>

      <Form form={form} layout="vertical" size="small" initialValues={{ progressBar: true, autoSave: true }}>
        <Row gutter={[14, 14]}>
          {/* ① 概览：收集趋势 */}
          <Col span={24}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('DAILY', '每日收集')}
              styles={{ body: { padding: 16 } }}
            >
              {daily.entries.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>还没有答卷数据</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {daily.entries.map(([day, count]) => (
                    <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                      <span style={{ width: 90, color: 'var(--bp-text-soft)' }}>{day}</span>
                      <div style={{ flex: 1, height: 8, background: 'var(--bp-fill-soft)' }}>
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
          </Col>

          {/* ② 答题显示（「自动暂存」取代旧概述页的「自动保存」，只此一处） */}
          <Col xs={24} lg={12}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('DISPLAY', '答题显示')}
              styles={{ body: { padding: 16 } }}
            >
              <Row gutter={[12, 0]}>
                {switchItem('autoSave', '自动暂存', '答题过程中定时保存草稿')}
                {switchItem('progressBar', '显示进度条')}
                {switchItem('onePageOneQuestion', '一页一题')}
                {switchItem('answerSheetVisible', '显示答题卡')}
                {switchItem('questionNumber', '显示题目序号')}
                {switchItem('copyEnabled', '允许复制题目')}
              </Row>
            </Card>
          </Col>

          {/* ③ 考试控制（「交卷后显示排名」取代投放里的「显示排名」，只此一处） */}
          <Col xs={24} lg={12}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('EXAM', '考试控制')}
              styles={{ body: { padding: 16 } }}
            >
              <Row gutter={[12, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item name="examStartTime" label="考试开始时间">
                    <DatePicker showTime style={{ width: '100%' }} placeholder="不限制" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="examEndTime" label="考试结束时间" extra="考试窗口的结束时间">
                    <DatePicker showTime style={{ width: '100%' }} placeholder="不限制" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="minSubmitMinutes" label="最短交卷（分钟）">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="maxSubmitMinutes" label="最长交卷（分钟）">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="maxSwitchScreenTimes" label="最大切屏次数">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="passModePerSeconds" label="闯关每题限时（秒）">
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                  </Form.Item>
                </Col>
                {switchItem('rankingEnabled', '交卷后显示排名')}
                {switchItem('exerciseMode', '练习模式')}
                {switchItem('randomSurveyWrong', '错题练习')}
                {switchItem('randomOrder', '随机题目顺序')}
                {switchItem('passMode', '闯关模式')}
              </Row>
            </Card>
          </Col>

          {/* ④ 回收限制 */}
          <Col xs={24} lg={12}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('COLLECT', '回收限制')}
              styles={{ body: { padding: 16 } }}
            >
              <Row gutter={[12, 0]}>
                {switchItem('loginRequired', '需要登录')}
                <Col xs={24} md={12}>
                  <Form.Item name="password" label="凭密码">
                    <Input placeholder="留空表示不需要密码" allowClear />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="maxAnswers" label="回收上限">
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="不限" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="每 IP 限次">
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="ipLimitEnabled" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                      <Form.Item name="ipLimitNum" noStyle>
                        <InputNumber min={1} style={{ width: '38%' }} placeholder="次数" />
                      </Form.Item>
                      <Form.Item name="ipLimitFreq" noStyle>
                        <Select style={{ width: '52%' }} placeholder="频率" options={limitFreqOptions} />
                      </Form.Item>
                    </Space.Compact>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="每台设备限次" extra="按浏览器 cookie 识别">
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="deviceLimitEnabled" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                      <Form.Item name="deviceLimitNum" noStyle>
                        <InputNumber min={1} style={{ width: '38%' }} placeholder="次数" />
                      </Form.Item>
                      <Form.Item name="deviceLimitFreq" noStyle>
                        <Select style={{ width: '52%' }} placeholder="频率" options={limitFreqOptions} />
                      </Form.Item>
                    </Space.Compact>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="endTime" label="回收截止时间" extra="到点后停止收卷，与考试结束时间不同">
                    <DatePicker showTime style={{ width: '100%' }} placeholder="不限制" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* ⑤ 投放与分享：链接/二维码 + 发布状态（取代旧概述页的「开启收集」） */}
          <Col xs={24} lg={12}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('PUBLISH', '投放与分享')}
              styles={{ body: { padding: 16 } }}
            >
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
                <div style={{ flex: '1 1 240px', minWidth: 220 }}>
                  <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 6 }}>答题链接</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span
                      style={{
                        flex: '1 1 100%',
                        padding: '6px 10px',
                        border: '1px solid var(--bp-line)',
                        fontSize: 12,
                        wordBreak: 'break-all',
                      }}
                    >
                      {shareUrl}
                    </span>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        navigator.clipboard?.writeText(shareUrl);
                        message.success('已复制');
                      }}
                    >
                      复制
                    </Button>
                    <Button size="small" icon={<ExportOutlined />} href={shareUrl} target="_blank">
                      打开
                    </Button>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      href={qr}
                      download={`${project?.name || id}-二维码.png`}
                      disabled={!qr}
                    >
                      下载二维码
                    </Button>
                  </div>
                </div>
                {qr && (
                  <img
                    src={qr}
                    alt="答题二维码"
                    style={{ width: 104, height: 104, border: '1px solid var(--bp-line)' }}
                  />
                )}
              </div>

              <hr className="bp-dim" style={{ margin: '10px 0 14px' }} />

              <Row gutter={[12, 0]}>
                {switchItem('status', '发布状态', '开启后任何人可通过链接作答；关闭后答题链接打不开')}
                {switchItem('enableUpdate', '允许修改答案')}
                {switchItem('transcriptVisible', '显示成绩单')}
                {switchItem('answerAnalysis', '显示答案解析')}
                <Col xs={24} md={12}>
                  <Form.Item name="redirectUrl" label="完成跳转">
                    <Input placeholder="https://…（选填）" allowClear />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="contentHtml" label="提交后提示内容" extra="支持 HTML，留空显示默认提示">
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* ⑥ 协作者 */}
          <Col span={24}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('COLLABORATORS', '协作管理员')}
              styles={{ body: { padding: 16 } }}
            >
              <PartnerPanel projectId={id} />
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
