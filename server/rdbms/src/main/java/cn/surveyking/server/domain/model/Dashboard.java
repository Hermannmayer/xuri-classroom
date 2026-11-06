package cn.surveyking.server.domain.model;

import cn.surveyking.server.domain.dto.DashboardSetting;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.io.Serializable;
import java.util.Date;

/**
 * 仪表盘
 *
 * @TableName t_dashboard
 */
@TableName(value = "t_dashboard")
@Data
public class Dashboard implements Serializable {

	/**
	 * ID
	 */
	@TableId(value = "id")
	private String id;

	/**
	 * 仪表盘组件key
	 */
	/**
	 * `key` 是 MySQL 8 的保留字，字段名必须用反引号转义，否则 SELECT 会直接语法错误
	 * （GET /api/dashboard/list 一直 500 的第二个原因）。
	 */
	@TableField(value = "`key`")
	private String key;

	/**
	 * 仪表盘分类
	 */
	/**
	 * 仪表盘分类。数据库列名是 {@code type}（见 init-mysql.sql 的 t_dashboard），
	 * 之前错映射成 {@code category}，SELECT 直接报 Unknown column。
	 */
	@TableField(value = "`type`")
	private Integer type;

	/**
	 * 项目ID
	 */
	@TableField(value = "project_id")
	private String projectId;

	/**
	 * 仪表盘设置
	 */
	@TableField(typeHandler = JacksonTypeHandler.class, value = "setting")
	private DashboardSetting setting;

	/**
	 * 创建时间
	 */
	@TableField(value = "create_at")
	private Date createAt;

	/**
	 *
	 */
	@TableField(value = "create_by")
	private String createBy;

	/**
	 * 更新时间
	 */
	@TableField(value = "update_at")
	private Date updateAt;

	/**
	 *
	 */
	@TableField(value = "update_by")
	private String updateBy;

	@TableField(exist = false)
	private static final long serialVersionUID = 1L;

}