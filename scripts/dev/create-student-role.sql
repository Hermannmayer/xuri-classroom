-- 学员角色：只能练习、看题库、改自己的资料；没有 project:*（项目/考试管理）与 system:*（系统管理）
INSERT INTO t_role (id, name, code, remark, authority, status, is_deleted, create_at)
SELECT 'student', '学员', 'student', '答题、练习、看题库，无后台管理权限',
       'exercise:list,repo:list,repo:detail,user:update', 1, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_role WHERE code = 'student');

SELECT id, name, code, authority FROM t_role;
