-- 班级老师授权级别：t_class_partner.access_level（2026-11，幂等）
SET NAMES utf8mb4;


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


UPDATE t_class_partner
SET access_level = 1
WHERE access_level IS NULL OR access_level NOT IN (1, 2);


SELECT access_level, COUNT(*) AS cnt FROM t_class_partner GROUP BY access_level ORDER BY access_level;
