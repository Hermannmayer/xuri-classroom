// 把 webcrack 拆出来的函数体包装成可 require 的模块
import fs from 'node:fs';
import path from 'node:path';

const srcDir = process.argv[2] || 'dec_umi';
const outDir = process.argv[3] || 'modules3';
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter((f) => /^\d+\.js$/.test(f));
const index = {};

for (const f of files) {
  const id = f.replace(/\.js$/, '');
  let body = fs.readFileSync(path.join(srcDir, f), 'utf8');

  // webcrack 把少数模块还原成 ESM，这里转回 webpack 的 require 形式
  body = body
    .replace(/^\s*import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+"\.\/(\d+)\.js";?/gm, 'var $1 = require("$2");')
    .replace(/^\s*import\s+\{([^}]+)\}\s+from\s+"\.\/(\d+)\.js";?/gm, (_m, names, dep) => {
      const bindings = names
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const [orig, alias] = s.split(/\s+as\s+/).map((x) => x.trim());
          return alias ? `var ${alias} = __m.${orig};` : `var ${orig} = __m.${orig};`;
        })
        .join(' ');
      return `var __m = require("${dep}"); ${bindings}`;
    })
    .replace(/^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+"\.\/(\d+)\.js";?/gm, 'var $1 = require("$2").default || require("$2");')
    .replace(/^\s*export\s+default\s+/gm, 'exports.default = ')
    .replace(/^\s*export\s+\{([^}]+)\};?/gm, (_m, names) =>
      names
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const [orig, alias] = s.split(/\s+as\s+/).map((x) => x.trim());
          return `exports.${alias || orig} = ${orig};`;
        })
        .join(' ')
    );

  const wrapped =
    `// webpack module ${id} — body from webcrack\n` +
    `module.exports = function (module, exports, require) {\n${body}\n};\n`;
  fs.writeFileSync(path.join(outDir, f.replace(/\.js$/, '.cjs')), wrapped);
  index[id] = { chunk: path.basename(srcDir) + '.js', size: body.length };
}

fs.writeFileSync(path.join(outDir, '_index.json'), JSON.stringify(index, null, 2));
console.log(`包装 ${files.length} 个模块 → ${outDir}`);
