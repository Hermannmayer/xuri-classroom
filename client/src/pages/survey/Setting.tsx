import { useEffect, useState } from 'react';
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, message, Row, Select, Space, Spin, Switch } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { get, updateProject } from '../../api';
import type { AnswerSetting, ExamSetting, ProjectSetting, SubmittedSetting } from '../../schema/project';

/**
 * 发布设置：答题显示 / 考试控制 / 回收限制 / 投放与分享 四张卡片 + 协作管理员占位。
 * 保存走 POST /api/project/update（整包 setting），未改字段从已加载 setting 合并保留。
 */
import PartnerPanel from './PartnerPanel';

export default function SurveySetting() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<ProjectSetting>({});

  useEffect(() => {
    let alive = true;
    get<ProjectSetting>('/api/project/setting', { id })
      .then((setting) => {
        if (!alive) return;
        const value = setting ?? {};
        setCurrent(value);
        form.setFieldsValue({
          status: value.status === 1,
          password: value.answerSetting?.password,
          loginRequired: value.answerSetting?.loginRequired,
          progressBar: value.answerSetting?.progressBar,
          autoSave: value.answerSetting?.autoSave,
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
          rankVisible: value.submittedSetting?.rankVisible,
          answerAnalysis: value.submittedSetting?.answerAnalysis,
          examStartTime: value.examSetting?.startTime ? dayjs(value.examSetting.startTime) : undefined,
          examEndTime: value.examSetting?.endTime ? dayjs(value.examSetting.endTime) : undefined,
          minSubmitMinutes: value.examSetting?.minSubmitMinutes,
          maxSubmitMinutes: value.examSetting?.maxSubmitMinutes,
          rankingEnabled: value.examSetting?.rankingEnabled,
          exerciseMode: value.examSetting?.exerciseMode,
          passMode: value.examSetting?.passMode,
          passModePerSeconds: value.examSetting?.passModePerSeconds,
          randomOrder: value.examSetting?.randomOrder,
          randomSurveyWrong: value.examSetting?.randomSurveyWrong,
          maxSwitchScreenTimes: value.examSetting?.maxSwitchScreenTimes,
        });
      })
      .catch((e: Error) => message.error(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, form]);

  const onSave = async () => {
    const v = await form.validateFields();

    const answerSetting: AnswerSetting = {
      ...(current.answerSetting ?? {}),
      password: v.password || undefined,
      loginRequired: Boolean(v.loginRequired),
      progressBar: Boolean(v.progressBar),
      autoSave: Boolean(v.autoSave),
      onePageOneQuestion: Boolean(v.onePageOneQuestion),
      answerSheetVisible: Boolean(v.answerSheetVisible),
      questionNumber: Boolean(v.questionNumber),
      copyEnabled: Boolean(v.copyEnabled),
      maxAnswers: v.maxAnswers ?? undefined,
          ipLimit: v.ipLimitEnabled
            ? { limitNum: Number(v.ipLimitNum ?? 1), limitFreq: v.ipLimitFreq ?? 'only' }
            : undefined,
          cookieLimit: v.deviceLimitEnabled
            ? { limitNum: Number(v.deviceLimitNum ?? 1), limitFreq: v.deviceLimitFreq ?? 'only' }
            : undefined,
      endTime: v.endTime ? (v.endTime as Dayjs).valueOf() : undefined,
    };

    const submittedSetting: SubmittedSetting = {
      ...(current.submittedSetting ?? {}),
      enableUpdate: Boolean(v.enableUpdate),
      redirectUrl: v.redirectUrl || undefined,
      contentHtml: v.contentHtml || undefined,
      transcriptVisible: Boolean(v.transcriptVisible),
      rankVisible: Boolean(v.rankVisible),
      answerAnalysis: Boolean(v.answerAnalysis),
    };

    const examSetting: ExamSetting = {
      ...(current.examSetting ?? {}),
      startTime: v.examStartTime ? (v.examStartTime as Dayjs).valueOf() : undefined,
      endTime: v.examEndTime ? (v.examEndTime as Dayjs).valueOf() : undefined,
      minSubmitMinutes: v.minSubmitMinutes ?? undefined,
      maxSubmitMinutes: v.maxSubmitMinutes ?? undefined,
      rankingEnabled: Boolean(v.rankingEnabled),
      exerciseMode: Boolean(v.exerciseMode),
      passMode: Boolean(v.passMode),
      passModePerSeconds: v.passModePerSeconds ?? undefined,
      randomOrder: Boolean(v.randomOrder),
      randomSurveyWrong: Boolean(v.randomSurveyWrong),
      maxSwitchScreenTimes: v.maxSwitchScreenTimes ?? undefined,
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
      setCurrent(setting);
      message.success('已保存');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  const shareUrl = `${location.origin}/s/${id}`;
  const cardTitle = (en: string, cn: string) => (
    <span className="bp-title" style={{ fontSize: 12 }}>
      {en} / {cn}
    </span>
  );
  const switchItem = (name: string, label: string) => (
    <Col xs={24} md={12} key={name}>
      <Form.Item name={name} label={label} valuePropName="checked">
        <Switch />
      </Form.Item>
    </Col>
  );

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/survey/${id}/edit`)} />
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>PUBLISH / 发布设置</div>
          <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
            答题与提交
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>
          保存
        </Button>
      </div>

      <Form form={form} layout="vertical" size="small" initialValues={{ progressBar: true, autoSave: true }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('DISPLAY', '答题显示')}
              styles={{ body: { padding: 16 } }}
            >
              <Row gutter={[12, 0]}>
                {switchItem('autoSave', '自动暂存')}
                {switchItem('progressBar', '显示进度条')}
                {switchItem('onePageOneQuestion', '一页一题')}
                {switchItem('answerSheetVisible', '显示答题卡')}
                {switchItem('questionNumber', '显示题目序号')}
                {switchItem('copyEnabled', '允许复制题目')}
              </Row>
            </Card>
          </Col>

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
                  <Form.Item name="examEndTime" label="考试结束时间">
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
                          <Select style={{ width: '52%' }} placeholder="频率" options={[
                        { value: 'only', label: '仅一次' },
                        { value: 'hour', label: '每小时' },
                        { value: 'day', label: '每天' },
                        { value: 'week', label: '每周' },
                        { value: 'month', label: '每月' },
                      ]} />
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
                          <Select style={{ width: '52%' }} placeholder="频率" options={[
                        { value: 'only', label: '仅一次' },
                        { value: 'hour', label: '每小时' },
                        { value: 'day', label: '每天' },
                        { value: 'week', label: '每周' },
                        { value: 'month', label: '每月' },
                      ]} />
                        </Form.Item>
                      </Space.Compact>
                    </Form.Item>
                  </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="endTime" label="回收截止时间">
                    <DatePicker showTime style={{ width: '100%' }} placeholder="不限制" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              className="bp-corners bp-card"
              title={cardTitle('PUBLISH', '投放与分享')}
              styles={{ body: { padding: 16 } }}
            >
              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 10, wordBreak: 'break-all' }}>
                分享链接：<span style={{ color: 'var(--bp-orange)' }}>{shareUrl}</span>
                <Button
                  size="small"
                  type="text"
                  onClick={() => {
                    navigator.clipboard?.writeText(shareUrl);
                    message.success('已复制');
                  }}
                >
                  复制
                </Button>
              </div>
              <Row gutter={[12, 0]}>
                {switchItem('status', '发布状态')}
                {switchItem('enableUpdate', '允许修改答案')}
                {switchItem('transcriptVisible', '显示成绩单')}
                {switchItem('rankVisible', '显示排名')}
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
