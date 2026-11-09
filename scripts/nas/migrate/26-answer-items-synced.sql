-- 明细投影同步标记：不能用 t_answer_item 的行数判断覆盖（没有选项的答卷展开后是 0 行）。
-- 幂等：列已存在则跳过。
SET NAMES utf8mb4;

SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer' AND COLUMN_NAME = 'items_synced');
SET @ddl := IF(@col = 0,
  'ALTER TABLE t_answer ADD COLUMN items_synced tinyint(1) NOT NULL DEFAULT 0 COMMENT ''明细投影是否已同步''',
  'SELECT ''items_synced already exists'' AS skipped');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer' AND COLUMN_NAME = 'items_synced';