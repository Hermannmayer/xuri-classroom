package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;


@Data
public class ComposeStats {

	private int total;

	private Map<String, Integer> byType = new LinkedHashMap<>();

	private Map<String, Integer> byChapter = new LinkedHashMap<>();

	private Map<String, Integer> byDifficulty = new LinkedHashMap<>();

}
