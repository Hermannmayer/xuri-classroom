// 按行定位插入 IP / 设备限次（锚点缩进不稳定，改用行号）
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/survey/Setting.tsx');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

if (lines.some((l) => l.includes('ipLimitNum'))) {
  console.log('已加过限次');
  process.exit(0);
}

// 找到 maxAnswers 的 Form.Item 起始与结束
const start = lines.findIndex((l) => l.includes('name="maxAnswers"'));
if (start < 0) {
  console.error('未找到 maxAnswers');
  process.exit(1);
}
let end = start;
while (end < lines.length && !lines[end].includes('</Col>')) end += 1;
if (end >= lines.length) {
  console.error('未找到闭合 </Col>');
  process.exit(1);
}

const i = (lines[start].match(/^\s*/) || [''])[0];
const freqOptions = `[
                        { value: 'only', label: '仅一次' },
                        { value: 'hour', label: '每小时' },
                        { value: 'day', label: '每天' },
                        { value: 'week', label: '每周' },
                        { value: 'month', label: '每月' },
                      ]`;

const extra = [
  `${i}<Col xs={24} md={12}>`,
  `${i}  <Form.Item label="每 IP 限次">`,
  `${i}    <Space.Compact style={{ width: '100%' }}>`,
  `${i}      <Form.Item name="ipLimitEnabled" valuePropName="checked" noStyle>`,
  `${i}        <Switch />`,
  `${i}      </Form.Item>`,
  `${i}      <Form.Item name="ipLimitNum" noStyle>`,
  `${i}        <InputNumber min={1} style={{ width: '38%' }} placeholder="次数" />`,
  `${i}      </Form.Item>`,
  `${i}      <Form.Item name="ipLimitFreq" noStyle>`,
  `${i}        <Select style={{ width: '52%' }} placeholder="频率" options={${freqOptions}} />`,
  `${i}      </Form.Item>`,
  `${i}    </Space.Compact>`,
  `${i}  </Form.Item>`,
  `${i}</Col>`,
  `${i}<Col xs={24} md={12}>`,
  `${i}  <Form.Item label="每台设备限次" extra="按浏览器 cookie 识别">`,
  `${i}    <Space.Compact style={{ width: '100%' }}>`,
  `${i}      <Form.Item name="deviceLimitEnabled" valuePropName="checked" noStyle>`,
  `${i}        <Switch />`,
  `${i}      </Form.Item>`,
  `${i}      <Form.Item name="deviceLimitNum" noStyle>`,
  `${i}        <InputNumber min={1} style={{ width: '38%' }} placeholder="次数" />`,
  `${i}      </Form.Item>`,
  `${i}      <Form.Item name="deviceLimitFreq" noStyle>`,
  `${i}        <Select style={{ width: '52%' }} placeholder="频率" options={${freqOptions}} />`,
  `${i}      </Form.Item>`,
  `${i}    </Space.Compact>`,
  `${i}  </Form.Item>`,
  `${i}</Col>`,
];

lines.splice(end + 1, 0, ...extra);
fs.writeFileSync(file, lines.join('\r\n'));
console.log(`已在 maxAnswers 之后插入限次（${end + 1} 行后）`);
