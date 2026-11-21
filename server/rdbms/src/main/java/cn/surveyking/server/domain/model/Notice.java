package cn.surveyking.server.domain.model;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import java.util.Date;

















@Data
@TableName("t_notice")
public class Notice {


	public static final String TYPE_NOTICE = "notice";


	public static final String TYPE_SYSTEM_UPDATE = "system_update";


	public static final String TYPE_AI_RESULT = "ai_result";


	public static final String AUDIENCE_ALL = "all";


	public static final String AUDIENCE_ADMIN = "admin";


	public static final String AUDIENCE_TEACHER = "teacher";


	public static final String AUDIENCE_STUDENT = "student";


	public static final String SCOPE_CLASS = "class";


	public static final String SCOPE_PROJECT = "project";


	public static final String STATUS_DRAFT = "draft";


	public static final String STATUS_PUBLISHED = "published";


	public static final String STATUS_ARCHIVED = "archived";

	@TableId(type = IdType.ASSIGN_ID)
	private String id;


	private String title;


	private String content;


	private String type;


	private String audience;


	private String scopeType;


	private String scopeId;


	private Boolean pinned;


	private Boolean requireAck;


	private String status;


	private Date publishAt;


	private Date expireAt;

	@TableField(fill = FieldFill.INSERT)
	private String createBy;

	@TableField(fill = FieldFill.INSERT)
	private Date createAt;

	@TableField(fill = FieldFill.UPDATE)
	private Date updateAt;


	@TableLogic
	@JsonIgnore
	@TableField(value = "is_deleted", select = false)
	private Boolean deleted = false;

}
