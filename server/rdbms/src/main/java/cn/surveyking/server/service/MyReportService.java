package cn.surveyking.server.service;

import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.MyReportView;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 「我的成绩」：按考试聚合当前用户已交卷的答卷。
 *
 * <p>只查当前登录用户自己的答卷（createBy = 当前用户），所以不需要额外的数据权限切面；
 * 管理员看自己的成绩也是同一口径。
 */
@Service
@RequiredArgsConstructor
public class MyReportService {

	private final AnswerMapper answerMapper;

	private final ProjectMapper projectMapper;

	public List<MyReportView> listMine() {
		String userId = SecurityContextUtils.getUserId();
		if (userId == null) {
			return new ArrayList<>();
		}
		// tempSave = 1 表示已交卷；逻辑删除由 @TableLogic 自动过滤
		List<Answer> answers = answerMapper.selectList(
				Wrappers.<Answer>lambdaQuery().eq(Answer::getCreateBy, userId).eq(Answer::getTempSave, 1));
		Map<String, List<Answer>> byProject = answers.stream().filter(a -> a.getProjectId() != null)
				.collect(Collectors.groupingBy(Answer::getProjectId));
		if (byProject.isEmpty()) {
			return new ArrayList<>();
		}
		Map<String, Project> projects = projectMapper.selectBatchIds(byProject.keySet()).stream()
				.collect(Collectors.toMap(Project::getId, p -> p, (a, b) -> a));
		List<MyReportView> result = new ArrayList<>();
		byProject.forEach((projectId, list) -> {
			Project project = projects.get(projectId);
			if (project == null) {
				return;
			}
			MyReportView view = new MyReportView();
			view.setProjectId(projectId);
			view.setProjectName(project.getName());
			view.setStatus(project.getStatus());
			view.setAttempts(list.size());
			view.setBestScore(list.stream().map(Answer::getExamScore).filter(Objects::nonNull).max(Double::compareTo)
					.orElse(null));
			view.setLastSubmitAt(
					list.stream().map(Answer::getUpdateAt).filter(Objects::nonNull).max(Date::compareTo).orElse(null));
			result.add(view);
		});
		result.sort(Comparator.comparing(MyReportView::getLastSubmitAt,
				Comparator.nullsLast(Comparator.reverseOrder())));
		return result;
	}

}
