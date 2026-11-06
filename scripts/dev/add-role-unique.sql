-- 给 t_user_role 加唯一键 (user_id, role_id)（可重复执行）
--
-- 背景：这张表原本只有普通索引，`updateUser` 是「先删后插」，并发/重复提交时可能插出重复行。
-- 重复行不会放大权限（取并集），但会让「谁有这个角色」的统计失真。
--
-- 步骤：① 先打印重复行；② 同一 (user_id, role_id) 只保留 id 最小的一条；③ 幂等加唯一键。
-- 用法：mysql -uroot -p surveyking < scripts/dev/add-role-unique.sql

-- ① 有重复会打印出来（无重复时返回空结果集）
SELECT user_id, role_id, COUNT(*) AS duplicate_count, MIN(id) AS keep_id
FROM t_user_role
GROUP BY user_id, role_id
HAVING COUNT(*) > 1;

-- ② 去重：保留 id 最小的那条
DELETE t1 FROM t_user_role t1
JOIN t_user_role t2
  ON t1.user_id = t2.user_id
 AND t1.role_id = t2.role_id
 AND t1.id > t2.id;

-- ③ 幂等加唯一键（MySQL 不支持 ADD CONSTRAINT IF NOT EXISTS，先查 information_schema）
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

-- 自检：应能看到 uk_user_role，且 Non_unique=0
SHOW INDEX FROM t_user_role WHERE Key_name = 'uk_user_role';
