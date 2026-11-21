#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成一份覆盖新题型的导入测试 xlsx（含一张内嵌图片）。

只用于验收，放到 scripts/nas 下方便复用；不会被打包进服务端。
用法：python scripts/nas/make-import-sample.py --out %TEMP%/import-sample.xlsx
"""
import argparse
import os
import struct
import zlib

from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage


PNG = (
    b'\x89PNG\r\n\x1a\n' + struct.pack('>I', 13) + b'IHDR' +
    struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0) +
    struct.pack('>I', zlib.crc32(b'IHDR' + struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))) +
    struct.pack('>I', 12) + b'IDAT' + zlib.compress(b'\x00\xff\x00\x00') +
    struct.pack('>I', zlib.crc32(b'IDAT' + zlib.compress(b'\x00\xff\x00\x00'))) +
    struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND'))
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default=os.path.join(os.environ.get('TEMP', '.'), 'import-sample.xlsx'))
    args = parser.parse_args()

    wb = Workbook()
    wb.remove(wb.active)


    ws = wb.create_sheet('下拉题')
    ws.append(['序号', '章节', '题干', '分数', '答案', '选项A', '选项B', '选项C'])
    ws.append([1, '第一章', '养老护理员应具备的职业素养是？', 5, 'B', '只看技能', '技能与职业道德并重', '只服务熟人'])


    ws = wb.create_sheet('矩阵单选题')
    header = ['序号', '章节', '题干', '分数', '答案', '解析', '标签']
    header += ['行标题%d' % i for i in range(1, 11)]
    header += ['列标题%d' % i for i in range(1, 11)]
    ws.append(header)
    row = [2, '第二章', '请评价以下项目的满意度', 10, 'A|B', None, None]
    row += ['服务态度', '响应速度'] + [None] * 8
    row += ['满意', '一般', '不满意'] + [None] * 7
    ws.append(row)


    ws = wb.create_sheet('评分题')
    ws.append(['序号', '题干', '分数', '高级配置(JSON)'])
    ws.append([3, '请为本次培训打分', 5, '{"attribute":{"required":true}}'])


    ws = wb.create_sheet('上传题')
    ws.append(['序号', '题干', '分数', '答案'])
    ws.append([4, '请上传实操现场照片', 5, '单张正面照'])


    ws = wb.create_sheet('简答题')
    ws.append(['序号', '题干', '分数', '答案'])
    ws.append([5, '简述老年人跌倒后的处理流程', 10, '先评估意识与呼吸，再呼救'])
    img_path = args.out + '.png'
    with open(img_path, 'wb') as fh:
        fh.write(PNG)
    picture = XLImage(img_path)
    picture.anchor = 'E2'
    ws.add_image(picture)

    wb.save(args.out)
    print('已生成', args.out, os.path.getsize(args.out), '字节')
    try:
        os.remove(img_path)
    except OSError:
        pass


if __name__ == '__main__':
    main()
