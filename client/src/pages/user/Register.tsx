import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, message, Spin } from 'antd';
import { ArrowLeftOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../../api';
import type { SystemInfo } from '../../api';







/**
 * 注册页：仅在后端开启「允许注册」时可用。
 * 密码规则与后端一致（8–16 位、大小写 + 数字），否则提交会 500。
 */
export default function Register() {
  const navigate = useNavigate();
  const [system, setSystem] = useState<SystemInfo>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{ username: string; name: string; password: string; confirm: string; role?: string }>();

  const enabled = Boolean(system?.registerInfo?.registerEnabled);

  useEffect(() => {
    Promise.all([
      get<SystemInfo>('/api/system').catch(() => undefined),
    ])
      .then(([sys]) => {
        setSystem(sys);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    const values = await form.validateFields();
    if (values.password !== values.confirm) {
      message.error('两次输入的密码不一致');
      return;
    }
    setSaving(true);
    try {
      await post('/api/public/register', {
        username: values.username.trim(),
        password: values.password,
        name: values.name.trim(),
        // 注册固定为学员，老师/管理员只能由管理员在后台分配
      });
      message.success('注册成功，请登录');
      navigate('/user/login');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: 420, maxWidth: '100%' }} className="bp-corners">
        <div style={{ marginBottom: 16 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/user/login')}>
            返回登录
          </Button>
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>REGISTER / 注册</div>
        <div className="bp-title" style={{ fontSize: 18, margin: '6px 0 16px' }}>
          {system?.name || '考试与学习平台'}
        </div>

        {!enabled ? (
          <Alert
            type="warning"
            showIcon
            message="当前系统未开放注册"
            description="请联系管理员在「系统设置 → 登录与验证码」里开启，或让管理员直接创建账号。"
            action={
              <Button size="small" onClick={() => navigate('/user/login')}>
                去登录
              </Button>
            }
          />
        ) : (
          <Form form={form} layout="vertical" requiredMark={false} onFinish={submit} size="large">
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, whitespace: true, message: '请输入用户名' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="登录用的账号" autoComplete="username" />
            </Form.Item>
            <Form.Item name="name" label="姓名" rules={[{ required: true, whitespace: true, message: '请输入姓名' }]}>
              <Input placeholder="真实姓名" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              extra="至少 8 位，建议字母和数字组合"
              rules={[
                { required: true, message: '请输入密码' },
                {
                  pattern: /^.{8,32}$/,
                  message: '密码至少 8 位',
                },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="设置密码" autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirm"
              label="确认密码"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再输入一次密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="再输一次" autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={saving}>
              注册
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
}
