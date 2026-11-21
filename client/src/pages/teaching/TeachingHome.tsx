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

/**
 * 教学页：考试/问卷与班级合并成一页两个 Tab。
 *
 * <p>为什么合并：这两件事是同一条动线——先看班、再给班发考试/问卷，拆成两个菜单的代价是
 * 侧栏多一项、老师为一件事跳两次页。原「班级学情」只是班级资源面板的另一种视图，直接删掉，
 * 学员与班级成员统一在「班级」Tab 里维护。
 *
 * <p>权限没有放松：两个 Tab 各自按自己的权限点判定，只留当前账号真能看的那个；
 * 一个都没有时给 403 结果页，而不是渲染一个空 Tabs——空壳页会被当成加载失败。
 */
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
