import { useOutletContext } from 'react-router-dom';
import Dashboard from './home/Dashboards';
import type { UserInfo } from '../api';

/**
 * 首页按「视角」分发（具体判定在 Dashboards 的默认导出里）：
 * - portal:admin                     → 系统概览（用户/题库/考试/答卷 + 常用入口）
 * - portal:teacher + project:report  → 我的教学（发布数、收集答卷、平均分、按班级看）
 *   教学接口 /api/teaching/* 要 project:report；学员预设也带 report，所以门户权限与接口权限要一起判，
 *   只配 portal:teacher 的账号不会渲染教师首页，避免整页 403 提示。
 * - 其它（学员）                      → 我的学习（待考、已交卷、成绩、练习记录）
 *
 * 以前这一页对所有角色都是「我的任务 + 记录表」，老师和管理员看到的都是
 * 与自己无关的考试/问卷记录，没有信息量。
 */
export default function Home() {
  const { user } = useOutletContext<{ user?: UserInfo }>();
  return <Dashboard authorities={user?.authorityList ?? []} />;
}
