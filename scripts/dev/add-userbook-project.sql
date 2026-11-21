-- t_user_book 增加「来源考试」列 + (create_by, project_id) 索引（可重复执行）

-- 所以用 information_schema 判重 + 预处理语句保证幂等。

-- 1. 加列（历史数据保持 NULL = 来源未知；题库练习产生的错题也是 NULL）
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_user_book' AND COLUMN_NAME = 'project_id'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `t_user_book` ADD COLUMN `project_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT ''来源考试ID（错题本按考试分开记）'' AFTER `repo_id`',
  'SELECT ''t_user_book.project_id already exists''');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_user_book' AND INDEX_NAME = 'idx_user_book_project'
);
SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE `t_user_book` ADD INDEX `idx_user_book_project` (`create_by`, `project_id`)',
  'SELECT ''idx_user_book_project already exists''');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
