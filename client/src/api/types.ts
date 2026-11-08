/** 与后端 DTO 对齐的最小类型集：字段可缺省（Jackson non_null 不返回空值） */

export interface SystemInfo {
  id?: string;
  name?: string;
  description?: string;
  avatar?: string;
  locale?: string;
  version?: string;
  publicKey?: string;
  aiEnabled?: boolean;
  registerInfo?: {
    registerEnabled?: boolean;
    roles?: string[];
    deptId?: string;
    strongPasswordEnabled?: boolean;
  };
  setting?: {
    captchaEnabled?: boolean;
    /** 内容保护（前端防复制）：缺省 true，只有显式 false 才关闭；老数据可能是 null */
    copyProtected?: boolean | null;
    /** 全站水印开关：缺省 true，只有显式 false 才关闭；老数据可能是 null */
    watermarkEnabled?: boolean | null;
    /** 水印内容：'name_phone' | 'name' | 'phone'，缺省 'name_phone'；老数据可能是 null */
    watermarkMode?: string | null;
    /** 可担任项目协作者的权限串，缺省 'project:create'；ROLE_admin 始终可以；老数据可能是 null */
    collaboratorAuthority?: string | null;
    /** 导出密码：导出题库/答卷前需要输入，空串或 null 表示不启用；服务端不回显明文 */
    /** 是否已设置导出密码（后端只回显布尔值，绝不回显密码明文） */
    exportPasswordEnabled?: boolean | null;
    copyright?: string;
    recordNum?: string;
    favicon?: string;
    amapKey?: string;
    amapSecurityJsCode?: string;
  };
  oauthProviders?: Record<string, boolean>;
}

export interface Authority {
  authority?: string;
}

/** 项目：问卷 / 考试 / 文件夹，统一存在 t_project，题树在 survey 字段 */
export type ProjectMode = 'survey' | 'exam' | 'folder';

export interface ProjectView {
  id: string;
  name?: string;
  mode?: ProjectMode;
  /** 0 未发布 1 已发布 */
  status?: number;
  /** folder 为子项数，其余为答卷数 */
  total?: number;
  parentId?: string;
  createAt?: string;
  updateAt?: string;
}

export interface UserInfo {
  userId: string;
  name?: string;
  enabled?: boolean;
  avatar?: string;
  deptId?: string;
  deptName?: string;
  gender?: string;
  phone?: string;
  email?: string;
  profile?: string;
  positionList?: { id: string; name: string }[];
  status?: number;
  authorityList?: string[];
  /** 界面缩放（0.9 / 1 / 1.15 / 1.3），跟着账号走 */
  uiZoom?: number | string;
  /** 主题 light/dark（跟着账号走） */
  uiTheme?: 'light' | 'dark';
  correctTimes?: number;
}

/** 权限目录里的单个权限点（后端 PermissionEnum.PermissionItem） */
export interface PermissionItem {
  /** 权限串，例如 repo:create */
  code: string;
  /** 中文名 */
  name: string;
  /** 所属分组 */
  group: string;
  /** 一句话说明 */
  description?: string;
  /** 是否只是「建议新增」、尚未接入注解 */
  suggested?: boolean;
  /** 学员专属：管理员不会自动拥有 */
  studentOnly?: boolean;
}

/** 权限目录的一个分组（后端 PermissionGroupView） */
export interface PermissionGroup {
  group: string;
  total: number;
  permissions: PermissionItem[];
}

/** 角色（后端 RoleView） */
export interface RoleView {
  id: string;
  name?: string;
  /** admin / teacher / student */
  code?: string;
  remark?: string;
  /** 该角色当前拥有的权限串 */
  authorities?: string[];
  status?: number;
  createAt?: string;
}
