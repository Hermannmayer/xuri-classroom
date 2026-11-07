package cn.surveyking.server.mapper;

import cn.surveyking.server.domain.model.User;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.Map;

/**
 * @author javahuang
 * @date 2021/8/24
 */
public interface UserMapper extends BaseMapper<User> {

	@Select("select t_user.id from t_user " + "left join t_account " + "on t_user.id = t_account.user_id "
			+ "where t_user.name = #{name} and t_account.auth_type = 'PWD' and t_account.auth_account = #{authAccount}")
	User getUser(String name, String authAccount);

	/**
	 * 只取界面偏好两列。用显式 SQL 而不是实体属性，避免列类型/映射配置变了之后读回 null。
	 */
	@Select("select ui_zoom as uiZoom, ui_theme as uiTheme from t_user where id = #{id}")
	Map<String, Object> selectUiPrefs(@Param("id") String id);

}
