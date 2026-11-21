package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import lombok.Data;

import java.util.Date;
import java.util.LinkedHashMap;







@Data
public class PublicProjectView {

	private String id;

	private SurveySchema survey;


	private java.util.List<PublicQuestionOutline> outline;

	private Integer status;

	private ProjectSetting setting;

	private String name;


	private String classId;

	private ProjectModeEnum mode;

	private Boolean passwordRequired;

	private Boolean loginRequired;

	private Date createAt;

	private String submittedHtml;

	private String answerId;

	LinkedHashMap<String, Object> answer;

	LinkedHashMap<String, Object> tempAnswer;

	private Boolean isAuthenticated;


	private Boolean wechatAuthorizationRequired;

	private AnswerExamInfo examInfo;


	private AnswerMetaInfo metaInfo;

}
