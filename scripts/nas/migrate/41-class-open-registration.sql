-- ======
-- 班级开放注册：t_dept.allow_register（2026-11，幂等）
--
-- 背景：学员自助注册不再回退到组织树根（dept_type=org），也不能由全局默认班硬指定。
-- 改为每个班级自己决定是否接收注册：班级设置里打开「开放注册」后，注册页才会出现这个班，
-- 学员注册时自己选班，注册后进入该班并保持「待审核」。
--
--   allow_register = 1  注册页可选
--   allow_register = 0  不接收自助注册（仍可由班主任在班级管理里手工建学员）
--
-- 只对 dept_type=class 有意义；org 节点即使被写成 1，注册接口/注册页也会忽略。
--
-- 用法：
--   docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < 41-class-open-registration.sql
-- ======
SET NAMES utf8mb4;

-- 1. 加列（MySQL 8 不支持 ADD COLUMN IF NOT EXISTS，先查 information_schema.COLUMNS）
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_dept'
    AND COLUMN_NAME = 'allow_register'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_dept ADD COLUMN allow_register tinyint(1) NOT NULL DEFAULT 0 COMMENT ''1=开放学员自助注册（只对班级有效）'' AFTER dept_type',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 兜底：用户组不允许开放注册；空值归 0
UPDATE t_dept SET allow_register = 0 WHERE dept_type <> 'class' OR allow_register IS NULL;
UPDATE t_dept SET allow_register = 0 WHERE dept_type IS NULL OR dept_type NOT IN ('org', 'class');

-- 3. 自检
SELECT dept_type, allow_register, COUNT(*) AS cnt
FROM t_dept
WHERE is_deleted = 0
GROUP BY dept_type, allow_register
ORDER BY dept_type, allow_register;

SELECT id, parent_id, name, dept_type, allow_register
FROM t_dept
WHERE is_deleted = 0
ORDER BY dept_type, parent_id, sort_code;
