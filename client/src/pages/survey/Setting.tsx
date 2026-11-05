import { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Form, Input, InputNumber, message, Spin, Switch, Tabs } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { get, updateProject } from '../../api';
import type { AnswerSetting, ProjectSetting, SubmittedSetting } from '../../schema/project';

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
            ]}
          />
        </Form>
      </Card>
    </div>
  );
}
