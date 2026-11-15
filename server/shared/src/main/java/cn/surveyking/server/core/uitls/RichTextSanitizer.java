package cn.surveyking.server.core.uitls;

import cn.surveyking.server.domain.dto.SurveySchema;
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;

import java.util.regex.Pattern;

/**
 * 富文本白名单消毒：服务端最后一道防线。
 *
 * <p>前端 TipTap + DOMPurify 只能保护浏览器；Word 导入、旧数据、直接调接口都可能把
 * HTML 带进来，所以保存 schema 时统一走这里。只允许题目描述需要的基础标签，图片 src
 * 限定为站内预览地址，链接只允许 http/https/mailto。
 */
public final class RichTextSanitizer {

	private static final Pattern PREVIEW_SRC = Pattern.compile("^/api/public/preview/[A-Za-z0-9_-]{1,64}$");

	private static final Pattern SAFE_CLASS = Pattern.compile("[a-zA-Z0-9_\\- ]{1,120}");

	private static final PolicyFactory POLICY = new HtmlPolicyBuilder()
			.allowElements("p", "br", "strong", "b", "em", "i", "u", "s", "strike", "ul", "ol", "li", "a", "img",
					"code", "pre", "blockquote", "h1", "h2", "h3", "h4", "hr", "span", "div", "table", "thead",
					"tbody", "tr", "th", "td")
			.allowAttributes("href").onElements("a")
			.allowUrlProtocols("http", "https", "mailto")
			.requireRelNofollowOnLinks()
			.allowAttributes("src").matching(PREVIEW_SRC).onElements("img")
			.allowAttributes("alt", "width", "height").onElements("img")
			.allowAttributes("class").matching(SAFE_CLASS).onElements("p", "span", "div", "li", "code", "pre", "td",
					"th")
			.allowAttributes("data-formula", "data-question-ref").onElements("span")
			.allowStyling()
			.toFactory();

	private RichTextSanitizer() {
	}

	public static String clean(String html) {
		if (html == null || html.isEmpty()) {
			return html;
		}
		return POLICY.sanitize(html);
	}

	/**
	 * 项目/题库 schema 落库前消毒标题（仅 richTitle）、描述、说明内容。
	 */
	public static void sanitizeSchema(SurveySchema schema) {
		if (schema == null) {
			return;
		}
		SurveySchema.Attribute attribute = schema.getAttribute();
		if (attribute != null) {
			if (Boolean.TRUE.equals(attribute.getRichTitle())) {
				schema.setTitle(clean(schema.getTitle()));
			}
			if (attribute.getContent() != null) {
				attribute.setContent(clean(attribute.getContent()));
			}
		}
		if (schema.getDescription() != null) {
			schema.setDescription(clean(schema.getDescription()));
		}
		if (schema.getChildren() != null) {
			schema.getChildren().forEach(RichTextSanitizer::sanitizeSchema);
		}
	}

}
