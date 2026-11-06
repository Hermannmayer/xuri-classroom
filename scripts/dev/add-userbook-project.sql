-- t_user_book 增加「来源考试」列 + (create_by, project_id) 索引（可重复执行）
--
-- 背景：错题本要支持「只练这一场考试的错题」，必须知道每条错题是哪场考试产生的；
--       原来 t_user_book 只有 template_id / repo_id（题库维度），见 docs/research/exam-mode-audit.md C 节。
-- 用法：mysql -u<user> -p<pwd> <db> < scripts/dev/add-userbook-project.sql
-- 注意：本脚本是 MySQL 版 —— MySQL 的 ADD COLUMN / ADD INDEX 没有 IF NOT EXISTS，
--       所以用 information_schema 判重 + 预处理语句保证幂等。
--       H2 直接跑 server/rdbms/src/main/resources/scripts/init-h2.sql 即可（那边已有建表语句与索引）。

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

-- 2. 加索引：错题本列表 / 练习页都按 (当前用户, 来源考试) 过滤
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

-- 3. 校验（执行后自检：应能看到 project_id 列与 idx_user_book_project 索引）
-- SHOW COLUMNS FROM `t_user_book` LIKE 'project_id';
-- SHOW INDEX FROM `t_user_book` WHERE Key_name = 'idx_user_book_project';
