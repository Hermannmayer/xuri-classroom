import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Segmented,
  Select,
  Spin,
  Switch,
  Tabs,
  Upload,
} from 'antd';
import { SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { get, getSystem, post } from '../../api';
import { COPY_PROTECT_EVENT } from '../../components/CopyGuard';
import { WATERMARK_EVENT } from '../../components/Watermark';
import type { WatermarkMode } from '../../components/Watermark';

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

/** 内容与隐私：水印/防复制三项都是即时保存，缺省全部开启（与后端契约一致） */
interface ProtectionSetting {
  watermarkEnabled: boolean;
  watermarkMode: WatermarkMode;
  copyProtected: boolean;
}

const DEFAULT_PROTECTION: ProtectionSetting = {
  watermarkEnabled: true,
  watermarkMode: 'name_phone',
  copyProtected: true,
};

/** 后端 watermarkMode 是 string；老数据 / 脏值（含 null）一律回落到默认的「姓名+手机号」 */
function normalizeMode(value?: string | null): WatermarkMode {
  return value === 'name' || value === 'phone' ? value : 'name_phone';
}

type TabKey = 'basic' | 'access' | 'ai';

const TAB_FIELDS: Record<TabKey, string[]> = {
  basic: ['name', 'description', 'avatar', 'copyright', 'recordNum', 'favicon'],
  access: ['captchaEnabled', 'registerEnabled', 'roles'],
  ai: ['aiEnabled', 'baseUrl', 'apiKey', 'models', 'defaultModel', 'prompt'],
};

/**
 * 系统设置：四个区块（基本 / 登录与注册 / 内容与隐私 / AI），每个区块只渲染一次。
 *
 * 历史问题：早先「内容与隐私保护」是一张放在 Tabs 之外的 Card，切到任何 Tab 它都挂在下面，
 * 看起来就像每个 Tab 都重复了一遍；现在它有自己的 Tab，页面里只有一份。
 *
 * 保存方式分两种：
 * - 基本 / 登录与注册 / AI 走 Form + 各自底部的「保存」按钮（save）；
 * - 内容与隐私是「改完即存」，直接 POST /api/system/update 的 setting 增量字段（后端 merge 式更新），
 *   保存成功后广播 window 事件，让 main.tsx 里挂的水印 / 防复制组件立即生效。
 *
 * 品牌字段只能用后端 SystemInfoRequest 已支持的：name、description、avatar（Logo）、
 * setting.copyright、setting.recordNum、setting.favicon。
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
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const roles = Form.useWatch<string[] | undefined>('roles', form) ?? [];
  // 内容与隐私三项不进 Form，改完即存
  const [protection, setProtection] = useState<ProtectionSetting>(DEFAULT_PROTECTION);
  const [savingProtection, setSavingProtection] = useState(false);
  // 导出密码只写不读：GET /api/system 不回显明文，hasExportPassword 仅用于提示「已设置」
  const [exportPassword, setExportPassword] = useState('');
  const [hasExportPassword, setHasExportPassword] = useState(false);
  const [savingExportPassword, setSavingExportPassword] = useState(false);

  const load = useCallback(async () => {
    const [sys, ai, deptRes, roleRes] = await Promise.all([
      getSystem(),
      get<AiSetting>('/api/system/aiSetting').catch(() => ({}) as AiSetting),
      get<{ id: string; name: string }[]>('/api/system/dept/list').catch((): { id: string; name: string }[] => []),
      get<{ list?: Role[] }>('/api/system/role/list', { current: 1, pageSize: 100 }).catch(
        (): { list?: Role[] } => ({ list: [] }),
      ),
    ]);
    setRoleOptions(roleRes?.list ?? []);
    setDepts(Array.isArray(deptRes) ? deptRes : []);
    form.setFieldsValue({
      name: sys?.name,
      description: sys?.description,
      avatar: sys?.avatar,
      copyright: sys?.setting?.copyright,
      recordNum: sys?.setting?.recordNum,
      favicon: sys?.setting?.favicon,
      captchaEnabled: Boolean(sys?.setting?.captchaEnabled),
      registerEnabled: Boolean(sys?.registerInfo?.registerEnabled),
      registerDeptId: sys?.registerInfo?.deptId,
      // 注册默认角色存的是角色 id；没配置时是空数组
      roles: sys?.registerInfo?.roles ?? [],
      aiEnabled: Boolean(ai?.enabled),
      baseUrl: ai?.baseUrl,
      apiKey: ai?.apiKey,
      models: ai?.models ?? [],
      defaultModel: ai?.defaultModel,
      prompt: ai?.prompt,
    });
    // 水印 / 防复制缺省都开启：后端没返回这些字段（旧版本）时也按「开着 + 姓名+手机号」显示
    setProtection({
      watermarkEnabled: sys?.setting?.watermarkEnabled !== false,
      watermarkMode: normalizeMode(sys?.setting?.watermarkMode),
      copyProtected: sys?.setting?.copyProtected !== false,
    });
    // 导出密码：后端只回显 exportPasswordEnabled（不回显明文），据此提示「是否已设置」
    setHasExportPassword(Boolean(sys?.setting?.exportPasswordEnabled));
    setExportPassword('');
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

  /**
   * 内容与隐私：单项改完立即保存，只提交改动的那一个字段（后端是 merge 式更新）。
   * 先乐观更新界面，失败回滚到改动前并给出错误提示。
   */
  const saveProtection = async (patch: Partial<ProtectionSetting>) => {
    const prev = protection;
    const next = { ...prev, ...patch };
    setProtection(next);
    setSavingProtection(true);
    try {
      await post('/api/system/update', { setting: patch });
      message.success('已保存');
      // 广播给全局的水印 / 防复制组件，立即按新设置生效，不用刷新整页
      window.dispatchEvent(
        new CustomEvent(COPY_PROTECT_EVENT, { detail: { copyProtected: next.copyProtected } }),
      );
      window.dispatchEvent(
        new CustomEvent(WATERMARK_EVENT, {
          detail: { watermarkEnabled: next.watermarkEnabled, watermarkMode: next.watermarkMode },
        }),
      );
    } catch (e) {
      setProtection(prev); // 失败回滚，避免界面显示成「已生效」而后端没存上
      message.error((e as Error).message);
    } finally {
      setSavingProtection(false);
    }
  };

  /**
   * 导出密码：只写不读（后端不回显明文），输入框留空 + 点保存 = 清除密码、关闭保护。
   * 清除前二次确认，避免管理员误点把保护关掉。
   */
  const saveExportPassword = async () => {
    const value = exportPassword.trim();
    if (!value && hasExportPassword) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: '清空导出密码？',
          content: '清空后导出题库与答卷不再需要密码，任何人都能直接导出。',
          okText: '清空并关闭保护',
          cancelText: '取消',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirmed) return;
    }
    setSavingExportPassword(true);
    try {
      await post('/api/system/update', { setting: { exportPassword: value } });
      setHasExportPassword(Boolean(value));
      setExportPassword(''); // 输入框回到空白，不保留明文
      message.success(value ? '导出密码已保存' : '已关闭导出密码保护');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSavingExportPassword(false);
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
        const selectedRoles = Array.isArray(v.roles) ? (v.roles as string[]) : [];
        if (v.registerEnabled && selectedRoles.length === 0) {
          message.warning('已开启注册但未选择默认角色：注册用户登录后将看不到任何菜单');
        }
        // registerEnabled 和 roles 一起提交；roles 传空数组会清空后端配置（merge 按非 null 覆盖）
        await post('/api/system/update', {
          setting: { captchaEnabled: Boolean(v.captchaEnabled) },
          registerInfo: { registerEnabled: Boolean(v.registerEnabled), roles: selectedRoles, deptId: v.registerDeptId },
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
                label: '基本',
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
                label: '登录与注册',
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
                    <Form.Item name="registerDeptId" label="新用户默认部门" extra="注册用户会自动进入这个部门；不选则进根部门">
                      <Select
                        allowClear
                        placeholder="默认根部门"
                        options={depts.map((d) => ({ value: d.id, label: d.name }))}
                      />
                    </Form.Item>
                    {registerEnabled && roles.length === 0 && (
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
                key: 'privacy',
                label: '内容与隐私',
                forceRender: true,
                children: (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 16, lineHeight: 1.7 }}>
                      以下设置改完即时保存。水印与防复制作用于全站；导出密码用于导出题库/答卷前的二次确认。
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <ProtectionRow
                        label="全站水印"
                        hint="登录后每页平铺淡色水印；登录、注册、公开答题等匿名页面不显示"
                      >
                        <Switch
                          checked={protection.watermarkEnabled}
                          loading={savingProtection}
                          checkedChildren="开启"
                          unCheckedChildren="关闭"
                          onChange={(checked) => void saveProtection({ watermarkEnabled: checked })}
                        />
                      </ProtectionRow>
                      <ProtectionRow label="水印内容" hint="手机号默认中间四位打码，避免完整号码随截图流出">
                        <Segmented
                          value={protection.watermarkMode}
                          onChange={(value) => void saveProtection({ watermarkMode: value as WatermarkMode })}
                          options={[
                            { label: '姓名+手机号', value: 'name_phone' },
                            { label: '仅姓名', value: 'name' },
                            { label: '仅手机号', value: 'phone' },
                          ]}
                        />
                      </ProtectionRow>
                      <ProtectionRow
                        label="防复制"
                        hint="拦截右键、复制、剪切与开发者工具快捷键；粘贴和输入框编辑不受影响"
                      >
                        <Switch
                          checked={protection.copyProtected}
                          loading={savingProtection}
                          checkedChildren="开启"
                          unCheckedChildren="关闭"
                          onChange={(checked) => void saveProtection({ copyProtected: checked })}
                        />
                      </ProtectionRow>
                      <hr className="bp-dim" style={{ margin: '2px 0' }} />
                      <ProtectionRow
                        label="导出密码"
                        hint="设置后，导出题库或答卷都需要输入此密码；留空表示不启用。密码只保存不回显，重新输入并保存即可修改"
                      >
                        <Input.Password
                          value={exportPassword}
                          onChange={(e) => setExportPassword(e.target.value)}
                          placeholder={hasExportPassword ? '已设置，输入新密码可修改' : '留空表示不启用'}
                          autoComplete="new-password"
                          style={{ width: 200 }}
                        />
                        <Button
                          size="small"
                          type="primary"
                          loading={savingExportPassword}
                          onClick={() => void saveExportPassword()}
                        >
                          保存
                        </Button>
                      </ProtectionRow>
                    </div>
                  </>
                ),
              },
              {
                key: 'ai',
                label: 'AI',
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

/** 内容与隐私的一行：左侧固定宽度标签 + 控件，下面一行灰色说明 */
function ProtectionRow({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ width: 96, flex: '0 0 auto', fontSize: 13 }}>{label}</span>
        {children}
      </div>
      <div style={{ marginTop: 4, paddingLeft: 108, fontSize: 11, color: 'var(--bp-text-soft)' }}>{hint}</div>
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
