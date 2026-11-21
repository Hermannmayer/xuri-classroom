-- 班级专属考试链接（2.1.2，幂等） t_class_resource.share_token：每个班级 × 考试分配一行； 公开链接 /s/{projectId}?classToken=... 由后端反查 class_id，把匿名答卷归到该班。
SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_class_resource' AND COLUMN_NAME = 'share_token'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_class_resource ADD COLUMN share_token varchar(64) DEFAULT NULL COMMENT ''班级专属考试链接 token；空=未生成'' AFTER resource_id',
  'SELECT ''share_token already exists'' AS skipped_share_token');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_class_resource' AND INDEX_NAME = 'uk_class_resource_share'
);
SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE t_class_resource ADD UNIQUE KEY uk_class_resource_share (share_token)',
  'SELECT ''uk_class_resource_share already exists'' AS skipped_share_index');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
