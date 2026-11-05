// 为每个页面 chunk 生成结构摘要：模块、导出、i18n 文案、组件使用、表单字段、表格列、接口线索
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("pretty");
const i18n = new Map();
for (const line of fs.readFileSync("extract/i18n.tsv", "utf8").split("\n")) {
  const [k, ...rest] = line.split("\t");
  if (k && !k.startsWith("(no-id)")) i18n.set(k, rest.join("\t"));
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(DIR).filter((f) => f.startsWith("p__")).sort();

const outDir = path.resolve("digest");
fs.mkdirSync(outDir, { recursive: true });

for (const f of files) {
  const lines = fs.readFileSync(path.join(DIR, f), "utf8").split("\n");
  const starts = [];
  lines.forEach((l, i) => {
    const m = l.match(/^ {4}(\d+): function/);
    if (m) starts.push({ module: +m[1], start: i });
  });
  const buf = [`# ${f}`];
  starts.forEach((s, i) => {
    const end = (starts[i + 1]?.start ?? lines.length) - 1;
    const body = lines.slice(s.start, end + 1);
    const text = body.join("\n");
    buf.push(`\n## module ${s.module}  lines ${s.start + 1}-${end + 1}`);
    const exp = [...text.matchAll(/^\s{6}([A-Za-z_$][\w$]*): function \(\) \{\n\s{8}return ([\w$]+);/gm)].map((m) => `${m[1]}->${m[2]}`);
    if (exp.length) buf.push(`exports: ${[...new Set(exp)].join(", ")}`);
    else {
      const ex2 = text.match(/s\.d\(t, \{([\s\S]{0,500}?)\n\s{6}\}\)\);/);
      if (ex2) buf.push(`exports: ${ex2[1].replace(/\s+/g, " ").slice(0, 400)}`);
    }
    // i18n
    const keys = [...text.matchAll(/id: "((?:pages|app|common|component|menu|global)\.[^"]+)"/g)].map((m) => m[1]);
    if (keys.length) {
      const uniq = [...new Set(keys)];
      buf.push(`i18n(${uniq.length}):`);
      for (const k of uniq) buf.push(`  - ${k.replace(/^pages\./, "")} = ${i18n.get(k) ?? "?"}`);
    }
    // 组件使用次数
    const comps = {};
    for (const m of text.matchAll(/\(0, [a-zA-Z_$]+\.jsx\)?\(\s*([a-zA-Z_$]+)\.([A-Za-z_$][\w$]*)/g)) {
      const k = `${m[1]}.${m[2]}`;
      comps[k] = (comps[k] || 0) + 1;
    }
    const top = Object.entries(comps).sort((a, b) => b[1] - a[1]).slice(0, 40);
    if (top.length) buf.push(`jsx: ` + top.map(([k, v]) => `${k}×${v}`).join(" "));
    // 字符串标签
    const labels = [...text.matchAll(/(?:label|title|placeholder|tooltip|headerTitle|text): "([^"]{1,40})"/g)].map((m) => m[1]);
    if (labels.length) buf.push(`labels: ${[...new Set(labels)].slice(0, 60).join(" / ")}`);
    // 表单字段
    const names = [...text.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]);
    if (names.length) buf.push(`name: ${[...new Set(names)].slice(0, 80).join(", ")}`);
    // 表格列
    const cols = [...text.matchAll(/dataIndex: "([^"]+)"/g)].map((m) => m[1]);
    if (cols.length) buf.push(`dataIndex: ${[...new Set(cols)].join(", ")}`);
    // 接口线索
    const apis = [...text.matchAll(/["'`]([\/a-zA-Z0-9_.:${}\-]*(?:api|survey|repo|project|user|system|answer|template|flow|report|dict|dept|role|position|setting)[\/a-zA-Z0-9_.:${}\-]*)["'`]/gi)]
      .map((m) => m[1])
      .filter((x) => x.includes("/") && x.length > 3 && !x.includes(" "));
    if (apis.length) buf.push(`strings: ${[...new Set(apis)].slice(0, 60).join(", ")}`);
    const svc = [...text.matchAll(/\(0, [a-zA-Z_$]+\.([A-Za-z_$][\w$]*)\)\(/g)].map((m) => m[1]);
    if (svc.length) buf.push(`calls: ${[...new Set(svc)].slice(0, 40).join(", ")}`);
  });
  fs.writeFileSync(path.join(outDir, f.replace(/\.async\.js$/, ".md")), buf.join("\n"));
  console.log(`${f} -> digest/${f.replace(/\.async\.js$/, ".md")} (${buf.join("\n").length} chars)`);
}
