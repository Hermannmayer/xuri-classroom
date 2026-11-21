package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.ProjectStatHelper;
import cn.surveyking.server.domain.dto.AnswerItemStat;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ProjectClassAnonymousStatsView;
import cn.surveyking.server.domain.dto.ProjectQuery;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.PublicStatisticsView;
import cn.surveyking.server.mapper.AnswerItemMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.DeptMapper;
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;








@Component
@RequiredArgsConstructor
@Slf4j
public class ProjectStatisticsService {





	private static final long STAT_MAX_ANSWERS = 20000;

	private final AnswerService answerService;

	private final ProjectService projectService;

	private final AnswerItemMapper answerItemMapper;

	private final AnswerMapper answerMapper;

	private final DeptMapper deptMapper;

	public PublicStatisticsView statProject(ProjectQuery query) {
		AnswerQuery answerQuery = new AnswerQuery();
		answerQuery.setProjectId(query.getId());
		answerQuery.setPageSize(-1);




		long statTotal = answerService.count(answerQuery);
		if (statTotal > STAT_MAX_ANSWERS) {
			throw new ErrorCodeException(ErrorCode.StatisticsTooLarge);
		}
		ProjectView project = projectService.getProject(query.getId());


		long covered = answerItemMapper.countSyncedAnswers(query.getId());
		if (statTotal > 0 && covered >= statTotal) {
			try {
				return statFromProjection(project, statTotal);
			}
			catch (RuntimeException e) {


				log.warn("投影统计失败，回退内存算法: projectId={}", query.getId(), e);
			}
		}

		List<AnswerView> answers = answerService.listAnswersForStat(query.getId());
		PublicStatisticsView view = new ProjectStatHelper(project.getSurvey(), answers).stat();
		return view;
	}

	/** 总面板：按 class_id + 匿名标记统计；匿名无 class_id 的单列为「未归属」。 */
	public ProjectClassAnonymousStatsView statClassAnonymous(String projectId) {
		ProjectClassAnonymousStatsView view = new ProjectClassAnonymousStatsView();
		com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<cn.surveyking.server.domain.model.Answer> wrapper = new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<>();
		wrapper.select("class_id", "is_anonymous", "COUNT(*) AS cnt")
				.eq("project_id", projectId).eq("temp_save", 1).eq("is_deleted", 0)
				.groupBy("class_id", "is_anonymous");
		java.util.List<java.util.Map<String, Object>> rows = answerMapper.selectMaps(wrapper);
		java.util.Map<String, ProjectClassAnonymousStatsView.ClassStat> classes = new java.util.LinkedHashMap<>();
		for (java.util.Map<String, Object> row : rows) {
			long count = row.get("cnt") == null ? 0 : ((Number) row.get("cnt")).longValue();
			Object anonymousValue = row.get("is_anonymous");
			boolean anonymous = anonymousValue instanceof Boolean ? (Boolean) anonymousValue
					: anonymousValue != null && ((Number) anonymousValue).intValue() == 1;
			String classId = row.get("class_id") == null ? null : String.valueOf(row.get("class_id"));
			view.setTotal(view.getTotal() + count);
			if (anonymous) {
				view.setAnonymous(view.getAnonymous() + count);
				if (classId == null || classId.trim().isEmpty()) {
					view.setUnassignedAnonymous(view.getUnassignedAnonymous() + count);
					continue;
				}
			}
			else {
				view.setIdentified(view.getIdentified() + count);
			}
			if (classId == null || classId.trim().isEmpty()) {
				continue;
			}
			ProjectClassAnonymousStatsView.ClassStat stat = classes.computeIfAbsent(classId,
					key -> new ProjectClassAnonymousStatsView.ClassStat());
			stat.setClassId(classId);
			stat.setTotal(stat.getTotal() + count);
			if (anonymous) {
				stat.setAnonymous(stat.getAnonymous() + count);
			}
			else {
				stat.setIdentified(stat.getIdentified() + count);
			}
		}
		if (!classes.isEmpty()) {
			java.util.Map<String, String> names = deptMapper
					.selectBatchIds(classes.keySet()).stream().filter(java.util.Objects::nonNull)
					.collect(java.util.stream.Collectors.toMap(cn.surveyking.server.domain.model.Dept::getId,
							cn.surveyking.server.domain.model.Dept::getName));
			classes.values().forEach(stat -> stat.setClassName(names.getOrDefault(stat.getClassId(), stat.getClassId())));
		}
		view.setClasses(new java.util.ArrayList<>(classes.values()));
		return view;
	}

	/**
	 * 从投影表聚合：只把「题 × 选项」量级的计数读回来，不加载任何答卷 JSON。
	 */
	private PublicStatisticsView statFromProjection(ProjectView project, long total) {


		if (project == null || project.getSurvey() == null) {
			PublicStatisticsView empty = new PublicStatisticsView();
			empty.setCount((int) total);
			empty.setQuestionStatistics(new HashMap<>());
			return empty;
		}
		Map<String, Long> questionCounts = new HashMap<>();
		for (AnswerItemStat stat : answerItemMapper.statQuestions(project.getId())) {
			questionCounts.put(stat.getQuestionId(), stat.getCnt());
		}
		Map<String, Map<String, Long>> optionCounts = new HashMap<>();
		for (AnswerItemStat stat : answerItemMapper.statOptions(project.getId())) {
			optionCounts.computeIfAbsent(stat.getQuestionId(), key -> new HashMap<>()).put(stat.getOptionId(),
					stat.getCnt());
		}
		return new ProjectStatHelper(project.getSurvey()).statFromProjection(total, questionCounts, optionCounts);
	}

}
