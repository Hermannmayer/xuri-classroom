-- ======
-- 班级老师授权级别：t_class_partner.access_level（2026-11，幂等）
--
-- 背景：原来「分配老师」只有一档——被授权的老师能看这个班（含下级班），写学员时却和
-- 班主任一样放行，等于「只读授权」并不存在。这里把授权拆成两档：
--   access_level = 1  只读：能看班级树 / 成员名单，不能增删改学员、不能批量导入
--   access_level = 2  可管理：能增删改本班与下级班的学员、批量导入
--
-- 存量数据：新列默认值 1，老授权一律按「只读」解释，行为不放宽；要放开某个老师，
-- 由管理员在「分配老师」里把级别改成「可管理」。
--
-- 用法：
--   docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < 29-class-partner-access-level.sql
-- ======
SET NAMES utf8mb4;

-- 1. 加列（MySQL 8 不支持 ADD COLUMN IF NOT EXISTS，先查 information_schema）
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_class_partner'
    AND COLUMN_NAME = 'access_level'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_class_partner ADD COLUMN access_level tinyint NOT NULL DEFAULT 1 COMMENT ''1=只读 2=可管理'' AFTER user_id',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 兜底：把非法值（含空）夹回 1，重复执行无副作用
UPDATE t_class_partner
SET access_level = 1
WHERE access_level IS NULL OR access_level NOT IN (1, 2);

-- 3. 自检：期望只出现 1 / 2 两行
SELECT access_level, COUNT(*) AS cnt FROM t_class_partner GROUP BY access_level ORDER BY access_level;
