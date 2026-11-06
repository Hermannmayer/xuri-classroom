package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.UserDept;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Param;

/**
 * 用户-用户组（附加组）绑定。
 *
 * <p>
 * 和 <code>t_dept_role</code> 一样用物理删除：表上有唯一键 <code>(user_id, dept_id)</code>，
 * 逻辑删除只把 <code>is_deleted</code> 置 1、行还留在表里，于是「解绑 → 重新绑定同一个组」
 * 会直接撞唯一键报 500。绑定关系没有留档价值，物理删掉更安全。
 */
public interface UserDeptMapper extends BaseMapper<UserDept> {

	/**
	 * 物理删除某个用户的全部附加组（不经过 is_deleted）。
	 * @param userId 用户 id
	 * @return 受影响行数
	 */
	@Delete("DELETE FROM t_user_dept WHERE user_id = #{userId}")
	int deleteByUserId(@Param("userId") String userId);

}
