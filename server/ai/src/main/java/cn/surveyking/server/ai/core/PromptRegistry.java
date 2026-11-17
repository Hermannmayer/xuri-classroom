package cn.surveyking.server.ai.core;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 提示词模板 + 版本。
 *
 * <p>为什么不把提示词写成 Java 常量：提示词的调整频率远高于代码，写成 {@code prompts/*.md}
 * 之后「改一句话」不必重新想一遍转义，也方便日后做「A/B 两版提示词」。
 *
 * <p>约定：
 * <ul>
 * <li>模板放 {@code server/ai/src/main/resources/prompts/&lt;id&gt;.md}；</li>
 * <li>首行写 {@code version: x.y}，改提示词就要改版本号——出问题时至少能回答「当时用的是哪一版」；</li>
 * <li>{@link #render} 把 {@code {{变量名}}} 换成实际值，未提供的变量替换成空串。</li>
 * </ul>
 *
 * <p>版本号目前只写进应用日志（{@code t_ai_usage} 没有 prompt 版本列，P4 不动表结构）；
 * 需要精确对账时按日志里的 {@code prompt=paper-generate@1.0} 反查。
 *
 * @author p4-backend
 */
@Service
@Slf4j
public class PromptRegistry {

	private static final String DIR = "prompts/";

	private static final String SUFFIX = ".md";

	private static final String VERSION_PREFIX = "version:";

	/** id → 模板（进程内缓存，模板不会在运行时变） */
	private final Map<String, Template> templates = new ConcurrentHashMap<>();

	/**
	 * 取模板正文并做变量替换。
	 * @param id 模板 id（不含目录与后缀），如 {@code paper-generate}
	 * @param vars 变量表；值为 null 时替换成空串
	 * @return 渲染后的提示词
	 */
	public String render(String id, Map<String, String> vars) {
		Template template = load(id);
		String body = template.getBody();
		if (vars != null) {
			for (Map.Entry<String, String> entry : new LinkedHashMap<>(vars).entrySet()) {
				String key = entry.getKey();
				if (!StringUtils.hasText(key)) {
					continue;
				}
				body = body.replace("{{" + key + "}}", entry.getValue() == null ? "" : entry.getValue());
			}
		}
		return body;
	}

	/** 模板版本号（首行 {@code version: x.y} 的值）；读不到时返回 {@code unknown} */
	public String version(String id) {
		return load(id).getVersion();
	}

	/** 渲染时用的日志标签：{@code paper-generate@1.0} */
	public String label(String id) {
		return id + "@" + version(id);
	}

	private Template load(String id) {
		if (!StringUtils.hasText(id)) {
			throw new IllegalArgumentException("提示词 id 不能为空");
		}
		return templates.computeIfAbsent(id, this::read);
	}

	private Template read(String id) {
		ClassPathResource resource = new ClassPathResource(DIR + id + SUFFIX);
		if (!resource.exists()) {
			throw new IllegalStateException("提示词模板不存在：" + DIR + id + SUFFIX);
		}
		String content;
		try {
			content = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
		}
		catch (IOException e) {
			throw new IllegalStateException("读取提示词模板失败：" + DIR + id + SUFFIX, e);
		}
		String version = "unknown";
		String body = content;
		int firstLineEnd = content.indexOf('\n');
		String firstLine = (firstLineEnd < 0 ? content : content.substring(0, firstLineEnd)).trim();
		if (firstLine.toLowerCase().startsWith(VERSION_PREFIX)) {
			version = firstLine.substring(VERSION_PREFIX.length()).trim();
			body = firstLineEnd < 0 ? "" : content.substring(firstLineEnd + 1);
			// 版本行下面通常有一个空行，去掉，别让提示词以空行开头
			while (body.startsWith("\n")) {
				body = body.substring(1);
			}
		}
		log.info("加载提示词模板: {}@{}, {} 字符", id, version, body.length());
		return new Template(version, body);
	}

	/** 一个模板：版本 + 正文（已去掉版本行） */
	private static final class Template {

		private final String version;

		private final String body;

		private Template(String version, String body) {
			this.version = version;
			this.body = body;
		}

		private String getVersion() {
			return version;
		}

		private String getBody() {
			return body;
		}

	}

}
