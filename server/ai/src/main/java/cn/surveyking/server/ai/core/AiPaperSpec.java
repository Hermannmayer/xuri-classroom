package cn.surveyking.server.ai.core;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.domain.dto.AiPaperGenerateRequest;
import cn.surveyking.server.domain.dto.SurveySchema;
import lombok.Getter;
import org.springframework.util.StringUtils;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 出卷参数（{@link AiPaperGenerateRequest} 归一化之后的产物）。
 *
 * <p>为什么要有这一层：出卷的参数既要给提示词用（「单选 8 题、多选 4 题」），
 * 又要给 {@link AiContentGuard} 用（校验题量/题型配比/总分），两处必须用<b>同一份</b>归一化结果，
 * 否则会出现「提示词让模型出 8 道单选、校验却按 7 道算」这种自相矛盾的拒收。
 *
 * <p>归一化规则：
 * <ul>
 * <li>题型比例不要求加和为 1，按比例换算成题数（四舍五入），差额补到比例最大的题型上，
 * 保证期望题数之和正好等于题量；</li>
 * <li>难度缺省 mixed。</li>
 * </ul>
 *
 * @author p4-backend
 */
@Getter
public final class AiPaperSpec {

	/** 一次最多生成多少题：再多既慢又容易崩，老师说「分批来」更实际 */
	public static final int MAX_QUESTIONS = 100;

	/** 出卷支持的题型：必须是能自动判分的题型，否则生成出来也不能直接当考试用 */
	public static final Set<SurveySchema.QuestionType> SUPPORTED_TYPES = EnumSet.of(SurveySchema.QuestionType.Radio,
			SurveySchema.QuestionType.Checkbox, SurveySchema.QuestionType.Judge,
			SurveySchema.QuestionType.FillBlank, SurveySchema.QuestionType.MultipleBlank,
			SurveySchema.QuestionType.Textarea);

	public static final String DIFFICULTY_MIXED = "mixed";

	private static final Map<String, String> DIFFICULTY_LABELS = new LinkedHashMap<>();

	private static final Map<SurveySchema.QuestionType, String> TYPE_LABELS = new LinkedHashMap<>();

	static {
		DIFFICULTY_LABELS.put("easy", "简单");
		DIFFICULTY_LABELS.put("medium", "中等");
		DIFFICULTY_LABELS.put("hard", "较难");
		DIFFICULTY_LABELS.put(DIFFICULTY_MIXED, "混合");

		TYPE_LABELS.put(SurveySchema.QuestionType.Radio, "单选题");
		TYPE_LABELS.put(SurveySchema.QuestionType.Checkbox, "多选题");
		TYPE_LABELS.put(SurveySchema.QuestionType.Judge, "判断题");
		TYPE_LABELS.put(SurveySchema.QuestionType.FillBlank, "填空题");
		TYPE_LABELS.put(SurveySchema.QuestionType.MultipleBlank, "多项填空题");
		TYPE_LABELS.put(SurveySchema.QuestionType.Textarea, "简答题");
	}

	private final int questionCount;

	private final double totalScore;

	/** 归一化后的题型 → 比例（只保留比例 > 0 的题型，顺序与请求一致） */
	private final LinkedHashMap<String, Double> typeRatio;

	private final String difficulty;

	private final String subject;

	private final String level;

	private final String requirements;

	private AiPaperSpec(int questionCount, double totalScore, LinkedHashMap<String, Double> typeRatio,
			String difficulty, String subject, String level, String requirements) {
		this.questionCount = questionCount;
		this.totalScore = totalScore;
		this.typeRatio = typeRatio;
		this.difficulty = difficulty;
		this.subject = subject;
		this.level = level;
		this.requirements = requirements;
	}

	/**
	 * 校验并归一化出卷参数。
	 * @throws ErrorCodeException 参数不合法（中文提示，可直接弹给老师）
	 */
	public static AiPaperSpec of(AiPaperGenerateRequest request) {
		if (request == null) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "出卷参数不能为空");
		}
		if (!StringUtils.hasText(request.getSubject())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请填写学科（如「养老护理员」）");
		}
		if (!StringUtils.hasText(request.getLevel())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请填写级别（如「五级」）");
		}
		Integer count = request.getQuestionCount();
		if (count == null || count <= 0) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "题量必须大于 0");
		}
		if (count > MAX_QUESTIONS) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "一次最多生成 " + MAX_QUESTIONS + " 题，请分批生成");
		}
		Double totalScore = request.getTotalScore();
		if (totalScore == null || totalScore <= 0) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "总分必须大于 0");
		}
		LinkedHashMap<String, Double> ratios = normalizeRatio(request.getTypeRatio());
		String difficulty = StringUtils.hasText(request.getDifficulty()) ? request.getDifficulty().trim().toLowerCase()
				: DIFFICULTY_MIXED;
		if (!DIFFICULTY_LABELS.containsKey(difficulty)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "难度只能是 easy / medium / hard / mixed");
		}
		return new AiPaperSpec(count.intValue(), totalScore.doubleValue(), ratios, difficulty,
				request.getSubject().trim(), request.getLevel().trim(),
				StringUtils.hasText(request.getRequirements()) ? request.getRequirements().trim() : null);
	}

	private static LinkedHashMap<String, Double> normalizeRatio(Map<String, Double> input) {
		LinkedHashMap<String, Double> result = new LinkedHashMap<>();
		if (input == null || input.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "题型配比不能为空");
		}
		for (Map.Entry<String, Double> entry : input.entrySet()) {
			SurveySchema.QuestionType type = parseType(entry.getKey());
			if (type == null || !SUPPORTED_TYPES.contains(type)) {
				throw new ErrorCodeException(ErrorCode.ValidationError,
						"题型配比里有不支持的题型：" + entry.getKey() + "（支持 " + supportedTypeNames() + "）");
			}
			Double ratio = entry.getValue();
			if (ratio == null || ratio <= 0) {
				throw new ErrorCodeException(ErrorCode.ValidationError, "题型配比必须是正数：" + entry.getKey());
			}
			result.merge(type.name(), ratio, Double::sum);
		}
		return result;
	}

	/** 题型名（忽略大小写）→ 枚举；不认识返回 null */
	public static SurveySchema.QuestionType parseType(String name) {
		if (!StringUtils.hasText(name)) {
			return null;
		}
		String value = name.trim();
		for (SurveySchema.QuestionType type : SurveySchema.QuestionType.values()) {
			if (type.name().equalsIgnoreCase(value)) {
				return type;
			}
		}
		return null;
	}

	/**
	 * 每种题型的期望题数（四舍五入，差额补到比例最大的题型上，保证合计等于题量）。
	 * <p>这是提示词与校验共用的唯一口径。
	 */
	public LinkedHashMap<String, Integer> expectedTypeCount() {
		LinkedHashMap<String, Integer> counts = new LinkedHashMap<>();
		int sum = 0;
		for (Map.Entry<String, Double> entry : typeRatio.entrySet()) {
			int count = (int) Math.round(entry.getValue().doubleValue() * questionCount);
			counts.put(entry.getKey(), Integer.valueOf(Math.max(0, count)));
			sum += Math.max(0, count);
		}
		int diff = questionCount - sum;
		if (diff != 0) {
			String largest = null;
			double maxRatio = -1;
			for (Map.Entry<String, Double> entry : typeRatio.entrySet()) {
				if (entry.getValue().doubleValue() > maxRatio) {
					maxRatio = entry.getValue().doubleValue();
					largest = entry.getKey();
				}
			}
			if (largest != null) {
				counts.put(largest, Integer.valueOf(Math.max(1, counts.get(largest).intValue() + diff)));
			}
		}
		return counts;
	}

	/** 给提示词用的一句话：「单选题 8 题、多选题 4 题、判断题 4 题、填空题 4 题」 */
	public String describeTypeCounts() {
		StringBuilder text = new StringBuilder();
		for (Map.Entry<String, Integer> entry : expectedTypeCount().entrySet()) {
			if (text.length() > 0) {
				text.append("、");
			}
			text.append(typeLabel(entry.getKey())).append("(").append(entry.getKey()).append(") ")
					.append(entry.getValue().intValue()).append(" 题");
		}
		return text.toString();
	}

	public String difficultyLabel() {
		return DIFFICULTY_LABELS.getOrDefault(difficulty, difficulty);
	}

	public String typeLabel(String typeName) {
		SurveySchema.QuestionType type = parseType(typeName);
		return type == null ? typeName : TYPE_LABELS.getOrDefault(type, typeName);
	}

	private static String supportedTypeNames() {
		StringBuilder text = new StringBuilder();
		for (SurveySchema.QuestionType type : SUPPORTED_TYPES) {
			if (text.length() > 0) {
				text.append("/");
			}
			text.append(type.name());
		}
		return text.toString();
	}

	/** 支持的题型清单（给前端的下拉框用，也是 {@link #SUPPORTED_TYPES} 的稳定顺序） */
	public static List<String> supportedTypeList() {
		return SUPPORTED_TYPES.stream().map(Enum::name).toList();
	}

}
