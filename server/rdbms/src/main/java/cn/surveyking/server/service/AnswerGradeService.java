package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.AnswerGradeRequest;
import cn.surveyking.server.domain.dto.AnswerGradeView;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Answer;

import java.util.List;
















public interface AnswerGradeService {

	/**
	 * 待批改（或指定批改状态）的答卷列表。
	 *
	 * <p>只返回正式提交（temp_save=1）的答卷；默认过滤 grade_status=pending。
	 */
	PaginationResponse<AnswerView> listPending(AnswerQuery query);

	/** 批改详情：默认剥离正确答案 */
	AnswerGradeView detail(String answerId);

	/**
	 * 批改详情。
	 * @param includeCorrectAnswer 是否下发 examCorrectAnswer / examAnalysis。
	 * 默认 false：这个接口按权限只给老师用，但默认最小化下发，避免前端顺手把答案渲染到学生可见的位置
	 */
	AnswerGradeView detail(String answerId, boolean includeCorrectAnswer);

	/**
	 * 保存并（可选）完成批改。
	 * @throws jakarta.validation.ValidationException 题目不是人工评分题、分数越界等（HTTP 400）
	 */
	void submit(AnswerGradeRequest request);

	/**
	 * 撤销批改：删除指定题目的人工分并重算，questionIds 为空表示整卷清空。
	 */
	void reset(String answerId, List<String> questionIds);

	/**
	 * 交卷 / 重新提交时的批改状态重置（由评分流程调用，不对外暴露成接口）。
	 *

	 * 同时清空该答卷的全部人工分（答卷内容已经变了，旧分不再对应当前答案）。
	 */
	void onSubmitted(Answer answer, SurveySchema schema);

}
