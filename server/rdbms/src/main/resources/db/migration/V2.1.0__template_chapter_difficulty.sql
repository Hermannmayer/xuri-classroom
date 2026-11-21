-- 2.0.0 → 2.1.0：题目章节 / 难度（组卷筛选与难度配比的前提）
SET NAMES utf8mb4;


SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_template' AND COLUMN_NAME = 'chapter');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_template ADD COLUMN chapter varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT ''章节'' AFTER tag',
  'SELECT ''chapter already exists'' AS skipped_chapter');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_template' AND COLUMN_NAME = 'difficulty');
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_template ADD COLUMN difficulty varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT ''难度（易/中/难）'' AFTER chapter',
  'SELECT ''difficulty already exists'' AS skipped_difficulty');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_template' AND INDEX_NAME = 'idx_template_chapter');
SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE t_template ADD KEY idx_template_chapter (repo_id, chapter)',
  'SELECT ''idx_template_chapter already exists'' AS skipped_idx_chapter');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @idx_exists := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_template' AND INDEX_NAME = 'idx_template_difficulty');
SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE t_template ADD KEY idx_template_difficulty (repo_id, difficulty)',
  'SELECT ''idx_template_difficulty already exists'' AS skipped_idx_difficulty');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
