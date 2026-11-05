import { useEffect, useState } from 'react';
import { Button, Form, Input, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getSystem, login } from '../../api';
import type { SystemInfo } from '../../api';
import { encryptPassword } from '../../utils/crypto';
import { t } from '../../i18n';
import LoginCaptcha from '../../components/LoginCaptcha';

function versionTag(version?: string) {
  return version && /^\d/.test(version) ? `v${version}` : 'BUILD 1.13.0';
}

export default function Login() {
  const [system, setSystem] = useState<SystemInfo>();
  const [loading, setLoading] = useState(false);
  const [captchaVerification, setCaptchaVerification] = useState<string>();
  // 登录失败时后端已消费验证码，换 key 让滑块重新拉一张
  const [captchaKey, setCaptchaKey] = useState(0);
  const navigate = useNavigate();
  const captchaEnabled = Boolean(system?.setting?.captchaEnabled);

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
    if (captchaEnabled && !captchaVerification) {
      message.error('请先完成滑块验证');
      return;
    }
    setLoading(true);
    try {
      await login({
        username: values.username,
        password: encryptPassword(values.password, system.publicKey),
        captchaVerification: captchaEnabled ? captchaVerification : undefined,
      });
      await getCurrentUser();
      navigate('/home', { replace: true });
    } catch (e) {
      if (captchaEnabled) {
        setCaptchaVerification(undefined);
        setCaptchaKey((k) => k + 1);
      }
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
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* 图纸标题栏 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 10,
            letterSpacing: '0.16em',
            color: 'var(--bp-text-soft)',
            marginBottom: 8,
          }}
        >
          <span>SURVEY KING</span>
          <span>DWG NO. SK-0013</span>
        </div>

        <div
          className="bp-corners"
          style={{
            border: '1px solid var(--bp-line)',
            background: 'rgba(30,58,95,0.62)',
            backdropFilter: 'blur(2px)',
            padding: 32,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.2em',
              color: 'var(--bp-text-soft)',
              textTransform: 'uppercase',
            }}
          >
            Sign in / 登录
          </div>
          <h1
            className="bp-title"
            style={{
              fontSize: 20,
              fontWeight: 600,
              margin: '10px 0 10px',
              lineHeight: 1.3,
              letterSpacing: '0.06em',
            }}
          >
            {system?.name || t('pages.login.defaultSystemName', '考试系统')}
          </h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
            <span className="bp-tag">{versionTag(system?.version)}</span>
            <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
              {t('pages.login.slogan', '让问卷与考试更简单高效')}
            </span>
          </div>

          <hr className="bp-dim" style={{ margin: '0 0 22px' }} />

          <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
            <Form.Item name="username" label="USERNAME" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="用户名" autoComplete="username" />
            </Form.Item>
            <Form.Item
              name="password"
              label="PASSWORD"
              rules={[{ required: true, message: t('pages.login.password.required', '请输入密码！') }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('pages.login.password.placeholder', '密码')}
                autoComplete="current-password"
              />
            </Form.Item>
            {/* 验证码放在账号密码下面、登录按钮上面 */}
            {captchaEnabled && (
              <div style={{ marginBottom: 16 }}>
                <LoginCaptcha key={captchaKey} onVerified={setCaptchaVerification} />
              </div>
            )}
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              disabled={captchaEnabled && !captchaVerification}
              style={{ marginTop: 4 }}
            >
              {t('pages.login.submit', '登录')}
            </Button>
          </Form>
        </div>

        <div
          style={{
            marginTop: 10,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: 'rgba(160,196,232,0.55)',
            letterSpacing: '0.1em',
          }}
        >
          <span>SCALE 1:1</span>
          <span>GRID 20 / 20</span>
        </div>
      </div>
    </div>
  );
}
