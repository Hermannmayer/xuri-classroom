-- 审计日志清理：按 create_at 范围删除（2.2.6，幂等） 现有索引是 (action, create_at) / (create_by) / (target_id, create_at)，前导列都不是 create_at， 单独按时间删会用不上索引，只能全表扫。
SET NAMES utf8mb4;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_audit_log' AND INDEX_NAME = 'idx_audit_create_at'
);
SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE t_audit_log ADD KEY idx_audit_create_at (create_at)',
  'SELECT ''idx_audit_create_at already exists'' AS skipped_idx_audit_create_at');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
