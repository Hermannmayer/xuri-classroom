package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.dto.TeachingClassView;
import cn.surveyking.server.domain.dto.TeachingProjectView;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

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
	@Select("SELECT p.id AS projectId, p.name AS projectName, p.status AS status, "
			+ "(SELECT COUNT(*) FROM t_answer a WHERE a.project_id = p.id AND a.temp_save = 1 AND a.is_deleted = 0) AS answerCount, "
			+ "(SELECT AVG(a.exam_score) FROM t_answer a WHERE a.project_id = p.id AND a.temp_save = 1 AND a.is_deleted = 0) AS avgScore "
			+ "FROM t_project p WHERE p.is_deleted = 0 "
			+ "AND (p.create_by = #{userId} OR EXISTS (SELECT 1 FROM t_project_partner pp WHERE pp.project_id = p.id AND pp.user_id = #{userId} AND pp.type IN (1,2))) "
			+ "ORDER BY p.create_at DESC")
	List<TeachingProjectView> listMyProjects(@Param("userId") String userId);

	/**
	 * 某场考试按班级（用户组）聚合：交卷数、平均分。
	 */
	@Select("SELECT COALESCE(u.dept_id, '') AS deptId, COALESCE(d.name, '未分组') AS deptName, "
			+ "COUNT(*) AS answerCount, AVG(a.exam_score) AS avgScore "
			+ "FROM t_answer a JOIN t_user u ON u.id = a.create_by "
			+ "LEFT JOIN t_dept d ON d.id = u.dept_id "
			+ "WHERE a.project_id = #{projectId} AND a.temp_save = 1 AND a.is_deleted = 0 "
			+ "GROUP BY u.dept_id, d.name ORDER BY answerCount DESC")
	List<TeachingClassView> listClasses(@Param("projectId") String projectId);

}
