import { useEffect, useState } from 'react';
import { Spin, Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import ProjectList from '../project/List';
import TeachingWorkbench from './Workbench';

type TabKey = 'exam' | 'insight';

/**
 * 教学页：把原「教学管理」(/project) 与「班级学情」(/teaching) 合并成两个 Tab。
 *
 * <p>考试/问卷沿用 ProjectList 的管理视图（embedded 隐藏它自己的页头）；
 * 学情是紧凑版 Workbench（考试下拉 + 班级分布），没有 project:report 的账号不显示该 Tab。
 * Tab 与 URL 的 ?tab= 同步，刷新/前进后退都能保持。
 */
export default function TeachingHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [authorities, setAuthorities] = useState<string[]>();

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  const canReport = authorities ? can(authorities, PERMISSION_CODES.projectReport) : false;
  const requested: TabKey = searchParams.get('tab') === 'insight' ? 'insight' : 'exam';
  // 没权限时即使 URL 写了 insight 也只显示考试/问卷
  const activeKey: TabKey = canReport ? requested : 'exam';

  useEffect(() => {
    if (!authorities || canReport || requested !== 'insight') return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'exam');
    setSearchParams(next, { replace: true });
  }, [authorities, canReport, requested, searchParams, setSearchParams]);

  if (!authorities) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  const changeTab = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>TEACHING / 教学</div>
        <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
          教学
        </h2>
        <div style={{ fontSize: 11, color: 'rgba(160,196,232,0.7)', marginTop: 4 }}>
          考试/问卷与班级学情集中在这里；班级与学员在左侧「班级管理」维护。
        </div>
      </div>

      <Tabs
        activeKey={activeKey}
        onChange={changeTab}
        items={[
          { key: 'exam', label: '考试/问卷', children: <ProjectList embedded /> },
          ...(canReport ? [{ key: 'insight', label: '学情', children: <TeachingWorkbench /> }] : []),
        ]}
      />
    </div>
  );
}
