// 接入练习页路由 + AnswerRequest 补 examExerciseType（练习记录可见）
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');

// 1. router
{
  const file = path.join(root, 'client/src/router.tsx');
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('Practice')) {
    text = text.replace(
      "import ExerciseList from './pages/exercise/List';",
      "import ExerciseList from './pages/exercise/List';\nimport Practice from './pages/exercise/Practice';",
    );
    text = text.replace(
      "{ path: 'exercise/:repoId', element: <Placeholder title=\"练习详情\" /> },",
      "{ path: 'exercise/practice/:repoId', element: guard('exercise:list', <Practice />) },\n      { path: 'exercise/:repoId', element: <Placeholder title=\"练习详情\" /> },",
    );
    fs.writeFileSync(file, text);
    console.log('练习路由已接入');
  } else {
    console.log('练习路由已存在');
  }
}

// 2. AnswerRequest 加 examExerciseType
{
  const file = path.join(root, 'server/shared/src/main/java/cn/surveyking/server/domain/dto/AnswerRequest.java');
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('examExerciseType')) {
    text = text.replace(
      'private Integer tempSave;',
      'private Integer tempSave;\n\n\t/**\n\t * 练习类型（O 顺序 / R 随机 / W 错题），练习记录靠它区分\n\t */\n\tprivate String examExerciseType;',
    );
    fs.writeFileSync(file, text);
    console.log('AnswerRequest 已加 examExerciseType');
  } else {
    console.log('examExerciseType 已存在');
  }
}
