// 加 /user/register 路由
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/router.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('Register')) {
  console.log('路由已存在');
  process.exit(0);
}

text = text.replace(
  "import Login from './pages/user/Login';",
  "import Login from './pages/user/Login';\nimport Register from './pages/user/Register';",
);

text = text.replace(
  "{ path: '/user/login', element: <Login /> },",
  "{ path: '/user/login', element: <Login /> },\n  { path: '/user/register', element: <Register /> },",
);

fs.writeFileSync(file, text);
console.log('已加注册路由');
