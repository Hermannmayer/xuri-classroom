import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { Navigate } from 'react-router-dom';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import ProjectList from './List';

/**
 * /project 入口：
 * - 老师/管理员（portal:teacher + project:list）：教学已合并到 /teaching，重定向过去；
 * - 学员 / 只读协作者：保持原「考试安排」视图。
 */
export default function ProjectEntry() {
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

  if (can(authorities, PERMISSION_CODES.portalTeacher) && can(authorities, PERMISSION_CODES.projectList)) {
    return <Navigate to="/teaching?tab=exam" replace />;
  }

  return <ProjectList />;
}
