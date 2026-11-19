import { useEffect, useState } from 'react';
import { Result, Spin } from 'antd';
import { useSearchParams, useParams } from 'react-router-dom';
import { can, loadAuthorities } from '../../auth/permissions';
import { PERMISSION_CODES } from '../../auth/permission-codes';
import ProjectList from '../project/List';
import TeachingClasses from './Classes';

type TabKey = 'exam' | 'classes';

/** Tab 顺序与各自的权限点：顺序决定 Tab 从左到右怎么排，权限点决定它在不在 */
const TAB_ORDER: TabKey[] = ['exam', 'classes'];
const TAB_PERMISSION: Record<TabKey, string> = {
  exam: PERMISSION_CODES.projectList,
  classes: PERMISSION_CODES.classList,
};
/**
 * 旧参数值归一到现在的 Tab。
 * insight 是被删掉的「学情」—它的内容是班级视角，所以归到「班级」而不是「考试/问卷」；
 * class 是首页卡片里写下的单数形式。不归一会让这些入口静默落到考试/问卷页，用户以为点错了。
 */
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

  // ?tab= 只认 exam / classes（外加两个旧值），其余乱值退回第一个可用 Tab
  // 左侧菜单现在直接指到 /teaching/exam 与 /teaching/classes，路径里的 :tab 优先；
  // 旧的 ?tab= 仍然认，保证老链接和页面内切换都还能用
  const pathTab = params.tab;
  const requestedParam = pathTab === 'exam' || pathTab === 'classes' ? pathTab : searchParams.get('tab');
  const requested: TabKey | undefined =
    requestedParam === 'exam' || requestedParam === 'classes'
      ? requestedParam
      : requestedParam
        ? LEGACY_TAB[requestedParam]
        : undefined;
  const active: TabKey | undefined = requested && tabs.includes(requested) ? requested : tabs[0];

  /**
   * 把实际显示的 Tab 写回 URL：刷新、前进后退、把链接发给别人，看到的都还是同一个 Tab。
   *
   * <p>用函数式更新只改 tab 一个参数——班级 Tab 里的 classId / create 是它自己的状态，
   * 这一层如果整串覆盖 URL，就等于把「链接直达某个班」这件事弄丢了。
   */
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

      {/*
        这里原来有一排「考试/问卷 · 班级」页签，和左侧菜单的两个子项完全重复：
        菜单已经能直达 /teaching/exam 与 /teaching/classes，页签再点一次只是原地刷新，
        看上去像「点不动」。现在直接渲染当前子页，不再画第二层导航。
      */}
      {active === 'exam' ? <ProjectList embedded mode="exam" /> : <TeachingClasses embedded />}
    </div>
  );
}
