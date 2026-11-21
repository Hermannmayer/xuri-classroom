package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.User;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.Map;





public interface UserMapper extends BaseMapper<User> {

	User getUser(String name, String authAccount);

	/** 只取界面偏好两列 */
	Map<String, Object> selectUiPrefs(@Param("id") String id);

}
