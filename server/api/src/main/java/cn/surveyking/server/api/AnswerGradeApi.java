package cn.surveyking.server.api;

import cn.surveyking.server.core.annotation.EnableDataPerm;
import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.AnswerGradeRequest;
import cn.surveyking.server.domain.dto.AnswerGradeView;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.service.AnswerGradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;















@RestController
@RequestMapping("${api.prefix}/answer/grade")
@RequiredArgsConstructor
public class AnswerGradeApi {

	private final AnswerGradeService answerGradeService;

	/**
	 * 待批改答卷列表。
	 * @param query 查询条件（projectId 必传；gradeStatus 缺省按 pending 过滤）
	 */
	@PreAuthorize("hasAuthority('answer:grade') or hasRole('admin')")
	@EnableDataPerm(key = "#query.projectId")
	@GetMapping("/list")
	public PaginationResponse<AnswerView> listPending(AnswerQuery query) {
		return answerGradeService.listPending(query);
	}

	/**
	 * 批改详情：整卷题目 + 逐题得分 + 当前汇总分。
	 * @param answerId 答卷 id
	 * @param includeCorrectAnswer 是否下发参考答案 / 解析，默认 false
	 */
	@PreAuthorize("hasAuthority('answer:grade') or hasRole('admin')")
	@GetMapping("/detail")
	public AnswerGradeView detail(@RequestParam String answerId,
			@RequestParam(defaultValue = "false") boolean includeCorrectAnswer) {
		return answerGradeService.detail(answerId, includeCorrectAnswer);
	}

	/**
	 * 保存批改：只接受 examAnswerMode=manual 的题，客观题传分会 400。
	 */
	@PreAuthorize("hasAuthority('answer:grade') or hasRole('admin')")
	@PostMapping
	public void submit(@RequestBody AnswerGradeRequest request) {
		answerGradeService.submit(request);
	}

	/**
	 * 撤销批改：删除指定题目的人工分并重算；questionIds 为空表示整卷清空。
	 */
	@PreAuthorize("hasAuthority('answer:grade') or hasRole('admin')")
	@PostMapping("/reset")
	public void reset(@RequestBody AnswerGradeRequest request) {
		answerGradeService.reset(request.getAnswerId(), request.getQuestionIds());
	}

}
