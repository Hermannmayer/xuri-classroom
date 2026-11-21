package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiCompletion;
import cn.surveyking.server.ai.core.AiRequest;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AiNoticeDraftRequest;
import cn.surveyking.server.domain.dto.AiNoticeDraftView;
import cn.surveyking.server.service.AiNoticeDraftService;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.ClassService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

























@Service
@RequiredArgsConstructor
@Slf4j
public class AiNoticeDraftServiceImpl implements AiNoticeDraftService {


	private static final String PROMPT_NOTICE = "notice-draft";


	private static final String PERMISSION_MANAGE_SYSTEM = "notice:manage:system";


	private static final int MAX_POINTS_CHARS = 1000;


	private static final int MAX_TITLE_CHARS = 30;


	private static final int MAX_CONTENT_CHARS = 2000;


	private static final int MAX_TIP_CHARS = 200;


	private static final int MAX_CLASS_IDS = 50;

	private static final String AUDIENCE_ALL = "all";

	private static final String AUDIENCE_ADMIN = "admin";

	private static final String AUDIENCE_TEACHER = "teacher";

	private static final String AUDIENCE_STUDENT = "student";


	private static final String AUDIENCE_CLASS = "class";

	private static final Set<String> AUDIENCES = Set.of(AUDIENCE_ALL, AUDIENCE_ADMIN, AUDIENCE_TEACHER,
			AUDIENCE_STUDENT, AUDIENCE_CLASS);

	private static final String TONE_FORMAL = "formal";


	private static final Map<String, String> TONES = new LinkedHashMap<>();

	static {
		TONES.put(TONE_FORMAL, "正式：通知体，用「请」「务必」「按时」这类措辞，不用表情和口语");
		TONES.put("brief", "简短：能省则省，正文不超过 3 段，长句拆成短句，一句话只说一件事");
		TONES.put("warm", "温和：可以多一句关心（例如提醒路上时间），但要求与截止时间仍然要写清楚");
	}

	private final AiAssistSupport support;

	private final ClassService classService;

	@Override
	public AiNoticeDraftView draft(AiNoticeDraftRequest request) {
		if (request == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先写几句要点");
		}
		String rawPoints = request.getPoints();
		String points = normalizePoints(rawPoints);
		if (!StringUtils.hasText(points)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先写几句要点");
		}

		boolean pointsTruncated = rawPoints != null && rawPoints.trim().length() > MAX_POINTS_CHARS;
		List<String> classIds = cleanClassIds(request.getClassIds());
		boolean canSystem = SecurityContextUtils.isAdmin()
				|| SecurityContextUtils.hasAuthority(PERMISSION_MANAGE_SYSTEM);
		String audience = resolveAudience(request.getAudience(), classIds, canSystem);
		boolean toClass = AUDIENCE_CLASS.equals(audience);
		if (toClass) {
			if (classIds.isEmpty()) {
				throw new ErrorCodeException(ErrorCode.ValidationError, "请选择这条通知要发给哪些班级");
			}
			if (classIds.size() > MAX_CLASS_IDS) {
				throw new ErrorCodeException(ErrorCode.ValidationError,
						"一次最多给 " + MAX_CLASS_IDS + " 个班起草，请分批");
			}

			for (String classId : classIds) {
				classService.assertVisible(classId);
			}
		}
		String subject = trim(request.getSubject());
		LinkedHashMap<String, String> vars = new LinkedHashMap<>();
		vars.put("audience", describeAudience(audience, classIds.size()));
		vars.put("tone", toneInstruction(request.getTone()));
		vars.put("subject", StringUtils.hasText(subject) ? subject : "（没有指定，请自己拟一个）");
		vars.put("points", points);
		AiRequest aiRequest = AiRequest.builder().systemPrompt(support.prompts().render(PROMPT_NOTICE, vars))
				.userPrompt("请把上面的要点补成一条通知草稿，只输出 JSON。")

				.temperature(Double.valueOf(0.6D)).build();
		AiCompletion completion = support.call(AiUsageService.SCENE_NOTICE_DRAFT, SecurityContextUtils.getUserId(),
				aiRequest, true);
		Draft draft = parse(completion.getText(), subject, points);
		AiNoticeDraftView view = new AiNoticeDraftView();
		view.setTitle(draft.title());
		view.setContent(draft.content());
		view.setAudience(audience);
		view.setClassIds(toClass ? classIds : null);
		String tip = draft.tip();
		if (pointsTruncated) {
			String note = "要点超过 " + MAX_POINTS_CHARS + " 字，这里只用了前 " + MAX_POINTS_CHARS + " 字。";
			tip = StringUtils.hasText(tip) ? note + tip : note;
		}
		view.setTip(tip);
		log.info("AI 公告草稿: audience={}, classes={}, points={} 字, title={} 字, content={} 字", audience,
				toClass ? classIds.size() : 0, points.length(), view.getTitle().length(),
				view.getContent().length());
		return view;
	}



	/**
	 * 受众归一化 + 权限闸门。
	 *
	 * <p>缺省（没传）时按最保守的口径给：管理员 all、其余人 class；没有班级可用时才看有没有全站权限。
	 * 这样「老师点开对话框就点生成」也不会意外起草一条全站公告。
	 */
	private String resolveAudience(String raw, List<String> classIds, boolean canSystem) {
		if (!StringUtils.hasText(raw)) {
			if (SecurityContextUtils.isAdmin()) {
				return AUDIENCE_ALL;
			}
			if (!classIds.isEmpty()) {
				return AUDIENCE_CLASS;
			}
			return canSystem ? AUDIENCE_TEACHER : AUDIENCE_CLASS;
		}
		String audience = raw.trim().toLowerCase(Locale.ROOT);
		if (!AUDIENCES.contains(audience)) {
			throw new ErrorCodeException(ErrorCode.ValidationError,
					"受众只能是 all / admin / teacher / student / class");
		}
		if (!AUDIENCE_CLASS.equals(audience) && !canSystem) {
			throw new AccessDeniedException("只有管理员能给全站发通知");
		}
		return audience;
	}

	/** 受众的一句话说明：进提示词，让模型知道自己是写给谁看的 */
	private static String describeAudience(String audience, int classes) {
		return switch (audience) {
			case AUDIENCE_ALL -> "全站所有人（管理员、教职工、学员都会看到）";
			case AUDIENCE_ADMIN -> "只有管理员看到";
			case AUDIENCE_TEACHER -> "教职工（含管理员）看到";
			case AUDIENCE_STUDENT -> "只有学员看到";

			default -> "指定的 " + classes + " 个班级（只在这个班里发；具体写给谁看，按要点里写的对象来，不要点名班级）";
		};
	}

	private static String toneInstruction(String tone) {
		String key = StringUtils.hasText(tone) ? tone.trim().toLowerCase(Locale.ROOT) : TONE_FORMAL;
		String instruction = TONES.get(key);

		return instruction == null ? TONES.get(TONE_FORMAL) : instruction;
	}

	private static List<String> cleanClassIds(List<String> raw) {
		List<String> classIds = new ArrayList<>();
		if (CollectionUtils.isEmpty(raw)) {
			return classIds;
		}
		for (String value : raw) {
			if (!StringUtils.hasText(value)) {
				continue;
			}
			String classId = value.trim();
			if (!classIds.contains(classId)) {
				classIds.add(classId);
			}
		}
		return classIds;
	}



	/**
	 * 解析草稿：标题按 30 字截断、正文做换行归一与长度上限。
	 *
	 * <p>JSON 解析失败时退一步按引号抽字段：公告正文天然是多段文本，模型偶尔会把真实换行直接写进
	 * JSON 字符串（严格 JSON 不允许裸换行），直接报「解析失败」等于让老师重试一次同样的错误。
	 * 两条路都拿不到正文才判定失败——脏数据可以重试，但不能 500，也不能给一个空正文的草稿。
	 */
	private Draft parse(String json, String subject, String points) {
		JsonNode root = null;
		try {
			root = support.readJson(json, "AI 公告草稿");
		}
		catch (ErrorCodeException e) {
			log.warn("AI 公告草稿 JSON 解析失败，改用宽松抽取: {}", AiAssistSupport.oneLine(json, 120));
		}
		String title = clampTitle(root == null ? quotedField(json, "title") : text(root, "title"));
		String content = clampContent(root == null ? quotedField(json, "content") : text(root, "content"));
		String tip = AiAssistSupport.oneLine(root == null ? quotedField(json, "tip") : text(root, "tip"),
				MAX_TIP_CHARS);
		if (!StringUtils.hasText(content)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "AI 没有写出通知正文，请再试一次，或把要点写具体些");
		}
		if (!StringUtils.hasText(title)) {

			String fallback = StringUtils.hasText(subject) ? subject : points;
			title = clampTitle(AiAssistSupport.oneLine(fallback, MAX_TITLE_CHARS));
			if (!StringUtils.hasText(tip)) {
				tip = "标题是按你的要点补的，可直接改。";
			}
		}
		return new Draft(title, content, tip);
	}

	private static String text(JsonNode node, String field) {
		if (node == null) {
			return null;
		}
		JsonNode value = node.path(field);
		if (value.isMissingNode() || value.isNull()) {
			return null;
		}
		String text = value.asText(null);
		return StringUtils.hasText(text) ? text.trim() : null;
	}

	/**
	 * 宽松抽取：从 {@code "field":"..."} 里按引号取一段文本，处理 \n / \t 等转义。
	 * <p>只在严格 JSON 解析失败时用，所以可以容忍「字段顺序、缩进、多余尾巴」这些无关噪声。
	 */
	private static String quotedField(String json, String field) {
		if (!StringUtils.hasText(json) || !StringUtils.hasText(field)) {
			return null;
		}
		int key = json.indexOf("\"" + field + "\"");
		if (key < 0) {
			return null;
		}
		int colon = json.indexOf(':', key + field.length() + 2);
		if (colon < 0) {
			return null;
		}
		int start = json.indexOf('"', colon + 1);
		if (start < 0) {
			return null;
		}
		StringBuilder text = new StringBuilder();
		for (int index = start + 1; index < json.length(); index++) {
			char current = json.charAt(index);
			if (current == '\\' && index + 1 < json.length()) {
				char next = json.charAt(++index);
				switch (next) {
					case 'n' -> text.append('\n');
					case 't' -> text.append('\t');
					case 'r' -> text.append('\r');
					default -> text.append(next);
				}
				continue;
			}
			if (current == '"') {
				break;
			}
			text.append(current);
		}
		String value = text.toString().trim();
		return StringUtils.hasText(value) ? value : null;
	}

	private static String clampTitle(String title) {
		if (!StringUtils.hasText(title)) {
			return "";
		}
		String value = title.replaceAll("[\\r\\n\\t]+", " ").replaceAll("\\s{2,}", " ").trim();
		return value.length() > MAX_TITLE_CHARS ? value.substring(0, MAX_TITLE_CHARS).trim() : value;
	}

	private static String clampContent(String content) {
		if (!StringUtils.hasText(content)) {
			return "";
		}
		String value = content.replace("\r\n", "\n").replace('\r', '\n').trim();

		value = value.replaceAll("\\n{3,}", "\n\n");
		return value.length() > MAX_CONTENT_CHARS ? value.substring(0, MAX_CONTENT_CHARS).trim() : value;
	}

	private static String normalizePoints(String raw) {
		if (!StringUtils.hasText(raw)) {
			return null;
		}
		String value = raw.replace("\r\n", "\n").replace('\r', '\n').trim();
		if (value.length() > MAX_POINTS_CHARS) {
			value = value.substring(0, MAX_POINTS_CHARS).trim();
		}
		return value;
	}

	private static String trim(String value) {
		return StringUtils.hasText(value) ? value.trim() : null;
	}


	private record Draft(String title, String content, String tip) {
	}

}
