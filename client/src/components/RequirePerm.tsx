import { useEffect, useState, type ReactNode } from 'react';
import { Button, Result, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { can, loadAuthorities } from '../auth/permissions';

/** 页面级权限守卫：没有权限直接给 403，而不是让用户进去看一堆 403 toast */
export default function RequirePerm({ perm, children }: { perm: string; children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    void loadAuthorities().then((authorities) => {
      if (alive) setState(can(authorities, perm) ? 'ok' : 'denied');
    });
    return () => {
      alive = false;
    };
  }, [perm]);

  if (state === 'loading') {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <Result
        status="403"
        title="没有访问权限"
        subTitle={`当前账号缺少 ${perm} 权限，请联系管理员分配角色。`}
        extra={
          <Button type="primary" onClick={() => navigate('/home')}>
            回首页
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
