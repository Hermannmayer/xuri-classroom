package cn.surveyking.server.service;

import cn.surveyking.server.core.common.PaginationResponse;
import cn.surveyking.server.domain.model.AuditLog;
import cn.surveyking.server.mapper.AuditLogMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** 操作审计日志查询 */
@Service
@RequiredArgsConstructor
public class AuditLogService {

	private final AuditLogMapper auditLogMapper;

	public PaginationResponse<AuditLog> list(long current, long pageSize, String action) {
		Page<AuditLog> page = new Page<>(current, pageSize);
		Page<AuditLog> result = auditLogMapper.selectPage(page,
				Wrappers.<AuditLog>lambdaQuery().eq(StringUtils.hasText(action), AuditLog::getAction, action)
						.orderByDesc(AuditLog::getCreateAt));
		return new PaginationResponse<>(result.getTotal(), result.getRecords());
	}

}
