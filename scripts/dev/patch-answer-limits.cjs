// 设置页「回收限制」卡片补 IP / 设备限次（后端 ipLimit / cookieLimit 已支持，UniqueLimitSetting = { limitNum, limitFreq }）
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/survey/Setting.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('ipLimitNum')) {
  console.log('已加过限次，跳过');
  process.exit(0);
}

// 1. 加载回填
text = text.replace(
  '          maxAnswers: value.answerSetting?.maxAnswers,',
  `          maxAnswers: value.answerSetting?.maxAnswers,
          ipLimitEnabled: Boolean(value.answerSetting?.ipLimit),
          ipLimitNum: value.answerSetting?.ipLimit?.limitNum,
          ipLimitFreq: value.answerSetting?.ipLimit?.limitFreq,
          deviceLimitEnabled: Boolean(value.answerSetting?.cookieLimit),
          deviceLimitNum: value.answerSetting?.cookieLimit?.limitNum,
          deviceLimitFreq: value.answerSetting?.cookieLimit?.limitFreq,`,
);

// 2. 保存
text = text.replace(
  '          maxAnswers: v.maxAnswers ?? undefined,',
  `          maxAnswers: v.maxAnswers ?? undefined,
          ipLimit: v.ipLimitEnabled
            ? { limitNum: Number(v.ipLimitNum ?? 1), limitFreq: v.ipLimitFreq ?? 'only' }
            : undefined,
          cookieLimit: v.deviceLimitEnabled
            ? { limitNum: Number(v.deviceLimitNum ?? 1), limitFreq: v.deviceLimitFreq ?? 'only' }
            : undefined,`,
);

// 3. UI：在「回收上限」那个 Col 之后插入两组限次
const anchor = `                <Col xs={24} md={12}>
                  <Form.Item name="maxAnswers" label="回收上限">
                    <InputNumber min={1} style={{ width: '100%' }} placeholder="不限" />
                  </Form.Item>
                </Col>`;

const extra = `${anchor}
                <Col xs={24} md={12}>
                  <Form.Item label="每 IP 限次">
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="ipLimitEnabled" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                      <Form.Item name="ipLimitNum" noStyle>
                        <InputNumber min={1} style={{ width: '38%' }} placeholder="次数" />
                      </Form.Item>
                      <Form.Item name="ipLimitFreq" noStyle>
                        <Select
                          style={{ width: '52%' }}
                          placeholder="频率"
                          options={[
                            { value: 'only', label: '仅一次' },
                            { value: 'hour', label: '每小时' },
                            { value: 'day', label: '每天' },
                            { value: 'week', label: '每周' },
                            { value: 'month', label: '每月' },
                          ]}
                        />
                      </Form.Item>
                    </Space.Compact>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="每台设备限次" extra="按浏览器 cookie 识别">
                    <Space.Compact style={{ width: '100%' }}>
                      <Form.Item name="deviceLimitEnabled" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                      <Form.Item name="deviceLimitNum" noStyle>
                        <InputNumber min={1} style={{ width: '38%' }} placeholder="次数" />
                      </Form.Item>
                      <Form.Item name="deviceLimitFreq" noStyle>
                        <Select
                          style={{ width: '52%' }}
                          placeholder="频率"
                          options={[
                            { value: 'only', label: '仅一次' },
                            { value: 'hour', label: '每小时' },
                            { value: 'day', label: '每天' },
                            { value: 'week', label: '每周' },
                            { value: 'month', label: '每月' },
                          ]}
                        />
                      </Form.Item>
                    </Space.Compact>
                  </Form.Item>
                </Col>`;

if (!text.includes(anchor)) {
  console.error('未找到回收上限 Col');
  process.exit(1);
}
text = text.replace(anchor, extra);

// 4. Space 组件 import
if (!text.includes('Space,')) {
  text = text.replace("import { Button, Card, DatePicker, Form, Input, InputNumber, message, Row, Col, Select, Space, Switch } from 'antd';", "import { Button, Card, DatePicker, Form, Input, InputNumber, message, Row, Col, Select, Space, Switch } from 'antd';");
}

fs.writeFileSync(file, text);
console.log('已加 IP / 设备限次');
