import { loadModules, git } from './lib.mjs'

const asJson = process.argv.includes('--json')
const modules = loadModules()
const rows = []
for (const m of modules) {
  if (!m.verified_against) continue
  const exists = git(['rev-parse', '--verify', m.verified_against])
  if (!exists) {
    rows.push({ id: m.id, doc: m.doc, last: m.last_verified, sha: m.verified_against, count: -1, files: [] })
    continue
  }
  const out = git(['diff', '--name-only', m.verified_against + '..HEAD', '--', ...(m.source_globs || [])])
  const files = out ? out.split(/\r?\n/).filter(Boolean) : []
  if (files.length) rows.push({ id: m.id, doc: m.doc, last: m.last_verified, sha: m.verified_against, count: files.length, files })
}
if (asJson) {
  console.log(JSON.stringify(rows, null, 2))
} else if (rows.length === 0) {
  console.log('docs:audit 通过：所有模块文档都没有落后于其 source_globs。')
} else {
  console.log('以下模块自 last_verified 后代码有变更：')
  for (const row of rows) {
    console.log('- ' + row.id + '  ' + row.doc + '  last=' + row.last + '  sha=' + row.sha + '  files=' + row.count)
    for (const file of row.files.slice(0, 5)) console.log('    ' + file)
  }
}
process.exit(rows.length ? 1 : 0)
