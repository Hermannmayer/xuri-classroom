package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.User;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;

import java.util.Map;

/**
 * @author javahuang
 * @date 2021/8/24
 */
public interface UserMapper extends BaseMapper<User> {

	User getUser(String name, String authAccount);

	/**
	 * 只取界面偏好两列。用显式 SQL 而不是实体属性，避免列类型/映射配置变了之后读回 null。
	 */
	Map<String, Object> selectUiPrefs(@Param("id") String id);

}
