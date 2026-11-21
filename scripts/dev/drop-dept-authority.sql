-- 删除废弃的组级权限串列：t_dept.authority_mode / t_dept.authority（可重复执行）


SET @tbl_exists = (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dept'
);

SET @has_authority_mode = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dept' AND COLUMN_NAME = 'authority_mode'
);
SET @sql = IF(@tbl_exists > 0 AND @has_authority_mode > 0,
  'ALTER TABLE `t_dept` DROP COLUMN `authority_mode`',
  'SELECT ''t_dept.authority_mode already dropped'' AS note');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_authority = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dept' AND COLUMN_NAME = 'authority'
);
SET @sql = IF(@tbl_exists > 0 AND @has_authority > 0,
  'ALTER TABLE `t_dept` DROP COLUMN `authority`',
  'SELECT ''t_dept.authority already dropped'' AS note');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dept'
ORDER BY ORDINAL_POSITION;
