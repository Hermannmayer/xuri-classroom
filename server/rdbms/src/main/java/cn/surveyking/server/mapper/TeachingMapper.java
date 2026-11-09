package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.dto.TeachingClassView;
import cn.surveyking.server.domain.dto.TeachingProjectView;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 教学工作台用的只读统计。
 *
 * <p>刻意不走实体/Service：这两条都是纯聚合，写成 SQL 比拉全量再算清楚得多，
 * 也不会把「答卷内容」这类重字段带出来。
 */
@Mapper
public interface TeachingMapper {

	/**
	 * 我参与的考试：自己是所有者，或是协作者（type 1/2），带答卷数与平均分。
	 */
	List<TeachingProjectView> listMyProjects(@Param("userId") String userId);

	/**
	 * 某场考试按班级（用户组）聚合：交卷数、平均分。
	 */
	List<TeachingClassView> listClasses(@Param("projectId") String projectId);

}
