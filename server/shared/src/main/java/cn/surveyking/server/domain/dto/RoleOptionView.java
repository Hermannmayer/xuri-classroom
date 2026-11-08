package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 只读的角色候选项：用户组/班级绑定角色时，下拉框只需要「选哪个角色」。
 *
 * <p>故意不包含 authorities：角色编辑页（{@code /api/system/role/list}）才需要权限明细，
 * 而打开用户组的账号可能只有组织/班级权限，不应该通过这个只读接口拿到权限串。
 */
@Data
public class RoleOptionView {

	private String id;

	private String name;

	private String code;

	/** 0 停用 / 1 启用；由调用方决定是否过滤 */
	private Integer status;

}
