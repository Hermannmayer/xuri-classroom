package cn.surveyking.server.core.audit;

import cn.surveyking.server.domain.dto.AnswerGradeRequest;
import cn.surveyking.server.domain.dto.AnswerRequest;
import cn.surveyking.server.domain.dto.ProjectRequest;
import cn.surveyking.server.domain.dto.ProjectStatusRequest;
import cn.surveyking.server.domain.dto.RoleRequest;
import cn.surveyking.server.domain.model.Answer;
import cn.surveyking.server.domain.model.AnswerGrade;
import cn.surveyking.server.domain.model.Project;
import cn.surveyking.server.domain.model.Role;
import cn.surveyking.server.mapper.AnswerGradeMapper;
import cn.surveyking.server.mapper.AnswerMapper;
import cn.surveyking.server.mapper.ProjectMapper;
import cn.surveyking.server.mapper.RoleMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;




















@Slf4j
@Component
@RequiredArgsConstructor
public class AuditDiffSupport {


	private static final Set<String> ACTIONS = Set.of("ANSWER_GRADE", "ANSWER_GRADE_RESET", "ANSWER_DELETE",
			"ANSWER_DESTROY", "ANSWER_RESTORE", "PROJECT_DELETE", "PROJECT_DESTROY", "PROJECT_RESTORE", "PROJECT_STATUS",
			"SYSTEM_ROLE_UPDATE");


	private static final int MAX_ANSWERS = 20;

	private final AnswerMapper answerMapper;

	private final AnswerGradeMapper answerGradeMapper;

	private final ProjectMapper projectMapper;

	private final RoleMapper roleMapper;

	/** 比 AuditRecorder#targetIdOf 更准的目标 id：批改请求的目标是答卷（answerId）， 整卷/批量动作取第一条 id */
	public String targetIdOf(String action, Object[] args) {
		if (!ACTIONS.contains(action) || args == null) {
			return null;
		}
		if (isGradeAction(action)) {
			AnswerGradeRequest request = find(args, AnswerGradeRequest.class);
			return request == null ? null : trimToNull(request.getAnswerId());
		}
		if (isAnswerAction(action)) {
			List<String> ids = answerIds(find(args, AnswerRequest.class));
			return ids.isEmpty() ? null : ids.get(0);
		}
		if (isProjectAction(action)) {
			ProjectStatusRequest statusRequest = find(args, ProjectStatusRequest.class);
			if (statusRequest != null) {
				return trimToNull(statusRequest.getId());
			}
			ProjectRequest projectRequest = find(args, ProjectRequest.class);
			return projectRequest == null ? null : trimToNull(projectRequest.getId());
		}
		RoleRequest roleRequest = find(args, RoleRequest.class);
		return roleRequest == null ? null : trimToNull(roleRequest.getId());
	}

	/** 采集当前时刻的快照；非清单里的动作、参数对不上、查询出错都返回 null */
	public Map<String, Object> snapshot(String action, Object[] args) {
		if (!ACTIONS.contains(action) || args == null) {
			return null;
		}
		try {
			if (isGradeAction(action)) {
				AnswerGradeRequest request = find(args, AnswerGradeRequest.class);
				return request == null ? null : gradeSnapshot(action, request);
			}
			if (isAnswerAction(action)) {
				AnswerRequest request = find(args, AnswerRequest.class);
				return request == null ? null : answerSnapshot(request);
			}
			if (isProjectAction(action)) {
				ProjectStatusRequest statusRequest = find(args, ProjectStatusRequest.class);
				if (statusRequest != null) {
					return projectSnapshot(statusRequest.getId());
				}
				ProjectRequest projectRequest = find(args, ProjectRequest.class);
				return projectRequest == null ? null : projectSnapshot(projectRequest.getId());
			}
			RoleRequest roleRequest = find(args, RoleRequest.class);
			return roleRequest == null ? null : roleSnapshot(roleRequest.getId());
		}
		catch (Exception e) {
			log.debug("采集审计快照失败 action={}", action, e);
			return null;
		}
	}

	/** ------ 以下为内部实现 ------ */

	private static boolean isGradeAction(String action) {
		return "ANSWER_GRADE".equals(action) || "ANSWER_GRADE_RESET".equals(action);
	}

	private static boolean isAnswerAction(String action) {
		return "ANSWER_DELETE".equals(action) || "ANSWER_DESTROY".equals(action) || "ANSWER_RESTORE".equals(action);
	}

	private static boolean isProjectAction(String action) {


		return "PROJECT_DELETE".equals(action) || "PROJECT_DESTROY".equals(action) || "PROJECT_RESTORE".equals(action)
				|| "PROJECT_STATUS".equals(action);
	}

	/** 批改快照：逐题的分数与评语 + 整卷 exam_score 与批改状态 */
	private Map<String, Object> gradeSnapshot(String action, AnswerGradeRequest request) {
		String answerId = trimToNull(request.getAnswerId());
		Map<String, Object> snapshot = new LinkedHashMap<>();
		snapshot.put("answerId", answerId);
		Answer answer = answerId == null ? null : answerMapper.selectById(answerId);
		if (answer != null) {
			snapshot.put("projectId", answer.getProjectId());
			snapshot.put("examScore", answer.getExamScore());
			snapshot.put("gradeStatus", answer.getGradeStatus());
		}
		Map<String, AnswerGrade> grades = loadGrades(answerId);
		List<String> questionIds = new ArrayList<>();
		if ("ANSWER_GRADE_RESET".equals(action)) {
			List<String> requested = cleanIds(request.getQuestionIds());
			questionIds.addAll(requested.isEmpty() ? grades.keySet() : requested);
		}
		else if (request.getItems() != null) {
			for (AnswerGradeRequest.Item item : request.getItems()) {
				if (item != null && StringUtils.hasText(item.getQuestionId())) {
					questionIds.add(item.getQuestionId().trim());
				}
			}
		}

		List<Map<String, Object>> items = new ArrayList<>();
		for (String questionId : new LinkedHashSet<>(questionIds)) {
			AnswerGrade grade = grades.get(questionId);
			Map<String, Object> item = new LinkedHashMap<>();
			item.put("questionId", questionId);

			item.put("score", grade == null ? null : grade.getScore());
			item.put("comment", grade == null ? null : grade.getComment());
			items.add(item);
		}
		if (!items.isEmpty()) {
			snapshot.put("items", items);
		}
		return snapshot;
	}

	/** 答卷删除 / 彻底删除 / 恢复的快照：答卷 id、项目 id、提交人（只存账号 id，不存姓名）+ 是否还能查到 */
	private Map<String, Object> answerSnapshot(AnswerRequest request) {
		List<String> ids = answerIds(request);
		Map<String, Object> snapshot = new LinkedHashMap<>();
		snapshot.put("count", ids.size());
		snapshot.put("answerIds", ids.size() > MAX_ANSWERS ? ids.subList(0, MAX_ANSWERS) : ids);
		List<Map<String, Object>> rows = new ArrayList<>();
		for (String id : ids) {
			if (rows.size() >= MAX_ANSWERS) {
				break;
			}
			Answer answer = answerMapper.selectById(id);
			if (answer == null) {
				continue;
			}
			Map<String, Object> row = new LinkedHashMap<>();
			row.put("answerId", answer.getId());
			row.put("projectId", answer.getProjectId());

			row.put("submitter", answer.getCreateBy());
			row.put("gradeStatus", answer.getGradeStatus());
			row.put("tempSave", answer.getTempSave());
			row.put("examScore", answer.getExamScore());
			rows.add(row);
		}
		snapshot.put("visible", !rows.isEmpty());
		if (!rows.isEmpty()) {
			snapshot.put("answers", rows);
		}
		return snapshot;
	}

	private Map<String, Object> projectSnapshot(String projectId) {
		String id = trimToNull(projectId);
		Map<String, Object> snapshot = new LinkedHashMap<>();
		snapshot.put("projectId", id);
		Project project = id == null ? null : projectMapper.selectById(id);
		snapshot.put("visible", project != null);
		if (project != null) {
			snapshot.put("name", project.getName());

			snapshot.put("status", project.getStatus());
		}
		return snapshot;
	}

	/** 角色快照：权限变更必须可追，所以留完整的权限串（before/after 一比就知道加了什么） */
	private Map<String, Object> roleSnapshot(String roleId) {
		String id = trimToNull(roleId);
		Map<String, Object> snapshot = new LinkedHashMap<>();
		snapshot.put("roleId", id);
		Role role = id == null ? null : roleMapper.selectById(id);
		snapshot.put("visible", role != null);
		if (role != null) {
			snapshot.put("code", role.getCode());
			snapshot.put("name", role.getName());
			snapshot.put("authority", role.getAuthority());
		}
		return snapshot;
	}

	private Map<String, AnswerGrade> loadGrades(String answerId) {
		Map<String, AnswerGrade> grades = new LinkedHashMap<>();
		if (!StringUtils.hasText(answerId)) {
			return grades;
		}
		List<AnswerGrade> rows = answerGradeMapper
				.selectList(Wrappers.<AnswerGrade>lambdaQuery().eq(AnswerGrade::getAnswerId, answerId));
		for (AnswerGrade row : rows) {
			if (row != null && StringUtils.hasText(row.getQuestionId())) {
				grades.put(row.getQuestionId(), row);
			}
		}
		return grades;
	}

	private static List<String> answerIds(AnswerRequest request) {
		if (request == null) {
			return new ArrayList<>();
		}
		List<String> ids = cleanIds(request.getIds());
		if (ids.isEmpty() && StringUtils.hasText(request.getId())) {
			ids.add(request.getId().trim());
		}
		return ids;
	}

	private static List<String> cleanIds(List<String> ids) {
		List<String> cleaned = new ArrayList<>();
		if (CollectionUtils.isEmpty(ids)) {
			return cleaned;
		}
		for (String id : ids) {
			if (StringUtils.hasText(id) && !cleaned.contains(id.trim())) {
				cleaned.add(id.trim());
			}
		}
		return cleaned;
	}

	private static String trimToNull(String value) {
		return StringUtils.hasText(value) ? value.trim() : null;
	}

	/** 按类型挑第一个参数：接口里同一动作的 DTO 类型互不相同，不需要再看 URI */
	private static <T> T find(Object[] args, Class<T> type) {
		for (Object arg : args) {
			if (type.isInstance(arg)) {
				return type.cast(arg);
			}
		}
		return null;
	}

}
