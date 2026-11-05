// 启动时按系统名称设置 document.title（登录页也生效），并同步 favicon
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/main.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('document.title = name')) {
  console.log('title 已接入');
  process.exit(0);
}

text = text.replace(
  "  .then((body: { data?: { avatar?: string; setting?: { favicon?: string } } }) => {",
  "  .then((body: { data?: { name?: string; avatar?: string; setting?: { favicon?: string } } }) => {\n    // 系统名跟随后端配置，登录页也要生效\n    if (body?.data?.name) document.title = body.data.name;",
);

fs.writeFileSync(file, text);
console.log('已加 document.title 同步');
