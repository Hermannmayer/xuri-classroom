package cn.surveyking.server.mcp;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.domain.dto.SurveySchema;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 试卷 schema 校验：<b>只读、不落库</b>（{@code sk_project_validate} 的实现）。
 *
 * <p>为什么要在 MCP 侧单独写一份：现有的保存链路（{@code ProjectServiceImpl#addProject}）只做
 * 富文本消毒，不做「这卷子能不能考」的业务校验——老师在页面上靠肉眼和试答发现漏配，
 * 模型批量出卷时必须有一道机器可读的闸门，否则一批卷子建完才发现全是 0 分。
 *
 * <p>输出分三档：
 * <ul>
 * <li>{@code errors}：一定会导致考试不可用的问题（没题目、没分值、选择题没答案……）；</li>
 * <li>{@code warnings}：能跑但很可能是笔误的配置；</li>
 * <li>{@code stats}：题量、总分、按题型计数，便于模型自查。</li>
 * </ul>
 *
 * <p>规则口径只覆盖「结构完整性」，不判断题目内容好坏——那是 P4 的 {@code AiContentGuard} 的事。
 */
public final class McpSchemaValidator {

	/** 必须配选项才算完整的题型 */
	private static final EnumSet<SurveySchema.QuestionType> CHOICE_TYPES = EnumSet.of(SurveySchema.QuestionType.Radio,
			SurveySchema.QuestionType.Checkbox, SurveySchema.QuestionType.Select);

	/** 考试模式下必须给正确答案的题型（填空/横线也要，否则没法自动判分） */
	private static final EnumSet<SurveySchema.QuestionType> ANSWER_REQUIRED = EnumSet.of(
			SurveySchema.QuestionType.Radio, SurveySchema.QuestionType.Checkbox, SurveySchema.QuestionType.Select,
			SurveySchema.QuestionType.Judge, SurveySchema.QuestionType.FillBlank, SurveySchema.QuestionType.HorzBlank);

	/** 必须带子题的容器题型 */
	private static final EnumSet<SurveySchema.QuestionType> CONTAINER_TYPES = EnumSet.of(
			SurveySchema.QuestionType.QuestionSet, SurveySchema.QuestionType.RandomSurvey);

	private McpSchemaValidator() {
	}

	/**
	 * 校验整卷。
	 * @param root 根节点（通常 type=Survey）
	 * @param mode 用途：exam 会额外校验分值与正确答案；survey 只看结构
	 * @return {@code {ok, errors, warnings, stats}}
	 */
	public static Map<String, Object> check(SurveySchema root, ProjectModeEnum mode) {
		List<String> errors = new ArrayList<>();
		List<String> warnings = new ArrayList<>();
		Stats stats = new Stats();
		Set<String> seenIds = new LinkedHashSet<>();
		boolean exam = !ProjectModeEnum.survey.equals(mode);

		if (root == null) {
			errors.add("schema 为空：没有任何卷面内容");
		}
		else {
			walk(root, exam, stats, errors, warnings, seenIds, true);
			if (stats.questions == 0) {
				errors.add("卷面里没有任何题目（只有分页/说明这类空节点不算）");
			}
			if (exam && stats.questions > 0 && stats.score <= 0D) {
				errors.add("整卷总分为 0：考试模式下每道题都要有大于 0 的分值");
			}
		}

		Map<String, Object> result = new LinkedHashMap<>();
		result.put("ok", errors.isEmpty());
		result.put("errors", errors);
		result.put("warnings", warnings);
		Map<String, Object> summary = new LinkedHashMap<>();
		summary.put("questions", stats.questions);
		summary.put("scoreTotal", stats.score);
		summary.put("byType", stats.byType);
		result.put("stats", summary);
		return result;
	}

	private static void walk(SurveySchema node, boolean exam, Stats stats, List<String> errors, List<String> warnings,
			Set<String> seenIds, boolean root) {
		if (node == null) {
			return;
		}
		SurveySchema.QuestionType type = node.getType();
		boolean container = type == null || SurveySchema.QuestionType.voidType().contains(type);

		if (!container) {
			stats.questions++;
			stats.byType.merge(type.name(), 1, Integer::sum);
			String label = "第 " + stats.questions + " 题" + (StringUtils.hasText(node.getTitle())
					? "（" + shorten(node.getTitle()) + "）" : "");
			if (!StringUtils.hasText(node.getTitle())) {
				errors.add(label + "没有题干（title 为空）");
			}
			if (StringUtils.hasText(node.getId()) && !seenIds.add(node.getId())) {
				errors.add(label + "的题目 id 重复：" + node.getId());
			}
			SurveySchema.Attribute attribute = node.getAttribute();
			if (exam) {
				Double score = attribute == null ? null : attribute.getExamScore();
				if (score == null || score <= 0D) {
					errors.add(label + "没有分值（examScore 缺失或 <= 0），考试模式下无法判分");
				}
				else {
					stats.score += score;
				}
				if (ANSWER_REQUIRED.contains(type) && !StringUtils.hasText(attribute.getExamCorrectAnswer())) {
					errors.add(label + "没有设置正确答案（examCorrectAnswer）");
				}
				if (attribute != null && attribute.getExamAnswerMode() == null) {
					warnings.add(label + "没有设置计分方式，将按题型默认规则判分");
				}
			}
			if (CHOICE_TYPES.contains(type) && (node.getChildren() == null || node.getChildren().isEmpty())) {
				errors.add(label + "是" + type.name() + "题型，但没有任何选项");
			}
			if (attribute != null && attribute.getDataType() == SurveySchema.DataType.selectDict
					&& !StringUtils.hasText(attribute.getDictCode())) {
				errors.add(label + "的输入类型是下拉字典，但没有配置 dictCode");
			}
		}
		else if (CONTAINER_TYPES.contains(type) && (node.getChildren() == null || node.getChildren().isEmpty())) {
			errors.add((root ? "卷面" : "第 " + (stats.questions + 1) + " 题附近") + "的" + type.name()
					+ "容器里没有子题");
		}

		if (node.getChildren() == null) {
			return;
		}
		for (SurveySchema child : node.getChildren()) {
			walk(child, exam, stats, errors, warnings, seenIds, false);
		}
	}

	private static String shorten(String title) {
		String plain = title.replaceAll("<[^>]*>", "").trim();
		return plain.length() <= 20 ? plain : plain.substring(0, 20) + "…";
	}

	/** 统计累加器 */
	static final class Stats {

		int questions;

		double score;

		final Map<String, Integer> byType = new LinkedHashMap<>();

	}

}
