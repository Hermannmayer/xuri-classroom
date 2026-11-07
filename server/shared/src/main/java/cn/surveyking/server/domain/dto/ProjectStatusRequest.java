package cn.surveyking.server.domain.dto;

import lombok.Data;

/**
 * 发布状态请求（只用于 /api/project/status）。
 *
 * <p>
 * 单独一个 DTO 是为了把「发布开关」从整包保存里拆出来，交给 project:publish 权限管；
 * 如果复用 ProjectRequest，前端很容易顺手把别的设置也带进来，权限边界就糊了。
 *
 * @author perm-v2
 */
@Data
public class ProjectStatusRequest {

	/**
	 * 项目 id
	 */
	private String id;

	/**
	 * 1 开启收集 / 0 关闭；其他值按 0 处理
	 */
	private Integer status;

}
