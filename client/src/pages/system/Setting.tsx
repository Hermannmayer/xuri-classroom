import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, Checkbox, Collapse, ConfigProvider, Form, Input, InputNumber, Modal, Progress, Segmented, Select, Spin, Switch, Tabs, Tag, Upload, message } from 'antd';
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
import AiModelCatalog, { type ModelMeta } from './AiModelCatalog';
import { AI_PROVIDERS, findAiProvider } from './aiProviders';
import ApiTokenPanel from './ApiTokenPanel';

import McpGuide from '../ai-guide/McpGuide';





interface AiSetting {
  enabled?: boolean;
  provider?: string;
  displayName?: string;
  baseUrl?: string;
  apiKey?: string;
  models?: string[];
  modelMeta?: Record<string, ModelMeta>;
  defaultModel?: string;
  prompt?: string;

  dailyTokenLimit?: number;

  perUserDailyLimit?: number;

  maxChatTurns?: number;

  maxTurnChars?: number;

  rateLimitPerMinute?: number;
}


interface Role {
  id: string;
  name?: string;
  code?: string;
}


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


interface AnonymousCleanupSetting {
  anonymousCleanupEnabled?: boolean;
  anonymousRetentionDays?: number;

  anonymousLastCleanupAt?: string | number;
  anonymousLastCleanupCount?: number;

  anonymousPurgeEnabled?: boolean;

  anonymousPurgeDelayDays?: number;
}


interface ExportPdfSetting {

  answerPdfConcurrency?: number;

  pauseAnswerPdfDuringExam?: boolean;
}

interface BackupRestoreResult {
  tables?: number;
  files?: number;
  restartRequired?: boolean;
}

/** 后端 watermarkMode 是 string；老数据 / 脏值（含 null）一律回落到默认的「姓名+手机号」 */
function normalizeMode(value?: string | null): WatermarkMode {
  return value === 'name' || value === 'phone' ? value : 'name_phone';
}

type TabKey = 'basic' | 'access' | 'content' | 'ai' | 'system' | 'backup';


const TAB_KEYS: TabKey[] = ['basic', 'access', 'content', 'ai', 'system', 'backup'];







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
  backup: [],
  ai: [
    'aiEnabled',
    'provider',
    'displayName',
    'baseUrl',
    'apiKey',
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

  channel?: string;
  checkedAt?: number;

  assets?: Record<string, UpdateAsset>;
}

interface UpdateDownloadStatus {
  phase?: string;
  version?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  percent?: number;
  bytesPerSecond?: number;
  source?: string;
  verified?: boolean;
  attempt?: number;
  maxAttempts?: number;
  error?: string;
  file?: string;
}

interface UpdateDownloadItem {
  version: string;
  size?: number;
  downloadedAt?: number;
}

function formatBytes(value?: number) {
  if (!value || value <= 0) return '0 B';
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
  return (value / 1024 / 1024).toFixed(1) + ' MB';
}

/** 系统设置：基本 / 登录与注册 / 内容与导出 / AI / 系统与更新。 */
export default function SystemSetting() {
  const [form] = Form.useForm();

  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<TabKey>();

  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [roleOptions, setRoleOptions] = useState<Role[]>([]);

  const [openClassCount, setOpenClassCount] = useState(0);
  const [models, setModels] = useState<string[]>([]);
  const [modelMeta, setModelMeta] = useState<Record<string, ModelMeta>>({});
  const defaultModel = Form.useWatch<string | undefined>('defaultModel', form);
  const providerId = Form.useWatch<string | undefined>('provider', form);
  const currentProvider = findAiProvider(providerId);
  const logo = Form.useWatch<string | undefined>('avatar', form);
  const registerEnabled = Form.useWatch<boolean | undefined>('registerEnabled', form);
  const aiEnabled = Form.useWatch<boolean | undefined>('aiEnabled', form);
  const roles = Form.useWatch<string[] | undefined>('roles', form) ?? [];

  const [protection, setProtection] = useState<ProtectionSetting>(DEFAULT_PROTECTION);
  const [savingProtection, setSavingProtection] = useState(false);

  const [exportPassword, setExportPassword] = useState('');
  const [hasExportPassword, setHasExportPassword] = useState(false);
  const [savingExportPassword, setSavingExportPassword] = useState(false);

  const [lastCleanupAt, setLastCleanupAt] = useState<string | number>();
  const [lastCleanupCount, setLastCleanupCount] = useState<number>();
  const [cleaning, setCleaning] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File>();
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const [restoreKeyword, setRestoreKeyword] = useState('');
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreResult, setRestoreResult] = useState<BackupRestoreResult>();
  const [currentVersion, setCurrentVersion] = useState<string>();
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckInfo>();
  const [updateLoading, setUpdateLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<UpdateDownloadStatus>();
  const [downloadHistory, setDownloadHistory] = useState<UpdateDownloadItem[]>([]);
  const [applying, setApplying] = useState(false);
  const [autoApplyAfterDownload, setAutoApplyAfterDownload] = useState(false);
  const [pendingInfo, setPendingInfo] = useState<{ pending?: boolean; version?: string; size?: number; canApply?: boolean }>();
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const [exportingDiag, setExportingDiag] = useState(false);

  const [schemaInfo, setSchemaInfo] = useState<{
    version?: string;
    webBuild?: string;
    schemaVersion?: string;
    schemaStatus?: string;
    schemaAppVersion?: string;
    schemaMessage?: string;
  }>();
  const localAppVersion =
    document.querySelector<HTMLMetaElement>('meta[name="app-version"]')?.content || '';
  const localAppBuild =
    document.querySelector<HTMLMetaElement>('meta[name="app-build"]')?.content || '';
  const frontendStale = Boolean(
    schemaInfo?.webBuild && localAppBuild && schemaInfo.webBuild !== localAppBuild,
  );
  const [upgradingSchema, setUpgradingSchema] = useState(false);

  const [aiStatus, setAiStatus] = useState<AiStatus>();

  const [usage, setUsage] = useState<AiUsageToday>();
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string>();

  const activeTab = normalizeTab(searchParams.get('tab') ?? '');
  const isMobile = useIsMobile();
  /** 点开过的 Tab：令牌面板只在真正进过「系统与更新」后才挂载（见下面的注释） */
  const [visitedTabs, setVisitedTabs] = useState<TabKey[]>(() => [activeTab]);





  const [authorities, setAuthorities] = useState<string[]>([]);
  const canUpdate = can(authorities, PERMISSION_CODES.systemSettingUpdate);







  const canProtect = can(authorities, PERMISSION_CODES.contentProtect);

  const canSeeNotice = can(authorities, PERMISSION_CODES.noticeList);

  const canUploadLogo = can(authorities, PERMISSION_CODES.fileUpload) || can(authorities, PERMISSION_CODES.fileImport);

  const canAiUse = can(authorities, PERMISSION_CODES.aiUse);

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  /** 切 Tab 写回 ?tab=：刷新、分享链接、浏览器后退都还能停在同一页签 */
  const backupSite = async () => {
    setBackupBusy(true);
    try {
      await download('/api/system/backup', undefined, '整站备份.zip');
      message.success('整站备份已开始下载，请查看浏览器下载');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBackupBusy(false);
    }
  };

  const openRestore = () => {
    setRestoreFile(undefined);
    setRestoreConfirmed(false);
    setRestoreKeyword('');
    setRestoreResult(undefined);
    setRestoreOpen(true);
  };

  const closeRestore = () => {
    if (restoreBusy) return;
    setRestoreOpen(false);
    setRestoreFile(undefined);
    setRestoreConfirmed(false);
    setRestoreKeyword('');
    setRestoreResult(undefined);
  };

  const runRestore = async () => {
    if (!restoreFile || !restoreConfirmed || restoreKeyword !== 'RESTORE') return;
    setRestoreBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', restoreFile);
      const res = await post<BackupRestoreResult>('/api/system/backup/restore', fd);
      setRestoreResult(res ?? {});
      setRestoreFile(undefined);
      setRestoreConfirmed(false);
      setRestoreKeyword('');
      message.success(res?.restartRequired === false ? '备份已恢复' : '备份已恢复，请重启服务后生效');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setRestoreBusy(false);
    }
  };

  const restoreReady = Boolean(restoreFile) && restoreConfirmed && restoreKeyword === 'RESTORE';

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

      roles: sys?.registerInfo?.roles ?? [],

      anonymousCleanupEnabled: anonymous.anonymousCleanupEnabled !== false,
      anonymousRetentionDays: anonymous.anonymousRetentionDays ?? 90,

      anonymousPurgeEnabled: anonymous.anonymousPurgeEnabled === true,
      anonymousPurgeDelayDays: anonymous.anonymousPurgeDelayDays ?? 7,

      answerPdfConcurrency: ((sys?.setting ?? {}) as unknown as ExportPdfSetting).answerPdfConcurrency ?? 1,
      pauseAnswerPdfDuringExam:
        ((sys?.setting ?? {}) as unknown as ExportPdfSetting).pauseAnswerPdfDuringExam !== false,
      updateCheckEnabled: sys?.setting?.updateCheckEnabled !== false,
      updateGithubRepo: sys?.setting?.updateGithubRepo,
      updateApiBase: sys?.setting?.updateApiBase,
      updateManifestUrl: sys?.setting?.updateManifestUrl,
      updateCheckIntervalHours: sys?.setting?.updateCheckIntervalHours ?? 24,
      aiEnabled: Boolean(ai?.enabled),
      provider: ai?.provider,
      displayName: ai?.displayName,
      baseUrl: ai?.baseUrl,
      apiKey: ai?.apiKey,
      defaultModel: ai?.defaultModel,
      prompt: ai?.prompt,

      dailyTokenLimit: ai?.dailyTokenLimit ?? 2000000,
      perUserDailyLimit: ai?.perUserDailyLimit ?? 200000,
      maxChatTurns: ai?.maxChatTurns ?? 20,
      maxTurnChars: ai?.maxTurnChars ?? 4000,
      rateLimitPerMinute: ai?.rateLimitPerMinute ?? 10,
    });

    const loadedModels = [...(ai?.models ?? [])];
    if (ai?.defaultModel && !loadedModels.includes(ai.defaultModel)) loadedModels.push(ai.defaultModel);
    setModels(loadedModels);
    setModelMeta(ai?.modelMeta ?? {});

    setProtection({
      watermarkEnabled: sys?.setting?.watermarkEnabled !== false,
      watermarkMode: normalizeMode(sys?.setting?.watermarkMode),
      copyProtected: sys?.setting?.copyProtected !== false,
    });

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

  /** 模型状态与今日用量：两个接口互不依赖，一个失败不该把另一个也吞掉 （比如 ai:use 有、但 AI 总开关关着时，status 仍然可读） */
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

  /** 水印 / 防复制：单项改完立即保存，只提交改动的那一个字段 */
  const saveProtection = async (patch: Partial<ProtectionSetting>) => {
    const prev = protection;
    const next = { ...prev, ...patch };
    setProtection(next);
    setSavingProtection(true);
    try {
      await post('/api/system/protection', { setting: patch });
      message.success('已保存');

      window.dispatchEvent(
        new CustomEvent(COPY_PROTECT_EVENT, { detail: { copyProtected: next.copyProtected } }),
      );
      window.dispatchEvent(
        new CustomEvent(WATERMARK_EVENT, {
          detail: { watermarkEnabled: next.watermarkEnabled, watermarkMode: next.watermarkMode },
        }),
      );
    } catch (e) {
      setProtection(prev);
      message.error((e as Error).message);
    } finally {
      setSavingProtection(false);
    }
  };

  /** 导出密码：只写不读（后端不回显明文），输入框留空 + 点保存 = 清除密码、关闭保护 */
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
      setExportPassword('');
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

  const runningDownload = Boolean(
    downloadStatus?.phase && ['downloading', 'retrying', 'verifying'].includes(downloadStatus.phase),
  );

  const startDownload = async () => {
    setDownloading(true);
    setAutoApplyAfterDownload(true);
    try {
      const res = await post<UpdateDownloadStatus>('/api/system/update/download', {});
      setDownloadStatus(res);
    } catch {
      // request.ts 已经弹过错误，这里不再重复提示
    } finally {
      setDownloading(false);
    }
  };

  const loadDownloadStatus = async () => {
    try {
      const res = await get<UpdateDownloadStatus>('/api/system/update/download/status');
      setDownloadStatus(res);
    } catch {
      // 状态读取失败不阻塞页面
    }
  };

  const loadDownloadHistory = async () => {
    try {
      const res = await get<{ items?: UpdateDownloadItem[] }>('/api/system/update/downloads');
      setDownloadHistory(res.items ?? []);
    } catch {
      // 历史读取失败不阻塞页面
    }
  };

  const loadPendingUpdate = async () => {
    try {
      const res = await get<{ pending?: boolean; version?: string; size?: number; canApply?: boolean }>(
        '/api/system/update/pending',
      );
      setPendingInfo(res);
    } catch {
      // 状态读不到不影响别的功能，静默即可
    }
  };

  const loadUpdateInfo = async () => {
    setUpdateLoading(true);
    try {
      const res = await get<UpdateCheckInfo>('/api/system/update/check');
      setUpdateInfo(res);
    } catch {
      // 检查状态读取失败时保留上一次画面，不阻塞系统设置
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'system') {
      void loadPendingUpdate();
      void loadUpdateInfo();
      void loadDownloadStatus();
      void loadDownloadHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!runningDownload) return;
    const timer = window.setInterval(async () => {
      try {
        const next = await get<UpdateDownloadStatus>('/api/system/update/download/status');
        setDownloadStatus(next);
        if (next.phase === 'done') {
          message.success('更新包下载并校验完成');
          void loadDownloadHistory();
          const pending = await get<{ pending?: boolean; canApply?: boolean }>('/api/system/update/pending');
          setPendingInfo(pending);
          if (autoApplyAfterDownload && pending.canApply) {
            void applyUpdateNow();
          }
          setAutoApplyAfterDownload(false);
        }
      } catch {
        // 轮询失败下一轮继续
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runningDownload, autoApplyAfterDownload]);

  const applyUpdateNow = async () => {
    setApplying(true);
    const before = currentVersion;
    try {
      await post('/api/system/update/apply', {});
      message.success('更新包已替换，服务正在重启');
      let tries = 0;
      const timer = window.setInterval(async () => {
        tries += 1;
        try {
          const res = await get<{ version?: string }>('/api/system/version');
          if (res.version && res.version !== before) {
            window.clearInterval(timer);
            window.location.reload();
            return;
          }
        } catch {
          // 重启期间请求失败是正常的
        }
        if (tries >= 30) {
          window.clearInterval(timer);
          setApplying(false);
          message.warning('服务还没有恢复，请稍后手动刷新');
        }
      }, 2000);
    } catch (e) {
      setApplying(false);
      message.error((e as Error).message);
    }
  };

  const reloadFrontend = () => window.location.reload();

  /** 手机/微信内置浏览器偶发缓存旧 HTML：清掉 Cache Storage 后带时间戳重开，绕开本机缓存 */
  const forceReloadFrontend = async () => {
    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }
    } catch {
      // 清缓存失败也要继续重载
    }
    const url = new URL(window.location.href);
    url.searchParams.set('_r', String(Date.now()));
    window.location.replace(url.toString());
  };

  const removeDownload = (version: string) => {
    Modal.confirm({
      title: '删除下载记录 v' + version + '？',
      content: '会删除服务器上的更新包；如果它是待安装包，也会一并清掉。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await post('/api/system/update/downloads/delete', { version });
        await loadDownloadHistory();
        await loadPendingUpdate();
      },
    });
  };

  const clearDownloadHistory = () => {
    Modal.confirm({
      title: '清空全部更新下载？',
      content: '会删除所有已下载的更新包，包括待安装包；不会影响当前运行版本。',
      okText: '清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await post('/api/system/update/downloads/clear', {});
        await loadDownloadHistory();
        await loadPendingUpdate();
        setDownloadStatus(undefined);
      },
    });
  };

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

  /** 从服务商拉模型列表（系统设置 → AI →「从服务商获取」） */
  const fetchModels = async () => {
    setFetchingModels(true);
    setModelFetchError(undefined);
    try {
      const baseUrl = String(form.getFieldValue('baseUrl') ?? '').trim();
      const apiKey = String(form.getFieldValue('apiKey') ?? '').trim();
      const result = await getAiModels({ baseUrl: baseUrl || undefined, apiKey: apiKey || undefined });
      const merged = Array.from(new Set([...models, ...(result.models ?? [])]));
      setModels(merged);
      if (!form.getFieldValue('defaultModel') && merged.length > 0) {
        form.setFieldValue('defaultModel', merged[0]);
      }
      message.success(`已获取 ${result.count} 个模型（当前共 ${merged.length} 个），记得点下面的「保存」`);
    } catch (e) {
      const error = (e as Error).message;
      setModelFetchError(error);
      message.error(error);
    } finally {
      setFetchingModels(false);
    }
  };

  const save = async (key: TabKey) => {
    let v: Record<string, unknown>;
    try {
      v = await form.validateFields(TAB_FIELDS[key]);
    } catch {
      return;
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


        await post('/api/system/update', {
          aiSetting: {
            enabled: Boolean(v.aiEnabled),
            provider: v.provider,
            displayName: v.displayName,
            baseUrl,
            apiKey: v.apiKey,
            models,
            modelMeta,
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

      if (key === 'system') void loadUpdateInfo();
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

      <Card
        className="bp-corners"


        style={
          isMobile
            ? { border: 'none', background: 'transparent' }
            : { border: '1px solid var(--bp-line)', background: 'var(--bp-panel)' }
        }
        styles={isMobile ? { body: { padding: 0 } } : undefined}
      >
        <Form form={form} layout="vertical" size="small" requiredMark={false} disabled={!canUpdate}>




          {isMobile && (
            <div className="sk-settings-chips">
              {[
                { key: 'basic', label: '基本' },
                { key: 'access', label: '登录' },
                { key: 'content', label: '内容' },
                { key: 'ai', label: 'AI' },
                { key: 'system', label: '系统' },
                { key: 'backup', label: '备份' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={activeTab === item.key ? 'is-active' : ''}
                  onClick={() => changeTab(item.key as TabKey)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          <Tabs
            className="sk-settings-tabs"
            activeKey={activeTab}
            onChange={changeTab}

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
                      name="provider"
                      label="供应商"
                      extra="选择后自动填入 Base URL；手动改地址会自动切回「自定义」"
                    >
                      <Select
                        options={AI_PROVIDERS.map((item) => ({ value: item.id, label: item.name }))}
                        onChange={(value) => {
                          const provider = findAiProvider(value);
                          form.setFieldsValue({
                            provider: value,
                            displayName: provider?.name,
                            baseUrl: provider?.custom ? form.getFieldValue('baseUrl') : provider?.baseUrl,
                          });
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      name="apiKey"
                      label="API Key"
                      extra="出于安全考虑服务端不回显；留空表示保持原值"
                    >
                      <Input.Password placeholder="留空表示不修改" autoComplete="new-password" />
                    </Form.Item>

                    <Collapse
                      ghost
                      size="small"
                      items={[
                        {
                          key: 'custom',
                          label: '自定义设置',
                          forceRender: true,
                          children: (
                            <>
                              <Form.Item name="displayName" label="显示名称">
                                <Input placeholder="例如 DeepSeek" />
                              </Form.Item>
                              <Form.Item
                                name="baseUrl"
                                label="API 地址"
                                extra="OpenAI 兼容地址，例如 https://api.openai.com/v1"
                              >
                                <Input
                                  placeholder="https://api.openai.com/v1"
                                  allowClear
                                  onChange={() => {
                                    if (form.getFieldValue('provider') !== 'custom') {
                                      form.setFieldValue('provider', 'custom');
                                    }
                                  }}
                                />
                              </Form.Item>
                              <Form.Item label="API 协议" extra="当前仅支持 OpenAI Chat Completions">
                                <Input value="OpenAI Chat Completions" disabled />
                              </Form.Item>
                              <Form.Item
                                label="重试策略"
                                extra="当前固定：超时 / 网络 / 5xx / 429 重试，4xx 直接报错"
                              >
                                <Input value="默认（仅临时错误）" disabled />
                              </Form.Item>
                            </>
                          ),
                        },
                      ]}
                    />

                    <Form.Item
                      label="模型目录"
                      extra="自动获取只返回模型 ID；每行「能力」可设置上下文窗口、最大输出和输入类型（文本/图片）"
                    >
                      <AiModelCatalog
                        models={models}
                        modelMeta={modelMeta}
                        defaultModel={defaultModel}
                        onChange={(nextModels, nextMeta) => {
                          setModels(nextModels);
                          setModelMeta(nextMeta);
                        }}
                        onDefaultModelChange={(value) => form.setFieldValue('defaultModel', value)}
                        onFetch={() => void fetchModels()}
                        fetching={fetchingModels}
                        canFetch={currentProvider?.supportsModelList !== false}
                        fetchHint={
                          currentProvider?.supportsModelList === false
                            ? '该供应商没有稳定的 /models 端点，请手动添加模型 ID'
                            : undefined
                        }
                      />
                    </Form.Item>
                    {modelFetchError ? (
                      <Alert
                        type="error"
                        showIcon
                        style={{ marginBottom: 12 }}
                        title="获取模型列表失败"
                        description={modelFetchError}
                      />
                    ) : null}
                    <Form.Item name="defaultModel" label="默认模型">
                      <Select
                        allowClear
                        showSearch
                        placeholder="从模型目录中选择"
                        options={models.map((m) => ({ value: m, label: modelMeta[m]?.displayName || m }))}
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

                forceRender: true,
                children: (
                  <>





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
                          { label: '前端版本', value: localAppVersion || '—' },
                          { label: '最新版本', value: updateInfo?.latestVersion || '—' },
                          { label: '更新源', value: updateInfo == null ? '读取中' : updateInfo.enabled === false ? '未配置' : '已配置' },
                          { label: '上次检查', value: updateInfo?.checkedAt ? dayjs(updateInfo.checkedAt).format('MM-DD HH:mm') : '—' },
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

                      {frontendStale && (
                        <div style={{ fontSize: 11, color: 'var(--bp-orange)', marginBottom: 12 }}>
                          当前页面加载的前端包与后端版本不一致，请强制刷新；刷新后仍提示说明前端资源没有随升级一起更新。
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                        <Button size="small" onClick={reloadFrontend}>
                          重新加载前端
                        </Button>
                        <Button size="small" onClick={() => void forceReloadFrontend()}>
                          强制重载（清缓存）
                        </Button>
                        <span style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
                          页面提示前端版本过期时点这里；强制重载会清掉本机缓存再打开。
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                        <Button loading={checkingUpdate} onClick={() => void checkUpdateNow()}>
                          立即检查
                        </Button>
                        {Boolean(updateInfo?.hasUpdate && updateInfo?.assets?.jar) && (
                          <Button
                            type="primary"
                            loading={downloading || runningDownload}
                            disabled={runningDownload}
                            onClick={() => void startDownload()}
                          >
                            {runningDownload ? '正在下载…' : '一键更新到 v' + (updateInfo?.latestVersion || '')}
                          </Button>
                        )}
                        {Boolean(pendingInfo?.pending && pendingInfo?.canApply) && (
                          <Button type="primary" loading={applying} onClick={() => void applyUpdateNow()}>
                            安装并重启
                          </Button>
                        )}
                        {updateInfo?.downloadUrl && (
                          <Button onClick={() => window.open(updateInfo.downloadUrl, '_blank', 'noopener')}>
                            打开下载页
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            void loadPendingUpdate();
                            void loadDownloadStatus();
                            void loadDownloadHistory();
                          }}
                        >
                          刷新状态
                        </Button>
                      </div>

                      {downloadStatus && (runningDownload || downloadStatus.phase === 'failed' || downloadStatus.phase === 'done') ? (
                        <div style={{ marginBottom: 12 }}>
                          <Progress
                            percent={downloadStatus.percent && downloadStatus.percent >= 0 ? downloadStatus.percent : 0}
                            status={
                              downloadStatus.phase === 'failed'
                                ? 'exception'
                                : downloadStatus.phase === 'done'
                                  ? 'success'
                                  : 'active'
                            }
                          />
                          <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', lineHeight: 1.7 }}>
                            {downloadStatus.phase === 'done'
                              ? '已下载 v' + (downloadStatus.version || '') + (downloadStatus.verified ? '，sha256 校验通过' : '，该 Release 未提供 sha256')
                              : downloadStatus.phase === 'failed'
                                ? '下载失败：' + (downloadStatus.error || '未知错误')
                                : formatBytes(downloadStatus.downloadedBytes) + ' / ' + formatBytes(downloadStatus.totalBytes) + ' · ' + formatBytes(downloadStatus.bytesPerSecond) + '/s · 第 ' + (downloadStatus.attempt || 1) + '/' + (downloadStatus.maxAttempts || 3) + ' 次' + (downloadStatus.source ? ' · 线路：' + downloadStatus.source : '')}
                          </div>
                        </div>
                      ) : null}

                      {(() => {
                        if (updateInfo?.error) {
                          return (
                            <Alert
                              type="error"
                              showIcon
                              title="检查失败"
                              description={`${updateInfo.error}。如果是 GitHub 访问不通，可以配置 UPDATE_DOWNLOAD_MIRRORS（多个镜像用逗号分隔），或直接填「自建更新清单」地址。`}
                            />
                          );
                        }
                        if (updateInfo == null) {
                          return updateLoading ? (
                            <Alert type="info" showIcon title="正在读取检查状态…" />
                          ) : (
                            <Alert type="info" showIcon title="还没有检查过" description="点「立即检查」读取远端版本信息。" />
                          );
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
                          type={pendingInfo.canApply ? 'warning' : 'info'}
                          showIcon
                          style={{ marginTop: 12 }}
                          title={`已下载 v${pendingInfo.version || '?'}，可以安装`}
                          description={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span>
                                {pendingInfo.canApply
                                  ? '点「安装并重启」会备份旧包、替换并重启服务，约 30 秒。'
                                  : '当前部署没有开启应用内安装；需要先用带更新器的发布包升级一次。'}
                              </span>
                              {pendingInfo.canApply && (
                                <Button type="primary" loading={applying} onClick={() => void applyUpdateNow()}>
                                  安装并重启
                                </Button>
                              )}
                            </div>
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

                    <Card
                      size="small"
                      className="bp-card"
                      title={<span className="bp-title" style={{ fontSize: 12 }}>下载记录</span>}
                      extra={
                        downloadHistory.length > 0 ? (
                          <Button size="small" danger onClick={clearDownloadHistory}>
                            清空
                          </Button>
                        ) : null
                      }
                      style={{ marginBottom: 16 }}
                    >
                      {downloadHistory.length === 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--bp-text-soft)' }}>还没有下载记录</span>
                      ) : (
                        downloadHistory.map((item) => (
                          <div
                            key={item.version}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '7px 0',
                              borderBottom: '1px solid var(--bp-line-soft)',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13 }}>v{item.version}</div>
                              <div style={{ fontSize: 11, color: 'var(--bp-text-soft)' }}>
                                {formatBytes(item.size)} ·{' '}
                                {item.downloadedAt ? dayjs(item.downloadedAt).format('MM-DD HH:mm') : '—'}
                              </div>
                            </div>
                            <Button size="small" onClick={() => removeDownload(item.version)}>
                              删除
                            </Button>
                          </div>
                        ))
                      )}
                    </Card>
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


                  </>
                ),
              },
              {
                key: 'backup',
                label: '备份',
                forceRender: true,
                children: (
                  <>
                    <Card
                      className="bp-corners bp-card"
                      title={<span className="bp-title" style={{ fontSize: 12 }}>BACKUP / 整站备份</span>}
                      extra={<Tag color="blue">ZIP</Tag>}
                    >
                      <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', lineHeight: 1.8, marginBottom: 12 }}>
                        把数据库和本地附件目录一起打包成 ZIP。适合在升级、迁移或重要考试前留一份完整快照。
                        备份文件只在浏览器下载，不会长期占用服务器空间。
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                        <Button
                          type="primary"
                          icon={<DownloadOutlined />}
                          loading={backupBusy}
                          disabled={!canUpdate}
                          onClick={() => void backupSite()}
                        >
                          {backupBusy ? '正在打包…' : '立即生成并下载'}
                        </Button>
                        <Button
                          danger
                          icon={<UploadOutlined />}
                          disabled={!canUpdate || backupBusy}
                          onClick={openRestore}
                        >
                          上传备份并恢复
                        </Button>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: 8,
                          marginBottom: 14,
                        }}
                      >
                        {[
                          { label: '数据库', value: 'database.sql' },
                          { label: '附件', value: 'files/' },
                          { label: '清单', value: 'manifest.json' },
                          { label: '内容', value: '题目/答卷/设置' },
                        ].map((item) => (
                          <div key={item.label} style={{ border: '1px solid var(--bp-line-soft)', padding: '7px 9px' }}>
                            <div style={{ fontSize: 10, color: 'var(--bp-text-soft)' }}>{item.label}</div>
                            <div style={{ fontSize: 12, marginTop: 2 }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                      <Alert
                        type="info"
                        showIcon
                        title="恢复方式"
                        description={
                          <span>
                            推荐用上方「上传备份并恢复」：自动导入数据库与附件，完成后按提示重启服务。也可以在维护窗口手动恢复：先停服务，导入{' '}
                            <code>database.sql</code>，再把 <code>files/</code> 放回附件目录。不要在运行中的库上直接覆盖；升级/回滚前先备份。
                          </span>
                        }
                      />
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginTop: 10 }}
                        title="不包含"
                        description="浏览器缓存、前端构建产物、系统日志和临时文件不在备份内；这些可在升级后重新生成。"
                      />
                    </Card>
                    <Modal
                      title="上传备份并恢复"
                      open={restoreOpen}
                      onCancel={closeRestore}
                      onOk={() => {
                        if (restoreResult) {
                          closeRestore();
                          return;
                        }
                        void runRestore();
                      }}
                      okText={restoreResult ? '关闭' : '开始恢复'}
                      cancelText="取消"
                      okButtonProps={{
                        danger: !restoreResult,
                        disabled: !restoreResult && !restoreReady,
                        loading: restoreBusy,
                      }}
                      cancelButtonProps={{
                        disabled: restoreBusy,
                        style: restoreResult ? { display: 'none' } : undefined,
                      }}
                      width={isMobile ? '94%' : 560}
                      style={isMobile ? { top: 12 } : undefined}
                      styles={isMobile ? { body: { maxHeight: '72vh', overflowY: 'auto' } } : undefined}
                      closable={!restoreBusy}
                      maskClosable={!restoreBusy}
                      keyboard={!restoreBusy}
                      destroyOnHidden
                    >
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 14 }}
                        title="会覆盖当前数据库和附件"
                        description="恢复会用备份内容替换现有数据，且不可撤销；建议先点「立即生成并下载」保存一份最新备份。恢复期间不要关闭页面或重复提交。"
                      />
                      {restoreResult ? (
                        <>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                              gap: 8,
                            }}
                          >
                            {[
                              { label: '数据表', value: String(restoreResult.tables ?? 0) },
                              { label: '附件', value: String(restoreResult.files ?? 0) },
                              { label: '重启', value: restoreResult.restartRequired === false ? '不需要' : '需要' },
                            ].map((item) => (
                              <div
                                key={item.label}
                                style={{ border: '1px solid var(--bp-line-soft)', padding: '7px 9px' }}
                              >
                                <div style={{ fontSize: 10, color: 'var(--bp-text-soft)' }}>{item.label}</div>
                                <div style={{ fontSize: 12, marginTop: 2 }}>{item.value}</div>
                              </div>
                            ))}
                          </div>
                          <Alert
                            type="success"
                            showIcon
                            style={{ marginTop: 12 }}
                            title="备份已恢复"
                            description={
                              restoreResult.restartRequired === false
                                ? '服务未要求重启；仍建议重启后确认数据正常。'
                                : '请重启服务后生效；重启前不要继续录入或修改数据。'
                            }
                          />
                        </>
                      ) : (
                        <>
                          <Upload.Dragger
                            accept=".zip,application/zip"
                            maxCount={1}
                            showUploadList={false}
                            disabled={restoreBusy}
                            beforeUpload={(file) => {
                              if (!/\.zip$/i.test(file.name)) {
                                message.error('请选择 .zip 格式的整站备份');
                                return false;
                              }
                              setRestoreFile(file);
                              return false;
                            }}
                          >
                            <p className="ant-upload-drag-icon">
                              <UploadOutlined />
                            </p>
                            <p className="ant-upload-text">点击或拖拽备份 ZIP 到这里</p>
                            <p className="ant-upload-hint">只接受整站备份 .zip（含 database.sql 与 files/）</p>
                          </Upload.Dragger>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              flexWrap: 'wrap',
                              marginTop: 8,
                              fontSize: 12,
                              color: 'var(--bp-text-soft)',
                            }}
                          >
                            <span style={{ wordBreak: 'break-all' }}>
                              {restoreFile
                                ? '已选择：' + restoreFile.name + '（' + formatBytes(restoreFile.size) + '）'
                                : '还没有选择文件'}
                            </span>
                            {restoreFile && (
                              <Button
                                size="small"
                                type="text"
                                danger
                                disabled={restoreBusy}
                                onClick={() => setRestoreFile(undefined)}
                              >
                                移除
                              </Button>
                            )}
                          </div>
                          <div style={{ marginTop: 16 }}>
                            <Checkbox
                              checked={restoreConfirmed}
                              disabled={restoreBusy}
                              onChange={(e) => setRestoreConfirmed(e.target.checked)}
                            >
                              我已确认会覆盖当前数据库和附件
                            </Checkbox>
                          </div>
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 12, color: 'var(--bp-text-soft)', marginBottom: 6 }}>
                              输入 <code>RESTORE</code>（大写）后提交
                            </div>
                            <Input
                              value={restoreKeyword}
                              onChange={(e) => setRestoreKeyword(e.target.value)}
                              placeholder="RESTORE"
                              autoComplete="off"
                              aria-label="输入 RESTORE 确认恢复"
                              disabled={restoreBusy}
                            />
                          </div>
                        </>
                      )}
                    </Modal>
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
/** 分区底部的保存条 */
function SaveBar({ loading, onSave }: { loading: boolean; onSave: () => void }) {
  return (
    <div className="sk-settings-savebar">
      <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={onSave}>
        保存
      </Button>
    </div>
  );
}
