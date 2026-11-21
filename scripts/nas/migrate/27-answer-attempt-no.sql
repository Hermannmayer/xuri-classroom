-- S1-3：交卷幂等从进程内窗口升级为数据库约束 (project_id, create_by, attempt_no) 唯一：多实例并发重复提交只落一条。

ALTER TABLE t_answer
  ADD COLUMN attempt_no INT NOT NULL DEFAULT 0 COMMENT '同项目同答题人的第几次作答（从 0 开始）' AFTER items_synced;


UPDATE t_answer a
JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id, create_by ORDER BY create_at, id) - 1 AS rn
  FROM t_answer
) t ON a.id = t.id
SET a.attempt_no = t.rn;

ALTER TABLE t_answer
  ADD UNIQUE KEY uk_answer_pid_user_attempt (project_id, create_by, attempt_no);
