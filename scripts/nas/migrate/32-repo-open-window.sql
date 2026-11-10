-- ======
-- 题库全局开放期：t_repo.open_start_at / open_end_at（2026-11，幂等）
--
-- 背景：题库按班级分配（P2）后，班级窗口需要一个全局上限，否则老师可以给某个班把题库开到
-- 任意时间。这里给题库加一对全局开放期：
--   open_start_at  全局开放期开始；留空=不限
--   open_end_at    全局开放期结束；留空=不限
-- 班级窗口（t_class_resource.start_at/end_at）非空时必须落在 [open_start_at, open_end_at] 内；
-- 班级窗口为空表示继承全局。
--
-- 用法：
--   docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < 32-repo-open-window.sql
-- ======
SET NAMES utf8mb4;

-- 1. open_start_at（先查 information_schema.COLUMNS）
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_repo'
    AND COLUMN_NAME = 'open_start_at'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_repo ADD COLUMN open_start_at datetime DEFAULT NULL COMMENT ''全局开放期开始，留空=不限'' AFTER setting',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. open_end_at（同样逐列判断，避免重复执行报 Duplicate column）
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_repo'
    AND COLUMN_NAME = 'open_end_at'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_repo ADD COLUMN open_end_at datetime DEFAULT NULL COMMENT ''全局开放期结束，留空=不限'' AFTER open_start_at',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 自检：两列都应存在（各返回 1）
SELECT COUNT(*) AS open_start_at_column FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo' AND COLUMN_NAME = 'open_start_at';
SELECT COUNT(*) AS open_end_at_column FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_repo' AND COLUMN_NAME = 'open_end_at';
