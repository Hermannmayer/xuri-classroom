package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.AuditLog;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 操作审计日志。
 *
 * <p>原生 SQL 统一放在 {@code resources/mapper/AuditLogMapper.xml}：时间线查询要按
 * {@code target_id + create_at} 走 {@code idx_audit_target}，用 XML 写清楚排序与 LIMIT 更好审计。
 */
public interface AuditLogMapper extends BaseMapper<AuditLog> {

	/**
	 * 某个目标的审计记录，按时间正序（答卷批改抽屉「操作记录」用）。
	 *
	 * <p>必须显式过滤 {@code is_deleted = 0}：XML 里的 SQL 绕过 {@code @TableLogic}，
	 * 否则清理过的日志会重新出现在时间线上。
	 * @param targetId 目标 id（答卷类动作是 t_answer.id）
	 * @param limit 最多返回多少条
	 */
	List<AuditLog> selectByTarget(@Param("targetId") String targetId, @Param("limit") int limit);

}
