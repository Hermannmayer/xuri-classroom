-- ======
-- 2.0.0 → 2.1.0：题目章节 / 难度（组卷筛选与难度配比的前提）
--
-- 为什么写成这样：应用每次启动都会探测结构，缺什么补什么；本脚本可能在
-- "别人已经手工加过列"的库上重复执行（手工跑过、上次迁移执行到一半失败重试），
-- 所以每个 DDL 都先查 information_schema，已存在就跳过。
--
-- 对应历史脚本：scripts/nas/migrate/37-template-chapter-difficulty.sql
-- （那份是一次性运维记录，本文件是它的幂等版，供所有部署形态自动执行）
-- ======
SET NAMES utf8mb4;

-- 1. chapter
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_template' AND COLUMN_NAME = 'chapter');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_template ADD COLUMN chapter varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT ''章节'' AFTER tag',
  'SELECT ''chapter already exists'' AS skipped_chapter');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. difficulty
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_template' AND COLUMN_NAME = 'difficulty');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_template ADD COLUMN difficulty varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT ''难度（易/中/难）'' AFTER chapter',
  'SELECT ''difficulty already exists'' AS skipped_difficulty');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. idx_template_chapter
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_template' AND INDEX_NAME = 'idx_template_chapter');
SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE t_template ADD KEY idx_template_chapter (repo_id, chapter)',
  'SELECT ''idx_template_chapter already exists'' AS skipped_idx_chapter');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. idx_template_difficulty
SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_template' AND INDEX_NAME = 'idx_template_difficulty');
SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE t_template ADD KEY idx_template_difficulty (repo_id, difficulty)',
  'SELECT ''idx_template_difficulty already exists'' AS skipped_idx_difficulty');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
