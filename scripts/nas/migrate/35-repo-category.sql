-- ======
-- 题库分类（空文件夹）：t_repo_category（2026-11，幂等）
--
-- 背景：t_repo.category 是自由文本，只能表达「题库身上写了什么分类」，表达不了：
--   1) 只建目录、还没放题库的空文件夹；
--   2) 同名分类的规范化（首尾空格、重复 / 由接口统一处理，这里只保证 path 唯一）。
-- 于是加一张「目录登记表」：path 用 / 连接表示层级（如 保育员/初级），唯一键防重复。
-- 表里刻意没有 is_deleted：删目录就是真删（题库自己的 category 字段不受影响）。
--
-- 用法：
--   docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < 35-repo-category.sql
-- ======
SET NAMES utf8mb4;

-- 1. 建表（已存在则跳过）
CREATE TABLE IF NOT EXISTS `t_repo_category` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '分类名（单段，不含 /）',
  `parent_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '上级分类 id；为空表示根',
  `path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '全路径，用 / 连接（如 保育员/初级）',
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_repo_category_path` (`path`),
  KEY `idx_repo_category_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='题库分类（含空文件夹）';

-- 2. 唯一键与索引（表已存在但缺索引时补上；都存在则跳过）
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo_category' AND INDEX_NAME = 'uk_repo_category_path'
);
SET @ddl := IF(@idx_exists = 0, 'ALTER TABLE t_repo_category ADD UNIQUE KEY uk_repo_category_path (path)', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo_category' AND INDEX_NAME = 'idx_repo_category_parent'
);
SET @ddl := IF(@idx_exists = 0, 'ALTER TABLE t_repo_category ADD KEY idx_repo_category_parent (parent_id)', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 自检：表 1、唯一键 2（unique 索引在 STATISTICS 里按列各一行）、普通索引 1
SELECT COUNT(*) AS repo_category_table FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo_category';
SELECT COUNT(*) AS path_unique_index FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo_category' AND INDEX_NAME = 'uk_repo_category_path';
SELECT COUNT(*) AS parent_index FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo_category' AND INDEX_NAME = 'idx_repo_category_parent';
