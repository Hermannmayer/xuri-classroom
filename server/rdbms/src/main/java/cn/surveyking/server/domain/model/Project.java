package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.model.BaseModel;
import cn.surveyking.server.domain.dto.ProjectSetting;
import cn.surveyking.server.domain.dto.SurveySchema;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.Jackson3TypeHandler;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.ibatis.type.JdbcType;

import java.util.Date;





@Data
@TableName(value = "t_project", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class Project extends BaseModel {

	private String name;




	private String category;




	private String parentId;




	private ProjectModeEnum mode;

	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private SurveySchema survey;

	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.LONGNVARCHAR)
	private ProjectSetting setting;


	private Integer status;




	private Long priority;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;

	@TableField(fill = FieldFill.UPDATE)
	private Date updateAt;

}
