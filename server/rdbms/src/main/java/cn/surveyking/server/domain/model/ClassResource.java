package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.Date;











@TableName(value = "t_class_resource", autoResultMap = true)
@Data
@EqualsAndHashCode(callSuper = false)
public class ClassResource extends BaseModel {


	public static final String TYPE_PROJECT = "project";


	private String classId;


	private String resourceType;


	private String resourceId;


	private String shareToken;


	private Integer status;


	private Date startAt;


	private Date endAt;


	private String assignedBy;


	private String settings;

}
