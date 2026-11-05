UPDATE t_sys_info SET setting = '{"captchaEnabled":false}' WHERE id = '1';
SELECT id, name, setting FROM t_sys_info;
