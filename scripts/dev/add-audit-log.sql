-- 操作审计日志（可重复执行）
CREATE TABLE IF NOT EXISTS `t_audit_log` (
  `id` varchar(64) NOT NULL COMMENT 'ID',
  `action` varchar(64) NOT NULL COMMENT '动作：EXPORT_REPO/EXPORT_ANSWER/IMPORT_REPO',
  `target_id` varchar(64) DEFAULT NULL COMMENT '目标 id（题库/项目）',
  `target_name` varchar(256) DEFAULT NULL COMMENT '目标名称',
  `detail` varchar(512) DEFAULT NULL COMMENT '附加说明',
  `ip` varchar(64) DEFAULT NULL COMMENT '操作人 IP',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` varchar(256) DEFAULT NULL,
  `update_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `update_by` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_action_time` (`action`, `create_at`),
  KEY `idx_audit_create_by` (`create_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='操作审计日志';
