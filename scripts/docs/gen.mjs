import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import {
  docsDir, root, loadModules, walk, rel, matchesAny, readFrontmatter, writeIfChanged,
} from './lib.mjs'

const checkOnly = process.argv.includes('--check')
const outputs = []

function add(relPath, content) {
  outputs.push({ file: path.join(root, relPath), content })
}

function header(source) {
  return ['<!-- 由 npm run docs:gen 生成；不要手改。来源：' + source + ' -->', '']
}

function moduleIndex() {
  const modules = loadModules()
  const data = {
    version: 1,
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      doc: m.doc,
      keywords: m.keywords || [],
      source_globs: m.source_globs || [],
      entrypoints: m.entrypoints || [],
      apis: m.apis || [],
      tables: m.tables || [],
      tests: m.tests || [],
      last_verified: m.last_verified,
      verified_against: m.verified_against,
    })),
  }
  add('docs/ai/modules.yaml', '# 由 npm run docs:gen 从 docs/modules/*.md frontmatter 生成；不要手改。\n' + YAML.stringify(data, { lineWidth: 0 }))
}

function parseRoutes() {
  const file = path.join(root, 'client/src/router.tsx')
  const text = fs.readFileSync(file, 'utf8')
  const rows = []
  // 页面里的守卫现在写成 PERMISSION_CODES.xxx；生成文档时还原成权限码，保持 routes.md 稳定
  const codeByKey = new Map(parsePermissions().map((row) => [permissionCodeKey(row.code), row.code]))
  const resolveGuard = (quoted, constantKey) => {
    if (quoted) return quoted
    if (constantKey) return codeByKey.get(constantKey) || constantKey
    return ''
  }
  const routeRe = /\{\s*path:\s*'([^']+)'\s*,\s*element:\s*([\s\S]*?)\s*\}/g
  let match
  while ((match = routeRe.exec(text))) {
    const routePath = match[1]
    const element = match[2]
    const guards = []
    const guardRe = /guard\(\s*(?:'([^']*)'|"([^"]*)"|PERMISSION_CODES\.([A-Za-z0-9_$]+)|\[([^\]]*)\])/g
    let gm
    while ((gm = guardRe.exec(element))) {
      if (gm[1] || gm[2]) guards.push(gm[1] || gm[2])
      if (gm[3]) guards.push(resolveGuard('', gm[3]))
      if (gm[4]) {
        for (const part of gm[4].matchAll(/'([^']+)'|"([^"]+)"|PERMISSION_CODES\.([A-Za-z0-9_$]+)/g)) {
          const guard = resolveGuard(part[1] || part[2], part[3])
          if (guard) guards.push(guard)
        }
      }
    }
    const component = (element.match(/<([A-Z][A-Za-z0-9_]*)/) || [])[1] || '—'
    rows.push({ routePath: routePath.startsWith('/') ? routePath : '/' + routePath, component, guards: [...new Set(guards)] })
  }
  return rows
}

function routesDoc() {
  const lines = header('client/src/router.tsx')
  lines.push('# 路由表（生成）', '')
  lines.push('> 由 `client/src/router.tsx` 解析；守卫列写的是前端 `guard(...)` 的权限码。后端还会做 `@PreAuthorize` 二次校验。', '')
  lines.push('| 路径 | 组件 | 前端守卫 |', '|---|---|---|')
  for (const row of parseRoutes()) {
    lines.push('| `' + row.routePath + '` | `' + row.component + '` | ' + (row.guards.length ? row.guards.map((g) => '`' + g + '`').join('<br>') : '公开/仅登录') + ' |')
  }
  lines.push('')
  return lines.join('\n')
}

function parseApi() {
  const dir = path.join(root, 'server/api/src/main/java/cn/surveyking/server/api')
  const rows = []
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('Api.java'))) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8')
    const className = file.replace(/\.java$/, '')
    const classPrefix = (text.match(/@RequestMapping\("([^"]+)"\)/) || [])[1] || ''
    let pending = null
    let classSeen = false
    let lastPre = ''
    let lastData = ''
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (trimmed.startsWith('public class ')) classSeen = true
      if (trimmed.startsWith('@PreAuthorize(')) {
        lastPre = trimmed.replace(/^@PreAuthorize\(/, '').replace(/\)$/, '').replace(/^"|"$/g, '')
        if (pending) pending.pre = lastPre
        continue
      }
      if (trimmed.startsWith('@EnableDataPerm')) {
        lastData = '是'
        if (pending) pending.data = lastData
        continue
      }
      if (classSeen && /^@(Get|Post|Put|Delete|Request)Mapping(?:\(|$)/.test(trimmed)) {
        const pm = trimmed.match(/Mapping\(\s*(?:"([^"]*)"|'([^']*)')?/)
        pending = { mapping: trimmed.match(/^@(\w+)/)[1], methodPath: pm ? (pm[1] || pm[2] || '') : '', pre: lastPre, data: lastData }
        lastPre = ''
        lastData = ''
        continue
      }
      if (pending) {
        const mm = trimmed.match(/^public\s+[^=;]+\s+(\w+)\s*\(/)
        if (mm) {
          rows.push({
            className,
            method: mm[1],
            http: pending.mapping.replace('Mapping', '').toUpperCase(),
            route: (classPrefix + pending.methodPath).replace(/\/\//g, '/'),
            pre: pending.pre,
            data: pending.data,
          })
          pending = null
        }
      }
    }
  }
  return rows
}

function apiDoc() {
  const rows = parseApi()
  const lines = header('server/api/**/*.java')
  lines.push('# 接口表（生成）', '')
  lines.push('> 共 ' + rows.length + ' 个方法级映射。`${api.prefix}` 在运行时由配置替换；权限列为空表示方法上没有 `@PreAuthorize`。', '')
  lines.push('| 方法 | 路径 | 类/方法 | 权限 | 数据权限 |', '|---|---|---|---|---|')
  for (const row of rows) {
    lines.push('| ' + row.http + ' | `' + row.route + '` | `' + row.className + '#' + row.method + '` | ' + (row.pre ? '`' + row.pre + '`' : '—') + ' | ' + (row.data || '—') + ' |')
  }
  lines.push('')
  return lines.join('\n')
}

function parsePermissions() {
  const file = path.join(root, 'server/shared/src/main/java/cn/surveyking/server/core/constant/PermissionEnum.java')
  const text = fs.readFileSync(file, 'utf8')
  const rows = []
  const re = /\b[A-Z0-9_]+\("([^"]+)",\s*"([^"]*)",\s*Group\.([A-Z]+),\s*"([^"]*)"(?:,\s*(true|false))?(?:,\s*(true|false))?\)/g
  for (const m of text.matchAll(re)) {
    rows.push({ code: m[1], name: m[2], group: m[3], desc: m[4], studentOnly: m[6] === 'true' })
  }
  return rows
}

function permissionsDoc() {
  const rows = parsePermissions()
  const lines = header('server/shared/.../PermissionEnum.java')
  lines.push('# 权限目录（生成）', '')
  lines.push('> 共 ' + rows.length + ' 个权限点。`学员专属` 不会自动注入管理员；其余权限管理员运行时自动拥有。', '')
  lines.push('| 权限码 | 名称 | 分组 | 说明 | 学员专属 |', '|---|---|---|---|---|')
  for (const row of rows) {
    lines.push('| `' + row.code + '` | ' + row.name + ' | ' + row.group + ' | ' + row.desc + ' | ' + (row.studentOnly ? '是' : '') + ' |')
  }
  lines.push('')
  return lines.join('\n')
}


/** 权限码 → 常量 key：按冒号分段转 camelCase（project:list → projectList） */
function permissionCodeKey(code) {
  const segments = code.split(':').filter(Boolean)
  const camel = segments.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join('')
  return camel.charAt(0).toLowerCase() + camel.slice(1)
}

/**
 * 权限码常量对象：页面里不再写裸串，统一引用 PERMISSION_CODES.xxx。
 * 正常情况下 key 唯一；万一两个权限码算出同一个 key，后出现的追加序号并在注释里说明。
 */
function permissionCodesConst(rows) {
  const used = new Map()
  const lines = [
    '/**',
    ' * 权限码 → 前端常量。key 由权限码按冒号分段转 camelCase：project:list → projectList。',
    ' * 页面里不要写裸串，统一用 PERMISSION_CODES.xxx；新增权限点后重跑 npm run docs:gen。',
    ' */',
    'export const PERMISSION_CODES = {',
  ]
  for (const row of rows) {
    let key = permissionCodeKey(row.code)
    if (used.has(key)) {
      const baseKey = key
      let index = 2
      while (used.has(baseKey + index)) index += 1
      lines.push(
        '  // 重名：' + JSON.stringify(row.code) + ' 与 ' + JSON.stringify(used.get(baseKey)) + ' 都映射到 ' + baseKey + '，本条追加序号 ' + index + ' 区分',
      )
      key = baseKey + index
    }
    used.set(key, row.code)
    lines.push('  ' + key + ": '" + row.code + "',")
  }
  lines.push('} as const;', '')
  return lines
}

/**
 * 从 PermissionEnum.java 生成前端常量，消除「权限码手抄三份」里的前端那一份。
 * PERMISSIONS 供权限矩阵列出可勾选项；PERMISSION_CODES 供页面引用具体权限码。
 * 任何新增/改名都会在 docs:check 里暴露为 STALE。
 */
function permissionCodesTs() {
  const rows = parsePermissions()
  const lines = [
    '// 由 npm run docs:gen 从 server/shared/.../PermissionEnum.java 生成；不要手改。',
    '// 新增或改名权限点：改 PermissionEnum.java，然后跑 npm run docs:gen 并提交生成物。',
    '',
    'export interface PermissionDef {',
    '  code: string;',
    '  name: string;',
    '  group: string;',
    '  studentOnly: boolean;',
    '}',
    '',
    '/** 全部权限点，顺序与 PermissionEnum 一致 */',
    'export const PERMISSIONS: PermissionDef[] = [',
  ]
  for (const row of rows) {
    lines.push(
      '  { code: ' + JSON.stringify(row.code) + ', name: ' + JSON.stringify(row.name) + ', group: ' + JSON.stringify(row.group) + ', studentOnly: ' + row.studentOnly + ' },',
    )
  }
  lines.push('];', '')
  lines.push('/** 学员专属：管理员/老师默认不拥有，前端 can() 必须精确命中 */')
  lines.push('export const STUDENT_ONLY_PERMISSIONS: string[] = [')
  for (const row of rows.filter((r) => r.studentOnly)) lines.push('  ' + JSON.stringify(row.code) + ',')
  lines.push('];', '')
  lines.push(...permissionCodesConst(rows))
  return lines.join('\n')
}
function parseTables() {
  const file = path.join(root, 'server/rdbms/src/main/resources/scripts/init-mysql.sql')
  const text = fs.readFileSync(file, 'utf8')
  const rows = []
  const re = /CREATE TABLE (?:IF NOT EXISTS )?`([^`]+)` \(([\s\S]*?)\) ENGINE=/g
  for (const m of text.matchAll(re)) {
    const columns = []
    for (const cm of m[2].matchAll(/^\s*`([^`]+)`\s+([^\s,]+)/gm)) columns.push(cm[1] + ':' + cm[2])
    rows.push({ table: m[1], columns })
  }
  return rows
}

function dbDoc() {
  const lines = header('server/rdbms/src/main/resources/scripts/init-mysql.sql + scripts/nas/migrate/*.sql')
  lines.push('# 数据库结构（生成）', '')
  lines.push('> 表与会话来自初始化 SQL；迁移脚本决定现网增量。改结构时同时更新 `init-mysql.sql` 和新增迁移。', '')
  lines.push('## 表', '')
  lines.push('| 表 | 列（名称:类型，节选） |', '|---|---|')
  for (const row of parseTables()) lines.push('| `' + row.table + '` | ' + row.columns.slice(0, 12).join('<br>') + ' |')
  lines.push('', '## 迁移脚本', '')
  const dir = path.join(root, 'scripts/nas/migrate')
  const migrations = fs.readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()
  for (const name of migrations) lines.push('- `scripts/nas/migrate/' + name + '`')
  lines.push('')
  return lines.join('\n')
}

function moduleStatus() {
  const modules = loadModules()
  const all = walk(root).map(rel)
  const lines = header('docs/modules/*.md frontmatter')
  lines.push('# 文档状态（生成）', '')
  lines.push('> `source_globs` 命中的文件数只是覆盖规模；是否过期看 `verified_against`。', '')
  lines.push('| 模块 | 最后核对 | 核对 commit | 覆盖文件数 |', '|---|---|---|---|')
  for (const m of modules) {
    const count = all.filter((file) => matchesAny(file, m.source_globs || [])).length
    lines.push('| `' + m.id + '` | ' + (m.last_verified || '—') + ' | `' + (m.verified_against || '—') + '` | ' + count + ' |')
  }
  lines.push('')
  return lines.join('\n')
}

function llmsDoc() {
  const base = (process.env.DOCS_BASE || 'https://hermannmayer.github.io/xuri-classroom/').replace(/\/$/, '')
  const dirs = ['start', 'architecture', 'modules', 'flows', 'reference', 'decisions']
  const pages = []
  for (const dir of dirs) {
    for (const file of walk(path.join(docsDir, dir))) {
      if (!file.endsWith('.md')) continue
      const { data, body } = readFrontmatter(file)
      const heading = (body.match(/^#\s+(.+)$/m) || [])[1] || ''
      const relDoc = rel(file).replace(/^docs\//, '').replace(/\.md$/, '')
      pages.push({ rel: relDoc, title: data.title || heading || relDoc, description: data.description || '' })
    }
  }
  pages.sort((a, b) => a.rel.localeCompare(b.rel))
  const lines = ['# 旭日云课堂 · 开发文档', '', '> AI 可读的站点目录；正文在 Markdown 源文件中，站点只是渲染层。', '']
  lines.push('## 文档', '')
  for (const p of pages) lines.push('- [' + p.title + '](' + base + '/' + p.rel + ')' + (p.description ? ': ' + p.description : ''))
  lines.push('', '## 机器索引', '', '- [模块索引](' + base + '/../ai/modules.yaml)', '- [任务配方](' + base + '/../ai/task-recipes.md)', '')
  return lines.join('\n')
}

function main() {
  if (!fs.existsSync(path.join(docsDir, 'modules'))) {
    console.error('缺少 docs/modules/')
    process.exit(1)
  }
  moduleIndex()
  add('docs/reference/routes.md', routesDoc())
  add('docs/reference/api.md', apiDoc())
  add('docs/reference/permissions.md', permissionsDoc())
  add('client/src/auth/permission-codes.ts', permissionCodesTs())
  add('docs/reference/db-schema.md', dbDoc())
  add('docs/status.md', moduleStatus())
  add('docs/public/llms.txt', llmsDoc())

  let changed = 0
  for (const item of outputs) {
    fs.mkdirSync(path.dirname(item.file), { recursive: true })
    const result = writeIfChanged(item.file, item.content, checkOnly)
    if (result.changed) {
      changed += 1
      console.log((checkOnly ? 'STALE ' : 'WRITE ') + rel(item.file))
    }
  }
  if (checkOnly && changed > 0) {
    console.error('\n生成文件已漂移：先运行 npm run docs:gen 并提交。')
    process.exit(1)
  }
  console.log(checkOnly ? '生成文件已是最新' : '生成完成：' + outputs.length + ' 个文件')
}

main()
