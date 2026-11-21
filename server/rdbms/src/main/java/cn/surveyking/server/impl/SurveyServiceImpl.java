package cn.surveyking.server.impl;

import cn.surveyking.server.domain.dto.*;
import cn.surveyking.server.service.SurveyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
























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
