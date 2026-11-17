import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, Form, Input, message, Select, Spin, Tag } from 'antd';
import { ArrowLeftOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../../api';
import type { RegisterOptions, SystemInfo } from '../../api';

/** 注册成功后的回执：不再立刻跳走，先让学员看清「等谁审核、用什么登录」 */
interface SubmittedInfo {
  phone: string;
  className: string;
}

/**
 * 学员注册页：手机号即登录账号。
 *
 * <p>流程（面向不懂系统的学员，页面上按 1/2/3 写清楚）：
 * 选择开放注册的班级 → 填手机号/姓名/密码 → 提交后等该班老师或管理员审核。
 * 审核通过前账号是 status=0，登录会被拒绝。
 */
export default function Register() {
  const navigate = useNavigate();
  const [system, setSystem] = useState<SystemInfo>();
  const [options, setOptions] = useState<RegisterOptions>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedInfo>();
  const [form] = Form.useForm<{ classId: string; phone: string; name: string; password: string; confirm: string }>();

  const classes = options?.classes ?? [];
  const globalEnabled = options?.globalEnabled === true;
  const enabled = options?.enabled === true;

  useEffect(() => {
    let alive = true;
    Promise.all([
      get<SystemInfo>('/api/system').catch(() => undefined),
      get<RegisterOptions>('/api/public/registerOptions').catch(() => undefined),
    ])
      .then(([sys, opts]) => {
        if (!alive) return;
        setSystem(sys);
        setOptions(opts);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // 只有一个班开放时直接选上，少一步操作；多个班必须自己选
  useEffect(() => {
    if (classes.length === 1 && !form.getFieldValue('classId')) {
      form.setFieldValue('classId', classes[0].id);
    }
  }, [classes, form]);

  const submit = async () => {
    const values = await form.validateFields();
    if (values.password !== values.confirm) {
      message.error('两次输入的密码不一致');
      return;
    }
    const target = classes.find((item) => item.id === values.classId);
    setSaving(true);
    try {
      // 手机号直接作为登录账号，后端注册接口的 username 即手机号
      await post('/api/public/register', {
        deptId: values.classId,
        username: values.phone.trim(),
        phone: values.phone.trim(),
        password: values.password,
        name: values.name.trim(),
      });
      setSubmitted({
        phone: values.phone.trim(),
        className: target?.path || target?.name || '所选班级',
      });
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

  const shell = (children: ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: 470, maxWidth: '100%' }} className="bp-corners">
        <div style={{ marginBottom: 16 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/user/login')}>
            返回登录
          </Button>
        </div>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>REGISTER / 学员注册</div>
        <div className="bp-title" style={{ fontSize: 18, margin: '6px 0 6px' }}>
          {system?.name || '注册新账号'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 18 }}>
          注册后由老师审核；审核通过前不能登录。
        </div>
        {children}
      </Card>
    </div>
  );

  if (submitted) {
    return shell(
      <>
        <Alert
          type="success"
          showIcon
          title="注册申请已提交"
          description="请把这个页面关掉也可以；审核通过后，用下面的手机号和刚才设置的密码登录。"
          style={{ marginBottom: 16 }}
        />
        <div style={{ border: '1px solid var(--bp-line)', padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <span style={{ color: 'var(--bp-text-soft)', fontSize: 12 }}>登录手机号</span>
            <strong>{submitted.phone}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: 'var(--bp-text-soft)', fontSize: 12 }}>注册班级</span>
            <span style={{ textAlign: 'right' }}>{submitted.className}</span>
          </div>
        </div>
        <Alert
          type="info"
          showIcon
          title="审核前登录会提示账号未启用"
          description="如果长时间没有通过，请联系注册班级的班主任或系统管理员。"
          style={{ marginBottom: 16 }}
        />
        <Button type="primary" block onClick={() => navigate('/user/login')}>
          返回登录
        </Button>
      </>
    );
  }

  if (!globalEnabled) {
    return shell(
      <Alert
        type="warning"
        showIcon
        title="当前系统未开放注册"
        description="管理员关闭了全局注册；请联系班主任或管理员直接开通账号。"
        action={
          <Button size="small" onClick={() => navigate('/user/login')}>
            去登录
          </Button>
        }
      />,
    );
  }

  if (!enabled || classes.length === 0) {
    return shell(
      <Alert
        type="warning"
        showIcon
        title="当前没有班级开放注册"
        description="全局注册已开启，但还没有教学班开放注册；请联系班主任或管理员在「班级设置 → 开放注册」里打开一个班。"
        action={
          <Button size="small" onClick={() => navigate('/user/login')}>
            去登录
          </Button>
        }
      />,
    );
  }

  return shell(
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 18,
        }}
      >
        {[
          ['1', '选择班级'],
          ['2', '填手机号/姓名/密码'],
          ['3', '等老师审核'],
        ].map(([step, label]) => (
          <div key={step} style={{ border: '1px solid var(--bp-line)', padding: '8px 10px' }}>
            <div className="bp-tag" style={{ display: 'inline-block', marginBottom: 4 }}>
              {step}
            </div>
            <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', lineHeight: 1.5 }}>{label}</div>
          </div>
        ))}
      </div>

      <Form form={form} layout="vertical" requiredMark={false} onFinish={submit} size="large">
        <Form.Item
          name="classId"
          label="选择班级"
          extra="只显示开放注册的班级；注册后由该班老师审核"
          rules={[{ required: true, message: '请选择要注册的班级' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="请选择班级"
            options={classes.map((item) => ({ value: item.id, label: item.path || item.name || item.id }))}
          />
        </Form.Item>
        <Form.Item
          name="phone"
          label="手机号（登录账号）"
          extra="11 位手机号，审核通过后用它登录"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的 11 位手机号' },
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="11 位手机号" maxLength={11} inputMode="numeric" />
        </Form.Item>
        <Form.Item
          name="name"
          label="姓名"
          extra="请填真实姓名，方便老师核对"
          rules={[{ required: true, whitespace: true, message: '请输入姓名' }]}
        >
          <Input placeholder="真实姓名" />
        </Form.Item>
        <Form.Item
          name="password"
          label="密码"
          extra="至少 8 位，注册后请记住"
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
          提交注册申请
        </Button>
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--bp-text-soft)', lineHeight: 1.7 }}>
          <Tag color="orange" style={{ marginInlineEnd: 6 }}>
            注意
          </Tag>
          提交后不会立即生效：老师审核通过后，才能用手机号登录。
        </div>
      </Form>
    </>,
  );
}
