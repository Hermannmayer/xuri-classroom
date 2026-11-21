-- 题库全局开放期：t_repo.open_start_at / open_end_at（2026-11，幂等）

-- 任意时间。
SET NAMES utf8mb4;


SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_repo'
    AND COLUMN_NAME = 'open_start_at'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_repo ADD COLUMN open_start_at datetime DEFAULT NULL COMMENT ''全局开放期开始，留空=不限'' AFTER setting',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_repo'
    AND COLUMN_NAME = 'open_end_at'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_repo ADD COLUMN open_end_at datetime DEFAULT NULL COMMENT ''全局开放期结束，留空=不限'' AFTER open_start_at',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SELECT COUNT(*) AS open_start_at_column FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo' AND COLUMN_NAME = 'open_start_at';
SELECT COUNT(*) AS open_end_at_column FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo' AND COLUMN_NAME = 'open_end_at';
