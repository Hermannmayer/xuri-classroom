-- 给 t_user_role 加唯一键 (user_id, role_id)（可重复执行）

-- ① 有重复会打印出来（无重复时返回空结果集）
SELECT user_id, role_id, COUNT(*) AS duplicate_count, MIN(id) AS keep_id
FROM t_user_role
GROUP BY user_id, role_id
HAVING COUNT(*) > 1;


DELETE t1 FROM t_user_role t1
JOIN t_user_role t2
  ON t1.user_id = t2.user_id
 AND t1.role_id = t2.role_id
 AND t1.id > t2.id;


SET @has_uk = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_user_role' AND INDEX_NAME = 'uk_user_role'
);
SET @sql = IF(@has_uk = 0,
  'ALTER TABLE `t_user_role` ADD UNIQUE KEY `uk_user_role` (`user_id`,`role_id`)',
  'SELECT ''uk_user_role already exists'' AS note');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SHOW INDEX FROM t_user_role WHERE Key_name = 'uk_user_role';
