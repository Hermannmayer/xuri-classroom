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
  correctTimes?: number;
}
