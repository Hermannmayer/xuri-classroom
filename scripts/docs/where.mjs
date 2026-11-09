import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { root } from './lib.mjs'

const query = process.argv.slice(2).join(' ').trim()
const indexFile = path.join(root, 'docs/ai/modules.yaml')
if (!fs.existsSync(indexFile)) {
  console.error('缺少 docs/ai/modules.yaml，先运行 npm run docs:gen')
  process.exit(1)
}
const { modules = [] } = YAML.parse(fs.readFileSync(indexFile, 'utf8'))
if (!query) {
  for (const m of modules) console.log(m.id + '\t' + m.title + '\t' + m.doc)
  process.exit(0)
}
const q = query.toLowerCase()
const scored = modules.map((m) => {
  const hay = [m.id, m.title, m.doc, ...(m.keywords || []), ...(m.source_globs || [])].join(' ').toLowerCase()
  let score = 0
  if (String(m.id).toLowerCase() === q) score += 100
  if (String(m.title).toLowerCase() === q) score += 80
  if (String(m.id).toLowerCase().includes(q)) score += 30
  if (String(m.title).toLowerCase().includes(q)) score += 30
  for (const keyword of m.keywords || []) if (String(keyword).toLowerCase().includes(q) || q.includes(String(keyword).toLowerCase())) score += 10
  if (hay.includes(q)) score += 5
  return { m, score }
}).filter((item) => item.score > 0).sort((a, b) => b.score - a.score)

if (!scored.length) {
  console.log('没有匹配模块。可用模块：')
  for (const m of modules) console.log('- ' + m.id + ' ' + m.title)
  process.exit(1)
}
for (const { m } of scored.slice(0, 5)) {
  console.log('')
  console.log('module: ' + m.id)
  console.log('title:  ' + m.title)
  console.log('doc:    ' + m.doc)
  console.log('source:')
  for (const glob of m.source_globs || []) console.log('  - ' + glob)
  console.log('entrypoints:')
  for (const entry of m.entrypoints || []) console.log('  - ' + entry)
}
