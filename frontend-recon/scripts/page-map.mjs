// 建立 chunk -> 模块 -> 页面 的映射，供页面还原用
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("pretty");
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".js"));

/** @type {Map<string,{file:string,ids:number[],modules:number[]}>} */
const chunkOf = new Map();
const moduleOwner = new Map(); // moduleId -> file
const pageInfo = [];

for (const f of files) {
  const js = fs.readFileSync(path.join(DIR, f), "utf8");
  const head = js.slice(0, 400);
  const m = head.match(/push\(\[\s*\[([\d,\s]+)\]/);
  const ids = m ? m[1].split(",").map((x) => +x.trim()).filter(Boolean) : [];
  const modules = [...js.matchAll(/^ {4}(\d+): function/gm)].map((x) => +x[1]);
  for (const id of ids) chunkOf.set(id, { file: f, ids, modules });
  for (const mod of modules) if (!moduleOwner.has(mod)) moduleOwner.set(mod, f);
}

const pageFiles = files.filter((f) => f.startsWith("p__")).sort();
for (const f of pageFiles) {
  const js = fs.readFileSync(path.join(DIR, f), "utf8");
  const needs = [...new Set([...js.matchAll(/\.e\((\d+)\)/g)].map((x) => +x[1]))];
  const binds = [...new Set([...js.matchAll(/bind\([a-zA-Z_$]+,\s*(\d+)\)/g)].map((x) => +x[1]))];
  // 页面自身模块（本 chunk 内定义的 module）
  const own = [...js.matchAll(/^ {4}(\d+): function/gm)].map((x) => +x[1]);
  pageInfo.push({
    page: f,
    size: fs.statSync(path.join(DIR, f)).size,
    ownModules: own,
    lazyBinds: binds.map((mod) => ({ module: mod, inChunk: chunkOf.get(needs.find((n) => chunkOf.get(n)?.modules.includes(mod)) ?? -1)?.file ?? null, file: moduleOwner.get(mod) ?? null })),
    needsChunks: needs,
  });
}

fs.writeFileSync("out-page-map.json", JSON.stringify(pageInfo, null, 1));
for (const p of pageInfo) {
  const impl = p.lazyBinds.map((b) => b.file).filter(Boolean);
  console.log(`${p.page}\town=${p.ownModules.length}\tneeds=${p.needsChunks.length}\timpl=${impl.join(",") || "-"}`);
}
