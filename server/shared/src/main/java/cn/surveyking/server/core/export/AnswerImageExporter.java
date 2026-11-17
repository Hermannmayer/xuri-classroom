package cn.surveyking.server.core.export;

import cn.surveyking.server.core.exception.InternalServerError;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ProjectView;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Locale;

/**
 * 单份答卷的「长图」导出：每人一张 PNG。
 *
 * <p>
 * 三步：先让 {@link AnswerPdfExporter} 按答题卷还原版式出一份 PDF（同一套排版，所以 PDF 与长图看到的
 * 是同一张卷子，不会出现「PDF 里有、长图里没有」）→ 用 {@link PDFRenderer} 逐页栅格化 →
 * 纵向拼成一张图再编码成 PNG。
 *
 * <p>
 * 两条必须守住的边界：
 * <ul>
 * <li><b>不能把堆打爆</b>：这台机器只有 ~6.8G 内存、4 核，还可能同时跑 1~2 个导出任务。拼图高度超过
 * {@link #MAX_HEIGHT_PX} 就按 150 → 120 → 100 DPI 依次降，还超就按比例继续降（下限 {@link #MIN_DPI}）。
 * 页数极多时宁可字小一点，也不能 OOM，更不能靠截断丢内容。</li>
 * <li><b>字体缺失报同样的错</b>：沿用 {@link AnswerPdfExporter#FONT_MISSING_MESSAGE}，
 * 免得运维收到两套说法。</li>
 * </ul>
 *
 * <p>
 * 失败语义：本类<b>不吞异常</b>。单份图失败由调用方（导出任务）catch 后记失败数、继续跑下一份，
 * 这样个别坏数据不会让整批 50 份导出全挂。线程安全：无可变静态状态，每份独立的 PDDocument。
 */
public final class AnswerImageExporter {

	private static final Logger log = LoggerFactory.getLogger(AnswerImageExporter.class);

	/** 目标 DPI：A4 一页约 1240 x 1754 px，手机上放大看题干和作答都不糊 */
	private static final float DEFAULT_DPI = 150f;

	/** 页数多时的降级档位：先 120，再 100 */
	private static final float[] FALLBACK_DPI = { 120f, 100f };

	/** 长图高度上限（px）：20000 x 1240 已是 2400 万像素，再高 PNG 编码与手机相册都吃力 */
	private static final int MAX_HEIGHT_PX = 20000;

	/** DPI 下限：再低字就糊得没法看，那种情况该发 PDF 而不是长图 */
	private static final float MIN_DPI = 60f;

	private AnswerImageExporter() {
	}

	/**
	 * 渲染「答题卷还原」长图。
	 * @param project 试卷（只用 survey 里的题目结构）
	 * @param answer 答卷视图（answer 原文、metaInfo、examInfo、examScore 等）
	 * @param options 导出选项；内部会复制一份并把版式强制成 {@link AnswerPdfExporter.Style#ANSWER_SHEET}，
	 * 不会改动调用方传入的对象
	 * @return PNG 字节
	 * @throws InternalServerError 字体缺失、PDF 生成失败或栅格化失败（中文提示）
	 */
	public static byte[] renderAnswerImage(ProjectView project, AnswerView answer,
			AnswerPdfExporter.PdfOptions options) {
		if (!AnswerPdfExporter.isFontAvailable()) {
			throw new InternalServerError(AnswerPdfExporter.FONT_MISSING_MESSAGE);
		}
		// 1) 先出 PDF：长图与「答题卷」PDF 共用一套排版，老师拿到的两种格式才是同一张卷子
		AnswerPdfExporter.PdfOptions sheetOptions = options == null ? new AnswerPdfExporter.PdfOptions()
				: options.copy();
		sheetOptions.style(AnswerPdfExporter.Style.ANSWER_SHEET);
		// 长图是「一张图」，页脚「第 N 页」会落在拼接处，看起来像内容断了
		sheetOptions.showPageFooter(false);
		byte[] pdf = AnswerPdfExporter.renderAnswer(project, answer, sheetOptions);

		// 2) 逐页栅格化 + 纵向拼接
		try (PDDocument document = Loader.loadPDF(pdf)) {
			int pageCount = document.getNumberOfPages();
			if (pageCount <= 0) {
				throw new InternalServerError("生成答卷长图失败：PDF 里没有任何页面");
			}
			float dpi = chooseDpi(document);
			int width = 0;
			// 预估高度一律向上取整：PDFBox 的像素取整方式不保证等于 ceil，多留几像素总比切掉最后一行好
			int height = 0;
			for (int i = 0; i < pageCount; i++) {
				PDRectangle box = pageBox(document.getPage(i));
				width = Math.max(width, (int) Math.ceil(box.getWidth() * dpi / 72f));
				height = height + (int) Math.ceil(box.getHeight() * dpi / 72f);
			}
			if (width <= 0 || height <= 0) {
				throw new InternalServerError("生成答卷长图失败：页面尺寸异常");
			}
			BufferedImage canvas = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
			Graphics2D graphics = canvas.createGraphics();
			try {
				// 白底：签名图是透明底，不铺白会变黑块
				graphics.setColor(Color.WHITE);
				graphics.fillRect(0, 0, width, height);
				PDFRenderer renderer = new PDFRenderer(document);
				int top = 0;
				for (int i = 0; i < pageCount; i++) {
					BufferedImage pageImage = renderer.renderImageWithDPI(i, dpi, ImageType.RGB);
					// 统一宽度=页宽、页间不留缝：按累计高度直接贴上去，用完即弃（一页就是 ~9MB）
					graphics.drawImage(pageImage, 0, top, null);
					top = top + pageImage.getHeight();
				}
			}
			finally {
				graphics.dispose();
			}
			// 3) 编码 PNG：返回字节而不是流，调用方直接塞进 ZIP
			ByteArrayOutputStream out = new ByteArrayOutputStream(1024 * 1024);
			if (!ImageIO.write(canvas, "png", out)) {
				throw new InternalServerError("生成答卷长图失败：当前运行环境不支持 PNG 编码");
			}
			byte[] png = out.toByteArray();
			log.debug("答卷长图已生成: {} 页, {} x {} px, dpi={}, {} KB", Integer.valueOf(pageCount),
					Integer.valueOf(width), Integer.valueOf(height), Float.valueOf(dpi),
					Integer.valueOf(png.length / 1024));
			return png;
		}
		catch (InternalServerError e) {
			throw e;
		}
		catch (IOException e) {
			throw new InternalServerError("生成答卷长图失败：" + e.getMessage(), e);
		}
	}

	/**
	 * 选 DPI：默认 150；拼出来超过 {@link #MAX_HEIGHT_PX} 就按 120 → 100 依次降；
	 * 还超（题量真到了这个程度）就按比例继续降到刚好卡在上限，最低 {@link #MIN_DPI}。
	 *
	 * <p>为什么不是「超了就截断」：截断等于吃掉学员的后半张卷子。宁可整张图小一点，
	 * 也不能让导出静默丢内容。
	 */
	private static float chooseDpi(PDDocument document) {
		float dpi = DEFAULT_DPI;
		long height = estimatedHeight(document, dpi);
		if (height <= MAX_HEIGHT_PX) {
			return dpi;
		}
		for (int i = 0; i < FALLBACK_DPI.length; i++) {
			dpi = FALLBACK_DPI[i];
			long candidate = estimatedHeight(document, dpi);
			if (candidate <= MAX_HEIGHT_PX) {
				log.info("答卷长图页数较多，DPI 由 {} 降到 {}（预估高度 {} px，上限 {} px）",
						Float.valueOf(DEFAULT_DPI), Float.valueOf(dpi), Long.valueOf(candidate),
						Integer.valueOf(MAX_HEIGHT_PX));
				return dpi;
			}
		}
		long tooTall = estimatedHeight(document, dpi);
		float fitted = Math.max(MIN_DPI, dpi * MAX_HEIGHT_PX / (float) tooTall);
		log.info("答卷长图页数过多，DPI 由 {} 继续降到 {}（预估高度 {} px，上限 {} px），字号会明显变小",
				Float.valueOf(DEFAULT_DPI), String.format(Locale.ROOT, "%.1f", Float.valueOf(fitted)),
				Long.valueOf(estimatedHeight(document, fitted)), Integer.valueOf(MAX_HEIGHT_PX));
		return fitted;
	}

	/** 预估某 DPI 下拼图的像素高度（逐页向上取整，只会多不会少） */
	private static long estimatedHeight(PDDocument document, float dpi) {
		long total = 0L;
		for (PDPage page : document.getPages()) {
			total = total + (long) Math.ceil(pageBox(page).getHeight() * dpi / 72d);
		}
		return total;
	}

	/** 取页面可见区域：CropBox 缺失或异常的老 PDF 退回 MediaBox */
	private static PDRectangle pageBox(PDPage page) {
		PDRectangle cropBox = page.getCropBox();
		if (cropBox == null || cropBox.getWidth() <= 0f || cropBox.getHeight() <= 0f) {
			return page.getMediaBox();
		}
		return cropBox;
	}

}
