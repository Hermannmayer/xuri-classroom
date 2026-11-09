import fs from 'node:fs'
import path from 'node:path'
import { loadModules, readFrontmatter, writeFrontmatter, git, todayShanghai } from './lib.mjs'

const id = process.argv[2]
const modules = loadModules()
if (!id) {
  console.log('用法: npm run docs:mark -- <module-id>')
  for (const m of modules) console.log('- ' + m.id)
  process.exit(0)
}
const module = modules.find((m) => m.id === id)
if (!module) {
  console.error('找不到模块: ' + id)
  process.exit(1)
}
const { data, body } = readFrontmatter(module.file)
data.last_verified = todayShanghai()
data.verified_against = git(['rev-parse', 'HEAD']).slice(0, 40)
writeFrontmatter(module.file, data, body)
console.log('已更新 ' + module.doc + ' -> ' + data.last_verified + ' / ' + data.verified_against)
