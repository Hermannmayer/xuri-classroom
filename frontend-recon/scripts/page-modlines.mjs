// 列出每个页面 chunk 内各模块的起止行，便于定向阅读
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("pretty");
const files = fs.readdirSync(DIR).filter((f) => f.startsWith("p__")).sort();
const out = {};

for (const f of files) {
  const lines = fs.readFileSync(path.join(DIR, f), "utf8").split("\n");
  const starts = [];
  lines.forEach((l, i) => {
    const m = l.match(/^ {4}(\d+): function/);
    if (m) starts.push({ module: +m[1], start: i + 1 });
  });
  starts.forEach((s, i) => {
    s.end = (starts[i + 1]?.start ?? lines.length) - 1;
    s.lines = s.end - s.start + 1;
  });
  out[f] = starts;
}
fs.writeFileSync("out-module-lines.json", JSON.stringify(out, null, 1));
for (const [f, mods] of Object.entries(out)) {
  console.log(
    f +
      "\n  " +
      mods
        .map((m) => `${m.module}@${m.start}+${m.lines}`)
        .join("  "),
  );
}
