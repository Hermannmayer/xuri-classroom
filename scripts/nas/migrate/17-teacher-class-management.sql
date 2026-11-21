-- 权限 v6：老师班级管理 + 题库练习入口拆分（2026-11-08，幂等）
SET NAMES utf8mb4;


CREATE TABLE IF NOT EXISTS `t_class_partner` (
  `id` varchar(64) NOT NULL COMMENT 'ID',
  `dept_id` varchar(64) NOT NULL COMMENT '班级（t_dept.id）',
  `user_id` varchar(64) NOT NULL COMMENT '被授权的老师（t_user.id）',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除',
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` varchar(256) DEFAULT NULL,
  `update_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `update_by` varchar(256) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_class_partner` (`dept_id`,`user_id`),
  KEY `idx_class_partner_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级授权给老师';


UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      CONCAT(',', authority, ','),
      ',system:user:create:student,', ','),
      ',system:user:create,', ','),
      ',system:user:update,', ','),
      ',system:user:list,', ','),
      ',system:dept:list,', ','),
      ',system:dept:create,', ','),
      ',system:dept:update,', ','),
      ',system:dept:delete,', ','),
      ',exercise:list,', ','),
      ',repo:book,', ',')),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0;

UPDATE t_role
SET authority = CONCAT(authority, ',class:list,class:detail,class:member:create,org:list,user:select'),
    update_at = NOW()
WHERE code = 'teacher' AND is_deleted = 0
  AND authority NOT LIKE '%class:list%';


UPDATE t_role
SET authority = CONCAT(authority, ',repo:practice'),
    update_at = NOW()
WHERE code IN ('student', 'xueyuan') AND is_deleted = 0
  AND authority NOT LIKE '%repo:practice%';


UPDATE t_role
SET authority = CONCAT(authority, ',repo:practice,class:list,class:detail,class:grant,class:member:create,org:list,user:select'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0
  AND authority NOT LIKE '%class:list%';


SELECT code, name,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count,
       (authority LIKE '%class:list%')  AS can_class_list,
       (authority LIKE '%class:grant%') AS can_class_grant,
       (authority LIKE '%repo:practice%') AS can_practice,
       (authority LIKE '%system:dept:%') AS still_system_dept
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
