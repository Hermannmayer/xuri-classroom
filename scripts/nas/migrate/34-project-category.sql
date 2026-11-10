-- ======
-- 考试/问卷分类：t_project.category（2026-11，幂等）
--
-- 背景：考试/问卷列表要按「分类」（如 保育员 / 养老护理员 / 育婴员）分组筛选。
-- 分类是自由文本（前端给常用值 + 允许自定义），后端不做枚举校验，只限长度 64；
-- 留空表示未分类，接口用 __UNCATEGORIZED__ 作为「未分类」的查询哨兵。
--
-- 用法：
--   docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < 34-project-category.sql
-- ======
SET NAMES utf8mb4;

-- 1. category（先查 information_schema.COLUMNS，避免重复执行报 Duplicate column）
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_project'
    AND COLUMN_NAME = 'category'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_project ADD COLUMN category varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT ''分类名（如 保育员/养老护理员/育婴员）'' AFTER name',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 自检：列应存在（返回 1）
SELECT COUNT(*) AS category_column FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_project' AND COLUMN_NAME = 'category';
