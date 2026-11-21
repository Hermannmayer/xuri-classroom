-- =============================================================================
-- 幂等补齐脚本：老库升级用（MySQL 8）
--
-- 背景：这些列/索引是在开发过程中陆续加的，以前的 init-mysql.sql 没同步，
-- 导致「老库能跑、空库跑不起来」。本脚本把老库补齐到与最新 init 脚本一致，
-- 可以重复执行，不会报 duplicate column / duplicate key。
--
-- 用法：
--   mysql -uroot -p surveyking < scripts/dev/add-indexes.sql
--   （Windows 也可）& "C:\path\mysql.exe" -uroot -p surveyking -e "source scripts/dev/add-indexes.sql"
--

-- =============================================================================

SET @db := DATABASE();




SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db AND table_name = 't_repo_partner' AND column_name = 'dept_id') = 0,
  'ALTER TABLE `t_repo_partner` ADD COLUMN `dept_id` varchar(64) DEFAULT NULL COMMENT ''部门/用户组id（授权给整组时使用）''',
  'SELECT ''t_repo_partner.dept_id already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;




SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db AND table_name = 't_dept' AND column_name = 'valid_from') = 0,
  'ALTER TABLE `t_dept` ADD COLUMN `valid_from` timestamp NULL DEFAULT NULL COMMENT ''组有效期开始''',
  'SELECT ''t_dept.valid_from already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @db AND table_name = 't_dept' AND column_name = 'valid_to') = 0,
  'ALTER TABLE `t_dept` ADD COLUMN `valid_to` timestamp NULL DEFAULT NULL COMMENT ''组有效期结束''',
  'SELECT ''t_dept.valid_to already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;





SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 't_template' AND index_name = 'idx_template_repo') = 0,
  'ALTER TABLE `t_template` ADD INDEX `idx_template_repo` (`repo_id`)',
  'SELECT ''idx_template_repo already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 't_project' AND index_name = 'idx_project_create_by') = 0,
  'ALTER TABLE `t_project` ADD INDEX `idx_project_create_by` (`create_by`)',
  'SELECT ''idx_project_create_by already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 't_project_partner' AND index_name = 'idx_pp_project') = 0,
  'ALTER TABLE `t_project_partner` ADD INDEX `idx_pp_project` (`project_id`)',
  'SELECT ''idx_pp_project already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 't_project_partner' AND index_name = 'idx_pp_user') = 0,
  'ALTER TABLE `t_project_partner` ADD INDEX `idx_pp_user` (`user_id`)',
  'SELECT ''idx_pp_user already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 't_project_partner' AND index_name = 'idx_pp_group') = 0,
  'ALTER TABLE `t_project_partner` ADD INDEX `idx_pp_group` (`group_id`)',
  'SELECT ''idx_pp_group already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 't_repo_partner' AND index_name = 'idx_repo_partner_repo') = 0,
  'ALTER TABLE `t_repo_partner` ADD INDEX `idx_repo_partner_repo` (`repo_id`)',
  'SELECT ''idx_repo_partner_repo already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 't_repo_partner' AND index_name = 'idx_repo_partner_user') = 0,
  'ALTER TABLE `t_repo_partner` ADD INDEX `idx_repo_partner_user` (`user_id`)',
  'SELECT ''idx_repo_partner_user already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 't_repo_partner' AND index_name = 'idx_repo_partner_dept') = 0,
  'ALTER TABLE `t_repo_partner` ADD INDEX `idx_repo_partner_dept` (`dept_id`)',
  'SELECT ''idx_repo_partner_dept already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 't_user' AND index_name = 'idx_user_dept') = 0,
  'ALTER TABLE `t_user` ADD INDEX `idx_user_dept` (`dept_id`)',
  'SELECT ''idx_user_dept already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = @db AND table_name = 't_dept' AND index_name = 'idx_dept_parent') = 0,
  'ALTER TABLE `t_dept` ADD INDEX `idx_dept_parent` (`parent_id`)',
  'SELECT ''idx_dept_parent already exists'' AS skipped');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;




SELECT 'columns' AS kind, table_name, column_name AS name
FROM information_schema.columns
WHERE table_schema = @db
  AND ((table_name = 't_repo_partner' AND column_name = 'dept_id')
    OR (table_name = 't_dept' AND column_name IN ('valid_from', 'valid_to')))
UNION ALL
SELECT 'index' AS kind, table_name, index_name AS name
FROM information_schema.statistics
WHERE table_schema = @db
  AND index_name IN ('idx_template_repo','idx_project_create_by','idx_pp_project','idx_pp_user','idx_pp_group',
                     'idx_repo_partner_repo','idx_repo_partner_user','idx_repo_partner_dept','idx_user_dept','idx_dept_parent')
GROUP BY table_name, index_name
ORDER BY kind, table_name, name;
