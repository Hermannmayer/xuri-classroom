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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.validation.ValidationException;
import org.springframework.beans.factory.annotation.Value;
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


@Service
@RequiredArgsConstructor
public class AuditLogService {

	private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

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


	public static final int MIN_KEEP_DAYS = 7;


	private static final int CLEAN_BATCH = 2000;


	private static final int CLEAN_MAX_BATCHES = 2000;


	@Value("${sk.audit.retention-days:180}")
	private int retentionDays;

	/** 自动清理是否开启 */
	public boolean isAutoCleanupEnabled() {
		return retentionDays > 0;
	}

	/** 实际生效的保留天数（开启时不低于 MIN_KEEP_DAYS） */
	public int getRetentionDays() {
		return retentionDays > 0 ? Math.max(retentionDays, MIN_KEEP_DAYS) : retentionDays;
	}

	/**

	 *
	 * <p>
	 * 两条安全线：①保留天数不得低于 {@link #MIN_KEEP_DAYS}（含"截止时间"形态，晚于下限直接拒绝），
	 * 审计的价值在于可追溯，误删最近几天等于把事故现场抹掉；②按 {@link #CLEAN_BATCH} 分批删，
	 * 避免大表上一条 DELETE 长时间持锁。
	 */
	public int clean(Integer beforeDays, String before, boolean all) {
		if (all) {
			return deleteInBatches(null);
		}
		Date cutoff = parseTime(before);
		if (cutoff == null) {
			if (beforeDays == null || beforeDays <= 0) {
				throw new ValidationException("请指定保留天数或清理截止时间");
			}
			if (beforeDays < MIN_KEEP_DAYS) {
				throw new ValidationException("为了保留可追溯性，至少要保留 " + MIN_KEEP_DAYS + " 天");
			}
			cutoff = Date.from(LocalDateTime.now().minusDays(beforeDays).atZone(ZoneId.systemDefault()).toInstant());
		}
		else if (cutoff.after(Date.from(LocalDateTime.now().minusDays(MIN_KEEP_DAYS)
				.atZone(ZoneId.systemDefault()).toInstant()))) {
			throw new ValidationException("清理截止时间至少要在 " + MIN_KEEP_DAYS + " 天前");
		}
		return deleteInBatches(cutoff);
	}

	/** cutoff 为 null 表示清空全表 */
	private int deleteInBatches(Date cutoff) {
		int total = 0;
		for (int batch = 0; batch < CLEAN_MAX_BATCHES; batch++) {
			int deleted = cutoff == null ? auditLogMapper.deleteBatch(CLEAN_BATCH)
					: auditLogMapper.deleteBefore(cutoff, CLEAN_BATCH);
			total += deleted;
			if (deleted < CLEAN_BATCH) {
				return total;
			}
		}
		log.warn("[audit] 单次清理达到批次数上限 {}，已删 {} 条；剩余请再执行一次", CLEAN_MAX_BATCHES, total);
		return total;
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
				throw new ValidationException("时间格式不正确：" + value);
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
