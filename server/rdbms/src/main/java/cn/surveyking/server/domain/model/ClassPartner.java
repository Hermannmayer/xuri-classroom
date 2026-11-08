package cn.surveyking.server.domain.model;

import cn.surveyking.server.core.model.BaseModel;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 班级（用户组）授权给老师：一条记录 = 一个老师能看一个班。
 *
 * <p>与 t_repo_partner / t_project_partner 同一套两层模型：功能权限决定「能不能进班级管理」，
 * 这张表决定「能看哪些班」。授权一个班默认包含它的下级班，查询时沿祖先链判断。
 */
@TableName(value = "t_class_partner")
@Data
@EqualsAndHashCode(callSuper = false)
public class ClassPartner extends BaseModel {

	private String deptId;

	private String userId;

}
