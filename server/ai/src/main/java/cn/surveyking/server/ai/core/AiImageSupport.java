/** AI 网关的图片预处理：把上传的原始字节压成模型能直接吃下的 JPEG data URL。 */
package cn.surveyking.server.ai.core;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Iterator;

public final class AiImageSupport {

	private static final int MAX_RAW_BYTES = 10 * 1024 * 1024;

	private static final long MAX_PIXELS = 16_000_000L;

	private static final int MAX_EDGE = 1568;

	private static final float JPEG_QUALITY = 0.82f;

	private AiImageSupport() {
	}

	/**
	 * 把图片原始字节转成 OpenAI 兼容的 data URL：按最长边 1568 缩放、透明底铺白后重编码为 JPEG。
	 *
	 * @param raw 图片字节，按文件头识别 png / jpeg / webp / gif
	 * @return data:image/jpeg;base64,...；格式不支持、解码失败、超过 10MB 或超过 1600 万像素时返回 null
	 */
	public static String toDataUrl(byte[] raw) {
		if (raw == null || raw.length == 0 || raw.length > MAX_RAW_BYTES || mediaTypeOf(raw) == null) {
			return null;
		}
		try {
			BufferedImage source = decode(raw);
			if (source == null) {
				return null;
			}
			byte[] jpeg = encodeJpeg(source);
			return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(jpeg);
		}
		catch (IOException | RuntimeException e) {
			return null;
		}
	}

	/**
	 * 按文件头判断图片类型，供调用方在压缩前做格式校验。
	 *
	 * @param raw 图片字节
	 * @return image/png、image/jpeg、image/webp、image/gif；无法识别时返回 null
	 */
	public static String mediaTypeOf(byte[] raw) {
		if (raw == null || raw.length < 12) {
			return null;
		}
		if ((raw[0] & 0xFF) == 0x89 && raw[1] == 'P' && raw[2] == 'N' && raw[3] == 'G') {
			return "image/png";
		}
		if ((raw[0] & 0xFF) == 0xFF && (raw[1] & 0xFF) == 0xD8 && (raw[2] & 0xFF) == 0xFF) {
			return "image/jpeg";
		}
		if (raw[0] == 'G' && raw[1] == 'I' && raw[2] == 'F' && raw[3] == '8') {
			return "image/gif";
		}
		if (raw[0] == 'R' && raw[1] == 'I' && raw[2] == 'F' && raw[3] == 'F' && raw[8] == 'W' && raw[9] == 'E'
				&& raw[10] == 'B' && raw[11] == 'P') {
			return "image/webp";
		}
		return null;
	}

	private static BufferedImage decode(byte[] raw) throws IOException {
		try (ImageInputStream input = new MemoryCacheImageInputStream(new ByteArrayInputStream(raw))) {
			Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
			if (!readers.hasNext()) {
				return null;
			}
			ImageReader reader = readers.next();
			try {
				reader.setInput(input, false, true);
				long width = reader.getWidth(0);
				long height = reader.getHeight(0);
				if (width <= 0 || height <= 0 || width * height > MAX_PIXELS) {
					return null;
				}
				return reader.read(0);
			}
			finally {
				reader.dispose();
			}
		}
	}

	private static byte[] encodeJpeg(BufferedImage source) throws IOException {
		BufferedImage canvas = scaleOnWhite(source);
		ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
		ImageWriteParam param = writer.getDefaultWriteParam();
		if (param.canWriteCompressed()) {
			param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
			param.setCompressionQuality(JPEG_QUALITY);
		}
		ByteArrayOutputStream output = new ByteArrayOutputStream();
		try (ImageOutputStream imageOutput = ImageIO.createImageOutputStream(output)) {
			writer.setOutput(imageOutput);
			writer.write(null, new IIOImage(canvas, null, null), param);
		}
		finally {
			writer.dispose();
		}
		return output.toByteArray();
	}

	private static BufferedImage scaleOnWhite(BufferedImage source) {
		int width = source.getWidth();
		int height = source.getHeight();
		int longest = Math.max(width, height);
		int targetWidth = width;
		int targetHeight = height;
		if (longest > MAX_EDGE) {
			double ratio = MAX_EDGE / (double) longest;
			targetWidth = Math.max(1, (int) Math.round(width * ratio));
			targetHeight = Math.max(1, (int) Math.round(height * ratio));
		}
		BufferedImage canvas = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
		Graphics2D graphics = canvas.createGraphics();
		try {
			graphics.setColor(Color.WHITE);
			graphics.fillRect(0, 0, targetWidth, targetHeight);
			graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
			graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
			graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
		}
		finally {
			graphics.dispose();
		}
		return canvas;
	}

}
