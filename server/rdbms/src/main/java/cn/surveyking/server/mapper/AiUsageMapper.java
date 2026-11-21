package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.AiUsage;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.Date;
import java.util.List;
import java.util.Map;












@Mapper
public interface AiUsageMapper extends BaseMapper<AiUsage> {


	@Select("SELECT COALESCE(SUM(total_tokens), 0) FROM t_ai_usage WHERE user_id = #{userId} AND create_at >= #{from}")
	long sumTokensByUser(@Param("userId") String userId, @Param("from") Date from);


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
