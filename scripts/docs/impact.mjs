import { loadModules, matchesAny, git } from './lib.mjs'

const args = process.argv.slice(2)
const strict = args.includes('--strict')
const baseIndex = args.indexOf('--base')
const base = baseIndex >= 0 ? args[baseIndex + 1] : process.env.DOCS_BASE_REF

const changed = new Set()
function addDiff(command) {
  for (const line of git(command.split(' ')).split(/\r?\n/)) if (line.trim()) changed.add(line.trim())
}
if (base) {
  addDiff('diff --name-only ' + base + '...HEAD')
} else {
  addDiff('diff --name-only')
  addDiff('diff --cached --name-only')
  addDiff('ls-files --others --exclude-standard')
}

const modules = loadModules()
const changedDocs = new Set([...changed].filter((file) => file.endsWith('.md')))
const impacted = []
for (const m of modules) {
  const codeHits = [...changed].filter((file) => matchesAny(file, m.source_globs || []))
  let sinceVerify = []
  if (m.verified_against) {
    const out = git(['diff', '--name-only', m.verified_against + '..HEAD', '--', ...(m.source_globs || [])])
    sinceVerify = out ? out.split(/\r?\n/).filter(Boolean) : []
  }
  if (codeHits.length || sinceVerify.length) {
    impacted.push({
      module: m,
      codeHits,
      sinceVerify,
      docChanged: changedDocs.has(m.doc),
    })
  }
}

if (impacted.length === 0) {
  console.log('没有检测到受影响的模块文档。')
  process.exit(0)
}

const commitMessage = git(['log', '-1', '--format=%B'])
const docsImpactNone = /Docs-Impact:\s*none/i.test(commitMessage)
let stale = 0
console.log('受影响模块：')
for (const item of impacted) {
  console.log('')
  console.log('- ' + item.module.id + '  ' + item.module.doc)
  if (item.codeHits.length) console.log('  本次改动命中: ' + item.codeHits.slice(0, 8).join(', ') + (item.codeHits.length > 8 ? ' …' : ''))
  if (item.sinceVerify.length) console.log('  自 ' + item.module.verified_against + ' 起有 ' + item.sinceVerify.length + ' 个代码变更，文档仍未刷新')
  if (!item.docChanged) {
    stale += 1
    console.log('  ⚠ 本次没有改这篇文档；核对后运行 npm run docs:mark -- ' + item.module.id)
  } else {
    console.log('  ✓ 文档已在本轮改动中更新')
  }
}

console.log('')
if (strict && stale > 0 && !docsImpactNone) {
  console.error('docs:impact 失败：' + stale + ' 个模块的代码变了但文档没更新。确实无行为变化时，在提交信息里加 Docs-Impact: none。')
  process.exit(1)
}
console.log(stale > 0 ? '提示：' + stale + ' 个模块文档需要核对。' : '模块文档均已覆盖。')
