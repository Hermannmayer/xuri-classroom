// 组卷时把 Option 子节点补成 dataSource，否则渲染器显示「未配置选项」
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/project/ComposeModal.tsx');
let text = fs.readFileSync(file, 'utf8');

const anchor = `      const survey: SurveySchema = {
        id: rootId(),
        title,
        type: 'Survey',
        attribute: {},
        children: picked,
      };`;

const replacement = `      // 后端 pick 返回的题目只有 children（Option 节点），渲染器读 dataSource，这里补一份
      const questions = picked.map((question) => {
        if (question.dataSource?.length) return question;
        const options = (question.children ?? []).filter((child) => child.type === 'Option' || !child.type);
        if (options.length === 0) return question;
        return {
          ...question,
          dataSource: options.map((child) => ({ label: child.title ?? '', value: child.id })),
        };
      });

      const survey: SurveySchema = {
        id: rootId(),
        title,
        type: 'Survey',
        attribute: {},
        children: questions,
      };`;

if (!text.includes(anchor)) {
  console.error('未找到组装锚点');
  process.exit(1);
}

text = text.replace(anchor, replacement);
text = text.replace(
  'const actualScore = picked.reduce((sum, question) => sum + (question.attribute?.examScore ?? 0), 0);',
  'const actualScore = questions.reduce((sum, question) => sum + (question.attribute?.examScore ?? 0), 0);',
);
text = text.replace('已生成 ${picked.length} 道题', '已生成 ${questions.length} 道题');

fs.writeFileSync(file, text);
console.log('已补 dataSource');
