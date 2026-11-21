-- 班级资源分配（P1：考试/问卷按班级开放窗口）（2026-11，幂等）
SET NAMES utf8mb4;


CREATE TABLE IF NOT EXISTS `t_class_resource` (
  `id` varchar(64) NOT NULL COMMENT 'ID',
  `class_id` varchar(64) NOT NULL COMMENT '班级（t_dept.id，dept_type=class）',
  `resource_type` varchar(16) NOT NULL COMMENT 'project=考试/问卷；repo=题库(P2)；course=课程(预留)',
  `resource_id` varchar(64) NOT NULL COMMENT '资源 id（project: t_project.id）',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '0=关闭 1=开放（班级级手动开关）',
  `start_at` datetime DEFAULT NULL COMMENT '本班开始时间；空=继承全局',
  `end_at` datetime DEFAULT NULL COMMENT '本班结束时间；空=继承全局',
  `assigned_by` varchar(64) DEFAULT NULL COMMENT '分配人',
  `settings` text COMMENT '预留',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除',
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` varchar(256) DEFAULT NULL,
  `update_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_class_resource` (`class_id`,`resource_type`,`resource_id`),
  KEY `idx_cr_resource` (`resource_type`,`resource_id`),
  KEY `idx_cr_class` (`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级资源分配（按班级的考试窗口）';


SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_answer'
    AND COLUMN_NAME = 'class_id'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_answer ADD COLUMN class_id varchar(64) DEFAULT NULL COMMENT ''答题时所在班级''',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 't_answer'
    AND INDEX_NAME = 'idx_answer_class'
);
SET @ddl_idx := IF(@idx_exists = 0,
  'ALTER TABLE t_answer ADD KEY idx_answer_class (class_id)',
  'SELECT 1');
PREPARE stmt_idx FROM @ddl_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;


SELECT COUNT(*) AS class_resource_rows FROM t_class_resource;
SELECT COUNT(*) AS answer_class_id_column FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer' AND COLUMN_NAME = 'class_id';
SELECT COUNT(*) AS answer_class_index FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer' AND INDEX_NAME = 'idx_answer_class';
