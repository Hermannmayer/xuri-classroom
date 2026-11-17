-- 答题人姓名 + 主观题人工批改（2.2.1，幂等）
-- 1) t_answer.answerer_name：交卷时快照答题人姓名（选填），成绩单/PDF 抬头用。
-- 2) t_answer.grade_status / graded_by / graded_at：批改状态机，none=无需批改（卷里没有 manual 题）,
--    pending=待批改, graded=已批改；学生重新提交后回到 pending 并清空 t_answer_grade。
-- 3) t_answer_grade：逐题人工分与评语。单独开表而不是塞 exam_info JSON，
--    是为了避免并发批改互相覆盖，也便于按 project_id 统计批改进度。
SET NAMES utf8mb4;

-- ---------- 1. t_answer.answerer_name ----------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer' AND COLUMN_NAME = 'answerer_name'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_answer ADD COLUMN answerer_name varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT ''答题人姓名（交卷时快照，选填；成绩单与 PDF 抬头用）''',
  'SELECT ''answerer_name already exists'' AS skipped_answerer_name');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------- 2. t_answer.grade_status ----------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer' AND COLUMN_NAME = 'grade_status'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_answer ADD COLUMN grade_status varchar(16) NOT NULL DEFAULT ''none'' COMMENT ''批改状态：none 无需批改 / pending 待批改 / graded 已批改'' AFTER answerer_name',
  'SELECT ''grade_status already exists'' AS skipped_grade_status');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------- 3. t_answer.graded_by ----------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer' AND COLUMN_NAME = 'graded_by'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_answer ADD COLUMN graded_by varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT ''最近一次批改人（t_user.id）'' AFTER grade_status',
  'SELECT ''graded_by already exists'' AS skipped_graded_by');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------- 4. t_answer.graded_at ----------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer' AND COLUMN_NAME = 'graded_at'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE t_answer ADD COLUMN graded_at datetime DEFAULT NULL COMMENT ''最近一次批改时间'' AFTER graded_by',
  'SELECT ''graded_at already exists'' AS skipped_graded_at');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------- 5. 待批改列表索引 ----------
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_answer' AND INDEX_NAME = 'idx_answer_project_grade'
);
SET @ddl := IF(@idx_exists = 0,
  'ALTER TABLE t_answer ADD KEY idx_answer_project_grade (project_id, grade_status)',
  'SELECT ''idx_answer_project_grade already exists'' AS skipped_grade_index');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------- 6. 批改明细表 ----------
CREATE TABLE IF NOT EXISTS `t_answer_grade` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `answer_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 't_answer.id',
  `project_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '冗余项目 id，便于按项目统计批改进度',
  `question_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '题目 id（只允许 examAnswerMode=manual 的题）',
  `score` double NOT NULL DEFAULT '0' COMMENT '人工给定分数',
  `comment` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '批改评语',
  `grader` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '批改人（t_user.id）',
  `create_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '首次批改时间',
  `update_at` datetime DEFAULT NULL COMMENT '最近一次改分时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_answer_grade_answer_question` (`answer_id`,`question_id`),
  KEY `idx_answer_grade_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='主观题人工批改明细';
-- ---------- 7. 角色权限：给 admin / teacher 补 answer:grade ----------
-- 只追加一次（NOT LIKE 保证幂等）；学员没有 answer:export，不会被误加。
-- 自定义角色需要管理员在「权限」页自行勾选「批改答卷」。
UPDATE t_role
SET authority = CONCAT(authority, ',answer:grade')
WHERE code IN ('admin', 'teacher')
  AND authority IS NOT NULL
  AND authority <> ''
  AND authority NOT LIKE '%answer:grade%';
