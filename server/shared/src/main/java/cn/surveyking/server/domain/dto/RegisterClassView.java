package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 注册页可选的班级（只返回 allow_register=1 的 class 节点）。
 *
 * @author 守夜人
 */
@Data
public class RegisterClassView {

	private String id;

	/** 班级名称 */
	private String name;

	/** 完整路径，例如「养老护理 / 5级」，方便多级班级下区分同名班 */
	private String path;

}
