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

	/** 待批改（或指定批改状态）的答卷列表 */
	PaginationResponse<AnswerView> listPending(AnswerQuery query);

	/** 批改详情：默认剥离正确答案 */
	AnswerGradeView detail(String answerId);

	/** 批改详情 */
	AnswerGradeView detail(String answerId, boolean includeCorrectAnswer);

	/** 保存并（可选）完成批改 */
	void submit(AnswerGradeRequest request);

	/** 撤销批改：删除指定题目的人工分并重算，questionIds 为空表示整卷清空 */
	void reset(String answerId, List<String> questionIds);

	/** 交卷 / 重新提交时的批改状态重置（由评分流程调用，不对外暴露成接口） */
	void onSubmitted(Answer answer, SurveySchema schema);

}
