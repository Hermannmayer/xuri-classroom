// 提取 DTO 字段：类名 -> {file, extends, fields[{type,name,comment,tags}]}
// 用法: node api-dto-index.mjs > out-api-dto.json
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] || "../../SurveyKing/server");
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      if (["static", "node_modules", "target"].includes(f.name)) continue;
      walk(p);
    } else if (f.name.endsWith(".java")) files.push(p);
  }
})(ROOT);

const out = {};
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  // 类声明行
  const stack = [];
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cm = line.match(/(?:^|\s)(?:public\s+|protected\s+|private\s+)?(?:static\s+)?(?:final\s+)?(class|interface|enum|record)\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+([\w<>,.\s]+?))?(?:\s+implements\s+[\w<>,.\s]+)?\s*\{?/);
    if (cm && !/^\s*(\*|\/\/)/.test(line)) {
      stack.push({ kind: cm[1], name: cm[2], extends: cm[3] ? cm[3].trim() : null, startLine: i + 1, depth, fields: [] });
    }
    // 字段
    const fm = line.match(/^\s*(?:private|protected|public)\s+(?!static\s+final\s+String\s+\w+\s*=\s*")([A-Za-z_][\w<>,.\[\]?\s]*?)\s+(\w+)\s*(?:=[^;]*)?;\s*(?:\/\/\s*(.*))?$/);
    if (fm && stack.length) {
      const tags = [];
      for (let k = i - 1; k >= Math.max(0, i - 5); k--) {
        const a = lines[k].match(/@(\w+)/g);
        if (a) tags.push(...a.map((x) => x.slice(1)));
        if (/^\s*(private|protected|public)\s/.test(lines[k]) || /;\s*$/.test(lines[k])) break;
      }
      stack[stack.length - 1].fields.push({ type: fm[1].trim(), name: fm[2], comment: fm[3] || "", tags });
    }
    // 大括号深度
    for (const ch of line) {
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        while (stack.length && depth <= stack[stack.length - 1].depth) {
          const c = stack.pop();
          const full = [...stack.map((s) => s.name), c.name].join(".");
          if (!out[full]) out[full] = { kind: c.kind, file: path.relative(ROOT, file).replace(/\\/g, "/"), line: c.startLine, extends: c.extends, fields: c.fields };
        }
      }
    }
  }
}
console.log(JSON.stringify(out, null, 1));
console.error(`classes=${Object.keys(out).length}`);
