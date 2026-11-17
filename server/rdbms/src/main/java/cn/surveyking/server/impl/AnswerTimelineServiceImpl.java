package cn.surveyking.server.impl;

import cn.surveyking.server.core.audit.AuditActionCatalog;
import cn.surveyking.server.domain.dto.AuditAnswerTimelineView;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AuditLog;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.AuditLogMapper;
import cn.surveyking.server.mapper.UserMapper;
import cn.surveyking.server.service.AnswerTimelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import tools.jackson.databind.ObjectMapper;

import jakarta.validation.ValidationException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 答卷操作时间线的实现。
 *
 * <p>只读两条数据：t_audit_log（按 {@code target_id} 走 idx_audit_target）+ t_user（补操作人姓名）。
 * 权限走 {@link AnswerAccessGuard}，与答卷详情同一套口径：本人能看、项目所有者/协作者能看全部、管理员全量。
 *
 * <p>刻意不返回 {@code create_by} 之外的任何答卷内容，也不做「谁的答卷」这类判断：
 * 越权判断只在一个地方（guard），避免这里和详情页口径不一致。
 *
 * @author audit
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnswerTimelineServiceImpl implements AnswerTimelineService {

	/** 一次最多返回多少条：批改历史通常几条到几十条，超过说明有异常高频操作，先截断保护页面 */
	private static final int MAX_ROWS = 200;

	private final AnswerMapper answerMapper;

	private final AuditLogMapper auditLogMapper;

	private final UserMapper userMapper;

	private final AnswerAccessGuard answerAccessGuard;

	private final ObjectMapper objectMapper;

	@Override
	public List<AuditAnswerTimelineView> answerTimeline(String answerId) {
		String id = answerId == null ? null : answerId.trim();
		if (!StringUtils.hasText(id)) {
			throw new ValidationException("缺少答卷 id");
		}
		Answer answer = answerMapper.selectById(id);
		// 答卷不存在时这里直接抛 403（与答卷详情 getAnswer 同一口径，不额外泄露「这份卷存在但你没权限」）
		answerAccessGuard.assertAnswerAccess(answer);
		List<AuditLog> rows = auditLogMapper.selectByTarget(id, MAX_ROWS);
		if (rows == null || rows.isEmpty()) {
			return new ArrayList<>();
		}
		Map<String, String> operatorNames = loadOperatorNames(rows);
		List<AuditAnswerTimelineView> views = new ArrayList<>(rows.size());
		for (AuditLog row : rows) {
			if (row == null) {
				continue;
			}
			AuditAnswerTimelineView view = new AuditAnswerTimelineView();
			view.setAt(row.getCreateAt());
			String operatorName = operatorNames.get(row.getCreateBy());
			view.setOperator(StringUtils.hasText(operatorName) ? operatorName : row.getCreateBy());
			view.setActionName(AuditActionCatalog.nameOf(row.getAction()));
			view.setBefore(parseSnapshot(row.getBeforeJson()));
			view.setAfter(parseSnapshot(row.getAfterJson()));
			view.setQuestionId(singleQuestionId(view.getBefore(), view.getAfter()));
			views.add(view);
		}
		return views;
	}

	/**
	 * 快照反序列化：正常是对象/数组；解析不了（历史半截 JSON、手工写坏的数据）就原样返回字符串，
	 * 让前端按文本展示——时间线是审计凭证，宁可难看也不能整条丢掉。
	 */
	private Object parseSnapshot(String json) {
		if (!StringUtils.hasText(json)) {
			return null;
		}
		try {
			return objectMapper.readValue(json, Object.class);
		}
		catch (Exception e) {
			log.debug("解析审计快照失败，按原文返回", e);
			return json;
		}
	}

	/** 只批改一道题时把题目 id 提到行上，前端可以按题过滤；整卷操作为 null */
	private static String singleQuestionId(Object before, Object after) {
		String questionId = questionIdOf(before);
		return StringUtils.hasText(questionId) ? questionId : questionIdOf(after);
	}

	private static String questionIdOf(Object snapshot) {
		if (!(snapshot instanceof Map<?, ?> map)) {
			return null;
		}
		Object items = map.get("items");
		if (!(items instanceof List<?> list) || list.size() != 1) {
			return null;
		}
		Object first = list.get(0);
		if (!(first instanceof Map<?, ?> item)) {
			return null;
		}
		Object questionId = item.get("questionId");
		return questionId == null ? null : String.valueOf(questionId);
	}

	private Map<String, String> loadOperatorNames(List<AuditLog> rows) {
		Map<String, String> names = new HashMap<>();
		Set<String> userIds = rows.stream().map(AuditLog::getCreateBy).filter(StringUtils::hasText)
				.collect(Collectors.toSet());
		if (userIds.isEmpty()) {
			return names;
		}
		List<User> users = userMapper.selectBatchIds(userIds);
		if (users == null) {
			return names;
		}
		for (User user : users) {
			if (user != null && StringUtils.hasText(user.getId()) && StringUtils.hasText(user.getName())) {
				names.put(user.getId(), user.getName());
			}
		}
		return names;
	}

}
