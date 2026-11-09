package cn.surveyking.server.impl;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerRequest;
import cn.surveyking.server.domain.dto.ExerciseView;
import cn.surveyking.server.domain.dto.HistoryExerciseQuery;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.mapper.AnswerMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 题库练习记录：历史列表与删除。
 *
 * <p>
 * 从 {@code AnswerServiceImpl} 切出。原来用 {@code ServiceImpl} 的 {@code page/count/remove}，
 * 这里改为等价的 {@code AnswerMapper.selectPage/selectCount/delete}（{@code ServiceImpl}
 * 本来就是这层包装）。
 */
@Component
@RequiredArgsConstructor
public class ExerciseAnswerService {

	private final AnswerMapper answerMapper;

	public PaginationResponse<ExerciseView> historyExercise(HistoryExerciseQuery query) {
		Page<Answer> page = new Page<>(query.getCurrent(), query.getPageSize());
		answerMapper.selectPage(page, Wrappers.<Answer>lambdaQuery()
				.eq(query.getProjectId() != null, Answer::getProjectId, query.getProjectId())
				.isNotNull(Answer::getExamExerciseType)
				// 只显示「真的动过」的记录：已交卷，或暂存里有内容。
				// 点一下「开始练习」就会建一条空 record，不滤掉的话练习记录里全是 0% 的空条目。
				.and(w -> w.eq(Answer::getTempSave, 1).or().isNotNull(Answer::getTempAnswer).ne(Answer::getTempAnswer,
						""))
				.eq(query.getTempSave() != null, Answer::getTempSave, query.getTempSave())
				.eq(Answer::getCreateBy, SecurityContextUtils.getUserId()).orderByDesc(Answer::getCreateAt));

		List<ExerciseView> list = page.getRecords().stream().map(x -> {
			ExerciseView view = new ExerciseView();
			view.setId(x.getId());
			view.setProjectName(x.getProjectId());
			view.setTempSave(x.getTempSave());
			view.setCreateAt(x.getCreateAt());
			view.setExamExerciseType(x.getExamExerciseType());
			view.setAnswerId(x.getId());
			SurveySchema schema = x.getSurvey();
			view.setProjectName(schema.getTitle());
			view.setRepoId(x.getRepoId());
			view.setPercent(0L);

			if (x.getSurvey() == null || x.getTempAnswer() == null || x.getSurvey().getChildren().isEmpty()) {
				return view;
			}
			int totalQuestions = x.getSurvey().getChildren().size();
			int answeredQuestions = x.getTempSave() == 1 ? x.getAnswer().size() : x.getTempAnswer().size();

			double percent = ((double) answeredQuestions / totalQuestions) * 100;
			view.setPercent(Math.round(percent));
			return view;
		}).collect(Collectors.toList());

		return new PaginationResponse<>(page.getTotal(), list);
	}

	public void deleteExercise(AnswerRequest request) {
		if (request == null || CollectionUtils.isEmpty(request.getIds())) {
			return;
		}
		Set<String> exerciseIds = request.getIds().stream().filter(StringUtils::hasText)
				.collect(Collectors.toCollection(LinkedHashSet::new));
		if (exerciseIds.isEmpty()) {
			return;
		}
		long ownedExerciseCount = answerMapper.selectCount(Wrappers.<Answer>lambdaQuery().in(Answer::getId, exerciseIds)
				.isNotNull(Answer::getExamExerciseType).eq(Answer::getCreateBy, SecurityContextUtils.getUserId()));
		if (ownedExerciseCount != exerciseIds.size()) {
			throw new AccessDeniedException("只能删除自己的练习记录");
		}
		answerMapper.delete(Wrappers.<Answer>lambdaQuery().in(Answer::getId, exerciseIds)
				.isNotNull(Answer::getExamExerciseType).eq(Answer::getCreateBy, SecurityContextUtils.getUserId()));
	}

}
