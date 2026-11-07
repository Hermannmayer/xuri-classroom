-- 把 ui_zoom 改成 varchar：decimal 在 MyBatis 里读回 Double 时值为 null（实测），
-- 换成字符串后与 ui_theme 完全一致，读写都可靠。
SET NAMES utf8mb4;

ALTER TABLE t_user MODIFY COLUMN ui_zoom varchar(8) DEFAULT '1' COMMENT '界面缩放';

UPDATE t_user SET ui_zoom = '1' WHERE ui_zoom IS NULL OR ui_zoom = '';

SELECT id, name, ui_zoom, ui_theme FROM t_user WHERE is_deleted = 0;
