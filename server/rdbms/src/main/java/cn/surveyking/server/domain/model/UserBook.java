package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.Jackson3TypeHandler;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.ibatis.type.JdbcType;






@TableName(value = "t_user_book", autoResultMap = true)
@Data
@EqualsAndHashCode(callSuper = false)
public class UserBook extends BaseModel {




	@TableField(value = "template_id")
	private String templateId;




	@TableField(value = "name")
	private String name;




	@TableField(value = "wrong_times")
	private Integer wrongTimes;




	@TableField(value = "correct_times")
	private Integer correctTimes;




	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private String note;




	@TableField(value = "status")
	private Integer status;




	@TableField(value = "type")
	private Integer type;

	private String repoId;




	@TableField(value = "project_id")
	private String projectId;




	private Boolean isMarked;

	@TableField(exist = false)
	private static final long serialVersionUID = 1L;

	@TableField(exist = false)
	private Boolean deleted = false;

}