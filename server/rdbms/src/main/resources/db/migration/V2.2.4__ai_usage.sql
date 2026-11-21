-- AI 用量记账（2.2.4，幂等） 目的：AI 调用能查、能对账、能按场景看成本。
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `t_ai_usage` (
  `id`                varchar(64)  NOT NULL COMMENT 'ID',
  `user_id`           varchar(64)  NOT NULL COMMENT '调用人（t_user.id）',
  `scene`             varchar(32)  NOT NULL COMMENT '场景：paper_generate / question_rewrite / grade_suggest / report_summary',
  `model`             varchar(120) DEFAULT NULL COMMENT '模型 id',
  `prompt_tokens`     int          NOT NULL DEFAULT 0 COMMENT '输入 token',
  `completion_tokens` int          NOT NULL DEFAULT 0 COMMENT '输出 token',
  `total_tokens`      int          NOT NULL DEFAULT 0 COMMENT '合计 token（缺省按前后者相加）',
  `cost_ms`           bigint       NOT NULL DEFAULT 0 COMMENT '耗时（毫秒）',
  `status`            varchar(16)  NOT NULL DEFAULT 'ok' COMMENT 'ok / error / rejected（被限额或内容校验拦下）',
  `error`             varchar(500) DEFAULT NULL COMMENT '失败原因摘要',
  `create_at`         timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_usage_user_day` (`user_id`, `create_at`),
  KEY `idx_ai_usage_scene` (`scene`, `create_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 用量记账';


UPDATE `t_role` SET `authority` = CONCAT(`authority`, ',ai:use')
 WHERE `code` IN ('admin', 'teacher') AND `authority` IS NOT NULL AND `authority` <> '' AND `authority` NOT LIKE '%ai:use%';
