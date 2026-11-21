package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;





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




	private Integer rank;




	private AnswerExamInfo examInfo;




	private Integer tempSave;




	private Integer attemptNo;

	private Date createAt;

	private String createByName;

	private String createBy;




	private String answererName;




	private String gradeStatus;


	private String gradedBy;


	private Date gradedAt;





	private Boolean aiGraded;





	private Boolean isAnonymous;

	private Date updateAt;

	private String updateBy;

}
