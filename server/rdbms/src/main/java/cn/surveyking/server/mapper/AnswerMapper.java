package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.Answer;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.Date;
import java.util.List;

/**
 * @author javahuang
 * @date 2021/8/6
 *
 * <p>
 * 原生 SQL 统一放在 {@code resources/mapper/AnswerMapper.xml}（S2-5）：注解里的裸 SQL 不易审计，
 * 也不方便将来统一加租户/分片拦截；接口这里只留方法签名。
 */
public interface AnswerMapper extends BaseMapper<Answer> {

	/** 回收站列表：逻辑删除的行只能绕过 @TableLogic 用原生 SQL 查 */
	List<Answer> selectLogicDeleted(String projectId);

	List<String> selectProjectIdsByIds(@Param("ids") List<String> ids);

	void batchDestroy(List<String> ids);

	void restoreAnswer(List<String> ids);

	/**
	 * 同项目 + 同答题人已用的最大作答序号（含已逻辑删除的行，避免撞唯一键）。
	 * @return 没有历史答卷时返回 -1
	 */
	Integer selectMaxAttemptNo(@Param("projectId") String projectId, @Param("createBy") String createBy);

	/**
	 * 可物理清理的匿名答卷 id：已经逻辑删除、且删除时间早于 cutoff。
	 *
	 * <p>业务查询被 {@code @TableLogic} 挡住了，只有原生 SQL 能捞出来。
	 * 用 {@code update_at} 表示「进回收站的时间」（逻辑删除是一次 UPDATE）。
	 */
	List<String> selectPurgeableAnonymousIds(@Param("cutoff") Date cutoff, @Param("limit") int limit);

	/** 物理删除（真 DELETE），只给匿名答卷物理清理任务用 */
	int physicalDeleteByIds(@Param("ids") List<String> ids);

}
