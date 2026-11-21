package cn.surveyking.server.service;

import cn.surveyking.server.domain.dto.AiGradeSuggestRequest;
import cn.surveyking.server.domain.dto.AiGradeSuggestView;
import cn.surveyking.server.domain.dto.AiPaperApplyRequest;
import cn.surveyking.server.domain.dto.AiPaperApplyView;
import cn.surveyking.server.domain.dto.AiQuestionRewriteRequest;
import cn.surveyking.server.domain.dto.AiQuestionRewriteView;
import cn.surveyking.server.domain.dto.AiReportSummaryRequest;
import cn.surveyking.server.domain.dto.AiReportSummaryView;

import java.util.Map;


























public interface AiAssistService {

	/** 查 AI 长任务进度（组卷 / 质检 / 题库体检 / 错题推荐 / 批量批改共用同一个任务接口） */
	Map<String, Object> describeJob(String jobId);

	/** 把老师采纳的题目追加到项目 schema（不替换原有内容） */
	AiPaperApplyView applyPaper(AiPaperApplyRequest request);

	/** 改题（同步）：给 3 条建议，老师挑一条自己改 */
	AiQuestionRewriteView rewriteQuestion(AiQuestionRewriteRequest request);

	/** 批改建议（同步）：给分、置信度、采分点命中情况与理由 */
	AiGradeSuggestView suggestGrade(AiGradeSuggestRequest request);

	/** 学情总结（同步）：只吃报表统计数字，输出一段纯文本 */
	AiReportSummaryView summarizeReport(AiReportSummaryRequest request);

}
