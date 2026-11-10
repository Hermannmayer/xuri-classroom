package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.ibatis.type.JdbcType;

import java.util.Date;

/**
 * 模板组
 *
 * @TableName t_repo
 */
@Data
@TableName(value = "t_repo", autoResultMap = true)
@EqualsAndHashCode(callSuper = false)
public class Repo extends BaseModel {

	/**
	 * 标题
	 */
	private String name;

	/**
	 * 备注
	 */
	private String description;

	/**
	 * 题库类型 survey/exam
	 */
	private String mode;

	/**
	 * 是否公开 1是 0否
	 */
	private Boolean shared;

	/**
	 * 标签
	 */
	@TableField(typeHandler = JacksonTypeHandler.class, jdbcType = JdbcType.VARCHAR)
	private String[] tag;

	/**
	 * 排序优先级
	 */
	private Integer priority;

	/**
	 * 设置
	 */
	private String setting;

	private String category;

	private Boolean isPractice;

	/**
	 * 全局开放期开始；为空表示不限。
	 *
	 * <p>按班级分配的窗口（t_class_resource.start_at/end_at）非空时必须落在
	 * [openStartAt, openEndAt] 内，这里是硬上限。
	 */
	private Date openStartAt;

	/** 全局开放期结束；为空表示不限 */
	private Date openEndAt;

	@JsonIgnore
	@TableField(exist = false)
	private boolean deleted = false;

}