import { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Form, Input, InputNumber, message, Spin, Switch, Tabs } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { get, updateProject } from '../../api';
import type { AnswerSetting, ExamSetting, ProjectSetting, SubmittedSetting } from '../../schema/project';

/**
 * 发布设置：只做一期闭环用得到的字段，其余留到后续。
 * 后端 GET /api/project/setting 返回 ProjectSetting，保存走 POST /api/project/update（整包 setting）。
 */
export default function SurveySetting() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    get<ProjectSetting>('/api/project/setting', { id })
      .then((setting) => {
        if (!alive) return;
        form.setFieldsValue({
          status: setting?.status === 1,
          password: setting?.answerSetting?.password,
          loginRequired: setting?.answerSetting?.loginRequired,
          progressBar: setting?.answerSetting?.progressBar,
          autoSave: setting?.answerSetting?.autoSave,
          onePageOneQuestion: setting?.answerSetting?.onePageOneQuestion,
          answerSheetVisible: setting?.answerSetting?.answerSheetVisible,
          maxAnswers: setting?.answerSetting?.maxAnswers,
          endTime: setting?.answerSetting?.endTime ? dayjs(setting.answerSetting.endTime) : undefined,
          enableUpdate: setting?.submittedSetting?.enableUpdate,
          redirectUrl: setting?.submittedSetting?.redirectUrl,
          contentHtml: setting?.submittedSetting?.contentHtml,
          transcriptVisible: setting?.submittedSetting?.transcriptVisible,
          rankVisible: setting?.submittedSetting?.rankVisible,
          answerAnalysis: setting?.submittedSetting?.answerAnalysis,
          examStartTime: setting?.examSetting?.startTime ? dayjs(setting.examSetting.startTime) : undefined,
          examEndTime: setting?.examSetting?.endTime ? dayjs(setting.examSetting.endTime) : undefined,
          minSubmitMinutes: setting?.examSetting?.minSubmitMinutes,
          maxSubmitMinutes: setting?.examSetting?.maxSubmitMinutes,
          rankingEnabled: setting?.examSetting?.rankingEnabled,
          exerciseMode: setting?.examSetting?.exerciseMode,
          passMode: setting?.examSetting?.passMode,
          passModePerSeconds: setting?.examSetting?.passModePerSeconds,
          randomOrder: setting?.examSetting?.randomOrder,
          randomSurveyWrong: setting?.examSetting?.randomSurveyWrong,
          maxSwitchScreenTimes: setting?.examSetting?.maxSwitchScreenTimes,
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
    const setting: ProjectSetting = {
      status: v.status ? 1 : 0,
      answerSetting: {
        password: v.password || undefined,
        loginRequired: Boolean(v.loginRequired),
        progressBar: Boolean(v.progressBar),
        autoSave: Boolean(v.autoSave),
        onePageOneQuestion: Boolean(v.onePageOneQuestion),
        answerSheetVisible: Boolean(v.answerSheetVisible),
        maxAnswers: v.maxAnswers ?? undefined,
        endTime: v.endTime ? (v.endTime as Dayjs).valueOf() : undefined,
      } satisfies AnswerSetting,
      submittedSetting: {
        enableUpdate: Boolean(v.enableUpdate),
        redirectUrl: v.redirectUrl || undefined,
        contentHtml: v.contentHtml || undefined,
        transcriptVisible: Boolean(v.transcriptVisible),
        rankVisible: Boolean(v.rankVisible),
        answerAnalysis: Boolean(v.answerAnalysis),
      } satisfies SubmittedSetting,
      examSetting: {
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
      } satisfies ExamSetting,
    };
    setSaving(true);
    try {
      await updateProject({ id, setting });
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

  return (
    <div style={{ maxWidth: 760 }}>
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

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}>
        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 10 }}>
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

        <Form form={form} layout="vertical" size="small" initialValues={{ progressBar: true, autoSave: true }}>
          <Tabs
            items={[
              {
                key: 'access',
                label: '发布与访问',
                children: (
                  <>
                    <Form.Item name="status" label="发布状态" valuePropName="checked" extra="发布后 /s/:id 才能打开">
                      <Switch checkedChildren="已发布" unCheckedChildren="未发布" />
                    </Form.Item>
                    <Form.Item name="password" label="答题密码" extra="留空表示不需要密码">
                      <Input placeholder="选填" allowClear />
                    </Form.Item>
                    <Form.Item name="loginRequired" label="必须登录才能作答" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="endTime" label="截止时间">
                      <DatePicker showTime style={{ width: '100%' }} placeholder="不限制" />
                    </Form.Item>
                    <Form.Item name="maxAnswers" label="答卷数量上限" extra="留空表示不限制">
                      <InputNumber min={1} style={{ width: '100%' }} placeholder="不限" />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'experience',
                label: '答题体验',
                children: (
                  <>
                    <Form.Item name="progressBar" label="显示进度条" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="autoSave" label="自动暂存" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="onePageOneQuestion" label="一页一题" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="answerSheetVisible" label="显示答题卡" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'submitted',
                label: '提交之后',
                children: (
                  <>
                    <Form.Item name="enableUpdate" label="允许修改答案" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="contentHtml" label="提交后的提示内容" extra="支持 HTML，留空显示默认提示">
                      <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
                    </Form.Item>
                    <Form.Item name="redirectUrl" label="提交后跳转链接">
                      <Input placeholder="https://…（选填）" allowClear />
                    </Form.Item>
                    <Form.Item name="transcriptVisible" label="显示成绩单" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="rankVisible" label="显示排名" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="answerAnalysis" label="显示答案解析" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'exam',
                label: '考试设置',
                children: (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginBottom: 12 }}>
                      仅考试模式生效；问卷模式这些设置会被忽略
                    </div>
                    <Form.Item name="examStartTime" label="考试开始时间">
                      <DatePicker showTime style={{ width: '100%' }} placeholder="不限制" />
                    </Form.Item>
                    <Form.Item name="examEndTime" label="考试结束时间">
                      <DatePicker showTime style={{ width: '100%' }} placeholder="不限制" />
                    </Form.Item>
                    <Form.Item name="minSubmitMinutes" label="最短交卷时间（分钟）" extra="不到时间不能交卷">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                    </Form.Item>
                    <Form.Item name="maxSubmitMinutes" label="最长答题时间（分钟）" extra="到点自动交卷">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                    </Form.Item>
                    <Form.Item name="rankingEnabled" label="交卷后显示排名" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="exerciseMode" label="练习模式（答完立即看答案）" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="passMode" label="闯关模式（答对才能进下一题）" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="passModePerSeconds" label="闯关每题限时（秒）">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                    </Form.Item>
                    <Form.Item name="randomOrder" label="随机题目顺序" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="randomSurveyWrong" label="错题练习" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name="maxSwitchScreenTimes" label="允许切屏次数" extra="超过后按交卷处理，留空不限制">
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="不限" />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Card>
    </div>
  );
}
