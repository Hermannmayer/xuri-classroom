// 项目支持「授权给用户组」：ProjectPartnerRequest 加 groupId，addProjectPartner 支持写组授权
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');

// 1. Request 加 groupId
{
  const file = path.join(root, 'server/shared/src/main/java/cn/surveyking/server/domain/dto/ProjectPartnerRequest.java');
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('groupId')) {
    text = text.replace(
      'private List<String> userIds;',
      'private List<String> userIds;\n\n\t/**\n\t * 授权给用户组（t_dept.id），与 userIds 二选一\n\t */\n\tprivate String groupId;',
    );
    fs.writeFileSync(file, text);
    console.log('ProjectPartnerRequest 已加 groupId');
  }
}

// 2. Service 支持组授权
{
  const file = path.join(root, 'server/rdbms/src/main/java/cn/surveyking/server/impl/ProjectPartnerServiceImpl.java');
  let text = fs.readFileSync(file, 'utf8');
  if (text.includes('// 授权给用户组')) {
    console.log('组授权已支持');
    process.exit(0);
  }

  const anchor = `		// 添加答题人`;
  const branch = `		// 授权给用户组（班级）：只写一条 group_id 记录，组员自动继承可见
		if (org.apache.commons.lang3.StringUtils.isNotBlank(request.getGroupId())) {
			long exists = count(Wrappers.<ProjectPartner>lambdaQuery()
					.eq(ProjectPartner::getProjectId, request.getProjectId())
					.eq(ProjectPartner::getGroupId, request.getGroupId())
					.eq(ProjectPartner::getType, ProjectPartnerTypeEnum.RESPONDENT.getType()));
			if (exists == 0) {
				ProjectPartner partner = new ProjectPartner();
				partner.setProjectId(request.getProjectId());
				partner.setGroupId(request.getGroupId());
				partner.setType(ProjectPartnerTypeEnum.RESPONDENT.getType());
				save(partner);
			}
			return;
		}
		// 添加答题人`;

  if (!text.includes(anchor)) {
    console.error('未找到锚点');
    process.exit(1);
  }
  text = text.replace(anchor, branch);
  fs.writeFileSync(file, text);
  console.log('addProjectPartner 已支持组授权');
}
