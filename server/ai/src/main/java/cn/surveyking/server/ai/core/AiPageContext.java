package cn.surveyking.server.ai.core;

import org.springframework.util.StringUtils;

import java.util.Map;















public final class AiPageContext {


	public static final String BEGIN = "<<<PAGE_CONTEXT>>>";


	public static final String END = "<<<END_PAGE_CONTEXT>>>";


	public static final int MAX_VALUE_CHARS = 200;


	public static final int MAX_BLOCK_CHARS = 1200;


	public static final String NONE = "（用户当前没有可用的页面上下文）";

	private AiPageContext() {
	}

	/**
	 * 渲染上下文块。
	 * @param lines 标签 → 值，按插入顺序输出；空标签或空值会被跳过
	 * @return 形如 {@code <<<PAGE_CONTEXT>>>
- 页面：试卷编辑器
<<<END_PAGE_CONTEXT>>>} 的文本；
	 * 没有任何有效行时返回 {@link #NONE}
	 */
	public static String render(Map<String, String> lines) {
		if (lines == null || lines.isEmpty()) {
			return NONE;
		}
		StringBuilder body = new StringBuilder();
		for (Map.Entry<String, String> entry : lines.entrySet()) {
			String label = oneLine(entry.getKey(), 40);
			String value = oneLine(entry.getValue(), MAX_VALUE_CHARS);
			if (!StringUtils.hasText(label) || !StringUtils.hasText(value)) {
				continue;
			}
			String line = "- " + label + "：" + value + "\n";

			if (body.length() + line.length() > MAX_BLOCK_CHARS) {
				body.append("- （其余上下文略）\n");
				break;
			}
			body.append(line);
		}
		if (body.length() == 0) {
			return NONE;
		}
		return BEGIN + "\n" + body + END;
	}

	/** 压成一行并截断：换行会破坏「一行一个标签」的排版，也方便排查 */
	private static String oneLine(String text, int max) {
		if (!StringUtils.hasText(text)) {
			return null;
		}
		String value = text.replaceAll("\\s+", " ").trim();
		return value.length() <= max ? value : value.substring(0, max) + "…";
	}

}
