package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.AuditLog;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.Date;
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

	/**
	 * 分批硬删「截止时间之前」的审计日志。
	 *
	 * <p>
	 * 为什么不用 {@code auditLogMapper.delete(wrapper)} 一把梭：审计表可能几十万行，一条 DELETE 会
	 * 长时间持锁并产生巨大的 undo/redo。这里按 LIMIT 分批，由 Service 循环调用，每批之间可以让出，
	 * 对线上几乎无感。走 {@code idx_audit_create_at}。
	 * @param cutoff 早于这个时间（不含）的记录会被删掉
	 * @param limit 单批上限
	 * @return 本批实际删除行数
	 */
	int deleteBefore(@Param("cutoff") Date cutoff, @Param("limit") int limit);

	/**
	 * 分批硬删全表（"清空日志"用）。同样按 LIMIT 分批。
	 * @param limit 单批上限
	 * @return 本批实际删除行数
	 */
	int deleteBatch(@Param("limit") int limit);

}
