package cn.surveyking.server.core.uitls;

import java.math.BigDecimal;
import java.math.RoundingMode;





public class FileUtils {

	public static final String[] ALLOWED_EXTENSIONS = {

			"jpg", "jpeg", "png", "gif", "bmp",


			"pdf", "txt", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "ods",


			"mp3", "wav", "aac", "ogg", "webm",


			"mp4", "mov", "wmv", "avi", "mkv",


			"csv", "json", "xml" };

	/** 将文件大小从字节转换为兆字节（MB）；返回 文件大小，以兆字节（MB）为单位，保留三位小数 */
	public static Double bytesToMb(long bytes) {
		BigDecimal sizeInBytes = new BigDecimal(bytes);
		BigDecimal bytesInAMb = new BigDecimal(1024 * 1024);
		return sizeInBytes.divide(bytesInAMb, 3, RoundingMode.HALF_UP).doubleValue();
	}

}
