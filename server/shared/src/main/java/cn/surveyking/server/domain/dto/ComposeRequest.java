package cn.surveyking.server.domain.dto;

import cn.surveyking.server.domain.dto.SurveySchema.QuestionType;
import lombok.Data;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 组卷请求：范围 + 规则 + 套数。plan 只算不写，create 落库。
 */
@Data
public class ComposeRequest {

	private String name;

	/** 创建到哪个文件夹 */
	private String parentId;

	/** 项目分类 */
	private String category;

	private List<String> repoIds = new ArrayList<>();

	private List<QuestionType> types = new ArrayList<>();

	private List<String> chapters = new ArrayList<>();

	private List<String> difficulties = new ArrayList<>();

	/** 知识点（标签），任一命中即可 */
	private List<String> tags = new ArrayList<>();

	private String keyword;

	/** random | ratio | sequential */
	private String mode = "random";

	/** 按题型配题数：key = 题型名（Radio/Checkbox/...） */
	private Map<String, Integer> counts = new LinkedHashMap<>();

	/** 按题型配每题分值 */
	private Map<String, Double> scores = new LinkedHashMap<>();

	/** 按比例：key = 题型名，value = 权重 */
	private Map<String, Integer> ratios = new LinkedHashMap<>();

	/** 顺序区间：key = 题型名，value = [start, end]（1 基） */
	private Map<String, Integer> rangeStart = new LinkedHashMap<>();

	private Map<String, Integer> rangeEnd = new LinkedHashMap<>();

	private Integer totalQuestions;

	/** 难度权重：易/中/难 → 权重 */
	private Map<String, Double> difficultyWeights = new LinkedHashMap<>();

	private Integer sets = 1;

	private Long seed;

	private Boolean uniqueAcrossPapers = true;

	/** reuse | less | error */
	private String shortagePolicy = "less";

	/** 生成后是否立即发布为考试项目 */
	private Boolean publish = Boolean.FALSE;

}
