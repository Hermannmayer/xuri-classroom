package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.service.SurveyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 公开答题入口。
 *
 * <p>
 * 这里只剩 13 个接口方法的薄委托（{@code validateProject} 有 ProjectQuery / ProjectView 两个重载），
 * 实现按职责拆在同包的组件里，依赖方向是单向的，不存在构造器循环依赖：
 *
 * <pre>
 * PublicProjectLoader      → LoginFormValidator / ProjectAnswerValidator / AnswerLookup / WechatAccessGuard
 * LoginFormValidator       → AnswerLimitGuard
 * ProjectAnswerValidator   → AnswerLookup / AnswerLimitGuard / ProjectStatisticsService
 * PublicAnswerSubmitter    → AnswerLookup / ProjectAnswerValidator / AnswerValidationService / WechatAccessGuard
 * PublicSurveyExtrasService→ AnswerLookup / WechatAccessGuard / ExamControlService
 * ProjectStatisticsService → 无（只依赖 AnswerService / ProjectService / AnswerItemMapper）
 * </pre>
 *
 * <p>
 * 类上的 {@code @Transactional} 保留：接口调用方（Controller、{@code FileServiceImpl}）
 * 拿到的仍是同一个事务边界，组件方法在事务内被调用，语义与拆分前一致。
 *
 * @author javahuang
 * @date 2021/8/22
 */
@Service
@Transactional
@RequiredArgsConstructor
public class SurveyServiceImpl implements SurveyService {

	private final PublicProjectLoader publicProjectLoader;

	private final ProjectStatisticsService projectStatisticsService;

	private final PublicAnswerSubmitter publicAnswerSubmitter;

	private final ProjectAnswerValidator projectAnswerValidator;

	private final PublicSurveyExtrasService publicSurveyExtrasService;

	@Override
	public PublicProjectView loadProject(ProjectQuery projectQuery) {
		return publicProjectLoader.loadProject(projectQuery);
	}

	@Override
	public PublicProjectView loadProjectOutline(ProjectQuery query) {
		return publicProjectLoader.loadProjectOutline(query);
	}

	@Override
	public PublicProjectView validateProjectOutline(ProjectQuery query) {
		return publicProjectLoader.validateProjectOutline(query);
	}

	@Override
	public SurveySchema loadPublicQuestion(PublicQuestionRequest request) {
		return publicProjectLoader.loadPublicQuestion(request);
	}

	@Override
	public PublicStatisticsView statProject(ProjectQuery query) {
		return projectStatisticsService.statProject(query);
	}

	@Override
	@Transactional(rollbackFor = Exception.class)
	public PublicAnswerView saveAnswer(AnswerRequest request) {
		return publicAnswerSubmitter.saveAnswer(request);
	}

	@Override
	public PublicProjectView validateProject(ProjectQuery query) {
		return publicProjectLoader.validateProject(query);
	}

	@Override
	public List<PublicDictView> loadDict(PublicDictRequest request) {
		return publicSurveyExtrasService.loadDict(request);
	}

	@Override
	public PublicExamResult loadExamResult(PublicExamRequest request) {
		return publicSurveyExtrasService.loadExamResult(request);
	}

	@Override
	public void tempSaveAnswer(AnswerRequest request) {
		publicAnswerSubmitter.tempSaveAnswer(request);
	}

	@Override
	public PublicLinkResult loadLinkResult(PublicLinkRequest request) {
		return publicSurveyExtrasService.loadLinkResult(request);
	}

	@Override
	public List<PublicAttemptView> listPublicAttempts(PublicAttemptRequest request) {
		return publicSurveyExtrasService.listPublicAttempts(request);
	}

	@Override
	public void validateProject(ProjectView project) {
		projectAnswerValidator.validateProject(project);
	}

}
