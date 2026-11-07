-- 主题跟着账号走
SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS add_ui_theme;
DELIMITER $$
CREATE PROCEDURE add_ui_theme()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_user' AND COLUMN_NAME = 'ui_theme') THEN
    ALTER TABLE t_user ADD COLUMN ui_theme varchar(10) DEFAULT 'dark' COMMENT '主题 light/dark';
  END IF;
END$$
DELIMITER ;
CALL add_ui_theme();
DROP PROCEDURE add_ui_theme;

SELECT COUNT(*) AS has_ui_theme FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_user' AND COLUMN_NAME = 'ui_theme';
