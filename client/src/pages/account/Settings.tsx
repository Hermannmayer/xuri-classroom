import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, message, Select, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { getCurrentUser, post } from '../../api';

/** 与后端 UserServiceImpl.STRONG_PASSWORD_PATTERN 一致：8-16 位，含大写、小写和数字，不允许特殊字符 */
const PASSWORD_PATTERN = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9]{8,16}$/;
const PASSWORD_RULE = {
  pattern: PASSWORD_PATTERN,
  message: '8-16 位，需同时包含大写字母、小写字母和数字，不能使用特殊字符',
};

/**
 * 账号设置：个人资料 + 修改密码。
 * 两者都走 POST /api/user（UserProfileRequest），后端按字段非空合并：
 * 只提交密码不会清掉资料，只提交资料也不会动密码。
 */
export default function AccountSettings() {
  const [profileForm] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    let alive = true;
    getCurrentUser()
      .then((u) => {
        if (!alive) return;
        profileForm.setFieldsValue({ name: u?.name, phone: u?.phone, email: u?.email, gender: u?.gender });
      })
      .catch((e: Error) => message.error(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [profileForm]);

  const saveProfile = async () => {
    let v: Record<string, unknown>;
    try {
      v = await profileForm.validateFields();
    } catch {
      return;
    }
    setSavingProfile(true);
    try {
      await post('/api/user', { name: v.name, phone: v.phone, email: v.email, gender: v.gender });
      message.success('已保存');
      // 顶栏用户名来自 BasicLayout 自身状态，重载一次最省事
      setTimeout(() => location.reload(), 400);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    let v: Record<string, unknown>;
    try {
      v = await pwdForm.validateFields();
    } catch {
      return;
    }
    setSavingPwd(true);
    try {
      await post('/api/user', { oldPassword: v.oldPassword, password: v.password });
      message.success('密码已修改');
      pwdForm.resetFields();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>ACCOUNT / 账号</div>
        <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
          个人资料与密码
        </div>
      </div>

      <Card
        className="bp-corners"
        title={<span className="bp-title">个人资料</span>}
        style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}
      >
        <Form form={profileForm} layout="vertical" size="small" requiredMark={false}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="真实姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机" rules={[{ pattern: /^1\d{10}$/, message: '手机号格式不正确' }]}>
            <Input placeholder="选填" allowClear />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
            <Input placeholder="选填" allowClear />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select
              allowClear
              placeholder="选填"
              options={[
                { value: 'M', label: '男' },
                { value: 'F', label: '女' },
              ]}
            />
          </Form.Item>
          <hr className="bp-dim" style={{ margin: '4px 0 16px' }} />
          <Button type="primary" icon={<SaveOutlined />} loading={savingProfile} onClick={() => void saveProfile()}>
            保存资料
          </Button>
        </Form>
      </Card>

      <Card
        className="bp-corners"
        title={<span className="bp-title">修改密码</span>}
        style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)', marginTop: 14 }}
      >
        <Form form={pwdForm} layout="vertical" size="small" requiredMark={false}>
          <Form.Item name="oldPassword" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password placeholder="当前登录密码" autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="password" label="新密码" rules={[{ required: true, message: '请输入新密码' }, PASSWORD_RULE]}>
            <Input.Password placeholder="8-16 位，含大小写字母和数字" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value: string) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="再输一次" autoComplete="new-password" />
          </Form.Item>
          <hr className="bp-dim" style={{ margin: '4px 0 16px' }} />
          <Button type="primary" icon={<SaveOutlined />} loading={savingPwd} onClick={() => void savePassword()}>
            修改密码
          </Button>
        </Form>
      </Card>
    </div>
  );
}
