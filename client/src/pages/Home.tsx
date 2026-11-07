import { useOutletContext } from 'react-router-dom';
import Dashboard from './home/Dashboards';
import type { UserInfo } from '../api';

/**
 * 首页按「视角」分发：
 * - portal:admin   → 系统概览（用户/题库/考试/答卷 + 常用入口）
 * - portal:teacher → 我的教学（发布数、收集答卷、平均分、按班级看）
 * - 其它（学员）    → 我的学习（待考、已交卷、成绩、练习记录）
 *
 * 以前这一页对所有角色都是「我的任务 + 记录表」，老师和管理员看到的都是
 * 与自己无关的考试/问卷记录，没有信息量。
 */
export default function Home() {
  const { user } = useOutletContext<{ user?: UserInfo }>();
  return <Dashboard authorities={user?.authorityList ?? []} />;
}
