import { useEffect, useMemo, useState } from 'react';
import { Empty, Tabs } from 'antd';
import { Navigate, useSearchParams } from 'react-router-dom';
import { can, loadAuthorities } from '../../auth/permissions';
import ProjectList from '../project/List';
import ExerciseList from '../exercise/List';
import MyReport from './MyReport';
import { PERMISSION_CODES } from '../../auth/permission-codes';

/**
 * 我的任务：把原来左侧「我的考试」和「我的练习」两个入口合并成一个。
 *
 * <p>业务上它们是两回事（考试是待考的卷子，练习是刷过的记录），但对用户来说
 * 「两个列表 + 一个进入按钮」重复感很强。合并成两个 Tab 后，左侧菜单少一项，
 * 文案也更直白：考试安排 / 练习记录。
 *
 * <p>Tab 用 URL 记忆（?tab=practice），刷新、收藏、从别处跳回来都能落在同一个页签。
 */
export default function TaskCenter() {
  const [params, setParams] = useSearchParams();
  const [authorities, setAuthorities] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadAuthorities().then((list) => {
      setAuthorities(list ?? []);
      setReady(true);
    });
  }, []);

  // 教学视角 = portal:teacher 且 project:report：TeachingApi 要 report，
  // 只配门户权限的账号进 /teaching 会 403，这里不能再把它当成教学视角。
  const teachingView = can(authorities, PERMISSION_CODES.portalTeacher) && can(authorities, PERMISSION_CODES.projectReport);
  if (teachingView || can(authorities, PERMISSION_CODES.portalAdmin)) {
    // 没有 project:list 的教学角色去不了项目列表，退到班级学情（它同样要 report）
    return <Navigate to={can(authorities, PERMISSION_CODES.projectList) ? '/project' : '/teaching'} replace />;
  }
  const canExam = can(authorities, PERMISSION_CODES.projectList);
  const canPractice = can(authorities, PERMISSION_CODES.exerciseList);
  const canReport = can(authorities, PERMISSION_CODES.projectReport);

  const items = useMemo(() => {
    const tabs: { key: string; label: string; children: JSX.Element }[] = [];
    if (canExam) {
      tabs.push({ key: 'exam', label: '考试安排', children: <ProjectList /> });
    }
    if (canPractice) {
      tabs.push({ key: 'practice', label: '练习记录', children: <ExerciseList /> });
    }
    // 我的成绩：只能看自己交过的卷子（后端按 createBy 过滤）
    if (canReport) {
      tabs.push({ key: 'report', label: '我的成绩', children: <MyReport /> });
    }
    return tabs;
  }, [canExam, canPractice, canReport]);

  if (!ready) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--bp-text-soft)' }}>加载中…</div>;
  }

  if (items.length === 0) {
    return <Empty description="当前账号没有任何考试或练习权限，请联系管理员分配角色" />;
  }

  const wanted = params.get('tab');
  const active = items.some((item) => item.key === wanted) ? (wanted as string) : items[0].key;

  return (
    <div>
      <Tabs
        activeKey={active}
        onChange={(key) => setParams({ tab: key }, { replace: true })}
        items={items}
        destroyInactiveTabPane={false}
      />
    </div>
  );
}
