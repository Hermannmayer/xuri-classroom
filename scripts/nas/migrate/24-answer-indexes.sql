-- 答卷列表热路径索引（AnswerServiceImpl.listAnswer）： WHERE project_id = ? [AND create_by = ?] ORDER BY create_at DESC 原来只有 (project_id)，排序与「只看本人答卷」的分支都要 filesort。
SET NAMES utf8mb4;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_answer'
    AND INDEX_NAME = 'key_answer_pid_user_time'
);

SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE t_answer ADD INDEX key_answer_pid_user_time (project_id, create_by, create_at)',
  'SELECT ''key_answer_pid_user_time already exists'' AS skipped');

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;