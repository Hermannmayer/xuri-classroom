-- 权限 v7：教职工 / 学员账号彻底分开（2026-11-08，幂等）
SET NAMES utf8mb4;


SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_user' AND COLUMN_NAME = 'user_type'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_user ADD COLUMN user_type varchar(16) NOT NULL DEFAULT ''student'' COMMENT ''用户类型 staff/student'' AFTER status',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


UPDATE t_user u
SET u.user_type = 'staff'
WHERE u.is_deleted = 0
  AND (
    EXISTS (
      SELECT 1 FROM t_user_role ur JOIN t_role r ON r.id = ur.role_id
      WHERE ur.user_id = u.id AND r.is_deleted = 0
        AND (r.code IN ('admin', 'teacher')
          OR r.authority LIKE '%portal:teacher%'
          OR r.authority LIKE '%portal:admin%'
          OR r.authority LIKE '%system:%')
    )
    OR EXISTS (
      SELECT 1 FROM t_dept_role dr JOIN t_role r ON r.id = dr.role_id
      WHERE r.is_deleted = 0
        AND (dr.dept_id = u.dept_id
          OR dr.dept_id IN (SELECT ud.dept_id FROM t_user_dept ud WHERE ud.user_id = u.id AND ud.is_deleted = 0))
        AND (r.code IN ('admin', 'teacher')
          OR r.authority LIKE '%portal:teacher%'
          OR r.authority LIKE '%portal:admin%'
          OR r.authority LIKE '%system:%')
    )
  );

UPDATE t_user SET user_type = 'student' WHERE user_type IS NULL OR user_type = '';


SELECT user_type, COUNT(*) AS cnt FROM t_user WHERE is_deleted = 0 GROUP BY user_type;
SELECT u.id, u.name, u.user_type, r.code AS role_code
FROM t_user u
LEFT JOIN t_user_role ur ON ur.user_id = u.id
LEFT JOIN t_role r ON r.id = ur.role_id
WHERE u.is_deleted = 0
ORDER BY u.user_type, u.name;
