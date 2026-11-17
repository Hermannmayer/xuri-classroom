-- MCP / API 访问令牌与写操作幂等（2.2.5，幂等）
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `t_api_token` (
  `id`           varchar(64)  NOT NULL COMMENT 'ID',
  `user_id`      varchar(64)  NOT NULL COMMENT '按哪个用户签发；MCP 调用的权限就是它的权限',
  `name`         varchar(100) NOT NULL COMMENT '给用户辨认用：如 Claude / 我的脚本',
  `token_hash`   varchar(128) NOT NULL COMMENT 'SHA-256，明文只返回一次',
  `scopes`       varchar(500) DEFAULT NULL COMMENT '逗号分隔的工具白名单；空=按用户权限',
  `expires_at`   datetime     DEFAULT NULL,
  `last_used_at` datetime     DEFAULT NULL,
  `revoked`      tinyint(1)   NOT NULL DEFAULT 0,
  `create_at`    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_api_token_hash` (`token_hash`),
  KEY `idx_api_token_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='MCP/API 访问令牌';

CREATE TABLE IF NOT EXISTS `t_api_idempotency` (
  `id`          varchar(64)  NOT NULL COMMENT 'ID',
  `user_id`     varchar(64)  NOT NULL,
  `key_value`   varchar(128) NOT NULL COMMENT '客户端传的幂等键',
  `result_json` longtext     COMMENT '第一次调用的结果，重复调用直接返回',
  `create_at`   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_api_idem` (`user_id`, `key_value`),
  KEY `idx_api_idem_time` (`create_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='MCP 写操作幂等';
