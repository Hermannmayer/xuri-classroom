# 答卷 PDF 字体

`answer-pdf.ttf` 用于服务端生成答卷/成绩单 PDF（后端容器是 alpine，没有中文字体，必须自带）。

## 来源与许可

- 上游字体：**霞鹜文楷 LXGW WenKai**（`LXGWWenKai-Regular.ttf`，v1.530）
- 上游地址：https://github.com/lxgw/LxgwWenKai/releases/tag/v1.530
- 许可证：**SIL Open Font License 1.1**（OFL-1.1），允许商用与再分发；再分发需保留本说明并保持同许可。
- 本目录的 `answer-pdf.ttf` 是**子集**：只保留 ASCII、Latin-1 补充、通用标点、CJK 标点、全角字符与 CJK 统一汉字（U+4E00–U+9FFF），
  并用 `fonttools` 去掉 hinting / GSUB / GPOS / GDEF，体积从 25.9MB 压到约 12.6MB。

## 重新生成子集

```bash
python -m pip install fonttools
python -m fontTools.subset LXGWWenKai-Regular.ttf \
  --output-file=answer-pdf.ttf \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2000-206F,U+3000-303F,U+4E00-9FFF,U+FF00-FFEF" \
  --no-hinting --desubroutinize --drop-tables+=GSUB,GPOS,GDEF --name-IDs='*'
```

## 注意

- PDFBox 2.x 的 `PDType0Font.load` **只支持 TrueType（TTF）**，不支持 OTF/CFF；换字体时务必确认格式。
- 每个 `PDDocument` 必须重新 `load`（字体对象不能跨文档复用），但字体**字节数组**可以在启动时缓存一次。
- 若将来需要覆盖更生僻的姓名用字（CJK 扩展 B 区等），把对应 `U+20000–U+2A6DF` 加进 `--unicodes` 并重新子集化。