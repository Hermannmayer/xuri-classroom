-- ======
-- 权限 v6：老师班级管理 + 题库练习入口拆分（2026-11-08，幂等）
--
-- 本次调整：
--   1. 老师不再进「系统管理」：移除 system:user:create/update/list、system:user:create:student、
--      system:dept:list/create/update/delete；老师改由「班级管理」页查看/添加本班学员。
--   2. 新增班级管理权限：class:list / class:detail / class:member:create；
--      class:grant 留给管理员或教务角色（谁需要分配班级给老师，谁才勾）。
--   3. 拆出只读组织树 org:list 与只读用户候选 user:select：
--      老师仍能在题库/考试授权弹窗里选组、选人，但看不到用户组/用户管理菜单。
--   4. 练习入口从 repo:book/exercise:list 拆成 repo:practice：
--      老师不再出现「开始练习/随机练习/继续练习」，学员保留。
--   5. 新建 t_class_partner：班级（用户组）授权给老师；授权一个班默认含其下级班。
--
-- 用法：
--   docker exec -i xuri-live-db mysql -uroot -p"$DB_PASSWORD" surveyking < 17-teacher-class-management.sql
-- ======
SET NAMES utf8mb4;

-- 1. 班级授权表
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

-- 2. 老师：移除系统管理串与练习入口，追加班级管理/只读授权依赖
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

-- 3. 学员：练习入口改用 repo:practice（repo:book 继续只管错题本/练习册）
UPDATE t_role
SET authority = CONCAT(authority, ',repo:practice'),
    update_at = NOW()
WHERE code IN ('student', 'xueyuan') AND is_deleted = 0
  AND authority NOT LIKE '%repo:practice%';

-- 4. 管理员：补进权限串便于导出/审计（代码层本来就会自动注入全部目录权限）
UPDATE t_role
SET authority = CONCAT(authority, ',repo:practice,class:list,class:detail,class:grant,class:member:create,org:list,user:select'),
    update_at = NOW()
WHERE code = 'admin' AND is_deleted = 0
  AND authority NOT LIKE '%class:list%';

-- 自检
SELECT code, name,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count,
       (authority LIKE '%class:list%')  AS can_class_list,
       (authority LIKE '%class:grant%') AS can_class_grant,
       (authority LIKE '%repo:practice%') AS can_practice,
       (authority LIKE '%system:dept:%') AS still_system_dept
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
