-- 通知公告（2.2.2，幂等） 一张表 + 两个维度（audience / scope）：管理员公告与老师班级公告共用同一张表， 列表、已读、过期清理逻辑完全一样；权限与可见性判定分开（见 NoticeService）。
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `t_notice` (
  `id`            varchar(64)  NOT NULL COMMENT 'ID',
  `title`         varchar(200) NOT NULL COMMENT '标题',
  `content`       longtext     NOT NULL COMMENT '正文富文本，入库前服务端白名单消毒',
  `type`          varchar(32)  NOT NULL DEFAULT 'notice' COMMENT 'notice / system_update / ai_result',
  `audience`      varchar(16)  NOT NULL DEFAULT 'all' COMMENT 'all / admin / teacher / student',
  `scope_type`    varchar(16)  DEFAULT NULL COMMENT 'NULL=全站 / class=某个班 / project=某场考试',
  `scope_id`      varchar(64)  DEFAULT NULL COMMENT 'scope_type 对应的 id',
  `pinned`        tinyint(1)   NOT NULL DEFAULT 0 COMMENT '是否置顶',
  `require_ack`   tinyint(1)   NOT NULL DEFAULT 0 COMMENT '是否要求已读回执',
  `status`        varchar(16)  NOT NULL DEFAULT 'draft' COMMENT 'draft / published / archived',
  `publish_at`    datetime     DEFAULT NULL COMMENT '发布时间',
  `expire_at`     datetime     DEFAULT NULL COMMENT '过期时间',
  `create_by`     varchar(256) DEFAULT NULL,
  `create_at`     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_at`     datetime     DEFAULT NULL,
  `is_deleted`    tinyint(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_notice_audience` (`audience`, `status`, `publish_at`),
  KEY `idx_notice_scope` (`scope_type`, `scope_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知公告';

CREATE TABLE IF NOT EXISTS `t_notice_read` (
  `id`         varchar(64) NOT NULL COMMENT 'ID',
  `notice_id`  varchar(64) NOT NULL COMMENT '公告 id',
  `user_id`    varchar(64) NOT NULL COMMENT '已读用户 id',
  `read_at`    datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '已读时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_notice_read` (`notice_id`, `user_id`),
  KEY `idx_notice_read_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告已读记录';


UPDATE `t_role` SET `authority` = CONCAT(`authority`, ',notice:list,notice:manage:system,notice:manage:class')
 WHERE `code` = 'admin' AND `authority` IS NOT NULL AND `authority` <> '' AND `authority` NOT LIKE '%notice:list%';

UPDATE `t_role` SET `authority` = CONCAT(`authority`, ',notice:list,notice:manage:class')
 WHERE `code` = 'teacher' AND `authority` IS NOT NULL AND `authority` <> '' AND `authority` NOT LIKE '%notice:list%';

UPDATE `t_role` SET `authority` = CONCAT(`authority`, ',notice:list')
 WHERE `code` = 'student' AND `authority` IS NOT NULL AND `authority` <> '' AND `authority` NOT LIKE '%notice:list%';
