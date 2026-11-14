package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;

/** 题库可用题量统计，组卷中心实时展示 */
@Data
public class ComposeStats {

	private int total;

	private Map<String, Integer> byType = new LinkedHashMap<>();

	private Map<String, Integer> byChapter = new LinkedHashMap<>();

	private Map<String, Integer> byDifficulty = new LinkedHashMap<>();

}
