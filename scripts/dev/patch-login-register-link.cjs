// 登录页加「注册」入口（仅当后端开启注册时显示）
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/user/Login.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('/user/register')) {
  console.log('注册入口已存在');
  process.exit(0);
}

const anchor = `            </Button>
          </Form>`;

const extra = `            </Button>
            {system?.registerInfo?.registerEnabled && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12 }}>
                还没有账号？
                <a onClick={() => navigate('/user/register')} style={{ marginLeft: 4 }}>
                  注册
                </a>
              </div>
            )}
          </Form>`;

if (!text.includes(anchor)) {
  console.error('未找到登录按钮锚点');
  process.exit(1);
}

text = text.replace(anchor, extra);
fs.writeFileSync(file, text);
console.log('已加注册入口');
