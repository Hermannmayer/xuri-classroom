package cn.surveyking.server.core.importer;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

/**
 * 解析请求：文本走 text，文件走 file；kind 为空时按内容推断。
 */
@Data
public class ImportParseRequest {

	private String kind;

	/** paper | repo，仅影响提示语，不影响解析 */
	private String target;

	private String text;

	private MultipartFile file;

}
