-- 系统改名：旭日云课堂（以后要加课程）
UPDATE t_sys_info SET name = '旭日云课堂', description = '威海市旭日职业培训学校 · 考试与学习平台'
WHERE id = '1';

SELECT id, name, description FROM t_sys_info;
