// 补 IP / 设备限次的加载回填与保存写入
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/survey/Setting.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('ipLimit:')) {
  console.log('已接保存逻辑');
  process.exit(0);
}

// 1. 加载
const loadAnchor = 'maxAnswers: value.answerSetting?.maxAnswers,';
if (!text.includes(loadAnchor)) {
  console.error('未找到加载锚点');
  process.exit(1);
}
text = text.replace(
  loadAnchor,
  `${loadAnchor}
          ipLimitEnabled: Boolean(value.answerSetting?.ipLimit),
          ipLimitNum: value.answerSetting?.ipLimit?.limitNum,
          ipLimitFreq: value.answerSetting?.ipLimit?.limitFreq,
          deviceLimitEnabled: Boolean(value.answerSetting?.cookieLimit),
          deviceLimitNum: value.answerSetting?.cookieLimit?.limitNum,
          deviceLimitFreq: value.answerSetting?.cookieLimit?.limitFreq,`,
);

// 2. 保存
const saveAnchor = 'maxAnswers: v.maxAnswers ?? undefined,';
if (!text.includes(saveAnchor)) {
  console.error('未找到保存锚点');
  process.exit(1);
}
text = text.replace(
  saveAnchor,
  `${saveAnchor}
          ipLimit: v.ipLimitEnabled
            ? { limitNum: Number(v.ipLimitNum ?? 1), limitFreq: v.ipLimitFreq ?? 'only' }
            : undefined,
          cookieLimit: v.deviceLimitEnabled
            ? { limitNum: Number(v.deviceLimitNum ?? 1), limitFreq: v.deviceLimitFreq ?? 'only' }
            : undefined,`,
);

fs.writeFileSync(file, text);
console.log('已补加载与保存');
