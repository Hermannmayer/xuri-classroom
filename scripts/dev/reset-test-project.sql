UPDATE t_project
SET survey = '{"id":"root","title":"2026 春季培训考试","type":"Survey","attribute":{},"children":[{"id":"q1","title":"你的年龄段","type":"Radio","attribute":{"required":true},"dataSource":[{"label":"30 岁以下","value":"q1a"},{"label":"30-50 岁","value":"q1b"},{"label":"50 岁以上","value":"q1c"}],"children":[{"id":"q1a","title":"30 岁以下","type":"Option","attribute":{}},{"id":"q1b","title":"30-50 岁","type":"Option","attribute":{}},{"id":"q1c","title":"50 岁以上","type":"Option","attribute":{}}]},{"id":"q2","title":"请留下联系方式（选填）","type":"FillBlank","attribute":{"placeholder":"手机号或微信号"},"children":[{"id":"q2b","title":"","type":"Option","attribute":{}}]},{"id":"q3","title":"你对课程的满意度","type":"Score","attribute":{"scope":"[0,5]"},"children":[{"id":"q3a","title":"","type":"Option","attribute":{}}]}]}'
WHERE id = 'tnqZS4';

UPDATE t_project SET status = 1 WHERE id = 'tnqZS4';
DELETE FROM t_answer WHERE project_id = 'tnqZS4';
