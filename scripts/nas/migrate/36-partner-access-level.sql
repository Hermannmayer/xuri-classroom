-- ======
-- 考试/题库授权三级：t_project_partner.access_level / t_repo_partner.access_level（2026-11，幂等）
--
-- 背景：成员授权原来只有「有/没有」两档，无法表达「只读 / 可编辑 / 可再授权」。
-- 本次加一列 access_level：
--   1 = 可查看（只读）
--   2 = 可编辑（含查看）—— 默认值
--   3 = 可授权（含编辑/查看）—— 最高级，能继续把成员授权给别人
-- 答卷人（t_project_partner.type=3 班级/学员）与外部导入答卷人只读，迁移里回填成 1。
--
-- 用法：
--   docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < 36-partner-access-level.sql
-- ======
SET NAMES utf8mb4;

-- 1. t_project_partner.access_level
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

-- 2. t_repo_partner.access_level
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

-- 3. 所有者 = 可授权；答卷人只读：type=3（班级/学员）回填 1；外部导入答卷人（type=4）同样只读
UPDATE t_project_partner SET access_level = 3 WHERE type = 1;
UPDATE t_project_partner SET access_level = 1 WHERE type = 3;
UPDATE t_project_partner SET access_level = 1 WHERE type = 4;

-- 4. 自检：两列各返回 1；只读答卷人都不高于 1（返回 0 行）
SELECT COUNT(*) AS project_partner_access_level FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_project_partner' AND COLUMN_NAME = 'access_level';
SELECT COUNT(*) AS repo_partner_access_level FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo_partner' AND COLUMN_NAME = 'access_level';
SELECT COUNT(*) AS respondent_not_readonly FROM t_project_partner WHERE type IN (3, 4) AND access_level > 1;
