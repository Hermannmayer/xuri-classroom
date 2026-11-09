package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.ProjectStatHelper;
import cn.surveyking.server.domain.dto.AnswerItemStat;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ProjectQuery;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.PublicStatisticsView;
import cn.surveyking.server.mapper.AnswerItemMapper;
import cn.surveyking.server.service.AnswerService;
import cn.surveyking.server.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 答卷统计：优先走投影表的 SQL 聚合，历史数据没回填时回退到内存算法。
 *
 * <p>
 * 从 {@code SurveyServiceImpl} 拆出的第三块。它只读答卷与投影明细，不写任何数据，
 * 因此交卷侧的口径校验（{@code validateAnswer} 的选项配额）也能直接复用它。
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ProjectStatisticsService {

	/**
	 * 单次统计允许的最大答卷数。超过就拒绝并提示按班级/时间段筛选：
	 * 统计会把整场答卷读进内存做「答卷 × 题 × 选项」聚合，没有上限就等于给 OOM 留口子。
	 */
	private static final long STAT_MAX_ANSWERS = 20000;

	private final AnswerService answerService;

	private final ProjectService projectService;

	private final AnswerItemMapper answerItemMapper;

	public PublicStatisticsView statProject(ProjectQuery query) {
		AnswerQuery answerQuery = new AnswerQuery();
		answerQuery.setProjectId(query.getId());
		answerQuery.setPageSize(-1);
		// 统计是「全部答卷进内存做聚合」：先计数，超过保护阈值直接拒绝，
		// 让调用方按班级/时间段分批，避免一次统计把堆打满（-Xmx768m 下这是最容易 OOM 的读接口）。
		long statTotal = answerService.count(answerQuery);
		if (statTotal > STAT_MAX_ANSWERS) {
			throw new ErrorCodeException(ErrorCode.StatisticsTooLarge);
		}
		ProjectView project = projectService.getProject(query.getId());
		// 投影表覆盖了全部答卷才走 SQL 聚合；历史数据还没回填时回退到内存算法，
		// 保证「回填前、回填中、回填后」三个阶段统计数字都不变（宁可慢，不可少算）。
		long covered = answerItemMapper.countSyncedAnswers(query.getId());
		if (statTotal > 0 && covered >= statTotal) {
			try {
				return statFromProjection(project, statTotal);
			}
			catch (RuntimeException e) {
				// 投影聚合出任何意外都不能让统计直接 500：回退到内存算法，
				// 结果一样（只是慢），同时留一条日志便于定位投影表的脏数据。
				log.warn("投影统计失败，回退内存算法: projectId={}", query.getId(), e);
			}
		}
		// 统计不需要整卷快照，也不套行级数据范围（权限由方法上的 @PreAuthorize 保证）
		List<AnswerView> answers = answerService.listAnswersForStat(query.getId());
		PublicStatisticsView view = new ProjectStatHelper(project.getSurvey(), answers).stat();
		return view;
	}

	/**
	 * 从投影表聚合：只把「题 × 选项」量级的计数读回来，不加载任何答卷 JSON。
	 */
	private PublicStatisticsView statFromProjection(ProjectView project, long total) {
		// 极端数据：项目没有 survey（早期导入 / 手动改库），题面为空时投影聚合没有题可对齐，
		// 直接返回「有总数、无逐题」的结果，而不是抛 NPE 让整个统计接口 500。
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
