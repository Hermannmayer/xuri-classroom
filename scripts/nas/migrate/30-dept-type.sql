-- ======
-- 用户组 / 班级拆分：t_dept.dept_type（2026-11，幂等）
--
-- 背景：t_dept 一棵树同时装「用户组（教职工的组织与角色）」和「班级（学员的教学单位）」，
-- 线上老师组「养老护理员」因此出现在班级管理里（班级成员只查 student，点进去 0 人）。
-- 这里用 dept_type 把两类节点分开：
--   org   用户组：教职工的组织单位，可绑定角色，可放 staff
--   class 班级：学员的教学单位，不绑角色，只放 student
--
-- 回填口径：有 student 成员的组 → class；其余（含线上「养老护理员」，它只有 staff 成员）→ org。
--   * 回填只在「本次真正加了列」的第一次执行时做：重复执行不会把之后人工调整过的类型盖掉；
--   * 根节点（parent_id='0'）永远是用户组：自注册学员的默认组是组织树根，不能因此把根判成班级。
--   * 需要强制重跑回填时：临时把下面的 @first_run 改成 1 再执行（或直接手工 UPDATE）。
--
-- 用法：
--   docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < 30-dept-type.sql
-- ======
SET NAMES utf8mb4;

-- 1. 加列（MySQL 8 不支持 ADD COLUMN IF NOT EXISTS，先查 information_schema.COLUMNS）
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_dept'
    AND COLUMN_NAME = 'dept_type'
);
-- 只有「这次刚刚加列」才做下面的回填（幂等：重复执行不覆盖人工调整）
SET @first_run := IF(@col_exists = 0, 1, 0);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_dept ADD COLUMN dept_type varchar(16) NOT NULL DEFAULT ''org'' COMMENT ''org=用户组(教职工) class=班级(学员)'' AFTER parent_id',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 索引（同样先查 information_schema.STATISTICS，避免重复执行报 Duplicate key name）
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_dept'
    AND INDEX_NAME = 'idx_dept_type'
);
SET @ddl_idx := IF(@idx_exists = 0,
  'ALTER TABLE t_dept ADD KEY idx_dept_type (dept_type)',
  'SELECT 1');
PREPARE stmt_idx FROM @ddl_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- 3. 回填：有学员成员的组就是班级（仅首次执行）
UPDATE t_dept SET dept_type = 'class'
WHERE @first_run = 1
  AND id IN (SELECT DISTINCT dept_id FROM t_user WHERE user_type = 'student' AND is_deleted = 0 AND dept_id IS NOT NULL);

-- 3b. 根节点保护（仅首次执行）：parent_id='0' 是组织树/班级树的根，自注册学员的默认组就是它
UPDATE t_dept SET dept_type = 'org'
WHERE @first_run = 1 AND dept_type = 'class' AND (parent_id = '0' OR parent_id IS NULL);

-- 4. 其余 NULL / 非法值归 org（只修脏值，不会覆盖合法的 org/class，重复执行无副作用）
UPDATE t_dept SET dept_type = 'org' WHERE dept_type IS NULL OR dept_type NOT IN ('org', 'class');

-- 5. 自检：正常应只有 org / class 两类
SELECT dept_type, COUNT(*) AS cnt FROM t_dept WHERE is_deleted = 0 GROUP BY dept_type ORDER BY dept_type;

-- 6. 人工确认用：迁移后「一个学员都没有」的班级会被归成 org（班级页看不到），
--    确认后可以按名称/上级把它们改回 class，例如：
--    UPDATE t_dept SET dept_type = 'class' WHERE is_deleted = 0 AND name IN ('2024级护理1班');
SELECT id, parent_id, name, dept_type FROM t_dept WHERE is_deleted = 0 ORDER BY dept_type, parent_id, sort_code;
