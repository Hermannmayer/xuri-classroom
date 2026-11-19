-- ---------------------------------------------------------------------------
-- 2.3.2 批改状态回填（数据修正，无结构变更）
--
-- 背景：2.2.1 引入 grade_status 时只加了列（DEFAULT 'none'），既没有回填历史答卷，
-- 也没有覆盖「只填了分值、没选判分模式」的老试卷。结果数据页「待批改 / 已批改」两档
-- 永远是 0 份：卷子在「全部」里看得见，老师却没有批改入口。
--
-- 判定口径与代码侧保持一致（AnswerScoreEvaluator#isManual）：
--   1) 卷面显式设置了 examAnswerMode=manual；或
--   2) 卷面含 Textarea / RichText 题且配过分值（文本类题型按人工评分兜底）。
--
-- 幂等：只更新 grade_status='none' 的行，重复执行不会再改。
-- 只动「正式交卷 + 答案非空 + 项目未删」的答卷，暂存草稿不动。
-- 误判兜底：AnswerGradeServiceImpl#detail 打开时若发现卷面已没有人工评分题，会把状态归位 none。
-- ---------------------------------------------------------------------------
UPDATE t_answer a
JOIN t_project p ON p.id = a.project_id
SET a.grade_status = 'pending'
WHERE a.grade_status = 'none'
  AND a.temp_save = 1
  AND a.answer IS NOT NULL
  AND p.is_deleted = 0
  AND (
    p.survey LIKE '%"examAnswerMode":"manual"%'
    OR (
      (p.survey LIKE '%"type":"Textarea"%' OR p.survey LIKE '%"type":"RichText"%')
      AND p.survey LIKE '%"examScore"%'
    )
  );
