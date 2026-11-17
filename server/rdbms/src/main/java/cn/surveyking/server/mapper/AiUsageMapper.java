package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.AiUsage;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * AI 用量 Mapper。
 *
 * <p>汇总一律走 SQL 的 SUM/GROUP BY，不把明细捞进内存再算：一天下来行数可能上千，
 * 而限额判断是「每次调用都要做一次」的热路径，不能在它上面挂一个全表读。
 *
 * <p>索引：{@code idx_ai_usage_user_day(user_id, create_at)} 撑前两个查询，
 * {@code idx_ai_usage_scene(scene, create_at)} 撑按场景汇总。
 *
 * @author p4-backend
 */
@Mapper
public interface AiUsageMapper extends BaseMapper<AiUsage> {

	/** 某用户从 from 起到现在的合计 token */
	@Select("SELECT COALESCE(SUM(total_tokens), 0) FROM t_ai_usage WHERE user_id = #{userId} AND create_at >= #{from}")
	long sumTokensByUser(@Param("userId") String userId, @Param("from") Date from);

	/** 全站从 from 起到现在的合计 token */
	@Select("SELECT COALESCE(SUM(total_tokens), 0) FROM t_ai_usage WHERE create_at >= #{from}")
	long sumTokensSince(@Param("from") Date from);

	/** 某用户从 from 起按场景汇总（列：scene / calls / tokens） */
	@Select("SELECT scene AS scene, COUNT(*) AS calls, COALESCE(SUM(total_tokens), 0) AS tokens FROM t_ai_usage "
			+ "WHERE user_id = #{userId} AND create_at >= #{from} GROUP BY scene ORDER BY scene")
	List<Map<String, Object>> summaryBySceneForUser(@Param("userId") String userId, @Param("from") Date from);

	/** 全站从 from 起按场景汇总（列：scene / calls / tokens） */
	@Select("SELECT scene AS scene, COUNT(*) AS calls, COALESCE(SUM(total_tokens), 0) AS tokens FROM t_ai_usage "
			+ "WHERE create_at >= #{from} GROUP BY scene ORDER BY scene")
	List<Map<String, Object>> summaryBySceneSince(@Param("from") Date from);

}
