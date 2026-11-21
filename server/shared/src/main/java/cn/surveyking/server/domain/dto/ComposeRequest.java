package cn.surveyking.server.domain.dto;

import cn.surveyking.server.domain.dto.SurveySchema.QuestionType;
import lombok.Data;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;




@Data
public class ComposeRequest {

	private String name;


	private String parentId;


	private String category;

	private List<String> repoIds = new ArrayList<>();

	private List<QuestionType> types = new ArrayList<>();

	private List<String> chapters = new ArrayList<>();

	private List<String> difficulties = new ArrayList<>();


	private List<String> tags = new ArrayList<>();

	private String keyword;


	private String mode = "random";


	private Map<String, Integer> counts = new LinkedHashMap<>();


	private Map<String, Double> scores = new LinkedHashMap<>();


	private Map<String, Integer> ratios = new LinkedHashMap<>();


	private Map<String, Integer> rangeStart = new LinkedHashMap<>();

	private Map<String, Integer> rangeEnd = new LinkedHashMap<>();

	private Integer totalQuestions;


	private Map<String, Double> difficultyWeights = new LinkedHashMap<>();

	private Integer sets = 1;

	private Long seed;

	private Boolean uniqueAcrossPapers = true;


	private String shortagePolicy = "less";


	private Boolean publish = Boolean.FALSE;

}
