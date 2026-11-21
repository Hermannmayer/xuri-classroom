package cn.surveyking.server.domain.model;

import cn.surveyking.server.domain.dto.OAuthSetting;
import cn.surveyking.server.domain.dto.SystemInfo;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.Jackson3TypeHandler;
import lombok.Data;
import org.apache.ibatis.type.JdbcType;

import java.io.Serializable;
import java.util.Date;






@TableName(value = "t_sys_info", autoResultMap = true)
@Data
public class SysInfo implements Serializable {




	@TableId(value = "id")
	private String id;




	@TableField(value = "name")
	private String name;




	@TableField(value = "description")
	private String description;




	@TableField(value = "avatar")
	private String avatar;




	@TableField(value = "locale")
	private String locale;




	@TableField(value = "version")
	private String version;




	@TableField(value = "is_default")
	private Boolean isDefault;




	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.VARCHAR)
	private SystemInfo.RegisterInfo registerInfo;




	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.VARCHAR)
	private SystemInfo.SystemSetting setting;




	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.VARCHAR)
	private SystemInfo.AiSetting aiSetting;





	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.VARCHAR)
	private OAuthSetting oauthSetting;




	@TableField(value = "create_at")
	private Date createAt;




	@TableField(value = "create_by")
	private String createBy;




	@TableField(value = "update_at")
	private Date updateAt;




	@TableField(value = "update_by")
	private String updateBy;

	@TableField(exist = false)
	private static final long serialVersionUID = 1L;

}
