-- 题库授权到用户组（班级）：组员自动继承，不必逐人快照
ALTER TABLE t_repo_partner ADD COLUMN dept_id varchar(64) NULL COMMENT '授权目标用户组(t_dept.id)' AFTER user_id;

CREATE INDEX idx_repo_partner_dept ON t_repo_partner (dept_id);

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'surveyking' AND TABLE_NAME = 't_repo_partner';
