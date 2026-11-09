-- S2-4：导出读投影需要保留「答案值本身」（不只是选项 id）
-- 统计只需要「选了哪个选项」，而导出的行式明细要渲染每个值（布尔/数字/文本/数组）。
-- 用 JSON 存值以保留类型，避免把 true/false 渲染成字符串。
ALTER TABLE t_answer_item
  ADD COLUMN value_json text DEFAULT NULL COMMENT '该选项对应的答案值（JSON，保留类型）' AFTER option_id;
