package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * AI 改题结果：给老师挑的几条建议。
 *
 * <p>正常是 3 条；模型少给时按实际条数返回，前端按数组长度渲染，不要写死 3。
 *
 * @author p4-backend
 */
@Data
public class AiQuestionRewriteView {

	private List<Suggestion> suggestions = new ArrayList<>();

	@Data
	public static class Suggestion {

		/** 改写后的题干（纯文本，不含 HTML） */
		private String text;

		/** 为什么这么改 */
		private String reason;

	}

}
