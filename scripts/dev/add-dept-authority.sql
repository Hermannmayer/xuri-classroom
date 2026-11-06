-- 用户组级权限覆盖（可重复执行）
-- 旧数据默认 INHERIT：行为与原有角色权限完全一致。
SET @has_authority_mode = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dept' AND COLUMN_NAME = 'authority_mode'
);
SET @sql = IF(@has_authority_mode = 0,
  'ALTER TABLE t_dept ADD COLUMN authority_mode varchar(16) NOT NULL DEFAULT ''INHERIT'' COMMENT ''组权限模式：INHERIT/APPEND/OVERRIDE''',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_authority = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dept' AND COLUMN_NAME = 'authority'
);
SET @sql = IF(@has_authority = 0,
  'ALTER TABLE t_dept ADD COLUMN authority text DEFAULT NULL COMMENT ''组权限串，逗号分隔''',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE t_dept SET authority_mode = 'INHERIT' WHERE authority_mode IS NULL OR authority_mode = '';
