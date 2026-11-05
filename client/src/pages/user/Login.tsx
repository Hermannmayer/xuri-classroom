import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, message, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getSystem, login } from '../../api';
import type { SystemInfo } from '../../api';
import { encryptPassword } from '../../utils/crypto';
import { t } from '../../i18n';

export default function Login() {
  const [system, setSystem] = useState<SystemInfo>();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getSystem()
      .then(setSystem)
      .catch(() => message.error('系统信息加载失败，请确认后端已启动'));
  }, []);

  const onFinish = async (values: { username: string; password: string }) => {
    if (!system?.publicKey) {
      message.error('系统信息未就绪，请刷新页面');
      return;
    }
    setLoading(true);
    try {
      await login({
        username: values.username,
        password: encryptPassword(values.password, system.publicKey),
      });
      // 登录接口无响应体，用 currentUser 确认会话真的建立了
      await getCurrentUser();
      navigate('/home', { replace: true });
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('pages.login.failure', '登录失败，请重试！'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)',
      }}
    >
      <Card style={{ width: 380 }} styles={{ body: { padding: 32 } }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>
          {system?.name || t('pages.login.defaultSystemName', '卷王问卷考试系统')}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
          {t('pages.login.slogan', '让问卷与考试更简单高效')}
        </Typography.Paragraph>

        {system?.setting?.captchaEnabled && (
          <Typography.Paragraph type="warning" style={{ fontSize: 12 }}>
            后端已开启验证码，新前端尚未接入，请先在系统设置中关闭验证码。
          </Typography.Paragraph>
        )}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: t('pages.login.password.required', '请输入密码！') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('pages.login.password.placeholder', '密码')}
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            {t('pages.login.submit', '登录')}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
