package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.Jackson3TypeHandler;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.ibatis.type.JdbcType;

import java.util.Date;






@Data
@TableName(value = "t_repo", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class Repo extends BaseModel {




	private String name;




	private String description;




	private String mode;




	private Boolean shared;




	@TableField(typeHandler = Jackson3TypeHandler.class, jdbcType = JdbcType.VARCHAR)
	private String[] tag;




	private Integer priority;




	private String setting;

	private String category;

	private Boolean isPractice;







	private Date openStartAt;


	private Date openEndAt;

	@JsonIgnore
	@TableField(exist = false)
	private boolean deleted = false;

}