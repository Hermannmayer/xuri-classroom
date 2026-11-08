package cn.surveyking.server.domain.dto;

import lombok.Data;

import java.util.List;

/**
 * 班级授权请求：把一个班（含下级班）的查看权限分配给老师。
 */
@Data
public class ClassPartnerRequest {

	private String deptId;

	private List<String> userIds;

	/** 取消授权时用：t_class_partner.id */
	private String id;

}
