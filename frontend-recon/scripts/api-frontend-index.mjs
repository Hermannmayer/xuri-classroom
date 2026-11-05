// 为每个端点定位前端调用点：文件 + 行号 + 调用表达式片段
// 用法: node api-frontend-index.mjs > out-api-frontend.json
import fs from "node:fs";
import path from "node:path";

const RECON = path.resolve("..");
const PRETTY = path.join(RECON, "pretty");
const EPS = fs
  .readFileSync(path.join(RECON, "extract", "endpoints-full.tsv"), "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => l.split("\t")[0]);

const files = fs.readdirSync(PRETTY).filter((f) => f.endsWith(".js"));
const index = Object.fromEntries(EPS.map((e) => [e, []]));

// 端点按长度倒序，优先匹配更长的（避免 /api/answer 抢 /api/answer/list）
const sorted = [...EPS].sort((a, b) => b.length - a.length);

function snippet(lines, ln, start) {
  // 取该行从字面量前 ~60 字符开始，最多 3 行
  let s = lines[ln].slice(Math.max(0, start - 60));
  let extra = 0;
  while (extra < 2 && ln + extra + 1 < lines.length && /[(,]$/.test(lines[ln + extra].trim())) {
    extra++;
    s += " " + lines[ln + extra].trim();
  }
  return s.replace(/\s+/g, " ").slice(0, 320);
}

for (const file of files) {
  const lines = fs.readFileSync(path.join(PRETTY, file), "utf8").split("\n");
  for (let ln = 0; ln < lines.length; ln++) {
    const line = lines[ln];
    if (!line.includes("/api/")) continue;
    for (const ep of sorted) {
      const base = ep.replace(/\/$/, "");
      let from = 0;
      for (;;) {
        const i = line.indexOf(base, from);
        if (i < 0) break;
        from = i + 1;
        const prev = i === 0 ? "" : line[i - 1];
        if (!/["'`/]/.test(prev)) continue;
        const next = line[i + base.length] || "";
        if (!/["'`/?+]/.test(next) && next !== "") continue;
        if (!index[ep]) index[ep] = [];
        index[ep].push({ file, line: ln + 1, snippet: snippet(lines, ln, i) });
        break; // 一行内同一端点只记一次
      }
    }
  }
}
// 去重（同 file+line）
for (const ep of Object.keys(index)) {
  const seen = new Set();
  index[ep] = index[ep].filter((h) => {
    const k = h.file + ":" + h.line;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
console.log(JSON.stringify(index, null, 1));
const missing = Object.entries(index).filter(([, v]) => v.length === 0).map(([k]) => k);
console.error(`endpoints=${EPS.length} hit=${EPS.length - missing.length} missing=${missing.length}`);
if (missing.length) console.error("MISSING:\n" + missing.join("\n"));
