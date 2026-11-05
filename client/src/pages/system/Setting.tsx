import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, message, Select, Spin, Switch, Tabs, Upload } from 'antd';
import { SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { get, getSystem, post } from '../../api';

/** 对齐后端 SystemInfo.AiSetting；GET /api/system/aiSetting 不回显 apiKey（服务端脱敏） */
interface AiSetting {
  enabled?: boolean;
  baseUrl?: string;
  apiKey?: string;
  models?: string[];
  defaultModel?: string;
  prompt?: string;
}

/** 对齐后端 RoleView；registerInfo.roles 存的是角色 id */
interface Role {
  id: string;
  name?: string;
  code?: string;
}

type TabKey = 'basic' | 'access' | 'ai';

const TAB_FIELDS: Record<TabKey, string[]> = {
  basic: ['name', 'description', 'avatar', 'copyright', 'recordNum', 'favicon'],
  access: ['captchaEnabled', 'registerEnabled', 'roles'],
  ai: ['aiEnabled', 'baseUrl', 'apiKey', 'models', 'defaultModel', 'prompt'],
};

/**
 * 系统设置：品牌信息 / 登录与验证码 / AI 设置。
 * 品牌字段只能用后端 SystemInfoRequest 已支持的：name、description、avatar（Logo）、
 * setting.copyright、setting.recordNum。
 * favicon 后端没有字段（SystemSetting 是强类型，塞 setting JSON 会被 mergeSysInfo 丢掉），
 * 需要后端加 SystemSetting.favicon 并同步写入后，这里再加输入框。
 * 上传走 POST /api/file/create（multipart，publicRead=true），返回文件 id，
 * 前端存公开预览地址 /api/public/preview/<id> 到 avatar，登录页未登录也能加载。
 */
export default function SystemSetting() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<TabKey>();
  const [uploading, setUploading] = useState(false);
  const [roleOptions, setRoleOptions] = useState<Role[]>([]);
  const models = Form.useWatch<string[] | undefined>('models', form) ?? [];
  const logo = Form.useWatch<string | undefined>('avatar', form);
  const registerEnabled = Form.useWatch<boolean | undefined>('registerEnabled', form);
  const registerRoles = Form.useWatch<string[] | undefined>('roles', form) ?? [];

  const load = useCallback(async () => {
    const [sys, ai, roleRes] = await Promise.all([
      getSystem(),
      get<AiSetting>('/api/system/aiSetting').catch(() => ({}) as AiSetting),
      get<{ list?: Role[] }>('/api/system/role/list', { current: 1, pageSize: 100 }).catch(
        (): { list?: Role[] } => ({ list: [] }),
      ),
    ]);
    setRoleOptions(roleRes?.list ?? []);
    form.setFieldsValue({
      name: sys?.name,
      description: sys?.description,
      avatar: sys?.avatar,
      copyright: sys?.setting?.copyright,
      recordNum: sys?.setting?.recordNum,
      favicon: sys?.setting?.favicon,
      captchaEnabled: Boolean(sys?.setting?.captchaEnabled),
      registerEnabled: Boolean(sys?.registerInfo?.registerEnabled),
      // 注册默认角色存的是角色 id；没配置时是空数组
      roles: sys?.registerInfo?.roles ?? [],
      aiEnabled: Boolean(ai?.enabled),
      baseUrl: ai?.baseUrl,
      apiKey: ai?.apiKey,
      models: ai?.models ?? [],
      defaultModel: ai?.defaultModel,
      prompt: ai?.prompt,
    });
  }, [form]);

  useEffect(() => {
    let alive = true;
    load()
      .catch((e: Error) => message.error(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [load]);

  /** 上传 Logo：POST /api/file/create（publicRead=true 才能被未登录的登录页访问），返回 id 后转公开预览地址 */
  const uploadLogo = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('publicRead', 'true');
    setUploading(true);
    try {
      const uploaded = await post<{ id?: string }>('/api/file/create', fd);
      if (!uploaded?.id) throw new Error('上传失败：未返回文件 id');
      form.setFieldValue('avatar', `/api/public/preview/${uploaded.id}`);
      message.success('Logo 已上传，记得点保存');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (key: TabKey) => {
    let v: Record<string, unknown>;
    try {
      v = await form.validateFields(TAB_FIELDS[key]);
    } catch {
      return; // 校验提示已经在字段上
    }
    const baseUrl = String(v.baseUrl ?? '').trim();
    if (key === 'ai' && v.aiEnabled && !baseUrl) {
      message.error('开启 AI 需要填写 Base URL');
      return;
    }
    setSaving(key);
    try {
      if (key === 'basic') {
        await post('/api/system/update', {
          name: v.name,
          description: v.description,
          avatar: v.avatar,
          setting: { copyright: v.copyright, recordNum: v.recordNum, favicon: v.favicon },
        });
      } else if (key === 'access') {
        const roles = Array.isArray(v.roles) ? (v.roles as string[]) : [];
        if (v.registerEnabled && roles.length === 0) {
          message.warning('已开启注册但未选择默认角色：注册用户登录后将看不到任何菜单');
        }
        // registerEnabled 和 roles 一起提交；roles 传空数组会清空后端配置（merge 按非 null 覆盖）
        await post('/api/system/update', {
          setting: { captchaEnabled: Boolean(v.captchaEnabled) },
          registerInfo: { registerEnabled: Boolean(v.registerEnabled), roles },
        });
      } else {
        await post('/api/system/update', {
          aiSetting: {
            enabled: Boolean(v.aiEnabled),
            baseUrl,
            apiKey: v.apiKey,
            models: v.models,
            defaultModel: v.defaultModel,
            prompt: v.prompt,
          },
        });
      }
      message.success('已保存');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(undefined);
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
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>SYSTEM / 系统设置</div>
        <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
          系统信息
        </div>
      </div>

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}>
        <Form form={form} layout="vertical" size="small" requiredMark={false}>
          <Tabs
            items={[
              {
                key: 'basic',
                label: '品牌',
                forceRender: true,
                children: (
                  <>
                    <Form.Item name="name" label="系统名称" rules={[{ required: true, message: '请输入系统名称' }]}>
                      <Input placeholder="显示在浏览器标题、登录页与侧栏" />
                    </Form.Item>
                    <Form.Item name="description" label="系统简称（副标题）" extra="登录页标题下方的副标题">
                      <Input placeholder="例如：让问卷与考试更简单高效" allowClear />
                    </Form.Item>
                    <Form.Item
                      name="avatar"
                      label="Logo"
                      extra="填图片 URL，或上传本地图片；登录页与侧栏共用这一个 Logo"
                    >
                      <Input placeholder="https://… 或 /api/public/preview/<id>" allowClear />
                    </Form.Item>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: -10, marginBottom: 18 }}>
                      <Upload
                        accept="image/*"
                        showUploadList={false}
                        beforeUpload={(file) => {
                          void uploadLogo(file);
                          return false;
                        }}
                      >
                        <Button size="small" icon={<UploadOutlined />} loading={uploading}>
                          上传图片
                        </Button>
                      </Upload>
                      {logo ? (
                        <img
                          src={logo}
                          alt="Logo 预览"
                          style={{ height: 36, maxWidth: 180, objectFit: 'contain', border: '1px solid var(--bp-line)' }}
                        />
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>未设置 Logo</span>
                      )}
                    </div>
                    <Form.Item name="copyright" label="版权信息">
                      <Input placeholder="例如 © 2025 某某机构" allowClear />
                    </Form.Item>
                    <Form.Item name="recordNum" label="备案号">
                      <Input placeholder="例如 京ICP备00000000号" allowClear />
                    </Form.Item>
                    <Form.Item name="favicon" label="Favicon" extra="浏览器标签页图标 URL，留空则用 Logo">
                      <Input placeholder="https://…/favicon.ico" allowClear />
                    </Form.Item>
                    <SaveBar loading={saving === 'basic'} onSave={() => void save('basic')} />
                  </>
                ),
              },
              {
                key: 'access',
                label: '登录与验证码',
                forceRender: true,
                children: (
                  <>
                    <Form.Item
                      name="captchaEnabled"
                      label="登录验证码"
                      valuePropName="checked"
                      extra="开启后登录需要图形验证码"
                    >
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                    <Form.Item
                      name="registerEnabled"
                      label="开放注册"
                      valuePropName="checked"
                      extra="关闭后只能由管理员在用户管理里创建账号"
                    >
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                    <Form.Item
                      name="roles"
                      label="注册默认角色"
                      extra="注册用户自动获得这些角色；不选角色时注册用户无法访问任何菜单"
                    >
                      <Select
                        mode="multiple"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="选择注册后默认赋予的角色"
                        options={roleOptions.map((role) => ({
                          value: role.id,
                          label: role.name || role.code || role.id,
                        }))}
                      />
                    </Form.Item>
                    {registerEnabled && registerRoles.length === 0 && (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                        message="已开启注册但未选择默认角色"
                        description="注册用户登录后将看不到任何菜单，请在下面选择至少一个默认角色。"
                      />
                    )}
                    <SaveBar loading={saving === 'access'} onSave={() => void save('access')} />
                  </>
                ),
              },
              {
                key: 'ai',
                label: 'AI 设置',
                forceRender: true,
                children: (
                  <>
                    <Form.Item name="aiEnabled" label="启用 AI" valuePropName="checked" extra="关闭后所有 AI 能力不可用">
                      <Switch checkedChildren="启用" unCheckedChildren="停用" />
                    </Form.Item>
                    <Form.Item
                      name="baseUrl"
                      label="API Base URL"
                      extra="OpenAI 兼容地址，例如 https://api.openai.com/v1"
                    >
                      <Input placeholder="https://api.openai.com/v1" allowClear />
                    </Form.Item>
                    <Form.Item
                      name="apiKey"
                      label="API Key"
                      extra="出于安全考虑服务端不回显；留空表示保持原值"
                    >
                      <Input.Password placeholder="留空表示不修改" autoComplete="new-password" />
                    </Form.Item>
                    <Form.Item name="models" label="模型列表" extra="回车添加，可填多个">
                      <Select mode="tags" placeholder="例如 gpt-4o-mini" tokenSeparators={[',', ' ']} />
                    </Form.Item>
                    <Form.Item name="defaultModel" label="默认模型">
                      <Select
                        allowClear
                        showSearch
                        placeholder="从模型列表中选择"
                        options={models.map((m) => ({ value: m, label: m }))}
                      />
                    </Form.Item>
                    <Form.Item name="prompt" label="系统提示词" extra="作为 AI 对话的系统角色内容，选填">
                      <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} placeholder="选填" />
                    </Form.Item>
                    <SaveBar loading={saving === 'ai'} onSave={() => void save('ai')} />
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

/** 每个 Tab 底部的保存条：虚线段 + 保存按钮 */
function SaveBar({ loading, onSave }: { loading: boolean; onSave: () => void }) {
  return (
    <>
      <hr className="bp-dim" style={{ margin: '4px 0 16px' }} />
      <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={onSave}>
        保存
      </Button>
    </>
  );
}
