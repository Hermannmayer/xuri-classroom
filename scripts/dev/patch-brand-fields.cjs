// 后端：SystemSetting 加 favicon；品牌字段允许清空（改用 != null 合并）
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');

// 1. SystemInfo.SystemSetting 加 favicon 字段
{
  const file = path.join(root, 'server/shared/src/main/java/cn/surveyking/server/domain/dto/SystemInfo.java');
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('private String favicon;')) {
    text = text.replace(
      'private String recordNum;',
      'private String recordNum;\n\n\t\t/**\n\t\t * 浏览器标签页图标（不填则用 avatar）\n\t\t */\n\t\tprivate String favicon;',
    );
    fs.writeFileSync(file, text);
    console.log('SystemInfo.SystemSetting 已加 favicon');
  } else {
    console.log('favicon 字段已存在');
  }
}

// 2. mergeSysInfo：品牌字段允许清空 + 合并 favicon
{
  const file = path.join(root, 'server/rdbms/src/main/java/cn/surveyking/server/impl/SystemServiceImpl.java');
  let text = fs.readFileSync(file, 'utf8');
  let changed = false;

  const replacements = [
    ['if (isNotBlank(request.getDescription())) {', 'if (request.getDescription() != null) {'],
    ['if (isNotBlank(request.getAvatar())) {', 'if (request.getAvatar() != null) {'],
    ['if (isNotBlank(source.getCopyright())) {', 'if (source.getCopyright() != null) {'],
    ['if (isNotBlank(source.getRecordNum())) {', 'if (source.getRecordNum() != null) {'],
  ];
  for (const [from, to] of replacements) {
    if (text.includes(from)) {
      text = text.split(from).join(to);
      changed = true;
    }
  }

  if (!text.includes('source.getFavicon()')) {
    text = text.replace(
      'if (source.getRecordNum() != null) {\n\t\t\t\tsetting.setRecordNum(source.getRecordNum());\n\t\t\t}',
      'if (source.getRecordNum() != null) {\n\t\t\t\tsetting.setRecordNum(source.getRecordNum());\n\t\t\t}\n\t\t\tif (source.getFavicon() != null) {\n\t\t\t\tsetting.setFavicon(source.getFavicon());\n\t\t\t}',
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, text);
    console.log('mergeSysInfo 已支持清空与 favicon');
  } else {
    console.log('mergeSysInfo 无需改动');
  }
}
