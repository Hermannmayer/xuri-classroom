import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, ConfigProvider, Form, Input, InputNumber, Modal, Segmented, Select, Spin, Switch, Tabs, Tag, Upload, message } from 'antd';
import { useIsMobile } from '../../hooks/useIsMobile';
import { DownloadOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { download, get, getAiModels, getSystem, post } from '../../api';
import { getAiStatus, getAiUsageToday } from '../../api/ai';
import type { AiStatus, AiUsageToday } from '../../api/ai';
import { can, loadAuthorities } from '../../auth/permissions';
import { COPY_PROTECT_EVENT } from '../../components/CopyGuard';
import { WATERMARK_EVENT } from '../../components/Watermark';
import type { WatermarkMode } from '../../components/Watermark';
import { formatTokens, limitText } from '../../components/AiAssistant/format';
import type { RegisterOptions } from '../../api';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import AiCapabilityGuide from '../ai-guide/AiGuide';
import ApiTokenPanel from './ApiTokenPanel';
// MCP 三步接入引导：/ai 导览页下线后，这份「照抄就能用」的客户端配置片段挂到令牌面板下面
import McpGuide from '../ai-guide/McpGuide';

/**
 * 对齐后端 SystemInfo.AiSetting；GET /api/system/aiSetting 不回显 apiKey（服务端脱敏）。
 * 五个限额字段默认 null 时由后端回落到「真正生效的数字」，所以这里拿到的一定是生效值。
 */
interface AiSetting {
  enabled?: boolean;
  baseUrl?: string;
  apiKey?: string;
  models?: string[];
  defaultModel?: string;
  prompt?: string;
  /** 全站每日 token，默认 200 万；0 表示不限 */
  dailyTokenLimit?: number;
  /** 单用户每日 token，默认 20 万；0 表示不限 */
  perUserDailyLimit?: number;
  /** 一次对话最多带几条历史，默认 20（2~100） */
  maxChatTurns?: number;
  /** 单条消息最多多少字，默认 4000（200~20000） */
  maxTurnChars?: number;
  /** 每用户每分钟最多调用几次，默认 10（1~600） */
  rateLimitPerMinute?: number;
}

/** 对齐后端 RoleView；registerInfo.roles 存的是角色 id */
interface Role {
  id: string;
  name?: string;
  code?: string;
}

/** 基本 Tab 里的水印/防复制三项：都是即时保存，缺省全部开启（与后端契约一致） */
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

/** 匿名答卷清理：SystemInfo.setting 的新增字段（api 层类型还没跟上，这里局部声明） */
interface AnonymousCleanupSetting {
  anonymousCleanupEnabled?: boolean;
  anonymousRetentionDays?: number;
  /** 上次清理时间：后端 Date 序列化，字符串或 epoch 毫秒 */
  anonymousLastCleanupAt?: string | number;
  anonymousLastCleanupCount?: number;
  /** 是否把进回收站够久的匿名答卷物理删掉（含附件），默认关闭 */
  anonymousPurgeEnabled?: boolean;
  /** 进回收站后保留几天再物理清理（1~3650，默认 7） */
  anonymousPurgeDelayDays?: number;
}

/** 答卷 PDF 导出：SystemInfo.setting 的新增字段（api 层类型还没跟上，这里局部声明） */
interface ExportPdfSetting {
  /** 渲染并发数：1~2，缺省 1（4 核小机器，别开大） */
  answerPdfConcurrency?: number;
  /** 考试进行中暂停 PDF 导出，缺省开启 */
  pauseAnswerPdfDuringExam?: boolean;
}

/** 后端 watermarkMode 是 string；老数据 / 脏值（含 null）一律回落到默认的「姓名+手机号」 */
function normalizeMode(value?: string | null): WatermarkMode {
  return value === 'name' || value === 'phone' ? value : 'name_phone';
}

type TabKey = 'basic' | 'access' | 'content' | 'ai' | 'system';

/** Tab 顺序即页面顺序：基本 → 登录与注册 → 内容与导出 → AI → 系统与更新 */
const TAB_KEYS: TabKey[] = ['basic', 'access', 'content', 'ai', 'system'];

/**
 * 每个 Tab 要校验/提交的字段。
 *
 * 这张表与下面的 save(key) 分支必须同步改：错位的表现是「改完点保存没反应」或者
 * 「保存的其实是另一个 Tab 的值」，而且报错信息完全看不出来。
 */
const TAB_FIELDS: Record<TabKey, string[]> = {
  basic: ['name', 'description', 'avatar', 'copyright', 'recordNum', 'favicon'],
  access: [
    'captchaEnabled',
    'registerEnabled',
    'roles',
    'anonymousCleanupEnabled',
    'anonymousRetentionDays',
    'anonymousPurgeEnabled',
    'anonymousPurgeDelayDays',
  ],
  content: ['answerPdfConcurrency', 'pauseAnswerPdfDuringExam'],
  ai: [
    'aiEnabled',
    'baseUrl',
    'apiKey',
    'models',
    'defaultModel',
    'prompt',
    'dailyTokenLimit',
    'perUserDailyLimit',
    'maxChatTurns',
    'maxTurnChars',
    'rateLimitPerMinute',
  ],
  system: ['updateCheckEnabled', 'updateGithubRepo', 'updateApiBase', 'updateManifestUrl', 'updateCheckIntervalHours'],
};

/**
 * 7 Tab 时代的老 key：书签、聊天记录里的链接还按老名字直达。
 * 不知道名字就直接掉回「基本」，比渲染空白页强。
 */
const LEGACY_TAB_ALIAS: Record<string, TabKey> = {
  privacy: 'basic',
  anonymous: 'access',
  export: 'content',
  update: 'system',
  token: 'system',
};

function normalizeTab(value: string): TabKey {
  const mapped = (LEGACY_TAB_ALIAS[value] ?? value) as TabKey;
  return TAB_KEYS.includes(mapped) ? mapped : 'basic';
}

/** 单个平台的安装包（来自 Release 里附带的 update.json） */
interface UpdateAsset {
  file?: string;
  url?: string;
  size?: number;
  sha256?: string;
}

interface UpdateCheckInfo {
  currentVersion?: string;
  latestVersion?: string;
  hasUpdate?: boolean;
  enabled?: boolean;
  notes?: string;
  downloadUrl?: string;
  error?: string;
  /** stable（正式版）/ nightly */
  channel?: string;
  /** 各平台资产；有 jar 才能「下载到服务器」 */
  assets?: Record<string, UpdateAsset>;
}

/**
 * 系统设置：基本 / 登录与注册 / 内容与导出 / AI / 系统与更新。
 *
 * 为什么从 7 个 Tab 收到 5 个：原来「内容与隐私」「答卷导出」「匿名答卷」「MCP 令牌」各占一个 Tab，
 * （MCP 令牌后来又从「系统与更新」挪进了「AI」：它服务的是 AI 客户端，不是运维动作）
 * 管理员为了改一个水印要记住它在第几个 Tab 里；合并的规则是「同一类人、同一件事」——
 * 品牌与水印都在「基本」，登录与注册 + 匿名答卷都在「开放入口」，导出密码与 PDF 并发都在「内容与导出」，
 * 检查更新与令牌都是「运维动作」。合并只改归属，不改任何一条接口与权限。
 *
 * 保存方式分三种（合并后仍然三种，没有互相污染）：
 * - 基本 / 登录与注册 / 内容与导出 / AI / 系统与更新走 Form + 各自底部的「保存」（save），
 *   接口是 POST /api/system/update，权限 system:setting:update（或 admin）；
 * - 基本里的水印 / 防复制是「改完即存」，走独立接口 POST /api/system/protection（只写
 *   copyProtected / watermarkEnabled / watermarkMode，其它字段后端一律忽略），权限 content:protect，
 *   保存成功后广播 window 事件，让 main.tsx 里挂的水印 / 防复制组件立即生效；
 * - AI 页签里的「MCP / API 令牌」面板不走保存按钮：列表 / 签发 / 撤销都是即时生效的独立接口，
 *   权限同样是 system:setting:update；没有该权限时不渲染列表、也不发请求。
 *
 * 品牌字段只能用后端 SystemInfoRequest 已支持的：name、description、avatar（Logo）、
 * setting.copyright、setting.recordNum、setting.favicon。
 * 上传走 POST /api/file/create（multipart，publicRead=true），返回文件 id，
 * 前端存公开预览地址 /api/public/preview/<id> 到 avatar，登录页未登录也能加载。
 */
export default function SystemSetting() {
  const [form] = Form.useForm();
  // 检查更新不再自己渲染「新版本说明」：发现新版本后跳公告中心看系统公告（实施计划 4.7）
  const navigate = useNavigate();
  /** 当前 Tab 跟着 ?tab= 走：/ai 与 AI 对话框的「去设置」都靠这个参数落到 AI 页签 */
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<TabKey>();
  /** 「从服务商获取模型列表」的加载态：请求期间按钮 loading，避免连点把服务商打出 429 */
  const [fetchingModels, setFetchingModels] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [roleOptions, setRoleOptions] = useState<Role[]>([]);
  /** 已开放注册的教学班数量：全局开但为 0 时提示老师去开班级 */
  const [openClassCount, setOpenClassCount] = useState(0);
  const models = Form.useWatch<string[] | undefined>('models', form) ?? [];
  const logo = Form.useWatch<string | undefined>('avatar', form);
  const registerEnabled = Form.useWatch<boolean | undefined>('registerEnabled', form);
  const aiEnabled = Form.useWatch<boolean | undefined>('aiEnabled', form);
  const roles = Form.useWatch<string[] | undefined>('roles', form) ?? [];
  // 基本里的水印 / 防复制三项不进 Form，改完即存
  const [protection, setProtection] = useState<ProtectionSetting>(DEFAULT_PROTECTION);
  const [savingProtection, setSavingProtection] = useState(false);
  // 导出密码只写不读：GET /api/system 不回显明文，hasExportPassword 仅用于提示「已设置」
  const [exportPassword, setExportPassword] = useState('');
  const [hasExportPassword, setHasExportPassword] = useState(false);
  const [savingExportPassword, setSavingExportPassword] = useState(false);
  // 匿名答卷清理：上次清理时间/条数由 load 从 SystemInfo.setting 读入；立即清理时单独 loading
  const [lastCleanupAt, setLastCleanupAt] = useState<string | number>();
  const [lastCleanupCount, setLastCleanupCount] = useState<number>();
  const [cleaning, setCleaning] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>();
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckInfo>();
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState<{ version?: string; file?: string; size?: number; sha256?: string }>();
  const [pendingInfo, setPendingInfo] = useState<{ pending?: boolean; version?: string; size?: number }>();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  /** 诊断日志导出中：导出要现打包日志，几秒到十几秒，按钮要有 loading */
  const [exportingDiag, setExportingDiag] = useState(false);
  /** 数据库结构状态：用户「覆盖程序没跑迁移」时，这里是唯一能一眼看到的地方 */
  const [schemaInfo, setSchemaInfo] = useState<{
    version?: string;
    schemaVersion?: string;
    schemaStatus?: string;
    schemaAppVersion?: string;
    schemaMessage?: string;
  }>();
  const [upgradingSchema, setUpgradingSchema] = useState(false);
  /** AI 现状：ready=false 时页面直接给出「还差哪几步」，而不是让人对着开关猜 */
  const [aiStatus, setAiStatus] = useState<AiStatus>();
  /** 今日用量：管理员据此判断要不要调限额 */
  const [usage, setUsage] = useState<AiUsageToday>();
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string>();

  const activeTab = normalizeTab(searchParams.get('tab') ?? '');
  const isMobile = useIsMobile();
  /** 点开过的 Tab：令牌面板只在真正进过「系统与更新」后才挂载（见下面的注释） */
  const [visitedTabs, setVisitedTabs] = useState<TabKey[]>(() => [activeTab]);

  /**
   * 路由守卫只要求 system:role:list，所以「能进页面」不等于「能保存」。
   * 保存动作统一要 system:setting:update（SystemApi.java 的 /update），没有就当只读页。
   */
  const [authorities, setAuthorities] = useState<string[]>([]);
  const canUpdate = can(authorities, PERMISSION_CODES.systemSettingUpdate);
  /**
   * 「内容与隐私」是独立权限点：content:protect（SystemProtectionApi.java 的 @PreAuthorize）。
   * can() 对 ROLE_admin 直接放行，所以这里等价于「content:protect || 管理员」。
   * 注意这里**不能**再并上 canUpdate：新接口只认 content:protect / admin，只有
   * system:setting:update 的角色点了保存会 403，不如直接置灰。
   * 反过来，只有 content:protect 的角色本页其它页签仍是只读（canUpdate 为 false）。
   */
  const canProtect = can(authorities, PERMISSION_CODES.contentProtect);
  /** 有没有公告中心入口：检查更新发现新版本时引导过去看系统公告（没有就不给按钮） */
  const canSeeNotice = can(authorities, PERMISSION_CODES.noticeList);
  /** Logo 上传走 /api/file/create，后端认 file:upload 或 file:import（FileApi.java 的 /create），与改系统设置分开 */
  const canUploadLogo = can(authorities, PERMISSION_CODES.fileUpload) || can(authorities, PERMISSION_CODES.fileImport);
  /** /api/ai/status 与 /api/ai/usage/today 都要求 ai:use（AiApi.java）；没有就压根不请求 */
  const canAiUse = can(authorities, PERMISSION_CODES.aiUse);

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  /** 切 Tab 写回 ?tab=：刷新、分享链接、浏览器后退都还能停在同一页签 */
  const changeTab = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', key);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    setVisitedTabs((prev) => (prev.includes(activeTab) ? prev : [...prev, activeTab]));
  }, [activeTab]);

  const load = useCallback(async () => {
    const [sys, ai, roleRes, registerOptions] = await Promise.all([
      getSystem(),
      get<AiSetting>('/api/system/aiSetting').catch(() => ({}) as AiSetting),
      get<{ list?: Role[] }>('/api/system/role/list', { current: 1, pageSize: 100 }).catch(
        (): { list?: Role[] } => ({ list: [] }),
      ),
      get<RegisterOptions>('/api/public/registerOptions').catch(() => undefined),
    ]);
    setRoleOptions(roleRes?.list ?? []);
    setOpenClassCount(registerOptions?.classes?.length ?? 0);
    const anonymous = (sys?.setting ?? {}) as unknown as AnonymousCleanupSetting;
    setLastCleanupAt(anonymous.anonymousLastCleanupAt);
    setLastCleanupCount(anonymous.anonymousLastCleanupCount);
    setCurrentVersion(sys?.version);
    // 顺便拿一次数据库结构状态：/api/system（系统信息）不带这些字段，只有 /version 有
    void get<{
      version?: string;
      schemaVersion?: string;
      schemaStatus?: string;
      schemaAppVersion?: string;
      schemaMessage?: string;
    }>('/api/system/version')
      .then(setSchemaInfo)
      .catch(() => undefined);
    form.setFieldsValue({
      name: sys?.name,
      description: sys?.description,
      avatar: sys?.avatar,
      copyright: sys?.setting?.copyright,
      recordNum: sys?.setting?.recordNum,
      favicon: sys?.setting?.favicon,
      captchaEnabled: Boolean(sys?.setting?.captchaEnabled),
      registerEnabled: sys?.registerInfo?.registerEnabled !== false,
      // 注册默认角色存的是角色 id；没配置时是空数组
      roles: sys?.registerInfo?.roles ?? [],
      // 缺省与后端一致：开启 + 90 天；只有显式 false 才关闭
      anonymousCleanupEnabled: anonymous.anonymousCleanupEnabled !== false,
      anonymousRetentionDays: anonymous.anonymousRetentionDays ?? 90,
      // 物理清理默认关闭（能恢复比省空间重要），只有显式 true 才开
      anonymousPurgeEnabled: anonymous.anonymousPurgeEnabled === true,
      anonymousPurgeDelayDays: anonymous.anonymousPurgeDelayDays ?? 7,
      // PDF 导出：缺省 1 并发 + 考试期间暂停（与后端默认一致，只有显式 false 才关）
      answerPdfConcurrency: ((sys?.setting ?? {}) as unknown as ExportPdfSetting).answerPdfConcurrency ?? 1,
      pauseAnswerPdfDuringExam:
        ((sys?.setting ?? {}) as unknown as ExportPdfSetting).pauseAnswerPdfDuringExam !== false,
      updateCheckEnabled: sys?.setting?.updateCheckEnabled !== false,
      updateGithubRepo: sys?.setting?.updateGithubRepo,
      updateApiBase: sys?.setting?.updateApiBase,
      updateManifestUrl: sys?.setting?.updateManifestUrl,
      updateCheckIntervalHours: sys?.setting?.updateCheckIntervalHours ?? 24,
      aiEnabled: Boolean(ai?.enabled),
      baseUrl: ai?.baseUrl,
      apiKey: ai?.apiKey,
      models: ai?.models ?? [],
      defaultModel: ai?.defaultModel,
      prompt: ai?.prompt,
      // 限额：后端已经把 null 回落成生效值，这里再兜一层默认值只是为了请求失败时不留空框
      dailyTokenLimit: ai?.dailyTokenLimit ?? 2000000,
      perUserDailyLimit: ai?.perUserDailyLimit ?? 200000,
      maxChatTurns: ai?.maxChatTurns ?? 20,
      maxTurnChars: ai?.maxTurnChars ?? 4000,
      rateLimitPerMinute: ai?.rateLimitPerMinute ?? 10,
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

  /**
   * 模型状态与今日用量：两个接口互不依赖，一个失败不该把另一个也吞掉
   * （比如 ai:use 有、但 AI 总开关关着时，status 仍然可读）。
   */
  const loadAiOverview = useCallback(async () => {
    if (!canAiUse) return;
    setUsageLoading(true);
    try {
      await Promise.all([
        getAiStatus()
          .then(setAiStatus)
          .catch(() => setAiStatus(undefined)),
        getAiUsageToday()
          .then((today) => {
            setUsage(today);
            setUsageError(undefined);
          })
          .catch((e: Error) => {
            setUsage(undefined);
            setUsageError(e.message);
          }),
      ]);
    } finally {
      setUsageLoading(false);
    }
  }, [canAiUse]);

  useEffect(() => {
    void loadAiOverview();
  }, [loadAiOverview]);

  /** 上传 Logo：POST /api/file/create（publicRead=true 才能被未登录的登录页访问），返回 id 后转公开预览地址 */
  const uploadLogo = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('publicRead', 'true');
    setUploading(true);
    try {
      const uploaded = await post<{ id?: string }>('/api/file/create', fd);
      if (!uploaded?.id) throw new Error('上传失败：未返回文件 id');
      form.setFieldValue('avatar', '/api/public/preview/' + uploaded.id);
      message.success('Logo 已上传，记得点保存');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  /**
   * 水印 / 防复制：单项改完立即保存，只提交改动的那一个字段。
   * 走独立接口 POST /api/system/protection（只认 content:protect / admin）：后端只接受
   * setting.copyProtected / setting.watermarkEnabled / setting.watermarkMode 三个字段，
   * 其余字段一律忽略，所以这里也只发这三项。
   * 先乐观更新界面，失败回滚到改动前并给出错误提示。
   */
  const saveProtection = async (patch: Partial<ProtectionSetting>) => {
    const prev = protection;
    const next = { ...prev, ...patch };
    setProtection(next);
    setSavingProtection(true);
    try {
      await post('/api/system/protection', { setting: patch });
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

  /** 立即清理：删除超过保留天数的匿名答卷（不可恢复）；成功后 re-load 拿最新「上次清理」信息 */
  const runCleanup = async () => {
    if (cleaning) return;
    setCleaning(true);
    try {
      // 后端契约是 { deleted }；返回裸数字时也兼容
      const res = await post<{ deleted?: number } | number>('/api/system/anonymous/cleanup');
      const deleted = typeof res === 'number' ? res : (res?.deleted ?? 0);
      message.success('已清理 ' + deleted + ' 份匿名答卷');
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setCleaning(false);
    }
  };

  const confirmCleanup = () => {
    Modal.confirm({
      title: '立即清理匿名答卷？',
      content: '会删除超过保留天数的匿名答卷，且不可恢复；登录用户与班级成绩不受影响。',
      okText: '立即清理',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => runCleanup(),
    });
  };

  /** 下载新版本到服务器的数据卷（后端校验 sha256 后落盘并写 apply.flag） */
  const downloadUpdateNow = async () => {
    setDownloading(true);
    try {
      const res = await post<{ version?: string; file?: string; size?: number; sha256?: string }>(
        '/api/system/update/download',
        {},
      );
      setDownloaded(res);
      message.success('已下载并校验通过');
    } catch {
      // request.ts 已经弹过错误，这里不再重复提示
    } finally {
      setDownloading(false);
    }
  };

  /** 读「已下载但还没应用」的状态：下载和安装是两步，界面要能看出卡在哪一步 */
  const loadPendingUpdate = async () => {
    try {
      const res = await get<{ pending?: boolean; version?: string; size?: number }>('/api/system/update/pending');
      setPendingInfo(res);
    } catch {
      // 状态读不到不影响别的功能，静默即可
    }
  };

  useEffect(() => {
    if (activeTab === 'system') void loadPendingUpdate();
  }, [activeTab]);

  const checkUpdateNow = async () => {
    setCheckingUpdate(true);
    try {
      const res = await get<UpdateCheckInfo>('/api/system/update/check', { force: true });
      setUpdateInfo(res);
      if (!res.enabled) {
        message.info('检查更新未启用，或还没有配置更新源');
      } else if (res.error) {
        message.error(res.error);
      } else if (res.hasUpdate) {
        // 4.6：发现新版本不再只提示版本号，直接引导到公告中心的系统公告
        message.info('发现新版本 v' + res.latestVersion + '，请到公告中心查看');
      } else {
        message.success('当前已是最新版本');
      }
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setCheckingUpdate(false);
    }
  };

  /**
   * 从服务商拉模型列表（系统设置 → AI →「从服务商获取」）。
   *
   * <p>带的是表单里的当前值而不是已保存值：管理员通常「先填 Key → 点获取 → 选模型 → 保存」，
   * 逼他先保存等于每次换服务商都要多按一次；API Key 留空时后端沿用已保存的那把。
   * 拉到的模型是**追加**到现有列表，不会把手工加的清掉。
   */
  const fetchModels = async () => {
    setFetchingModels(true);
    try {
      const baseUrl = String(form.getFieldValue('baseUrl') ?? '').trim();
      const apiKey = String(form.getFieldValue('apiKey') ?? '').trim();
      const result = await getAiModels({ baseUrl: baseUrl || undefined, apiKey: apiKey || undefined });
      const current = (form.getFieldValue('models') as string[] | undefined) ?? [];
      const merged = Array.from(new Set([...current, ...(result.models ?? [])]));
      form.setFieldValue('models', merged);
      if (!form.getFieldValue('defaultModel') && merged.length > 0) {
        form.setFieldValue('defaultModel', merged[0]);
      }
      message.success(`已获取 ${result.count} 个模型（当前共 ${merged.length} 个），记得点下面的「保存」`);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setFetchingModels(false);
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
    if (key === 'access') {
      const selectedRoles = Array.isArray(v.roles) ? (v.roles as string[]) : [];
      if (v.registerEnabled && selectedRoles.length === 0) {
        message.warning('已开启注册但未选择默认角色：注册用户登录后将看不到任何菜单');
      }
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
        // registerEnabled 和 roles 一起提交；roles 传空数组会清空后端配置（merge 按非 null 覆盖）。
        // 匿名答卷清理与「谁能注册」是同一件事的两面：都决定「陌生人能不能往系统里写东西」。
        await post('/api/system/update', {
          setting: {
            captchaEnabled: Boolean(v.captchaEnabled),
            anonymousCleanupEnabled: Boolean(v.anonymousCleanupEnabled),
            anonymousRetentionDays: Number(v.anonymousRetentionDays),
            anonymousPurgeEnabled: Boolean(v.anonymousPurgeEnabled),
            anonymousPurgeDelayDays: Number(v.anonymousPurgeDelayDays ?? 7),
          },
          registerInfo: {
            registerEnabled: Boolean(v.registerEnabled),
            roles: Array.isArray(v.roles) ? (v.roles as string[]) : [],
          },
        });
      } else if (key === 'content') {
        // 导出密码是只写字段（不走这个表单），这里只提交 PDF 导出的两个设置
        await post('/api/system/update', {
          setting: {
            answerPdfConcurrency: Number(v.answerPdfConcurrency ?? 1),
            pauseAnswerPdfDuringExam: Boolean(v.pauseAnswerPdfDuringExam),
          },
        });
      } else if (key === 'system') {
        await post('/api/system/update', {
          setting: {
            updateCheckEnabled: Boolean(v.updateCheckEnabled),
            updateGithubRepo: String(v.updateGithubRepo ?? '').trim(),
            updateApiBase: String(v.updateApiBase ?? '').trim(),
            updateManifestUrl: String(v.updateManifestUrl ?? '').trim(),
            updateCheckIntervalHours: Number(v.updateCheckIntervalHours ?? 24),
          },
        });
        try {
          localStorage.removeItem('sk-update-last-check');
        } catch {
          // localStorage 不可用时忽略
        }
      } else {
        // AI：模型配置与五个限额一起提交。限额漏提交的表现很隐蔽——页面显示新值、
        // 后端其实还在用默认值，所以这一段必须和 TAB_FIELDS.ai 一一对应。
        await post('/api/system/update', {
          aiSetting: {
            enabled: Boolean(v.aiEnabled),
            baseUrl,
            apiKey: v.apiKey,
            models: v.models,
            defaultModel: v.defaultModel,
            prompt: v.prompt,
            dailyTokenLimit: Number(v.dailyTokenLimit ?? 0),
            perUserDailyLimit: Number(v.perUserDailyLimit ?? 0),
            maxChatTurns: Number(v.maxChatTurns ?? 20),
            maxTurnChars: Number(v.maxTurnChars ?? 4000),
            rateLimitPerMinute: Number(v.rateLimitPerMinute ?? 10),
          },
        });
      }
      message.success('已保存');
      await load();
      // 保存后模型可能从「未就绪」变成「已就绪」，顶部的状态条要跟着变
      if (key === 'ai') await loadAiOverview();
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

  const usageLine = usage
    ? '我 ' +
      formatTokens(usage.userTokens) +
      ' / ' +
      limitText(usage.userLimit) +
      ' · 全站 ' +
      formatTokens(usage.dailyTokens) +
      ' / ' +
      limitText(usage.dailyLimit)
    : usageError
      ? '读取失败：' + usageError
      : '读取中…';

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>SYSTEM / 系统设置</div>
        <div className="bp-title" style={{ fontSize: 16, marginTop: 4 }}>
          系统信息
        </div>
      </div>

      {!canUpdate && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 14 }}
          title={
            canProtect
              ? '你没有修改系统设置的权限，但可以修改「基本」里的水印 / 防复制'
              : '你没有修改系统设置的权限'
          }
        />
      )}

      <Card className="bp-corners" style={{ border: '1px solid var(--bp-line)', background: 'rgba(30,58,95,0.55)' }}>
        <Form form={form} layout="vertical" size="small" requiredMark={false} disabled={!canUpdate}>
          {/* 手机上不用页签：竖排太占宽（表单被挤成「威海市旭日职业培训学」），横排又会折进「»」。
              改成下拉选分区，内容区独占整行。桌面端仍是页签。 */}
          {isMobile && (
            <div style={{ marginBottom: 12 }}>
              <Select
                value={activeTab}
                onChange={(v) => changeTab(v as TabKey)}
                style={{ width: '100%' }}
                options={[
                  { value: 'basic', label: '基本' },
                  { value: 'access', label: '登录与注册' },
                  { value: 'content', label: '内容与导出' },
                  { value: 'ai', label: 'AI' },
                  { value: 'system', label: '系统与更新' },
                ]}
              />
            </div>
          )}
          <Tabs
            className="sk-settings-tabs"
            activeKey={activeTab}
            onChange={changeTab}
            // 5 个页签在手机上会折进「»」，最后两个（AI / 系统与更新）根本点不到；竖排后全部可见
            size={isMobile ? 'small' : 'middle'}
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
                      {/* 上传只认文件权限（file:upload / file:import），不再要求 system:setting:update；
                          没有改设置权限时按钮仍会显示但置灰（antd Form disabled 会把按钮一起禁用） */}
                      {canUploadLogo && (
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
                      )}
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

                    <hr className="bp-dim" style={{ margin: '4px 0 14px' }} />
                    <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 14, lineHeight: 1.7 }}>
                      以下三项改完即时保存，不需要点「保存」：水印与防复制作用于全站，走独立接口（权限 content:protect）；
                      导出密码在「内容与导出」页签，仍属于「修改系统设置」（权限 system:setting:update）。
                    </div>
                    {!canProtect && (
                      <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 14 }}
                        title="你没有修改水印 / 防复制策略的权限"
                        description="需要 content:protect 权限（管理员默认拥有）。"
                      />
                    )}
                    {/* 这一整块在 <Form disabled> 里：表单的禁用态会把 Switch / Segmented 一起变灰，
                        但水印与防复制认的是 content:protect，不是 system:setting:update。
                        用 ConfigProvider 把禁用态重置掉，能不能点只由 canProtect 决定。 */}
                    <ConfigProvider componentDisabled={false}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <ProtectionRow
                          label="全站水印"
                          hint="登录后每页平铺淡色水印；登录、注册、公开答题等匿名页面不显示"
                        >
                          <Switch
                            checked={protection.watermarkEnabled}
                            loading={savingProtection}
                            disabled={!canProtect}
                            checkedChildren="开启"
                            unCheckedChildren="关闭"
                            onChange={(checked) => void saveProtection({ watermarkEnabled: checked })}
                          />
                        </ProtectionRow>
                        <ProtectionRow label="水印内容" hint="手机号默认中间四位打码，避免完整号码随截图流出">
                          <Segmented
                            value={protection.watermarkMode}
                            disabled={!canProtect}
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
                            disabled={!canProtect}
                            checkedChildren="开启"
                            unCheckedChildren="关闭"
                            onChange={(checked) => void saveProtection({ copyProtected: checked })}
                          />
                        </ProtectionRow>
                      </div>
                    </ConfigProvider>

                    {canUpdate && <SaveBar loading={saving === 'basic'} onSave={() => void save('basic')} />}
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
                      label="开放注册（全局总闸）"
                      valuePropName="checked"
                      extra="总闸；关闭后所有班级的开放注册都不生效，登录页不显示注册入口。老师还需要在班级设置里打开具体教学班"
                    >
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                    {registerEnabled && openClassCount === 0 && (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                        title="全局已开启，但还没有班级开放注册"
                        description="学员登录页不会显示「注册」入口。请让班主任/管理员在「教学 → 班级 → 选中教学班 → 班级设置 → 开放注册」里打开至少一个班。"
                      />
                    )}
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
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                      title="学员注册时自己选班级"
                      description="在「教学 → 班级 → 班级设置 → 开放注册」里打开某个班，注册页才会出现它；注册学员会先进入该班并保持「待审核」，通过后才能登录。这里不再配置全局默认班。"
                    />
                    {registerEnabled && roles.length === 0 && (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                        title="已开启注册但未选择默认角色"
                        description="注册用户登录后将看不到任何菜单，请在下面选择至少一个默认角色。"
                      />
                    )}

                    <hr className="bp-dim" style={{ margin: '4px 0 14px' }} />
                    <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 12, lineHeight: 1.7 }}>
                      匿名答卷只处理未登录访客提交的答卷：自动清理与「谁能注册」是同一类设置——都决定陌生人能往系统里留下什么。
                    </div>
                    <Form.Item
                      name="anonymousCleanupEnabled"
                      label="自动清理匿名答卷"
                      valuePropName="checked"
                      extra="每日 03:30 清理超过保留天数的匿名答卷"
                    >
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                    <Form.Item
                      name="anonymousRetentionDays"
                      label="保留天数"
                      rules={[{ required: true, message: '请填写保留天数' }]}
                      extra="只清理匿名答卷，不影响登录用户/班级成绩"
                    >
                      <InputNumber min={1} max={3650} suffix="天" style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item
                      name="anonymousPurgeEnabled"
                      label="物理清理已删除的匿名答卷"
                      valuePropName="checked"
                      extra="满保留天数后真正删除，含附件，不可恢复"
                    >
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                    <Form.Item
                      name="anonymousPurgeDelayDays"
                      label="进回收站后保留"
                      rules={[{ required: true, message: '请填写保留天数' }]}
                      extra="给一个后悔窗口：这段时间内还能在回收站里恢复"
                    >
                      <InputNumber min={1} max={3650} suffix="天" style={{ width: 200 }} />
                    </Form.Item>
                    <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 16 }}>
                      {lastCleanupAt
                        ? '上次清理：' +
                          dayjs(lastCleanupAt).format('YYYY-MM-DD HH:mm') +
                          '，共 ' +
                          (lastCleanupCount ?? 0) +
                          ' 份'
                        : '还没有清理记录'}
                    </div>
                    {canUpdate && (
                      <Button loading={cleaning} danger onClick={confirmCleanup} style={{ marginBottom: 16 }}>
                        立即清理
                      </Button>
                    )}

                    {canUpdate && <SaveBar loading={saving === 'access'} onSave={() => void save('access')} />}
                  </>
                ),
              },
              {
                key: 'content',
                label: '内容与导出',
                forceRender: true,
                children: (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 14, lineHeight: 1.7 }}>
                      导出密码用于导出题库/答卷前的二次确认（走 /api/system/update，改完要点「保存密码」）；
                      PDF 并发与暂停属于导出策略，跟着底部「保存」一起提交。
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                      <ProtectionRow
                        label="导出密码"
                        hint="设置后，导出题库或答卷都需要输入此密码；留空表示不启用。密码只保存不回显，重新输入并保存即可修改。"
                      >
                        <Input.Password
                          value={exportPassword}
                          onChange={(e) => setExportPassword(e.target.value)}
                          disabled={!canUpdate}
                          placeholder={hasExportPassword ? '已设置，输入新密码可修改' : '留空表示不启用'}
                          autoComplete="new-password"
                          style={{ width: 200 }}
                        />
                        {canUpdate && (
                          <Button
                            size="small"
                            type="primary"
                            loading={savingExportPassword}
                            onClick={() => void saveExportPassword()}
                          >
                            保存密码
                          </Button>
                        )}
                      </ProtectionRow>
                    </div>

                    <Form.Item
                      name="answerPdfConcurrency"
                      label="PDF 渲染并发数"
                      rules={[{ required: true, message: '请选择并发数' }]}
                      extra="同时渲染的任务数，越大越快、越占资源（1~2，4 核机器别开大）"
                    >
                      <InputNumber min={1} max={2} style={{ width: 200 }} suffix="个任务" />
                    </Form.Item>
                    <Form.Item
                      name="pauseAnswerPdfDuringExam"
                      label="考试期间暂停 PDF 导出"
                      valuePropName="checked"
                      extra="考试进行中不接受新的导出任务；Excel 明细导出不受影响"
                    >
                      <Switch checkedChildren="暂停" unCheckedChildren="允许" />
                    </Form.Item>

                    {canUpdate && <SaveBar loading={saving === 'content'} onSave={() => void save('content')} />}
                  </>
                ),
              },
              {
                key: 'ai',
                label: 'AI',
                forceRender: true,
                children: (
                  <>
                    {/* 状态与用量放在最前面：管理员进这个页签首先想知道「现在能用吗、今天烧了多少」，
                        这两件事决定下面的模型配置与限额要不要动。 */}
                    <div
                      className="bp-card"
                      style={{ padding: 12, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--bp-text-soft)' }}>
                          模型状态
                        </span>
                        <span style={{ fontSize: 12 }}>
                          {!canAiUse
                            ? '当前账号没有 ai:use 权限，读不到状态'
                            : aiStatus === undefined
                              ? '读取中…'
                              : aiStatus.ready
                                ? '已就绪' + (aiStatus.model ? '（' + aiStatus.model + '）' : '')
                                : '未就绪'}
                        </span>
                        <span style={{ flex: 1 }} />
                        <Button size="small" loading={usageLoading} onClick={() => void loadAiOverview()}>
                          刷新
                        </Button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--bp-text-soft)' }}>
                          今日用量
                        </span>
                        <span style={{ fontSize: 12 }}>{canAiUse ? usageLine : '未开通 ai:use'}</span>
                        <span style={{ fontSize: 11, color: 'var(--bp-hint)' }}>
                          按自然日零点重置；超了次日自动恢复，调额在下面「限额」里
                        </span>
                      </div>
                      {canAiUse && aiStatus && !aiStatus.ready && (
                        <Alert
                          type="warning"
                          showIcon
                          title={'AI 还没配好' + (aiStatus.reason ? '：' + aiStatus.reason : '')}
                          description="按顺序补齐：① API Base URL ② API Key ③ 模型列表里至少一个模型名并选出默认模型 ④ 打开「启用 AI」⑤ 点本页「保存」。保存后点「刷新」会变成「已就绪」。"
                        />
                      )}
                      {!aiEnabled && canAiUse && (
                        <div style={{ fontSize: 11, color: 'var(--bp-hint)' }}>
                          总开关当前是关闭的：右下角的 AI 助手按钮不会出现，各页面里的 AI 入口也不可用。
                        </div>
                      )}
                    </div>

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
                    <Form.Item
                      name="models"
                      label={
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          模型列表
                          <Button
                            type="link"
                            size="small"
                            loading={fetchingModels}
                            onClick={() => void fetchModels()}
                            style={{ padding: 0, height: 'auto', fontSize: 12 }}
                          >
                            从服务商获取
                          </Button>
                        </span>
                      }
                      extra="点「从服务商获取」按当前 Base URL / API Key 拉一次（没保存的值也能试，Key 留空就沿用已保存的）；也可以自己回车添加"
                    >
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

                    <hr className="bp-dim" style={{ margin: '4px 0 14px' }} />
                    <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 14, lineHeight: 1.75 }}>
                      限额按自然日零点重置。批改 / 组卷 / 题库体检这类后台任务会一次调用很多次模型，
                      <strong>靠每日 token 限额兜底，不受每分钟限流约束</strong>
                      ——否则一次批改 30 份卷子会把自己限死。
                    </div>
                    <Form.Item
                      name="dailyTokenLimit"
                      label="全站每日 token 上限"
                      rules={[{ required: true, message: '0 表示不限' }]}
                      extra="默认 2000000（200 万），上限 1 亿；0 表示不限。整个站点一天能烧多少，防账单失控的第一层。"
                    >
                      <InputNumber min={0} max={100000000} step={100000} suffix="tokens" style={{ width: 240 }} />
                    </Form.Item>
                    <Form.Item
                      name="perUserDailyLimit"
                      label="单用户每日 token 上限"
                      rules={[{ required: true, message: '0 表示不限' }]}
                      extra="默认 200000（20 万）；0 表示不限。拦住「一个人把全站额度用光」。"
                    >
                      <InputNumber min={0} max={100000000} step={10000} suffix="tokens" style={{ width: 240 }} />
                    </Form.Item>
                    <Form.Item
                      name="maxChatTurns"
                      label="一次对话最多几条历史"
                      rules={[{ required: true, message: '请填写 2~100 之间的整数' }]}
                      extra="默认 20，范围 2~100。每轮都要把历史重发给模型，条数越多越贵、越容易超上下文。"
                    >
                      <InputNumber min={2} max={100} suffix="条" style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item
                      name="maxTurnChars"
                      label="单条消息最多多少字"
                      rules={[{ required: true, message: '请填写 200~20000 之间的整数' }]}
                      extra="默认 4000，范围 200~20000。贴一整篇教案进来会把预算烧光，超长部分会被截断。"
                    >
                      <InputNumber min={200} max={20000} step={100} suffix="字" style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item
                      name="rateLimitPerMinute"
                      label="每分钟最多调用几次"
                      rules={[{ required: true, message: '请填写 1~600 之间的整数' }]}
                      extra="默认 10，范围 1~600。只挡手抖连点，不挡账单；后台任务不走这条限流。"
                    >
                      <InputNumber min={1} max={600} suffix="次/分钟" style={{ width: 200 }} />
                    </Form.Item>

                    {canUpdate && <SaveBar loading={saving === 'ai'} onSave={() => void save('ai')} />}

                    <hr className="bp-dim" style={{ margin: '4px 0 16px' }} />
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: '0.16em',
                        color: 'var(--bp-text-soft)',
                        marginBottom: 8,
                      }}
                    >
                      使用说明
                    </div>
                    {/* 说明是只读文档，里面的链接与切换不该跟着表单的禁用态一起变灰 */}
                    <ConfigProvider componentDisabled={false}>
                      <AiCapabilityGuide authorities={authorities} />
                    </ConfigProvider>

                    <hr className="bp-dim" style={{ margin: '16px 0 12px' }} />
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: '0.16em',
                        color: 'var(--bp-text-soft)',
                        marginBottom: 8,
                      }}
                    >
                      MCP / API 令牌
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 12, lineHeight: 1.75 }}>
                      给外部 AI 客户端（Claude Desktop、Cursor 等）用的访问令牌。签发后它可以你的身份读写本站，
                      权限与当前账号一致，不用了就撤销。
                    </div>
                    {/* 令牌面板会拉一次列表：forceRender 会连它一起挂载，所以只在真正点进过「AI」页签后才渲染
                        （列表、签发、撤销本来就是即时生效的独立接口，与底部「保存」无关） */}
                    {visitedTabs.includes('ai') ? (
                      <>
                        <ApiTokenPanel canManage={canUpdate} />
                        <hr className="bp-dim" style={{ margin: '18px 0 12px' }} />
                        <McpGuide canManageToken={canUpdate} canOpenSettings />
                      </>
                    ) : null}
                  </>
                ),
              },
              {
                key: 'system',
                label: '系统与更新',
                // 这一页有要参与校验的更新字段，必须 forceRender；令牌面板另见 visitedTabs 的懒挂载
                forceRender: true,
                children: (
                  <>
                    {/*
                      更新做成常驻区块：以前只有「发现新版本且 Release 带 update.json」时才冒出一个按钮，
                      其余时间整块是空的，用户以为根本没有更新功能。
                      现在无论什么状态都给出版本、通道、检查结果和下一步该做什么。
                    */}
                    <Card
                      className="bp-corners bp-card"
                      style={{ marginBottom: 16 }}
                      title={<span className="bp-title" style={{ fontSize: 12 }}>UPDATE / 更新</span>}
                      extra={<Tag>{updateInfo?.channel === 'nightly' ? '尝鲜版' : '正式版'}</Tag>}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: 8,
                          marginBottom: 12,
                        }}
                      >
                        {[
                          { label: '当前版本', value: currentVersion || '—' },
                          { label: '最新版本', value: updateInfo?.latestVersion || '—' },
                          { label: '更新源', value: updateInfo == null ? '读取中' : updateInfo.enabled === false ? '未配置' : '已配置' },
                          {
                            label: '待安装',
                            value: pendingInfo?.pending ? 'v' + (pendingInfo.version || '?') : '无',
                          },
                        ].map((item) => (
                          <div key={item.label} style={{ border: '1px solid var(--bp-line-soft)', padding: '5px 8px' }}>
                            <div style={{ fontSize: 10, color: 'var(--bp-text-soft)' }}>{item.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                        <Button loading={checkingUpdate} onClick={() => void checkUpdateNow()}>
                          立即检查
                        </Button>
                        {Boolean(updateInfo?.hasUpdate && updateInfo?.assets?.jar) && (
                          <Button type="primary" loading={downloading} onClick={() => void downloadUpdateNow()}>
                            下载 v{updateInfo?.latestVersion} 到服务器
                          </Button>
                        )}
                        {updateInfo?.downloadUrl && (
                          <Button onClick={() => window.open(updateInfo.downloadUrl, '_blank', 'noopener')}>
                            打开下载页
                          </Button>
                        )}
                        <Button onClick={() => void loadPendingUpdate()}>刷新状态</Button>
                      </div>

                      {(() => {
                        if (updateInfo?.error) {
                          return (
                            <Alert
                              type="error"
                              showIcon
                              title="检查失败"
                              description={`${updateInfo.error}。如果是 GitHub 访问不通，可以在下面把「GitHub API 前缀」换成一个可用镜像，或直接填「自建更新清单」地址。`}
                            />
                          );
                        }
                        if (updateInfo == null) {
                          return <Alert type="info" showIcon title="还没有检查过" description="点「立即检查」读取远端版本信息。" />;
                        }
                        if (updateInfo.enabled === false) {
                          return (
                            <Alert
                              type="warning"
                              showIcon
                              title="没有配置更新源"
                              description="填下面的「GitHub 仓库」或「自建更新清单」，再点「立即检查」。"
                            />
                          );
                        }
                        if (updateInfo.hasUpdate && !updateInfo.assets?.jar) {
                          return (
                            <Alert
                              type="warning"
                              showIcon
                              title={`发现新版本 v${updateInfo.latestVersion}，但这个 Release 不能一键更新`}
                              description={
                                <span>
                                  Release 里没有 <code>update.json</code>（或里面缺 jar 包），所以拿不到下载地址与 sha256。
                                  发版时由 CI 自动生成这个文件；在那之前只能用「打开下载页」手动换包。
                                </span>
                              }
                            />
                          );
                        }
                        if (updateInfo.hasUpdate) {
                          return (
                            <Alert
                              type="info"
                              showIcon
                              title={`发现新版本 v${updateInfo.latestVersion}`}
                              description="点「下载到服务器」把安装包抓到本机并校验 sha256；替换与重启由宿主机脚本完成（见下方说明）。"
                            />
                          );
                        }
                        return <Alert type="success" showIcon title="已是最新版本" />;
                      })()}

                      {pendingInfo?.pending && (
                        <Alert
                          type="warning"
                          showIcon
                          style={{ marginTop: 12 }}
                          title={`已下载 v${pendingInfo.version || '?'}，还没安装`}
                          description={
                            <span>
                              在服务器上执行 <code>bash scripts/nas/apply-update.sh</code>：它会备份旧 jar、替换、重启后端（约 30 秒）。
                              装一条 cron 每 2 分钟跑一次就能全自动。
                            </span>
                          }
                        />
                      )}
                    </Card>
                    <Form.Item
                      name="updateCheckEnabled"
                      label="自动检查"
                      valuePropName="checked"
                      extra="管理员登录后按间隔检查一次，只写一条系统更新公告，不执行升级"
                    >
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                    <Form.Item
                      name="updateGithubRepo"
                      label="GitHub 仓库"
                      extra="owner/repo；留空则用环境变量 update.github-repo"
                    >
                      <Input placeholder="Hermannmayer/xuri-classroom" allowClear />
                    </Form.Item>
                    <Form.Item
                      name="updateApiBase"
                      label="GitHub API 前缀"
                      extra="默认 https://api.github.com；国内可填兼容镜像"
                    >
                      <Input placeholder="https://api.github.com" allowClear />
                    </Form.Item>
                    <Form.Item
                      name="updateManifestUrl"
                      label="自建更新清单（可选）"
                      extra="填了优先于 GitHub；JSON 字段：version、notes、url、publishedAt"
                    >
                      <Input placeholder="https://.../update.json" allowClear />
                    </Form.Item>
                    <Form.Item name="updateCheckIntervalHours" label="检查间隔" extra="1–168 小时；默认 24 小时">
                      <InputNumber min={1} max={168} suffix="小时" style={{ width: 200 }} />
                    </Form.Item>

                    {downloaded && (
                      <Alert
                        type="success"
                        showIcon
                        style={{ marginBottom: 16 }}
                        title={`已下载 v${downloaded.version ?? ''}，sha256 校验通过`}
                        description={
                          <span style={{ lineHeight: 1.75 }}>
                            还没有应用。在服务器上执行 <code>bash scripts/nas/apply-update.sh</code>：
                            它会备份旧 jar、替换、重启后端（约 30 秒）。
                            装一条 cron 每 2 分钟跑一次就能全自动（命令见脚本开头的注释）。
                          </span>
                        }
                      />
                    )}
                    {updateInfo && (
                      <Alert
                        type={updateInfo.error ? 'error' : updateInfo.hasUpdate ? 'info' : 'success'}
                        showIcon
                        style={{ marginBottom: 16 }}
                        title={
                          updateInfo.error
                            ? '检查失败'
                            : !updateInfo.enabled
                              ? '检查更新未启用'
                              : updateInfo.hasUpdate
                                ? '发现新版本 v' + updateInfo.latestVersion
                                : '当前已是最新版本'
                        }
                        description={
                          updateInfo.error ? (
                            updateInfo.error
                          ) : !updateInfo.hasUpdate ? undefined : (
                            // 实施计划 4.7：新版本信息落成 type=system_update 的公告，
                            // 这里只负责「指路」，不再自己渲染一套更新说明
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <span style={{ whiteSpace: 'pre-wrap' }}>
                                {updateInfo.notes || '有新版本可用。'}
                                {' '}
                                这条版本信息会作为系统更新公告出现在公告中心，可在那里查看并归档。
                              </span>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                {canSeeNotice ? (
                                  <Button size="small" type="primary" onClick={() => navigate('/notice')}>
                                    去公告中心查看
                                  </Button>
                                ) : (
                                  <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>
                                    当前账号没有 notice:list 权限，看不到公告中心。
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        }
                      />
                    )}
                    {canUpdate && <SaveBar loading={saving === 'system'} onSave={() => void save('system')} />}

                    {/* 数据库结构：用「直接覆盖程序、没跑迁移」时，这里能一眼看出库和程序对不上 */}
                    <hr className="bp-dim" style={{ margin: '18px 0 12px' }} />
                    <div
                      className="bp-card"
                      style={{ padding: 12, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                      <div style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--bp-text-soft)' }}>数据库结构</div>
                      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.75 }}>
                        程序版本 {schemaInfo?.version || currentVersion || '—'} · 库结构版本{' '}
                        {schemaInfo?.schemaVersion || '—'} ·{' '}
                        {schemaInfo?.schemaStatus === 'OK'
                          ? '已是最新'
                          : schemaInfo?.schemaStatus === 'UPGRADED'
                            ? '刚刚完成升级'
                            : schemaInfo?.schemaStatus === 'AHEAD'
                              ? '库结构比程序新（回滚过程序）'
                              : schemaInfo?.schemaStatus === 'DISABLED'
                                ? '自动升级已关闭'
                                : '未知'}
                      </div>
                      {schemaInfo?.schemaMessage ? (
                        <div style={{ fontSize: 11, color: 'var(--bp-hint)' }}>{schemaInfo.schemaMessage}</div>
                      ) : null}
                      {canUpdate && (
                        <div>
                          <Button
                            size="small"
                            loading={upgradingSchema}
                            onClick={async () => {
                              setUpgradingSchema(true);
                              try {
                                const result = await post<{ appliedScripts?: string[] }>('/api/system/schema/upgrade');
                                const applied = result?.appliedScripts?.length ?? 0;
                                message.success(applied ? `已执行 ${applied} 个升级脚本` : '数据库结构已是最新');
                                setSchemaInfo(await get('/api/system/version'));
                              } catch (e) {
                                message.error((e as Error).message);
                              } finally {
                                setUpgradingSchema(false);
                              }
                            }}
                          >
                            检查并升级数据库结构
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* 诊断日志：用户报障时先下载这个再发出来，比截一句「服务出了点问题」有用得多 */}
                    <hr className="bp-dim" style={{ margin: '18px 0 12px' }} />
                    <div
                      className="bp-card"
                      style={{ padding: 12, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                      <div style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--bp-text-soft)' }}>诊断日志</div>
                      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.75 }}>
                        遇到问题（报错、白屏、批改结果不对）时，先在这里下载诊断日志，连同截图一起发给管理员。
                        压缩包里只有运行日志和环境信息，不含答卷内容和密码。
                      </div>
                      {canUpdate && (
                        <div>
                          <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            loading={exportingDiag}
                            onClick={async () => {
                              setExportingDiag(true);
                              try {
                                await download('/api/system/logs/export', { days: 7 }, '诊断日志.zip');
                                message.success('诊断日志已开始下载，发给管理员即可');
                              } catch (e) {
                                message.error((e as Error).message);
                              } finally {
                                setExportingDiag(false);
                              }
                            }}
                          >
                            导出诊断日志
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* MCP / API 令牌已挪到「AI」页签：它是给外部 AI 客户端用的，和模型配置放一起更好找 */}
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

/** 一行设置：左侧固定宽度标签 + 控件，下面一行灰色说明 */
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
