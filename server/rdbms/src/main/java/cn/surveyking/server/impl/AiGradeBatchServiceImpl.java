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

/**
 * 批量 AI 批改：把「未批改」答卷里还没给分的主观题一次性批掉。
 *
 * <p>这是全站唯一一条「AI 直接写业务数据」的路径，所以闸门写得比别处都多：
 * <ol>
 * <li><b>范围</b>：只取 {@code grade_status=pending} 的正式答卷，只补 {@code score == null} 的主观题——
 * 老师已经给过的分<b>绝不覆盖</b>；</li>
 * <li><b>依据</b>：题目必须有参考答案（没有就跳过并计入 skipped，不猜）、必须有分值；</li>
 * <li><b>写入</b>：走 {@link AnswerGradeService#submit}，与人工批改同一条路径，
 * 审计 AOP 自动记 {@code ANSWER_GRADE}，操作人就是发起人；</li>
 * <li><b>可撤销</b>：返回 24 小时有效的 undoToken，撤销时按「答卷 + 题」调 {@code reset}；</li>
 * <li><b>限额</b>：提交时先判一次每日 token 限额；每次运行最多 {@link #MAX_ITEMS_PER_RUN} 条，
 * 避免一次点错烧掉整月的额度。</li>
 * </ol>
 *
 * <p>为什么必须在请求线程里抓 {@link Authentication} 再交给后台线程：{@code submit} 里
 * 既有行级权限判断（{@code AnswerAccessGuard}），也会用 {@code SecurityContextUtils.getUserId()}
 * 记「谁批的」。{@code ai-job} 线程池是启动时创建的，拿不到请求线程的登录态，
 * 不显式传就会变成匿名 → 403。
 *
 * @author ai-actions
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiGradeBatchServiceImpl implements AiGradeBatchService {

	/** 与单题建议共用一份提示词：口径必须一致，否则「AI 建议」和「AI 批改」会给两种分 */
	private static final String PROMPT_GRADE = "grade-suggest";

	/** 默认一次处理多少份答卷 */
	private static final int DEFAULT_MAX_ANSWERS = 30;

	/** 一次最多处理多少份答卷（再多就是「批一个年级」，该分批了） */
	private static final int MAX_ANSWERS_LIMIT = 100;

	/** 一次运行最多给多少条打分（成本闸门） */
	private static final int MAX_ITEMS_PER_RUN = 200;

	/** 低于该置信度仍然写分，但列进「需复核」 */
	private static final double DEFAULT_MIN_CONFIDENCE = 0.6D;

	/** 学员答案进提示词的最大长度 */
	private static final int MAX_ANSWER_CHARS = 2000;

	/** 撤销令牌有效期 */
	private static final long UNDO_TTL_MILLIS = 24L * 60L * 60L * 1000L;

	private final AiAssistSupport support;

	private final AiJobService aiJobService;

	private final AnswerGradeService answerGradeService;

	/** undoToken → 本次写入的「答卷 → 题号」 */
	private final Map<String, UndoRecord> undoRecords = new ConcurrentHashMap<>();

	@Override
	public String start(AiGradeBatchRequest request) {
		if (request == null || !StringUtils.hasText(request.getProjectId())) {
			throw new ErrorCodeException(ErrorCode.ValidationError, "请先选择要批改的试卷");
		}
		// 权限：与 /api/answer/grade 同一口径（管理员兜底）
		if (!SecurityContextUtils.isAdmin() && !SecurityContextUtils.hasAuthority("answer:grade")) {
			throw new AccessDeniedException("没有批改答卷的权限");
		}
		String projectId = request.getProjectId();
		support.readableProject(projectId);
		String userId = SecurityContextUtils.getUserId();
		// 提交时就判一次额度：批改要跑几分钟，让老师等完才看到「今天用完了」是最差体验
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
		// 后台线程拿不到请求线程的登录态：这里抓一次，任务里显式设置（见类注释）
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
					// 额度和内容都被拦：整单停下比继续烧 token 更负责
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
				// submit=true：本次补完之后若整卷主观题都给了分，答卷直接变成 graded
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

	/* ====== 内部：调模型 → 建议分 ====== */

	private Suggestion grade(AnswerGradeItemView item, double maxScore, String userId) {
		Map<String, String> vars = new LinkedHashMap<>();
		vars.put("title", AiAssistSupport.plainTitle(item.getTitle(), 500));
		vars.put("maxScore", AiAssistSupport.formatScore(maxScore));
		vars.put("reference", item.getCorrectAnswer());
		vars.put("answer", StringUtils.hasText(stringify(item.getAnswer()))
				? AiAssistSupport.oneLine(stringify(item.getAnswer()), MAX_ANSWER_CHARS) : "（学员未作答）");
		AiRequest request = AiRequest.builder().systemPrompt(support.prompts().render(PROMPT_GRADE, vars))
				.userPrompt("请给出建议分、置信度、采分点命中情况与理由，只输出 JSON。")
				// 后台任务：跳过「每分钟 N 次」的限流，否则一次批改 30 份卷子会被自己卡死
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

	/** 一条建议分：分数 / 置信度 / 写进评语的说明 / 原始理由 */
	private record Suggestion(double score, double confidence, String comment, String reason) {
	}

	/** 撤销记录：谁发起的、改了哪些答卷的哪些题、什么时候过期（懒清理，不需要定时任务） */
	private record UndoRecord(String userId, Map<String, List<String>> answers, long expiresAt) {
	}

}
