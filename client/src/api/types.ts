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

    copyProtected?: boolean | null;

    watermarkEnabled?: boolean | null;

    watermarkMode?: string | null;

    collaboratorAuthority?: string | null;


    exportPasswordEnabled?: boolean | null;
    copyright?: string;
    recordNum?: string;
    favicon?: string;
    amapKey?: string;
    amapSecurityJsCode?: string;

    updateCheckEnabled?: boolean;
    updateGithubRepo?: string;
    updateApiBase?: string;
    updateManifestUrl?: string;
    updateCheckIntervalHours?: number;
  };
  oauthProviders?: Record<string, boolean>;
}


export interface RegisterClass {
  id: string;
  name?: string;
  path?: string;
}


export interface RegisterOptions {
  globalEnabled: boolean;
  enabled: boolean;
  reason?: string | null;
  classes?: RegisterClass[];
}

export interface Authority {
  authority?: string;
}


export type ProjectMode = 'survey' | 'exam' | 'folder';

export interface ProjectView {
  id: string;
  name?: string;
  mode?: ProjectMode;

  status?: number;

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

  uiZoom?: number | string;

  uiTheme?: 'light' | 'dark';
  correctTimes?: number;
}


export interface PermissionItem {

  code: string;

  name: string;

  group: string;

  description?: string;

  suggested?: boolean;

  studentOnly?: boolean;
}


export interface PermissionGroup {
  group: string;
  total: number;
  permissions: PermissionItem[];
}


export interface RoleView {
  id: string;
  name?: string;

  code?: string;
  remark?: string;

  authorities?: string[];
  status?: number;
  createAt?: string;
}
