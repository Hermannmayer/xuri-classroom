import ProjectList from '../project/List';

/** 问卷列表：独立成一级菜单 */
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
