import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { root, docsDir, loadModules, walk, rel, matchesAny, matchesGlob, readFrontmatter } from './lib.mjs'

const errors = []
const warnings = []
const requiredSections = ['30 秒摘要', '什么时候看这篇', '代码地图', '关键流程', '修改指南', '权限与数据范围', '坑与已知限制', '验证', '相关文档']
const requiredFields = ['id', 'title', 'status', 'keywords', 'source_globs', 'entrypoints', 'apis', 'tables', 'tests', 'last_verified', 'verified_against']
const allFiles = walk(root).map(rel)
const modules = loadModules()

if (modules.length === 0) errors.push('docs/modules 下没有 status=current 的模块文档')

for (const m of modules) {
  for (const field of requiredFields) {
    if (m[field] === undefined || m[field] === null || m[field] === '') errors.push(m.doc + ' 缺少 frontmatter.' + field)
  }
  if (!Array.isArray(m.keywords) || m.keywords.length === 0) errors.push(m.doc + ' keywords 必须是非空数组')
  if (!Array.isArray(m.source_globs) || m.source_globs.length === 0) errors.push(m.doc + ' source_globs 必须是非空数组')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(m.last_verified))) errors.push(m.doc + ' last_verified 必须是 YYYY-MM-DD')
  if (!/^[0-9a-f]{7,40}$/.test(String(m.verified_against))) errors.push(m.doc + ' verified_against 必须是 commit SHA')
  for (const glob of m.source_globs || []) {
    if (!allFiles.some((file) => matchesGlob(file, glob))) errors.push(m.doc + ' source_glob 没有命中文件: ' + glob)
  }
  for (const entry of m.entrypoints || []) {
    if (!fs.existsSync(path.join(root, entry))) errors.push(m.doc + ' entrypoint 不存在: ' + entry)
  }
  for (const section of requiredSections) {
    if (!m.body.includes('## ' + section)) errors.push(m.doc + ' 缺少章节: ## ' + section)
  }
}

const ids = new Set()
for (const m of modules) {
  if (ids.has(m.id)) errors.push('模块 id 重复: ' + m.id)
  ids.add(m.id)
}

const pageDirs = fs.readdirSync(path.join(root, 'client/src/pages'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name)
for (const dir of pageDirs) {
  const probe = 'client/src/pages/' + dir + '/__probe__.tsx'
  if (!modules.some((m) => matchesAny(probe, m.source_globs || []))) errors.push('页面目录没有被任何模块覆盖: client/src/pages/' + dir)
}

const apiDir = path.join(root, 'server/api/src/main/java/cn/surveyking/server/api')
for (const file of fs.readdirSync(apiDir).filter((name) => name.endsWith('Api.java'))) {
  const relFile = 'server/api/src/main/java/cn/surveyking/server/api/' + file
  if (!modules.some((m) => matchesAny(relFile, m.source_globs || []))) errors.push('API 类没有被任何模块覆盖: ' + relFile)
}

const docsToCheck = walk(docsDir)
  .filter((file) => file.endsWith('.md'))
  .filter((file) => !rel(file).startsWith('docs/archive/') && !rel(file).startsWith('docs/ops/') && !rel(file).startsWith('docs/ai/'))
for (const file of docsToCheck) {
  const text = fs.readFileSync(file, 'utf8')
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const link = match[1].trim()
    if (!link || link.startsWith('http') || link.startsWith('mailto:') || link.startsWith('#') || link.startsWith('tel:')) continue
    const withoutAnchor = link.split('#')[0]
    if (!withoutAnchor) continue
    let target
    if (withoutAnchor.startsWith('/')) {
      target = path.join(docsDir, withoutAnchor.slice(1))
    } else {
      target = path.resolve(path.dirname(file), withoutAnchor)
    }
    const candidates = [target, target + '.md', path.join(target, 'index.md')]
    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      errors.push(rel(file) + ' 链接不存在: ' + link)
    }
  }
}

const generated = ['docs/ai/modules.yaml', 'docs/reference/routes.md', 'docs/reference/api.md', 'docs/reference/permissions.md', 'docs/reference/db-schema.md', 'docs/status.md', 'docs/public/llms.txt']
for (const file of generated) if (!fs.existsSync(path.join(root, file))) errors.push('缺少生成文件: ' + file + '（运行 npm run docs:gen）')

try {
  execFileSync(process.execPath, [path.join(root, 'scripts/docs/gen.mjs'), '--check'], { stdio: 'inherit' })
} catch {
  errors.push('生成文件已漂移（见上方 STALE 列表）')
}

console.log('')
console.log('docs:check 模块=' + modules.length + ' 页面目录=' + pageDirs.length + ' 文档=' + docsToCheck.length)
if (warnings.length) console.log('警告:\n- ' + warnings.join('\n- '))
if (errors.length) {
  console.error('错误:\n- ' + errors.join('\n- '))
  process.exit(1)
}
console.log('docs:check 通过')
