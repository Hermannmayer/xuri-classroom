package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.UserDept;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;









public interface UserDeptMapper extends BaseMapper<UserDept> {

	/**
	 * 物理删除某个用户的全部附加组（不经过 is_deleted）。
	 * @param userId 用户 id
	 * @return 受影响行数
	 */
	int deleteByUserId(@Param("userId") String userId);

}
