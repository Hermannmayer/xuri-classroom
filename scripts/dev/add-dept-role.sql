-- 用户组 → 角色 绑定表（可重复执行）
-- 权限点只挂角色；组通过该表把角色授予组内成员（见 docs/permissions-ia.md）
CREATE TABLE IF NOT EXISTS `t_dept_role` (
  `id` varchar(64) NOT NULL COMMENT 'ID',
  `dept_id` varchar(64) NOT NULL COMMENT '用户组ID',
  `role_id` varchar(64) NOT NULL COMMENT '角色ID',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除',
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` varchar(256) DEFAULT NULL,
  `update_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dept_role` (`dept_id`,`role_id`),
  KEY `idx_dept` (`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='用户组-角色绑定';
