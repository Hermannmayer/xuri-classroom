// 解析后端 *Api.java / *Controller.java，输出每个 @XxxMapping 的：HTTP 方法、完整路径、方法名、返回类型、参数列表、PreAuthorize、Javadoc
// 用法: node api-backend-index.mjs <serverRoot> > out-api-backend.json
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] || "../../SurveyKing/server");
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      if (f.name === "static" || f.name === "node_modules" || f.name === "target") continue;
      walk(p);
    } else if (f.name.endsWith("Api.java") || f.name.endsWith("Controller.java")) files.push(p);
  }
})(ROOT);

// 去掉字符串字面量里的干扰，但保留原文用于取路径
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

const out = [];
for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const src = stripComments(raw);
  const lines = src.split("\n");
  const classBase = ((raw.match(/@RequestMapping\("([^"]+)"\)\s*(?:\n\s*@\w+(?:\([^)]*\))?\s*)*\npublic class/) || [])[1] || "")
    .replace("${api.prefix}", "/api");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*@(Get|Post|Put|Delete|Patch|Request)Mapping(?:\((.*)\))?\s*$/);
    if (!m) continue;
    let verb = m[1];
    let sub = "";
    if (m[2]) {
      const sv = m[2].match(/["']([^"']*)["']/);
      if (sv) sub = sv[1];
      const mv = m[2].match(/RequestMethod\.(\w+)/);
      if (mv) verb = mv[1].charAt(0) + mv[1].slice(1).toLowerCase();
    }
    // 类级 @RequestMapping 已单独处理，跳过（它不带 / 结尾的子路径时会被误当成方法）
    if (/^@RequestMapping/.test(lines[i])) continue;
    // 收集方法签名：从下一行起，直到出现 '{' 或 ';'
    let stmt = "",
      auth = null,
      startLine = -1;
    for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
      const t = lines[j];
      const a = t.match(/@PreAuthorize\("hasAuthority\('([^']+)'\)"\)/);
      if (a) auth = a[1];
      if (/^\s*public\s/.test(t) && startLine < 0) {
        startLine = j;
        stmt = t.trim();
      } else if (startLine >= 0) stmt += " " + t.trim();
      if (startLine < 0) continue;
      if (/^\s*public\s/.test(t) && /\{\s*$/.test(t)) {
        stmt = stmt.replace(/\s*\{\s*$/, "");
        break;
      }
      if (/^\s*public\s/.test(t)) {
        // 多行签名
        let k = j;
        while (k < lines.length - 1 && !/[;{]\s*(\/\/.*)?$/.test(lines[k]) && !/\)\s*$/.test(lines[k])) {
          k++;
          stmt += " " + lines[k].trim();
        }
        stmt = stmt.replace(/\s*\{\s*$/, "").replace(/\s*;\s*$/, "");
        break;
      }
    }
    if (startLine < 0) continue;
    // javadoc
    let javadoc = null;
    for (let j = startLine - 1; j >= Math.max(0, i - 60); j--) {
      if (/^\s*@\w+/.test(lines[j]) || lines[j].trim() === "") continue;
      if (/\*\/\s*$/.test(lines[j])) {
        const doc = [];
        for (let k = j; k >= 0; k--) {
          doc.unshift(lines[k].trim());
          if (/\/\*\*/.test(lines[k])) break;
        }
        javadoc = doc
          .map((t) => t.replace(/^\/\*\*|\*\/$|\*/g, "").trim())
          .filter(Boolean)
          .join(" | ");
        break;
      }
      break;
    }
    const norm = stmt.replace(/\s+/g, " ");
    const sm = norm.match(/^public (?:static )?(?:final )?([\w<>,.\[\]\s?]+?) (\w+) ?\((.*)\) ?(?:throws [\w., ]+)?$/);
    let ret = "?", name = "?", paramsRaw = "";
    if (sm) {
      ret = sm[1].trim();
      name = sm[2];
      paramsRaw = sm[3];
    }
    const params = [];
    let depth = 0,
      cur = "";
    for (const ch of paramsRaw) {
      if ("<(".includes(ch)) depth++;
      if (">)".includes(ch)) depth--;
      if (ch === "," && depth === 0) {
        params.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    if (cur.trim()) params.push(cur.trim());
    out.push({
      file: path.relative(ROOT, file).replace(/\\/g, "/"),
      class: path.basename(file, ".java"),
      line: i + 1,
      method: verb.toUpperCase(),
      path: (classBase + sub).replace(/\/$/, "") || "/",
      javaMethod: name,
      auth,
      returns: ret,
      params: params.filter(Boolean).map((p) => {
        const ann = (p.match(/@(\w+)/g) || []).map((x) => x.slice(1));
        const body = p.replace(/@\w+(\([^)]*\))?\s*/g, "").trim();
        const bm = body.match(/^(?:final )?([\w<>,.\[\]\s?]+?) (\w+)$/);
        return { ann, type: bm ? bm[1].trim() : body, name: bm ? bm[2] : "?" };
      }),
      javadoc,
    });
  }
}
out.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));
console.log(JSON.stringify(out, null, 1));
console.error(`total ${out.length} mappings from ${files.length} files`);
