package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;

/**
 * @author javahuang
 * @date 2021/10/6
 */
@Data
public class AnswerView {

	private String id;

	private String projectId;

	private LinkedHashMap<String, Object> answer;

	private LinkedHashMap<String, Object> tempAnswer;

	private SurveySchema survey;

	private List<FileView> attachment = new ArrayList<>();

	private List<UserInfo> users;

	private List<DeptView> depts;

	private AnswerMetaInfo metaInfo;

	private Double examScore;

	/**
	 * 考试排名信息
	 */
	private Integer rank;

	/**
	 * 考试信息
	 */
	private AnswerExamInfo examInfo;

	/**
	 * 0 暂存 1 已完成
	 */
	private Integer tempSave;

	private Date createAt;

	private String createByName;

	private String createBy;

	/**
	 * 是否匿名答卷。管理端据此显示「匿名」标识，导出时提交人写「匿名」；
	 * 不暴露 anonymousSubjectId，避免把同一匿名主体的多份答卷关联起来。
	 */
	private Boolean isAnonymous;

	private Date updateAt;

	private String updateBy;

}
