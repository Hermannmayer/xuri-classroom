// 注册时把手机号也写进 user.phone
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');

// 1. RegisterRequest 加 phone
{
  const file = path.join(root, 'server/shared/src/main/java/cn/surveyking/server/domain/dto/RegisterRequest.java');
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('private String phone;')) {
    text = text.replace('private String name;', 'private String name;\n\n\t/**\n\t * 手机号（同时作为登录账号）\n\t */\n\tprivate String phone;');
    fs.writeFileSync(file, text);
    console.log('RegisterRequest 已加 phone');
  }
}

// 2. register 写 phone
{
  const file = path.join(root, 'server/rdbms/src/main/java/cn/surveyking/server/impl/UserServiceImpl.java');
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('createUserRequest.setPhone(request.getPhone())')) {
    text = text.replace(
      'createUserRequest.setName(request.getName());',
      'createUserRequest.setName(request.getName());\n\t\tcreateUserRequest.setPhone(request.getPhone());',
    );
    fs.writeFileSync(file, text);
    console.log('register 已写入 phone');
  }
}
