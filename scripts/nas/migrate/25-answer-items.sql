-- 统计投影表：把 answer JSON 展开成「一题一选项一行」，统计改走 SQL 聚合。
-- 真源仍是 t_answer.answer；这张表可以随时用 AnswerItemBackfill 重建。
-- 幂等：IF NOT EXISTS。
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `t_answer_item` (
  `id` varchar(64) NOT NULL,
  `answer_id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `question_id` varchar(64) NOT NULL,
  `question_type` varchar(32) DEFAULT NULL,
  `option_id` varchar(64) DEFAULT NULL,
  `value_key` varchar(64) DEFAULT NULL,
  `score` double DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_item_answer` (`answer_id`),
  KEY `idx_item_project_question` (`project_id`,`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='答卷明细投影（统计专用）';

SELECT COUNT(*) AS answer_item_table_ready FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name = 't_answer_item';