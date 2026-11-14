package cn.surveyking.server.domain.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * @author javahuang
 * @date 2022/4/27
 */
@Data
public class RepoTemplateRequest {

	private String repoId;

	private List<TemplateRequest> templates;

	private List<String> ids;

	private MultipartFile file;

	/**
	 * 导入来源：excel（默认）/ text。为空时按 file 是否存在推断。
	 */
	private String kind;

	/**
	 * 文本导入时的题目文本（kind=text）。
	 */
	private String text;

}
