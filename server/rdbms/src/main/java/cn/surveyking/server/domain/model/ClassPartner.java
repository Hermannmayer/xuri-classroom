package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 班级（用户组）授权给老师：一条记录 = 一个老师在一个班上的权限。
 *
 * <p>与 t_repo_partner / t_project_partner 同一套两层模型：功能权限决定「能不能进班级管理」，
 * 这张表决定「能看/能改哪些班」。授权一个班默认包含它的下级班，查询时沿祖先链判断。
 *
 * <p>授权分两档（access_level）：1 = 只读（看班级与成员），2 = 可管理（可增删改学员、批量导入）。
 */
@TableName(value = "t_class_partner")
@Data
@EqualsAndHashCode(callSuper = false)
public class ClassPartner extends BaseModel {

	private String deptId;

	private String userId;

	/** 授权级别：1=只读 2=可管理；历史数据默认只读 */
	private Integer accessLevel;

}
