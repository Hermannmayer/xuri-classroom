package cn.surveyking.server.impl;

import cn.surveyking.server.core.uitls.SchemaHelper;
import cn.surveyking.server.core.uitls.SecurityContextUtils;
import cn.surveyking.server.domain.dto.SurveySchema;
import cn.surveyking.server.domain.model.Template;
import cn.surveyking.server.domain.model.UserBook;
import cn.surveyking.server.mapper.UserBookMapper;
import cn.surveyking.server.service.BaseService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.service.IService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 错题本：错题收集 + 错题本读写
 */
@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
public class UserBookServiceImpl extends BaseService<UserBookMapper, UserBook> implements IService<UserBook> {

	private final TemplateServiceImpl templateService;

	/**
	 * 我的错题
	 */
	public static final Integer BOOK_TYPE_WRONG = 1;

	/**
	 * 我的收藏
	 */
	public static final Integer BOOK_TYPE_FAVORITE = 2;

	/**
	 * 旧签名，保留只为兼容还没更新的调用点（SurveyServiceImpl#saveAnswer）。
	 * <p>
	 * 它拿不到本次答案与 schema，因此退化为「只按 0 分收题」：既不能排除未作答的题，
	 * 也无法给设计器自建题取题干兜底。
	 * @deprecated 改用 {@link #saveWrongQuestion(LinkedHashMap, Map, SurveySchema, String, String)}
	 */
	@Deprecated
	@Async
	public void saveWrongQuestion(LinkedHashMap<String, Double> questionScore) {
		saveWrongQuestion(questionScore, null, null, null, null);
	}

	/**
	 * 保存错题：把本次考试里「真的有作答且判 0 分」的题收进错题本，并按考试分开累计。
	 * <p>
	 * 去重键 = (create_by, type=错题, project_id, template_id)。同一道题在两场考试各错一次会得到
	 * 两条记录，这样「只练本场错题」不会把另一场的错题带出来；同一场考试里再次做错同一题仍累加
	 * wrong_times。project_id 为空时（题库练习、历史数据）按 project_id is null 匹配。
	 * @param questionScore 题目 id → 得分（0 分视为错题）
	 * @param answer 本次提交的答案；为空时退化为「不校验是否作答」（兼容旧调用）
	 * @param survey 本次作答使用的 schema；用于给非题库题（设计器自建题）取题干兜底
	 * @param projectId 来源考试 id（题库练习、匿名场景为空）
	 * @param repoId 兜底题库 id（模板表里查不到该题时使用，可空）
	 */
	@Async
	public void saveWrongQuestion(LinkedHashMap<String, Double> questionScore, Map<String, Object> answer,
			SurveySchema survey, String projectId, String repoId) {
		if (questionScore == null || questionScore.isEmpty()) {
			return;
		}
		if (!SecurityContextUtils.isAuthenticated()) {
			return;
		}
		String userId = SecurityContextUtils.getUserId();

		// 1. 只收「判 0 分 + 真的有作答」的题。
		// 未作答的题在 AnswerScoreEvaluator 里同样得 0 分，不排除的话整张卷子都会进错题本
		// （审计：docs/research/exam-mode-audit.md C.6-1）。
		List<String> wrongQuestionIds = questionScore.entrySet().stream()
				.filter(entry -> entry.getValue() != null && entry.getValue() == 0).map(Map.Entry::getKey)
				.filter(questionId -> answer == null || hasAnswer(answer, questionId)).collect(Collectors.toList());
		if (wrongQuestionIds.isEmpty()) {
			return;
		}

		// 2. 同一场考试里已经记过的题：错误次数 +1
		LambdaQueryWrapper<UserBook> existQuery = Wrappers.<UserBook>lambdaQuery()
				.in(UserBook::getTemplateId, wrongQuestionIds).eq(UserBook::getType, BOOK_TYPE_WRONG)
				.eq(UserBook::getCreateBy, userId);
		if (StringUtils.hasText(projectId)) {
			existQuery.eq(UserBook::getProjectId, projectId);
		}
		else {
			existQuery.isNull(UserBook::getProjectId);
		}
		List<UserBook> existUserBooks = list(existQuery);
		existUserBooks
				.forEach(userBook -> userBook.setWrongTimes(Optional.ofNullable(userBook.getWrongTimes()).orElse(0) + 1));
		if (!existUserBooks.isEmpty()) {
			updateBatchById(existUserBooks);
		}

		// 3. 新错题入库：题库题用模板名 + 模板所属题库；设计器自建题（模板表查不到）用题干兜底，
		// 不再静默丢弃（审计：docs/research/exam-mode-audit.md C.6-2）。
		List<String> existTemplateIds = existUserBooks.stream().map(UserBook::getTemplateId)
				.collect(Collectors.toList());
		Set<String> existIdSet = new HashSet<>(existTemplateIds);
		List<String> notExistQuestionIds = wrongQuestionIds.stream().filter(questionId -> !existIdSet.contains(questionId))
				.collect(Collectors.toList());
		if (notExistQuestionIds.isEmpty()) {
			return;
		}
		Map<String, Template> templates = templateService.listByIds(notExistQuestionIds).stream()
				.collect(Collectors.toMap(Template::getId, template -> template, (left, right) -> left));
		Map<String, String> titles = questionTitles(survey);
		List<UserBook> toSave = notExistQuestionIds.stream().map(questionId -> {
			UserBook userBook = new UserBook();
			userBook.setWrongTimes(1);
			userBook.setTemplateId(questionId);
			Template template = templates.get(questionId);
			userBook.setName(resolveName(template, titles.get(questionId), questionId));
			userBook.setType(BOOK_TYPE_WRONG);
			userBook.setProjectId(StringUtils.hasText(projectId) ? projectId : null);
			userBook.setRepoId(template != null ? template.getRepoId() : repoId);
			return userBook;
		}).collect(Collectors.toList());
		saveBatch(toSave);
	}

	/**
	 * 答案里这道题是否真的作答：null / 空白字符串 / 空集合 / 空对象都算没答。
	 * 选择题答案是 {optionId:true}，填空题是 {blankId:文本} 或纯文本。
	 */
	private boolean hasAnswer(Map<String, Object> answer, String questionId) {
		Object value = answer.get(questionId);
		if (value == null) {
			return false;
		}
		if (value instanceof String) {
			return StringUtils.hasText((String) value);
		}
		if (value instanceof Collection) {
			return !((Collection<?>) value).isEmpty();
		}
		if (value instanceof Map) {
			return !((Map<?, ?>) value).isEmpty();
		}
		return true;
	}

	/** 题目 id → 题干（含设计器自建题；题库题优先用模板名，这里只做兜底） */
	private Map<String, String> questionTitles(SurveySchema survey) {
		if (survey == null) {
			return Collections.emptyMap();
		}
		return SchemaHelper.flatSurveySchema(survey).stream()
				.filter(question -> StringUtils.hasText(question.getId()) && StringUtils.hasText(question.getTitle()))
				.collect(Collectors.toMap(SurveySchema::getId, SurveySchema::getTitle, (left, right) -> left));
	}

	/** 名称兜底顺序：模板名 → 题干（截断 200 字）→ 「题目 xxxxxxxx」 */
	private String resolveName(Template template, String title, String questionId) {
		if (template != null && StringUtils.hasText(template.getName())) {
			return template.getName();
		}
		if (StringUtils.hasText(title)) {
			return title.length() > 200 ? title.substring(0, 200) : title;
		}
		String shortId = questionId != null && questionId.length() > 8 ? questionId.substring(0, 8) : questionId;
		return "题目 " + shortId;
	}

}
