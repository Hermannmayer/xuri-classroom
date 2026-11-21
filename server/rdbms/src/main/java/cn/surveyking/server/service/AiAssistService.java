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

	/**
	 * 查 AI 长任务进度（组卷 / 质检 / 题库体检 / 错题推荐 / 批量批改共用同一个任务接口）。
	 * <p>返回 {@code {jobId, scene, status, progress, error, result, createdAt, finishedAt}}；
	 * {@code result} 的具体结构由 scene 决定，前端按场景自行收窄。
	 * <p>只能看自己发起的任务，管理员除外。
	 */
	Map<String, Object> describeJob(String jobId);

	/**
	 * 把老师采纳的题目<b>追加</b>到项目 schema（不替换原有内容）。
	 * <p>需要 {@code project:update} 与项目可编辑权限；写入前会再过一遍逐题校验，保证采纳的题能判分。
	 */
	AiPaperApplyView applyPaper(AiPaperApplyRequest request);

	/** 改题（同步）：给 3 条建议，老师挑一条自己改 */
	AiQuestionRewriteView rewriteQuestion(AiQuestionRewriteRequest request);

	/**
	 * 批改建议（同步）：给分、置信度、采分点命中情况与理由。
	 * <p>需要 {@code answer:grade} + 答卷行级权限；<b>不会写库</b>。
	 */
	AiGradeSuggestView suggestGrade(AiGradeSuggestRequest request);

	/** 学情总结（同步）：只吃报表统计数字，输出一段纯文本 */
	AiReportSummaryView summarizeReport(AiReportSummaryRequest request);

}
