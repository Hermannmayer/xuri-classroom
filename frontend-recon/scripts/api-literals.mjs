// 列出前端出现过的所有 /api/ 字面量（去重），含首末出现位置，用于和 endpoints-full.tsv 对账
// 用法: node api-literals.mjs
import fs from "node:fs";
import path from "node:path";

const PRETTY = path.resolve("..", "pretty");
const m = new Map();
for (const file of fs.readdirSync(PRETTY).filter((f) => f.endsWith(".js"))) {
  const lines = fs.readFileSync(path.join(PRETTY, file), "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const re = /["'`](\/api\/[^"'`]*)["'`]/g;
    let x;
    while ((x = re.exec(lines[i]))) {
      const lit = x[1];
      if (!m.has(lit)) m.set(lit, []);
      const arr = m.get(lit);
      if (arr.length < 6) arr.push(`${file}:${i + 1}`);
    }
  }
}
const rows = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [lit, where] of rows) console.log(`${lit}\t${where.length}\t${where.map((w) => w.split(":")[0]).filter((v, i, s) => s.indexOf(v) === i).join(",")}`);
console.error(`unique=${rows.length}`);
