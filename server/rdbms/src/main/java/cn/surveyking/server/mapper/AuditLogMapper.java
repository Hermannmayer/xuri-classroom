package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.AuditLog;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.Date;
import java.util.List;







public interface AuditLogMapper extends BaseMapper<AuditLog> {

	/** 某个目标的审计记录，按时间正序（答卷批改抽屉「操作记录」用） */
	List<AuditLog> selectByTarget(@Param("targetId") String targetId, @Param("limit") int limit);

	/** 分批硬删「截止时间之前」的审计日志；返回 本批实际删除行数。 */
	int deleteBefore(@Param("cutoff") Date cutoff, @Param("limit") int limit);

	/** 分批硬删全表（"清空日志"用）；返回 本批实际删除行数。 */
	int deleteBatch(@Param("limit") int limit);

}
