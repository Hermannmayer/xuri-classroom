package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 班级授权请求：把一个班（含下级班）的权限分配给老师。
 *
 * <p>授权分两档：{@code 1}=只读（能看班级与成员，不能改），{@code 2}=可管理
 * （能增删改本班/下级班学员、批量导入）。新增（create）时不传默认按只读处理；
 * 修改（update）时必须显式给出 1 或 2。
 */
@Data
public class ClassPartnerRequest {

	private String deptId;

	private List<String> userIds;

	/** 取消/修改授权时用：t_class_partner.id */
	private String id;

	/** 授权级别：1=只读 2=可管理；新增时为空按 1 处理 */
	private Integer accessLevel;

}
