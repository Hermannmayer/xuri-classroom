package cn.surveyking.server.domain.dto;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import lombok.Data;

import java.util.Date;
import java.util.LinkedHashMap;

/**
 * 答卷页面
 *
 * @author javahuang
 * @date 2021/8/26
 */
@Data
public class PublicProjectView {

	private String id;

	private SurveySchema survey;

	/** 逐题下发时返回的最小题目大纲；此模式下 survey 为 null。 */
	private java.util.List<PublicQuestionOutline> outline;

	private Integer status;

	private ProjectSetting setting;

	private String name;

	private ProjectModeEnum mode;

	private Boolean passwordRequired;

	private Boolean loginRequired;

	private Date createAt;

	private String submittedHtml;

	private String answerId;

	LinkedHashMap<String, Object> answer;

	LinkedHashMap<String, Object> tempAnswer;

	private Boolean isAuthenticated;

	/** 已配置微信公众号登录，但当前浏览器还没有完成本问卷的微信授权。 */
	private Boolean wechatAuthorizationRequired;

	private AnswerExamInfo examInfo;

	/** 当前作答的元信息（切屏次数等）；刷新页面后前端用它恢复计数 */
	private AnswerMetaInfo metaInfo;

}
