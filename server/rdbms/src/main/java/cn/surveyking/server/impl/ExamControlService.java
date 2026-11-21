package cn.surveyking.server.impl;

import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AnswerMetaInfo;
import cn.surveyking.server.domain.dto.AnswerRequest;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.ProjectView;
import cn.surveyking.server.domain.dto.PublicSwitchScreenRequest;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.service.ProjectService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentMap;

import static org.apache.commons.lang3.StringUtils.isBlank;
import static org.apache.commons.lang3.StringUtils.isNotBlank;








@Component
@RequiredArgsConstructor
public class ExamControlService {

	private final ProjectService projectService;


	private final AnswerServiceImpl answerService;


	private final ConcurrentMap<String, Object> switchScreenLocks = new java.util.concurrent.ConcurrentHashMap<>();

	/**
	 * 切屏计数落库：累加到答卷 metaInfo.switchScreenTimes。
	 * 优先用前端传的 answerId（校验问卷归属）；没有答卷 id 时退回「本用户在这份问卷上最近一条记录」，
	 * 这样刷新页面后还能从 projectOutline 的 metaInfo 恢复计数。匿名且没有 answerId 时返回 0。
	 */
	public Integer recordSwitchScreen(PublicSwitchScreenRequest request) {
		if (request == null || isBlank(request.getProjectId())) {
			throw new IllegalArgumentException("缺少问卷标识");
		}
		ProjectView project = projectService.getProject(request.getProjectId());
		if (project == null) {
			throw new ErrorCodeException(ErrorCode.ProjectNotFound);
		}
		Answer answer = null;
		if (isNotBlank(request.getAnswerId())) {
			answer = answerService.getById(request.getAnswerId());
			if (answer == null || !Objects.equals(request.getProjectId(), answer.getProjectId())) {
				throw new AccessDeniedException("无权限访问该答案");
			}
		}
		else if (SecurityContextUtils.getUserId() != null) {
			answer = answerService.getOne(Wrappers.<Answer>lambdaQuery()
					.eq(Answer::getProjectId, request.getProjectId())
					.eq(Answer::getCreateBy, SecurityContextUtils.getUserId()).orderByDesc(Answer::getCreateAt)
					.last("limit 1"));
		}
		if (answer == null) {
			return 0;
		}



		synchronized (switchScreenLocks.computeIfAbsent(answer.getId(), k -> new Object())) {
			Answer latest = answerService.getById(answer.getId());
			if (latest == null) {
				return 0;
			}
			AnswerMetaInfo metaInfo = latest.getMetaInfo() == null ? new AnswerMetaInfo() : latest.getMetaInfo();
			int times = metaInfo.getSwitchScreenTimes() == null ? 0 : metaInfo.getSwitchScreenTimes();
			times += 1;
			metaInfo.setSwitchScreenTimes(times);
			latest.setMetaInfo(metaInfo);
			answerService.updateById(latest);
			return times;
		}
	}


	/**
	 * 闯关模式（passMode）超时裁决。
	 *
	 * 时间基准：逐题用时由前端计时（开始答题 → 答题/单题超时），随交卷放在
	 * {@link AnswerMetaInfo#getPassModeTimes()} 上报；**裁决与判分在服务端**：只要某题用时
	 * &gt;= passModePerSeconds（或前端明确标记了超时），就按超时处理。
	 *
	 * 判分口径：超时题在 examInfo.questionScore 里记 0 分，总分按各题分数重新求和；
	 * 非考试模式没有分值体系，只记录耗时与超时清单，不影响答案本身。
	 *
	 * @param project 项目
	 * @param request 提交请求（含前端上报的 metaInfo）
	 * @param answerView 已保存的答卷视图（方法内就地修正分数）
	 */
	public void applyPassModePenalty(ProjectView project, AnswerRequest request, AnswerView answerView) {
		ProjectSetting setting = project.getSetting();
		ProjectSetting.ExamSetting examSetting = setting == null ? null : setting.getExamSetting();
		AnswerMetaInfo metaInfo = request.getMetaInfo();
		if (examSetting == null || !Boolean.TRUE.equals(examSetting.getPassMode()) || metaInfo == null
				|| (CollectionUtils.isEmpty(metaInfo.getPassModeTimes())
						&& CollectionUtils.isEmpty(metaInfo.getPassModeTimeouts()))) {
			return;
		}
		Integer limit = examSetting.getPassModePerSeconds();
		Set<String> timeouts = new LinkedHashSet<>();
		if (metaInfo.getPassModeTimeouts() != null) {
			timeouts.addAll(metaInfo.getPassModeTimeouts());
		}
		if (limit != null && limit > 0 && metaInfo.getPassModeTimes() != null) {
			metaInfo.getPassModeTimes().forEach((questionId, spent) -> {
				if (spent != null && spent >= limit) {
					timeouts.add(questionId);
				}
			});
		}

		if (ProjectModeEnum.exam.equals(project.getMode()) && answerView.getExamInfo() != null) {
			LinkedHashMap<String, Double> questionScore = answerView.getExamInfo().getQuestionScore();
			if (questionScore != null) {
				timeouts.forEach(questionId -> questionScore.put(questionId, 0.0D));
				double total = questionScore.values().stream().filter(Objects::nonNull)
						.mapToDouble(Double::doubleValue).sum();
				answerView.setExamScore(total);
			}
		}

		Answer saved = answerService.getById(answerView.getId());
		if (saved == null) {
			return;
		}
		AnswerMetaInfo savedMeta = saved.getMetaInfo() == null ? new AnswerMetaInfo() : saved.getMetaInfo();
		savedMeta.setPassModeTimes(metaInfo.getPassModeTimes());
		savedMeta.setPassModeTimeouts(new ArrayList<>(timeouts));
		saved.setMetaInfo(savedMeta);
		if (ProjectModeEnum.exam.equals(project.getMode())) {
			saved.setExamScore(answerView.getExamScore());
			saved.setExamInfo(answerView.getExamInfo());
		}
		answerService.updateById(saved);
	}


	/**
	 * 判断考试是否结束，未设置默认为已结束
	 * @param examSetting
	 * @return
	 */
	public boolean examFinished(ProjectSetting.ExamSetting examSetting) {
		if (examSetting.getEndTime() == null || examSetting.getEndTime() < System.currentTimeMillis()) {
			return true;
		}
		return false;
	}

}
