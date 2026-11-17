package cn.surveyking.server.core.export;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 答卷 PDF 导出的「真渲染」冒烟。
 *
 * <p>
 * PDFBox 2.x → 3.x 是破坏性大版本升级，而 {@code AnswerPdfExporter} 没有单测覆盖：
 * 编译能过不代表运行时能画出 PDF（字体嵌入、图片 XObject、内容流收尾都可能变）。
 * 这里按导出器实际用到的那几个 API 走一遍——建文档、嵌 TTF 子集字体、画中文、
 * 插入一张 PNG、收尾存字节——断言产出的是一份结构完整的 PDF。
 */
class PdfRenderingTest {

	private static final String FONT = "/fonts/answer-pdf.ttf";

	@Test
	void rendersTextAndImageIntoAValidPdf() throws Exception {
		byte[] pdf;
		try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			PDType0Font font;
			try (InputStream in = PdfRenderingTest.class.getResourceAsStream(FONT)) {
				assertTrue(in != null, "字体资源缺失：" + FONT);
				font = PDType0Font.load(doc, in);
			}
			PDPage page = new PDPage(PDRectangle.A4);
			doc.addPage(page);
			try (PDPageContentStream stream = new PDPageContentStream(doc, page)) {
				stream.beginText();
				stream.setFont(font, 12f);
				stream.newLineAtOffset(50, PDRectangle.A4.getHeight() - 60);
				// 中文 + 数字：验证子集字体真的能编码这些字形
				// 只放字体子集确实覆盖的字形（fonts/README.md 的 --unicodes 范围）：
				// 中文、ASCII 数字与字母。箭头这类符号不在子集里，PDFBox 会直接抛
				// IllegalArgumentException（No glyph for U+2192），所以别拿它做冒烟素材。
				stream.showText("旭日云课堂 答卷导出 2026 第 1 题 8 至 10 分");
				stream.endText();

				PDImageXObject xobject = PDImageXObject.createFromByteArray(doc, tinyPng(), "answer-image");
				stream.drawImage(xobject, 50, 600, 40, 40);
			}
			doc.save(out);
			pdf = out.toByteArray();
		}

		assertTrue(pdf.length > 1024, "PDF 太小，可能没渲染出内容：" + pdf.length + " 字节");
		assertEquals("%PDF-", new String(pdf, 0, 5), "不是合法 PDF 头");
		String tail = new String(pdf, Math.max(0, pdf.length - 64), Math.min(64, pdf.length));
		assertTrue(tail.contains("%%EOF"), "PDF 缺少 EOF 标记，可能内容流没正常收尾");
	}

	/** 10×10 的红色 PNG，模拟答卷里的图片答案 */
	private static byte[] tinyPng() throws Exception {
		BufferedImage image = new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB);
		Graphics2D g = image.createGraphics();
		g.setColor(Color.RED);
		g.fillRect(0, 0, 10, 10);
		g.dispose();
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		ImageIO.write(image, "png", out);
		return out.toByteArray();
	}

}
