-- 组卷批次与套次：一次从题库组建 N 份独立卷子
CREATE TABLE IF NOT EXISTS t_paper_batch (
  id varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  name varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  rules_json longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  seed bigint DEFAULT NULL,
  sets int DEFAULT NULL,
  create_by varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  create_at datetime DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_batch_creator (create_by, create_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='组卷批次';

CREATE TABLE IF NOT EXISTS t_paper_variant (
  id varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  batch_id varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  seq int NOT NULL,
  survey_json longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  stats_json varchar(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  project_id varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  create_at datetime DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_variant_batch (batch_id, seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='组卷套次';
