package cn.surveyking.server.core.export;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Tag;

/**
 * 答卷 PDF 的字形兜底。
 *
 * <p>
 * {@code answer-pdf.ttf} 是子集字体（见 fonts/README.md 的 --unicodes），字体里没有的字形
 * 一旦直接进 {@code showText}，PDFBox 会抛 IllegalArgumentException 把**整份答卷**搞失败。
 * 导出器用白名单 {@code sanitize()} 兜住，这里同时验证两件事：
 * <ol>
 * <li>常见符号（✓ ✕ → emoji）会被替换成可渲染的等价文字，其余文字原样保留；</li>
 * <li>替换后的字符串真的能画进 PDF（端到端，不只是字符串比较）。</li>
 * </ol>
 */
@Tag("slow")
class PdfTextSanitizeTest {

	@Test
	void replacesGlyphsMissingFromTheSubsetFont() {
		String out = AnswerPdfExporter.sanitize("✓ 对 ✕ 错 → 下一步 😀 结束 (A) 8 分");

		assertFalse(out.contains("✓"), "✓ 应该被替换掉");
		assertFalse(out.contains("✕"), "✕ 应该被替换掉");
		assertFalse(out.contains("→"), "→ 应该被替换掉");
		assertFalse(out.contains("😀"), "emoji 应该被替换掉");
		assertTrue(out.contains("正确") && out.contains("错误"), "✓/✕ 应映射成「正确/错误」：" + out);
		assertTrue(out.contains("->"), "→ 应映射成 ->：" + out);
		assertTrue(out.contains("结束") && out.contains("8 分"), "正文不应被误伤：" + out);
	}

	@Test
	void handlesNullAndBlank() {
		assertTrue(AnswerPdfExporter.sanitize(null).isEmpty());
		assertTrue(AnswerPdfExporter.sanitize("").isEmpty());
	}

	@Test
	void sanitizedTextActuallyRenders() throws Exception {
		String nasty = "第 1 题 ✓ 正确 ✕ 错误 → 下一题 😀 笑脸 ★ 星号 【括号】 8 分";
		String safe = AnswerPdfExporter.sanitize(nasty);

		byte[] pdf;
		try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			PDType0Font font;
			try (InputStream in = PdfTextSanitizeTest.class.getResourceAsStream("/fonts/answer-pdf.ttf")) {
				assertTrue(in != null, "字体资源缺失");
				font = PDType0Font.load(doc, in);
			}
			PDPage page = new PDPage(PDRectangle.A4);
			doc.addPage(page);
			try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
				stream.beginText();
				stream.setFont(font, 12f);
				stream.newLineAtOffset(50, 700);
				// 关键：这里如果抛 IllegalArgumentException，就说明 sanitize 漏了字形
				assertDoesNotThrow(() -> stream.showText(safe));
				stream.endText();
			}
			doc.save(out);
			pdf = out.toByteArray();
		}

		assertTrue(pdf.length > 512, "PDF 太小：" + pdf.length);
		assertTrue(new String(pdf, 0, 5).equals("%PDF-"), "不是合法 PDF");
	}

}
