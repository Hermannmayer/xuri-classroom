package cn.surveyking.server.service;

import cn.surveyking.server.core.audit.AuditActionCatalog;
import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.dto.AuditLogView;
import cn.surveyking.server.domain.model.AuditLog;
import cn.surveyking.server.domain.model.User;
import cn.surveyking.server.mapper.AuditLogMapper;
import cn.surveyking.server.mapper.UserMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
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
	public PaginationResponse<AuditLogView> list(long current, long pageSize, String action) {
		Page<AuditLog> page = new Page<>(current, pageSize);
		Page<AuditLog> result = auditLogMapper.selectPage(page,
				Wrappers.<AuditLog>lambdaQuery().eq(StringUtils.hasText(action), AuditLog::getAction, action)
						.orderByDesc(AuditLog::getCreateAt));
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
		view.setIp(entry.getIp());
		view.setCreateBy(entry.getCreateBy());
		view.setOperatorName(operatorName);
		view.setCreateAt(entry.getCreateAt());
		return view;
	}

}
