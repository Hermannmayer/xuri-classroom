-- 默认主题从暗色改成亮色。

ALTER TABLE t_user ALTER COLUMN ui_theme SET DEFAULT 'light';

UPDATE t_user SET ui_theme = 'light' WHERE ui_theme = 'dark';
