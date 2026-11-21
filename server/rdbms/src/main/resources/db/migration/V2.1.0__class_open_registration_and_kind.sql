-- ======
-- 班级节点语义 + 开放注册（2.1.0，幂等）
--
-- 背景：
--   1) 班级树里“容器班”只做层级，“教学班”才收学员/开放注册/分资源；
--   2) 学员注册按班级级开关走，不再回退到组织树根。
--
-- 本脚本同时补两列：
--   class_kind      group=容器班 / teaching=教学班（历史数据默认 group）
--   allow_register  1=开放学员自助注册（只对 teaching 班有效）
--
-- 回填口径：有子班的 class 节点 = group；没有子班的 class 节点 = teaching。
-- 只对 dept_type='class' 生效；org 节点不参与。
-- ======
SET NAMES utf8mb4;


SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dept' AND COLUMN_NAME = 'class_kind'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_dept ADD COLUMN class_kind varchar(16) NOT NULL DEFAULT ''group'' COMMENT ''group=容器班 teaching=教学班'' AFTER dept_type',
  'SELECT ''class_kind already exists'' AS skipped_class_kind');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dept' AND COLUMN_NAME = 'allow_register'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_dept ADD COLUMN allow_register tinyint(1) NOT NULL DEFAULT 0 COMMENT ''1=开放学员自助注册（只对 teaching 班有效）'' AFTER class_kind',
  'SELECT ''allow_register already exists'' AS skipped_allow_register');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_dept' AND INDEX_NAME = 'idx_dept_class_kind'
);
SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE t_dept ADD KEY idx_dept_class_kind (class_kind)',
  'SELECT ''idx_dept_class_kind already exists'' AS skipped_idx_class_kind');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


UPDATE t_dept SET class_kind = 'group' WHERE dept_type = 'class';
UPDATE t_dept d SET d.class_kind = 'teaching'
WHERE d.dept_type = 'class' AND d.is_deleted = 0
  AND NOT EXISTS (
    SELECT 1 FROM (
      SELECT parent_id FROM t_dept WHERE dept_type = 'class' AND is_deleted = 0
    ) c WHERE c.parent_id = d.id
  );


UPDATE t_dept SET allow_register = 0
WHERE dept_type <> 'class' OR class_kind <> 'teaching' OR allow_register IS NULL;


SELECT dept_type, class_kind, allow_register, COUNT(*) AS cnt
FROM t_dept WHERE is_deleted = 0
GROUP BY dept_type, class_kind, allow_register
ORDER BY dept_type, class_kind, allow_register;
