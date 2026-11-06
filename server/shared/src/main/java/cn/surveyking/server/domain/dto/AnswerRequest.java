package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.List;

/**
 * @author javahuang
 * @date 2021/10/6
 */
@Data
public class AnswerRequest {

	private String id;

	/**
	 * 公开查询 id
	 */
	private String queryId;

	private String projectId;

	private LinkedHashMap<String, Object> answer;

	private LinkedHashMap<String, Object> tempAnswer;

	private SurveySchema survey;

	private AnswerMetaInfo metaInfo;

	/**
	 * 0 暂存 1 已完成
	 */
	private Integer tempSave;

	/**
	 * 是否「再考一次」的新一轮作答：true 时不复用本人最近一份答卷，直接新建记录
	 */
	private Boolean freshAttempt;

	/**
	 * 练习类型（O 顺序 / R 随机 / W 错题），练习记录靠它区分
	 */
	private String examExerciseType;

	private AnswerExamInfo examInfo;

	/**
	 * 答案 id 列表
	 */
	private List<String> ids;

	private String whitelistName;

	/**
	 * 创建人
	 */
	private String createBy;

	/**
	 * 修改人
	 */
	private String updateBy;

}
