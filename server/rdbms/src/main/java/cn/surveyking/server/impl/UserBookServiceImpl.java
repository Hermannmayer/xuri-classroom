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
import com.baomidou.mybatisplus.spring.service.IService;
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




@Service
@Transactional(rollbackFor = Exception.class)
@RequiredArgsConstructor
public class UserBookServiceImpl extends BaseService<UserBookMapper, UserBook> implements IService<UserBook> {

	private final TemplateServiceImpl templateService;




	public static final Integer BOOK_TYPE_WRONG = 1;




	public static final Integer BOOK_TYPE_FAVORITE = 2;

	/** 旧签名，保留只为兼容还没更新的调用点（SurveyServiceImpl#saveAnswer） */
	@Deprecated
	@Async
	public void saveWrongQuestion(LinkedHashMap<String, Double> questionScore) {
		saveWrongQuestion(questionScore, null, null, null, null);
	}

	/** 保存错题：把本次考试里「真的有作答且判 0 分」的题收进错题本，并按考试分开累计 */
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




		List<String> wrongQuestionIds = questionScore.entrySet().stream()
				.filter(entry -> entry.getValue() != null && entry.getValue() == 0).map(Map.Entry::getKey)
				.filter(questionId -> answer == null || hasAnswer(answer, questionId)).collect(Collectors.toList());
		if (wrongQuestionIds.isEmpty()) {
			return;
		}


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

	/** 答案里这道题是否真的作答：null / 空白字符串 / 空集合 / 空对象都算没答 */
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
