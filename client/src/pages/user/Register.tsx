import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, message, Spin } from 'antd';
import { ArrowLeftOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../../api';
import type { SystemInfo } from '../../api';

/**
 * 注册页：手机号即登录账号（用户的核心标识）。
 * 密码规则与后端一致（≥8 位），注册后进入待审核状态，管理员启用后才能登录。
 */
export default function Register() {
  const navigate = useNavigate();
  const [system, setSystem] = useState<SystemInfo>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{ phone: string; name: string; password: string; confirm: string }>();

  const enabled = Boolean(system?.registerInfo?.registerEnabled);

  useEffect(() => {
    get<SystemInfo>('/api/system')
      .catch(() => undefined)
      .then((sys) => setSystem(sys))
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    const values = await form.validateFields();
    if (values.password !== values.confirm) {
      message.error('两次输入的密码不一致');
      return;
    }
    setSaving(true);
    try {
      // 手机号直接作为登录账号，后端注册接口的 username 即手机号
      await post('/api/public/register', {
        username: values.phone.trim(),
        phone: values.phone.trim(),
        password: values.password,
        name: values.name.trim(),
      });
      message.success('注册成功，等待管理员审核后即可登录');
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
              name="phone"
              label="手机号"
              extra="手机号就是你的登录账号"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1\d{10}$/, message: '请输入 11 位手机号' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="11 位手机号" maxLength={11} inputMode="numeric" />
            </Form.Item>
            <Form.Item name="name" label="姓名" rules={[{ required: true, whitespace: true, message: '请输入姓名' }]}>
              <Input placeholder="真实姓名" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              extra="至少 8 位"
              rules={[
                { required: true, message: '请输入密码' },
                { pattern: /^.{8,32}$/, message: '密码至少 8 位' },
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
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--bp-text-soft)' }}>
              注册后需要管理员审核，审核通过前无法登录。
            </div>
          </Form>
        )}
      </Card>
    </div>
  );
}
