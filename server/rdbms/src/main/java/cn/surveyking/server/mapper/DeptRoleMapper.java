package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.DeptRole;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;










public interface DeptRoleMapper extends BaseMapper<DeptRole> {

	/**
	 * 物理删除某个用户组的全部角色绑定（不经过 is_deleted）。
	 * @param deptId 用户组 id
	 * @return 受影响行数
	 */
	int deleteByDeptId(@Param("deptId") String deptId);

	/**
	 * 物理删除某个角色的全部组绑定（删除角色时清理孤儿绑定用）。
	 * @param roleId 角色 id
	 * @return 受影响行数
	 */
	int deleteByRoleId(@Param("roleId") String roleId);

}
