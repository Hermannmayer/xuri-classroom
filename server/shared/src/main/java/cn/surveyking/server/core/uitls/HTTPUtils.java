package cn.surveyking.server.core.uitls;

import lombok.SneakyThrows;

import java.net.URLEncoder;







public final class HTTPUtils {

	/**
	 * 获取下载文件名，避免中文文件名乱码
	 * @param fileName
	 * @return
	 */
	@SneakyThrows
	public static String getContentDispositionValue(String fileName) {

		String percentEncodedFileName = URLEncoder.encode(fileName, "utf-8").replaceAll("\\+", "%20");


		StringBuilder contentDispositionValue = new StringBuilder();
		contentDispositionValue.append("attachment; filename=").append(percentEncodedFileName);

		return contentDispositionValue.toString();
	}

}
