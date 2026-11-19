-- 默认主题从暗色改成亮色。
--
-- 三处要一起改：前端 readMode 的兜底、init-mysql 的列默认值、以及这条迁移。
-- 迁移做两件事：列默认值改成 light；把「还停在旧默认值」的用户（ui_theme='dark'）改过来。
-- 只动 dark 的行，有明确 WHERE，不会扫全表。

ALTER TABLE t_user ALTER COLUMN ui_theme SET DEFAULT 'light';

UPDATE t_user SET ui_theme = 'light' WHERE ui_theme = 'dark';
