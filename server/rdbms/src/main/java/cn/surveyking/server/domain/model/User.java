package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;





@Data
@TableName(value = "t_user", autoResultMap = true)
@Accessors(chain = true)
@EqualsAndHashCode(callSuper = false)
public class User extends BaseModel {

	private String name;

	private String deptId;

	private String phone;

	private String email;

	private String avatar;

	private String gender;

	private String birthday;

	private String profile;




	private Integer status;





	private String userType;




	private Integer correctTimes;


	private String uiZoom;


	private String uiTheme;

}
