-- 2.3.2 批改状态回填（数据修正，无结构变更）
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
