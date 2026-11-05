// 给题库列表加「按分类浏览」抽屉入口
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../client/src/pages/repo/List.tsx');
let text = fs.readFileSync(file, 'utf8');

if (text.includes('RepoGroups')) {
  console.log('已经接过，跳过');
  process.exit(0);
}

// 1. import
text = text.replace(
  "import GrantModal from './GrantModal';",
  "import GrantModal from './GrantModal';\r\nimport RepoGroups from './RepoGroups';",
);

// 2. state
text = text.replace(
  'const [granting, setGranting] = useState<RepoView | null>(null);',
  'const [granting, setGranting] = useState<RepoView | null>(null);\r\n  const [groupsOpen, setGroupsOpen] = useState(false);',
);

// 3. 工具栏按钮：放在「新建题库」按钮前
const newBtnAnchor = '<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>';
text = text.replace(
  newBtnAnchor,
  '<Button icon={<AppstoreOutlined />} onClick={() => setGroupsOpen(true)}>\r\n          按分类浏览\r\n        </Button>\r\n        ' + newBtnAnchor,
);

// 4. 渲染抽屉（放在 GrantModal 前）
text = text.replace(
  '      <GrantModal',
  `      <RepoGroups
        open={groupsOpen}
        repos={rows}
        onClose={() => setGroupsOpen(false)}
        onEdit={(repo) => {
          setGroupsOpen(false);
          renameForm.setFieldsValue({
            name: repo.name || '',
            category: repo.category,
            description: (repo as RepoView).description,
          });
          setRenaming(repo as RepoView);
        }}
      />
      <GrantModal`,
);

// 5. 图标 import
text = text.replace(
  "import { DatabaseOutlined, PlusOutlined } from '@ant-design/icons';",
  "import { AppstoreOutlined, DatabaseOutlined, PlusOutlined } from '@ant-design/icons';",
);

fs.writeFileSync(file, text);
console.log('已接入「按分类浏览」');
