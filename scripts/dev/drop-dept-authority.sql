-- 删除废弃的组级权限串列：t_dept.authority_mode / t_dept.authority（可重复执行）
--
-- 背景：权限点只挂角色（t_role.authority 保留不动），组通过 t_dept_role 授权，
-- 组只负责「成员 + 有效期」。这两列从 task-24 起已不参与任何权限计算，这里直接把列删掉。
--
-- 幂等策略：MySQL 不支持 ALTER TABLE ... DROP COLUMN IF EXISTS，
-- 所以先查 information_schema.COLUMNS，列存在才 DROP；重复执行只会打印 "already dropped"。
--
-- 用法：mysql -uroot -p surveyking < scripts/dev/drop-dept-authority.sql
-- 注意：只动 t_dept；t_role.authority 是角色权限串，不要删。

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

-- 自检：应只剩与角色/有效期相关的列，不再有 authority_mode / authority
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dept'
ORDER BY ORDINAL_POSITION;
