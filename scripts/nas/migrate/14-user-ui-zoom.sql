-- 界面缩放跟随账号：加一列，登录后由前端套用
SET NAMES utf8mb4;

-- MySQL 8 不支持 ADD COLUMN IF NOT EXISTS，用存储过程判断
DROP PROCEDURE IF EXISTS add_ui_zoom;
DELIMITER $$
CREATE PROCEDURE add_ui_zoom()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_user' AND COLUMN_NAME = 'ui_zoom') THEN
    ALTER TABLE t_user ADD COLUMN ui_zoom decimal(4,2) DEFAULT '1.00' COMMENT '界面缩放';
  END IF;
END$$
DELIMITER ;
CALL add_ui_zoom();
DROP PROCEDURE add_ui_zoom;

SELECT COUNT(*) AS has_ui_zoom FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_user' AND COLUMN_NAME = 'ui_zoom';
