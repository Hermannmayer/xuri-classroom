import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { Navigate } from 'react-router-dom';
import { can, loadAuthorities } from '../../auth/permissions';
import SystemGroup from './Group';
import { PERMISSION_CODES } from '../../auth/permission-codes';

/**
 * 用户组入口兼容层：
 * - 有 class:list 的账号（管理员/老师）已经用「班级管理」承载组织设置，直接重定向，避免两棵树；
 * - 只有 system:dept:list、没有班级入口的角色（纯组织管理员）仍保留原用户组页。
 */
export default function GroupEntry() {
  const [authorities, setAuthorities] = useState<string[]>();

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  if (!authorities) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }
  if (can(authorities, PERMISSION_CODES.classList)) {
    return <Navigate to="/teaching/classes" replace />;
  }
  return <SystemGroup />;
}
