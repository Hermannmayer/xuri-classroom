-- 题目章节/难度：组卷筛选与难度配比的前提
ALTER TABLE t_template
  ADD COLUMN chapter varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '章节' AFTER tag,
  ADD COLUMN difficulty varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '难度（易/中/难）' AFTER chapter,
  ADD KEY idx_template_chapter (repo_id, chapter),
  ADD KEY idx_template_difficulty (repo_id, difficulty);
