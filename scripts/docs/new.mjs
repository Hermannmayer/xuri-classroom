import fs from 'node:fs'
import path from 'node:path'
import { root, todayShanghai, git, readFrontmatter, writeFrontmatter } from './lib.mjs'

const id = process.argv[2]
const title = process.argv.slice(3).join(' ')
if (!id || !title) {
  console.error('用法: npm run docs:new -- <module-id> "<中文标题>"')
  process.exit(1)
}
if (!/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('module id 只能用小写字母/数字/连字符')
  process.exit(1)
}
const target = path.join(root, 'docs/modules/' + id + '.md')
if (fs.existsSync(target)) {
  console.error('已存在: docs/modules/' + id + '.md')
  process.exit(1)
}
const template = path.join(root, 'docs/ai/module-template.md')
const { data, body } = readFrontmatter(template)
data.id = 'module-' + id
data.title = title
data.last_verified = todayShanghai()
data.verified_against = git(['rev-parse', 'HEAD']).slice(0, 40)
writeFrontmatter(target, data, body)
console.log('已创建 docs/modules/' + id + '.md；填写 source_globs 后运行 npm run docs:gen')
