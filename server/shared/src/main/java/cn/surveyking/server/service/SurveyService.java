package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.*;

import java.util.List;

/**
 * @author javahuang
 * @date 2021/8/22
 */
public interface SurveyService {

	PublicProjectView loadProject(ProjectQuery projectQuery);

	/** 返回不含题干和选项的答题项目元数据与最小题目大纲。 */
	PublicProjectView loadProjectOutline(ProjectQuery query);

	PublicProjectView validateProjectOutline(ProjectQuery query);

	/** 在完成 loadProject 同等访问校验后，返回指定题目并剥离标准答案与解析。 */
	SurveySchema loadPublicQuestion(PublicQuestionRequest request);

	PublicStatisticsView statProject(ProjectQuery query);

	PublicAnswerView saveAnswer(AnswerRequest request);

	PublicQueryVerifyView loadQuery(PublicQueryRequest request);

	PublicQueryView getQueryResult(PublicQueryRequest request);

	PublicProjectView validateProject(ProjectQuery query);

	List<PublicDictView> loadDict(PublicDictRequest request);

	PublicExamResult loadExamResult(PublicExamRequest request);

	void tempSaveAnswer(AnswerRequest request);

	PublicLinkResult loadLinkResult(PublicLinkRequest request);

	/** 切屏计数落库：累加答卷 metaInfo.switchScreenTimes，返回当前累计次数。 */
	Integer recordSwitchScreen(PublicSwitchScreenRequest request);

	/** 当前登录用户在某场考试里的历次已提交答卷，按时间倒序。 */
	List<PublicAttemptView> listPublicAttempts(PublicAttemptRequest request);

	void validateProject(ProjectView project);

}
