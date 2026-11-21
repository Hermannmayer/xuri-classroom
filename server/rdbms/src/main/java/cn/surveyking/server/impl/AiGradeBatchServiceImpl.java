package cn.surveyking.server.impl;

import cn.surveyking.server.ai.core.AiCompletion;
import cn.surveyking.server.ai.core.AiJobService;
import cn.surveyking.server.ai.core.AiRequest;
import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.core.constant.ErrorCode;
import cn.surveyking.server.core.exception.ErrorCodeException;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.AiGradeBatchRequest;
import cn.surveyking.server.domain.dto.AiGradeBatchView;
import cn.surveyking.server.domain.dto.AnswerGradeItemView;
import cn.surveyking.server.domain.dto.AnswerGradeRequest;
import cn.surveyking.server.domain.dto.AnswerGradeView;
import cn.surveyking.server.domain.dto.AnswerQuery;
import cn.surveyking.server.domain.dto.AnswerView;
import cn.surveyking.server.service.AiGradeBatchService;
import cn.surveyking.server.service.AiUsageService;
import cn.surveyking.server.service.AnswerGradeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;























@Service
@RequiredArgsConstructor
@Slf4j
public class AiGradeBatchServiceImpl implements AiGradeBatchService {


	private static final String PROMPT_GRADE = "grade-suggest";


	private static final int DEFAULT_MAX_ANSWERS = 30;


	private static final int MAX_ANSWERS_LIMIT = 100;


	private static final int MAX_ITEMS_PER_RUN = 200;


	private static final double DEFAULT_MIN_CONFIDENCE = 0.6D;


	private static final int MAX_ANSWER_CHARS = 2000;


	private static final long UNDO_TTL_MILLIS = 24L * 60L * 60L * 1000L;

	private final AiAssistSupport support;

	private final AiJobService aiJobService;

	private final AnswerGradeService answerGradeService;


	private final Map<String, UndoRecord> undoRecords = new ConcurrentHashMap<>();

	@Override
	public String start(AiGradeBatchRequest request) {
		if (request == null || !StringUtils.hasText(request.getProjectId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择要批改的试卷");
		}

		if (!SecurityContextUtils.isAdmin() && !SecurityContextUtils.hasAuthority("answer:grade")) {
			throw new AccessDeniedException("没有批改答卷的权限");
		}
		String projectId = request.getProjectId();
		support.readableProject(projectId);
		String userId = SecurityContextUtils.getUserId();

		support.assertQuota(userId);

		int maxAnswers = request.getMaxAnswers() == null ? DEFAULT_MAX_ANSWERS
				: Math.max(1, Math.min(MAX_ANSWERS_LIMIT, request.getMaxAnswers().intValue()));
		AnswerQuery query = new AnswerQuery();
		query.setProjectId(projectId);
		query.setClassId(StringUtils.hasText(request.getClassId()) ? request.getClassId() : null);
		query.setGradeStatus("pending");
		query.setCurrent(Integer.valueOf(1));
		query.setPageSize(Integer.valueOf(maxAnswers));
		PaginationResponse<AnswerView> page = answerGradeService.listPending(query);
		List<AnswerView> answers = page == null || CollectionUtils.isEmpty(page.getList()) ? List.of() : page.getList();
		if (answers.isEmpty()) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "这份试卷没有待批改的答卷（主观题都批完了）");
		}

		boolean dryRun = Boolean.TRUE.equals(request.getDryRun());
		double minConfidence = request.getMinConfidence() == null ? DEFAULT_MIN_CONFIDENCE
				: Math.max(0D, Math.min(1D, request.getMinConfidence().doubleValue()));

		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		String scene = AiUsageService.SCENE_GRADE_BATCH;
		return aiJobService.submit(scene, userId, context -> {
			SecurityContextHolder.getContext().setAuthentication(authentication);
			try {
				run(context, answers, userId, minConfidence, dryRun);
			}
			finally {
				SecurityContextHolder.clearContext();
			}
		});
	}

	/** 任务体：逐份答卷、逐道未给分的主观题给分 */
	private void run(AiJobService.JobContext context, List<AnswerView> answers, String userId, double minConfidence,
			boolean dryRun) {
		AiGradeBatchView view = new AiGradeBatchView();
		int answersDone = 0;
		int items = 0;
		int graded = 0;
		int skipped = 0;
		int failed = 0;
		Map<String, List<String>> undoMap = new LinkedHashMap<>();
		List<AiGradeBatchView.Low> low = new ArrayList<>();
		List<String> answerIds = new ArrayList<>();

		for (int index = 0; index < answers.size(); index++) {
			AnswerView answer = answers.get(index);
			context.progress(Math.min(95, 5 + index * 90 / Math.max(1, answers.size())));
			if (answer == null || !StringUtils.hasText(answer.getId())) {
				continue;
			}
			AnswerGradeView detail;
			try {
				detail = answerGradeService.detail(answer.getId(), true);
			}
			catch (RuntimeException e) {
				failed++;
				log.warn("AI 批改：读取答卷失败 answerId={}, {}", answer.getId(), e.getMessage());
				continue;
			}
			if (detail == null || CollectionUtils.isEmpty(detail.getItems())) {
				continue;
			}
			List<AnswerGradeRequest.Item> pending = new ArrayList<>();
			for (AnswerGradeItemView item : detail.getItems()) {
				if (item == null || !Boolean.TRUE.equals(item.getEditable()) || item.getScore() != null) {
					continue;
				}
				if (items >= MAX_ITEMS_PER_RUN) {
					break;
				}
				items++;
				Double maxScore = item.getMaxScore();
				if (maxScore == null || maxScore.doubleValue() <= 0 || !StringUtils.hasText(item.getCorrectAnswer())) {
					skipped++;
					continue;
				}
				try {
					Suggestion suggestion = grade(item, maxScore.doubleValue(), userId);
					AnswerGradeRequest.Item gradeItem = new AnswerGradeRequest.Item();
					gradeItem.setQuestionId(item.getQuestionId());
					gradeItem.setScore(Double.valueOf(suggestion.score()));
					gradeItem.setComment(suggestion.comment());

					gradeItem.setSource("ai");
					pending.add(gradeItem);
					if (suggestion.confidence() < minConfidence) {
						AiGradeBatchView.Low row = new AiGradeBatchView.Low();
						row.setAnswerId(answer.getId());
						row.setAnswererName(detail.getAnswererName());
						row.setQuestionId(item.getQuestionId());
						row.setQuestionTitle(AiAssistSupport.plainTitle(item.getTitle(), 40));
						row.setScore(Double.valueOf(suggestion.score()));
						row.setMaxScore(maxScore);
						row.setConfidence(Double.valueOf(suggestion.confidence()));
						row.setReason(suggestion.reason());
						low.add(row);
					}
				}
				catch (ErrorCodeException e) {

					if (e.getMessage() != null && e.getMessage().contains("上限")) {
						throw e;
					}
					failed++;
					log.warn("AI 批改：单题失败 answerId={}, questionId={}, {}", answer.getId(), item.getQuestionId(),
							e.getMessage());
				}
				catch (RuntimeException e) {
					failed++;
					log.warn("AI 批改：单题异常 answerId={}, questionId={}, {}", answer.getId(), item.getQuestionId(),
							e.getMessage());
				}
			}
			answersDone++;
			answerIds.add(answer.getId());
			if (pending.isEmpty()) {
				continue;
			}
			graded += pending.size();
			if (!dryRun) {
				AnswerGradeRequest gradeRequest = new AnswerGradeRequest();
				gradeRequest.setAnswerId(answer.getId());
				gradeRequest.setItems(pending);

				gradeRequest.setSubmit(Boolean.TRUE);
				answerGradeService.submit(gradeRequest);
				List<String> questionIds = new ArrayList<>();
				for (AnswerGradeRequest.Item item : pending) {
					questionIds.add(item.getQuestionId());
				}
				undoMap.put(answer.getId(), questionIds);
			}
		}

		view.setAnswers(Integer.valueOf(answersDone));
		view.setItems(Integer.valueOf(items));
		view.setGraded(Integer.valueOf(graded));
		view.setSkipped(Integer.valueOf(skipped));
		view.setFailed(Integer.valueOf(failed));
		view.setLowConfidence(low);
		view.setAnswerIds(answerIds);
		view.setSummary(summary(answersDone, graded, skipped, failed, low.size(), dryRun));
		if (!dryRun && !undoMap.isEmpty()) {
			String token = UUID.randomUUID().toString().replace("-", "");
			undoRecords.put(token, new UndoRecord(userId, undoMap, System.currentTimeMillis() + UNDO_TTL_MILLIS));
			view.setUndoToken(token);
		}
		context.progress(99);
		context.result(view);
		log.info("AI 批量批改完成: answers={}, items={}, graded={}, skipped={}, failed={}, low={}, dryRun={}", answersDone,
				items, graded, skipped, failed, low.size(), dryRun);
	}

	@Override
	public int undo(String token) {
		if (!StringUtils.hasText(token)) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "撤销令牌不能为空");
		}
		UndoRecord record = undoRecords.get(token);
		if (record == null || record.expiresAt() < System.currentTimeMillis()) {
			undoRecords.remove(token);
			throw new ErrorCodeException(ErrorCode.ValidationError, "撤销已过期（只保留 24 小时），请到批改页手动改分");
		}
		String userId = SecurityContextUtils.getUserId();
		if (!SecurityContextUtils.isAdmin() && !record.userId.equals(userId)) {
			throw new AccessDeniedException("只能撤销自己发起的批改");
		}
		int restored = 0;
		for (Map.Entry<String, List<String>> entry : record.answers.entrySet()) {
			answerGradeService.reset(entry.getKey(), entry.getValue());
			restored++;
		}
		undoRecords.remove(token);
		log.info("AI 批量批改已撤销: operator={}, answers={}", userId, restored);
		return restored;
	}

	/** ====== 内部：调模型 → 建议分 ====== */

	private Suggestion grade(AnswerGradeItemView item, double maxScore, String userId) {
		Map<String, String> vars = new LinkedHashMap<>();
		vars.put("title", AiAssistSupport.plainTitle(item.getTitle(), 500));
		vars.put("maxScore", AiAssistSupport.formatScore(maxScore));
		vars.put("reference", item.getCorrectAnswer());
		vars.put("answer", StringUtils.hasText(stringify(item.getAnswer()))
				? AiAssistSupport.oneLine(stringify(item.getAnswer()), MAX_ANSWER_CHARS) : "（学员未作答）");
		AiRequest request = AiRequest.builder().systemPrompt(support.prompts().render(PROMPT_GRADE, vars))
				.userPrompt("请给出建议分、置信度、采分点命中情况与理由，只输出 JSON。")

				.temperature(Double.valueOf(0.2D)).background(true).build();
		AiCompletion completion = support.call(AiUsageService.SCENE_GRADE_BATCH, userId, request, true);
		return parse(completion == null ? null : completion.getText(), maxScore);
	}

	private Suggestion parse(String json, double maxScore) {
		JsonNode root = support.readJson(json, "AI 批改");
		double raw = root.path("score").asDouble(0D);
		double score = Math.max(0D, Math.min(maxScore, raw));
		double confidence = Math.max(0D, Math.min(1D, root.path("confidence").asDouble(0.5D)));
		String reason = root.path("reason").asText("");
		String text = "AI 批改（置信度 " + AiAssistSupport.formatScore(confidence * 100D) + "%）："
				+ AiAssistSupport.oneLine(reason, 200);
		return new Suggestion(score, confidence, text, reason);
	}

	private static String stringify(Object value) {
		if (value == null) {
			return "";
		}
		if (value instanceof String text) {
			return text;
		}
		return String.valueOf(value);
	}

	private static String summary(int answers, int graded, int skipped, int failed, int low, boolean dryRun) {
		StringBuilder text = new StringBuilder();
		text.append(dryRun ? "（试算）本次会处理 " : "本次处理 ").append(answers).append(" 份答卷，给 ").append(graded)
				.append(" 道主观题打了分");
		if (skipped > 0) {
			text.append("；").append(skipped).append(" 道题因为没参考答案 / 没分值被跳过");
		}
		if (failed > 0) {
			text.append("；").append(failed).append(" 道题模型没给出可用结果");
		}
		if (low > 0) {
			text.append("；其中 ").append(low).append(" 道置信度偏低，建议人工复核");
		}
		text.append("。");
		return text.toString();
	}


	private record Suggestion(double score, double confidence, String comment, String reason) {
	}


	private record UndoRecord(String userId, Map<String, List<String>> answers, long expiresAt) {
	}

}
