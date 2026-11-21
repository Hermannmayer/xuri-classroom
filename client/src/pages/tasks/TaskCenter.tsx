import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { Empty, Tabs } from 'antd';
import { Navigate, useSearchParams } from 'react-router-dom';
import { can, loadAuthorities } from '../../auth/permissions';
import ProjectList from '../project/List';
import ExerciseList from '../exercise/List';
import MyReport from './MyReport';
import { PERMISSION_CODES } from '../../auth/permission-codes';

/** 我的任务：把原来左侧「我的考试」和「我的练习」两个入口合并成一个 */
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



  const teachingView = can(authorities, PERMISSION_CODES.portalTeacher) && can(authorities, PERMISSION_CODES.projectReport);
  if (teachingView || can(authorities, PERMISSION_CODES.portalAdmin)) {

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
        destroyOnHidden={false}
      />
    </div>
  );
}
