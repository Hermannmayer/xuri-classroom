package cn.surveyking.server.service;

import cn.surveyking.server.core.audit.AuditActionCatalog;
import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.AuditLogView;
import cn.surveyking.server.domain.model.AuditLog;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.AuditLogMapper;
import cn.surveyking.server.mapper.UserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** 操作审计日志查询 */
@Service
@RequiredArgsConstructor
public class AuditLogService {

	private final AuditLogMapper auditLogMapper;

	private final UserMapper userMapper;

	/**
	 * 分页查审计日志，并补齐展示字段：动作中文名、操作人姓名。
	 *
	 * <p>操作人按 create_by 批量查 t_user（一页最多几十条，一次 IN 查询足够）；
	 * 账号已被删除或 create_by 是匿名/partner id 时 operatorName 留空，前端回退显示原始 id。
	 */
	public PaginationResponse<AuditLogView> list(long current, long pageSize, String action, String startTime,
			String endTime, String operator, String keyword, String resultStatus) {
		Page<AuditLog> page = new Page<>(current, pageSize);
		LambdaQueryWrapper<AuditLog> query = Wrappers.<AuditLog>lambdaQuery()
				.eq(StringUtils.hasText(action), AuditLog::getAction, action);
		Date start = parseTime(startTime);
		Date end = parseTime(endTime);
		query.ge(start != null, AuditLog::getCreateAt, start).le(end != null, AuditLog::getCreateAt, end);
		if (StringUtils.hasText(operator)) {
			List<String> userIds = userMapper
					.selectList(Wrappers.<User>lambdaQuery().like(User::getName, operator.trim()))
					.stream().map(User::getId).collect(Collectors.toList());
			if (!userIds.isEmpty()) {
				query.in(AuditLog::getCreateBy, userIds);
			} else {
				query.eq(AuditLog::getCreateBy, operator.trim());
			}
		}
		if (StringUtils.hasText(keyword)) {
			String like = keyword.trim();
			query.and(w -> w.like(AuditLog::getTargetName, like).or().like(AuditLog::getTargetId, like)
					.or().like(AuditLog::getDetail, like));
		}
		if ("fail".equals(resultStatus)) {
			query.like(AuditLog::getDetail, "失败");
		}
		else if ("success".equals(resultStatus)) {
			query.and(w -> w.isNull(AuditLog::getDetail).or().notLike(AuditLog::getDetail, "失败"));
		}
		query.orderByDesc(AuditLog::getCreateAt);
		Page<AuditLog> result = auditLogMapper.selectPage(page, query);
		Map<String, String> operatorNames = loadOperatorNames(result.getRecords());
		List<AuditLogView> views = new ArrayList<>(result.getRecords().size());
		for (AuditLog entry : result.getRecords()) {
			views.add(toView(entry, operatorNames.get(entry.getCreateBy())));
		}
		return new PaginationResponse<>(result.getTotal(), views);
	}

	/**
	 * 库里实际出现过的动作 + 中文名，供前端筛选下拉使用。
	 * 按动作码排序，返回结构 {@code [{code, name}]}。
	 */
	public List<Map<String, String>> listActions() {
		List<AuditLog> rows = auditLogMapper.selectList(Wrappers.<AuditLog>lambdaQuery()
				.select(AuditLog::getAction).isNotNull(AuditLog::getAction).groupBy(AuditLog::getAction)
				.orderByAsc(AuditLog::getAction));
		List<Map<String, String>> options = new ArrayList<>();
		for (AuditLog row : rows) {
			String code = row.getAction();
			if (!StringUtils.hasText(code)) {
				continue;
			}
			Map<String, String> option = new LinkedHashMap<>();
			option.put("code", code);
			option.put("name", AuditActionCatalog.nameOf(code));
			options.add(option);
		}
		return options;
	}

	/** 清理日志：all=true 清空；否则删除 beforeDays 天之前 / before 时间之前的记录 */
	public int clean(Integer beforeDays, String before, boolean all) {
		LambdaQueryWrapper<AuditLog> query = Wrappers.<AuditLog>lambdaQuery();
		if (!all) {
			Date cutoff = parseTime(before);
			if (cutoff == null && beforeDays != null && beforeDays > 0) {
				cutoff = Date.from(LocalDateTime.now().minusDays(beforeDays).atZone(ZoneId.systemDefault()).toInstant());
			}
			if (cutoff == null) {
				throw new IllegalArgumentException("请指定保留天数或清理截止时间");
			}
			query.lt(AuditLog::getCreateAt, cutoff);
		}
		return auditLogMapper.delete(query);
	}

	private Date parseTime(String value) {
		if (!StringUtils.hasText(value)) {
			return null;
		}
		String text = value.trim();
		try {
			return Date.from(LocalDateTime.parse(text, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
					.atZone(ZoneId.systemDefault()).toInstant());
		}
		catch (Exception ignored) {
			try {
				return Date.from(LocalDate.parse(text, DateTimeFormatter.ISO_LOCAL_DATE)
						.atStartOfDay(ZoneId.systemDefault()).toInstant());
			}
			catch (Exception alsoIgnored) {
				throw new IllegalArgumentException("时间格式不正确：" + value);
			}
		}
	}

	private Map<String, String> loadOperatorNames(List<AuditLog> entries) {
		Map<String, String> names = new HashMap<>();
		if (entries == null || entries.isEmpty()) {
			return names;
		}
		Set<String> userIds = entries.stream().map(AuditLog::getCreateBy).filter(StringUtils::hasText)
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

	private AuditLogView toView(AuditLog entry, String operatorName) {
		AuditLogView view = new AuditLogView();
		view.setId(entry.getId());
		view.setAction(entry.getAction());
		view.setActionName(AuditActionCatalog.nameOf(entry.getAction()));
		view.setTargetId(entry.getTargetId());
		view.setTargetName(entry.getTargetName());
		view.setDetail(entry.getDetail());
		view.setBeforeJson(entry.getBeforeJson());
		view.setAfterJson(entry.getAfterJson());
		view.setSource(entry.getSource());
		view.setRequestId(entry.getRequestId());
		view.setIp(entry.getIp());
		view.setCreateBy(entry.getCreateBy());
		view.setOperatorName(operatorName);
		view.setCreateAt(entry.getCreateAt());
		return view;
	}

}
