-- =============================================================================
-- 权限 v3.1（幂等）：移除 answer:attach
--
-- 原因：学员答题页的附件上传走公开接口 /api/public/upload（不需要登录/权限），
-- 后台补录附件用的是 answer:upload。所以 answer:attach 没有任何后端消费方，
-- 属于「勾了不生效」的权限点，按之前的原则（不留死权限）删除。
-- 将来如果做「登录态答题附件」接口，再加回来并接到该接口上。
-- =============================================================================
SET NAMES utf8mb4;

UPDATE t_role
SET authority = TRIM(BOTH ',' FROM REPLACE(CONCAT(',', authority, ','), ',answer:attach,', ',')),
    update_at = NOW()
WHERE is_deleted = 0 AND authority LIKE '%answer:attach%';

SELECT name, code,
       (CHAR_LENGTH(authority) - CHAR_LENGTH(REPLACE(authority, ',', '')) + 1) AS perm_count
FROM t_role WHERE is_deleted = 0 ORDER BY perm_count DESC;
