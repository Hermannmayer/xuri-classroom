// 从主包里的 API 客户端对象提取「方法名 -> 端点」，并统计该方法在页面 chunk 中的使用位置
// 用法: node api-client-methods.mjs > out-api-methods.json
import fs from "node:fs";
import path from "node:path";

const RECON = path.resolve("..");
const PRETTY = path.join(RECON, "pretty");
const UMI = path.join(PRETTY, "umi.ded23be0.js");
const lines = fs.readFileSync(UMI, "utf8").split("\n");

const CALL = /(?:\.get\(|\.post\(|\.put\(|\.delete\(|\.patch\(|\.upload\(|\.download\(|getWithPagination\(|m\("(?:GET|POST|PUT|DELETE)"\s*,\s*)/;
const methods = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^ {10,14}(\w+): function \(\s*(\w*)\s*\)\s*\{/);
  if (!m) continue;
  let ep = null,
    verb = null,
    epLine = null;
  for (let j = i + 1; j < Math.min(i + 60, lines.length); j++) {
    const t = lines[j];
    const p = t.match(/(["'`])(\/api\/[^"'`]+)\1/);
    if (!p) continue;
    ep = p[2];
    epLine = j + 1;
    const ctx = t.slice(0, p.index) + t.slice(p.index);
    if (/\.upload\(/.test(ctx)) verb = "UPLOAD(POST multipart)";
    else if (/\.download\(/.test(ctx)) verb = "GET(download)";
    else if (/getWithPagination\(/.test(ctx)) verb = "GET(paged)";
    else if (/\.delete\(/.test(ctx)) verb = "DELETE";
    else if (/\.post\(|m\("POST"/.test(ctx)) verb = "POST";
    else if (/\.get\(|m\("GET"/.test(ctx)) verb = "GET";
    else verb = "?";
    break;
  }
  if (ep) methods.push({ name: m[1], arg: m[2], endpoint: ep, verb, line: i + 1, epLine });
}

// 页面侧使用位置（排除主包）
const usage = {};
const pageFiles = fs.readdirSync(PRETTY).filter((f) => f.endsWith(".js") && f !== "umi.ded23be0.js");
const pageLines = pageFiles.map((f) => [f, fs.readFileSync(path.join(PRETTY, f), "utf8").split("\n")]);
for (const mt of methods) {
  const re = new RegExp("\\b" + mt.name + "\\s*\\(");
  const hits = [];
  for (const [file, ls] of pageLines) {
    for (let i = 0; i < ls.length; i++) {
      if (re.test(ls[i])) {
        const before = ls[i].slice(0, ls[i].search(re));
        if (/\.hi\.$|\.hi\.\w*$/.test(before) || /\.hi\.$/.test(before)) hits.push({ file, line: i + 1 });
      }
    }
  }
  if (hits.length) usage[mt.name] = hits.slice(0, 8);
}
console.log(JSON.stringify({ methods, usage }, null, 1));
console.error(`methods=${methods.length} used-in-pages=${Object.keys(usage).length}`);
