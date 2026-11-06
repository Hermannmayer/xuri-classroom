-- 用户「附加组」表（可重复执行）
-- 主组仍存在 t_user.dept_id（大量数据可见性 SQL 依赖它），本表只存附加组；
-- 用户最终所属组 = 主组 ∪ 附加组，权限解析与组有效期校验会对两边各沿祖先链取并集。
CREATE TABLE IF NOT EXISTS `t_user_dept` (
  `id` varchar(64) NOT NULL COMMENT 'ID',
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `dept_id` varchar(64) NOT NULL COMMENT '用户组ID（附加组）',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除',
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` varchar(256) DEFAULT NULL,
  `update_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_dept` (`user_id`,`dept_id`),
  KEY `idx_user_dept_user` (`user_id`),
  KEY `idx_user_dept_dept` (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='用户-用户组（附加组）';
