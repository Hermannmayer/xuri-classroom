// 组授权支持向上继承：授权给父组，子组成员也能看到
// 用 MySQL 8 的 WITH RECURSIVE 取当前用户部门的祖先链（含自己）
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const ANCESTOR = `IN (SELECT id FROM (WITH RECURSIVE dept_anc AS (SELECT id, parent_id FROM t_dept WHERE id = (SELECT dept_id FROM t_user WHERE id = {0}) UNION ALL SELECT d.id, d.parent_id FROM t_dept d JOIN dept_anc a ON d.id = a.parent_id) SELECT id FROM dept_anc) anc)`;

// 1. RepoServiceImpl：listRepo + assertReadableRepo
{
  const file = path.join(root, 'server/rdbms/src/main/java/cn/surveyking/server/impl/RepoServiceImpl.java');
  let text = fs.readFileSync(file, 'utf8');
  let changed = false;

  const oldList = `"EXISTS (SELECT 1 FROM t_repo_partner rp WHERE rp.repo_id = t_repo.id AND (rp.user_id = {0} OR (rp.dept_id IS NOT NULL AND rp.dept_id = (SELECT u.dept_id FROM t_user u WHERE u.id = {0}))))"`;
  const newList = `"EXISTS (SELECT 1 FROM t_repo_partner rp WHERE rp.repo_id = t_repo.id AND (rp.user_id = {0} OR (rp.dept_id IS NOT NULL AND rp.dept_id ${ANCESTOR})))"`;
  if (text.includes(oldList)) {
    text = text.split(oldList).join(newList);
    changed = true;
  }

  const oldRead = `"dept_id IS NOT NULL AND dept_id = (SELECT u.dept_id FROM t_user u WHERE u.id = {0})"`;
  const newRead = `"dept_id IS NOT NULL AND dept_id ${ANCESTOR}"`;
  if (text.includes(oldRead)) {
    text = text.split(oldRead).join(newRead);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, text);
    console.log('RepoServiceImpl 已支持父组继承');
  } else {
    console.log('RepoServiceImpl 未匹配到锚点');
  }
}

// 2. RepoPartnerServiceImpl#hasPracticePermission
{
  const file = path.join(root, 'server/rdbms/src/main/java/cn/surveyking/server/impl/RepoPartnerServiceImpl.java');
  let text = fs.readFileSync(file, 'utf8');
  const old = `"dept_id IS NOT NULL AND dept_id = (SELECT u.dept_id FROM t_user u WHERE u.id = {0})"`;
  const neu = `"dept_id IS NOT NULL AND dept_id ${ANCESTOR}"`;
  if (text.includes(old)) {
    text = text.split(old).join(neu);
    fs.writeFileSync(file, text);
    console.log('hasPracticePermission 已支持父组继承');
  }
}

// 3. ProjectServiceImpl#listProject
{
  const file = path.join(root, 'server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectServiceImpl.java');
  let text = fs.readFileSync(file, 'utf8');
  const old = `+ " AND (t.user_id = {0} OR (t.group_id IS NOT NULL AND t.group_id = (SELECT u.dept_id FROM t_user u WHERE u.id = {0})))"`;
  const neu = `+ " AND (t.user_id = {0} OR (t.group_id IS NOT NULL AND t.group_id ${ANCESTOR}))"`;
  if (text.includes(old)) {
    text = text.split(old).join(neu);
    fs.writeFileSync(file, text);
    console.log('listProject 已支持父组继承');
  } else {
    console.log('listProject 未匹配（可能格式不同）');
  }
}
