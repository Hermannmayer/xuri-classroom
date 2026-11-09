import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const docsDir = path.join(root, 'docs')
export const modulesDir = path.join(docsDir, 'modules')

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'target', '.gradle', '.vitepress', '.idea'])

export function walk(dir = root, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(path.join(dir, entry.name), out)
    } else {
      out.push(path.join(dir, entry.name))
    }
  }
  return out
}

export function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/')
}

export function readFrontmatter(file) {
  const text = fs.readFileSync(file, 'utf8')
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { data: {}, body: text, prefix: '' }
  const data = YAML.parse(match[1]) || {}
  return { data, body: text.slice(match[0].length), prefix: match[0] }
}

export function frontmatterText(data) {
  const fm = YAML.stringify(data, { lineWidth: 0 }).trimEnd()
  return `---\n${fm}\n---\n`
}

export function writeFrontmatter(file, data, body) {
  const cleanBody = body.replace(/^\n+/, '')
  fs.writeFileSync(file, `${frontmatterText(data)}\n${cleanBody}`, 'utf8')
}

export function loadModules() {
  return walk(modulesDir)
    .filter((file) => file.endsWith('.md') && !path.basename(file).startsWith('_'))
    .map((file) => {
      const { data, body } = readFrontmatter(file)
      return { ...data, file, doc: rel(file), body }
    })
    .filter((m) => m.status === 'current')
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
}

export function globToRegExp(glob) {
  const normalized = glob.replaceAll('\\', '/').replace(/^\.\//, '')
  let re = '^'
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i]
    if (ch === '*') {
      if (normalized[i + 1] === '*') {
        re += '.*'
        i += 1
        if (normalized[i + 1] === '/') i += 1
      } else {
        re += '[^/]*'
      }
    } else if (ch === '?') {
      re += '[^/]'
    } else {
      re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    }
  }
  re += '$'
  return new RegExp(re)
}

export function matchesGlob(file, glob) {
  return globToRegExp(glob).test(file.replaceAll(path.sep, '/'))
}

export function matchesAny(file, globs = []) {
  return globs.some((glob) => matchesGlob(file, glob))
}

export function modulesForFile(file, modules) {
  return modules.filter((m) => matchesAny(file, m.source_globs || []))
}

export function git(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

export function todayShanghai() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
}

export function writeIfChanged(file, content, checkOnly = false) {
  const normalized = content.endsWith('\n') ? content : `${content}\n`
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
  if (checkOnly) return { file, changed: old !== normalized }
  if (old !== normalized) fs.writeFileSync(file, normalized, 'utf8')
  return { file, changed: old !== normalized }
}

