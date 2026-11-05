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
    strongPasswordEnabled?: boolean;
  };
  setting?: {
    captchaEnabled?: boolean;
    copyright?: string;
    recordNum?: string;
    amapKey?: string;
    amapSecurityJsCode?: string;
  };
  oauthProviders?: Record<string, boolean>;
}

export interface Authority {
  authority?: string;
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
