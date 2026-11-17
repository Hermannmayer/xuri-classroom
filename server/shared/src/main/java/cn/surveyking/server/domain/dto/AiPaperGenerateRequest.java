package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;

/**
 * AI 出卷请求（{@code POST /api/ai/paper/generate}）。
 *
 * <p>字段与前端 client/src/api/ai.ts 的类型一一对应，前端不需要再做转换。
 *
 * <p>{@link #projectId} 可空：空表示「只生成、不落库」，用于编辑器里的纯预览；
 * 传了就只用来校验项目可见性与给模型一点上下文，出卷本身不会写库（写库只走 {@code /api/ai/paper/apply}）。
 *
 * @author p4-backend
 */
@Data
public class AiPaperGenerateRequest {

	/** 落到哪个项目（可空） */
	private String projectId;

	/** 学科 / 职业（如「养老护理员」） */
	private String subject;

	/** 级别（如「五级」） */
	private String level;

	/** 题量 */
	private Integer questionCount;

	/** 总分 */
	private Double totalScore;

	/**
	 * 题型配比：题型名（{@code SurveySchema.QuestionType} 枚举名，如 Radio/Checkbox/Judge/FillBlank）→ 比例。
	 *
	 * <p>值不要求加和为 1，后端会归一化；也不要求是整数，按比例四舍五入到题数。
	 */
	private LinkedHashMap<String, Double> typeRatio;

	/** 难度：easy / medium / hard / mixed（可空，默认 mixed） */
	private String difficulty;

	/** 自然语言补充要求，如「围绕冬季四防」 */
	private String requirements;

}
