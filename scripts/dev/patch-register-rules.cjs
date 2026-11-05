// 注册链路调整：密码放宽到 8 位、注册固定学员、默认部门可配、注册后待审核
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');

// 1. 密码规则：最少 8 位即可
{
  const file = path.join(root, 'server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java');
  let text = fs.readFileSync(file, 'utf8');
  const before =
    'private static final Pattern STRONG_PASSWORD_PATTERN = Pattern\n\t\t\t.compile("^(?=.*\\\\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z0-9]{8,16}$");';
  const after = 'private static final Pattern STRONG_PASSWORD_PATTERN = Pattern.compile("^.{8,32}$");';
  if (text.includes(before)) {
    text = text.replace(before, after);
    fs.writeFileSync(file, text);
    console.log('密码规则已放宽为 8-32 位任意字符');
  } else if (text.includes('STRONG_PASSWORD_PATTERN')) {
    // 兜底：按行替换
    const lines = text.split(/\r?\n/);
    const idx = lines.findIndex((l) => l.includes('STRONG_PASSWORD_PATTERN = Pattern'));
    if (idx >= 0) {
      lines.splice(idx, 2, '\tprivate static final Pattern STRONG_PASSWORD_PATTERN = Pattern.compile("^.{8,32}$");');
      fs.writeFileSync(file, lines.join('\r\n'));
      console.log('密码规则已放宽（按行替换）');
    }
  }
}

// 2. 注册逻辑：固定学员 + 可配部门 + 待审核
{
  const file = path.join(root, 'server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java');
  let text = fs.readFileSync(file, 'utf8');

  if (!text.includes('registerInfo.getDeptId()')) {
    text = text.replace(
      'createUserRequest.setDeptId(getRootDeptId());',
      'String registerDeptId = registerInfo.getDeptId() != null && !registerInfo.getDeptId().isEmpty()\r\n\t\t\t\t? registerInfo.getDeptId()\r\n\t\t\t\t: getRootDeptId();\r\n\t\tcreateUserRequest.setDeptId(registerDeptId);',
    );
  }

  if (!text.includes('待审核')) {
    text = text.replace(
      'createUserRequest.setStatus(AppConsts.USER_STATUS.VALID);',
      '// 注册用户先进待审核状态（status=0），管理员在用户管理里启用后才能登录\r\n\t\tcreateUserRequest.setStatus(0);',
    );
  }

  // 注册固定学员：忽略请求里的 role，改用系统配置（无配置时默认 student）
  if (!text.includes('// 注册只能是学员')) {
    text = text.replace(
      'String role = request.getRole();',
      '// 注册只能是学员；老师/管理员只能由后台分配\r\n\t\tString role = null;',
    );
  }

  fs.writeFileSync(file, text);
  console.log('注册逻辑已调整（部门可配 / 待审核 / 固定学员）');
}

// 3. RegisterInfo 加 deptId
{
  const file = path.join(root, 'server/shared/src/main/java/cn/surveyking/server/domain/dto/SystemInfo.java');
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('private String deptId;')) {
    text = text.replace(
      'private Boolean strongPasswordEnabled;',
      'private Boolean strongPasswordEnabled;\n\n\t\t/**\n\t\t * 新用户注册后默认进入的部门\n\t\t */\n\t\tprivate String deptId;',
    );
    fs.writeFileSync(file, text);
    console.log('RegisterInfo 已加 deptId');
  } else {
    console.log('deptId 已存在');
  }
}
