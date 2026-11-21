-- 审计细化（2.2.3，幂等） 目标：让「把 8 分改成 10 分」这类高危操作事后可追溯。

SET NAMES utf8mb4;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_audit_log' AND COLUMN_NAME = 'before_json'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_audit_log ADD COLUMN before_json text NULL COMMENT ''操作前快照（仅高危动作）'' AFTER detail',
  'SELECT ''before_json already exists'' AS skipped_before_json');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_audit_log' AND COLUMN_NAME = 'after_json'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_audit_log ADD COLUMN after_json text NULL COMMENT ''操作后快照（仅高危动作）'' AFTER before_json',
  'SELECT ''after_json already exists'' AS skipped_after_json');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_audit_log' AND COLUMN_NAME = 'source'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_audit_log ADD COLUMN source varchar(16) DEFAULT ''web'' COMMENT ''来源：web / mcp / api'' AFTER after_json',
  'SELECT ''source already exists'' AS skipped_source');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_audit_log' AND COLUMN_NAME = 'request_id'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_audit_log ADD COLUMN request_id varchar(64) DEFAULT NULL COMMENT ''同一次请求关联 id'' AFTER source',
  'SELECT ''request_id already exists'' AS skipped_request_id');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_audit_log' AND INDEX_NAME = 'idx_audit_target'
);
SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE t_audit_log ADD KEY idx_audit_target (target_id, create_at)',
  'SELECT ''idx_audit_target already exists'' AS skipped_idx_audit_target');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
