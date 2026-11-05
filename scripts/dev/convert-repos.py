# -*- coding: utf-8 -*-
"""把「单 sheet + 题型列」的复习题 Excel 转成 SurveyKing 题库模板格式。"""
import sys, os
import openpyxl
import xlsxwriter
from collections import defaultdict

SHEET_MAP = {'单选题':'单选题','多选题':'多选题','判断题':'判断题','填空题':'填空题','简答题':'简答题'}
HEADER = ['序号','题干','分数','选项A','选项B','选项C','选项D','选项E','答案']

def read_source(src_path):
    wb = openpyxl.load_workbook(src_path, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = list(ws.iter_rows(min_row=1, values_only=True))
    if not rows: return {}
    header = [str(c).strip() if c else '' for c in rows[0]]
    # 两种源格式：带「序号」列 → 题型在第 2 列；不带 → 题型在第 1 列
    base = 1 if (header and header[0] == '序号') else 0
    buckets = defaultdict(list)
    for row in rows[1:]:
        if not row or len(row) <= base + 1: continue
        qtype = str(row[base]).strip() if row[base] else ''
        sheet = SHEET_MAP.get(qtype)
        if not sheet: continue
        title = str(row[base + 1]).strip() if row[base + 1] else ''
        if not title: continue
        options = [str(c).strip() if c else '' for c in row[base + 2:base + 7]]
        ai = base + 7
        answer = str(row[ai]).strip() if len(row) > ai and row[ai] else ''
        buckets[sheet].append((title, options, answer))
    return buckets

def write_target(buckets, out_path):
    wb = xlsxwriter.Workbook(out_path, {'strings_to_numbers': False, 'strings_to_formulas': False})
    for sheet_name, items in buckets.items():
        ws = wb.add_worksheet(sheet_name)
        for col, text in enumerate(HEADER): ws.write(0, col, text)
        for index, (title, options, answer) in enumerate(items, start=1):
            ws.write(index, 0, index); ws.write(index, 1, title); ws.write(index, 2, 5)
            for offset, option in enumerate(options): ws.write(index, 3 + offset, option)
            ws.write(index, 8, answer)
    wb.close()

def convert(src_path, out_path):
    buckets = read_source(src_path)
    if not buckets: return {}
    write_target(buckets, out_path)
    return {name: len(items) for name, items in buckets.items()}

if __name__ == '__main__':
    src_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    report = []
    for name in sorted(os.listdir(src_dir)):
        if not name.lower().endswith('.xlsx') or name.startswith('~'): continue
        stats = convert(os.path.join(src_dir, name), os.path.join(out_dir, name))
        report.append(f'{name}: ' + (', '.join(f'{k} {v}' for k, v in stats.items()) or '（未识别题型）'))
    open(os.path.join(out_dir, '_report.txt'), 'w', encoding='utf-8').write('\n'.join(report))
    print('\n'.join(report))
