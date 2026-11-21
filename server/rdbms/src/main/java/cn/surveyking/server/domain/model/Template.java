package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.constant.ProjectModeEnum;
import cn.surveyking.server.core.model.BaseModel;
import cn.surveyking.server.domain.dto.SurveySchema;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.Jackson3TypeHandler;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.ibatis.type.JdbcType;







@Data
@TableName(value = "t_template", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class Template extends BaseModel {




	private String repoId;




	private String serialNo;




	private String name;




	private SurveySchema.QuestionType questionType;




	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.LONGVARCHAR)
	private SurveySchema template;




	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.VARCHAR)
	private String[] tag;




	private String chapter;




	private String difficulty;




	private ProjectModeEnum mode;




	private String category;




	private String previewUrl;




	private Integer priority;

	@TableField(fill = FieldFill.INSERT)
	private String createBy;




	private Integer shared;

}
