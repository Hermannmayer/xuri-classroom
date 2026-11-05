// 把 OptionEditor 接进属性面板
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/designer/AttributePanel.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('OptionEditor')) {
  console.log('已接入，跳过');
  process.exit(0);
}

// 1. import
text = text.replace("import RuleEditor from './RuleEditor';", "import RuleEditor from './RuleEditor';\r\nimport OptionEditor from './OptionEditor';");

// 2. props
text = text.replace(
  '  questions?: FlatQuestion[];\n}',
  '  questions?: FlatQuestion[];\n  /** 改非 attribute 的节点字段（选项等），由设计器传入 patchNode */\n  onPatchNode?: (patch: Partial<SurveySchema>) => void;\n}',
);

// 3. 解构
text = text.replace(
  'export function AttributePanel({ schema, onChange, questions }: AttributePanelProps) {',
  'export function AttributePanel({ schema, onChange, questions, onPatchNode }: AttributePanelProps) {',
);

// 4. 在 Form 前渲染
text = text.replace(
  '      <Form layout="vertical" size="small" requiredMark={false}>',
  '      {onPatchNode && <OptionEditor schema={schema} onPatch={onPatchNode} />}\r\n\r\n      <Form layout="vertical" size="small" requiredMark={false}>',
);

fs.writeFileSync(file, text);
console.log('已接入 OptionEditor');
