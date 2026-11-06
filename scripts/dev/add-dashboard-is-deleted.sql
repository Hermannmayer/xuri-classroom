-- 补齐 t_dashboard 的逻辑删除列（可重复执行）
--
-- 背景：Dashboard 实体继承 BaseModel，@TableLogic 会让 MyBatis-Plus 在每次查询/删除时
-- 自动拼上 is_deleted = 0，但表里一直没有这一列 → GET /api/dashboard/list 稳定 500
-- （Unknown column 't.is_deleted'）。本脚本补列，新库由 init 脚本负责。
SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dashboard' AND COLUMN_NAME = 'is_deleted');
SET @sql := IF(@exists = 0,
  'ALTER TABLE `t_dashboard` ADD COLUMN `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT ''逻辑删除''',
  'SELECT ''t_dashboard.is_deleted 已存在，跳过'' AS msg');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dashboard'
ORDER BY ORDINAL_POSITION;
