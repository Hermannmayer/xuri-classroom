import { useEffect, useState } from 'react';
import { Result, Spin } from 'antd';
import { useSearchParams, useParams } from 'react-router-dom';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import ProjectList from '../project/List';
import TeachingClasses from './Classes';

type TabKey = 'exam' | 'classes';


const TAB_ORDER: TabKey[] = ['exam', 'classes'];
const TAB_PERMISSION: Record<TabKey, string> = {
  exam: PERMISSION_CODES.projectList,
  classes: PERMISSION_CODES.classList,
};





const LEGACY_TAB: Record<string, TabKey> = { insight: 'classes', class: 'classes' };

/** 教学页：考试/问卷与班级合并成一页两个 Tab */
export default function TeachingHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams<{ tab?: string }>();
  const [authorities, setAuthorities] = useState<string[]>();

  useEffect(() => {
    void loadAuthorities().then(setAuthorities);
  }, []);

  const tabs: TabKey[] = authorities ? TAB_ORDER.filter((key) => can(authorities, TAB_PERMISSION[key])) : [];




  const pathTab = params.tab;
  const requestedParam = pathTab === 'exam' || pathTab === 'classes' ? pathTab : searchParams.get('tab');
  const requested: TabKey | undefined =
    requestedParam === 'exam' || requestedParam === 'classes'
      ? requestedParam
      : requestedParam
        ? LEGACY_TAB[requestedParam]
        : undefined;
  const active: TabKey | undefined = requested && tabs.includes(requested) ? requested : tabs[0];







  useEffect(() => {
    if (!active || searchParams.get('tab') === active) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', active);
        return next;
      },
      { replace: true },
    );
  }, [active, searchParams, setSearchParams]);

  if (!authorities) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (!active) {
    return (
      <Result
        status="403"
        title="没有访问权限"
        subTitle="当前账号既没有考试/问卷（project:list）也没有班级（class:list）的查看权限，请联系管理员分配角色。"
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>TEACHING / 教学</div>
        <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
          教学与班级
        </h2>
        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
          左侧「试卷」管考试与问卷，「班级」管成员与班级资源。
        </div>
      </div>






      {active === 'exam' ? <ProjectList embedded mode="exam" /> : <TeachingClasses embedded />}
    </div>
  );
}
