-- S1-3：交卷幂等从进程内窗口升级为数据库约束
-- (project_id, create_by, attempt_no) 唯一：多实例并发重复提交只落一条。
-- 说明：create_by 为 NULL 的纯匿名提交不会被唯一索引约束（MySQL 唯一索引允许多个 NULL），
-- 这类提交仍靠设备限次 cookie；登录用户/白名单用户（create_by 非空）受约束。

ALTER TABLE t_answer
  ADD COLUMN attempt_no INT NOT NULL DEFAULT 0 COMMENT '同项目同答题人的第几次作答（从 0 开始）' AFTER items_synced;

-- 回填：按 (project_id, create_by) 分组，用创建时间 + id 稳定排序分配序号
UPDATE t_answer a
JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id, create_by ORDER BY create_at, id) - 1 AS rn
  FROM t_answer
) t ON a.id = t.id
SET a.attempt_no = t.rn;

ALTER TABLE t_answer
  ADD UNIQUE KEY uk_answer_pid_user_attempt (project_id, create_by, attempt_no);
