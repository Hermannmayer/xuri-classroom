import ProjectList from '../project/List';

/**
 * 问卷列表：独立成一级菜单。
 *
 * <p>问卷和考试在数据上是同一张表（t_project.mode），但使用场景不同：考试要批改、算分、看报表，

 * 复用 ProjectList，只是把 mode 限定成 survey；新建、复制、回收站这些动作与考试完全一致。
 */
export default function SurveyList() {
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--bp-text-soft)' }}>SURVEY / 问卷</div>
        <h2 className="bp-title" style={{ fontSize: 18, margin: '6px 0 0', letterSpacing: '0.06em' }}>
          问卷
        </h2>
        <div style={{ fontSize: 11, color: 'var(--bp-text-soft)', marginTop: 4 }}>
          只列出问卷型项目；考试在左侧「教学 → 试卷」里。
        </div>
      </div>
      <ProjectList mode="survey" embedded />
    </div>
  );
}
