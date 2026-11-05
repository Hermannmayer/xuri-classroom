// 行扫描解析 umi 路由表：path / name / bind(module) -> 所属 chunk 文件
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("pretty");
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js"));
const owner = new Map();
const chunkInfo = new Map();

for (const f of files) {
  const js = fs.readFileSync(path.join(DIR, f), "utf8");
  const m = js.slice(0, 400).match(/push\(\[\s*\[([\d,\s]+)\]/);
  const ids = m ? m[1].split(",").map((x) => +x.trim()).filter(Boolean) : [];
  const modules = [...js.matchAll(/^ {4}(\d+): function/gm)].map((x) => +x[1]);
  chunkInfo.set(f, { ids, modules });
  for (const mod of modules) if (!owner.has(mod)) owner.set(mod, f);
}

const umi = fs.readFileSync(path.join(DIR, "umi.ded23be0.js"), "utf8").split("\n");
const start = umi.findIndex((l) => l.trim() === "var e = [");
const routes = [];
let cur = null;
for (let i = start; i < umi.length; i++) {
  const l = umi[i];
  const pm = l.match(/^\s*path: "([^"]+)",?$/);
  if (pm) {
    cur = { path: pm[1], name: null, module: null, layout: null };
    routes.push(cur);
    continue;
  }
  if (!cur) continue;
  const nm = l.match(/^\s*name: "([^"]+)",?$/);
  if (nm && !cur.name) cur.name = nm[1];
  const lm = l.match(/^\s*layout: (!?\w+),?$/);
  if (lm) cur.layout = lm[1];
  const bm = l.match(/r\.bind\(r, (\d+)\)/);
  if (bm) {
    cur.module = +bm[1];
    if (cur === routes[routes.length - 1]) cur = null;
  }
}
fs.writeFileSync("out-route-owner.json", JSON.stringify(routes.map((r) => ({ ...r, file: owner.get(r.module) ?? null })), null, 1));
for (const r of routes) console.log(`${r.path}\t${r.name ?? "-"}\t${r.module ?? "-"}\t${owner.get(r.module) ?? "-"}`);
