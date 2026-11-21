-- 题库分类（空文件夹）：t_repo_category（2026-11，幂等）
SET NAMES utf8mb4;


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


SELECT COUNT(*) AS repo_category_table FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo_category';
SELECT COUNT(*) AS path_unique_index FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo_category' AND INDEX_NAME = 'uk_repo_category_path';
SELECT COUNT(*) AS parent_index FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo_category' AND INDEX_NAME = 'idx_repo_category_parent';
