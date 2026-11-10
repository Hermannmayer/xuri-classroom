-- ======
-- 匿名答卷主体与 t_answer 匿名标识（P6，2026-11，幂等）
--
-- 背景：公开问卷不要求登录时，之前匿名答卷 create_by 为 NULL，浏览器刷新/换设备后
-- 无法找回自己的历次作答，也无法在登录后认领。这里引入匿名主体：
--   t_anonymous_subject：一行 = 一个浏览器匿名身份，cookie 只存随机 token，表里存 SHA-256；
--   t_answer.anonymous_subject_id / is_anonymous：匿名答卷挂到主体，报表默认只统计 is_anonymous=0。
--
-- 用法：
--   docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < 33-anonymous-answer.sql
-- ======
SET NAMES utf8mb4;

-- 1. 匿名主体表（IF NOT EXISTS，可重复执行）
CREATE TABLE IF NOT EXISTS `t_anonymous_subject` (
  `id` varchar(64) NOT NULL COMMENT 'ID',
  `token_hash` varchar(128) NOT NULL COMMENT '匿名 cookie token 的 SHA-256 十六进制',
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `last_seen_at` timestamp NULL DEFAULT NULL COMMENT '最近访问时间',
  `expires_at` timestamp NOT NULL COMMENT '过期时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_anonymous_token_hash` (`token_hash`),
  KEY `idx_anonymous_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='匿名答题主体';

-- 2. t_answer.anonymous_subject_id（先查 information_schema.COLUMNS）
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_answer'
    AND COLUMN_NAME = 'anonymous_subject_id'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_answer ADD COLUMN anonymous_subject_id varchar(64) DEFAULT NULL COMMENT ''匿名答题主体（t_anonymous_subject.id）；登录用户为 NULL''',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. t_answer.is_anonymous（NOT NULL DEFAULT 0，存量行自动为 0）
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_answer'
    AND COLUMN_NAME = 'is_anonymous'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_answer ADD COLUMN is_anonymous tinyint(1) NOT NULL DEFAULT ''0'' COMMENT ''是否匿名答卷：1 是 0 否''',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. 索引：主体查答卷、项目报表按匿名过滤
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_answer'
    AND INDEX_NAME = 'idx_answer_anon_subject'
);
SET @ddl_idx := IF(@idx_exists = 0,
  'ALTER TABLE t_answer ADD KEY idx_answer_anon_subject (anonymous_subject_id)',
  'SELECT 1');
PREPARE stmt_idx FROM @ddl_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_answer'
    AND INDEX_NAME = 'idx_answer_project_anon'
);
SET @ddl_idx := IF(@idx_exists = 0,
  'ALTER TABLE t_answer ADD KEY idx_answer_project_anon (project_id, is_anonymous)',
  'SELECT 1');
PREPARE stmt_idx FROM @ddl_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- 5. 自检
SELECT COUNT(*) AS anonymous_subject_rows FROM t_anonymous_subject;
SELECT COUNT(*) AS answer_anon_subject_column FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer' AND COLUMN_NAME = 'anonymous_subject_id';
SELECT COUNT(*) AS answer_is_anonymous_column FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer' AND COLUMN_NAME = 'is_anonymous';
SELECT COUNT(*) AS answer_anon_indexes FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer'
  AND INDEX_NAME IN ('idx_answer_anon_subject', 'idx_answer_project_anon');
