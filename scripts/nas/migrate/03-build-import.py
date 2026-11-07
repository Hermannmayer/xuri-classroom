#!/usr/bin/env python3
# =============================================================================
# 第 3 步：把 H2 的 CSV 转成 MySQL 的 INSERT 脚本
#
# 输入：
#   --csv-dir   02-export-csv.sh 导出的 CSV 目录（NULL 用 ##NULL## 标记）
#   --schema    仓库里的 init-mysql.sql（目标表结构 + 种子数据）
# 输出：
#   --out       可以直接喂给 mysql 客户端的 SQL 文件
#
# 规则（都是实测出来的，不是猜的）：
#   · H2 的列名是全大写，MySQL 是小写 → 按名字不区分大小写对齐
#   · MySQL 里有、H2 里没有的列 → 不写，交给默认值（只有 4 个可空新列）
#   · H2 里有、MySQL 里没有的列 → 丢弃并报告
#   · 生成列（GENERATED ALWAYS AS）不能 INSERT → 跳过（实测只有 t_account.oauth_identity_key）
#   · CSV 里 ##NULL## = NULL；空字段 = 空字符串（这个区别踩过一次坑）
#   · 导入前先 DELETE 整表，避免和 init-mysql.sql 里的种子数据撞主键
#
# 用法（在 NAS 上）：
#   python3 scripts/nas/migrate/03-build-import.py \
#     --csv-dir /vol2/1000/xuri/work/csv \
#     --schema  server/rdbms/src/main/resources/scripts/init-mysql.sql \
#     --out     /vol2/1000/xuri/work/import.sql
# =============================================================================
import argparse, csv, io, os, re, sys

NULL_TOKEN = '##NULL##'

def split_top(s):
    out, buf, depth = [], [], 0
    for ch in s:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(''.join(buf)); buf = []
        else:
            buf.append(ch)
    if ''.join(buf).strip():
        out.append(''.join(buf))
    return out

CREATE_RE = re.compile(
    r'CREATE TABLE(?: IF NOT EXISTS)? `([a-z0-9_]+)` \((.*?)\n\)\s*ENGINE', re.S | re.I)

def parse_schema(path):
    text = open(path, encoding='utf-8').read()
    tables = {}
    for m in CREATE_RE.finditer(text):
        name, body = m.group(1), m.group(2)
        cols, generated = [], set()
        for part in split_top(body):
            p = part.strip()
            if not p.startswith('`'):
                continue
            cm = re.match(r'`([a-z0-9_]+)`\s+([a-zA-Z0-9_]+(?:\([^)]*\))?)', p, re.I)
            if not cm:
                continue
            col = cm.group(1).lower()
            cols.append(col)
            if re.search(r'GENERATED\s+ALWAYS\s+AS', p, re.I):
                generated.add(col)
        tables[name.lower()] = {'columns': cols, 'generated': generated}
    return tables

def sql_value(v):
    if v == NULL_TOKEN:
        return 'NULL'
    return "'" + (v.replace('\\', '\\\\').replace("'", "\\'")
                   .replace('\n', '\\n').replace('\r', '\\r')
                   .replace('\0', '\\0')) + "'"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--csv-dir', required=True)
    ap.add_argument('--schema', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--batch', type=int, default=200)
    args = ap.parse_args()

    schema = parse_schema(args.schema)
    files = sorted(f for f in os.listdir(args.csv_dir) if f.lower().endswith('.csv'))
    if not files:
        sys.exit(f'❌ {args.csv_dir} 里没有 CSV')

    out = io.StringIO()
    out.write('-- 由 03-build-import.py 生成\n')
    out.write('SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n')
    out.write("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';\n\n")

    report, total_rows = [], 0
    for fn in files:
        table = fn[:-4].lower()
        if table not in schema:
            report.append((fn[:-4], '跳过（目标库没有这张表）', 0, []))
            continue
        with open(os.path.join(args.csv_dir, fn), newline='', encoding='utf-8') as fh:
            rows = list(csv.reader(fh))
        if not rows:
            continue
        header = [h.strip().lower() for h in rows[0]]
        target = schema[table]
        skip_gen = target['generated']

        keep_idx = [i for i, h in enumerate(header) if h in target['columns'] and h not in skip_gen]
        keep_cols = [header[i] for i in keep_idx]
        dropped = [h for i, h in enumerate(header) if h not in target['columns'] and h]

        body_rows = [r for r in rows[1:] if any(x != '' and x != NULL_TOKEN for x in r)]
        if not body_rows:
            report.append((fn[:-4], '空表（不导）', 0, dropped))
            continue

        out.write(f'\n-- {fn[:-4]}：{len(body_rows)} 行\n')
        out.write(f'DELETE FROM `{table}`;\n')
        collist = ', '.join(f'`{c}`' for c in keep_cols)
        for start in range(0, len(body_rows), args.batch):
            chunk = body_rows[start:start + args.batch]
            vals = []
            for r in chunk:
                r = r + [''] * (len(header) - len(r))
                vals.append('(' + ', '.join(sql_value(r[i]) for i in keep_idx) + ')')
            out.write(f'INSERT INTO `{table}` ({collist}) VALUES\n' + ',\n'.join(vals) + ';\n')
        total_rows += len(body_rows)
        report.append((fn[:-4], '导入', len(body_rows), dropped))

    with open(args.out, 'w', encoding='utf-8') as fh:
        fh.write(out.getvalue())

    print(f'{"表":<22}{"处理":<12}{"行数":>8}   丢弃列')
    for name, action, n, dropped in report:
        print(f'{name:<22}{action:<12}{n:>8}   {",".join(dropped) if dropped else ""}')
    print(f'\n合计导入 {total_rows} 行 → {args.out}  ({os.path.getsize(args.out)/1024/1024:.1f} MB)')

if __name__ == '__main__':
    main()
