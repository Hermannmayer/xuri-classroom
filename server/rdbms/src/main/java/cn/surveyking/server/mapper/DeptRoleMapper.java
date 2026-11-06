package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.DeptRole;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Param;

/**
 * 用户组-角色绑定。
 *
 * <p>
 * 这张表用「物理删除」而不是 BaseMapper 的逻辑删除：<code>t_dept_role</code> 上有唯一键
 * <code>(dept_id, role_id)</code>，逻辑删除只把 <code>is_deleted</code> 置 1、行还留在表里，
 * 于是「绑定 → 解绑 → 再绑定同一个角色」会直接撞唯一键报 500。绑定关系本身没有留档价值，
 * 物理删掉更安全，也不会攒下一堆软删行。
 */
public interface DeptRoleMapper extends BaseMapper<DeptRole> {

	/**
	 * 物理删除某个用户组的全部角色绑定（不经过 is_deleted）。
	 * @param deptId 用户组 id
	 * @return 受影响行数
	 */
	@Delete("DELETE FROM t_dept_role WHERE dept_id = #{deptId}")
	int deleteByDeptId(@Param("deptId") String deptId);

}
