-- 考试/题库授权三级：t_project_partner.access_level / t_repo_partner.access_level（2026-11，幂等）
SET NAMES utf8mb4;


SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_project_partner' AND COLUMN_NAME = 'access_level'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_project_partner ADD COLUMN access_level tinyint NOT NULL DEFAULT 2 COMMENT ''授权级别 1只读 2可编辑(含只读) 3可授权(含编辑)'' AFTER data_permission',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo_partner' AND COLUMN_NAME = 'access_level'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_repo_partner ADD COLUMN access_level tinyint NOT NULL DEFAULT 2 COMMENT ''授权级别 1只读 2可编辑(含只读) 3可授权(含编辑)'' AFTER dept_id',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


UPDATE t_project_partner SET access_level = 3 WHERE type = 1;
UPDATE t_project_partner SET access_level = 1 WHERE type = 3;
UPDATE t_project_partner SET access_level = 1 WHERE type = 4;


SELECT COUNT(*) AS project_partner_access_level FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_project_partner' AND COLUMN_NAME = 'access_level';
SELECT COUNT(*) AS repo_partner_access_level FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo_partner' AND COLUMN_NAME = 'access_level';
SELECT COUNT(*) AS respondent_not_readonly FROM t_project_partner WHERE type IN (3, 4) AND access_level > 1;
